import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { StudentSelectionStatus } from "@prisma/client";
import { sendAttendancePresentEmail, sendAttendanceAbsentHoldEmail } from "@/lib/email";

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
  if (!user || user.isActive === false || !["ADMIN", "SUPERADMIN", "EVENT_ADMIN"].includes(user.role)) return null;
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

    const eventId = params.id;

    if (admin.role === "EVENT_ADMIN") {
      const isAssigned = admin.assignedEvents.some((a) => a.eventId === eventId);
      if (!isAssigned) {
        return NextResponse.json(
          { success: false, message: "Forbidden. You do not have access to manage attendance for this event." },
          { status: 403 }
        );
      }
    }

    const body = await request.json().catch(() => ({}));
    const sendEmails = body.sendEmails !== false; // Default true if not explicitly false

    // Fetch event
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return NextResponse.json({ success: false, message: "Event not found" }, { status: 404 });
    }

    // 1. Deactivate QR session
    await prisma.event.update({
      where: { id: eventId },
      data: {
        attendanceTokenEnabled: false,
      },
    });

    // 2. Fetch all confirmed or attended applications for this event
    const applications = await prisma.application.findMany({
      where: {
        eventId,
        status: { in: ["CONFIRMED", "ATTENDED", "SELECTED"] },
      },
      include: {
        user: true,
        attendance: true,
      },
    });

    let presentCount = 0;
    let absentCount = 0;
    let emailsSent = 0;
    let holdsApplied = 0;

    const emailPromises: Promise<any>[] = [];

    for (const app of applications) {
      const att = app.attendance;
      const isPresent = att && (att.attendanceStatus === "PRESENT" || att.attendanceStatus === "LATE");
      const targetUserId = app.userId || app.user?.id;
      const studentName = app.name || app.user?.name || `Student ${app.registrationNumber || "N/A"}`;
      const studentEmail = app.user?.email || "";
      const regNo = app.registrationNumber || app.user?.registrationNumber || "";

      if (isPresent) {
        presentCount++;
        // Ensure application status is ATTENDED
        if (app.status !== "ATTENDED") {
          await prisma.application.update({
            where: { id: app.id },
            data: { status: "ATTENDED" },
          });
        }

        // Send Present Email if requested and email exists
        if (sendEmails && studentEmail) {
          emailsSent++;
          emailPromises.push(
            sendAttendancePresentEmail({
              studentName,
              email: studentEmail,
              registrationNumber: regNo,
              eventName: event.name,
              eventDate: event.date,
              eventLocation: event.location,
              reportingTime: event.reportingTime,
              applicationId: app.id,
              userId: targetUserId,
              eventId: event.id,
            }).catch((e) => console.error(`Error sending present email to ${studentEmail}:`, e))
          );
        }
      } else {
        absentCount++;
        // Mark application as ABSENT
        await prisma.application.update({
          where: { id: app.id },
          data: { status: "ABSENT" },
        });

        // Ensure attendance record reflects ABSENT
        if (!att) {
          await prisma.attendance.create({
            data: {
              eventId,
              applicationId: app.id,
              userId: targetUserId || admin.id,
              registrationNumber: regNo || "N/A",
              attendanceStatus: "ABSENT",
              manualRemarks: "Auto-marked ABSENT on attendance closure",
            },
          });
        } else if (att.attendanceStatus !== "ABSENT") {
          await prisma.attendance.update({
            where: { applicationId: app.id },
            data: {
              attendanceStatus: "ABSENT",
              manualRemarks: "Auto-marked ABSENT on attendance closure",
            },
          });
        }

        // Mark Student User as ON_HOLD
        if (targetUserId) {
          holdsApplied++;
          await prisma.user.update({
            where: { id: targetUserId },
            data: {
              selectionStatus: StudentSelectionStatus.ON_HOLD,
              adminRemarks: `Placed ON HOLD due to unexcused absence in event: ${event.name} (${new Date().toLocaleDateString("en-GB")})`,
            },
          });
        }

        // Send Absent Hold Email if requested and email exists
        if (sendEmails && studentEmail) {
          emailsSent++;
          emailPromises.push(
            sendAttendanceAbsentHoldEmail({
              studentName,
              email: studentEmail,
              registrationNumber: regNo,
              eventName: event.name,
              eventDate: event.date,
              eventLocation: event.location,
              applicationId: app.id,
              userId: targetUserId,
              eventId: event.id,
            }).catch((e) => console.error(`Error sending absent hold email to ${studentEmail}:`, e))
          );
        }
      }
    }

    // Process all emails in background
    Promise.all(emailPromises).catch((err) => console.error("Error executing email batch in close attendance:", err));

    return NextResponse.json({
      success: true,
      message: `Attendance closed successfully. ${presentCount} marked Present, ${absentCount} marked Absent (${holdsApplied} accounts placed on hold).`,
      stats: {
        totalProcessed: applications.length,
        presentCount,
        absentCount,
        holdsApplied,
        emailsSent,
      },
    });
  } catch (error: any) {
    console.error("Close attendance error:", error);
    return NextResponse.json({ success: false, message: error.message || "Failed to close attendance" }, { status: 500 });
  }
}
