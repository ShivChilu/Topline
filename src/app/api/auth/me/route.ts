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
      .reduce((sum, a) => sum + (a.paymentOverride ?? a.event.paymentPerStudent ?? 0), 0);

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
        profilePhotoUrl: user.profilePhotoUrl,
        selectionStatus: user.selectionStatus,
        role: user.role,
        appliedCount,
        selectedCount,
        attendedCount,
        cancelledCount,
        totalEarnings,
        createdAt: user.createdAt,
        completeness,
        studentPhotos: user.studentPhotos,
        applications: user.applications.map((app) => ({
          id: app.id,
          eventId: app.eventId,
          eventName: app.event.name,
          eventDate: app.event.date,
          eventLocation: app.event.location,
          reportingTime: app.event.reportingTime,
          payment: app.paymentOverride ?? app.event.paymentPerStudent,
          status: app.status.toLowerCase(),
          attendanceStatus: app.attendance?.attendanceStatus || null,
          checkInTime: app.attendance?.checkInTime || null,
          createdAt: app.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error("Auth me error:", error);
    return NextResponse.json({ success: false, user: null }, { status: 500 });
  }
}
