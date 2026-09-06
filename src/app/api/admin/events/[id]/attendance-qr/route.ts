import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const eventId = params.id;
    const token = crypto.randomBytes(32).toString("hex");

    const event = await prisma.event.update({
      where: { id: eventId },
      data: {
        attendanceToken: token,
        attendanceTokenEnabled: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "QR Token generated successfully",
      attendanceToken: event.attendanceToken,
      attendanceTokenEnabled: event.attendanceTokenEnabled,
    });
  } catch (error: any) {
    console.error("QR Code generation error:", error);
    return NextResponse.json({ success: false, message: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const eventId = params.id;
    const body = await request.json();
    const { attendanceTokenEnabled, attendanceVerificationField, gracePeriod, attendanceDisplayFields } = body;

    const updateFields: any = {};
    if (typeof attendanceTokenEnabled !== "undefined") {
      updateFields.attendanceTokenEnabled = Boolean(attendanceTokenEnabled);
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

    const event = await prisma.event.update({
      where: { id: eventId },
      data: updateFields,
    });

    return NextResponse.json({
      success: true,
      message: "Settings updated successfully",
      event: { ...event, _id: event.id },
    });
  } catch (error: any) {
    console.error("QR Settings patch error:", error);
    return NextResponse.json({ success: false, message: error.message || "Internal server error" }, { status: 500 });
  }
}
