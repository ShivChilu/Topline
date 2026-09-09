import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role, StudentSelectionStatus } from "@prisma/client";
import { sendStudentSelectionEmail, sendStudentDeselectionEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();
    const status = searchParams.get("status"); // active | blocked
    const selectionStatus = searchParams.get("selectionStatus"); // ALL | SELECTED | NOT_SELECTED | UNDER_REVIEW
    const photoFilter = searchParams.get("photoFilter"); // ALL | WITH_PHOTOS | WITHOUT_PHOTOS
    const profileFilter = searchParams.get("profileFilter"); // ALL | COMPLETE | INCOMPLETE
    const city = searchParams.get("city")?.trim();
    const university = searchParams.get("university")?.trim();

    const andConditions: any[] = [
      { role: "USER" },
    ];

    if (status === "active") {
      andConditions.push({ isActive: true });
    } else if (status === "blocked") {
      andConditions.push({ isActive: false });
    }

    if (selectionStatus && selectionStatus !== "ALL") {
      andConditions.push({ selectionStatus: selectionStatus as StudentSelectionStatus });
    }

    if (city && city !== "ALL") {
      andConditions.push({ city: { equals: city, mode: "insensitive" } });
    }

    if (university && university !== "ALL") {
      andConditions.push({ university: { contains: university, mode: "insensitive" } });
    }

    if (photoFilter === "WITH_PHOTOS") {
      andConditions.push({
        OR: [
          { profilePhotoUrl: { not: null } },
          { studentPhotos: { some: {} } },
        ],
      });
    } else if (photoFilter === "WITHOUT_PHOTOS") {
      andConditions.push({
        profilePhotoUrl: null,
        studentPhotos: { none: {} },
      });
    }

    if (profileFilter === "INCOMPLETE") {
      // Missing photo, university, or city
      andConditions.push({
        OR: [
          { profilePhotoUrl: null },
          { university: null },
          { city: null },
        ],
      });
    } else if (profileFilter === "COMPLETE") {
      andConditions.push({
        OR: [{ profilePhotoUrl: { not: null } }, { studentPhotos: { some: {} } }],
        university: { not: null },
        phone: { not: null },
      });
    }

    if (search) {
      andConditions.push({
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
          { registrationNumber: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { university: { contains: search, mode: "insensitive" } },
          { city: { contains: search, mode: "insensitive" } },
        ],
      });
    }

    const whereClause = andConditions.length === 1 ? andConditions[0] : { AND: andConditions };

    const students = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        university: true,
        registrationNumber: true,
        city: true,
        gender: true,
        height: true,
        weight: true,
        age: true,
        upiId: true,
        bio: true,
        adminRemarks: true,
        profilePhotoUrl: true,
        selectionStatus: true,
        selectedAt: true,
        selectionEmailSentAt: true,
        isActive: true,
        createdAt: true,
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
              },
            },
          },
        },
        applications: {
          select: {
            id: true,
            status: true,
          },
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
      orderBy: { createdAt: "desc" },
    });

    const formattedStudents = students.map((s) => {
      const userApps = s.applications || [];
      const userPhotos = s.studentPhotos || [];
      const userFieldValues = s.profileFieldValues || [];

      const appliedCount = userApps.length;
      const selectedCount = userApps.filter((a) => a.status === "SELECTED").length;
      const attendedCount = userApps.filter((a) => a.status === "ATTENDED").length;
      const cancelledCount = userApps.filter((a) => a.status === "CANCELLED").length;

      // Primary photo fallback - use fast streaming URL instead of heavy base64 strings
      const primaryPhoto = userPhotos.find((p) => p.isPrimary) || userPhotos[0];
      let displayPhotoUrl: string | null = null;
      if (s.profilePhotoUrl) {
        displayPhotoUrl = s.profilePhotoUrl.startsWith("data:")
          ? `/api/photos/student?userId=${s.id}`
          : s.profilePhotoUrl;
      } else if (primaryPhoto) {
        displayPhotoUrl = primaryPhoto.url?.startsWith("data:")
          ? `/api/photos/student?photoId=${primaryPhoto.id}`
          : primaryPhoto.url || null;
      }

      // Completeness score
      let score = 0;
      if (s.name) score += 20;
      if (s.phone) score += 20;
      if (displayPhotoUrl) score += 30;
      if (s.university) score += 15;
      if (s.city || s.gender) score += 15;

      const formattedPhotos = userPhotos.map((p) => ({
        id: p.id,
        photoType: p.photoType,
        caption: p.caption,
        isPrimary: p.isPrimary,
        url: p.url && p.url.startsWith("data:") ? `/api/photos/student?photoId=${p.id}` : p.url || "",
      }));

      return {
        _id: s.id,
        id: s.id,
        name: s.name || "Student",
        phone: s.phone || "N/A",
        email: s.email || "N/A",
        university: s.university || "N/A",
        universityId: s.registrationNumber || "N/A",
        registrationNumber: s.registrationNumber || "N/A",
        city: s.city || "N/A",
        gender: s.gender || "N/A",
        height: s.height || "N/A",
        weight: s.weight || "N/A",
        age: s.age || null,
        upiId: s.upiId || "N/A",
        bio: s.bio || "",
        adminRemarks: s.adminRemarks || "",
        profilePhotoUrl: displayPhotoUrl,
        selectionStatus: s.selectionStatus || "UNDER_REVIEW",
        selectedAt: s.selectedAt,
        selectionEmailSentAt: s.selectionEmailSentAt,
        status: s.isActive ? "active" : "blocked",
        isActive: s.isActive,
        appliedCount,
        selectedCount,
        attendedCount,
        cancelledCount,
        totalEarnings: attendedCount * 800,
        completenessScore: score,
        photos: formattedPhotos,
        dynamicFields: userFieldValues
          .filter((v) => v && v.profileField)
          .map((v) => ({
            label: v.profileField?.label || "",
            key: v.profileField?.key || "",
            value: v.value || "",
          })),
        recentApplications: userApps.slice(0, 5),
        createdAt: s.createdAt,
      };
    });

    // Custom Priority Sort:
    // 1. 100% completed profiles that are UNDER_REVIEW -> Very Top
    // 2. Other UNDER_REVIEW candidates
    // 3. Higher completenessScore
    // 4. Most recent createdAt
    formattedStudents.sort((a, b) => {
      const aReady100 = a.completenessScore >= 100 && a.selectionStatus === "UNDER_REVIEW" ? 1 : 0;
      const bReady100 = b.completenessScore >= 100 && b.selectionStatus === "UNDER_REVIEW" ? 1 : 0;
      if (aReady100 !== bReady100) return bReady100 - aReady100;

      const aReview = a.selectionStatus === "UNDER_REVIEW" ? 1 : 0;
      const bReview = b.selectionStatus === "UNDER_REVIEW" ? 1 : 0;
      if (aReview !== bReview) return bReview - aReview;

      if (b.completenessScore !== a.completenessScore) {
        return b.completenessScore - a.completenessScore;
      }

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json({ success: true, students: formattedStudents });
  } catch (error: any) {
    console.error("Admin students fetch error:", error);
    return NextResponse.json({ success: false, message: error.message || "Failed to load students." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { studentId, studentIds, status, selectionStatus, sendEmail = true, notes, adminRemarks } = body;

    const validStatuses: StudentSelectionStatus[] = ["UNDER_REVIEW", "SELECTED", "NOT_SELECTED", "ON_HOLD"];

    // Bulk selection update
    if (Array.isArray(studentIds) && studentIds.length > 0 && selectionStatus) {
      if (!validStatuses.includes(selectionStatus)) {
        return NextResponse.json({ success: false, message: "Invalid selection status." }, { status: 400 });
      }

      const now = new Date();
      const studentsToUpdate = await prisma.user.findMany({
        where: { id: { in: studentIds } },
      });

      await prisma.user.updateMany({
        where: { id: { in: studentIds } },
        data: {
          selectionStatus,
          ...(selectionStatus === "SELECTED" && {
            selectedAt: now,
            ...(sendEmail && { selectionEmailSentAt: now }),
          }),
          ...(notes !== undefined ? { adminRemarks: notes } : adminRemarks !== undefined ? { adminRemarks } : {}),
        },
      });

      // Send emails to students where status changed
      if (sendEmail) {
        for (const st of studentsToUpdate) {
          if (st.selectionStatus !== selectionStatus && st.email) {
            if (selectionStatus === "SELECTED") {
              sendStudentSelectionEmail({
                studentName: st.name,
                email: st.email,
                registrationNumber: st.registrationNumber,
                university: st.university,
                notes: notes || adminRemarks,
                userId: st.id,
              }).catch((e) => console.error("Bulk email error:", e));
            } else if (selectionStatus === "NOT_SELECTED") {
              sendStudentDeselectionEmail({
                studentName: st.name,
                email: st.email,
                registrationNumber: st.registrationNumber,
                university: st.university,
                notes: notes || adminRemarks,
                userId: st.id,
              }).catch((e) => console.error("Bulk email error:", e));
            }
          }
        }
      }

      await prisma.auditLog.create({
        data: {
          action: `BULK_STUDENT_SELECTION_${selectionStatus}`,
          metadata: { count: studentIds.length, studentIds, notes: notes || adminRemarks },
        },
      });

      return NextResponse.json({
        success: true,
        message: `Updated selection status for ${studentIds.length} student(s) to ${selectionStatus}.`,
      });
    }

    // Single student status or remarks update
    if (studentId && (selectionStatus !== undefined || notes !== undefined || adminRemarks !== undefined)) {
      const updateData: any = {};
      if (selectionStatus) {
        if (!validStatuses.includes(selectionStatus)) {
          return NextResponse.json({ success: false, message: "Invalid selection status." }, { status: 400 });
        }
        updateData.selectionStatus = selectionStatus;
        if (selectionStatus === "SELECTED") {
          updateData.selectedAt = new Date();
          if (sendEmail) updateData.selectionEmailSentAt = new Date();
        }
      }
      if (notes !== undefined) {
        updateData.adminRemarks = notes;
      } else if (adminRemarks !== undefined) {
        updateData.adminRemarks = adminRemarks;
      }

      const updated = await prisma.user.update({
        where: { id: studentId },
        data: updateData,
      });

      if (sendEmail && selectionStatus && updated.email) {
        if (selectionStatus === "SELECTED") {
          sendStudentSelectionEmail({
            studentName: updated.name,
            email: updated.email,
            registrationNumber: updated.registrationNumber,
            university: updated.university,
            notes: updated.adminRemarks || undefined,
            userId: updated.id,
          }).catch((e) => console.error(e));
        } else if (selectionStatus === "NOT_SELECTED") {
          sendStudentDeselectionEmail({
            studentName: updated.name,
            email: updated.email,
            registrationNumber: updated.registrationNumber,
            university: updated.university,
            notes: updated.adminRemarks || undefined,
            userId: updated.id,
          }).catch((e) => console.error(e));
        }
      }

      return NextResponse.json({
        success: true,
        message: "Student record updated successfully.",
        student: { ...updated, _id: updated.id, adminRemarks: updated.adminRemarks || "" },
      });
    }

    // Single active/blocked update
    if (studentId && status) {
      const student = await prisma.user.update({
        where: { id: studentId },
        data: { isActive: status === "active" },
      });

      return NextResponse.json({
        success: true,
        message: `Student account ${status === "active" ? "unblocked" : "blocked"}.`,
        student: { ...student, _id: student.id, status },
      });
    }

    return NextResponse.json({ success: false, message: "Invalid request parameters." }, { status: 400 });
  } catch (error: any) {
    console.error("Admin student patch error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get("id");
    let ids = searchParams.get("ids")?.split(",").filter(Boolean);

    // Also support JSON body if passed
    if (!id && (!ids || ids.length === 0)) {
      try {
        const body = await request.json();
        if (body.id) id = body.id;
        if (Array.isArray(body.ids)) ids = body.ids;
      } catch {
        // no body
      }
    }

    const targetIds = id ? [id] : ids || [];

    if (targetIds.length === 0) {
      return NextResponse.json({ success: false, message: "Missing student ID(s) to delete." }, { status: 400 });
    }

    // Delete student users (foreign keys configured with onDelete: Cascade will clean all photos, applications, profile fields, attendance)
    const result = await prisma.user.deleteMany({
      where: {
        id: { in: targetIds },
        role: Role.USER, // Protect admin accounts from accidental deletion via student endpoint
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "PERMANENT_STUDENT_DELETION",
        metadata: { count: result.count, targetIds },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Permanently deleted ${result.count} student account(s) and all associated records.`,
      count: result.count,
    });
  } catch (error: any) {
    console.error("Delete Student API Error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
