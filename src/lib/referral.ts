import { prisma } from "@/lib/prisma";
import { ReferralStatus } from "@prisma/client";

/**
 * Standard referral reward amount in INR (₹)
 */
export const DEFAULT_REFERRAL_REWARD = 25.0;

/**
 * Dynamically fetches the active referral reward amount configured by the Admin in Settings.
 * Falls back to DEFAULT_REFERRAL_REWARD (25.0) if not configured.
 */
export async function getActiveReferralRewardAmount(): Promise<number> {
  try {
    const config = await prisma.setting.findUnique({
      where: { key: "homepage_content" },
    });
    if (config?.value && typeof config.value === "object" && "referralRewardAmount" in (config.value as any)) {
      const val = Number((config.value as any).referralRewardAmount);
      if (!isNaN(val) && val > 0) return val;
    }
  } catch (err) {
    console.error("Error fetching dynamic referral reward amount:", err);
  }
  return DEFAULT_REFERRAL_REWARD;
}

/**
 * Generates a clean, unique alphanumeric referral code based on the student's name.
 * e.g. "SHIV25", "RAHUL482", "PRIYA77"
 */
export async function generateUniqueReferralCode(name: string): Promise<string> {
  const cleanName = (name || "TOP")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 5) || "TOP";

  let attempts = 0;
  while (attempts < 15) {
    const randomSuffix = Math.floor(100 + Math.random() * 900); // 3-digit number (100-999)
    const candidateCode = `${cleanName}${randomSuffix}`;

    const existing = await prisma.user.findUnique({
      where: { referralCode: candidateCode },
      select: { id: true },
    });

    if (!existing) {
      return candidateCode;
    }
    attempts++;
  }

  // Fallback random code
  return `TOP${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
}

/**
 * Qualification Trigger Engine (Zero Loopholes):
 * Checks if a student (referee) who just marked/completed attendance was referred by someone.
 * If this is their FIRST attended event and they have a PENDING referral, it unlocks the ₹25 reward!
 */
export async function processReferralQualification(refereeUserId: string, eventId: string) {
  if (!refereeUserId) return null;

  try {
    // 1. Check if this student has a pending referral attribution
    const pendingReferral = await prisma.referral.findFirst({
      where: {
        refereeId: refereeUserId,
        status: ReferralStatus.PENDING,
      },
      include: {
        referrer: {
          select: { id: true, name: true, phone: true, email: true, upiId: true },
        },
      },
    });

    if (!pendingReferral) {
      return null;
    }

    // 2. Count total valid attended events for this student
    const validAttendancesCount = await prisma.attendance.count({
      where: {
        userId: refereeUserId,
        attendanceStatus: { in: ["PRESENT", "LATE"] },
      },
    });

    // 3. Must have at least 1 verified attendance record
    if (validAttendancesCount < 1) {
      return null;
    }

    // 4. Atomically transition referral status to QUALIFIED
    const updatedReferral = await prisma.referral.update({
      where: { id: pendingReferral.id },
      data: {
        status: ReferralStatus.QUALIFIED,
        qualifyingEventId: eventId || null,
        qualifiedAt: new Date(),
        rewardAmount: DEFAULT_REFERRAL_REWARD,
      },
    });

    console.log(
      `[Referral System] Qualified referral ${updatedReferral.id}: Referee ${refereeUserId} completed 1st event ${eventId}. Reward ₹${DEFAULT_REFERRAL_REWARD} unlocked for Referrer ${pendingReferral.referrerId}`
    );

    return {
      qualified: true,
      referralId: updatedReferral.id,
      referrerId: pendingReferral.referrerId,
      referrerName: pendingReferral.referrer.name,
      amount: updatedReferral.rewardAmount,
    };
  } catch (error) {
    console.error("[Referral System] Qualification processing error:", error);
    return null;
  }
}

/**
 * Computes live referral metrics for a user's dashboard
 */
export async function getUserReferralStats(userId: string) {
  const referrals = await prisma.referral.findMany({
    where: { referrerId: userId },
    include: {
      referee: {
        select: {
          id: true,
          name: true,
          phone: true,
          createdAt: true,
          selectionStatus: true,
        },
      },
      qualifyingEvent: {
        select: {
          id: true,
          name: true,
          date: true,
          location: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalInvited = referrals.length;
  const pendingCount = referrals.filter((r) => r.status === ReferralStatus.PENDING).length;
  const qualifiedCount = referrals.filter((r) => r.status === ReferralStatus.QUALIFIED).length;
  const paidCount = referrals.filter((r) => r.status === ReferralStatus.PAID).length;

  const totalEarned = referrals
    .filter((r) => r.status === ReferralStatus.QUALIFIED || r.status === ReferralStatus.PAID)
    .reduce((sum, r) => sum + (r.rewardAmount || DEFAULT_REFERRAL_REWARD), 0);
  const pendingPayout = referrals
    .filter((r) => r.status === ReferralStatus.QUALIFIED)
    .reduce((sum, r) => sum + (r.rewardAmount || DEFAULT_REFERRAL_REWARD), 0);
  const paidEarnings = referrals
    .filter((r) => r.status === ReferralStatus.PAID)
    .reduce((sum, r) => sum + (r.rewardAmount || DEFAULT_REFERRAL_REWARD), 0);

  return {
    totalInvited,
    pendingCount,
    qualifiedCount,
    paidCount,
    totalEarned,
    pendingPayout,
    paidEarnings,
    rewardPerReferral: DEFAULT_REFERRAL_REWARD,
    referrals: referrals.map((r) => {
      // Mask phone for privacy e.g. "98****1234"
      const rawPhone = r.referee.phone || "";
      const maskedPhone =
        rawPhone.length >= 10
          ? `${rawPhone.slice(0, 2)}******${rawPhone.slice(-4)}`
          : "N/A";

      // Mask name e.g. "Rahul S."
      const nameParts = (r.referee.name || "Friend").trim().split(" ");
      const maskedName =
        nameParts.length > 1
          ? `${nameParts[0]} ${nameParts[nameParts.length - 1].charAt(0)}.`
          : nameParts[0];

      return {
        id: r.id,
        refereeName: maskedName,
        refereePhone: maskedPhone,
        registeredAt: r.createdAt,
        status: r.status,
        rewardAmount: r.rewardAmount,
        qualifyingEventName: r.qualifyingEvent?.name || null,
        qualifiedAt: r.qualifiedAt,
        paidAt: r.paidAt,
        paidReference: r.paidReference,
      };
    }),
  };
}
