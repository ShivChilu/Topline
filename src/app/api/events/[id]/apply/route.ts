import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Event, Student, Application } from "@/models";

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    await connectToDatabase();
    const eventId = params.id;
    const body = await request.json();

    const { name, phone, email, university, universityId, profilePhotoUrl, customFields } = body;

    // 1. Basic server-side input validation
    if (!name || !phone || !email || !university || !universityId) {
      return NextResponse.json({ success: false, message: "Missing required student profile fields." }, { status: 400 });
    }

    // 2. Fetch the target event
    const event = await Event.findById(eventId);
    if (!event) {
      return NextResponse.json({ success: false, message: "Event not found." }, { status: 404 });
    }

    if (event.status !== "OPEN") {
      return NextResponse.json({ success: false, message: `Applications are currently ${event.status.toLowerCase()}.` }, { status: 400 });
    }

    // 3. Find or Create the Student profile
    let student = await Student.findOne({
      $or: [{ phone: phone.trim() }, { universityId: universityId.trim() }]
    });

    if (student) {
      // Check if student status is blocked
      if (student.status === "blocked") {
        return NextResponse.json({ success: false, message: "Your profile has been restricted by administrators." }, { status: 403 });
      }

      // 4. Duplicate Check (Event ID + Student ID)
      const existingApplication = await Application.findOne({ eventId, studentId: student._id });
      if (existingApplication) {
        return NextResponse.json({ success: false, message: "You have already applied for this opportunity." }, { status: 409 });
      }
    } else {
      // Create new student profile
      student = await Student.create({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        university: university.trim(),
        universityId: universityId.trim().toUpperCase(),
        profilePhotoUrl: profilePhotoUrl || "",
        status: "active",
      });
    }

    // 5. Safe Concurrency Check and Increment
    // Find the event and increment applicationsCount ONLY if it is still less than maxApplications
    const updatedEvent = await Event.findOneAndUpdate(
      {
        _id: eventId,
        status: "OPEN",
        applicationsCount: { $lt: event.maxApplications }
      },
      {
        $inc: { applicationsCount: 1 }
      },
      {
        new: true // return the updated document
      }
    );

    if (!updatedEvent) {
      return NextResponse.json({ success: false, message: "Sorry, this event filled up just now!" }, { status: 423 });
    }

    // If application count hits the cap, automatically set status to FULL
    if (updatedEvent.applicationsCount >= updatedEvent.maxApplications) {
      updatedEvent.status = "FULL";
      await updatedEvent.save();
    }

    // 6. Create the Application Record
    const application = await Application.create({
      eventId: event._id,
      studentId: student._id,
      status: "applied",
      customFieldsData: customFields || {},
    });

    // 7. Update Student Metrics
    student.appliedCount += 1;
    await student.save();

    // 8. Return confirmation response
    const confirmationMessage = event.instructions || "Application Submitted Successfully. Selection details will be communicated via WhatsApp.";

    return NextResponse.json({
      success: true,
      message: confirmationMessage,
      applicationId: application._id,
    });
  } catch (error: any) {
    console.error("Application error:", error);
    if (error.code === 11000) {
      return NextResponse.json({ success: false, message: "You have already applied for this event." }, { status: 409 });
    }
    return NextResponse.json({ success: false, message: "Internal server error occurred." }, { status: 500 });
  }
}
