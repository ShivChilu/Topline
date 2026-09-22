import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStudentProfileCompletion } from "@/lib/profile-completion";
import { isValidHeight, normalizeHeight, isValidUPI } from "@/lib/validation";
import { checkAndNotifyAdminPendingReview } from "@/lib/pending-review-notifier";

export const dynamic = "force-dynamic";

async function getAuthStudent() {
  const cookieStore = await cookies();
  const token = cookieStore.get("user_token")?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded || !decoded.id) return null;
  return decoded;
}

// GET /api/user/profile - get full student profile including photos, dynamic fields, completeness, and applications
export async function GET() {
  try {
    const student = await getAuthStudent();
    if (!student) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: student.id },
      include: {
        studentPhotos: {
          orderBy: { createdAt: "desc" },
        },
        profileFieldValues: {
          include: {
            profileField: true,
          },
        },
        applications: {
          select: {
            id: true,
            eventId: true,
            status: true,
            paymentStatus: true,
            paymentOverride: true,
            callingRemarks: true,
            createdAt: true,
            attendance: {
              select: {
                id: true,
                attendanceStatus: true,
                checkInTime: true,
                manualRemarks: true,
              },
            },
            event: {
              select: {
                id: true,
                name: true,
                date: true,
                location: true,
                status: true,
                reportingTime: true,
                paymentPerStudent: true,
                whatsappGroupLink: true,
                attendanceToken: true,
                attendanceTokenEnabled: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, message: "Student account not found." }, { status: 404 });
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
    let totalAttendedShifts = 0;

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
        totalAttendedShifts += 1;
        if (isCaptain) {
          captainShiftsCount += 1;
        } else {
          stewardShiftsCount += 1;
        }
      }

      return {
        ...app,
        roleTitle,
        isCaptain,
        payment: capInfo?.payoutAmount ?? (app.paymentOverride ?? (app.event as any)?.paymentPerStudent ?? 500),
      };
    });

    // Authoritative Server-Side Profile Completeness Calculation
    const completeness = await getStudentProfileCompletion(user.id);

    // Fetch all active dynamic profile fields so the student can fill them
    const activeProfileFields = await prisma.studentProfileField.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
    });

    // Map fields with user's current values
    const valueMap = new Map(user.profileFieldValues.map((v) => [v.fieldId, v.value]));
    const dynamicFields = activeProfileFields.map((field) => ({
      id: field.id,
      key: field.key,
      label: field.label,
      type: field.type,
      description: field.description,
      placeholder: field.placeholder,
      options: field.options,
      isRequired: field.isRequired,
      value: valueMap.get(field.id) || "",
    }));

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
        profilePhotoUrl: user.profilePhotoUrl || user.studentPhotos.length > 0
          ? `/api/photos/student?userId=${user.id}&t=${new Date(user.updatedAt || user.createdAt).getTime()}`
          : null,
        selectionStatus: user.selectionStatus,
        selectedAt: user.selectedAt,
        captainShiftsCount,
        stewardShiftsCount,
        totalAttendedShifts,
        studentPhotos: user.studentPhotos.map((p) => ({
          id: p.id,
          userId: p.userId,
          photoType: p.photoType,
          caption: p.caption,
          isPrimary: p.isPrimary,
          createdAt: p.createdAt,
          url: `/api/photos/student?photoId=${p.id}&t=${new Date(p.createdAt).getTime()}`,
        })),
        dynamicFields,
        completeness,
        recentApplications: mappedApplications,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error: any) {
    console.error("Get profile error:", error);
    return NextResponse.json({ success: false, message: "Failed to load profile." }, { status: 500 });
  }
}

