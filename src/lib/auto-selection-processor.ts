import { prisma } from "@/lib/prisma";
import { sendEventSelectionEmail } from "@/lib/email";
import { ApplicationStatus } from "@prisma/client";

export interface AutoSelectionResult {
  success: boolean;
  totalEligible: number;
  totalSent: number;
  skippedDueToSettings?: boolean;
  eventsProcessed: number;
  details: Array<{
    eventId: string;
    eventName: string;
    sentCount: number;
    applicationIds: string[];
  }>;
  errors: string[];
}

/**
 * Sweeps and processes pending auto-selection emails for candidate applications.
 *
 * Enforces:
 * 1. Global Super Admin Toggle: Checks "auto_selection_emails_enabled" setting (default: true).
 * 2. Event-level Toggle: Event.autoSendSelectionEmail must be true.
 * 3. WhatsApp Group Link Guard: Event.whatsappGroupLink must be non-empty.
 * 4. Delay Window: Candidate createdAt <= now - (event.autoSendSelectionDelayHours * 60 * 60 * 1000) (default 2h).
 * 5. Send-Only-Once Idempotency: Atomic claim via DB update before dispatching email.
 *
 * @param eventId Optional event ID to process a specific event only (e.g. after adding WhatsApp link).
 */
export async function processPendingAutoSelectionEmails(eventId?: string): Promise<AutoSelectionResult> {
  const result: AutoSelectionResult = {
    success: true,
    totalEligible: 0,
    totalSent: 0,
    eventsProcessed: 0,
    details: [],
    errors: [],
  };

  try {
    // 1. Check Global Super Admin Toggle
    let globalEnabled = true;
    try {
      const globalSetting = await prisma.setting.findUnique({
        where: { key: "auto_selection_emails_enabled" },
      });
      if (globalSetting?.value !== undefined && globalSetting?.value !== null) {
        globalEnabled = Boolean(globalSetting.value);
      }
    } catch (err) {
      console.warn("[AutoSelectionProcessor] Could not read global setting, defaulting to enabled:", err);
    }

    if (!globalEnabled) {
      result.skippedDueToSettings = true;
      return result;
    }

    // 2. Query target events
    const eventQuery: any = {
      autoSendSelectionEmail: true,
      whatsappGroupLink: { not: null },
      status: { notIn: ["COMPLETED", "ARCHIVED"] },
    };

    if (eventId) {
      eventQuery.id = eventId;
    }

    const events = await prisma.event.findMany({
      where: eventQuery,
      select: {
        id: true,
        name: true,
        date: true,
        location: true,
        reportingTime: true,
        instructions: true,
        whatsappGroupLink: true,
        autoSendSelectionEmail: true,
        autoSendSelectionDelayHours: true,
      },
    });

    const now = Date.now();

    for (const event of events) {
      // Strict WhatsApp link presence verification
      const waLink = event.whatsappGroupLink?.trim();
      if (!waLink) {
        continue;
      }

      result.eventsProcessed++;

      const delayHours = typeof event.autoSendSelectionDelayHours === "number" ? event.autoSendSelectionDelayHours : 2;
      const delayMs = Math.max(0, delayHours * 60 * 60 * 1000);
      const cutoffTime = new Date(now - delayMs);

      // Find candidates whose application is older than the delay and have not received selection email
      const eligibleApplications = await prisma.application.findMany({
        where: {
          eventId: event.id,
          status: { in: [ApplicationStatus.APPLIED, ApplicationStatus.UNDER_REVIEW] },
          autoSelectionEmailSentAt: null,
          eventSelectionEmailSentAt: null,
          createdAt: { lte: cutoffTime },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              registrationNumber: true,
              university: true,
            },
          },
        },
        take: 50, // Batch limit per sweep for stability
      });

      if (eligibleApplications.length === 0) {
        continue;
      }

      result.totalEligible += eligibleApplications.length;
      const sentAppIds: string[] = [];

      for (const app of eligibleApplications) {
        const recipientEmail = app.user?.email;
        if (!recipientEmail) {
          continue;
        }

        try {
          // Atomic claim & status update to prevent race conditions across parallel triggers
          const updated = await prisma.application.updateMany({
            where: {
              id: app.id,
              autoSelectionEmailSentAt: null,
              eventSelectionEmailSentAt: null,
            },
            data: {
              status: ApplicationStatus.SELECTED,
              selectedAt: new Date(),
              autoSelectionEmailSentAt: new Date(),
              eventSelectionEmailSentAt: new Date(),
              lastActionAt: new Date(),
            },
          });

          // If another worker claimed this application first, skip
          if (updated.count === 0) {
            continue;
          }

          // Record status history
          try {
            await prisma.applicationStatusHistory.create({
              data: {
                applicationId: app.id,
                oldStatus: app.status,
                newStatus: ApplicationStatus.SELECTED,
                notes: `Auto-selected via automated system (${delayHours}h post-apply schedule with WhatsApp invite).`,
              },
            });
          } catch (histErr) {
            console.warn("[AutoSelectionProcessor] Could not write status history:", histErr);
          }

          // Dispatch the high-conversion selection email with 1-click WhatsApp unlock
          await sendEventSelectionEmail({
            studentName: app.name || app.user?.name || "Candidate",
            email: recipientEmail,
            eventName: event.name,
            eventDate: event.date,
            eventLocation: event.location,
            reportingTime: event.reportingTime,
            instructions: event.instructions || undefined,
            whatsappGroupLink: waLink,
            applicationId: app.id,
            userId: app.userId,
            eventId: event.id,
            templateName: "Event Selection & WhatsApp Group Invite (Automated)",
          });

          sentAppIds.push(app.id);
          result.totalSent++;
        } catch (appErr: any) {
          console.error(`[AutoSelectionProcessor] Failed for application ${app.id}:`, appErr);
          result.errors.push(`App ${app.id} (${app.name}): ${appErr.message || String(appErr)}`);
        }
      }

      if (sentAppIds.length > 0) {
        result.details.push({
          eventId: event.id,
          eventName: event.name,
          sentCount: sentAppIds.length,
          applicationIds: sentAppIds,
        });
      }
    }

    return result;
  } catch (error: any) {
    console.error("[AutoSelectionProcessor Error]:", error);
    result.success = false;
    result.errors.push(error.message || String(error));
    return result;
  }
}
