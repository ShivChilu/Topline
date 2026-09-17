import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const photoId = searchParams.get("photoId");

    let dataUrl: string | null = null;

    if (photoId) {
      const photo = await prisma.studentPhoto.findUnique({
        where: { id: photoId },
        select: { url: true },
      });
      if (photo?.url) {
        dataUrl = photo.url;
      } else {
        const appPhoto = await prisma.photo.findUnique({
          where: { id: photoId },
          select: { url: true },
        });
        dataUrl = appPhoto?.url || null;
      }
    } else if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          profilePhotoUrl: true,
          studentPhotos: {
            orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
            select: { id: true, url: true, isPrimary: true },
          },
        },
      });

      dataUrl = user?.profilePhotoUrl || null;

      // If user.profilePhotoUrl is missing or corrupted with a relative endpoint path, fall back to studentPhotos!
      if (!dataUrl || dataUrl.startsWith("/api/photos") || dataUrl.startsWith("/")) {
        const primaryPhoto = user?.studentPhotos?.find((p) => p.isPrimary) || user?.studentPhotos?.[0];
        if (primaryPhoto?.url) {
          dataUrl = primaryPhoto.url;
          // Auto-repair user profilePhotoUrl in DB asynchronously
          prisma.user
            .update({
              where: { id: userId },
              data: { profilePhotoUrl: primaryPhoto.url },
            })
            .catch((err) => console.warn("Auto-repair profilePhotoUrl skipped:", err));
        }
      }
    }

    if (!dataUrl) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // Handle Base64 Data URI
    if (dataUrl.startsWith("data:")) {
      const commaIdx = dataUrl.indexOf(",");
      if (commaIdx !== -1) {
        const header = dataUrl.slice(0, commaIdx);
        const base64Data = dataUrl.slice(commaIdx + 1);
        const mimeMatch = header.match(/^data:([^;]+)/);
        const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
        const buffer = Buffer.from(base64Data, "base64");

        return new NextResponse(buffer, {
          status: 200,
          headers: {
            "Content-Type": mimeType,
            "Content-Length": buffer.length.toString(),
            "Cache-Control": "public, max-age=0, must-revalidate",
          },
        });
      }
    }

    // Handle relative or external URL
    if (dataUrl.startsWith("http://") || dataUrl.startsWith("https://")) {
      return NextResponse.redirect(dataUrl);
    }

    if (dataUrl.startsWith("/")) {
      return NextResponse.redirect(new URL(dataUrl, request.url));
    }

    return new NextResponse("Invalid image format", { status: 400 });
  } catch (error: any) {
    console.error("Serve student photo error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