// PUT /api/user/profile - update standard info + dynamic profile fields
export async function PUT(request: Request) {
  try {
    const student = await getAuthStudent();
    if (!student) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      email,
      university,
      course,
      year,
      city,
      gender,
      height,
      weight,
      age,
      upiId,
      bio,
      profilePhotoUrl,
      dynamicFieldResponses, // Array of { fieldId: string, value: string }
    } = body;

    // Strict validation for height if provided
    let cleanHeight: string | null = null;
    if (height !== undefined && height !== null && String(height).trim() !== "") {
      const trimmedHeight = String(height).trim();
      if (!isValidHeight(trimmedHeight)) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid height format. Please select from the dropdown or enter a valid height like 5'10\" or 178 cm.",
          },
          { status: 400 }
        );
      }
      cleanHeight = normalizeHeight(trimmedHeight);
    }

    // Strict validation for UPI ID if provided
    if (upiId !== undefined && upiId !== null && String(upiId).trim() !== "") {
      const trimmedUpi = String(upiId).trim();
      if (!isValidUPI(trimmedUpi)) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid UPI ID format. Must be in the format 'username@bank' (e.g., 9876543210@paytm, user@oksbi).",
          },
          { status: 400 }
        );
      }
    }

    // Strict validation for email if provided
    if (email !== undefined && email !== null && String(email).trim() !== "") {
      const trimmedEmail = String(email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        return NextResponse.json(
          { success: false, message: "Please provide a valid email address." },
          { status: 400 }
        );
      }
    }

    // Only update profilePhotoUrl if it's an actual image data URL or http URL, or explicitly empty.
    // NEVER overwrite with a proxy relative path like "/api/photos/student?..."
    let shouldUpdatePhoto = false;
    let cleanProfilePhotoUrl: string | null = null;
    if (profilePhotoUrl !== undefined) {
      if (!profilePhotoUrl || String(profilePhotoUrl).trim() === "") {
        shouldUpdatePhoto = true;
        cleanProfilePhotoUrl = null;
      } else if (
        String(profilePhotoUrl).startsWith("data:") ||
        String(profilePhotoUrl).startsWith("http://") ||
        String(profilePhotoUrl).startsWith("https://")
      ) {
        shouldUpdatePhoto = true;
        cleanProfilePhotoUrl = String(profilePhotoUrl).trim();
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: student.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(email !== undefined && { email: email ? email.trim().toLowerCase() : null }),
        ...(university !== undefined && { university: university ? university.trim() : null }),
        ...(course !== undefined && { course: course ? course.trim() : null }),
        ...(year !== undefined && { year: year ? year.trim() : null }),
        ...(city !== undefined && { city: city ? city.trim() : null }),
        ...(gender !== undefined && { gender: gender ? gender.trim() : null }),
        ...(height !== undefined && { height: cleanHeight }),
        ...(weight !== undefined && { weight: weight ? weight.trim() : null }),
        ...(age !== undefined && { age: age ? parseInt(String(age), 10) : null }),
        ...(upiId !== undefined && { upiId: upiId ? upiId.trim() : null }),
        ...(bio !== undefined && { bio: bio ? bio.trim() : null }),
        ...(shouldUpdatePhoto && { profilePhotoUrl: cleanProfilePhotoUrl }),
      },
    });

    // Upsert dynamic profile field values if provided
    if (Array.isArray(dynamicFieldResponses)) {
      for (const item of dynamicFieldResponses) {
        if (!item.fieldId) continue;
        const val = typeof item.value === "string" ? item.value : JSON.stringify(item.value || "");
        await prisma.studentProfileFieldValue.upsert({
          where: {
            userId_fieldId: {
              userId: student.id,
              fieldId: item.fieldId,
            },
          },
          update: { value: val },
          create: {
            userId: student.id,
            fieldId: item.fieldId,
            value: val,
          },
        });
      }
    }

    // Recompute completeness after update
    const completeness = await getStudentProfileCompletion(updatedUser.id);

    // Only notify admin if candidate profile is 100% complete
    if (completeness.isComplete) {
      checkAndNotifyAdminPendingReview().catch((err) =>
        console.error("[Pending Review Alert Error]", err)
      );
    }

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully!",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        phone: updatedUser.phone,
        email: updatedUser.email,
        registrationNumber: updatedUser.registrationNumber,
        university: updatedUser.university,
        course: updatedUser.course,
        year: updatedUser.year,
        city: updatedUser.city,
        gender: updatedUser.gender,
        height: updatedUser.height,
        weight: updatedUser.weight,
        age: updatedUser.age,
        upiId: updatedUser.upiId,
        bio: updatedUser.bio,
        profilePhotoUrl: updatedUser.profilePhotoUrl
          ? `/api/photos/student?userId=${updatedUser.id}&t=${Date.now()}`
          : null,
        selectionStatus: updatedUser.selectionStatus,
        completeness,
      },
    });
  } catch (error: any) {
    console.error("Profile update error:", error);
    return NextResponse.json({ success: false, message: "Failed to update profile." }, { status: 500 });
  }
}
