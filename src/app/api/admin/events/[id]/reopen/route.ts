import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { EventStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

async function getLoggedInAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded || !decoded.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
  });
  if (!user || !user.isActive || !["ADMIN", "SUPERADMIN"].includes(user.role)) return null;
  return user;
}

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const admin = await getLoggedInAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, message: "Forbidden. Only Super Admins and Admins can reopen events." }, { status: 403 });
    }

    const eventId = params.id;
    const body = await request.json();
    const {
      additionalSlots = 5,
      alsoIncreaseWorkers = true,
      newMaxApplications,
      newWorkersRequired,
    } = body;

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

    const currentApps = event.applicationsCount;
    const currentMax = event.maxApplications;
    const slotsToAdd = Math.max(1, Number(additionalSlots) || 5);

    // If newMaxApplications explicitly passed, use it; otherwise compute based on current max + additional slots
    let targetMax = newMaxApplications !== undefined && Number(newMaxApplications) > 0
      ? Number(newMaxApplications)
      : Math.max(currentMax + slotsToAdd, currentApps + slotsToAdd);

    // Ensure targetMax is at least currentApps + 1 so applications can be accepted
    if (targetMax <= currentApps) {
      targetMax = currentApps + slotsToAdd;
    }

    // Determine target workers required
    let targetWorkers = event.workersRequired;
    if (newWorkersRequired !== undefined && Number(newWorkersRequired) > 0) {
      targetWorkers = Number(newWorkersRequired);
    } else if (alsoIncreaseWorkers) {
      targetWorkers = event.workersRequired + slotsToAdd;
    }

    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: {
        status: EventStatus.OPEN,
        scheduledPublishAt: null,
        maxApplications: targetMax,
        workersRequired: targetWorkers,
      },
      include: {
        client: true,
        eventFormFields: {
          include: { formField: true },
          orderBy: { displayOrder: "asc" },
        },
      },
    });

    const formattedEvent = {
      ...updatedEvent,
      _id: updatedEvent.id,
      customFormFields: updatedEvent.eventFormFields.map((ef) => ({
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

    return NextResponse.json({
      success: true,
      message: `Event "${event.name}" reopened successfully with ${slotsToAdd} added slots (New Max: ${targetMax})!`,
      event: formattedEvent,
      newMaxApplications: targetMax,
      newWorkersRequired: targetWorkers,
      addedSlots: slotsToAdd,
    });
  } catch (error: any) {
    console.error("Reopen event error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
