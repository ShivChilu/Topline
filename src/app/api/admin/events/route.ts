import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { Role, EventStatus, EventVisibility, FieldType } from "@prisma/client";

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
  if (!user || !user.isActive || !["ADMIN", "SUPERADMIN", "CALLING_ADMIN", "EVENT_ADMIN"].includes(user.role)) return null;
  return user;
}

export async function POST(request: Request) {
  try {
    const admin = await getLoggedInAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    if (admin.role === "CALLING_ADMIN" || admin.role === "EVENT_ADMIN") {
      return NextResponse.json({ success: false, message: "Forbidden. Only Super Admins and Admins can create events." }, { status: 403 });
    }

    const body = await request.json();

    const {
      name,
      date,
      location,
      googleMapsUrl,
      reportingTime,
      startTime,
      endTime,
      workType,
      description,
      instructions,
      dressCode,
      dosAndDonts,
      workersRequired,
      maxApplications,
      paymentPerStudent,
      clientRevenue,
      otherExpenses,
      clientId,
      customFormFields,
      visibility,
    } = body;

    // All fields are optional: populate sensible defaults for draft events
    const finalName = name && name.trim() ? name.trim() : "New Event Draft";
    const finalDate = date ? new Date(date) : new Date(Date.now() + 24 * 60 * 60 * 1000);
    const finalLocation = location && location.trim() ? location.trim() : "Venue to be announced";
    const finalReportingTime = reportingTime && reportingTime.trim() ? reportingTime.trim() : "TBD";
    const finalStartTime = startTime && startTime.trim() ? startTime.trim() : "TBD";
    const finalEndTime = endTime && endTime.trim() ? endTime.trim() : "TBD";
    const finalWorkType = workType && workType.trim() ? workType.trim() : "Catering Staff";
    const finalDescription = description && description.trim() ? description.trim() : "Event responsibilities and details will be updated soon.";

    let initialStatus: EventStatus = EventStatus.DRAFT;
    let scheduledDate: Date | null = null;

    if (body.status === "SCHEDULED" && body.scheduledPublishAt) {
      initialStatus = EventStatus.SCHEDULED;
      scheduledDate = new Date(body.scheduledPublishAt);
    } else if (body.status === "OPEN") {
      initialStatus = EventStatus.OPEN;
    } else if (body.status && Object.values(EventStatus).includes(body.status)) {
      initialStatus = body.status as EventStatus;
    }

    const event = await prisma.event.create({
      data: {
        name: finalName,
        date: finalDate,
        location: finalLocation,
        googleMapsUrl: googleMapsUrl ? googleMapsUrl.trim() : null,
        reportingTime: finalReportingTime,
        startTime: finalStartTime,
        endTime: finalEndTime,
        workType: finalWorkType,
        description: finalDescription,
        instructions: instructions ? instructions.trim() : null,
        dressCode: dressCode ? dressCode.trim() : null,
        dosAndDonts: Array.isArray(dosAndDonts) ? dosAndDonts : [],
        workersRequired: Number(workersRequired) || 15,
        maxApplications: Number(maxApplications) || 25,
        paymentPerStudent: Number(paymentPerStudent) || 800,
        clientRevenue: Number(clientRevenue) || 0,
        otherExpenses: Number(otherExpenses) || 0,
        status: initialStatus,
        scheduledPublishAt: scheduledDate,
        visibility: visibility === "HIDDEN" ? EventVisibility.HIDDEN : EventVisibility.VISIBLE,
        allowedGender: body.allowedGender === "FEMALE_ONLY" ? "FEMALE_ONLY" : body.allowedGender === "MALE_ONLY" ? "MALE_ONLY" : "ALL",
        whatsappGroupLink: body.whatsappGroupLink && body.whatsappGroupLink.trim() ? body.whatsappGroupLink.trim() : null,
        clientId: clientId || null,
      },
    });

    // Relational dynamic form field creation/junction setup
    if (Array.isArray(customFormFields) && customFormFields.length > 0) {
      for (let idx = 0; idx < customFormFields.length; idx++) {
        const f = customFormFields[idx];
        const fieldKey = (f.label || `field_${Date.now()}_${idx}`).toLowerCase().replace(/[^a-z0-9_]/g, "_");

        const typeMap: Record<string, FieldType> = {
          text: FieldType.TEXT,
          paragraph: FieldType.PARAGRAPH,
          number: FieldType.NUMBER,
          email: FieldType.EMAIL,
          phone: FieldType.PHONE,
          date: FieldType.DATE,
          time: FieldType.TIME,
          select: FieldType.SELECT,
          checkbox: FieldType.CHECKBOX,
          radio: FieldType.RADIO,
          yesno: FieldType.YESNO,
          rating: FieldType.RATING,
          file: FieldType.FILE,
        };

        const formField = await prisma.formField.upsert({
          where: { key: fieldKey },
          update: {
            label: f.label,
            type: typeMap[f.type] || FieldType.TEXT,
            description: f.description || null,
            placeholder: f.placeholder || null,
            options: Array.isArray(f.options) ? f.options : [],
            isRequired: Boolean(f.required),
          },
          create: {
            key: fieldKey,
            label: f.label,
            type: typeMap[f.type] || FieldType.TEXT,
            description: f.description || null,
            placeholder: f.placeholder || null,
            options: Array.isArray(f.options) ? f.options : [],
            isRequired: Boolean(f.required),
            displayOrder: idx,
          },
        });

        await prisma.eventFormField.create({
          data: {
            eventId: event.id,
            fieldId: formField.id,
            isRequired: Boolean(f.required),
            displayOrder: idx,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Event created successfully as Draft!",
      eventId: event.id,
      _id: event.id,
    });
  } catch (error: any) {
    console.error("Create Event API Error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const admin = await getLoggedInAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const recentOnly = searchParams.get("recent") === "true";

    const whereClause: any = {};

    if (admin.role === "CALLING_ADMIN" || admin.role === "EVENT_ADMIN") {
      const assignedIds = admin.assignedEvents.map((a) => a.eventId);
      whereClause.id = { in: assignedIds };
    }

    if (recentOnly) {
      whereClause.status = { in: [EventStatus.OPEN, EventStatus.DRAFT, EventStatus.FULL, EventStatus.CLOSED] };
    }

    const now = new Date();
    // Auto-promote any scheduled events that have reached their trigger time
    await prisma.event.updateMany({
      where: {
        status: EventStatus.SCHEDULED,
        scheduledPublishAt: { lte: now },
      },
      data: {
        status: EventStatus.OPEN,
      },
    });

    const events = await prisma.event.findMany({
      where: whereClause,
      include: {
        client: true,
        eventFormFields: {
          include: { formField: true },
          orderBy: { displayOrder: "asc" },
        },
      },
      orderBy: { date: "desc" },
      take: recentOnly ? 3 : undefined,
    });

    const formattedEvents = events.map((e) => ({
      ...e,
      _id: e.id,
      customFormFields: e.eventFormFields.map((ef) => ({
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
    }));

    return NextResponse.json({ success: true, events: formattedEvents });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
