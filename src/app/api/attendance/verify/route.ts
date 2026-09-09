import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApplicationStatus, AttendanceStatus, EventStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, verificationValue } = body;

    if (!token || !verificationValue) {
      return NextResponse.json({ success: false, message: "Missing token or registered credential." }, { status: 400 });
    }

    // 1. Locate the event by attendance token
    const event = await prisma.event.findFirst({
      where: { attendanceToken: token },
    });

    if (!event) {
      return NextResponse.json({ success: false, message: "Attendance session not found or disabled." }, { status: 404 });
    }

    if (!event.attendanceTokenEnabled) {
      return NextResponse.json({ success: false, message: "Attendance QR is currently inactive." }, { status: 403 });
    }

    if (event.status === EventStatus.COMPLETED || event.status === EventStatus.ARCHIVED) {
      return NextResponse.json({ success: false, message: "Attendance is locked. This event is completed." }, { status: 403 });
    }

    if (verificationValue === "LOAD_DETAILS_ONLY_DUMMY_VAL") {
      return NextResponse.json({
        success: true,
        loadOnly: true,
        event: {
          name: event.name,
          date: event.date,
          location: event.location,
          reportingTime: event.reportingTime,
        },
      });
    }

    const normalizedInput = verificationValue.trim().toLowerCase().replace(/[\s\-\+\(\)]/g, "");

    // 2. Fetch applications for this event
    const applications = await prisma.application.findMany({
      where: {
        eventId: event.id,
        status: { in: [ApplicationStatus.APPLIED, ApplicationStatus.SELECTED, ApplicationStatus.CONFIRMED, ApplicationStatus.ATTENDED] },
      },
      include: {
        user: true,
        fieldResponses: { include: { formField: true } },
      },
    });

    let matchedApplication: any = null;
    let matchedUser: any = null;

    for (const app of applications) {
      const user = app.user;
      const regNo = (app.registrationNumber || user.registrationNumber || "").trim().toLowerCase().replace(/[\s\-\+\(\)]/g, "");
      const phone = (app.mobileNumber || user.phone || "").trim().toLowerCase().replace(/[\s\-\+\(\)]/g, "");
      const email = (user.email || "").trim().toLowerCase().replace(/[\s\-\+\(\)]/g, "");

      if (normalizedInput === regNo || normalizedInput === phone || normalizedInput === email) {
        matchedApplication = app;
        matchedUser = user;
        break;
      }
    }

    if (!matchedApplication || !matchedUser) {
      return NextResponse.json({
        success: false,
        message: "Registration not found for this event. Please check the credential you submitted during application.",
      }, { status: 404 });
    }

    // STRICT ROSTER CHECK: Only CONFIRMED (or already ATTENDED) candidates can check in
    if (matchedApplication.status !== ApplicationStatus.CONFIRMED && matchedApplication.status !== ApplicationStatus.ATTENDED) {
      let statusExplanation = `Your current application status is: ${matchedApplication.status}.`;
      if (matchedApplication.status === ApplicationStatus.SELECTED) {
        statusExplanation = "You are selected, but must confirm your availability first on the Topline Student Portal before marking attendance.";
      } else if (matchedApplication.status === ApplicationStatus.CANCELLED) {
        statusExplanation = "Your duty for this event was declined or cancelled.";
      } else if (matchedApplication.status === ApplicationStatus.NOT_SELECTED || matchedApplication.status === ApplicationStatus.REJECTED) {
        statusExplanation = "Your application was not selected for this event roster.";
      }

      return NextResponse.json({
        success: false,
        message: `Access Denied: Only candidates with Confirmed (Attending) status can mark attendance. ${statusExplanation}`,
      }, { status: 403 });
    }

    // 3. Duplicate Check
    const existingAttendance = await prisma.attendance.findUnique({
      where: { applicationId: matchedApplication.id },
    });

    if (existingAttendance) {
      return NextResponse.json({
        success: false,
        message: "Attendance Already Recorded",
        alreadyMarked: true,
        attendance: {
          studentName: matchedApplication.name,
          registrationNumber: matchedApplication.registrationNumber,
          checkInTime: existingAttendance.checkInTime,
          status: existingAttendance.attendanceStatus,
        },
      }, { status: 409 });
    }

    // 4. Late calculation based on Reporting Time & Grace Period
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

    // 5. Write Attendance to PostgreSQL
    await prisma.$transaction([
      prisma.attendance.create({
        data: {
          eventId: event.id,
          userId: matchedUser.id,
          applicationId: matchedApplication.id,
          registrationNumber: matchedApplication.registrationNumber,
          checkInTime,
          attendanceStatus,
        },
      }),
      prisma.application.update({
        where: { id: matchedApplication.id },
        data: {
          status: ApplicationStatus.ATTENDED,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Attendance Successful",
      studentName: matchedApplication.name,
      registrationNumber: matchedApplication.registrationNumber,
      checkInTime,
      status: attendanceStatus,
    });
  } catch (error: any) {
    console.error("Attendance verify error:", error);
    return NextResponse.json({ success: false, message: error.message || "Internal server error" }, { status: 500 });
  }
}
