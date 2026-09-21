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
    include: { assignedEvents: { select: { eventId: true, permissions: true } } },
  });
  if (!user || user.isActive === false || !["ADMIN", "SUPERADMIN", "EVENT_ADMIN", "CALLING_ADMIN"].includes(user.role)) return null;
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

    if (admin.role === "EVENT_ADMIN" || admin.role === "CALLING_ADMIN") {
      const isAssigned = admin.assignedEvents.some((a) => a.eventId === eventId);
      if (!isAssigned) {
        return NextResponse.json(
          { success: false, message: "Forbidden. You do not have access to this event." },
          { status: 403 }
        );
      }
    }

    const body = await request.json().catch(() => ({}));
    const target = (body.target || "").toUpperCase(); // "ABSENT" or "PRESENT"

    if (target !== "ABSENT" && target !== "PRESENT") {
      return NextResponse.json(
        { success: false, message: "Invalid target. Must specify 'ABSENT' or 'PRESENT'." },
        { status: 400 }
      );
    }

    // Fetch event
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return NextResponse.json({ success: false, message: "Event not found." }, { status: 404 });
    }

    // Fetch applications
    const applications = await prisma.application.findMany({
      where: {
        eventId,
        status: { in: ["CONFIRMED", "ATTENDED", "SELECTED", "ABSENT", "PAID"] },
      },
      include: {
        user: true,
        attendance: true,
      },
    });

    let sentCount = 0;
    let failedCount = 0;
    let holdsApplied = 0;
    const errors: string[] = [];

    if (target === "ABSENT") {
      // Filter for Absentees (marked ABSENT or not marked PRESENT/LATE)
      const absentees = applications.filter((app) => {
        const att = app.attendance;
        const isPresent = att && (att.attendanceStatus === "PRESENT" || att.attendanceStatus === "LATE");
        return !isPresent;
      });

      if (absentees.length === 0) {
        return NextResponse.json({
          success: false,
          message: "No absentee candidates found for this event.",
        });
      }

      for (const app of absentees) {
        const targetUserId = app.userId || app.user?.id;
        const studentName = app.name || app.user?.name || `Student ${app.registrationNumber || "N/A"}`;
        const studentEmail = app.user?.email || "";
        const regNo = app.registrationNumber || app.user?.registrationNumber || "";

        // Place account on hold in database
        if (targetUserId) {
          holdsApplied++;
          await prisma.user.update({
            where: { id: targetUserId },
            data: {
              selectionStatus: StudentSelectionStatus.ON_HOLD,
              adminRemarks: `Placed ON HOLD due to unexcused absence in event: ${event.name} (${new Date().toLocaleDateString("en-GB")})`,
            },
          }).catch((err) => console.error("Error setting user to ON_HOLD:", err));
        }

        if (!studentEmail) {
          failedCount++;
          errors.push(`${studentName} (No registered email)`);
          continue;
        }

        try {
          const res = await sendAttendanceAbsentHoldEmail({
            studentName,
            email: studentEmail,
            registrationNumber: regNo,
            eventName: event.name,
            eventDate: event.date,
            eventLocation: event.location,
            applicationId: app.id,
            userId: targetUserId,
            eventId: event.id,
          });

          if (res.success) {
            sentCount++;
          } else {
            failedCount++;
            errors.push(`${studentName} (${res.message || "Failed"})`);
          }
        } catch (err: any) {
          failedCount++;
          errors.push(`${studentName} (${err.message})`);
        }
      }

      // Audit Log
      await prisma.auditLog.create({
        data: {
          adminId: admin.id,
          action: "ATTENDANCE_ABSENT_EMAILS_SENT",
          target: `Event: ${event.name} (${eventId}) | Sent to: ${sentCount} Absentees`,
          metadata: {
            eventId,
            eventName: event.name,
            target: "ABSENT",
            sentCount,
            failedCount,
            holdsApplied,
          },
        },
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        message: `Successfully sent Absentee On-Hold Notice email to ${sentCount} candidate(s)${holdsApplied > 0 ? ` (${holdsApplied} account(s) placed on hold)` : ""}.${failedCount > 0 ? ` (${failedCount} failed/skipped)` : ""}`,
        sentCount,
        failedCount,
        holdsApplied,
        errors: errors.length > 0 ? errors : undefined,
      });
    } else {
      // target === "PRESENT"
      const presentees = applications.filter((app) => {
        const att = app.attendance;
        return (att && (att.attendanceStatus === "PRESENT" || att.attendanceStatus === "LATE")) || app.status === "ATTENDED";
      });

      if (presentees.length === 0) {
        return NextResponse.json({
          success: false,
          message: "No present/attended candidates found for this event.",
        });
      }

      for (const app of presentees) {
        const targetUserId = app.userId || app.user?.id;
        const studentName = app.name || app.user?.name || `Student ${app.registrationNumber || "N/A"}`;
        const studentEmail = app.user?.email || "";
        const regNo = app.registrationNumber || app.user?.registrationNumber || "";

        if (!studentEmail) {
          failedCount++;
          errors.push(`${studentName} (No registered email)`);
          continue;
        }

        try {
          const res = await sendAttendancePresentEmail({
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
          });

          if (res.success) {
            sentCount++;
          } else {
            failedCount++;
            errors.push(`${studentName} (${res.message || "Failed"})`);
          }
        } catch (err: any) {
          failedCount++;
          errors.push(`${studentName} (${err.message})`);
        }
      }

      // Audit Log
      await prisma.auditLog.create({
        data: {
          adminId: admin.id,
          action: "ATTENDANCE_PRESENT_EMAILS_SENT",
          target: `Event: ${event.name} (${eventId}) | Sent to: ${sentCount} Presentees`,
          metadata: {
            eventId,
            eventName: event.name,
            target: "PRESENT",
            sentCount,
            failedCount,
          },
        },
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        message: `Successfully sent Attendance Verified email to ${sentCount} present candidate(s).${failedCount > 0 ? ` (${failedCount} failed/skipped)` : ""}`,
        sentCount,
        failedCount,
        errors: errors.length > 0 ? errors : undefined,
      });
    }
  } catch (error: any) {
    console.error("Notify attendance error:", error);
    return NextResponse.json({ success: false, message: error.message || "Failed to dispatch emails." }, { status: 500 });
  }
}
