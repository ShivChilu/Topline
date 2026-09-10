import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { ApplicationStatus } from "@prisma/client";
import { sendEventSelectionEmail } from "@/lib/email";

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
      return NextResponse.json({ success: false, message: "Unauthorized. Admin permissions required." }, { status: 401 });
    }

    const eventId = params.id;
    if (admin.role === "EVENT_ADMIN") {
      const isAssigned = admin.assignedEvents.some((a) => a.eventId === eventId);
      if (!isAssigned) {
        return NextResponse.json({ success: false, message: "Forbidden. You do not have access to manage this event." }, { status: 403 });
      }
    }

    const body = await request.json();
    const {
      studentId,
      status = "SELECTED",
      remarks = "",
      sendEmailNotification = false,
    } = body;

    if (!studentId) {
      return NextResponse.json({ success: false, message: "Student ID is required." }, { status: 400 });
    }

    // Verify Event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return NextResponse.json({ success: false, message: "Event not found." }, { status: 404 });
    }

    // Verify Student exists in master database
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      include: {
        studentPhotos: {
          select: {
            id: true,
            photoType: true,
            caption: true,
            isPrimary: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!student || student.role !== "USER") {
      return NextResponse.json({ success: false, message: "Registered student account not found." }, { status: 404 });
    }

    // Check for duplicate application
    const existingApp = await prisma.application.findFirst({
      where: {
        eventId,
        OR: [
          { userId: student.id },
          ...(student.registrationNumber ? [{ registrationNumber: student.registrationNumber }] : []),
        ],
      },
    });

    if (existingApp) {
      return NextResponse.json(
        {
          success: false,
          message: `Student "${student.name || "Candidate"}" is already enrolled in this event (Status: ${existingApp.status}).`,
        },
        { status: 409 }
      );
    }

    const validStatus = Object.values(ApplicationStatus).includes(status.toUpperCase() as ApplicationStatus)
      ? (status.toUpperCase() as ApplicationStatus)
      : ApplicationStatus.SELECTED;

    const now = new Date();

    // Create the Application record
    const application = await prisma.application.create({
      data: {
        eventId,
        userId: student.id,
        name: student.name || "Student",
        mobileNumber: student.phone || "N/A",
        registrationNumber: student.registrationNumber || `REG-${Date.now().toString().slice(-6)}`,
        status: validStatus,
        selectedAt: validStatus === "SELECTED" ? now : null,
        confirmedAt: validStatus === "CONFIRMED" ? now : null,
        callingRemarks: remarks.trim() || `Added manually from Master Database by ${admin.name || admin.role}`,
        statusHistory: {
          create: {
            oldStatus: null,
            newStatus: validStatus,
            notes: remarks.trim()
              ? `Manually added by Admin: ${remarks.trim()}`
              : `Added directly to roster by ${admin.name || admin.role}`,
            changedById: admin.id,
          },
        },
      },
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
            selectionStatus: true,
            studentPhotos: {
              select: {
                id: true,
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
        emailLogs: {
          select: {
            id: true,
            templateName: true,
            subject: true,
            bodyPreview: true,
            sentAt: true,
            openedAt: true,
            openCount: true,
            clickedAt: true,
            clickCount: true,
            clickedAction: true,
            clickedUrl: true,
          },
          orderBy: { sentAt: "desc" },
        },
      },
    });

    // Increment application count on Event
    await prisma.event.update({
      where: { id: eventId },
      data: {
        applicationsCount: { increment: 1 },
      },
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: "MANUAL_ADD_STUDENT_TO_EVENT",
        target: `Event: ${event.name} (${eventId}) -> Student: ${student.name} (${student.id})`,
        metadata: {
          status: validStatus,
          remarks: remarks.trim() || undefined,
          emailSent: !!sendEmailNotification,
        },
      },
    });

    // Send selection email if requested and selected
    let emailSentResult = false;
    let emailSentTime: Date | null = null;
    if (sendEmailNotification && validStatus === "SELECTED" && student.email) {
      try {
        const emailRes = await sendEventSelectionEmail({
          studentName: student.name || "Student",
          email: student.email,
          eventName: event.name,
          eventDate: event.date,
          eventLocation: event.location,
          reportingTime: event.reportingTime || "",
          instructions: event.instructions || undefined,
          notes: remarks.trim() || undefined,
          whatsappGroupLink: event.whatsappGroupLink || undefined,
          applicationId: application.id,
          userId: student.id,
          eventId: event.id,
        });
        emailSentResult = emailRes.success;
        if (emailSentResult) {
          emailSentTime = now;
          await prisma.application.update({
            where: { id: application.id },
            data: { eventSelectionEmailSentAt: emailSentTime },
          });
        }
      } catch (emailErr) {
        console.error("Failed to send selection email on manual add:", emailErr);
      }
    }

    // Format application for client consumption
    const rawStudentPhotos = student.studentPhotos || [];
    const primaryPhoto =
      rawStudentPhotos.find((p: any) => p.isPrimary) ||
      rawStudentPhotos.find((p: any) => p.photoType === "FORMAL") ||
      rawStudentPhotos.find((p: any) => p.photoType === "FULL_LENGTH") ||
      rawStudentPhotos[0];

    const resolvedPhotoUrl = primaryPhoto
      ? `/api/photos/student?photoId=${primaryPhoto.id}`
      : `/api/photos/student?userId=${student.id}`;

    const authoritativePhone =
      (student.phone && student.phone !== "N/A" ? student.phone : null) ||
      "Mobile not available";

    let score = 0;
    if (student.name) score += 20;
    if (authoritativePhone !== "Mobile not available") score += 20;
    if (rawStudentPhotos.length > 0) score += 30;
    if (student.university) score += 15;
    if (student.city || student.gender) score += 15;

    const formattedApp = {
      _id: application.id,
      id: application.id,
      name: student.name || "Student",
      mobileNumber: authoritativePhone,
      registrationNumber: student.registrationNumber || application.registrationNumber || "N/A",
      university: student.university || "N/A",
      city: student.city || "N/A",
      gender: student.gender || "N/A",
      height: student.height || "N/A",
      weight: student.weight || "N/A",
      age: student.age || null,
      upiId: student.upiId || "N/A",
      bio: student.bio || "",
      studentSelectionStatus: student.selectionStatus || "UNDER_REVIEW",
      status: application.status,
      paymentStatus: application.paymentStatus,
      paymentOverride: application.paymentOverride,
      messageStatus: application.messageStatus,
      selectedAt: application.selectedAt,
      notSelectedAt: application.notSelectedAt,
      confirmedAt: application.confirmedAt,
      eventSelectionEmailSentAt: emailSentTime || application.eventSelectionEmailSentAt,
      eventDeselectionEmailSentAt: application.eventDeselectionEmailSentAt,
      lastActionAt: application.lastActionAt,
      callPriority: application.callPriority,
      manualOrder: application.manualOrder,
      callingRemarks: application.callingRemarks,
      whatsappGroupAdded: application.whatsappGroupAdded,
      whatsappGroupAddedAt: application.whatsappGroupAddedAt,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
      profilePhotoUrl: resolvedPhotoUrl,
      customFields: {},
      attendance: null,
      statusHistory: [
        {
          id: `hist-${Date.now()}`,
          oldStatus: "NONE",
          newStatus: validStatus,
          notes: remarks.trim() || `Added directly to roster by ${admin.name || admin.role}`,
          changedBy: { id: admin.id, name: admin.name },
          createdAt: now,
        },
      ],
      emailLogs: [],
      studentPhotos: rawStudentPhotos.map((p: any) => ({
        id: p.id,
        photoType: p.photoType,
        caption: p.caption,
        isPrimary: p.isPrimary,
        url: `/api/photos/student?photoId=${p.id}`,
      })),
      completenessScore: score,
      user: {
        id: student.id,
        name: student.name,
        phone: student.phone,
        email: student.email,
        registrationNumber: student.registrationNumber,
        university: student.university,
        city: student.city,
        gender: student.gender,
        height: student.height,
        weight: student.weight,
        age: student.age,
        upiId: student.upiId,
        bio: student.bio,
        selectionStatus: student.selectionStatus,
        studentPhotos: rawStudentPhotos,
      },
      event: {
        id: event.id,
        name: event.name,
        date: event.date,
        location: event.location,
        workType: event.workType,
        reportingTime: event.reportingTime,
        paymentPerStudent: event.paymentPerStudent,
        status: event.status,
      },
    };

    return NextResponse.json({
      success: true,
      message: `Student "${student.name || "Candidate"}" successfully added to event as "${validStatus}"!`,
      application: formattedApp,
      emailSent: emailSentResult,
    });
  } catch (error: any) {
    console.error("Add student to event error:", error);
    return NextResponse.json({ success: false, message: error.message || "Failed to add student." }, { status: 500 });
  }
}
