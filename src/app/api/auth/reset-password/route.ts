import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, signToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { identifier, otp, token, newPassword } = body;

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: "New password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const now = new Date();
    let resetRecord = null;
    let targetUserId = null;

    // 1. Direct Token Flow (from email link)
    if (token && typeof token === "string") {
      resetRecord = await prisma.passwordResetToken.findFirst({
        where: {
          token: token.trim(),
          usedAt: null,
          expiresAt: { gt: now },
        },
        include: { user: true },
      });

      if (resetRecord) {
        targetUserId = resetRecord.userId;
      }
    }
    // 2. OTP Flow (from on-screen form with identifier)
    else if (otp && identifier && typeof otp === "string" && typeof identifier === "string") {
      const cleanId = identifier.trim();
      const cleanOtp = otp.trim();

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
          { success: false, message: "Account not found with provided identifier." },
          { status: 404 }
        );
      }

      targetUserId = user.id;

      resetRecord = await prisma.passwordResetToken.findFirst({
        where: {
          userId: user.id,
          otp: cleanOtp,
          usedAt: null,
          expiresAt: { gt: now },
        },
        include: { user: true },
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: "Please provide either your 6-digit OTP code or reset token.",
        },
        { status: 400 }
      );
    }

    if (!resetRecord || !targetUserId) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid or expired verification code. Codes are strictly valid for 5 minutes. Please request a new code.",
        },
        { status: 400 }
      );
    }

    const targetUser = resetRecord.user;
    const isAdmin = ["ADMIN", "SUPERADMIN", "CALLING_ADMIN", "EVENT_ADMIN"].includes(targetUser.role) || targetUser.role !== "USER";
    if (isAdmin) {
      return NextResponse.json(
        {
          success: false,
          message: "Password reset is not allowed for administrative accounts. Please contact the Super Admin.",
        },
        { status: 403 }
      );
    }

    const newPasswordHash = hashPassword(newPassword);

    // Update user password and burn the used token
    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: targetUserId },
        data: {
          passwordHash: newPasswordHash,
        },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { usedAt: now },
      }),
      prisma.passwordResetToken.deleteMany({
        where: {
          userId: targetUserId,
          id: { not: resetRecord.id },
        },
      }),
    ]);

    // Sign authentication JWT token for instant seamless login
    const sessionToken = signToken({
      id: updatedUser.id,
      username: updatedUser.registrationNumber || updatedUser.phone || updatedUser.username || "",
      role: updatedUser.role,
      name: updatedUser.name,
    });

    const response = NextResponse.json({
      success: true,
      message: "Your password has been successfully reset! Redirecting to your dashboard...",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        phone: updatedUser.phone,
        email: updatedUser.email,
        registrationNumber: updatedUser.registrationNumber,
        university: updatedUser.university,
        role: updatedUser.role,
      },
    });

    response.cookies.set("user_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Password reset error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to reset password." },
      { status: 500 }
    );
  }
}
