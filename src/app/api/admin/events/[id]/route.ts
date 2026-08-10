import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Event, Application, Attendance, AuditLog } from "@/models";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const getStats = searchParams.get("stats") === "true";

    const event = await Event.findById(params.id).populate("clientId").lean();
    if (!event) {
      return NextResponse.json({ success: false, message: "Event not found." }, { status: 404 });
    }

    if (getStats) {
      const applicationsCount = await Application.countDocuments({ eventId: params.id });
      const attendanceCount = await Attendance.countDocuments({ eventId: params.id });
      const paymentsCount = await Application.countDocuments({ eventId: params.id, paymentStatus: "PAID" });

      return NextResponse.json({
        success: true,
        event,
        stats: {
          applicationsCount,
          attendanceCount,
          paymentsCount
        }
      });
    }

    return NextResponse.json({ success: true, event });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    await connectToDatabase();
    const eventId = params.id;
    const body = await request.json();

    const updatedEvent = await Event.findByIdAndUpdate(eventId, body, { new: true });
    if (!updatedEvent) {
      return NextResponse.json({ success: false, message: "Event not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Event updated successfully!", event: updatedEvent });
  } catch (error: any) {
    console.error("Update Event API Error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    await connectToDatabase();
    const eventId = params.id;

    // Verify event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return NextResponse.json({ success: false, message: "Event not found." }, { status: 404 });
    }

    // Write audit log trail
    await AuditLog.create({
      adminId: "SYSTEM_ADMIN",
      eventId: event._id.toString(),
      eventName: event.name,
      eventDate: event.date,
      action: "EVENT_DELETED"
    });

    // Cascade deletes (Event-scoped data)
    await Attendance.deleteMany({ eventId });
    await Application.deleteMany({ eventId });
    await Event.findByIdAndDelete(eventId);

    return NextResponse.json({
      success: true,
      message: `Event "${event.name}" and all associated data permanently deleted.`
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
