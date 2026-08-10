import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Event, Application, Attendance, AuditLog, Admin } from "@/models";
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

    const eventId = params.id;
    // Calling Admin security boundaries
    if (admin.role === "calling") {
      const isAssigned = admin.assignedEvents?.some((id) => id.toString() === eventId);
      if (!isAssigned) {
        return NextResponse.json({ success: false, message: "Forbidden. You do not have access to this event." }, { status: 403 });
      }
    }

    const { searchParams } = new URL(request.url);
    const getStats = searchParams.get("stats") === "true";

    const event = await Event.findById(eventId).populate("clientId").lean();
    if (!event) {
      return NextResponse.json({ success: false, message: "Event not found." }, { status: 404 });
    }

    if (getStats) {
      const applicationsCount = await Application.countDocuments({ eventId });
      const attendanceCount = await Attendance.countDocuments({ eventId });
      const paymentsCount = await Application.countDocuments({ eventId, paymentStatus: "PAID" });

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
    const admin = await getLoggedInAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    if (admin.role === "calling") {
      return NextResponse.json({ success: false, message: "Forbidden. Calling Admins cannot edit events." }, { status: 403 });
    }

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
    const admin = await getLoggedInAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    if (admin.role === "calling") {
      return NextResponse.json({ success: false, message: "Forbidden. Calling Admins cannot delete events." }, { status: 403 });
    }

    const eventId = params.id;

    // Verify event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return NextResponse.json({ success: false, message: "Event not found." }, { status: 404 });
    }

    // Write audit log trail
    await AuditLog.create({
      adminId: admin._id.toString(),
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
