import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { ApplicationStatus, PaymentStatus, MessageStatus } from "@prisma/client";
import { sendEventSelectionEmail, sendEventDeselectionEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

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

export async function GET(request: Request) {
  try {
    const admin = await getLoggedInAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId");
    const status = searchParams.get("status");

    if (admin.role === "CALLING_ADMIN") {
      if (!eventId) {
        return NextResponse.json({ success: false, message: "Forbidden. Event ID is required for Calling Admin queries." }, { status: 403 });
      }
      const isAssigned = admin.assignedEvents.some((a) => a.eventId === eventId);
      if (!isAssigned) {
        return NextResponse.json({ success: false, message: "Forbidden. You do not have access to this event." }, { status: 403 });
      }
    }

    const whereClause: any = {};
    if (eventId) whereClause.eventId = eventId;
    if (status && status !== "ALL") whereClause.status = status.toUpperCase() as ApplicationStatus;

    const applications = await prisma.application.findMany({
      where: whereClause,
      include: {
        event: true,
        user: {
          include: {
            studentPhotos: {
              orderBy: { createdAt: "desc" },
            },
            profileFieldValues: {
              include: { profileField: true },
            },
          },
        },
        fieldResponses: {
          include: { formField: true },
        },
        photos: true,
        attendance: true,
        statusHistory: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
      orderBy: [
        { callPriority: "desc" },
        { lastActionAt: "desc" },
        { createdAt: "asc" },
      ],
    });

    const formattedApplications = applications.map((app) => {
      const customFieldsMap: Record<string, any> = {};
      app.fieldResponses.forEach((fr) => {
        try {
          customFieldsMap[fr.formField.key] = JSON.parse(fr.value);
        } catch {
          customFieldsMap[fr.formField.key] = fr.value;
        }
        customFieldsMap[fr.formField.id] = customFieldsMap[fr.formField.key];
      });

      // Photo fallback hierarchy: Primary -> Formal -> Full Length -> Casual -> User profilePhotoUrl
      const studentPhotos = app.user?.studentPhotos || [];
      const primaryPhoto =
        studentPhotos.find((p) => p.isPrimary) ||
        studentPhotos.find((p) => p.photoType === "FORMAL") ||
        studentPhotos.find((p) => p.photoType === "FULL_LENGTH") ||
        studentPhotos[0];

      const resolvedPhotoUrl =
        primaryPhoto?.url ||
        app.photos[0]?.url ||
        app.user?.profilePhotoUrl ||
        "";

      // Authoritative Mobile Phone
      const authoritativePhone =
        (app.user?.phone && app.user.phone !== "N/A" ? app.user.phone : null) ||
        (app.mobileNumber && app.mobileNumber !== "N/A" ? app.mobileNumber : "") ||
        "Mobile not available";

      // Completeness score
      let score = 0;
      if (app.name || app.user?.name) score += 20;
      if (authoritativePhone && authoritativePhone !== "Mobile not available") score += 20;
      if (resolvedPhotoUrl) score += 30;
      if (app.user?.university) score += 15;
      if (app.user?.city || app.user?.gender) score += 15;

      return {
        ...app,
        _id: app.id,
        id: app.id,
        status: app.status,
        mobileNumber: authoritativePhone,
        photoUrl: resolvedPhotoUrl,
        completenessScore: Math.min(score, 100),
        studentId: {
          ...app.user,
          _id: app.user?.id,
          id: app.user?.id,
          name: app.user?.name || app.name,
          phone: authoritativePhone,
          email: app.user?.email || "N/A",
          universityId: app.user?.registrationNumber || app.registrationNumber,
          registrationNumber: app.user?.registrationNumber || app.registrationNumber,
          university: app.user?.university || "N/A",
          city: app.user?.city || "N/A",
          gender: app.user?.gender || "N/A",
          height: app.user?.height || "N/A",
          weight: app.user?.weight || "N/A",
          age: app.user?.age || null,
          upiId: app.user?.upiId || "N/A",
          bio: app.user?.bio || "",
          profilePhotoUrl: resolvedPhotoUrl,
          studentPhotos: studentPhotos,
          selectionStatus: app.user?.selectionStatus || "UNDER_REVIEW", // Permanent Student Selection
          dynamicProfileFields: app.user?.profileFieldValues?.map((pv) => ({
            key: pv.profileField.key,
            label: pv.profileField.label,
            type: pv.profileField.type,
            value: pv.value,
          })) || [],
        },
        eventId: {
          ...app.event,
          _id: app.event.id,
          id: app.event.id,
        },
        customFieldsData: customFieldsMap,
        dynamicEventResponses: app.fieldResponses.map((fr) => ({
          fieldId: fr.fieldId,
          key: fr.formField.key,
          label: fr.formField.label,
          value: customFieldsMap[fr.formField.key] || fr.value,
        })),
      };
    });

    return NextResponse.json({ success: true, applications: formattedApplications });
  } catch (error: any) {
    console.error("Admin applications GET error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await getLoggedInAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const {
      ids,
      status,
      paymentStatus,
      messageStatus,
      paymentOverride,
      whatsappGroupAdded,
      callPriority,
      manualOrder,
      callingRemarks,
      sendEmail = true,
      notes,
    } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: false, message: "Missing application IDs." }, { status: 400 });
    }

    if (admin.role === "CALLING_ADMIN") {
      if (paymentStatus !== undefined || paymentOverride !== undefined) {
        return NextResponse.json({ success: false, message: "Forbidden. Calling Admins cannot modify payment details." }, { status: 403 });
      }
    }

    const now = new Date();
    let updatedCount = 0;

    for (const appId of ids) {
      const app = await prisma.application.findUnique({
        where: { id: appId },
        include: {
          event: true,
          user: true,
        },
      });
      if (!app) continue;

      if (admin.role === "CALLING_ADMIN") {
        const isAssigned = admin.assignedEvents.some((a) => a.eventId === app.eventId);
        if (!isAssigned) {
          return NextResponse.json({ success: false, message: "Forbidden. Attempted access to unassigned event data." }, { status: 403 });
        }
      }

      const oldStatus = app.status;
      const nextStatus = status ? (status.toUpperCase() as ApplicationStatus) : undefined;
      const isStatusChanged = nextStatus !== undefined && nextStatus !== oldStatus;

      const updateData: any = {
        lastActionAt: now,
      };

      if (nextStatus) {
        updateData.status = nextStatus;

        if (nextStatus === "SELECTED") {
          updateData.selectedAt = now;
          if (sendEmail) updateData.eventSelectionEmailSentAt = now;
          updateData.callPriority = -1; // Move processed down queue
        } else if (nextStatus === "NOT_SELECTED" || nextStatus === "REJECTED") {
          updateData.notSelectedAt = now;
          if (sendEmail) updateData.eventDeselectionEmailSentAt = now;
          updateData.callPriority = -1;
        } else if (["CONFIRMED", "ATTENDED", "ABSENT", "CANCELLED"].includes(nextStatus)) {
          if (nextStatus === "CONFIRMED") updateData.confirmedAt = now;
          updateData.callPriority = -1;
        } else if (nextStatus === "APPLIED" || nextStatus === "UNDER_REVIEW") {
          updateData.callPriority = 0; // Keep pending near top
        }
      }

      if (paymentStatus !== undefined) {
        updateData.paymentStatus = paymentStatus.toUpperCase() as PaymentStatus;
      }
      if (messageStatus !== undefined) {
        updateData.messageStatus = messageStatus.toUpperCase() as MessageStatus;
      }
      if (paymentOverride !== undefined) {
        updateData.paymentOverride = Number(paymentOverride);
      }
      if (callPriority !== undefined) {
        updateData.callPriority = Number(callPriority);
      }
      if (manualOrder !== undefined) {
        updateData.manualOrder = Number(manualOrder);
      }
      if (callingRemarks !== undefined) {
        updateData.callingRemarks = callingRemarks;
      }
      if (whatsappGroupAdded !== undefined) {
        updateData.whatsappGroupAdded = Boolean(whatsappGroupAdded);
        updateData.whatsappGroupAddedAt = whatsappGroupAdded ? now : null;
        updateData.whatsappGroupAddedById = whatsappGroupAdded ? admin.id : null;
      }

      // Execute DB update
      await prisma.application.update({
        where: { id: appId },
        data: updateData,
      });

      // Log status history if status changed
      if (isStatusChanged && nextStatus) {
        await prisma.applicationStatusHistory.create({
          data: {
            applicationId: appId,
            oldStatus,
            newStatus: nextStatus,
            changedById: admin.id,
            notes: notes || undefined,
          },
        });

        // Trigger email asynchronously only when status genuine transitioned
        if (sendEmail && app.user?.email) {
          if (nextStatus === "SELECTED") {
            sendEventSelectionEmail({
              studentName: app.user.name || app.name,
              email: app.user.email,
              eventName: app.event.name,
              eventDate: app.event.date,
              eventLocation: app.event.location,
              reportingTime: app.event.reportingTime,
              instructions: app.event.instructions,
              notes,
            }).catch((err) => console.error("Event selection email dispatch error:", err));
          } else if (nextStatus === "NOT_SELECTED" || nextStatus === "REJECTED") {
            sendEventDeselectionEmail({
              studentName: app.user.name || app.name,
              email: app.user.email,
              eventName: app.event.name,
              eventDate: app.event.date,
              notes,
            }).catch((err) => console.error("Event deselection email dispatch error:", err));
          }
        }
      }

      updatedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${updatedCount} application(s).`,
    });
  } catch (error: any) {
    console.error("Bulk Application Update Error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await getLoggedInAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const ids = searchParams.get("ids")?.split(",").filter(Boolean);

    const targetIds = id ? [id] : ids || [];

    if (targetIds.length === 0) {
      return NextResponse.json({ success: false, message: "Missing application ID(s)." }, { status: 400 });
    }

    let deletedCount = 0;

    for (const appId of targetIds) {
      const app = await prisma.application.findUnique({
        where: { id: appId },
        include: { event: true },
      });
      if (!app) continue;

      if (admin.role === "CALLING_ADMIN") {
        const isAssigned = admin.assignedEvents.some((a) => a.eventId === app.eventId);
        if (!isAssigned) {
          return NextResponse.json({ success: false, message: "Forbidden. You cannot remove applicants from this event." }, { status: 403 });
        }
      }

      // Safe deletion: removes ONLY application and its event responses/attendance
      await prisma.application.delete({
        where: { id: appId },
      });

      // Decrement event count safely
      if (app.event) {
        await prisma.event.update({
          where: { id: app.eventId },
          data: {
            applicationsCount: Math.max(0, app.event.applicationsCount - 1),
            status: app.event.status === "FULL" ? "OPEN" : app.event.status,
          },
        });
      }

      // Audit log
      await prisma.auditLog.create({
        data: {
          adminId: admin.id,
          action: "DELETE_EVENT_APPLICATION",
          target: appId,
          metadata: {
            eventId: app.eventId,
            userId: app.userId,
            candidateName: app.name,
            registrationNumber: app.registrationNumber,
          },
        },
      });

      deletedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Successfully removed ${deletedCount} event application(s). Student accounts remain fully intact.`,
    });
  } catch (error: any) {
    console.error("Delete Application Error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
