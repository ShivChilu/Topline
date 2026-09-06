import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword, signToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { identifier, password } = body;

    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, message: "Registration number / phone and password are required." },
        { status: 400 }
      );
    }

    const cleanId = identifier.trim();

    // Find student user by registrationNumber, phone, or email
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
        { success: false, message: "No account found with the provided credentials." },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, message: "Your account is inactive. Please contact support." },
        { status: 403 }
      );
    }

    if (!user.passwordHash) {
      return NextResponse.json(
        { success: false, message: "Account has not set a password. Please register or contact support." },
        { status: 401 }
      );
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, message: "Invalid password." },
        { status: 401 }
      );
    }

    const token = signToken({
      id: user.id,
      username: user.registrationNumber || user.phone || user.username || "",
      role: user.role,
    });

    const response = NextResponse.json({
      success: true,
      message: "Logged in successfully!",
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        registrationNumber: user.registrationNumber,
        university: user.university,
        role: user.role,
      },
    });

    response.cookies.set("user_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Student login error:", error);
    return NextResponse.json(
      { success: false, message: "Login failed. Please try again." },
      { status: 500 }
    );
  }
}
