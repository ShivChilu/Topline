import { prisma } from "@/lib/prisma";
import { isValidHeight } from "@/lib/validation";

export interface ProfileCompletionResult {
  percentage: number;
  isComplete: boolean;
  missingFields: string[];
  missingPhotos: string[];
  completedCount: number;
  totalCount: number;
}

/**
 * Authoritative server-side profile completion calculation.
 * Centralized across /profile, /opportunities, /events/[id], /api/events/[id]/apply, and Admin dashboards.
 */
export async function getStudentProfileCompletion(userId: string): Promise<ProfileCompletionResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      studentPhotos: true,
      profileFieldValues: {
        include: {
          profileField: true,
        },
      },
    },
  });

  if (!user) {
    return {
      percentage: 0,
      isComplete: false,
      missingFields: ["User Account Not Found"],
      missingPhotos: ["Formal Profile Photo"],
      completedCount: 0,
      totalCount: 1,
    };
  }

  const missingFields: string[] = [];
  const missingPhotos: string[] = [];

  let totalItems = 0;
  let completedItems = 0;

  // 1. Core Required Account Fields
  const coreChecks = [
    { label: "Full Name", value: user.name, valid: Boolean(user.name && user.name.trim().length >= 2) },
    { label: "Mobile Phone", value: user.phone, valid: Boolean(user.phone && user.phone !== "N/A" && /^[6-9]\d{9}$/.test(user.phone.replace(/[^0-9]/g, "").slice(-10))) },
    { label: "Email Address", value: user.email, valid: Boolean(user.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) },
    { label: "Roll / Registration Number", value: user.registrationNumber, valid: Boolean(user.registrationNumber && user.registrationNumber.trim().length >= 2) },
    { label: "University / College", value: user.university, valid: Boolean(user.university && user.university.trim().length >= 2) },
    { label: "City / Region", value: user.city, valid: Boolean(user.city && user.city.trim().length >= 2) },
    { label: "Gender", value: user.gender, valid: Boolean(user.gender && ["Male", "Female", "Other"].includes(user.gender)) },
    { label: "Valid Height", value: user.height, valid: isValidHeight(user.height) },
  ];

  coreChecks.forEach((c) => {
    totalItems++;
    if (c.valid) {
      completedItems++;
    } else {
      missingFields.push(c.label);
    }
  });

  // 2. Active Admin-Configured Dynamic Required Profile Fields
  const activeRequiredFields = await prisma.studentProfileField.findMany({
    where: { isActive: true, isRequired: true },
  });

  const valueMap = new Map<string, string>();
  user.profileFieldValues.forEach((pfv) => {
    if (pfv.value && pfv.value.trim().length > 0) {
      valueMap.set(pfv.fieldId, pfv.value.trim());
    }
  });

  activeRequiredFields.forEach((rf) => {
    totalItems++;
    const val = valueMap.get(rf.id);
    if (val && val !== "[]" && val !== '""') {
      completedItems++;
    } else {
      missingFields.push(rf.label);
    }
  });

  // 3. Required Student Profile Photos
  totalItems++;
  const hasPhotos = user.studentPhotos && user.studentPhotos.length > 0;
  const hasFormalOrPrimary = hasPhotos && user.studentPhotos.some((p) => p.isPrimary || p.photoType === "FORMAL" || p.photoType === "FULL_LENGTH");

  if (hasFormalOrPrimary || (hasPhotos && user.profilePhotoUrl)) {
    completedItems++;
  } else {
    missingPhotos.push("Formal / Grooming Photo");
  }

  const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  const isComplete = percentage === 100 && missingFields.length === 0 && missingPhotos.length === 0;

  return {
    percentage: Math.min(percentage, 100),
    isComplete,
    missingFields,
    missingPhotos,
    completedCount: completedItems,
    totalCount: totalItems,
  };
}
