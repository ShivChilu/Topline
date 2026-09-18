import { prisma } from "@/lib/prisma";
import { sendAdminPendingReviewAlertEmail } from "@/lib/email";
import { getStudentProfileCompletion } from "@/lib/profile-completion";

// In-memory throttle tracker + DB Setting backup
let lastAlertSentAt: number = 0;
const THROTTLE_COOLDOWN_MS = 24 * 60 * 60 * 1000; // Strictly 24 Hours cooldown (1 email per 24 hours)

/**
 * Checks if there are candidates with 100% completed profile pending for review / selection.
 * Enforces:
 * 1. 100% Profile Completeness: Only candidates whose profile is 100% complete are counted.
 * 2. 24-Hour Throttling: Sends at most once per 24 hours (persisted in DB).
 *
 * @param force If true, bypasses the 24h cooldown (e.g. manual admin trigger).
 */
export async function checkAndNotifyAdminPendingReview(force = false): Promise<{
  triggered: boolean;
  totalPending: number;
  reason?: string;
}> {
  try {
    const now = Date.now();

    // 1. Check 24-Hour Cooldown via DB Setting & in-memory cache
    let lastSentTimestamp = lastAlertSentAt;
    try {
      const lastAlertSetting = await prisma.setting.findUnique({
        where: { key: "last_admin_pending_review_email_sent_at" },
      });
      if (lastAlertSetting?.value) {
        lastSentTimestamp = Math.max(lastSentTimestamp, Number(lastAlertSetting.value));
      }
    } catch (dbErr) {
      console.warn("[PendingReviewNotifier] Could not read last alert setting from DB:", dbErr);
    }

    const timeSinceLastAlert = now - lastSentTimestamp;
    if (!force && lastSentTimestamp > 0 && timeSinceLastAlert < THROTTLE_COOLDOWN_MS) {
      const hoursRemaining = ((THROTTLE_COOLDOWN_MS - timeSinceLastAlert) / (60 * 60 * 1000)).toFixed(1);
      return {
        triggered: false,
        totalPending: 0,
        reason: `Alert throttled. Admin alert email is limited to once in 24 hours. Next alert eligible in ~${hoursRemaining}h.`,
      };
    }

    // 2. Fetch candidates in Student Master List with UNDER_REVIEW status
    const underReviewUsers = await prisma.user.findMany({
      where: {
        role: "USER",
        isActive: true,
        selectionStatus: "UNDER_REVIEW",
      },
      select: {
        id: true,
        name: true,
        registrationNumber: true,
        phone: true,
        university: true,
        profilePhotoUrl: true,
      },
      take: 100,
    });

    // Strictly filter to ONLY students with 100% completed profile
    const completeMasterCandidates: typeof underReviewUsers = [];
    for (const u of underReviewUsers) {
      const completeness = await getStudentProfileCompletion(u.id);
      if (completeness.isComplete) {
        completeMasterCandidates.push(u);
      }
    }
    const masterPendingCount = completeMasterCandidates.length;

    // 3. Fetch Event Applications (APPLIED or UNDER_REVIEW)
    const eventPendingApplications = await prisma.application.findMany({
      where: {
        status: { in: ["APPLIED", "UNDER_REVIEW"] },
      },
      select: {
        id: true,
        name: true,
        registrationNumber: true,
        mobileNumber: true,
        userId: true,
        user: {
          select: {
            id: true,
            name: true,
            registrationNumber: true,
            phone: true,
            university: true,
          },
        },
        event: {
          select: {
            name: true,
          },
        },
      },
      take: 100,
    });

    // Strictly filter event applications where student has 100% complete profile
    const completeEventApplications: typeof eventPendingApplications = [];
    for (const app of eventPendingApplications) {
      const targetUserId = app.userId || app.user?.id;
      if (targetUserId) {
        const completeness = await getStudentProfileCompletion(targetUserId);
        if (completeness.isComplete) {
          completeEventApplications.push(app);
        }
      }
    }
    const eventPendingCount = completeEventApplications.length;

    const totalPending = masterPendingCount + eventPendingCount;

    // If no 100% complete candidates are pending, do not send email
    if (totalPending === 0) {
      return {
        triggered: false,
        totalPending: 0,
        reason: "No candidates with 100% completed profile are currently pending review.",
      };
    }

    // Format sample candidate items for the email
    const sampleCandidates: Array<{
      name: string;
      registrationNumber: string;
      university?: string | null;
      phone?: string | null;
      photoUrl?: string | null;
      source: "Master Profile" | "Event Application";
      eventName?: string | null;
    }> = [];

    completeMasterCandidates.slice(0, 5).forEach((u) => {
      sampleCandidates.push({
        name: u.name,
        registrationNumber: u.registrationNumber || "N/A",
        university: u.university,
        phone: u.phone,
        source: "Master Profile",
      });
    });

    completeEventApplications.slice(0, 5).forEach((app) => {
      sampleCandidates.push({
        name: app.name || app.user?.name || "Student",
        registrationNumber: app.registrationNumber || app.user?.registrationNumber || "N/A",
        university: app.user?.university,
        phone: app.mobileNumber || app.user?.phone,
        source: "Event Application",
        eventName: app.event?.name,
      });
    });

    // 4. Send the alert email to admin
    await sendAdminPendingReviewAlertEmail({
      totalPending,
      masterPendingCount,
      eventPendingCount,
      sampleCandidates,
    });

    // 5. Update throttle tracker in memory and persist in DB Setting
    lastAlertSentAt = now;
    try {
      await prisma.setting.upsert({
        where: { key: "last_admin_pending_review_email_sent_at" },
        update: { value: now },
        create: { key: "last_admin_pending_review_email_sent_at", value: now },
      });
    } catch (dbErr) {
      console.warn("[PendingReviewNotifier] Could not persist last alert setting to DB:", dbErr);
    }

    console.log(`[ADMIN ALERT] Dispatched 24-hr pending review email to admin (${totalPending} 100%-complete candidates pending)`);

    return {
      triggered: true,
      totalPending,
    };
  } catch (error: any) {
    console.error("checkAndNotifyAdminPendingReview error:", error);
    return {
      triggered: false,
      totalPending: 0,
      reason: error.message,
    };
  }
}
