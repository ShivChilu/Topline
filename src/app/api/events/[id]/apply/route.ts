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

    let { name, phone, email, university, universityId, profilePhotoUrl, customFields } = body;

    // Dynamically extract values from custom fields if custom fields have keys matching name, phone, email
    if (customFields) {
      Object.keys(customFields).forEach((key) => {
        const val = String(customFields[key]).trim();
        if (!val) return;
        const normalizedKey = key.toLowerCase().trim();
        
        if (normalizedKey === "name" || normalizedKey === "full name" || normalizedKey === "student name") {
          name = val;
        }
        if (normalizedKey === "phone" || normalizedKey === "phone number" || normalizedKey === "whatsapp" || normalizedKey === "whatsapp phone number" || normalizedKey === "whatsapp number") {
          phone = val;
        }
        if (normalizedKey === "email" || normalizedKey === "email id" || normalizedKey === "email address") {
          email = val;
        }
        if (normalizedKey === "university" || normalizedKey === "college" || normalizedKey === "university name" || normalizedKey === "college name") {
          university = val;
        }
      });
    }

    // Set logical fallbacks so database model constraints are satisfied even if some fields are missing
    if (!universityId) {
      return NextResponse.json({ success: false, message: "University Registration Number is required." }, { status: 400 });
    }

    const cleanUniId = universityId.trim().toUpperCase();

    // Fallbacks if not provided or left as "N/A"
    const finalName = (!name || name === "N/A") ? `Student ${cleanUniId}` : name.trim();
    const finalPhone = (!phone || phone === "N/A") ? cleanUniId : phone.trim();
    const finalEmail = (!email || email === "N/A") ? `${cleanUniId.toLowerCase().replace(/[^a-z0-9]/g, "")}@topline.co.in` : email.trim().toLowerCase();
    const finalUniversity = (!university || university === "N/A") ? "N/A" : university.trim();

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
      $or: [{ phone: finalPhone }, { universityId: cleanUniId }]
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

      // Update student profile with new details if they are provided and not fallbacks
      let profileUpdated = false;
      if (finalName && !finalName.startsWith("Student ") && student.name !== finalName) {
        student.name = finalName;
        profileUpdated = true;
      }
      if (finalPhone && finalPhone !== cleanUniId && student.phone !== finalPhone) {
        student.phone = finalPhone;
        profileUpdated = true;
      }
      if (finalEmail && !finalEmail.endsWith("@topline.co.in") && student.email !== finalEmail) {
        student.email = finalEmail;
        profileUpdated = true;
      }
      if (finalUniversity && finalUniversity !== "N/A" && student.university !== finalUniversity) {
        student.university = finalUniversity;
        profileUpdated = true;
      }
      if (profileUpdated) {
        await student.save();
      }
    } else {
      // Create new student profile
      student = await Student.create({
        name: finalName,
        phone: finalPhone,
        email: finalEmail,
        university: finalUniversity,
        universityId: cleanUniId,
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

    // Generate unique event-specific registration number
    const year = new Date().getFullYear();
    const randNum = Math.floor(10000 + Math.random() * 90000);
    const regNo = `TL-${year}-${randNum}`;

    // 6. Create the Application Record
    const application = await Application.create({
      eventId: event._id,
      studentId: student._id,
      status: "applied",
      customFieldsData: customFields || {},
      registrationNumber: regNo,
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
