import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { processReferralQualification } from "@/lib/referral";
import { hasEventPermission } from "@/lib/permissions";
import { StudentSelectionStatus } from "@prisma/client";

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
  if (!user || user.isActive === false || !["ADMIN", "SUPERADMIN", "EVENT_ADMIN"].includes(user.role)) return null;
  return user;
}

// GET all eligible applicants and their attendance status for an event
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

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!event) {
      return NextResponse.json({ success: false, message: "Event not found" }, { status: 404 });
    }

    // Get selected or confirmed applications with user, responses, and attendance
    const applications = await prisma.application.findMany({
      where: {
        eventId,
        status: { in: ["APPLIED", "SELECTED", "CONFIRMED", "ATTENDED", "ABSENT", "PAID"] },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            registrationNumber: true,
          },
        },
        fieldResponses: {
          include: {
            formField: true,
          },
        },
        attendance: true,
      },
      orderBy: { createdAt: "asc" },
    });

    // Map applications to attendance state
    const list = applications.map((app) => {
      const student = app.user;
      const att = app.attendance;

      const resolvedName = app.name || student?.name || `Student ${app.registrationNumber || "N/A"}`;

      const regNo = (app.registrationNumber || student?.registrationNumber || "").trim();
      const isValidPhone = (val: any) => {
        if (!val) return false;
        const clean = String(val).trim();
        if (clean === regNo) return false;
        const digits = clean.replace(/[^0-9]/g, "");
        return digits.length >= 10;
      };

      let resolvedMobile = "";
      if (app.mobileNumber && isValidPhone(app.mobileNumber)) {
        resolvedMobile = app.mobileNumber.trim();
      } else if (student?.phone && isValidPhone(student.phone)) {
        resolvedMobile = student.phone.trim();
      } else {
        for (const resp of app.fieldResponses) {
          const normKey = (resp.formField?.label || resp.fieldId).toLowerCase().trim();
          if (["phone", "mobile", "contact", "whatsapp"].some((k) => normKey.includes(k))) {
            if (isValidPhone(resp.value)) {
              resolvedMobile = resp.value.trim();
              break;
            }
          }
        }
      }

      // Build customFieldsData object
      const customFieldsData: Record<string, any> = {};
      for (const resp of app.fieldResponses) {
        if (resp.formField) {
          customFieldsData[resp.formField.id] = resp.value;
          customFieldsData[resp.formField.label] = resp.value;
        }
      }

      return {
        _id: app.id,
        applicationId: app.id,
        studentId: student?.id || null,
        studentName: resolvedName,
        phone: resolvedMobile,
        registrationNumber: app.registrationNumber || student?.registrationNumber || "N/A",
        status: att ? att.attendanceStatus : "ABSENT",
        checkInTime: att ? att.checkInTime : null,
        manualRemarks: att ? att.manualRemarks : "",
        customFieldsData,
      };
    });

    const canCloseAttendance = hasEventPermission(admin, "attendance:close", eventId);
    const canRectifyAttendance = hasEventPermission(admin, "attendance:rectify", eventId);

    return NextResponse.json({
      success: true,
      canCloseAttendance,
      canRectifyAttendance,
      attendance: list,
      event: {
        ...event,
        _id: event.id,
      },
    });
  } catch (error) {
    console.error("Fetch attendance error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}

// POST to manually mark or override a student's attendance
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
          { success: false, message: "Forbidden. You do not have access to this event." },
          { status: 403 }
        );
      }
    }
    const body = await request.json();
    let { studentId, applicationId, status, remarks } = body;

    if (!applicationId || !status) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
    }

    const app = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { user: true },
    });

    if (!app) {
      return NextResponse.json({ success: false, message: "Application not found" }, { status: 404 });
    }

    let actualUserId = studentId || app.userId;
    if (!actualUserId) {
      const regNo = app.registrationNumber || "N/A";
      let userObj = await prisma.user.findFirst({
        where: { registrationNumber: regNo },
      });
      if (!userObj) {
        userObj = await prisma.user.create({
          data: {
            username: regNo,
            registrationNumber: regNo,
            name: app.name || `Student ${regNo}`,
            phone: app.mobileNumber || "",
            passwordHash: "",
            role: "USER",
          },
        });
      }
      actualUserId = userObj.id;
      await prisma.application.update({
        where: { id: applicationId },
        data: { userId: actualUserId },
      });
    }

    const normStatus = (String(status).toUpperCase() === "PRESENT"
      ? "PRESENT"
      : String(status).toUpperCase() === "LATE"
      ? "LATE"
      : "ABSENT") as "PRESENT" | "LATE" | "ABSENT";

    // Update or upsert attendance record
    const attendance = await prisma.attendance.upsert({
      where: { applicationId },
      create: {
        eventId,
        applicationId,
        userId: actualUserId,
        registrationNumber: app.registrationNumber || "N/A",
        attendanceStatus: normStatus,
        checkInTime: new Date(),
        manualRemarks: remarks || "Admin Spot/Rectification Override",
      },
      update: {
        attendanceStatus: normStatus,
        checkInTime: new Date(),
        manualRemarks: remarks || "Admin Spot/Rectification Override",
      },
    });

    // Sync status to the application as well
    let newAppStatus = app.status;
    let holdLifted = false;
    let holdApplied = false;

    if (normStatus === "PRESENT" || normStatus === "LATE") {
      newAppStatus = "ATTENDED";

      // If student was ON_HOLD, auto-lift their hold upon rectification to Present
      if (actualUserId) {
        const studentUser = await prisma.user.findUnique({
          where: { id: actualUserId },
          select: { selectionStatus: true },
        });
        if (studentUser && studentUser.selectionStatus === StudentSelectionStatus.ON_HOLD) {
          await prisma.user.update({
            where: { id: actualUserId },
            data: {
              selectionStatus: StudentSelectionStatus.SELECTED,
              adminRemarks: `Hold lifted automatically via attendance rectification (${new Date().toLocaleDateString("en-GB")})`,
            },
          });
          holdLifted = true;
        }
      }
    } else if (normStatus === "ABSENT") {
      newAppStatus = "ABSENT";

      // If event attendance was closed or event completed, put student ON_HOLD
      if (actualUserId) {
        const eventObj = await prisma.event.findUnique({
          where: { id: eventId },
          select: { name: true, status: true, attendanceTokenEnabled: true },
        });
        if (eventObj && (eventObj.status === "COMPLETED" || !eventObj.attendanceTokenEnabled)) {
          await prisma.user.update({
            where: { id: actualUserId },
            data: {
              selectionStatus: StudentSelectionStatus.ON_HOLD,
              adminRemarks: `Placed ON HOLD due to unexcused absence in event: ${eventObj.name} (${new Date().toLocaleDateString("en-GB")})`,
            },
          });
          holdApplied = true;
        }
      }
    }

    if (newAppStatus !== app.status) {
      await prisma.application.update({
        where: { id: applicationId },
        data: { status: newAppStatus },
      });
    }

    if (normStatus === "PRESENT" || normStatus === "LATE") {
      processReferralQualification(actualUserId, eventId).catch((err) =>
        console.error("[Referral Error] Failed processing in admin manual attendance:", err)
      );
    }

    return NextResponse.json({
      success: true,
      message: holdLifted
        ? "Attendance marked PRESENT. Candidate hold status lifted automatically!"
        : holdApplied
        ? "Attendance marked ABSENT. Candidate placed on hold."
        : "Attendance updated successfully.",
      holdLifted,
      holdApplied,
      attendance,
    });
  } catch (error) {
    console.error("Manual attendance update error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
