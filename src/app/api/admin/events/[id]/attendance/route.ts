import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

async function getLoggedInAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded || !decoded.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
  });
  if (!user || user.isActive === false) return null;
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

    // Calling Admins cannot access attendance data
    if (admin.role === "CALLING_ADMIN") {
      return NextResponse.json(
        { success: false, message: "Forbidden. Calling Admins cannot view attendance logs." },
        { status: 403 }
      );
    }

    const eventId = params.id;

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
        status: { in: ["APPLIED", "SELECTED", "CONFIRMED", "ATTENDED", "PAID"] },
      },
      include: {
        user: true,
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

    return NextResponse.json({
      success: true,
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

    // Calling Admins cannot mark attendance
    if (admin.role === "CALLING_ADMIN") {
      return NextResponse.json(
        { success: false, message: "Forbidden. Calling Admins cannot record attendance." },
        { status: 403 }
      );
    }

    const eventId = params.id;
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
        manualRemarks: remarks || "Admin Override",
      },
      update: {
        attendanceStatus: normStatus,
        checkInTime: new Date(),
        manualRemarks: remarks || "Admin Override",
      },
    });

    // Sync status to the application as well
    let newAppStatus = app.status;
    if (normStatus === "PRESENT" || normStatus === "LATE") {
      newAppStatus = "ATTENDED";
    } else if (normStatus === "ABSENT") {
      newAppStatus = "CONFIRMED";
    }

    if (newAppStatus !== app.status) {
      await prisma.application.update({
        where: { id: applicationId },
        data: { status: newAppStatus },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Attendance updated manually",
      attendance,
    });
  } catch (error) {
    console.error("Manual attendance update error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
