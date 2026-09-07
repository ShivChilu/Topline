import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        assignedEvents: {
          select: { eventId: true },
        },
      },
    });

    if (!user || !user.isActive || !["ADMIN", "SUPERADMIN", "CALLING_ADMIN", "EVENT_ADMIN"].includes(user.role)) {
      const response = NextResponse.json({ success: false, message: "Account disabled or unauthorized." }, { status: 401 });
      response.cookies.delete("admin_token");
      return response;
    }

    const roleLower =
      user.role === "EVENT_ADMIN"
        ? "event_admin"
        : user.role === "CALLING_ADMIN"
        ? "calling"
        : user.role === "SUPERADMIN"
        ? "superadmin"
        : "admin";
    const assignedEvents = user.assignedEvents.map((a) => a.eventId);

    return NextResponse.json({
      success: true,
      id: user.id,
      username: user.username,
      name: user.name,
      role: roleLower,
      assignedEvents,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
