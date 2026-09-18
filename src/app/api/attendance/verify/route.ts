import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { ApplicationStatus, AttendanceStatus, EventStatus } from "@prisma/client";
import { processReferralQualification } from "@/lib/referral";

export const dynamic = "force-dynamic";

// GET endpoint to instantly return event metadata for the attendance token
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ success: false, message: "Missing attendance token." }, { status: 400 });
    }

    const event = await prisma.event.findFirst({
      where: { attendanceToken: String(token).trim() },
      select: {
        id: true,
        name: true,
        date: true,
        location: true,
        reportingTime: true,
        status: true,
        attendanceTokenEnabled: true,
        gracePeriod: true,
      },
    });

    if (!event) {
      return NextResponse.json({ success: false, message: "Attendance session not found or expired." }, { status: 404 });
    }

    // Check if current visitor has a student session cookie
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user_token")?.value;
    let loggedInStudent: any = null;

    if (userCookie) {
      const decoded = verifyToken(userCookie);
      if (decoded && decoded.id) {
        const studentUser = await prisma.user.findUnique({
          where: { id: decoded.id },
          select: { id: true, name: true, phone: true, registrationNumber: true, email: true },
        });

        if (studentUser) {
          // Check if student has a confirmed application for this event
          const app = await prisma.application.findFirst({
            where: {
              eventId: event.id,
              userId: studentUser.id,
            },
            include: { attendance: true },
          });

          loggedInStudent = {
            id: studentUser.id,
            name: studentUser.name,
            registrationNumber: studentUser.registrationNumber,
            phone: studentUser.phone,
            hasApplication: Boolean(app),
            applicationStatus: app?.status || null,
            alreadyCheckedIn: Boolean(app?.attendance),
            attendanceStatus: app?.attendance?.attendanceStatus || null,
            checkInTime: app?.attendance?.checkInTime || null,
          };
        }
      }
    }

    return NextResponse.json({
      success: true,
      event: {
        id: event.id,
        name: event.name,
        date: event.date,
        location: event.location,
        reportingTime: event.reportingTime,
        status: event.status,
        attendanceTokenEnabled: event.attendanceTokenEnabled,
        gracePeriod: event.gracePeriod,
      },
      loggedInStudent,
    });
  } catch (error: any) {
    console.error("Fetch attendance details error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { token, verificationValue } = body;

    if (!token) {
      return NextResponse.json({ success: false, message: "Missing attendance QR token." }, { status: 400 });
    }

    // 1. Locate the event by attendance token
    const event = await prisma.event.findFirst({
      where: { attendanceToken: String(token).trim() },
    });

    if (!event) {
      return NextResponse.json({ success: false, message: "Attendance session not found or disabled." }, { status: 404 });
    }

    if (!event.attendanceTokenEnabled) {
      return NextResponse.json({ success: false, message: "Attendance QR is currently inactive. Please ask the coordinator to enable the session." }, { status: 403 });
    }

    if (event.status === EventStatus.COMPLETED || event.status === EventStatus.ARCHIVED) {
      return NextResponse.json({ success: false, message: "Attendance session is locked. This event is completed." }, { status: 403 });
    }

    // Check for logged-in cookie first if no verificationValue supplied
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user_token")?.value;
    let studentIdFromCookie: string | null = null;

    if (userCookie) {
      const decoded = verifyToken(userCookie);
      if (decoded && decoded.id) {
        studentIdFromCookie = decoded.id;
      }
    }

    let matchedApplication: any = null;

    // 2. High-performance indexed lookup
    if (verificationValue && String(verificationValue).trim()) {
      const rawInput = String(verificationValue).trim();
      const cleanDigits = rawInput.replace(/[^0-9]/g, "");

      matchedApplication = await prisma.application.findFirst({
        where: {
          eventId: event.id,
          OR: [
            { registrationNumber: { equals: rawInput, mode: "insensitive" } },
            { mobileNumber: { equals: rawInput } },
            ...(cleanDigits.length >= 10 ? [{ mobileNumber: { contains: cleanDigits } }] : []),
            { user: { registrationNumber: { equals: rawInput, mode: "insensitive" } } },
            { user: { phone: { equals: rawInput } } },
            { user: { email: { equals: rawInput, mode: "insensitive" } } },
          ],
        },
        include: {
          user: {
            select: { id: true, name: true, phone: true, registrationNumber: true, email: true },
          },
        },
      });
    } else if (studentIdFromCookie) {
      matchedApplication = await prisma.application.findFirst({
        where: {
          eventId: event.id,
          userId: studentIdFromCookie,
        },
        include: {
          user: {
            select: { id: true, name: true, phone: true, registrationNumber: true, email: true },
          },
        },
      });
    }

    if (!matchedApplication) {
      return NextResponse.json({
        success: false,
        message: "No registered application found for this event with the provided credential.",
      }, { status: 404 });
    }

    const matchedUser = matchedApplication.user;
    const userId = matchedUser?.id || matchedApplication.userId;

    // 3. STRICT ROSTER CHECK: Only CONFIRMED or ATTENDED candidates
    if (matchedApplication.status !== ApplicationStatus.CONFIRMED && matchedApplication.status !== ApplicationStatus.ATTENDED) {
      let statusExplanation = `Your current application status is: ${matchedApplication.status}.`;
      if (matchedApplication.status === ApplicationStatus.SELECTED) {
        statusExplanation = "You were selected, but must confirm your availability on your Topline Student Portal first.";
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

    // 4. Duplicate Check
    const existingAttendance = await prisma.attendance.findUnique({
      where: { applicationId: matchedApplication.id },
    });

    if (existingAttendance) {
      return NextResponse.json({
        success: false,
        message: "Attendance Already Recorded",
        alreadyMarked: true,
        attendance: {
          studentName: matchedApplication.name || matchedUser?.name,
          registrationNumber: matchedApplication.registrationNumber || matchedUser?.registrationNumber,
          checkInTime: existingAttendance.checkInTime,
          status: existingAttendance.attendanceStatus,
        },
      }, { status: 409 });
    }

    // 5. Late calculation based on Reporting Time & Grace Period
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

    // 6. Fast Atomic Write to PostgreSQL
    await prisma.$transaction([
      prisma.attendance.create({
        data: {
          eventId: event.id,
          userId: userId,
          applicationId: matchedApplication.id,
          registrationNumber: matchedApplication.registrationNumber || matchedUser?.registrationNumber || "N/A",
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

    // 7. Referral Engine: Unlock ₹25 reward if this is referee's 1st completed event
    processReferralQualification(userId, event.id).catch((err) =>
      console.error("[Referral Error] Failed processing in attendance verify:", err)
    );

    return NextResponse.json({
      success: true,
      message: "Attendance Successful",
      studentName: matchedApplication.name || matchedUser?.name,
      registrationNumber: matchedApplication.registrationNumber || matchedUser?.registrationNumber,
      checkInTime,
      status: attendanceStatus,
    });
  } catch (error: any) {
    console.error("Attendance verify error:", error);
    return NextResponse.json({ success: false, message: error.message || "Internal server error" }, { status: 500 });
  }
}
