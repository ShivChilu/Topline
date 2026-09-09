import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// 1x1 transparent GIF (43 bytes)
const TRANSPARENT_GIF_BUFFER = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const emailId = searchParams.get("emailId");

    if (emailId) {
      const now = new Date();
      // Record first open time and increment open counter
      await prisma.emailLog.updateMany({
        where: { id: emailId },
        data: {
          openedAt: now,
          openCount: { increment: 1 },
        },
      }).catch((err) => console.error("Error logging email open:", err));
    }

    return new NextResponse(TRANSPARENT_GIF_BUFFER, {
      status: 200,
      headers: {
        "Content-Type": "image/gif",
        "Content-Length": String(TRANSPARENT_GIF_BUFFER.length),
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error) {
    console.error("Open tracker exception:", error);
    return new NextResponse(TRANSPARENT_GIF_BUFFER, {
      status: 200,
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control": "no-cache",
      },
    });
  }
}
