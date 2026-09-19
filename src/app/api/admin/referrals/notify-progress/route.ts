import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { getActiveReferralRewardAmount } from "@/lib/referral";
import { sendReferralProgressNudgeEmail } from "@/lib/email";

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
    if (refereeId) {
      referee = await prisma.user.findUnique({
        where: { id: refereeId },
        include: {
          applications: {
            include: {
              event: true,
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });
    } else if (referralId) {
      const refItem = await prisma.referral.findUnique({
        where: { id: referralId },
        include: {
          referee: {
            include: {
              applications: {
                include: {
                  event: true,
                },
                orderBy: { createdAt: "desc" },
              },
            },
          },
        },
      });
      referee = refItem?.referee || null;
    }

    if (!referee) {
      return NextResponse.json(
        { success: false, message: "Referred friend record not found." },
        { status: 404 }
      );
    }

    // 3. Resolve active reward rate
    const activeReward = await getActiveReferralRewardAmount();

    // 4. Resolve latest applied event details
    const latestApp = (referee.applications || [])[0];
    const eventName = latestApp?.event?.name || null;
    const eventDate = latestApp?.event?.date || null;

    const validatedNudgeType: "ASK_FRIEND_APPLY" | "FRIEND_APPLIED" =
      nudgeType === "FRIEND_APPLIED" || (referee.applications && referee.applications.length > 0 && nudgeType !== "ASK_FRIEND_APPLY")
        ? "FRIEND_APPLIED"
        : "ASK_FRIEND_APPLY";

    // 5. Dispatch email
    const emailResult = await sendReferralProgressNudgeEmail({
      referrerName: referrer.name,
      referrerEmail: referrer.email,
      referrerPhone: referrer.phone,
      referrerUpi: referrer.upiId,
      referrerCode: referrer.referralCode,
      refereeName: referee.name,
      refereePhone: referee.phone,
      nudgeType: validatedNudgeType,
      eventName,
      eventDate,
      rewardAmount: activeReward,
      userId: referrer.id,
    });

    if (!emailResult.success) {
      return NextResponse.json(
        { success: false, message: emailResult.message || "Failed to send progress email." },
        { status: 500 }
      );
    }

    // 6. Record Audit Log
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
          rewardAmount: activeReward,
        },
      },
    }).catch((err) => console.error("Error creating audit log for progress nudge:", err));

    const responseMsg =
      validatedNudgeType === "ASK_FRIEND_APPLY"
        ? `Sent email to ${referrer.name} to remind ${referee.name} to apply for an event and earn up to ₹${activeReward}!`
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
