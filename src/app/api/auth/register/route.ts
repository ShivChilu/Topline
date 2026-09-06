import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, signToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Indian mobile phone validation regex: 10 digits starting with 6, 7, 8, or 9
const INDIAN_PHONE_REGEX = /^[6-9]\d{9}$/;
// Standard email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Strong password regex: min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

// Obviously fake / test phone numbers to reject
const REJECTED_PHONES = new Set([
  "1234567890",
  "0000000000",
  "1111111111",
  "2222222222",
  "3333333333",
  "4444444444",
  "5555555555",
  "6666666666",
  "7777777777",
  "8888888888",
  "9999999999",
  "9876543210",
]);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone, email, university, registrationNumber, password } = body;

    // 1. Full Name Validation
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { success: false, field: "name", message: "Please enter your full name (minimum 2 characters)." },
        { status: 400 }
      );
    }
    const cleanName = name.trim();

    // 2. Mobile Phone Validation & Canonical Normalization
    if (!phone || typeof phone !== "string") {
      return NextResponse.json(
        { success: false, field: "phone", message: "Mobile phone number is required." },
        { status: 400 }
      );
    }

    // Extract digits and remove leading country code if present (+91 or 91)
    let rawDigits = phone.replace(/[^0-9]/g, "");
    if (rawDigits.length === 12 && rawDigits.startsWith("91")) {
      rawDigits = rawDigits.slice(2);
    } else if (rawDigits.length > 10 && rawDigits.startsWith("0")) {
      rawDigits = rawDigits.replace(/^0+/, "");
    }

    if (!INDIAN_PHONE_REGEX.test(rawDigits) || REJECTED_PHONES.has(rawDigits)) {
      return NextResponse.json(
        {
          success: false,
          field: "phone",
          message: "Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).",
        },
        { status: 400 }
      );
    }
    const cleanPhone = rawDigits;

    // 3. Registration / Roll Number Validation
    if (!registrationNumber || typeof registrationNumber !== "string" || registrationNumber.trim().length < 2) {
      return NextResponse.json(
        { success: false, field: "registrationNumber", message: "Registration / Roll Number is required." },
        { status: 400 }
      );
    }
    const cleanReg = registrationNumber.trim().toUpperCase();

    // Prevent using registration number as mobile number
    if (cleanReg === cleanPhone) {
      return NextResponse.json(
        { success: false, field: "registrationNumber", message: "Registration number cannot be identical to mobile number." },
        { status: 400 }
      );
    }

    // 4. University / College Validation
    if (!university || typeof university !== "string" || university.trim().length < 2) {
      return NextResponse.json(
        { success: false, field: "university", message: "University / College name is required." },
        { status: 400 }
      );
    }
    const cleanUniversity = university.trim();

    // 5. Email Address Validation (MANDATORY)
    if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
      return NextResponse.json(
        { success: false, field: "email", message: "A valid email address is mandatory." },
        { status: 400 }
      );
    }
    const cleanEmail = email.trim().toLowerCase();

    // 6. Strong Password Validation
    if (!password || typeof password !== "string" || !STRONG_PASSWORD_REGEX.test(password)) {
      return NextResponse.json(
        {
          success: false,
          field: "password",
          message: "Password must be at least 8 characters long and contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (e.g. Topline@123).",
        },
        { status: 400 }
      );
    }

    // 7. Check for Duplicate Records in Database
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanEmail },
          { phone: cleanPhone },
          { registrationNumber: cleanReg },
        ],
      },
    });

    if (existingUser) {
      if (existingUser.email?.toLowerCase() === cleanEmail) {
        return NextResponse.json(
          { success: false, field: "email", message: "An account with this email already exists. Please log in." },
          { status: 409 }
        );
      }
      if (existingUser.phone === cleanPhone) {
        return NextResponse.json(
          { success: false, field: "phone", message: "An account with this mobile phone already exists. Please log in." },
          { status: 409 }
        );
      }
      if (existingUser.registrationNumber?.toUpperCase() === cleanReg) {
        return NextResponse.json(
          { success: false, field: "registrationNumber", message: "An account with this registration number already exists. Please log in." },
          { status: 409 }
        );
      }
    }

    // 8. Hash Password securely
    const passwordHash = await hashPassword(password);

    // 9. Transactional User Creation
    const newUser = await prisma.user.create({
      data: {
        username: `student_${cleanReg.toLowerCase().replace(/[^a-z0-9]/g, "")}_${Date.now().toString().slice(-4)}`,
        name: cleanName,
        phone: cleanPhone,
        email: cleanEmail,
        university: cleanUniversity,
        registrationNumber: cleanReg,
        passwordHash,
        role: "USER",
        isActive: true,
        selectionStatus: "UNDER_REVIEW",
      },
    });

    // 10. Issue 30-day persistent session token
    const token = signToken({
      id: newUser.id,
      username: newUser.registrationNumber || newUser.phone || newUser.username,
      role: newUser.role,
      name: newUser.name,
    });

    const response = NextResponse.json({
      success: true,
      message: "Student account created successfully! Redirecting to profile completion...",
      user: {
        id: newUser.id,
        name: newUser.name,
        phone: newUser.phone,
        email: newUser.email,
        registrationNumber: newUser.registrationNumber,
        university: newUser.university,
        role: newUser.role,
      },
    });

    response.cookies.set("user_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30-day persistent session
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Student registration error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
