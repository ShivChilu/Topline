import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Application, Student, Event } from "@/models";

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId");
    const status = searchParams.get("status");

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
    const { ids, status, paymentOverride } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0 || !status) {
      return NextResponse.json({ success: false, message: "Missing application IDs or target status." }, { status: 400 });
    }

    // Process status updates and update student statistics dynamically
    for (const appId of ids) {
      const app = await Application.findById(appId).populate("eventId").populate("studentId");
      if (!app) continue;

      const oldStatus = app.status;
      app.status = status;
      if (paymentOverride !== undefined) {
        app.paymentOverride = Number(paymentOverride);
      }

      await app.save();

      // Trigger student stats adjustments
      const student: any = app.studentId;
      const event: any = app.eventId;

      if (student && event) {
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

    return NextResponse.json({ success: true, message: `Successfully updated ${ids.length} applications to ${status}.` });
  } catch (error: any) {
    console.error("Bulk Application Update Error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
