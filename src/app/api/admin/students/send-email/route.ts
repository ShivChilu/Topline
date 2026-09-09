import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { sendCustomBroadcastEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

async function getLoggedInAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded || !decoded.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
  });
  if (!user || !user.isActive || !["ADMIN", "SUPERADMIN"].includes(user.role)) return null;
  return user;
}

function interpolateTags(template: string, student: any): string {
  if (!template) return "";

  const replacements: Record<string, string> = {
    name: student.name || "Student",
    studentName: student.name || "Student",
    registrationNumber: student.registrationNumber || "N/A",
    regNo: student.registrationNumber || "N/A",
    rollNo: student.registrationNumber || "N/A",
    university: student.university || "N/A",
    college: student.university || "N/A",
    city: student.city || "N/A",
    phone: student.phone || "N/A",
    mobile: student.phone || "N/A",
    gender: student.gender || "N/A",
    selectionStatus: student.selectionStatus || "UNDER_REVIEW",
    status: student.selectionStatus || "UNDER_REVIEW",
    age: student.age ? String(student.age) : "N/A",
    upiId: student.upiId || "N/A",
    email: student.email || "",
  };

  let result = template;
  for (const [key, value] of Object.entries(replacements)) {
    const regexDouble = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "gi");
    const regexSingle = new RegExp(`\\{\\s*${key}\\s*\\}`, "gi");
    result = result.replace(regexDouble, value).replace(regexSingle, value);
  }

  return result;
}

export async function POST(request: Request) {
  try {
    const admin = await getLoggedInAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const {
      studentIds,
      subject,
      message,
      includeBranding = true,
    } = body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({ success: false, message: "Please select at least one student." }, { status: 400 });
    }

    if (!subject || !subject.trim()) {
      return NextResponse.json({ success: false, message: "Email subject is required." }, { status: 400 });
    }

    if (!message || !message.trim()) {
      return NextResponse.json({ success: false, message: "Email message body is required." }, { status: 400 });
    }

    // Fetch targeted students
    const students = await prisma.user.findMany({
      where: {
        id: { in: studentIds },
        role: "USER",
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        registrationNumber: true,
        university: true,
        city: true,
        gender: true,
        age: true,
        upiId: true,
        selectionStatus: true,
      },
    });

    if (students.length === 0) {
      return NextResponse.json({ success: false, message: "No valid students found." }, { status: 404 });
    }

    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    // Dispatch custom emails with dynamic variable replacement per recipient
    for (const student of students) {
      if (!student.email) {
        failedCount++;
        errors.push(`${student.name} (No email address on file)`);
        continue;
      }

      const personalizedSubject = interpolateTags(subject, student);
      const personalizedMessage = interpolateTags(message, student);

      const result = await sendCustomBroadcastEmail({
        to: student.email,
        studentName: student.name,
        subject: personalizedSubject,
        messageBody: personalizedMessage,
        includeBranding,
        userId: student.id,
        templateName: body.templateName || "Custom Student Message",
      });

      if (result.success) {
        sentCount++;
      } else {
        failedCount++;
        errors.push(`${student.name} (${result.message || "Failed to deliver"})`);
      }
    }

    // Record audit trail
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: "CUSTOM_STUDENT_EMAIL_BROADCAST",
        target: `Recipients: ${sentCount}`,
        metadata: {
          recipientCount: students.length,
          sentCount,
          failedCount,
          subject,
          errors: errors.slice(0, 10),
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully dispatched email to ${sentCount} student(s).${failedCount > 0 ? ` (${failedCount} failed or skipped)` : ""}`,
      sentCount,
      failedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("Custom Email Broadcast Error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
