import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { ApplicationStatus } from "@prisma/client";
import { isSameEventDate, formatEventDate } from "@/lib/event-utils";
import { sendEventSelectionEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

async function getLoggedInAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded || !decoded.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    include: { assignedEvents: { select: { eventId: true, permissions: true } } },
  });
  if (!user || user.isActive === false || !["ADMIN", "SUPERADMIN", "EVENT_ADMIN", "CALLING_ADMIN"].includes(user.role)) {
    return null;
  }
  return user;
}

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const admin = await getLoggedInAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const currentEventId = params.id;
    const body = await request.json();
    const { applicationId, targetEventId, customRemarks } = body;

    if (!applicationId || !targetEventId) {
      return NextResponse.json(
        { success: false, message: "Application ID and target event ID are required." },
        { status: 400 }
      );
    }

    if (currentEventId === targetEventId) {
      return NextResponse.json(
        { success: false, message: "Target event must be different from current event." },
        { status: 400 }
      );
    }

    // Role permission check for EVENT_ADMIN
    if (admin.role === "EVENT_ADMIN") {
      const isAssigned = admin.assignedEvents.some((a) => a.eventId === currentEventId);
      if (!isAssigned) {
        return NextResponse.json(
          { success: false, message: "Forbidden. You are not assigned to manage this event." },
          { status: 403 }
        );
      }
    }

    // Fetch Source & Target Events
    const [sourceEvent, targetEvent] = await Promise.all([
      prisma.event.findUnique({ where: { id: currentEventId } }),
      prisma.event.findUnique({ where: { id: targetEventId } }),
    ]);

    if (!sourceEvent) {
      return NextResponse.json({ success: false, message: "Source event not found." }, { status: 404 });
    }
    if (!targetEvent) {
      return NextResponse.json({ success: false, message: "Target event not found." }, { status: 404 });
    }

    // Enforce that both events are on the same calendar date
    if (!isSameEventDate(sourceEvent.date, targetEvent.date)) {
      return NextResponse.json(
        {
          success: false,
          message: `Cannot transfer candidate: "${sourceEvent.name}" (${formatEventDate(sourceEvent.date)}) and "${targetEvent.name}" (${formatEventDate(targetEvent.date)}) are not on the same date. Transfers are restricted to same-date events.`,
        },
        { status: 400 }
      );
    }

    // Fetch Current Application
    const currentApp = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        user: true,
      },
    });

    if (!currentApp || currentApp.eventId !== sourceEvent.id) {
      return NextResponse.json(
        { success: false, message: "Candidate application not found in this event." },
        { status: 404 }
      );
    }

    const student = currentApp.user;
    const now = new Date();
    const candidateName = currentApp.name || student?.name || "Candidate";
    const transferNote = customRemarks && customRemarks.trim()
      ? customRemarks.trim()
      : `Transferred from "${sourceEvent.name}" (${sourceEvent.location || "N/A"}) to "${targetEvent.name}" (${targetEvent.location || "N/A"}) by Admin (${admin.name || admin.role}).`;

    // Check if the student already has an application record in targetEvent
    const existingTargetApp = await prisma.application.findFirst({
      where: {
        eventId: targetEvent.id,
        OR: [
          { userId: currentApp.userId },
          ...(currentApp.registrationNumber ? [{ registrationNumber: currentApp.registrationNumber }] : []),
        ],
      },
    });

    let finalAppId: string;

    if (existingTargetApp) {
      // Delete the current application in sourceEvent so student is completely removed from sourceEvent
      await prisma.application.delete({
        where: { id: currentApp.id },
      });

      // Update existing record in targetEvent to SELECTED
      const updated = await prisma.application.update({
        where: { id: existingTargetApp.id },
        data: {
          status: ApplicationStatus.SELECTED,
          selectedAt: now,
          confirmedAt: null,
          whatsappGroupAdded: false,
          whatsappGroupAddedAt: null,
          callingRemarks: transferNote,
          enrollmentSource: "ADMIN_TRANSFER",
          statusHistory: {
            create: {
              oldStatus: existingTargetApp.status,
              newStatus: ApplicationStatus.SELECTED,
              notes: transferNote,
              changedById: admin.id,
            },
          },
        },
      });
      finalAppId = updated.id;
    } else {
      // Move current application from sourceEvent to targetEvent
      const updated = await prisma.application.update({
        where: { id: currentApp.id },
        data: {
          eventId: targetEvent.id,
          status: ApplicationStatus.SELECTED,
          selectedAt: now,
          confirmedAt: null,
          whatsappGroupAdded: false,
          whatsappGroupAddedAt: null,
          callingRemarks: transferNote,
          enrollmentSource: "ADMIN_TRANSFER",
          statusHistory: {
            create: {
              oldStatus: currentApp.status,
              newStatus: ApplicationStatus.SELECTED,
              notes: transferNote,
              changedById: admin.id,
            },
          },
        },
      });
      finalAppId = updated.id;
    }

    // Safely adjust application counts for both events
    await Promise.all([
      prisma.event.update({
        where: { id: sourceEvent.id },
        data: { applicationsCount: { decrement: 1 } },
      }).catch(() => {}),
      prisma.event.update({
        where: { id: targetEvent.id },
        data: { applicationsCount: { increment: 1 } },
      }).catch(() => {}),
    ]);

    // Dispatch official selection email with WhatsApp link for targetEvent immediately
    let emailSent = false;
    let emailMessage = "";
    if (student?.email) {
      try {
        const emailRes = await sendEventSelectionEmail({
          studentName: candidateName,
          email: student.email,
          eventName: targetEvent.name,
          eventDate: targetEvent.date,
          eventLocation: targetEvent.location,
          reportingTime: targetEvent.reportingTime || "",
          instructions: targetEvent.instructions || undefined,
          whatsappGroupLink: targetEvent.whatsappGroupLink || undefined,
          applicationId: finalAppId,
          userId: student.id,
          eventId: targetEvent.id,
          notes: `You have been selected for duty at ${targetEvent.name} (${targetEvent.location || "Venue"}) on ${formatEventDate(targetEvent.date)}. Please review the reporting details, confirm your attendance, and join the official WhatsApp group for this event.`,
        });

        emailSent = emailRes.success;
        if (emailSent) {
          await prisma.application.update({
            where: { id: finalAppId },
            data: { eventSelectionEmailSentAt: now },
          }).catch(() => {});
        } else {
          emailMessage = emailRes.message || "Failed to dispatch email.";
        }
      } catch (err: any) {
        console.error("Failed to send selection email during transfer:", err);
        emailMessage = err.message;
      }
    }

    // Log admin audit entry
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: "TRANSFER_STUDENT_SAME_DATE_EVENT",
        target: `${candidateName} (${currentApp.userId}) from "${sourceEvent.name}" to "${targetEvent.name}"`,
        metadata: {
          sourceEventId: sourceEvent.id,
          sourceEventName: sourceEvent.name,
          targetEventId: targetEvent.id,
          targetEventName: targetEvent.name,
          emailSent,
        },
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Successfully transferred ${candidateName} to "${targetEvent.name}". ${
        emailSent
          ? `Auto selection email sent to ${student?.email} with WhatsApp link!`
          : `Note: Selection email could not be delivered (${emailMessage || "No email"}).`
      }`,
      emailSent,
      targetEvent: {
        id: targetEvent.id,
        name: targetEvent.name,
        location: targetEvent.location,
      },
    });
  } catch (error: any) {
    console.error("Transfer Student Same-Day Event Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Internal server error" }, { status: 500 });
  }
}
