import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("user_token")?.value || cookieStore.get("admin_token")?.value;

    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.id) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, message: "No file provided." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Validate size (max 5MB)
    if (buffer.length > 5 * 1024 * 1024) {
      return NextResponse.json({ success: false, message: "File size exceeds 5MB limit." }, { status: 400 });
    }

    const mimeType = file.type || "image/jpeg";
    const base64Data = buffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64Data}`;

    // Optional: write to local disk as backup
    try {
      const uploadDir = path.join(process.cwd(), "public", "uploads");
      await mkdir(uploadDir, { recursive: true });
      const ext = path.extname(file.name) || ".jpg";
      const uniqueName = `profile_${decoded.id}_${Date.now()}${ext}`;
      const filePath = path.join(uploadDir, uniqueName);
      await writeFile(filePath, buffer);
    } catch (diskErr) {
      console.warn("Disk cache write skipped:", diskErr);
    }

    // Update user profilePhotoUrl in PostgreSQL database with persistent image
    await prisma.user.update({
      where: { id: decoded.id },
      data: { profilePhotoUrl: dataUrl },
    });

    return NextResponse.json({
      success: true,
      message: "Photo uploaded successfully!",
      url: dataUrl,
    });
  } catch (error: any) {
    console.error("File upload error:", error);
    return NextResponse.json({ success: false, message: "Failed to upload file." }, { status: 500 });
  }
}
