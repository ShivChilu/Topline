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

    const whereClause: any = {
      role: Role.USER,
    };

    if (status === "active") {
      whereClause.isActive = true;
    } else if (status === "blocked") {
      whereClause.isActive = false;
    }

    if (selectionStatus && selectionStatus !== "ALL") {
      whereClause.selectionStatus = selectionStatus as StudentSelectionStatus;
    }

    if (city && city !== "ALL") {
      whereClause.city = { equals: city, mode: "insensitive" };
    }

    if (university && university !== "ALL") {
      whereClause.university = { contains: university, mode: "insensitive" };
    }

    if (photoFilter === "WITH_PHOTOS") {
      whereClause.OR = [
        { profilePhotoUrl: { not: null } },
        { studentPhotos: { some: {} } },
      ];
    } else if (photoFilter === "WITHOUT_PHOTOS") {
      whereClause.AND = [
        { profilePhotoUrl: null },
        { studentPhotos: { none: {} } },
      ];
    }

    if (profileFilter === "INCOMPLETE") {
      // Missing photo, university, or city
      whereClause.OR = [
        { profilePhotoUrl: null },
        { university: null },
        { city: null },
      ];
    } else if (profileFilter === "COMPLETE") {
      whereClause.AND = [
        { OR: [{ profilePhotoUrl: { not: null } }, { studentPhotos: { some: {} } }] },
        { university: { not: null } },
        { phone: { not: null } },
      ];
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { registrationNumber: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { university: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
      ];
    }

    const students = await prisma.user.findMany({
      where: whereClause,
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
            status: true,
            eventId: true,
            createdAt: true,
            event: {
              select: {
                id: true,
                name: true,
                date: true,
                location: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedStudents = students.map((s) => {
      const appliedCount = s.applications.length;
      const selectedCount = s.applications.filter((a) => a.status === "SELECTED").length;
      const attendedCount = s.applications.filter((a) => a.status === "ATTENDED").length;
      const cancelledCount = s.applications.filter((a) => a.status === "CANCELLED").length;

      // Primary photo fallback
      const primaryPhoto = s.studentPhotos.find((p) => p.isPrimary) || s.studentPhotos[0];
      const displayPhotoUrl = s.profilePhotoUrl || primaryPhoto?.url || null;

      // Completeness score
      let score = 0;
      if (s.name) score += 20;
      if (s.phone) score += 20;
      if (displayPhotoUrl) score += 30;
      if (s.university) score += 15;
      if (s.city || s.gender) score += 15;

      return {
        _id: s.id,
        id: s.id,
        name: s.name,
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
        profilePhotoUrl: displayPhotoUrl,
        selectionStatus: s.selectionStatus,
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
        photos: s.studentPhotos,
        dynamicFields: s.profileFieldValues.map((v) => ({
          label: v.profileField.label,
          key: v.profileField.key,
          value: v.value,
        })),
        recentApplications: s.applications.slice(0, 5),
        createdAt: s.createdAt,
      };
    });

    return NextResponse.json({ success: true, students: formattedStudents });
  } catch (error: any) {
    console.error("Admin students fetch error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { studentId, studentIds, status, selectionStatus, sendEmail = true, notes } = body;

    // Bulk selection update
    if (Array.isArray(studentIds) && studentIds.length > 0 && selectionStatus) {
      const validStatuses: StudentSelectionStatus[] = ["UNDER_REVIEW", "SELECTED", "NOT_SELECTED"];
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
                notes,
              }).catch((e) => console.error("Bulk email error:", e));
            } else if (selectionStatus === "NOT_SELECTED") {
              sendStudentDeselectionEmail({
                studentName: st.name,
                email: st.email,
                registrationNumber: st.registrationNumber,
                university: st.university,
                notes,
              }).catch((e) => console.error("Bulk email error:", e));
            }
          }
        }
      }

      await prisma.auditLog.create({
        data: {
          action: `BULK_STUDENT_SELECTION_${selectionStatus}`,
          metadata: { count: studentIds.length, studentIds, notes },
        },
      });

      return NextResponse.json({
        success: true,
        message: `Updated selection status for ${studentIds.length} student(s) to ${selectionStatus}.`,
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
