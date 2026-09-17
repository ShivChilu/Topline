import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { sendPasswordResetEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "your registered email";
  const [localPart, domain] = email.split("@");
  if (localPart.length <= 2) {
    return `${localPart[0]}***@${domain}`;
  }
  const start = localPart.slice(0, 2);
  const end = localPart.slice(-1);
  return `${start}***${end}@${domain}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { identifier } = body;

    if (!identifier || typeof identifier !== "string" || !identifier.trim()) {
      return NextResponse.json(
        { success: false, message: "Registration number, phone, or email is required." },
        { status: 400 }
      );
    }

    const cleanId = identifier.trim();

    // Look up student user
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { registrationNumber: cleanId },
          { phone: cleanId },
          { email: cleanId.toLowerCase() },
          { username: cleanId },
        ],
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "No account found matching this registration number, phone, or email.",
        },
        { status: 404 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        {
          success: false,
          message: "Your account is currently inactive. Please contact admin support.",
        },
        { status: 403 }
      );
    }

    if (!user.email || !user.email.trim()) {
      return NextResponse.json(
        {
          success: false,
          noEmail: true,
          message: "No registered email address is linked to this account. Please contact Topline Admin Support on WhatsApp for direct assistance.",
          user: {
            name: user.name,
            registrationNumber: user.registrationNumber,
            phone: user.phone,
          },
        },
        { status: 400 }
      );
    }

    // Rate limiting check: Max 3 requests in the last 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentRequestsCount = await prisma.passwordResetToken.count({
      where: {
        userId: user.id,
        createdAt: { gte: tenMinutesAgo },
      },
    });

    if (recentRequestsCount >= 4) {
      return NextResponse.json(
        {
          success: false,
          message: "Too many reset attempts. Please wait 10 minutes before requesting another code.",
        },
        { status: 429 }
      );
    }

    // Invalidate previous unused reset tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    // Generate cryptographic 6-digit OTP & 64-character URL token
    const otp = crypto.randomInt(100000, 999999).toString();
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // Strictly 5 minutes

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        otp,
        expiresAt,
      },
    });

    // Dispatch verification email
    const emailResult = await sendPasswordResetEmail({
      studentName: user.name,
      email: user.email,
      otp,
      resetToken: token,
      userId: user.id,
    });

    const masked = maskEmail(user.email);

    return NextResponse.json({
      success: true,
      maskedEmail: masked,
      expiresInMinutes: 5,
      simulated: emailResult.simulated,
      message: `A 6-digit verification code has been dispatched to ${masked}. It expires in 5 minutes.`,
    });
  } catch (error: any) {
    console.error("Forgot password request error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to process password reset request." },
      { status: 500 }
    );
  }
}
