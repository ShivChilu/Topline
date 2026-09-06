import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId");
    const category = searchParams.get("category");

    const where: any = { isPublic: true };
    if (eventId) where.eventId = eventId;
    if (category) where.category = category;

    const photos = await prisma.photo.findMany({
      where,
      include: {
        event: {
          select: { id: true, name: true, date: true, location: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, photos });
  } catch (error) {
    console.error("Fetch photos error:", error);
    return NextResponse.json({ success: false, message: "Internal error" }, { status: 500 });
  }
}
