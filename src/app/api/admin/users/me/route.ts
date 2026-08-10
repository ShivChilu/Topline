import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Admin } from "@/models";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: "Not authenticated." }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.id) {
      return NextResponse.json({ success: false, message: "Invalid session." }, { status: 401 });
    }

    await connectToDatabase();
    const admin = await Admin.findById(decoded.id).select("-passwordHash");
    
    // Revoke access immediately if the admin is disabled/deactivated
    if (!admin || admin.isActive === false) {
      const response = NextResponse.json({ success: false, message: "Account disabled." }, { status: 401 });
      response.cookies.delete("admin_token");
      return response;
    }

    return NextResponse.json({
      success: true,
      username: admin.username,
      role: admin.role,
      assignedEvents: admin.assignedEvents || [],
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
