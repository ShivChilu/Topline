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
  if (!user || !user.isActive || !["ADMIN", "SUPERADMIN", "CALLING_ADMIN", "EVENT_ADMIN"].includes(user.role)) return null;
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

    if (admin.role === "CALLING_ADMIN" || admin.role === "EVENT_ADMIN") {
      if (!eventId) {
        return NextResponse.json({ success: false, message: "Forbidden. Event ID is required for scoped admin queries." }, { status: 403 });
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
        event: {
          select: {
            id: true,
            name: true,
            date: true,
            location: true,
            workType: true,
            reportingTime: true,
            paymentPerStudent: true,
            status: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            registrationNumber: true,
            university: true,
            city: true,
            gender: true,
            height: true,
            weight: true,
            age: true,
            upiId: true,
            bio: true,
            profilePhotoUrl: true,
            selectionStatus: true,
            studentPhotos: {
              select: {
                id: true,
                url: true,
                photoType: true,
                caption: true,
                isPrimary: true,
              },
              orderBy: { createdAt: "desc" },
            },
            profileFieldValues: {
              select: {
                value: true,
                profileField: {
                  select: {
                    key: true,
                    label: true,
                    type: true,
                  },
                },
              },
            },
          },
        },
        fieldResponses: {
          select: {
            id: true,
            fieldId: true,
            value: true,
            formField: {
              select: {
                id: true,
                key: true,
                label: true,
              },
            },
          },
        },
        photos: {
          select: {
            id: true,
            url: true,
            caption: true,
            photoType: true,
          },
        },
        attendance: {
          select: {
            id: true,
            attendanceStatus: true,
            checkInTime: true,
            checkOutTime: true,
          },
        },
        statusHistory: {
          select: {
            id: true,
            oldStatus: true,
            newStatus: true,
            notes: true,
            changedBy: {
              select: {
                id: true,
                name: true,
              },
            },
            createdAt: true,
          },
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
      const responses = app.fieldResponses || [];
      responses.forEach((fr) => {
        if (!fr || !fr.formField) return;
        try {
          customFieldsMap[fr.formField.key] = JSON.parse(fr.value);
        } catch {
          customFieldsMap[fr.formField.key] = fr.value;
        }
        customFieldsMap[fr.formField.id] = customFieldsMap[fr.formField.key];
      });

      // Photo fallback hierarchy: Primary -> Formal -> Full Length -> Casual -> User profilePhotoUrl
      const rawStudentPhotos = app.user?.studentPhotos || [];
      const primaryPhoto =
        rawStudentPhotos.find((p) => p.isPrimary) ||
        rawStudentPhotos.find((p) => p.photoType === "FORMAL") ||
        rawStudentPhotos.find((p) => p.photoType === "FULL_LENGTH") ||
        rawStudentPhotos[0];

      let resolvedPhotoUrl = "";
      if (primaryPhoto) {
        resolvedPhotoUrl = primaryPhoto.url?.startsWith("data:")
          ? `/api/photos/student?photoId=${primaryPhoto.id}`
          : primaryPhoto.url || "";
      } else if (app.user?.profilePhotoUrl) {
        resolvedPhotoUrl = app.user.profilePhotoUrl.startsWith("data:")
          ? `/api/photos/student?userId=${app.user.id}`
          : app.user.profilePhotoUrl;
      } else if (app.photos && app.photos[0]) {
        resolvedPhotoUrl = app.photos[0].url || "";
      }

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

      const formattedStudentPhotos = rawStudentPhotos.map((p) => ({
        id: p.id,
        photoType: p.photoType,
        caption: p.caption,
        isPrimary: p.isPrimary,
        url: p.url && p.url.startsWith("data:") ? `/api/photos/student?photoId=${p.id}` : p.url || "",
      }));

      return {
        id: app.id,
        _id: app.id,
        eventId: app.event
          ? {
              ...app.event,
              _id: app.event.id,
            }
          : { id: app.eventId, _id: app.eventId },
        userId: app.userId,
        name: app.name,
        email: app.user?.email || "N/A",
        mobileNumber: authoritativePhone,
        registrationNumber: app.registrationNumber,
        status: app.status,
        paymentStatus: app.paymentStatus,
        paymentOverride: app.paymentOverride,
        messageStatus: app.messageStatus,
        attendanceStatus: app.attendance?.attendanceStatus || "PENDING",
        callPriority: app.callPriority,
        callStatus: app.status,
        lastActionAt: app.lastActionAt,
        whatsappAdded: app.whatsappGroupAdded,
        whatsappAddedAt: app.whatsappGroupAddedAt,
        callingRemarks: app.callingRemarks,
        manualOrder: app.manualOrder,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
        attendance: app.attendance
          ? {
              ...app.attendance,
              status: app.attendance.attendanceStatus,
            }
          : null,
        statusHistory: (app.statusHistory || []).map((sh) => ({
          ...sh,
          fromStatus: sh.oldStatus,
          toStatus: sh.newStatus,
        })),
        photoUrl: resolvedPhotoUrl,
        completenessScore: Math.min(score, 100),
        studentId: app.user
          ? {
              id: app.user.id,
              _id: app.user.id,
              name: app.user.name || app.name,
              phone: authoritativePhone,
              email: app.user.email || "N/A",
              universityId: app.user.registrationNumber || app.registrationNumber,
              registrationNumber: app.user.registrationNumber || app.registrationNumber,
              university: app.user.university || "N/A",
              city: app.user.city || "N/A",
              gender: app.user.gender || "N/A",
              height: app.user.height || "N/A",
              weight: app.user.weight || "N/A",
              age: app.user.age || null,
              upiId: app.user.upiId || "N/A",
              bio: app.user.bio || "",
              profilePhotoUrl: resolvedPhotoUrl,
              studentPhotos: formattedStudentPhotos,
              selectionStatus: app.user.selectionStatus || "UNDER_REVIEW",
              dynamicProfileFields: (app.user.profileFieldValues || [])
                .filter((pv: any) => pv && pv.profileField)
                .map((pv: any) => ({
                  key: pv.profileField?.key || "",
                  label: pv.profileField?.label || "",
                  type: pv.profileField?.type || "TEXT",
                  value: pv.value || "",
                })),
            }
          : null,
        customFieldsData: customFieldsMap,
        dynamicEventResponses: responses
          .filter((fr: any) => fr && fr.formField)
          .map((fr: any) => ({
            fieldId: fr.fieldId,
            key: fr.formField.key,
            label: fr.formField.label,
            value: customFieldsMap[fr.formField.key] || fr.value,
          })),
      };
    });

    // Prioritize NOT_SELECTED / REJECTED at the top, then APPLIED & UNDER_REVIEW, then others
    formattedApplications.sort((a: any, b: any) => {
      const getPriority = (statusStr: string) => {
        const s = (statusStr || "").toUpperCase();
        if (s === "NOT_SELECTED" || s === "REJECTED") return 1;
        if (s === "APPLIED") return 2;
        if (s === "UNDER_REVIEW") return 3;
        if (s === "SELECTED") return 4;
        if (s === "CONFIRMED") return 5;
        if (s === "ATTENDED") return 6;
        if (s === "ABSENT") return 7;
        if (s === "CANCELLED") return 8;
        return 9;
      };
      const prioA = getPriority(a.status);
      const prioB = getPriority(b.status);
      if (prioA !== prioB) return prioA - prioB;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
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

      if (admin.role === "CALLING_ADMIN" || admin.role === "EVENT_ADMIN") {
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

        // Trigger email asynchronously only when status genuinely transitioned
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

      if (admin.role === "CALLING_ADMIN" || admin.role === "EVENT_ADMIN") {
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
