import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Gallery } from "@/models";

export async function GET() {
  try {
    await connectToDatabase();
    const images = await Gallery.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, images });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const { imageUrl, caption, category, published } = await request.json();

    if (!imageUrl || !caption || !category) {
      return NextResponse.json({ success: false, message: "Missing image fields." }, { status: 400 });
    }

    const image = await Gallery.create({
      imageUrl,
      caption,
      category,
      published: published !== undefined ? published : true,
    });

    return NextResponse.json({ success: true, message: "Gallery image uploaded/published successfully!", image });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await connectToDatabase();
    const { id, published, caption, category } = await request.json();

    const image = await Gallery.findByIdAndUpdate(
      id,
      { ...(published !== undefined && { published }), ...(caption && { caption }), ...(category && { category }) },
      { new: true }
    );

    if (!image) {
      return NextResponse.json({ success: false, message: "Image not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Gallery item updated successfully!", image });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await connectToDatabase();
    const { id } = await request.json();

    const image = await Gallery.findByIdAndDelete(id);
    if (!image) {
      return NextResponse.json({ success: false, message: "Image not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Image deleted successfully!" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
