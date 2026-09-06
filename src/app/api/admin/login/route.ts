import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword, signToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ success: false, message: "Username and password are required." }, { status: 400 });
    }

    const cleanUsername = username.toLowerCase().trim();

    // Look up Admin user
    const admin = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });

    if (!admin || !["ADMIN", "SUPERADMIN", "CALLING_ADMIN"].includes(admin.role)) {
      return NextResponse.json({ success: false, message: "Invalid administrative credentials." }, { status: 401 });
    }

    if (!admin.isActive) {
      return NextResponse.json({ success: false, message: "This administrative account is deactivated." }, { status: 403 });
    }

    const isMatch = comparePassword(password, admin.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ success: false, message: "Invalid administrative credentials." }, { status: 401 });
    }

    const token = signToken({
      id: admin.id,
      username: admin.username,
      role: admin.role,
      name: admin.name,
    });

    const roleLower = admin.role === "CALLING_ADMIN" ? "calling" : admin.role === "SUPERADMIN" ? "superadmin" : "admin";

    const response = NextResponse.json({
      success: true,
      message: "Login successful!",
      admin: {
        id: admin.id,
        username: admin.username,
        name: admin.name,
        role: roleLower,
      },
    });

    // Set JWT in HTTP-Only Cookie
    response.cookies.set("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
      sameSite: "lax",
    });

    return response;
  } catch (error: any) {
    console.error("Admin Login Error:", error);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}
