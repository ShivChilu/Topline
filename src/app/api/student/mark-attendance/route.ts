import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApplicationStatus, AttendanceStatus, EventStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

async function getAuthStudent() {
  const cookieStore = await cookies();
  const token = cookieStore.get("user_token")?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded || !decoded.id) return null;
  return decoded;
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthStudent();
    if (!auth) {
      return NextResponse.json({ success: false, message: "Please log in to your student account to mark attendance." }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.id },
    });

    if (!user) {
      return NextResponse.json({ success: false, message: "Student account not found." }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const { token, eventId } = body;

    if (!token && !eventId) {
      return NextResponse.json({ success: false, message: "Missing attendance QR token or event ID." }, { status: 400 });
    }

    // 1. Find the event
    let event = null;
    if (token) {
      event = await prisma.event.findFirst({
        where: { attendanceToken: String(token).trim() },
      });
    } else if (eventId) {
      event = await prisma.event.findUnique({
        where: { id: String(eventId).trim() },
      });
    }

    if (!event) {
      return NextResponse.json({
        success: false,
        message: "Invalid attendance QR code or session expired. Please verify with the event coordinator.",
      }, { status: 404 });
    }

    // 2. Validate Event & QR Status
    if (!event.attendanceTokenEnabled) {
      return NextResponse.json({
        success: false,
        message: "Attendance check-in is currently inactive for this event. Please ask the coordinator to enable the QR session.",
      }, { status: 403 });
    }

    if (event.status === EventStatus.COMPLETED || event.status === EventStatus.ARCHIVED) {
      return NextResponse.json({
        success: false,
        message: "Attendance session is closed. This event has concluded.",
      }, { status: 403 });
    }

    // 3. Find the student's application for this event
    const application = await prisma.application.findFirst({
      where: {
        eventId: event.id,
        OR: [
          { userId: user.id },
          ...(user.registrationNumber ? [{ registrationNumber: user.registrationNumber }] : []),
          ...(user.phone ? [{ mobileNumber: user.phone }] : []),
        ],
      },
    });

    if (!application) {
      return NextResponse.json({
        success: false,
        message: "No application found for your account under this event. You must apply and be selected first.",
      }, { status: 404 });
    }

    // Link userId to application if missing
    if (!application.userId) {
      await prisma.application.update({
        where: { id: application.id },
        data: { userId: user.id },
      });
    }

    // 4. STRICT CONFIRMATION ROSTER CHECK (Zero Loophole)
    // Only candidates who are CONFIRMED (or already marked ATTENDED) can mark attendance
    if (application.status !== ApplicationStatus.CONFIRMED && application.status !== ApplicationStatus.ATTENDED) {
      let statusExplanation = "Your application is currently: " + application.status;
      if (application.status === ApplicationStatus.SELECTED) {
        statusExplanation = "You were selected but have not confirmed your availability. Please click 'Confirm (Available)' on your profile dashboard first.";
      } else if (application.status === ApplicationStatus.CANCELLED) {
        statusExplanation = "Your duty for this event was declined or cancelled.";
      } else if (application.status === ApplicationStatus.NOT_SELECTED || application.status === ApplicationStatus.REJECTED) {
        statusExplanation = "Your application was not selected for this event roster.";
      } else if (application.status === ApplicationStatus.APPLIED || application.status === ApplicationStatus.UNDER_REVIEW) {
        statusExplanation = "Your application is still under review by event coordinators.";
      }

      return NextResponse.json({
        success: false,
        message: `Access Denied: Only candidates with Confirmed (Attending) status can mark attendance. ${statusExplanation}`,
      }, { status: 403 });
    }

    // 5. DUPLICATE CHECK (Zero Loophole)
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        OR: [
          { applicationId: application.id },
          { eventId: event.id, userId: user.id },
        ],
      },
    });

    if (existingAttendance) {
      return NextResponse.json({
        success: false,
        alreadyMarked: true,
        message: "Attendance Already Recorded",
        attendance: {
          studentName: user.name || application.name,
          registrationNumber: application.registrationNumber || user.registrationNumber || "N/A",
          checkInTime: existingAttendance.checkInTime,
          status: existingAttendance.attendanceStatus,
        },
      }, { status: 409 });
    }

    // 6. Calculate On-Time vs Late Status based on event reportingTime
    const checkInTime = new Date();
    let attendanceStatus: AttendanceStatus = AttendanceStatus.PRESENT;

    if (event.reportingTime) {
      try {
        const [repHours, repMinutes] = event.reportingTime.split(":").map(Number);
        const reportingDate = new Date();
        reportingDate.setHours(repHours, repMinutes, 0, 0);

        const diffMinutes = (checkInTime.getTime() - reportingDate.getTime()) / (1000 * 60);
        const grace = event.gracePeriod || 15;

        if (diffMinutes > grace) {
          attendanceStatus = AttendanceStatus.LATE;
        }
      } catch (err) {
        console.error("Failed to parse reporting time:", err);
      }
    }

    // 7. Atomic Write: Create Attendance Record & Update Application to ATTENDED
    await prisma.$transaction([
      prisma.attendance.create({
        data: {
          eventId: event.id,
          userId: user.id,
          applicationId: application.id,
          registrationNumber: application.registrationNumber || user.registrationNumber || "N/A",
          checkInTime,
          attendanceStatus,
        },
      }),
      prisma.application.update({
        where: { id: application.id },
        data: {
          status: ApplicationStatus.ATTENDED,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Attendance marked successfully!",
      studentName: user.name || application.name,
      registrationNumber: application.registrationNumber || user.registrationNumber || "N/A",
      checkInTime,
      status: attendanceStatus,
      eventName: event.name,
    });
  } catch (error: any) {
    console.error("Student mark attendance error:", error);
    return NextResponse.json({ success: false, message: error.message || "Internal server error" }, { status: 500 });
  }
}
