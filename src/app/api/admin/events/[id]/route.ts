import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { Role, PaymentStatus } from "@prisma/client";

async function getLoggedInAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded || !decoded.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    include: { assignedEvents: { select: { eventId: true } } },
  });
  if (!user || !user.isActive || !["ADMIN", "SUPERADMIN", "CALLING_ADMIN"].includes(user.role)) return null;
  return user;
}

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const admin = await getLoggedInAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const eventId = params.id;

    if (admin.role === "CALLING_ADMIN") {
      const isAssigned = admin.assignedEvents.some((a) => a.eventId === eventId);
      if (!isAssigned) {
        return NextResponse.json({ success: false, message: "Forbidden. You do not have access to this event." }, { status: 403 });
      }
    }

    const { searchParams } = new URL(request.url);
    const getStats = searchParams.get("stats") === "true";

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        client: true,
        eventFormFields: {
          include: { formField: true },
          orderBy: { displayOrder: "asc" },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ success: false, message: "Event not found." }, { status: 404 });
    }

    const formattedEvent = {
      ...event,
      _id: event.id,
      customFormFields: event.eventFormFields.map((ef) => ({
        id: ef.formField.id,
        key: ef.formField.key,
        label: ef.formField.label,
        type: ef.formField.type.toLowerCase(),
        description: ef.formField.description || "",
        placeholder: ef.formField.placeholder || "",
        options: ef.formField.options,
        required: ef.isRequired,
        min: null,
        max: null,
      })),
    };

    if (getStats) {
      const applicationsCount = await prisma.application.count({ where: { eventId } });
      const attendanceCount = await prisma.attendance.count({ where: { eventId } });
      const paymentsCount = await prisma.application.count({ where: { eventId, paymentStatus: PaymentStatus.PAID } });

      return NextResponse.json({
        success: true,
        event: formattedEvent,
        stats: {
          applicationsCount,
          attendanceCount,
          paymentsCount,
        },
      });
    }

    return NextResponse.json({ success: true, event: formattedEvent });
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
    const admin = await getLoggedInAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    if (admin.role === "CALLING_ADMIN") {
      return NextResponse.json({ success: false, message: "Forbidden. Calling Admins cannot edit events." }, { status: 403 });
    }

    const eventId = params.id;
    const body = await request.json();

    const allowedData: any = {};
    if (body.name !== undefined) allowedData.name = body.name;
    if (body.date !== undefined) allowedData.date = new Date(body.date);
    if (body.location !== undefined) allowedData.location = body.location;
    if (body.googleMapsUrl !== undefined) allowedData.googleMapsUrl = body.googleMapsUrl;
    if (body.reportingTime !== undefined) allowedData.reportingTime = body.reportingTime;
    if (body.startTime !== undefined) allowedData.startTime = body.startTime;
    if (body.endTime !== undefined) allowedData.endTime = body.endTime;
    if (body.workType !== undefined) allowedData.workType = body.workType;
    if (body.description !== undefined) allowedData.description = body.description;
    if (body.instructions !== undefined) allowedData.instructions = body.instructions;
    if (body.dressCode !== undefined) allowedData.dressCode = body.dressCode;
    if (body.dosAndDonts !== undefined) allowedData.dosAndDonts = body.dosAndDonts;
    if (body.workersRequired !== undefined) allowedData.workersRequired = Number(body.workersRequired);
    if (body.maxApplications !== undefined) allowedData.maxApplications = Number(body.maxApplications);
    if (body.paymentPerStudent !== undefined) allowedData.paymentPerStudent = Number(body.paymentPerStudent);
    if (body.clientRevenue !== undefined) allowedData.clientRevenue = Number(body.clientRevenue);
    if (body.otherExpenses !== undefined) allowedData.otherExpenses = Number(body.otherExpenses);
    if (body.status !== undefined) allowedData.status = body.status;
    if (body.visibility !== undefined) allowedData.visibility = body.visibility;
    if (body.allowedGender !== undefined) allowedData.allowedGender = body.allowedGender;
    if (body.clientId !== undefined) allowedData.clientId = body.clientId || null;

    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: allowedData,
    });

    return NextResponse.json({
      success: true,
      message: "Event updated successfully!",
      event: { ...updatedEvent, _id: updatedEvent.id },
    });
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
    const admin = await getLoggedInAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    if (admin.role === "CALLING_ADMIN") {
      return NextResponse.json({ success: false, message: "Forbidden. Calling Admins cannot delete events." }, { status: 403 });
    }

    const eventId = params.id;

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return NextResponse.json({ success: false, message: "Event not found." }, { status: 404 });
    }

    // Write audit log trail
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: "EVENT_DELETED",
        target: event.name,
        metadata: {
          eventId: event.id,
          eventName: event.name,
          eventDate: event.date,
        },
      },
    });

    // Cascade delete event (Prisma foreign keys configured with onDelete: Cascade will clean children)
    await prisma.event.delete({ where: { id: eventId } });

    return NextResponse.json({
      success: true,
      message: `Event "${event.name}" and all associated data permanently deleted.`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
