import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { EventStatus } from "@prisma/client";

import { hasEventPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

async function getLoggedInAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded || !decoded.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    include: { assignedEvents: { select: { eventId: true, permissions: true } } },
  });
  if (!user || !user.isActive || !["ADMIN", "SUPERADMIN", "EVENT_ADMIN"].includes(user.role)) return null;
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
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const eventId = params.id;
    if (!hasEventPermission(admin, "events:reopen_slots", eventId)) {
      return NextResponse.json(
        { success: false, message: "Forbidden. You do not have permission ('events:reopen_slots') to reopen this event or add slots." },
        { status: 403 }
      );
    }
    const body = await request.json();
    const {
      additionalSlots = 5,
      alsoIncreaseWorkers = true,
      newRequiredApplications,
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
    const currentRequired = event.workersRequired || event.maxApplications || 0;
    const slotsToAdd = Math.max(1, Number(additionalSlots) || 5);

    // Unified target Required Applications
    let targetRequired = 0;
    if (newRequiredApplications !== undefined && Number(newRequiredApplications) > 0) {
      targetRequired = Number(newRequiredApplications);
    } else if (newMaxApplications !== undefined && Number(newMaxApplications) > 0) {
      targetRequired = Number(newMaxApplications);
    } else if (newWorkersRequired !== undefined && Number(newWorkersRequired) > 0) {
      targetRequired = Number(newWorkersRequired);
    } else {
      targetRequired = Math.max(currentRequired + slotsToAdd, currentApps + slotsToAdd);
    }

    // Ensure targetRequired is at least currentApps + 1 so applications can be accepted
    if (targetRequired <= currentApps) {
      targetRequired = currentApps + slotsToAdd;
    }

    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: {
        status: EventStatus.OPEN,
        scheduledPublishAt: null,
        maxApplications: targetRequired,
        workersRequired: targetRequired,
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
      message: `Event "${event.name}" reopened successfully with ${slotsToAdd} added slots (New Required: ${targetRequired})!`,
      event: formattedEvent,
      newRequiredApplications: targetRequired,
      newMaxApplications: targetRequired,
      newWorkersRequired: targetRequired,
      addedSlots: slotsToAdd,
    });
  } catch (error: any) {
    console.error("Reopen event error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
