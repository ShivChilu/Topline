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
  if (!user || !user.isActive || !["ADMIN", "SUPERADMIN", "EVENT_ADMIN", "CALLING_ADMIN"].includes(user.role)) return null;
  return user;
}

export async function POST(request: Request) {
  try {
    const admin = await getLoggedInAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const {
      subject,
      message,
      targetEmail = "chiluverushivaprasad01@gmail.com",
      templateName = "Template Test",
      includeBranding = true,
    } = body;

    if (!subject || !message) {
      return NextResponse.json({ success: false, message: "Subject and message body are required." }, { status: 400 });
    }

    const sampleData: Record<string, string> = {
      name: "Shiva Prasad (Sample)",
      studentName: "Shiva Prasad (Sample)",
      registrationNumber: "2023CSE1042",
      regNo: "2023CSE1042",
      rollNo: "2023CSE1042",
      university: "SRM University",
      college: "SRM University",
      city: "Jalandhar",
      phone: "9876543210",
      mobile: "9876543210",
      gender: "Male",
      selectionStatus: "SELECTED",
      status: "SELECTED",
      applicationStatus: "SELECTED",
      eventName: "Grand Royal Banquet",
      eventDate: "Saturday, 12 October 2026",
      eventLocation: "Radisson Blu, Jalandhar",
      reportingTime: "04:30 PM",
      paymentPerStudent: "₹650",
      attendanceStatus: "PRESENT",
      callingRemarks: "Confirmed lead steward",
      whatsappGroupLink: "https://chat.whatsapp.com/sample-group-link",
      age: "21",
      upiId: "shiva@okaxis",
      email: targetEmail,
    };

    let processedSubject = subject;
    let processedBody = message;

    for (const [key, value] of Object.entries(sampleData)) {
      const regexDouble = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "gi");
      const regexSingle = new RegExp(`\\{\\s*${key}\\s*\\}`, "gi");
      processedSubject = processedSubject.replace(regexDouble, value).replace(regexSingle, value);
      processedBody = processedBody.replace(regexDouble, value).replace(regexSingle, value);
    }

    const res = await sendCustomBroadcastEmail({
      to: targetEmail,
      studentName: "Shiva Prasad [Test Copy]",
      subject: `[TEST EMAIL] ${processedSubject}`,
      messageBody: processedBody,
      includeBranding,
      templateName: `${templateName} (Test to ${targetEmail})`,
    });

    if (res.success) {
      return NextResponse.json({
        success: true,
        message: `Test email successfully dispatched to ${targetEmail}! Check your inbox.`,
      });
    } else {
      return NextResponse.json({
        success: false,
        message: res.message || "Failed to dispatch test email.",
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Test email dispatch error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
