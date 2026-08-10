import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Event } from "@/models";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    await connectToDatabase();
    const eventId = params.id;

    // Generate secure random 256-bit token
    const token = crypto.randomBytes(32).toString("hex");

    const event = await Event.findByIdAndUpdate(
      eventId,
      {
        attendanceToken: token,
        attendanceTokenEnabled: true,
      },
      { new: true }
    );

    if (!event) {
      return NextResponse.json({ success: false, message: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "QR Token generated successfully",
      attendanceToken: event.attendanceToken,
      attendanceTokenEnabled: event.attendanceTokenEnabled,
    });
  } catch (error) {
    console.error("QR Code generation error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
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
    const { attendanceTokenEnabled, attendanceVerificationField, gracePeriod, attendanceDisplayFields } = body;

    const updateFields: any = {};
    if (typeof attendanceTokenEnabled !== "undefined") {
      updateFields.attendanceTokenEnabled = attendanceTokenEnabled;
    }
    if (typeof attendanceVerificationField !== "undefined") {
      updateFields.attendanceVerificationField = attendanceVerificationField;
    }
    if (typeof gracePeriod !== "undefined") {
      updateFields.gracePeriod = Number(gracePeriod);
    }
    if (typeof attendanceDisplayFields !== "undefined") {
      updateFields.attendanceDisplayFields = attendanceDisplayFields;
    }

    const event = await Event.findByIdAndUpdate(
      eventId,
      { $set: updateFields },
      { new: true }
    );

    if (!event) {
      return NextResponse.json({ success: false, message: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Settings updated successfully",
      event,
    });
  } catch (error) {
    console.error("QR Settings patch error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
