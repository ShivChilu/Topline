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
      orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
    });

    const formattedPhotos = photos.map((p) => ({
      id: p.id,
      userId: p.userId,
      photoType: p.photoType,
      caption: p.caption,
      isPrimary: p.isPrimary,
      createdAt: p.createdAt,
      url: `/api/photos/student?photoId=${p.id}&t=${new Date(p.createdAt).getTime()}`,
    }));

    return NextResponse.json({ success: true, photos: formattedPhotos });
  } catch (error: any) {
    console.error("Fetch student photos error:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch photos." }, { status: 500 });
  }
}

// POST /api/user/photos - add or replace a student photo
export async function POST(request: Request) {
  try {
    const student = await getAuthStudent();
    if (!student) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const { url, photoType = "FORMAL", caption, isPrimary = false, replacePhotoId } = body;

    if (!url) {
      return NextResponse.json({ success: false, message: "Photo URL is required." }, { status: 400 });
    }

    // Validate photo type
    const validTypes: StudentPhotoType[] = ["FORMAL", "FULL_LENGTH", "CASUAL", "OTHER"];
    const typeEnum = validTypes.includes(photoType) ? (photoType as StudentPhotoType) : "FORMAL";

    // If replacePhotoId is specified, update existing photo
    if (replacePhotoId) {
      const existing = await prisma.studentPhoto.findFirst({
        where: { id: replacePhotoId, userId: student.id },
      });

      if (existing) {
        const updated = await prisma.studentPhoto.update({
          where: { id: replacePhotoId },
          data: {
            url,
            photoType: typeEnum,
            caption: caption !== undefined ? caption : existing.caption,
            isPrimary: isPrimary !== undefined ? Boolean(isPrimary) : existing.isPrimary,
          },
        });

        if (updated.isPrimary) {
          await prisma.studentPhoto.updateMany({
            where: { userId: student.id, id: { not: replacePhotoId } },
            data: { isPrimary: false },
          });
          await prisma.user.update({
            where: { id: student.id },
            data: { profilePhotoUrl: url },
          });
        }

        return NextResponse.json({
          success: true,
          message: "Photo replaced successfully!",
          photo: {
            id: updated.id,
            userId: updated.userId,
            photoType: updated.photoType,
            caption: updated.caption,
            isPrimary: updated.isPrimary,
            createdAt: updated.createdAt,
            url: `/api/photos/student?photoId=${updated.id}&t=${Date.now()}`,
          },
        });
      }
    }

    // Check count of photos
    const existingPhotos = await prisma.studentPhoto.findMany({
      where: { userId: student.id },
    });
    const shouldBePrimary = Boolean(isPrimary) || existingPhotos.length === 0;

    if (shouldBePrimary) {
      await prisma.studentPhoto.updateMany({
        where: { userId: student.id },
        data: { isPrimary: false },
      });
      await prisma.user.update({
        where: { id: student.id },
        data: { profilePhotoUrl: url },
      });
    }

    const photo = await prisma.studentPhoto.create({
      data: {
        userId: student.id,
        url,
        photoType: typeEnum,
        caption: caption || null,
        isPrimary: shouldBePrimary,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Photo uploaded and saved to your profile!",
      photo: {
        id: photo.id,
        userId: photo.userId,
        photoType: photo.photoType,
        caption: photo.caption,
        isPrimary: photo.isPrimary,
        createdAt: photo.createdAt,
        url: `/api/photos/student?photoId=${photo.id}&t=${Date.now()}`,
      },
    });
  } catch (error: any) {
    console.error("Save student photo error:", error);
    return NextResponse.json({ success: false, message: "Failed to save photo." }, { status: 500 });
  }
}

// PATCH /api/user/photos - update photo (e.g. set as primary, change category, or caption)
export async function PATCH(request: Request) {
  try {
    const student = await getAuthStudent();
    if (!student) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const { photoId, isPrimary, photoType, caption } = body;

    if (!photoId) {
      return NextResponse.json({ success: false, message: "Photo ID is required." }, { status: 400 });
    }

    const photo = await prisma.studentPhoto.findFirst({
      where: { id: photoId, userId: student.id },
    });

    if (!photo) {
      return NextResponse.json({ success: false, message: "Photo not found." }, { status: 404 });
    }

    if (isPrimary) {
      // Unset all other photos as primary
      await prisma.studentPhoto.updateMany({
        where: { userId: student.id },
        data: { isPrimary: false },
      });

      // Set this photo as primary
      await prisma.studentPhoto.update({
        where: { id: photoId },
        data: { isPrimary: true },
      });

      // Update user main profilePhotoUrl
      await prisma.user.update({
        where: { id: student.id },
        data: { profilePhotoUrl: photo.url },
      });
    }

    if (photoType || caption !== undefined) {
      const validTypes: StudentPhotoType[] = ["FORMAL", "FULL_LENGTH", "CASUAL", "OTHER"];
      const typeEnum = photoType && validTypes.includes(photoType) ? (photoType as StudentPhotoType) : undefined;

      await prisma.studentPhoto.update({
        where: { id: photoId },
        data: {
          ...(typeEnum && { photoType: typeEnum }),
          ...(caption !== undefined && { caption: caption ? String(caption).trim() : null }),
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: isPrimary ? "Photo set as your primary profile photo!" : "Photo details updated.",
    });
  } catch (error: any) {
    console.error("Update student photo error:", error);
    return NextResponse.json({ success: false, message: "Failed to update photo." }, { status: 500 });
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

    // If the deleted photo was primary, assign next available or null
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
