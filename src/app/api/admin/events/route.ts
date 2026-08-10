import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Event, Admin } from "@/models";
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

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const admin = await getLoggedInAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    // Calling admins are not authorized to create events
    if (admin.role === "calling") {
      return NextResponse.json({ success: false, message: "Forbidden. Calling Admins cannot create events." }, { status: 403 });
    }

    const body = await request.json();

    const {
      name,
      date,
      location,
      googleMapsUrl,
      reportingTime,
      startTime,
      endTime,
      workType,
      description,
      instructions,
      dressCode,
      dosAndDonts,
      workersRequired,
      maxApplications,
      paymentPerStudent,
      clientRevenue,
      otherExpenses,
      clientId,
      customFormFields,
      visibility
    } = body;

    // Validate core fields
    if (!name || !date || !location || !reportingTime || !startTime || !endTime || !workType || !description) {
      return NextResponse.json({ success: false, message: "Missing required core event fields." }, { status: 400 });
    }

    const event = await Event.create({
      name,
      date: new Date(date),
      location,
      googleMapsUrl,
      reportingTime,
      startTime,
      endTime,
      workType,
      description,
      instructions,
      dressCode,
      dosAndDonts: Array.isArray(dosAndDonts) ? dosAndDonts : [],
      workersRequired: Number(workersRequired || 0),
      maxApplications: Number(maxApplications || 0),
      paymentPerStudent: Number(paymentPerStudent || 0),
      clientRevenue: Number(clientRevenue || 0),
      otherExpenses: Number(otherExpenses || 0),
      status: "DRAFT", // Initialize as draft
      visibility: visibility || "VISIBLE",
      clientId: clientId || null,
      customFormFields: Array.isArray(customFormFields) ? customFormFields : [],
    });

    return NextResponse.json({ success: true, message: "Event created successfully as Draft!", eventId: event._id });
  } catch (error: any) {
    console.error("Create Event API Error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const admin = await getLoggedInAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const recentOnly = searchParams.get("recent") === "true";

    // Calling Admins can only retrieve events they are assigned to
    if (admin.role === "calling") {
      const filter: any = { _id: { $in: admin.assignedEvents || [] } };
      if (recentOnly) {
        filter.status = { $in: ["OPEN", "DRAFT", "FULL", "CLOSED"] };
      }
      
      const query = Event.find(filter).sort({ date: -1 });
      if (recentOnly) {
        query.limit(3);
      }
      const events = await query.lean();
      return NextResponse.json({ success: true, events });
    }

    if (recentOnly) {
      const events = await Event.find({ status: { $in: ["OPEN", "DRAFT", "FULL", "CLOSED"] } })
        .sort({ date: -1 })
        .limit(3)
        .lean();
      return NextResponse.json({ success: true, events });
    }

    const events = await Event.find().sort({ date: -1 }).populate("clientId").lean();
    return NextResponse.json({ success: true, events });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
