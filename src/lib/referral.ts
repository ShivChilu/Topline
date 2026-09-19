import { prisma } from "@/lib/prisma";
import { ReferralStatus } from "@prisma/client";
import {
  sendReferralCompletedAdminAlert,
  sendReferralCompletedStudentAlert,
} from "@/lib/email";

/**
 * Minimum allowable referral reward amount in INR (₹)
 */
export const MIN_REFERRAL_REWARD = 20.0;

/**
 * Standard referral reward fallback amount in INR (₹)
 */
export const DEFAULT_REFERRAL_REWARD = 25.0;

/**
 * Dynamically fetches the active referral reward amount configured by the Admin in Settings.
 * Enforces a minimum of ₹20. Falls back to DEFAULT_REFERRAL_REWARD if not configured.
 */
export async function getActiveReferralRewardAmount(): Promise<number> {
  try {
    const config = await prisma.setting.findUnique({
      where: { key: "homepage_content" },
    });
    if (config?.value && typeof config.value === "object" && "referralRewardAmount" in (config.value as any)) {
      const val = Number((config.value as any).referralRewardAmount);
      if (!isNaN(val) && val >= MIN_REFERRAL_REWARD) return val;
      if (!isNaN(val) && val > 0) return Math.max(MIN_REFERRAL_REWARD, val);
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
 * If this is their FIRST attended event and they have a PENDING referral, it unlocks the reward
 * and sends email notifications to both the Admin and the Student Referrer.
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
        referee: {
          select: { id: true, name: true, phone: true, email: true },
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

    // 4. Determine final reward amount (snapshotted reward or current active reward)
    const activeReward = await getActiveReferralRewardAmount();
    const finalRewardAmount =
      pendingReferral.rewardAmount && pendingReferral.rewardAmount >= MIN_REFERRAL_REWARD
        ? pendingReferral.rewardAmount
        : activeReward;

    // 5. Fetch qualifying event details for email reporting
    let eventName = "Catering Event Duty";
    if (eventId) {
      const eventRecord = await prisma.event.findUnique({
        where: { id: eventId },
        select: { name: true },
      });
      if (eventRecord?.name) {
        eventName = eventRecord.name;
      }
    }

    // 6. Atomically transition referral status to QUALIFIED
    const updatedReferral = await prisma.referral.update({
      where: { id: pendingReferral.id },
      data: {
        status: ReferralStatus.QUALIFIED,
        qualifyingEventId: eventId || null,
        qualifiedAt: new Date(),
        rewardAmount: finalRewardAmount,
      },
    });

    console.log(
      `[Referral System] Qualified referral ${updatedReferral.id}: Referee ${refereeUserId} completed 1st event ${eventId}. Reward ₹${finalRewardAmount} unlocked for Referrer ${pendingReferral.referrerId}`
    );

    // 7. Dispatch Email Notifications (Non-blocking)
    // 7A: Notify Admin team to process the reward payment
    sendReferralCompletedAdminAlert({
      referrerName: pendingReferral.referrer.name || "Student Partner",
      referrerEmail: pendingReferral.referrer.email,
      referrerPhone: pendingReferral.referrer.phone,
      referrerUpi: pendingReferral.referrer.upiId,
      refereeName: pendingReferral.referee.name || "Referred Student",
      refereePhone: pendingReferral.referee.phone,
      refereeEmail: pendingReferral.referee.email,
      eventName,
      rewardAmount: finalRewardAmount,
    }).catch((err) => {
      console.error("[Referral System] Error sending admin referral alert email:", err);
    });

    // 7B: Notify Student Referrer about their unlocked reward
    if (pendingReferral.referrer.email) {
      sendReferralCompletedStudentAlert({
        referrerName: pendingReferral.referrer.name || "Student Partner",
        referrerEmail: pendingReferral.referrer.email,
        referrerUpi: pendingReferral.referrer.upiId,
        refereeName: pendingReferral.referee.name || "Your Friend",
        eventName,
        rewardAmount: finalRewardAmount,
      }).catch((err) => {
        console.error("[Referral System] Error sending student referral reward email:", err);
      });
    }

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
          applications: {
            select: {
              id: true,
              status: true,
              createdAt: true,
              event: {
                select: {
                  id: true,
                  name: true,
                  date: true,
                  location: true,
                  reportingTime: true,
                  status: true,
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
          attendanceRecords: {
            select: {
              id: true,
              eventId: true,
              attendanceStatus: true,
              checkInTime: true,
              event: {
                select: {
                  id: true,
                  name: true,
                  date: true,
                  location: true,
                },
              },
            },
            orderBy: { checkInTime: "asc" },
          },
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

  const activeReward = await getActiveReferralRewardAmount();

  const totalEarned = referrals
    .filter((r) => r.status === ReferralStatus.QUALIFIED || r.status === ReferralStatus.PAID)
    .reduce((sum, r) => sum + (r.rewardAmount || activeReward), 0);
  const pendingPayout = referrals
    .filter((r) => r.status === ReferralStatus.QUALIFIED)
    .reduce((sum, r) => sum + (r.rewardAmount || activeReward), 0);
  const paidEarnings = referrals
    .filter((r) => r.status === ReferralStatus.PAID)
    .reduce((sum, r) => sum + (r.rewardAmount || activeReward), 0);

  return {
    totalInvited,
    totalReferred: totalInvited,
    pendingCount,
    qualifiedCount,
    paidCount,
    totalEarned,
    pendingPayout,
    paidEarnings,
    paidPayout: paidEarnings,
    rewardPerReferral: activeReward,
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

      const rewardVal = r.rewardAmount || activeReward;
      const refereeApps = r.referee.applications || [];
      const refereeAttendances = r.referee.attendanceRecords || [];

      const firstApp = refereeApps.length > 0 ? refereeApps[0] : null;
      const validAttendance = refereeAttendances.find(
        (att) => att.attendanceStatus === "PRESENT" || att.attendanceStatus === "LATE"
      );
      const absentAttendance = refereeAttendances.find(
        (att) => att.attendanceStatus === "ABSENT"
      );

      const isPaid = r.status === ReferralStatus.PAID;
      const isQualified = r.status === ReferralStatus.QUALIFIED;
      const isAttended = isPaid || isQualified || Boolean(validAttendance);
      const isApplied = isAttended || refereeApps.length > 0;

      // Calculate milestone steps
      const steps = [
        {
          stepNumber: 1,
          id: "claimed",
          title: "Referral Claimed",
          subtitle: "Joined Topline with your code",
          status: "completed", // Always completed if record exists
          timestamp: r.createdAt,
          badgeText: "Joined",
        },
        {
          stepNumber: 2,
          id: "applied",
          title: isApplied
            ? "Applied for Shift"
            : "Apply for 1st Event",
          subtitle: isApplied
            ? firstApp?.event?.name
              ? `${firstApp.event.name}${firstApp.event.date ? ` (${new Date(firstApp.event.date).toLocaleDateString("en-GB")})` : ""}`
              : "Application submitted"
            : "Waiting for friend to apply for their first event",
          status: isApplied ? "completed" : "current",
          timestamp: firstApp ? firstApp.createdAt : null,
          eventName: firstApp?.event?.name || null,
          eventDate: firstApp?.event?.date || null,
          badgeText: isApplied ? "Applied" : "Waiting",
        },
        {
          stepNumber: 3,
          id: "attended",
          title: isAttended
            ? "Marked Present"
            : absentAttendance
            ? "Marked Absent"
            : "Shift Attendance",
          subtitle: isAttended
            ? `Shift completed at ${r.qualifyingEvent?.name || validAttendance?.event?.name || "Event"}. ₹${rewardVal} reward unlocked!`
            : absentAttendance
            ? "Marked absent for previous shift. Will qualify upon attending next event."
            : isApplied
            ? `Duty on ${firstApp?.event?.date ? new Date(firstApp.event.date).toLocaleDateString("en-GB") : "Event Day"}. Must be marked Present by supervisor.`
            : "Friend must attend event shift and be marked Present",
          status: isAttended
            ? "completed"
            : isApplied
            ? absentAttendance
              ? "action_needed"
              : "current"
            : "upcoming",
          timestamp: r.qualifiedAt || validAttendance?.checkInTime || null,
          eventName: r.qualifyingEvent?.name || validAttendance?.event?.name || null,
          badgeText: isAttended ? "Verified" : isApplied ? "Pending Duty" : "Upcoming",
        },
        {
          stepNumber: 4,
          id: "payout",
          title: isPaid
            ? `₹${rewardVal} Paid to UPI`
            : isQualified
            ? `₹${rewardVal} In Payout Queue`
            : `₹${rewardVal} UPI Payout`,
          subtitle: isPaid
            ? `Transferred to UPI${r.paidReference ? ` • Ref: ${r.paidReference}` : ""}`
            : isQualified
            ? `₹${rewardVal} reward earned! Topline admin will transfer to your UPI ID shortly.`
            : `₹${rewardVal} credited directly to your UPI once attendance is confirmed`,
          status: isPaid ? "completed" : isQualified ? "current" : "upcoming",
          timestamp: r.paidAt || null,
          paidReference: r.paidReference || null,
          badgeText: isPaid ? "Paid" : isQualified ? "Processing" : "Locked",
        },
      ];

      let currentStepIndex = 0;
      let progressPercent = 25;

      if (isPaid) {
        currentStepIndex = 3;
        progressPercent = 100;
      } else if (isQualified || isAttended) {
        currentStepIndex = 2; // Step 3 completed, waiting for payout (step 4)
        progressPercent = 75;
      } else if (isApplied) {
        currentStepIndex = 1; // Step 2 completed, waiting for attendance (step 3)
        progressPercent = 50;
      } else {
        currentStepIndex = 0; // Step 1 completed, waiting for apply (step 2)
        progressPercent = 25;
      }

      return {
        id: r.id,
        referee: {
          id: r.referee.id,
          name: maskedName,
          fullName: r.referee.name,
          phone: maskedPhone,
          selectionStatus: r.referee.selectionStatus,
          hasApplied: isApplied,
          hasAttended: isAttended,
          firstApplication: firstApp
            ? {
                id: firstApp.id,
                eventName: firstApp.event?.name,
                eventDate: firstApp.event?.date,
                status: firstApp.status,
                appliedAt: firstApp.createdAt,
              }
            : null,
        },
        refereeName: maskedName,
        refereeFullName: r.referee.name,
        refereePhone: maskedPhone,
        createdAt: r.createdAt,
        registeredAt: r.createdAt,
        status: r.status,
        rewardAmount: rewardVal,
        qualifyingEventName: r.qualifyingEvent?.name || validAttendance?.event?.name || null,
        event: r.qualifyingEvent
          ? {
              id: r.qualifyingEvent.id,
              name: r.qualifyingEvent.name,
              date: r.qualifyingEvent.date,
              location: r.qualifyingEvent.location,
            }
          : null,
        qualifiedAt: r.qualifiedAt,
        paidAt: r.paidAt,
        paidReference: r.paidReference,
        notes: r.notes,
        // Visual Tracker Data
        steps,
        currentStepIndex,
        progressPercent,
        isApplied,
        isAttended,
        isPaid,
      };
    }),
  };
}
