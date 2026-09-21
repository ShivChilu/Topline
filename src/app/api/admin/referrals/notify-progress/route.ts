import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { getActiveReferralRewardAmount } from "@/lib/referral";
import { sendReferralProgressNudgeEmail, sendReferralCompletedStudentAlert } from "@/lib/email";

export const dynamic = "force-dynamic";

async function getLoggedInAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded || !decoded.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
  });
  if (!user || user.isActive === false || !["ADMIN", "SUPERADMIN"].includes(user.role)) return null;
  return user;
}

export async function POST(request: Request) {
  try {
    const admin = await getLoggedInAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { referrerId, refereeId, referralId, nudgeType } = body;

    if (!referrerId) {
      return NextResponse.json(
        { success: false, message: "Missing required field: referrerId." },
        { status: 400 }
      );
    }

    // 1. Fetch Referrer
    const referrer = await prisma.user.findUnique({
      where: { id: referrerId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        upiId: true,
        referralCode: true,
      },
    });

    if (!referrer) {
      return NextResponse.json(
        { success: false, message: "Referrer student not found." },
        { status: 404 }
      );
    }

    if (!referrer.email) {
      return NextResponse.json(
        { success: false, message: `Referrer ${referrer.name} does not have an email address.` },
        { status: 400 }
      );
    }

    // 2. Fetch Friend / Referee
    let referee: any = null;
    let targetReferralRecord: any = null;

    if (referralId) {
      targetReferralRecord = await prisma.referral.findUnique({
        where: { id: referralId },
        include: {
          referee: {
            include: {
              applications: {
                include: { event: true },
                orderBy: { createdAt: "desc" },
              },
              attendanceRecords: {
                include: { event: true },
                orderBy: { checkInTime: "desc" },
              },
            },
          },
        },
      });
      referee = targetReferralRecord?.referee || null;
    } else if (refereeId) {
      referee = await prisma.user.findUnique({
        where: { id: refereeId },
        include: {
          applications: {
            include: { event: true },
            orderBy: { createdAt: "desc" },
          },
          attendanceRecords: {
            include: { event: true },
            orderBy: { checkInTime: "desc" },
          },
        },
      });
      targetReferralRecord = await prisma.referral.findFirst({
        where: {
          referrerId,
          refereeId: referee.id,
        },
      });
    }

    if (!referee) {
      return NextResponse.json(
        { success: false, message: "Referred friend record not found." },
        { status: 404 }
      );
    }

    // 3. Resolve active reward rate
    const activeReward = await getActiveReferralRewardAmount();
    const finalRewardAmount =
      targetReferralRecord?.rewardAmount && targetReferralRecord.rewardAmount >= 20
        ? targetReferralRecord.rewardAmount
        : activeReward;

    // 4. Resolve latest applied / attended event details
    const attendances = referee.attendanceRecords || [];
    const validAttendance = attendances.find(
      (a: any) => a.attendanceStatus === "PRESENT" || a.attendanceStatus === "LATE"
    );
    const latestApp = (referee.applications || [])[0];
    const eventName = validAttendance?.event?.name || latestApp?.event?.name || "Topline Event Shift";
    const eventDate = validAttendance?.event?.date || latestApp?.event?.date || null;

    const isRefereeAttended = Boolean(validAttendance) || latestApp?.status === "ATTENDED";
    const isRefereeApplied = referee.applications && referee.applications.length > 0;

    const validatedNudgeType: "ASK_FRIEND_APPLY" | "FRIEND_APPLIED" | "REFERRAL_QUALIFIED" =
      nudgeType === "REFERRAL_QUALIFIED" || (nudgeType !== "ASK_FRIEND_APPLY" && isRefereeAttended)
        ? "REFERRAL_QUALIFIED"
        : nudgeType === "FRIEND_APPLIED" || (isRefereeApplied && nudgeType !== "ASK_FRIEND_APPLY")
        ? "FRIEND_APPLIED"
        : "ASK_FRIEND_APPLY";

    // 5. If qualified, ensure Referral status is QUALIFIED in DB
    if (validatedNudgeType === "REFERRAL_QUALIFIED" && targetReferralRecord) {
      if (targetReferralRecord.status === "PENDING") {
        await prisma.referral.update({
          where: { id: targetReferralRecord.id },
          data: {
            status: "QUALIFIED",
            qualifiedAt: new Date(),
            qualifyingEventId: validAttendance?.eventId || latestApp?.eventId || null,
            rewardAmount: finalRewardAmount,
          },
        }).catch((err) => console.error("Error setting referral to QUALIFIED in DB:", err));
      }
    }

    // 6. Dispatch email
    let emailResult: { success: boolean; simulated?: boolean; message?: string };

    if (validatedNudgeType === "REFERRAL_QUALIFIED") {
      emailResult = await sendReferralCompletedStudentAlert({
        referrerName: referrer.name,
        referrerEmail: referrer.email,
        referrerUpi: referrer.upiId,
        refereeName: referee.name,
        eventName,
        rewardAmount: finalRewardAmount,
        userId: referrer.id,
      });
    } else {
      emailResult = await sendReferralProgressNudgeEmail({
        referrerName: referrer.name,
        referrerEmail: referrer.email,
        referrerPhone: referrer.phone,
        referrerUpi: referrer.upiId,
        referrerCode: referrer.referralCode,
        refereeName: referee.name,
        refereePhone: referee.phone,
        refereeId: referee.id,
        nudgeType: validatedNudgeType,
        eventName,
        eventDate,
        rewardAmount: finalRewardAmount,
        userId: referrer.id,
      });
    }

    if (!emailResult.success) {
      return NextResponse.json(
        { success: false, message: emailResult.message || "Failed to send progress email." },
        { status: 500 }
      );
    }

    // 7. Record Audit Log
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: "SEND_REFERRAL_PROGRESS_NUDGE",
        target: referrer.id,
        metadata: {
          referrerName: referrer.name,
          referrerEmail: referrer.email,
          refereeName: referee.name,
          nudgeType: validatedNudgeType,
          eventName,
          rewardAmount: finalRewardAmount,
        },
      },
    }).catch((err) => console.error("Error creating audit log for progress nudge:", err));

    const responseMsg =
      validatedNudgeType === "REFERRAL_QUALIFIED"
        ? `Sent congratulatory reward email to ${referrer.name}! ₹${finalRewardAmount} reward unlocked for ${referee.name}'s attendance at ${eventName}.`
        : validatedNudgeType === "ASK_FRIEND_APPLY"
        ? `Sent reminder email to ${referrer.name} to remind ${referee.name} to apply for an event and earn up to ₹${finalRewardAmount}!`
        : `Sent email to ${referrer.name} updating them that ${referee.name} has applied for ${eventName || "an event"}!`;

    return NextResponse.json({
      success: true,
      message: responseMsg,
      nudgeType: validatedNudgeType,
      recipient: referrer.email,
    });
  } catch (error: any) {
    console.error("Referral progress notify error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
