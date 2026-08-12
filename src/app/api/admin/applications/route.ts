import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Application, Student, Event, Admin } from "@/models";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

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

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const admin = await getLoggedInAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId");
    const status = searchParams.get("status");

    // Calling Admin security validation
    if (admin.role === "calling") {
      if (!eventId) {
        return NextResponse.json({ success: false, message: "Forbidden. Event ID is required for Calling Admin queries." }, { status: 403 });
      }
      const isAssigned = admin.assignedEvents?.some((id) => id.toString() === eventId);
      if (!isAssigned) {
        return NextResponse.json({ success: false, message: "Forbidden. You do not have access to this event." }, { status: 403 });
      }
    }

    const filter: any = {};
    if (eventId) filter.eventId = eventId;
    if (status) filter.status = status;

    const applications = await Application.find(filter)
      .populate("eventId")
      .populate("studentId")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, applications });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await connectToDatabase();
    const admin = await getLoggedInAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const { ids, status, paymentStatus, messageStatus, paymentOverride, whatsappGroupAdded } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: false, message: "Missing application IDs." }, { status: 400 });
    }

    // Block calling admins from updating financials
    if (admin.role === "calling") {
      if (paymentStatus !== undefined || paymentOverride !== undefined) {
        return NextResponse.json({ success: false, message: "Forbidden. Calling Admins cannot modify payment details." }, { status: 403 });
      }
    }

    // Process status updates and update student statistics dynamically
    for (const appId of ids) {
      const app = await Application.findById(appId).populate("eventId").populate("studentId");
      if (!app) continue;

      // Event boundary check for Calling Admins
      if (admin.role === "calling") {
        const isAssigned = admin.assignedEvents?.some((id) => id.toString() === app.eventId._id.toString());
        if (!isAssigned) {
          return NextResponse.json({ success: false, message: "Forbidden. Attempted access to unassigned event data." }, { status: 403 });
        }
      }

      const oldStatus = app.status;
      if (status !== undefined) {
        app.status = status;
      }
      if (paymentStatus !== undefined) {
        app.paymentStatus = paymentStatus;
      }
      if (messageStatus !== undefined) {
        app.messageStatus = messageStatus;
      }
      if (paymentOverride !== undefined) {
        app.paymentOverride = Number(paymentOverride);
      }
      if (whatsappGroupAdded !== undefined) {
        app.whatsappGroupAdded = whatsappGroupAdded;
        if (whatsappGroupAdded) {
          app.whatsappGroupAddedAt = new Date();
          app.whatsappGroupAddedBy = admin._id;
        } else {
          app.whatsappGroupAddedAt = undefined;
          app.whatsappGroupAddedBy = undefined;
        }
      }

      await app.save();

      // Trigger student stats adjustments
      const student: any = app.studentId;
      const event: any = app.eventId;

      if (student && event && status !== undefined) {
        // Selection count
        if (status === "selected" && oldStatus !== "selected") {
          student.selectedCount += 1;
        }

        // Attendance check-in/check-out metrics
        if (status === "attended" && oldStatus !== "attended") {
          student.attendedCount += 1;
          const earnAmt = app.paymentOverride ?? event.paymentPerStudent ?? 0;
          student.totalEarnings += earnAmt;
        }

        // Cancellations
        if (status === "cancelled" && oldStatus !== "cancelled") {
          student.cancelledCount += 1;
        }

        await student.save();
      }
    }

    return NextResponse.json({ success: true, message: `Successfully updated ${ids.length} applications.` });
  } catch (error: any) {
    console.error("Bulk Application Update Error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const admin = await getLoggedInAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    if (admin.role === "calling") {
      return NextResponse.json({ success: false, message: "Forbidden. Calling Admins cannot add students." }, { status: 403 });
    }

    const body = await request.json();
    const { eventId, customFields } = body;

    if (!eventId) {
      return NextResponse.json({ success: false, message: "Missing event ID." }, { status: 400 });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return NextResponse.json({ success: false, message: "Event not found." }, { status: 404 });
    }

    // Extract basic student details from customFields
    let name = "";
    let phone = "";
    let email = "";
    let university = "";
    let universityId = "";

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
        if (
          normalizedKey === "registration number" ||
          normalizedKey === "registration no" ||
          normalizedKey === "registration no." ||
          normalizedKey === "roll no" ||
          normalizedKey === "roll no." ||
          normalizedKey === "roll number" ||
          normalizedKey === "university id" ||
          normalizedKey === "university roll no" ||
          normalizedKey === "university registration number"
        ) {
          universityId = val;
        }
      });
    }

    if (!universityId) {
      return NextResponse.json({ success: false, message: "University Registration Number is required." }, { status: 400 });
    }

    const cleanUniId = universityId.trim().toUpperCase();

    // Fallbacks if not provided or left as "N/A"
    const finalName = (!name || name === "N/A") ? `Student ${cleanUniId}` : name.trim();
    const finalPhone = (!phone || phone === "N/A") ? cleanUniId : phone.trim();
    const finalEmail = (!email || email === "N/A") ? `${cleanUniId.toLowerCase().replace(/[^a-z0-9]/g, "")}@topline.co.in` : email.trim().toLowerCase();
    const finalUniversity = (!university || university === "N/A") ? "N/A" : university.trim();

    // Event isolation uniqueness check
    const existingReg = await Application.findOne({ eventId, registrationNumber: cleanUniId });
    if (existingReg) {
      return NextResponse.json({ success: false, message: `Registration number ${cleanUniId} has already been registered for this event.` }, { status: 409 });
    }

    // Find or create student master record
    let student = await Student.findOne({
      $or: [{ phone: finalPhone }, { universityId: cleanUniId }]
    });

    if (student) {
      if (student.status === "blocked") {
        return NextResponse.json({ success: false, message: "Student profile is restricted." }, { status: 403 });
      }
      student.name = finalName;
      student.phone = finalPhone;
      student.email = finalEmail;
      student.university = finalUniversity;
      await student.save();

      // Duplicate check (eventId + studentId)
      const existingApplication = await Application.findOne({ eventId, studentId: student._id });
      if (existingApplication) {
        return NextResponse.json({ success: false, message: "This student is already registered for this event." }, { status: 409 });
      }
    } else {
      student = await Student.create({
        name: finalName,
        phone: finalPhone,
        email: finalEmail,
        university: finalUniversity,
        universityId: cleanUniId,
        status: "active",
      });
    }

    // Increment event applications count
    event.applicationsCount += 1;
    if (event.applicationsCount >= event.maxApplications) {
      event.status = "FULL";
    }
    await event.save();

    // Create Application
    const application = await Application.create({
      eventId: event._id,
      studentId: student._id,
      status: "applied",
      customFieldsData: customFields || {},
      registrationNumber: cleanUniId,
      name: finalName,
      mobileNumber: finalPhone,
    });

    student.appliedCount += 1;
    await student.save();

    const populatedApp = await Application.findById(application._id).populate("studentId").populate("eventId").lean();

    return NextResponse.json({
      success: true,
      message: "Student added successfully.",
      application: populatedApp
    });
  } catch (error: any) {
    console.error("Add Student API Error:", error);
    if (error.code === 11000) {
      return NextResponse.json({ success: false, message: "Student has already been registered for this event." }, { status: 409 });
    }
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await connectToDatabase();
    const admin = await getLoggedInAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    if (admin.role === "calling") {
      return NextResponse.json({ success: false, message: "Forbidden. Calling Admins cannot delete applications." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, message: "Missing application ID." }, { status: 400 });
    }

    const app = await Application.findById(id).populate("eventId").populate("studentId");
    if (!app) {
      return NextResponse.json({ success: false, message: "Application not found." }, { status: 404 });
    }

    const student: any = app.studentId;
    const event: any = app.eventId;

    // Decrement Student metrics if relevant
    if (student) {
      if (app.status === "applied") student.appliedCount = Math.max(0, student.appliedCount - 1);
      if (app.status === "selected") student.selectedCount = Math.max(0, student.selectedCount - 1);
      if (app.status === "cancelled") student.cancelledCount = Math.max(0, student.cancelledCount - 1);
      if (app.status === "attended") {
        student.attendedCount = Math.max(0, student.attendedCount - 1);
        const earnAmt = app.paymentOverride ?? event?.paymentPerStudent ?? 0;
        student.totalEarnings = Math.max(0, student.totalEarnings - earnAmt);
      }
      await student.save();
    }

    // Decrement Event applicationsCount
    if (event) {
      event.applicationsCount = Math.max(0, event.applicationsCount - 1);
      if (event.status === "FULL" && event.applicationsCount < event.maxApplications) {
        event.status = "OPEN";
      }
      await event.save();
    }

    // Remove application
    await Application.deleteOne({ _id: id });

    return NextResponse.json({ success: true, message: "Application deleted successfully." });
  } catch (error: any) {
    console.error("Delete Application Error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
