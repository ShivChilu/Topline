import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStudentProfileCompletion } from "@/lib/profile-completion";
import { ApplicationStatus, EventStatus } from "@prisma/client";

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const eventId = params.id;
    const body = await request.json();

    // 1. Authenticate Student Session
    const cookieStore = await cookies();
    const token = cookieStore.get("user_token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Please log in with your Topline student account to apply." },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.id) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired session. Please log in again." },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { success: false, message: "Your student profile is inactive or restricted by administrators." },
        { status: 403 }
      );
    }

    // 2. Strict 100% Profile Completeness Gate
    const completeness = await getStudentProfileCompletion(user.id);
    if (!completeness.isComplete) {
      const missingList = [...completeness.missingFields, ...completeness.missingPhotos];
      return NextResponse.json(
        {
          success: false,
          error: "PROFILE_INCOMPLETE",
          message: `Your profile must be 100% complete before applying to events. Missing: ${missingList.join(", ")}`,
          completeness,
        },
        { status: 403 }
      );
    }

    // 3. Fetch target event
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return NextResponse.json({ success: false, message: "Event not found." }, { status: 404 });
    }

    let currentEvent = event;
    if (currentEvent.status === EventStatus.SCHEDULED) {
      if (currentEvent.scheduledPublishAt && new Date() >= currentEvent.scheduledPublishAt) {
        currentEvent = await prisma.event.update({
          where: { id: eventId },
          data: { status: EventStatus.OPEN, scheduledPublishAt: null },
        });
      } else {
        const scheduledTimeStr = currentEvent.scheduledPublishAt
          ? new Date(currentEvent.scheduledPublishAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })
          : "a later date";
        return NextResponse.json(
          { success: false, message: `This event is scheduled. Applications will open on ${scheduledTimeStr}.` },
          { status: 400 }
        );
      }
    }

    if (currentEvent.status !== EventStatus.OPEN) {
      return NextResponse.json(
        { success: false, message: `Applications are currently ${currentEvent.status.toLowerCase()}.` },
        { status: 400 }
      );
    }

    if (event.applicationsCount >= event.maxApplications) {
      return NextResponse.json(
        { success: false, message: "Applications are full for this event." },
        { status: 400 }
      );
    }

    // 4. Gender Eligibility Gate
    if (event.allowedGender === "FEMALE_ONLY") {
      if (!user.gender || user.gender.toLowerCase() !== "female") {
        return NextResponse.json(
          {
            success: false,
            error: "GENDER_INELIGIBLE",
            message: `This event is exclusively open to female candidates. Your profile gender is listed as ${user.gender || "unspecified"}.`,
          },
          { status: 403 }
        );
      }
    } else if (event.allowedGender === "MALE_ONLY") {
      if (!user.gender || user.gender.toLowerCase() !== "male") {
        return NextResponse.json(
          {
            success: false,
            error: "GENDER_INELIGIBLE",
            message: `This event is exclusively open to male candidates. Your profile gender is listed as ${user.gender || "unspecified"}.`,
          },
          { status: 403 }
        );
      }
    }

    // 5. Check duplicate application by (eventId + userId) OR (eventId + registrationNumber)
    const existingApp = await prisma.application.findFirst({
      where: {
        eventId,
        OR: [
          { userId: user.id },
          ...(user.registrationNumber ? [{ registrationNumber: user.registrationNumber }] : []),
        ],
      },
    });

    if (existingApp) {
      return NextResponse.json(
        {
          success: false,
          message: "You have already applied for this event.",
        },
        { status: 409 }
      );
    }

    // 5. Update Event application count
    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: {
        applicationsCount: { increment: 1 },
      },
    });

    if (updatedEvent.applicationsCount >= updatedEvent.maxApplications && updatedEvent.status === EventStatus.OPEN) {
      await prisma.event.update({
        where: { id: eventId },
        data: { status: EventStatus.FULL },
      });
    }

    // 6. Create Application record linked to verified user profile
    const application = await prisma.application.create({
      data: {
        eventId: event.id,
        userId: user.id,
        name: user.name,
        mobileNumber: user.phone || "N/A",
        registrationNumber: user.registrationNumber || "N/A",
        status: ApplicationStatus.APPLIED,
      },
    });

    // 7. Save dynamic custom field responses
    const customFields = body.customFields;
    if (customFields && typeof customFields === "object") {
      for (const [key, val] of Object.entries(customFields)) {
        if (val === undefined || val === null || String(val).trim() === "") continue;
        const fieldKey = key.toLowerCase().replace(/[^a-z0-9_]/g, "_");
        const formField = await prisma.formField.findUnique({ where: { key: fieldKey } });
        if (formField) {
          await prisma.applicationFieldResponse.create({
            data: {
              applicationId: application.id,
              fieldId: formField.id,
              value: typeof val === "object" ? JSON.stringify(val) : String(val),
            },
          });
        }
      }
    }

    const confirmationMessage =
      event.instructions ||
      "Application Submitted Successfully! Selection details will be communicated via WhatsApp.";

    return NextResponse.json({
      success: true,
      message: confirmationMessage,
      applicationId: application.id,
    });
  } catch (error: any) {
    console.error("Application submission error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error." },
      { status: 500 }
    );
  }
}
