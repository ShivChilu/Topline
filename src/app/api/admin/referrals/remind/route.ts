import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { getActiveReferralRewardAmount } from "@/lib/referral";
import { sendReferralReminderEmail } from "@/lib/email";

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
      return NextResponse.json({ success: false, message: "Unauthorized. Admin access required." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { referrerId, referrerIds, target, customRewardAmount } = body;

    const activeReward = customRewardAmount && Number(customRewardAmount) >= 20 
      ? Number(customRewardAmount) 
      : await getActiveReferralRewardAmount();

    let targetUsers: any[] = [];

    if (target === "ALL_INACTIVE") {
      // Find all users who have a referral code and have 0 referrals
      targetUsers = await prisma.user.findMany({
        where: {
          referralCode: { not: null },
          email: { not: null },
          referralsSent: { none: {} },
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          upiId: true,
          referralCode: true,
        },
      });
    } else if (referrerIds && Array.isArray(referrerIds) && referrerIds.length > 0) {
      targetUsers = await prisma.user.findMany({
        where: {
          id: { in: referrerIds },
          email: { not: null },
          referralCode: { not: null },
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          upiId: true,
          referralCode: true,
        },
      });
    } else if (referrerId && typeof referrerId === "string") {
      const single = await prisma.user.findUnique({
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
      if (single && single.email && single.referralCode) {
        targetUsers = [single];
      }
    }

    if (targetUsers.length === 0) {
      return NextResponse.json(
        { success: false, message: "No matching student referrers with valid email addresses found." },
        { status: 400 }
      );
    }

    // Dispatch emails concurrently in batches of 5 to avoid connection flooding
    let sentCount = 0;
    let failedCount = 0;
    const batchSize = 5;

    for (let i = 0; i < targetUsers.length; i += batchSize) {
      const batch = targetUsers.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (u) => {
          try {
            const res = await sendReferralReminderEmail({
              studentName: u.name,
              email: u.email,
              referralCode: u.referralCode,
              upiId: u.upiId,
              rewardAmount: activeReward,
              userId: u.id,
            });
            if (res.success) {
              sentCount++;
            } else {
              failedCount++;
            }
          } catch (err) {
            console.error(`Failed to send referral reminder to ${u.email}:`, err);
            failedCount++;
          }
        })
      );
    }

    // Log admin action
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: "SEND_REFERRAL_REMINDER_EMAILS",
        target: target === "ALL_INACTIVE" ? "ALL_INACTIVE_REFERRERS" : `TARGETED_${targetUsers.length}_USERS`,
        metadata: {
          sentCount,
          failedCount,
          totalTargeted: targetUsers.length,
          rewardAmount: activeReward,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully sent referral reminder emails to ${sentCount} student${sentCount === 1 ? "" : "s"}!`,
      sentCount,
      failedCount,
      totalTargeted: targetUsers.length,
    });
  } catch (error: any) {
    console.error("Admin referral remind API error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
