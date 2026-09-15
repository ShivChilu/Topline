import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return new NextResponse("Missing image ID", { status: 400 });
    }

    const item = await prisma.gallery.findUnique({
      where: { id },
      select: { imageUrl: true },
    });

    if (!item || !item.imageUrl) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const dataUrl = item.imageUrl;

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
            "Cache-Control": "public, max-age=604800, stale-while-revalidate=86400",
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
    console.error("Serve gallery photo error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
