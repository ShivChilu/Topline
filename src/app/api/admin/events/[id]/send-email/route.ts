import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { sendCustomBroadcastEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

async function getLoggedInAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded || !decoded.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    include: { assignedEvents: { select: { eventId: true } } },
  });
  if (!user || !user.isActive || !["ADMIN", "SUPERADMIN", "CALLING_ADMIN", "EVENT_ADMIN"].includes(user.role)) return null;
  return user;
}

function interpolateTags(template: string, app: any, event: any): string {
  if (!template) return "";

  const user = app.user || {};
  const formattedDate = event?.date
    ? new Date(event.date).toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : "";

  const replacements: Record<string, string> = {
    name: app.name || user.name || "Candidate",
    studentName: app.name || user.name || "Candidate",
    registrationNumber: app.registrationNumber || user.registrationNumber || "N/A",
    regNo: app.registrationNumber || user.registrationNumber || "N/A",
    rollNo: app.registrationNumber || user.registrationNumber || "N/A",
    university: user.university || "N/A",
    college: user.university || "N/A",
    city: user.city || "N/A",
    phone: app.mobileNumber || user.phone || "N/A",
    mobile: app.mobileNumber || user.phone || "N/A",
    gender: user.gender || "N/A",
    applicationStatus: app.status || "APPLIED",
    status: app.status || "APPLIED",
    selectionStatus: user.selectionStatus || "UNDER_REVIEW",
    eventName: event?.name || "Event",
    eventDate: formattedDate || (event?.date ? String(event.date) : "N/A"),
    eventLocation: event?.location || "N/A",
    reportingTime: event?.reportingTime || "N/A",
    workType: event?.workType || "N/A",
    paymentPerStudent: event?.paymentPerStudent ? `₹${event.paymentPerStudent}` : "N/A",
    callingRemarks: app.callingRemarks || "None",
    attendanceStatus: app.attendance?.attendanceStatus || "PENDING",
    age: user.age ? String(user.age) : "N/A",
    upiId: user.upiId || "N/A",
    email: user.email || "",
    whatsappGroupLink: event?.whatsappGroupLink || "",
    whatsappLink: event?.whatsappGroupLink || "",
    groupLink: event?.whatsappGroupLink || "",
  };

  let result = template;
  for (const [key, value] of Object.entries(replacements)) {
    const regexDouble = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "gi");
    const regexSingle = new RegExp(`\\{\\s*${key}\\s*\\}`, "gi");
    result = result.replace(regexDouble, value).replace(regexSingle, value);
  }

  return result;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getLoggedInAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const { id: eventId } = await params;
    if (!eventId) {
      return NextResponse.json({ success: false, message: "Event ID is required." }, { status: 400 });
    }

    if (admin.role === "CALLING_ADMIN" || admin.role === "EVENT_ADMIN") {
      const isAssigned = admin.assignedEvents.some((a) => a.eventId === eventId);
      if (!isAssigned) {
        return NextResponse.json({ success: false, message: "Forbidden. You do not have access to this event." }, { status: 403 });
      }
    }

    const body = await request.json();
    const {
      applicationIds,
      subject,
      message,
      includeBranding = true,
    } = body;

    if (!applicationIds || !Array.isArray(applicationIds) || applicationIds.length === 0) {
      return NextResponse.json({ success: false, message: "Please select at least one candidate application." }, { status: 400 });
    }

    if (!subject || !subject.trim()) {
      return NextResponse.json({ success: false, message: "Email subject is required." }, { status: 400 });
    }

    if (!message || !message.trim()) {
      return NextResponse.json({ success: false, message: "Email message body is required." }, { status: 400 });
    }

    // Fetch event details
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return NextResponse.json({ success: false, message: "Event not found." }, { status: 404 });
    }

    // Fetch targeted applications with user and attendance details
    const applications = await prisma.application.findMany({
      where: {
        id: { in: applicationIds },
        eventId,
      },
      include: {
        user: true,
        attendance: true,
      },
    });

    if (applications.length === 0) {
      return NextResponse.json({ success: false, message: "No matching candidate applications found." }, { status: 404 });
    }

    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    // Dispatch custom emails with dynamic variable replacement per recipient
    for (const app of applications) {
      const recipientEmail = app.user?.email;
      const candidateName = app.name || app.user?.name || "Candidate";

      if (!recipientEmail) {
        failedCount++;
        errors.push(`${candidateName} (No registered email on file)`);
        continue;
      }

      const personalizedSubject = interpolateTags(subject, app, event);
      const personalizedMessage = interpolateTags(message, app, event);

      const result = await sendCustomBroadcastEmail({
        to: recipientEmail,
        studentName: candidateName,
        subject: personalizedSubject,
        messageBody: personalizedMessage,
        includeBranding,
        userId: app.userId,
        applicationId: app.id,
        eventId: event.id,
        templateName: body.templateName || "Event Candidate Message",
      });

      if (result.success) {
        sentCount++;
      } else {
        failedCount++;
        errors.push(`${candidateName} (${result.message || "Delivery failed"})`);
      }
    }

    // Record audit trail
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: "EVENT_CUSTOM_EMAIL_BROADCAST",
        target: `Event: ${event.name} (${eventId}) | Sent: ${sentCount}`,
        metadata: {
          eventId,
          eventName: event.name,
          recipientCount: applications.length,
          sentCount,
          failedCount,
          subject,
          errors: errors.slice(0, 10),
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully dispatched email to ${sentCount} candidate(s).${failedCount > 0 ? ` (${failedCount} skipped/failed)` : ""}`,
      sentCount,
      failedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("Event Custom Email Error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
