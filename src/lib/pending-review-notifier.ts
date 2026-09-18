import { prisma } from "@/lib/prisma";
import { sendAdminPendingReviewAlertEmail } from "@/lib/email";

// In-memory throttle tracker to avoid spamming the admin on every continuous request
let lastAlertSentAt: number = 0;
let lastAlertCount: number = 0;
const THROTTLE_COOLDOWN_MS = 60 * 60 * 1000; // 1 Hour cooldown between alerts

/**
 * Checks if there are 5 or more candidates pending for review / selection.
 * If the threshold (>= 5) is met and throttling allows, sends an automated alert email
 * to admin chiluverushivaprasad02@gmail.com.
 *
 * @param force If true, bypasses the time cooldown (e.g. manual trigger or large batch).
 */
export async function checkAndNotifyAdminPendingReview(force = false): Promise<{
  triggered: boolean;
  totalPending: number;
  reason?: string;
}> {
  try {
    const now = Date.now();

    // 1. Count pending candidates in Student Master List
    const masterPendingCandidates = await prisma.user.findMany({
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
      },
      take: 10,
    });

    const masterPendingCount = await prisma.user.count({
      where: {
        role: "USER",
        isActive: true,
        selectionStatus: "UNDER_REVIEW",
      },
    });

    // 2. Count pending candidates in Event Applications (Applications with status APPLIED or UNDER_REVIEW)
    const eventPendingApplications = await prisma.application.findMany({
      where: {
        status: { in: ["APPLIED", "UNDER_REVIEW"] },
      },
      select: {
        id: true,
        name: true,
        registrationNumber: true,
        mobileNumber: true,
        user: {
          select: {
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
      take: 10,
    });

    const eventPendingCount = await prisma.application.count({
      where: {
        status: { in: ["APPLIED", "UNDER_REVIEW"] },
      },
    });

    const totalPending = masterPendingCount + eventPendingCount;

    // Threshold check: Must have at least 5 candidates pending for review
    if (totalPending < 5) {
      return {
        triggered: false,
        totalPending,
        reason: `Pending count (${totalPending}) is below alert threshold (5).`,
      };
    }

    // Cooldown / Throttle check:
    // Only send once per cooldown window unless forced OR pending count grew by at least 5 new candidates
    const timeSinceLastAlert = now - lastAlertSentAt;
    if (!force && timeSinceLastAlert < THROTTLE_COOLDOWN_MS && totalPending < lastAlertCount + 5) {
      return {
        triggered: false,
        totalPending,
        reason: `Alert throttled. Last alert was sent ${Math.round(timeSinceLastAlert / 60000)}m ago.`,
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

    masterPendingCandidates.forEach((u) => {
      sampleCandidates.push({
        name: u.name,
        registrationNumber: u.registrationNumber || "N/A",
        university: u.university,
        phone: u.phone,
        source: "Master Profile",
      });
    });

    eventPendingApplications.forEach((app) => {
      sampleCandidates.push({
        name: app.name || app.user?.name || "Student",
        registrationNumber: app.registrationNumber || app.user?.registrationNumber || "N/A",
        university: app.user?.university,
        phone: app.mobileNumber || app.user?.phone,
        source: "Event Application",
        eventName: app.event?.name,
      });
    });

    // Send the alert email to admin
    await sendAdminPendingReviewAlertEmail({
      totalPending,
      masterPendingCount,
      eventPendingCount,
      sampleCandidates,
    });

    // Update throttle tracker
    lastAlertSentAt = now;
    lastAlertCount = totalPending;

    console.log(`[ADMIN ALERT] Dispatched pending review email to chiluverushivaprasad02@gmail.com (${totalPending} candidates pending)`);

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
