import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  props: { params: Promise<{ token: string }> }
) {
  const params = await props.params;
  const token = params.token;

  try {
    if (!token || typeof token !== "string" || token.length < 8) {
      return NextResponse.json(
        { success: false, message: "Invalid showcase link." },
        { status: 404 }
      );
    }

    const event = await prisma.event.findUnique({
      where: { clientShareToken: token },
      select: {
        id: true,
        name: true,
        date: true,
        location: true,
        reportingTime: true,
        startTime: true,
        endTime: true,
        workType: true,
        dressCode: true,
        clientShareEnabled: true,
        clientShareTitle: true,
        clientShareFields: true,
        clientShareCandidateStatus: true,
        clientShareCustomNotes: true,
      },
    });

    if (!event || !event.clientShareEnabled) {
      return NextResponse.json(
        {
          success: false,
          message: "Showcase unavailable. This link has expired or access has been revoked by the event coordinator.",
        },
        { status: 404 }
      );
    }

    const allowedStatuses =
      event.clientShareCandidateStatus && event.clientShareCandidateStatus.length > 0
        ? event.clientShareCandidateStatus
        : ["CONFIRMED"];

    const allowedFields = new Set(
      event.clientShareFields && event.clientShareFields.length > 0
        ? event.clientShareFields
        : ["name", "photos", "height", "gender"]
    );

    // Build flexible status query matching both Application.status and Attendance records
    const whereConditions: any[] = [];
    const hasAttended = allowedStatuses.includes("ATTENDED") || allowedStatuses.includes("PRESENT");
    const hasAbsent = allowedStatuses.includes("ABSENT");
    const hasConfirmed = allowedStatuses.includes("CONFIRMED");
    const hasSelected = allowedStatuses.includes("SELECTED");

    if (hasAttended) {
      whereConditions.push(
        { status: "ATTENDED" },
        { attendance: { attendanceStatus: { in: ["PRESENT", "LATE"] } } }
      );
    }
    if (hasAbsent) {
      whereConditions.push(
        { status: "ABSENT" },
        { attendance: { attendanceStatus: "ABSENT" } }
      );
    }
    if (hasConfirmed) {
      whereConditions.push({ status: "CONFIRMED" });
    }
    if (hasSelected) {
      whereConditions.push({ status: "SELECTED" });
    }

    const otherStatuses = allowedStatuses.filter(
      (s: string) => !["ATTENDED", "PRESENT", "ABSENT", "CONFIRMED", "SELECTED"].includes(s)
    );
    if (otherStatuses.length > 0) {
      whereConditions.push({ status: { in: otherStatuses } });
    }

    const applications = await prisma.application.findMany({
      where: {
        eventId: event.id,
        OR: whereConditions.length > 0 ? whereConditions : [{ status: "CONFIRMED" }],
      },
      include: {
        attendance: {
          select: {
            attendanceStatus: true,
            checkInTime: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            gender: true,
            height: true,
            weight: true,
            age: true,
            university: true,
            city: true,
            course: true,
            year: true,
            profilePhotoUrl: true,
            studentPhotos: {
              select: {
                id: true,
                photoType: true,
                isPrimary: true,
                caption: true,
              },
              orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
            },
          },
        },
        photos: {
          select: {
            id: true,
            caption: true,
          },
        },
      },
      orderBy: [{ user: { name: "asc" } }],
    });

    // Format safe candidate objects exposing ONLY the admin-approved fields
    const candidates = applications.map((app, idx) => {
      const u = app.user;
      const candidateObj: any = {
        id: app.id,
        serialNumber: idx + 1,
      };

      // Name
      if (allowedFields.has("name")) {
        candidateObj.name = app.name || u?.name || "Candidate";
      }

      // Height
      if (allowedFields.has("height")) {
        candidateObj.height = u?.height || null;
      }

      // Gender
      if (allowedFields.has("gender")) {
        candidateObj.gender = u?.gender || null;
      }

      // Age
      if (allowedFields.has("age")) {
        candidateObj.age = u?.age || null;
      }

      // University / College
      if (allowedFields.has("university")) {
        candidateObj.university = u?.university || null;
      }

      // City
      if (allowedFields.has("city")) {
        candidateObj.city = u?.city || null;
      }

      // Course & Year
      if (allowedFields.has("course")) {
        candidateObj.course = u?.course || null;
      }
      if (allowedFields.has("year")) {
        candidateObj.year = u?.year || null;
      }

      // Phone (ONLY if explicitly enabled by admin)
      if (allowedFields.has("phone")) {
        candidateObj.phone = app.mobileNumber || null;
      }

      // Photos
      if (allowedFields.has("photos")) {
        const studentPhotos = u?.studentPhotos || [];
        const photoList: { id: string; url: string; type: string; isPrimary: boolean }[] = [];

        // Add user student photos
        studentPhotos.forEach((sp) => {
          photoList.push({
            id: sp.id,
            url: `/api/photos/student?photoId=${sp.id}`,
            type: sp.photoType || "PHOTO",
            isPrimary: sp.isPrimary || false,
          });
        });

        // Fallback to user profile photo if studentPhotos empty
        if (photoList.length === 0 && u?.id) {
          photoList.push({
            id: `user-${u.id}`,
            url: `/api/photos/student?userId=${u.id}`,
            type: "PROFILE",
            isPrimary: true,
          });
        }

        candidateObj.photos = photoList;
        candidateObj.primaryPhotoUrl =
          photoList.find((p) => p.isPrimary)?.url ||
          photoList.find((p) => p.type === "FORMAL")?.url ||
          photoList[0]?.url ||
          (u?.id ? `/api/photos/student?userId=${u.id}` : null);
      }

      // Duty Attendance status
      const attRecord = app.attendance;
      const isPresent = app.status === "ATTENDED" || attRecord?.attendanceStatus === "PRESENT" || attRecord?.attendanceStatus === "LATE";
      const isAbsent = app.status === "ABSENT" || attRecord?.attendanceStatus === "ABSENT";
      const isLate = attRecord?.attendanceStatus === "LATE";

      candidateObj.dutyStatus = isPresent ? "PRESENT" : isAbsent ? "ABSENT" : app.status;
      candidateObj.attendanceStatusLabel = isLate ? "Late Check-in" : isPresent ? "Present" : isAbsent ? "Absent" : app.status === "CONFIRMED" ? "Confirmed" : "Selected";
      candidateObj.showAttendanceStatus = allowedFields.has("attendanceStatus");

      return candidateObj;
    });

    return NextResponse.json({
      success: true,
      event: {
        title: event.clientShareTitle || event.name,
        date: event.date,
        location: event.location,
        reportingTime: event.reportingTime,
        workType: event.workType,
        dressCode: event.dressCode,
        customNotes: event.clientShareCustomNotes,
        visibleFields: Array.from(allowedFields),
        totalCrew: candidates.length,
      },
      candidates,
    });
  } catch (error: any) {
    console.error("Public client showcase error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
