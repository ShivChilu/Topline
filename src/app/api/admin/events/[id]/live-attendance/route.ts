import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { hasEventPermission } from "@/lib/permissions";

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

export async function GET(
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
          { success: false, message: "Forbidden. You do not have access to this event." },
          { status: 403 }
        );
      }
    }

    const [event, applications, recentCheckIns] = await Promise.all([
      prisma.event.findUnique({
        where: { id: eventId },
        select: {
          id: true,
          name: true,
          date: true,
          location: true,
          reportingTime: true,
          startTime: true,
          endTime: true,
          status: true,
          attendanceToken: true,
          attendanceTokenEnabled: true,
          gracePeriod: true,
        },
      }),
      prisma.application.findMany({
        where: {
          eventId,
          status: { in: ["CONFIRMED", "ATTENDED", "ABSENT", "SELECTED"] },
        },
        select: {
          id: true,
          userId: true,
          name: true,
          mobileNumber: true,
          registrationNumber: true,
          status: true,
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              registrationNumber: true,
            },
          },
          attendance: {
            select: {
              id: true,
              attendanceStatus: true,
              checkInTime: true,
              manualRemarks: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.attendance.findMany({
        where: { eventId },
        select: {
          id: true,
          applicationId: true,
          userId: true,
          registrationNumber: true,
          checkInTime: true,
          attendanceStatus: true,
          manualRemarks: true,
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          application: {
            select: {
              id: true,
              name: true,
              mobileNumber: true,
            },
          },
        },
        orderBy: { checkInTime: "desc" },
        take: 30,
      }),
    ]);

    if (!event) {
      return NextResponse.json({ success: false, message: "Event not found" }, { status: 404 });
    }

    const totalConfirmed = applications.length;
    let markedPresent = 0;
    let markedLate = 0;

    const roster = applications.map((app) => {
      const isAttended = !!app.attendance;
      const attStatus = app.attendance?.attendanceStatus;
      if (attStatus === "PRESENT") markedPresent++;
      else if (attStatus === "LATE") markedLate++;

      const targetUserId = app.userId || app.user?.id;

      return {
        applicationId: app.id,
        studentId: targetUserId || null,
        name: app.name || app.user?.name || `Student ${app.registrationNumber || "N/A"}`,
        phone: app.mobileNumber || app.user?.phone || "",
        registrationNumber: app.registrationNumber || app.user?.registrationNumber || "N/A",
        photoUrl: targetUserId ? `/api/photos/student?userId=${targetUserId}` : "",
        applicationStatus: app.status,
        isCheckedIn: isAttended,
        attendanceStatus: attStatus || "ABSENT",
        checkInTime: app.attendance?.checkInTime || null,
        manualRemarks: app.attendance?.manualRemarks || "",
      };
    });

    const totalCheckedIn = markedPresent + markedLate;
    const pendingCheckIn = Math.max(0, totalConfirmed - totalCheckedIn);
    const turnoutRate = totalConfirmed > 0 ? Math.round((totalCheckedIn / totalConfirmed) * 100) : 0;

    const liveFeed = recentCheckIns.map((item) => {
      const targetUserId = item.userId || item.user?.id;
      return {
        id: item.id,
        applicationId: item.applicationId,
        studentName: item.application?.name || item.user?.name || `Student ${item.registrationNumber}`,
        registrationNumber: item.registrationNumber,
        phone: item.application?.mobileNumber || item.user?.phone || "",
        photoUrl: targetUserId ? `/api/photos/student?userId=${targetUserId}` : "",
        checkInTime: item.checkInTime,
        attendanceStatus: item.attendanceStatus,
        manualRemarks: item.manualRemarks,
      };
    });

    const canCloseAttendance = hasEventPermission(admin, "attendance:close", eventId);
    const canRectifyAttendance = hasEventPermission(admin, "attendance:rectify", eventId);

    return NextResponse.json({
      success: true,
      canCloseAttendance,
      canRectifyAttendance,
      event,
      stats: {
        totalConfirmed,
        totalCheckedIn,
        markedPresent,
        markedLate,
        pendingCheckIn,
        turnoutRate,
      },
      roster,
      liveFeed,
      serverTime: new Date(),
    });
  } catch (error: any) {
    console.error("Live attendance fetch error:", error);
    return NextResponse.json({ success: false, message: error.message || "Internal server error" }, { status: 500 });
  }
}
