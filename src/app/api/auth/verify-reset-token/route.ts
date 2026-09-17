import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { success: false, message: "Reset token is missing." },
        { status: 400 }
      );
    }

    const resetRecord = await prisma.passwordResetToken.findFirst({
      where: {
        token: token.trim(),
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            registrationNumber: true,
          },
        },
      },
    });

    if (!resetRecord) {
      return NextResponse.json(
        {
          success: false,
          message: "This password reset link is invalid or has expired (links expire after 5 minutes). Please request a new one.",
        },
        { status: 400 }
      );
    }

    const remainingMs = resetRecord.expiresAt.getTime() - Date.now();
    const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));

    return NextResponse.json({
      success: true,
      userName: resetRecord.user.name,
      remainingSeconds,
      expiresAt: resetRecord.expiresAt,
    });
  } catch (error: any) {
    console.error("Token verification error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to verify token." },
      { status: 500 }
    );
  }
}
