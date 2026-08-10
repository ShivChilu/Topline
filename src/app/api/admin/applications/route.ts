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

    const { ids, status, paymentStatus, messageStatus, paymentOverride } = await request.json();

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
