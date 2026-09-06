import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const images = await prisma.gallery.findMany({
      orderBy: { createdAt: "desc" },
    });
    const formatted = images.map((img) => ({ ...img, _id: img.id }));
    return NextResponse.json({ success: true, images: formatted });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { imageUrl, caption, category, published } = await request.json();

    if (!imageUrl || !caption || !category) {
      return NextResponse.json({ success: false, message: "Missing image fields." }, { status: 400 });
    }

    const image = await prisma.gallery.create({
      data: {
        imageUrl,
        caption,
        category,
        published: published !== undefined ? published : true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Gallery image uploaded/published successfully!",
      image: { ...image, _id: image.id },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, published, caption, category } = await request.json();

    const updateData: any = {};
    if (published !== undefined) updateData.published = published;
    if (caption !== undefined) updateData.caption = caption;
    if (category !== undefined) updateData.category = category;

    const image = await prisma.gallery.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: "Gallery item updated successfully!",
      image: { ...image, _id: image.id },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    await prisma.gallery.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Image deleted successfully!" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
