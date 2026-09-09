import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStudentProfileCompletion } from "@/lib/profile-completion";
import { isValidHeight, normalizeHeight, isValidUPI } from "@/lib/validation";

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
                whatsappGroupLink: true,
                attendanceToken: true,
                attendanceTokenEnabled: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, message: "Student account not found." }, { status: 404 });
    }

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
        profilePhotoUrl: user.profilePhotoUrl,
        selectionStatus: user.selectionStatus,
        selectedAt: user.selectedAt,
        studentPhotos: user.studentPhotos,
        dynamicFields,
        completeness,
        recentApplications: user.applications,
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
        ...(profilePhotoUrl !== undefined && { profilePhotoUrl: profilePhotoUrl ? profilePhotoUrl.trim() : null }),
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
        profilePhotoUrl: updatedUser.profilePhotoUrl,
        selectionStatus: updatedUser.selectionStatus,
        completeness,
      },
    });
  } catch (error: any) {
    console.error("Profile update error:", error);
    return NextResponse.json({ success: false, message: "Failed to update profile." }, { status: 500 });
  }
}
