import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const emailId = searchParams.get("emailId");
    const action = searchParams.get("action") || "BUTTON_CLICK";
    const redirectUrl = searchParams.get("url") || "https://toplineodc.co.in/profile";

    if (emailId) {
      const now = new Date();
      await prisma.emailLog.updateMany({
        where: { id: emailId },
        data: {
          openedAt: now, // Clicking implies email was opened
          openCount: { increment: 1 },
          clickedAt: now,
          clickCount: { increment: 1 },
          clickedAction: action,
          clickedUrl: redirectUrl,
        },
      }).catch((err) => console.error("Error logging email click:", err));
    }

    // Safely redirect candidate to their destination (RSVP YES/NO, WhatsApp Group, Portal, etc.)
    return NextResponse.redirect(new URL(redirectUrl, "https://toplineodc.co.in"), { status: 302 });
  } catch (error) {
    console.error("Click tracker redirect exception:", error);
    return NextResponse.redirect("https://toplineodc.co.in/profile", { status: 302 });
  }
}
