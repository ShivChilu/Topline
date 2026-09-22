import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStudentProfileCompletion } from "@/lib/profile-completion";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("user_token")?.value;

    if (!token) {
      return NextResponse.json({ success: false, user: null }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.id) {
      return NextResponse.json({ success: false, user: null }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        studentPhotos: {
          orderBy: { createdAt: "desc" },
        },
        applications: {
          include: {
            event: true,
            attendance: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ success: false, user: null }, { status: 401 });
    }

    // 1. Fetch all event finance settings to know captain assignments
    const financeSettings = await prisma.setting.findMany({
      where: {
        key: { startsWith: "event_finance_" },
      },
    });

    const captainEventMap = new Map<string, { roleTitle: string; payoutAmount: number; paymentStatus: string }>();
    financeSettings.forEach((s) => {
      const eventId = s.key.replace("event_finance_", "");
      const val = s.value as any;
      if (val && Array.isArray(val.captains)) {
        const cap = val.captains.find((c: any) => c.id === user.id);
        if (cap) {
          captainEventMap.set(eventId, {
            roleTitle: cap.roleTitle || "Event Lead Captain",
            payoutAmount: cap.payoutAmount || 0,
            paymentStatus: cap.paymentStatus || "UNPAID",
          });
        }
      }
    });

    let captainShiftsCount = 0;
    let stewardShiftsCount = 0;

    const mappedApplications = user.applications.map((app) => {
      const capInfo = captainEventMap.get(app.eventId);
      const isCaptain = Boolean(capInfo || app.callingRemarks?.includes("Assigned Role:"));
      let roleTitle = "Steward / Event Crew";
      if (capInfo?.roleTitle) {
        roleTitle = capInfo.roleTitle;
      } else if (app.callingRemarks?.startsWith("Assigned Role:")) {
        roleTitle = app.callingRemarks.replace("Assigned Role:", "").split("(")[0].trim();
      }

      const isAttended = ["ATTENDED", "PAID"].includes(app.status) || app.attendance?.attendanceStatus === "PRESENT";
      if (isAttended) {
        if (isCaptain) {
          captainShiftsCount += 1;
        } else {
          stewardShiftsCount += 1;
        }
      }

      return {
        id: app.id,
        eventId: app.eventId,
        eventName: app.event.name,
        eventDate: app.event.date,
        eventLocation: app.event.location,
        reportingTime: app.event.reportingTime,
        payment: capInfo?.payoutAmount ?? (app.paymentOverride ?? app.event.paymentPerStudent ?? 500),
        status: app.status.toLowerCase(),
        whatsappGroupLink: app.event.whatsappGroupLink || null,
        attendanceStatus: app.attendance?.attendanceStatus || null,
        checkInTime: app.attendance?.checkInTime || null,
        createdAt: app.createdAt,
        roleTitle,
        isCaptain,
      };
    });

    // Authoritative Server-Side Profile Completeness Calculation
    const completeness = await getStudentProfileCompletion(user.id);

    // Compute live application statistics
    const appliedCount = user.applications.length;
    const selectedCount = user.applications.filter((a) =>
      ["SELECTED", "CONFIRMED", "ATTENDED", "PAID"].includes(a.status)
    ).length;
    const attendedCount = user.applications.filter((a) =>
      ["ATTENDED", "PAID"].includes(a.status)
    ).length;
    const cancelledCount = user.applications.filter((a) => a.status === "CANCELLED").length;
    const totalEarnings = user.applications
      .filter((a) => ["ATTENDED", "PAID"].includes(a.status))
      .reduce((sum, a) => {
        const cap = captainEventMap.get(a.eventId);
        return sum + (cap?.payoutAmount ?? (a.paymentOverride ?? a.event.paymentPerStudent ?? 0));
      }, 0);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        registrationNumber: user.registrationNumber,
        university: user.university,
        course: user.course,
        year: user.year,
        city: user.city,
        gender: user.gender,
        height: user.height,
        weight: user.weight,
        age: user.age,
        upiId: user.upiId,
        bio: user.bio,
        profilePhotoUrl: user.profilePhotoUrl ? `/api/photos/student?userId=${user.id}` : null,
        selectionStatus: user.selectionStatus,
        role: user.role,
        appliedCount,
        selectedCount,
        attendedCount,
        cancelledCount,
        captainShiftsCount,
        stewardShiftsCount,
        totalEarnings,
        createdAt: user.createdAt,
        completeness,
        studentPhotos: user.studentPhotos.map((p) => ({
          id: p.id,
          userId: p.userId,
          photoType: p.photoType,
          caption: p.caption,
          isPrimary: p.isPrimary,
          createdAt: p.createdAt,
          url: `/api/photos/student?photoId=${p.id}`,
        })),
        applications: mappedApplications,
      },
    });
  } catch (error) {
    console.error("Auth me error:", error);
    return NextResponse.json({ success: false, user: null }, { status: 500 });
  }
}
