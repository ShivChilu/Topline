import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Event } from "@/models";

export async function POST(request: Request) {
  try {
    await connectToDatabase();
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

export async function GET() {
  try {
    await connectToDatabase();
    const events = await Event.find().sort({ date: -1 }).populate("clientId").lean();
    return NextResponse.json({ success: true, events });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
