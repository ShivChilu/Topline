import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Admin } from "@/models";
import { hashPassword, verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

// Helper to get currently logged-in admin from cookies
async function getLoggedInAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function GET() {
  const currentAdmin = await getLoggedInAdmin();
  if (!currentAdmin) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    await connectToDatabase();
    // Exclude password hashes from response
    const admins = await Admin.find({}, { passwordHash: 0 }).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, admins });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const currentAdmin = await getLoggedInAdmin();
  if (!currentAdmin) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const { username, password, role } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ success: false, message: "Username and password are required." }, { status: 400 });
    }

    const existing = await Admin.findOne({ username: username.toLowerCase().trim() });
    if (existing) {
      return NextResponse.json({ success: false, message: "Username is already taken." }, { status: 409 });
    }

    const newAdmin = await Admin.create({
      username: username.toLowerCase().trim(),
      passwordHash: hashPassword(password),
      role: role || "admin",
    });

    return NextResponse.json({ success: true, message: `Admin "${newAdmin.username}" registered successfully!` });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const currentAdmin = await getLoggedInAdmin();
  if (!currentAdmin) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const { username, password } = await request.json();

    const admin = await Admin.findById(currentAdmin.id);
    if (!admin) {
      return NextResponse.json({ success: false, message: "Admin account not found." }, { status: 404 });
    }

    if (username) {
      const normalizedUsername = username.toLowerCase().trim();
      if (normalizedUsername !== admin.username) {
        const existing = await Admin.findOne({ username: normalizedUsername });
        if (existing) {
          return NextResponse.json({ success: false, message: "Username already taken." }, { status: 409 });
        }
        admin.username = normalizedUsername;
      }
    }

    if (password) {
      admin.passwordHash = hashPassword(password);
    }

    await admin.save();

    return NextResponse.json({ success: true, message: "Credentials updated successfully!" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
