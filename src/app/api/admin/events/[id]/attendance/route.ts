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
      const att = attendanceRecords.find((r) => r.studentId.toString() === student?._id.toString());

      return {
        applicationId: app._id,
        studentId: student?._id,
        studentName: student?.name || "N/A",
        phone: student?.phone || "N/A",
        registrationNumber: student?.universityId || app.registrationNumber || "N/A",
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
    const { studentId, applicationId, status, remarks } = body;

    if (!studentId || !applicationId || !status) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
    }

    const app = await Application.findById(applicationId);
    if (!app) {
      return NextResponse.json({ success: false, message: "Application not found" }, { status: 404 });
    }

    const studentObj = await Student.findById(studentId);

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
