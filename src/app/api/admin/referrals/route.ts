import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { ReferralStatus } from "@prisma/client";
import { getActiveReferralRewardAmount } from "@/lib/referral";
import { sendReferralPayoutPaidEmail } from "@/lib/email";

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

export async function GET(request: Request) {
  try {
    const admin = await getLoggedInAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    // 1. High-level metric aggregation
    const totalCodesCreated = await prisma.user.count({
      where: { referralCode: { not: null } },
    });

    const totalReferrals = await prisma.referral.count();
    const pendingCount = await prisma.referral.count({ where: { status: ReferralStatus.PENDING } });
    const qualifiedCount = await prisma.referral.count({ where: { status: ReferralStatus.QUALIFIED } });
    const paidCount = await prisma.referral.count({ where: { status: ReferralStatus.PAID } });

    const qualifiedSum = await prisma.referral.aggregate({
      where: { status: ReferralStatus.QUALIFIED },
      _sum: { rewardAmount: true },
    });
    const paidSum = await prisma.referral.aggregate({
      where: { status: ReferralStatus.PAID },
      _sum: { rewardAmount: true },
    });

    const pendingPayoutAmount = qualifiedSum._sum.rewardAmount || 0;
    const settledPayoutAmount = paidSum._sum.rewardAmount || 0;
    const totalEarningsGenerated = pendingPayoutAmount + settledPayoutAmount;

    // 2. Full Ledger with relations
    const allReferrals: any[] = await prisma.referral.findMany({
      include: {
        referrer: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            registrationNumber: true,
            upiId: true,
            referralCode: true,
          },
        },
        referee: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            registrationNumber: true,
            university: true,
            selectionStatus: true,
            createdAt: true,
            applications: {
              select: {
                id: true,
                status: true,
                paymentStatus: true,
                attendance: {
                  select: {
                    attendanceStatus: true,
                  },
                },
                createdAt: true,
                event: {
                  select: {
                    id: true,
                    name: true,
                    date: true,
                    location: true,
                  },
                },
              },
              orderBy: { createdAt: "desc" },
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

    // 3. Referrers aggregation map
    const referrersMap = new Map<string, any>();

    // Fetch all users who have generated a referral code
    const usersWithCodes = await prisma.user.findMany({
      where: { referralCode: { not: null } },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        registrationNumber: true,
        upiId: true,
        referralCode: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    usersWithCodes.forEach((u) => {
      referrersMap.set(u.id, {
        id: u.id,
        name: u.name,
        phone: u.phone || "N/A",
        email: u.email || "N/A",
        registrationNumber: u.registrationNumber || "N/A",
        upiId: u.upiId || "Not Provided",
        referralCode: u.referralCode,
        totalInvited: 0,
        pendingCount: 0,
        qualifiedCount: 0,
        paidCount: 0,
        unpaidBalance: 0,
        paidBalance: 0,
        qualifiedReferralIds: [] as string[],
        referredFriends: [] as any[],
        latestActivityAt: u.createdAt,
      });
    });

    // Aggregate statistics per referrer
    allReferrals.forEach((ref) => {
      let entry = referrersMap.get(ref.referrerId);
      if (!entry) {
        entry = {
          id: ref.referrer.id,
          name: ref.referrer.name,
          phone: ref.referrer.phone || "N/A",
          email: ref.referrer.email || "N/A",
          registrationNumber: ref.referrer.registrationNumber || "N/A",
          upiId: ref.referrer.upiId || "Not Provided",
          referralCode: ref.referrer.referralCode || ref.codeUsed,
          totalInvited: 0,
          pendingCount: 0,
          qualifiedCount: 0,
          paidCount: 0,
          unpaidBalance: 0,
          paidBalance: 0,
          qualifiedReferralIds: [] as string[],
          referredFriends: [] as any[],
          latestActivityAt: ref.createdAt,
        };
        referrersMap.set(ref.referrerId, entry);
      }

      entry.totalInvited += 1;
      if (ref.status === ReferralStatus.PENDING) {
        entry.pendingCount += 1;
      } else if (ref.status === ReferralStatus.QUALIFIED) {
        entry.qualifiedCount += 1;
        entry.unpaidBalance += ref.rewardAmount;
        entry.qualifiedReferralIds.push(ref.id);
      } else if (ref.status === ReferralStatus.PAID) {
        entry.paidCount += 1;
        entry.paidBalance += ref.rewardAmount;
      }

      if (new Date(ref.createdAt).getTime() > new Date(entry.latestActivityAt).getTime()) {
        entry.latestActivityAt = ref.createdAt;
      }

      const refereeApps = (ref.referee?.applications || []).map((app: any) => ({
        id: app.id,
        status: app.status,
        paymentStatus: app.paymentStatus,
        attendanceStatus: app.attendance?.attendanceStatus || "NOT_MARKED",
        isAttended: app.attendance?.attendanceStatus === "PRESENT",
        appliedAt: app.createdAt,
        event: app.event
          ? {
              id: app.event.id,
              name: app.event.name,
              date: app.event.date,
              location: app.event.location,
            }
          : null,
      }));

      entry.referredFriends.push({
        referralId: ref.id,
        id: ref.referee.id,
        name: ref.referee.name,
        phone: ref.referee.phone || "N/A",
        email: ref.referee.email || "N/A",
        registrationNumber: ref.referee.registrationNumber || "N/A",
        university: ref.referee.university || "N/A",
        selectionStatus: ref.referee.selectionStatus,
        registeredAt: ref.createdAt,
        referralStatus: ref.status,
        rewardAmount: ref.rewardAmount,
        qualifyingEvent: ref.qualifyingEvent,
        applicationsCount: refereeApps.length,
        applications: refereeApps,
      });
    });

    const referrersList = Array.from(referrersMap.values()).sort((a, b) => {
      // Prioritize referrers with pending unpaid balances at the top
      if (b.unpaidBalance !== a.unpaidBalance) {
        return b.unpaidBalance - a.unpaidBalance;
      }
      return b.totalInvited - a.totalInvited;
    });

    return NextResponse.json({
      success: true,
      metrics: {
        totalCodesCreated,
        totalReferrals,
        pendingCount,
        qualifiedCount,
        paidCount,
        pendingPayoutAmount,
        settledPayoutAmount,
        totalEarningsGenerated,
        rewardPerReferral: await getActiveReferralRewardAmount(),
      },
      referrers: referrersList,
      ledger: allReferrals.map((r) => {
        const refereeApps = (r.referee?.applications || []).map((app: any) => ({
          id: app.id,
          status: app.status,
          paymentStatus: app.paymentStatus,
          attendanceStatus: app.attendance?.attendanceStatus || "NOT_MARKED",
          isAttended: app.attendance?.attendanceStatus === "PRESENT",
          appliedAt: app.createdAt,
          event: app.event
            ? {
                id: app.event.id,
                name: app.event.name,
                date: app.event.date,
                location: app.event.location,
              }
            : null,
        }));

        return {
          id: r.id,
          codeUsed: r.codeUsed,
          status: r.status,
          rewardAmount: r.rewardAmount,
          registeredAt: r.createdAt,
          qualifiedAt: r.qualifiedAt,
          paidAt: r.paidAt,
          paidReference: r.paidReference,
          notes: r.notes,
          referrer: {
            id: r.referrer.id,
            name: r.referrer.name,
            phone: r.referrer.phone || "N/A",
            email: r.referrer.email || "N/A",
            upiId: r.referrer.upiId || "N/A",
            referralCode: r.referrer.referralCode,
          },
          referee: {
            id: r.referee.id,
            name: r.referee.name,
            phone: r.referee.phone || "N/A",
            email: r.referee.email || "N/A",
            registrationNumber: r.referee.registrationNumber || "N/A",
            university: r.referee.university || "N/A",
            selectionStatus: r.referee.selectionStatus,
            applicationsCount: refereeApps.length,
            applications: refereeApps,
          },
          qualifyingEvent: r.qualifyingEvent
            ? {
                id: r.qualifyingEvent.id,
                name: r.qualifyingEvent.name,
                date: r.qualifyingEvent.date,
                location: r.qualifyingEvent.location,
              }
            : null,
        };
      }),
    });
  } catch (error: any) {
    console.error("Admin referrals GET error:", error);
    return NextResponse.json({ success: false, message: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await getLoggedInAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { referralIds, referralId, referrerId, customRewardAmount, paidReference, notes, sendEmail: shouldSendEmail } = body;

    let targetIds: string[] = [];

    if (referralId && typeof referralId === "string") {
      targetIds = [referralId];
    } else if (Array.isArray(referralIds) && referralIds.length > 0) {
      targetIds = referralIds;
    } else if (referrerId && typeof referrerId === "string") {
      const eligible = await prisma.referral.findMany({
        where: {
          referrerId,
          status: { in: [ReferralStatus.QUALIFIED, ReferralStatus.PENDING] },
        },
        select: { id: true, rewardAmount: true },
      });
      targetIds = eligible.map((e) => e.id);
    }

    if (targetIds.length === 0) {
      return NextResponse.json(
        { success: false, message: "No eligible referrals found to settle payout." },
        { status: 400 }
      );
    }

    const now = new Date();
    const cleanRef =
      paidReference && typeof paidReference === "string" && paidReference.trim()
        ? paidReference.trim()
        : "Offline UPI Settlement Completed";

    const customAmtNum =
      customRewardAmount !== undefined && customRewardAmount !== null && !isNaN(Number(customRewardAmount))
        ? Math.max(0, Number(customRewardAmount))
        : null;

    if (customAmtNum !== null && customAmtNum > 0) {
      await prisma.referral.updateMany({
        where: { id: { in: targetIds } },
        data: {
          status: ReferralStatus.PAID,
          rewardAmount: customAmtNum,
          paidAt: now,
          paidReference: cleanRef,
          notes: notes ? String(notes).trim() : undefined,
        },
      });
    } else {
      await prisma.referral.updateMany({
        where: { id: { in: targetIds } },
        data: {
          status: ReferralStatus.PAID,
          paidAt: now,
          paidReference: cleanRef,
          notes: notes ? String(notes).trim() : undefined,
        },
      });
    }

    // Fetch settled referrals with relations for audit & email notification
    const settledReferrals: any[] = await prisma.referral.findMany({
      where: { id: { in: targetIds } },
      include: {
        referrer: {
          select: { id: true, name: true, email: true, phone: true, upiId: true },
        },
        referee: {
          select: { id: true, name: true, phone: true },
        },
        qualifyingEvent: {
          select: { id: true, name: true },
        },
      },
    });

    const totalSettledAmount = settledReferrals.reduce((sum, r) => sum + (r.rewardAmount || 0), 0);

    // Record audit trail
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: "SETTLE_REFERRAL_PAYOUT",
        target: referrerId || targetIds.join(","),
        metadata: {
          settledCount: settledReferrals.length,
          totalAmount: totalSettledAmount,
          customRewardAmount: customAmtNum,
          paidReference: cleanRef,
          referralIds: targetIds,
        },
      },
    });

    // Dispatch automated email notifications to student referrers (Non-blocking)
    if (shouldSendEmail !== false) {
      for (const item of settledReferrals) {
        if (item.referrer?.email) {
          // Compute updated lifetime earnings for this referrer
          prisma.referral
            .aggregate({
              where: {
                referrerId: item.referrerId,
                status: { in: [ReferralStatus.QUALIFIED, ReferralStatus.PAID] },
              },
              _sum: { rewardAmount: true },
            })
            .then((lifetimeAgg) => {
              const lifetimeTotal = lifetimeAgg._sum.rewardAmount || item.rewardAmount || 0;
              return sendReferralPayoutPaidEmail({
                referrerName: item.referrer.name || "Student Partner",
                referrerEmail: item.referrer.email,
                referrerUpi: item.referrer.upiId,
                refereeName: item.referee?.name || "Friend",
                eventName: item.qualifyingEvent?.name || null,
                paidAmount: item.rewardAmount,
                paidReference: cleanRef,
                totalLifetimeEarned: lifetimeTotal,
                userId: item.referrerId,
              });
            })
            .catch((err) => {
              console.error("[Referral Settlement Email Dispatch Error]:", err);
            });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully marked ${settledReferrals.length} referral(s) as PAID (Total: ₹${totalSettledAmount}).`,
      settledCount: settledReferrals.length,
      settledAmount: totalSettledAmount,
    });
  } catch (error: any) {
    console.error("Admin referrals settlement POST error:", error);
    return NextResponse.json({ success: false, message: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await getLoggedInAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const rawAmount = Number(body.rewardAmount);

    if (isNaN(rawAmount) || rawAmount < 20) {
      return NextResponse.json(
        { success: false, message: "Referral reward amount must be a minimum of ₹20." },
        { status: 400 }
      );
    }

    const cleanAmount = Math.max(20, Math.min(150, Math.round(rawAmount)));

    const existingConfig = await prisma.setting.findUnique({
      where: { key: "homepage_content" },
    });

    const currentValues =
      existingConfig?.value && typeof existingConfig.value === "object"
        ? (existingConfig.value as Record<string, any>)
        : {};

    const updatedConfig = await prisma.setting.upsert({
      where: { key: "homepage_content" },
      update: {
        value: {
          ...currentValues,
          referralRewardAmount: cleanAmount,
        },
      },
      create: {
        key: "homepage_content",
        value: {
          referralRewardAmount: cleanAmount,
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: "UPDATE_REFERRAL_REWARD_RATE",
        target: "SETTING_HOMEPAGE_CONTENT",
        metadata: {
          previousAmount: currentValues.referralRewardAmount ?? 25,
          newRewardAmount: cleanAmount,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Referral reward payout rate successfully updated to ₹${cleanAmount} per completed 1st event.`,
      rewardAmount: cleanAmount,
      settings: updatedConfig.value,
    });
  } catch (error: any) {
    console.error("Admin referrals PATCH error:", error);
    return NextResponse.json({ success: false, message: error.message || "Internal server error" }, { status: 500 });
  }
}

