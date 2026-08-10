import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Event, Application, Attendance, Student } from "@/models";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { token, verificationValue } = body;

    if (!token || !verificationValue) {
      return NextResponse.json({ success: false, message: "Missing token or registered credential." }, { status: 400 });
    }

    // 1. Locate the event by attendance token
    const event = await Event.findOne({ attendanceToken: token });
    if (!event) {
      return NextResponse.json({ success: false, message: "Attendance session not found or disabled." }, { status: 404 });
    }

    if (!event.attendanceTokenEnabled) {
      return NextResponse.json({ success: false, message: "Attendance QR is currently inactive." }, { status: 403 });
    }

    if (event.status === "COMPLETED" || event.status === "ARCHIVED") {
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
        }
      });
    }

    // Normalize verification value
    const normalizedInput = verificationValue.trim().toLowerCase().replace(/[\s\-\+\(\)]/g, "");

    // 2. Fetch all selected or confirmed applications for this event
    const applications = await Application.find({
      eventId: event._id,
      status: { $in: ["selected", "confirmed", "attended"] }
    }).populate("studentId");

    let matchedApplication = null;
    let matchedStudent = null;

    // 3. Scan applications for matches (either Registration Number or dynamic phone/ID field)
    for (const app of applications) {
      const student = app.studentId as any;
      if (!student) continue;

      // Normalize fields from application or student database
      const appRegNo = app.registrationNumber ? app.registrationNumber.trim().toLowerCase().replace(/[\s\-\+\(\)]/g, "") : "";
      const studentPhone = student.phone ? student.phone.trim().toLowerCase().replace(/[\s\-\+\(\)]/g, "") : "";
      const studentUniId = student.universityId ? student.universityId.trim().toLowerCase().replace(/[\s\-\+\(\)]/g, "") : "";
      const studentEmail = student.email ? student.email.trim().toLowerCase().replace(/[\s\-\+\(\)]/g, "") : "";

      if (
        normalizedInput === appRegNo ||
        normalizedInput === studentPhone ||
        normalizedInput === studentUniId ||
        normalizedInput === studentEmail
      ) {
        matchedApplication = app;
        matchedStudent = student;
        break;
      }
    }

    if (!matchedApplication || !matchedStudent) {
      // Security measure: Do not disclose if registered under another event
      return NextResponse.json({
        success: false,
        message: "Registration not found for this event. Please check the credential you submitted during application."
      }, { status: 404 });
    }

    // 4. Duplicate Check: Ensure student hasn't already checked in
    const existingAttendance = await Attendance.findOne({
      eventId: event._id,
      studentId: matchedStudent._id
    });

    if (existingAttendance) {
      return NextResponse.json({
        success: false,
        message: "Attendance Already Recorded",
        alreadyMarked: true,
        attendance: {
          studentName: matchedStudent.name,
          registrationNumber: matchedApplication.registrationNumber,
          checkInTime: existingAttendance.checkInTime,
          status: existingAttendance.attendanceStatus,
        }
      }, { status: 409 });
    }

    // 5. Late calculation based on Reporting Time & Grace Period
    const checkInTime = new Date();
    let attendanceStatus: "PRESENT" | "LATE" = "PRESENT";

    if (event.reportingTime) {
      try {
        const [repHours, repMinutes] = event.reportingTime.split(":").map(Number);
        const reportingDate = new Date();
        reportingDate.setHours(repHours, repMinutes, 0, 0);

        const diffMinutes = (checkInTime.getTime() - reportingDate.getTime()) / (1000 * 60);
        const grace = event.gracePeriod || 15;

        if (diffMinutes > grace) {
          attendanceStatus = "LATE";
        }
      } catch (err) {
        console.error("Failed to parse reporting time:", err);
      }
    }

    // 6. Write to Database
    const attendance = await Attendance.create({
      eventId: event._id,
      studentId: matchedStudent._id,
      applicationId: matchedApplication._id,
      registrationNumber: matchedApplication.registrationNumber || "N/A",
      checkInTime,
      attendanceStatus,
    });

    // Also update application status to 'attended'
    matchedApplication.status = "attended";
    matchedApplication.checkInTime = checkInTime;
    await matchedApplication.save();

    // Increment attendedCount in Student metrics
    await Student.findByIdAndUpdate(matchedStudent._id, {
      $inc: { attendedCount: 1 }
    });

    return NextResponse.json({
      success: true,
      message: "Attendance Successful",
      studentName: matchedStudent.name,
      registrationNumber: matchedApplication.registrationNumber,
      checkInTime,
      status: attendanceStatus,
    });
  } catch (error) {
    console.error("Attendance verify error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
