import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const eventId = params.id;
    let event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        name: true,
        date: true,
        location: true,
        clientShareToken: true,
        clientShareEnabled: true,
        clientShareTitle: true,
        clientShareFields: true,
        clientShareCandidateStatus: true,
        clientShareCustomNotes: true,
      },
    });

    if (!event) {
      return NextResponse.json({ success: false, message: "Event not found" }, { status: 404 });
    }

    // If no token exists yet, generate a random secure token
    if (!event.clientShareToken) {
      const newToken = crypto.randomBytes(12).toString("hex");
      event = await prisma.event.update({
        where: { id: eventId },
        data: {
          clientShareToken: newToken,
          clientShareEnabled: true,
          clientShareFields: ["name", "photos", "height", "gender"],
          clientShareCandidateStatus: ["CONFIRMED"],
        },
        select: {
          id: true,
          name: true,
          date: true,
          location: true,
          clientShareToken: true,
          clientShareEnabled: true,
          clientShareTitle: true,
          clientShareFields: true,
          clientShareCandidateStatus: true,
          clientShareCustomNotes: true,
        },
      });
    }

    // Get candidate count matching statuses
    const candidateCount = await prisma.application.count({
      where: {
        eventId,
        status: { in: (event.clientShareCandidateStatus as any) || ["CONFIRMED"] },
      },
    });

    return NextResponse.json({
      success: true,
      share: {
        token: event.clientShareToken,
        enabled: event.clientShareEnabled,
        title: event.clientShareTitle || "",
        fields: event.clientShareFields || ["name", "photos", "height", "gender"],
        candidateStatus: event.clientShareCandidateStatus || ["CONFIRMED"],
        customNotes: event.clientShareCustomNotes || "",
        candidateCount,
      },
    });
  } catch (error: any) {
    console.error("Fetch client share error:", error);
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
    const { enabled, title, fields, candidateStatus, customNotes } = body;

    const dataToUpdate: any = {};
    if (typeof enabled === "boolean") dataToUpdate.clientShareEnabled = enabled;
    if (typeof title === "string") dataToUpdate.clientShareTitle = title.trim();
    if (Array.isArray(fields)) dataToUpdate.clientShareFields = fields;
    if (Array.isArray(candidateStatus)) dataToUpdate.clientShareCandidateStatus = candidateStatus;
    if (typeof customNotes === "string") dataToUpdate.clientShareCustomNotes = customNotes.trim();

    const updated = await prisma.event.update({
      where: { id: eventId },
      data: dataToUpdate,
      select: {
        clientShareToken: true,
        clientShareEnabled: true,
        clientShareTitle: true,
        clientShareFields: true,
        clientShareCandidateStatus: true,
        clientShareCustomNotes: true,
      },
    });

    const candidateCount = await prisma.application.count({
      where: {
        eventId,
        status: { in: (updated.clientShareCandidateStatus as any) || ["CONFIRMED"] },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Client showcase settings updated",
      share: {
        token: updated.clientShareToken,
        enabled: updated.clientShareEnabled,
        title: updated.clientShareTitle || "",
        fields: updated.clientShareFields,
        candidateStatus: updated.clientShareCandidateStatus,
        customNotes: updated.clientShareCustomNotes || "",
        candidateCount,
      },
    });
  } catch (error: any) {
    console.error("Update client share error:", error);
    return NextResponse.json({ success: false, message: error.message || "Internal server error" }, { status: 500 });
  }
}

// POST: Reset/Regenerate Token (Revokes old link)
export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const eventId = params.id;
    const newToken = crypto.randomBytes(12).toString("hex");

    const updated = await prisma.event.update({
      where: { id: eventId },
      data: {
        clientShareToken: newToken,
        clientShareEnabled: true,
      },
      select: {
        clientShareToken: true,
        clientShareEnabled: true,
        clientShareTitle: true,
        clientShareFields: true,
        clientShareCandidateStatus: true,
        clientShareCustomNotes: true,
      },
    });

    const candidateCount = await prisma.application.count({
      where: {
        eventId,
        status: { in: (updated.clientShareCandidateStatus as any) || ["CONFIRMED"] },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Share link has been reset. The old link is now expired.",
      share: {
        token: updated.clientShareToken,
        enabled: updated.clientShareEnabled,
        title: updated.clientShareTitle || "",
        fields: updated.clientShareFields,
        candidateStatus: updated.clientShareCandidateStatus,
        customNotes: updated.clientShareCustomNotes || "",
        candidateCount,
      },
    });
  } catch (error: any) {
    console.error("Reset client share token error:", error);
    return NextResponse.json({ success: false, message: error.message || "Internal server error" }, { status: 500 });
  }
}
