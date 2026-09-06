import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

async function getAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded || !decoded.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
  });
  if (!user || user.isActive === false) return null;
  return user;
}

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const photos = await prisma.photo.findMany({
      where: { eventId: params.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, photos });
  } catch (error) {
    console.error("Fetch event photos error:", error);
    return NextResponse.json({ success: false, message: "Internal error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const admin = await getAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const { url, caption, category, isPublic } = body;

    if (!url) {
      return NextResponse.json({ success: false, message: "Photo URL is required." }, { status: 400 });
    }

    const photo = await prisma.photo.create({
      data: {
        eventId: params.id,
        url: url.trim(),
        caption: caption ? caption.trim() : null,
        category: category || "Event",
        isPublic: isPublic !== undefined ? isPublic : true,
        userId: admin.id,
      },
    });

    return NextResponse.json({ success: true, message: "Photo added successfully!", photo });
  } catch (error) {
    console.error("Add event photo error:", error);
    return NextResponse.json({ success: false, message: "Failed to add photo" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get("photoId");

    if (!photoId) {
      return NextResponse.json({ success: false, message: "photoId is required." }, { status: 400 });
    }

    await prisma.photo.delete({
      where: { id: photoId },
    });

    return NextResponse.json({ success: true, message: "Photo deleted successfully!" });
  } catch (error) {
    console.error("Delete photo error:", error);
    return NextResponse.json({ success: false, message: "Failed to delete photo" }, { status: 500 });
  }
}
