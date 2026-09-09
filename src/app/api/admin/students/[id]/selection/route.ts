import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { StudentSelectionStatus } from "@prisma/client";
import { sendStudentSelectionEmail, sendStudentDeselectionEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { selectionStatus, notes, adminRemarks, sendEmail = true } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: "Student ID is required." }, { status: 400 });
    }

    const validStatuses: StudentSelectionStatus[] = ["UNDER_REVIEW", "SELECTED", "NOT_SELECTED", "ON_HOLD"];
    if (selectionStatus && !validStatuses.includes(selectionStatus)) {
      return NextResponse.json(
        { success: false, message: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const currentStudent = await prisma.user.findUnique({
      where: { id },
      include: {
        studentPhotos: true,
      },
    });

    if (!currentStudent) {
      return NextResponse.json({ success: false, message: "Student not found." }, { status: 404 });
    }

    const oldStatus = currentStudent.selectionStatus;
    const nextStatus = selectionStatus || oldStatus;
    const isStatusChanged = selectionStatus ? oldStatus !== selectionStatus : false;

    const now = new Date();
    const updateData: any = {
      selectionStatus: nextStatus,
      ...(nextStatus === "SELECTED" && {
        selectedAt: now,
        ...(sendEmail && { selectionEmailSentAt: now }),
      }),
    };

    if (notes !== undefined) {
      updateData.adminRemarks = notes;
    } else if (adminRemarks !== undefined) {
      updateData.adminRemarks = adminRemarks;
    }

    const updatedStudent = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    // Only dispatch email if status genuinely changed and student has an email address
    let emailResult = null;
    if (isStatusChanged && sendEmail && currentStudent.email) {
      if (selectionStatus === "SELECTED") {
        emailResult = await sendStudentSelectionEmail({
          studentName: currentStudent.name,
          email: currentStudent.email,
          registrationNumber: currentStudent.registrationNumber,
          university: currentStudent.university,
          notes,
          userId: currentStudent.id,
        });
      } else if (selectionStatus === "NOT_SELECTED") {
        emailResult = await sendStudentDeselectionEmail({
          studentName: currentStudent.name,
          email: currentStudent.email,
          registrationNumber: currentStudent.registrationNumber,
          university: currentStudent.university,
          notes,
          userId: currentStudent.id,
        });
      }
    }

    // Log action to audit log
    await prisma.auditLog.create({
      data: {
        action: `STUDENT_SELECTION_${selectionStatus}`,
        target: id,
        metadata: {
          studentName: currentStudent.name,
          oldStatus,
          newStatus: selectionStatus,
          notes,
          emailDispatched: Boolean(emailResult?.success),
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Student selection status updated to ${selectionStatus}.`,
      student: {
        id: updatedStudent.id,
        name: updatedStudent.name,
        selectionStatus: updatedStudent.selectionStatus,
        selectedAt: updatedStudent.selectedAt,
        selectionEmailSentAt: updatedStudent.selectionEmailSentAt,
      },
      emailResult,
    });
  } catch (error: any) {
    console.error("Student selection update error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
