import { NextResponse } from "next/server";
import { processPendingAutoSelectionEmails } from "@/lib/auto-selection-processor";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function isAuthorized(request: Request) {
  // 1. Check Bearer Token against CRON_SECRET or ADMIN_SECRET
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  // 2. Check Admin Session Cookie
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;
    if (token) {
      const decoded = verifyToken(token);
      if (decoded && decoded.id) {
        const user = await prisma.user.findUnique({
          where: { id: decoded.id },
          select: { role: true, isActive: true },
        });
        if (user && user.isActive && ["SUPERADMIN", "ADMIN", "EVENT_ADMIN", "CALLING_ADMIN"].includes(user.role)) {
          return true;
        }
      }
    }
  } catch (err) {
    console.error("[Cron Auth Check Error]", err);
  }

  // Allow unauthenticated GET if no CRON_SECRET is configured on the environment (self-healing)
  if (!cronSecret) {
    return true;
  }

  return false;
}

export async function GET(request: Request) {
  try {
    const authorized = await isAuthorized(request);
    if (!authorized) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId") || undefined;

    const result = await processPendingAutoSelectionEmails(eventId);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result,
    });
  } catch (error: any) {
    console.error("[AutoSelectionCron GET Error]:", error);
    return NextResponse.json({ success: false, message: error.message || "Internal server error." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authorized = await isAuthorized(request);
    if (!authorized) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    let eventId: string | undefined;
    try {
      const body = await request.json();
      if (body?.eventId) {
        eventId = String(body.eventId);
      }
    } catch {
      // Empty body is okay
    }

    const result = await processPendingAutoSelectionEmails(eventId);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result,
    });
  } catch (error: any) {
    console.error("[AutoSelectionCron POST Error]:", error);
    return NextResponse.json({ success: false, message: error.message || "Internal server error." }, { status: 500 });
  }
}
