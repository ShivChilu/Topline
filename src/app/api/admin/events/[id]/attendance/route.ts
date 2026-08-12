import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Event, Application, Attendance, Student, Admin } from "@/models";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

async function getLoggedInAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded || !decoded.id) return null;
  const admin = await Admin.findById(decoded.id);
  if (!admin || admin.isActive === false) return null;
  return admin;
}

// GET all eligible applicants and their attendance status for an event
export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    await connectToDatabase();
    const admin = await getLoggedInAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    // Calling Admins cannot access attendance data
    if (admin.role === "calling") {
      return NextResponse.json({ success: false, message: "Forbidden. Calling Admins cannot view attendance logs." }, { status: 403 });
    }

    const eventId = params.id;

    const event = await Event.findById(eventId);
    if (!event) {
      return NextResponse.json({ success: false, message: "Event not found" }, { status: 404 });
    }

    // Get selected or confirmed applications
    const applications = await Application.find({
      eventId,
      status: { $in: ["applied", "selected", "confirmed", "attended", "paid"] }
    }).populate("studentId");

    // Get actual attendance records
    const attendanceRecords = await Attendance.find({ eventId });

    // Map applications to attendance state
    const list = applications.map((app) => {
      const student = app.studentId as any;
      const studentIdStr = student?._id ? student._id.toString() : "";
      const att = studentIdStr ? attendanceRecords.find((r) => r.studentId && r.studentId.toString() === studentIdStr) : null;

      // Safe Name resolution: prioritize app.name, then student?.name, fallback to "Student <reg>"
      const resolvedName = app.name || student?.name || `Student ${app.registrationNumber || "N/A"}`;

      // Safe Mobile resolution
      const regNo = (app.registrationNumber || student?.universityId || "").trim();
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
        const data = app.customFieldsData ? (
          app.customFieldsData instanceof Map 
            ? Object.fromEntries(app.customFieldsData) 
            : app.customFieldsData
        ) : {};
        const phoneKeys = [
          "phone", "phone number", "phone no", "phone no.", "phone no:",
          "mobile", "mobile number", "mobile no", "mobile no.", "mobile no:",
          "contact", "contact number", "whatsapp", "whatsapp number", "whatsapp phone number"
        ];
        for (const key of Object.keys(data)) {
          const normKey = key.toLowerCase().trim();
          if (phoneKeys.some(k => normKey.startsWith(k) || normKey.includes(k))) {
            const val = data[key];
            if (val && isValidPhone(val)) {
              resolvedMobile = String(val).trim();
              break;
            }
          }
        }
      }

      return {
        applicationId: app._id,
        studentId: student?._id || null,
        studentName: resolvedName,
        phone: resolvedMobile, // Leave empty string if no valid mobile found
        registrationNumber: app.registrationNumber || student?.universityId || "N/A",
        status: att ? att.attendanceStatus : "ABSENT",
        checkInTime: att ? att.checkInTime : null,
        manualRemarks: att ? att.manualRemarks : "",
        customFieldsData: app.customFieldsData || {},
      };
    });

    return NextResponse.json({
      success: true,
      attendance: list,
      event,
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
    await connectToDatabase();
    const admin = await getLoggedInAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    // Calling Admins cannot mark attendance
    if (admin.role === "calling") {
      return NextResponse.json({ success: false, message: "Forbidden. Calling Admins cannot record attendance." }, { status: 403 });
    }

    const eventId = params.id;
    const body = await request.json();
    let { studentId, applicationId, status, remarks } = body;

    if (!applicationId || !status) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
    }

    const app = await Application.findById(applicationId);
    if (!app) {
      return NextResponse.json({ success: false, message: "Application not found" }, { status: 404 });
    }

    let actualStudentId = studentId || app.studentId;
    if (!actualStudentId) {
      // Heal relationship: find existing Student or create new master Student
      const regNo = app.registrationNumber || "N/A";
      let studentObj = await Student.findOne({ universityId: regNo });
      if (!studentObj) {
        studentObj = await Student.create({
          universityId: regNo,
          name: app.name || `Student ${regNo}`,
          phone: app.mobileNumber || ""
        });
      }
      actualStudentId = studentObj._id;
      app.studentId = actualStudentId;
      await app.save();
    }

    const studentObj = await Student.findById(actualStudentId);
    studentId = actualStudentId;

    // Update or create attendance record
    const attendance = await Attendance.findOneAndUpdate(
      { eventId, studentId },
      {
        $set: {
          applicationId,
          registrationNumber: studentObj?.universityId || app.registrationNumber || "N/A",
          attendanceStatus: status,
          checkInTime: new Date(),
          manualRemarks: remarks || "Admin Override",
        }
      },
      { upsert: true, new: true }
    );

    // Sync status to the application as well
    if (status === "PRESENT" || status === "LATE") {
      app.status = "attended";
    } else if (status === "ABSENT") {
      app.status = "confirmed"; // reset to selected/confirmed
    }
    await app.save();

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
