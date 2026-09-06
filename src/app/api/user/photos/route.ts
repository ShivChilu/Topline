import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StudentPhotoType } from "@prisma/client";

export const dynamic = "force-dynamic";

async function getAuthStudent() {
  const cookieStore = await cookies();
  const token = cookieStore.get("user_token")?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded || !decoded.id) return null;
  return decoded;
}

// GET /api/user/photos - list all photos for the logged-in student
export async function GET() {
  try {
    const student = await getAuthStudent();
    if (!student) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const photos = await prisma.studentPhoto.findMany({
      where: { userId: student.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, photos });
  } catch (error: any) {
    console.error("Fetch student photos error:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch photos." }, { status: 500 });
  }
}

// POST /api/user/photos - add a new student photo
export async function POST(request: Request) {
  try {
    const student = await getAuthStudent();
    if (!student) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const { url, photoType = "FORMAL", caption, isPrimary = false } = body;

    if (!url) {
      return NextResponse.json({ success: false, message: "Photo URL is required." }, { status: 400 });
    }

    // Validate photo type
    const validTypes: StudentPhotoType[] = ["FORMAL", "FULL_LENGTH", "CASUAL", "OTHER"];
    const typeEnum = validTypes.includes(photoType) ? (photoType as StudentPhotoType) : "FORMAL";

    // If marked as primary or if it's the first photo, update user profilePhotoUrl
    if (isPrimary) {
      // Unset previous primary photos
      await prisma.studentPhoto.updateMany({
        where: { userId: student.id },
        data: { isPrimary: false },
      });
      await prisma.user.update({
        where: { id: student.id },
        data: { profilePhotoUrl: url },
      });
    } else {
      // Check if user has no profile photo set
      const user = await prisma.user.findUnique({ where: { id: student.id } });
      if (!user?.profilePhotoUrl) {
        await prisma.user.update({
          where: { id: student.id },
          data: { profilePhotoUrl: url },
        });
      }
    }

    const photo = await prisma.studentPhoto.create({
      data: {
        userId: student.id,
        url,
        photoType: typeEnum,
        caption: caption || null,
        isPrimary: Boolean(isPrimary),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Photo uploaded and saved to your profile!",
      photo,
    });
  } catch (error: any) {
    console.error("Save student photo error:", error);
    return NextResponse.json({ success: false, message: "Failed to save photo." }, { status: 500 });
  }
}

// DELETE /api/user/photos - delete a student photo
export async function DELETE(request: Request) {
  try {
    const student = await getAuthStudent();
    if (!student) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get("id");

    if (!photoId) {
      return NextResponse.json({ success: false, message: "Photo ID required." }, { status: 400 });
    }

    const existing = await prisma.studentPhoto.findFirst({
      where: { id: photoId, userId: student.id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, message: "Photo not found." }, { status: 404 });
    }

    await prisma.studentPhoto.delete({
      where: { id: photoId },
    });

    // If the deleted photo was the user's primary profile photo, update to next available or null
    const remainingPhotos = await prisma.studentPhoto.findMany({
      where: { userId: student.id },
      orderBy: { createdAt: "desc" },
    });

    if (remainingPhotos.length > 0) {
      const primary = remainingPhotos.find((p) => p.isPrimary) || remainingPhotos[0];
      await prisma.user.update({
        where: { id: student.id },
        data: { profilePhotoUrl: primary.url },
      });
      if (!primary.isPrimary) {
        await prisma.studentPhoto.update({
          where: { id: primary.id },
          data: { isPrimary: true },
        });
      }
    } else {
      await prisma.user.update({
        where: { id: student.id },
        data: { profilePhotoUrl: null },
      });
    }

    return NextResponse.json({ success: true, message: "Photo deleted successfully." });
  } catch (error: any) {
    console.error("Delete student photo error:", error);
    return NextResponse.json({ success: false, message: "Failed to delete photo." }, { status: 500 });
  }
}
