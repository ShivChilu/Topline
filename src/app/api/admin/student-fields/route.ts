import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FieldType } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET /api/admin/student-fields - list all dynamic student profile fields
export async function GET() {
  try {
    const fields = await prisma.studentProfileField.findMany({
      orderBy: { displayOrder: "asc" },
      include: {
        _count: {
          select: { values: true },
        },
      },
    });

    return NextResponse.json({ success: true, fields });
  } catch (error: any) {
    console.error("Fetch student fields error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST /api/admin/student-fields - create a new profile field
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { key, label, type = "TEXT", description, placeholder, options = [], isRequired = false, displayOrder = 0 } = body;

    if (!key || !label) {
      return NextResponse.json({ success: false, message: "Field Key and Label are required." }, { status: 400 });
    }

    const cleanKey = key.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");

    const existing = await prisma.studentProfileField.findUnique({
      where: { key: cleanKey },
    });

    if (existing) {
      return NextResponse.json({ success: false, message: `A field with key '${cleanKey}' already exists.` }, { status: 409 });
    }

    const field = await prisma.studentProfileField.create({
      data: {
        key: cleanKey,
        label: label.trim(),
        type: (type as FieldType) || "TEXT",
        description: description?.trim() || null,
        placeholder: placeholder?.trim() || null,
        options: Array.isArray(options) ? options : [],
        isRequired: Boolean(isRequired),
        displayOrder: parseInt(String(displayOrder), 10) || 0,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, message: "Profile field created successfully!", field });
  } catch (error: any) {
    console.error("Create student field error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// PATCH /api/admin/student-fields - update an existing profile field
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, label, type, description, placeholder, options, isRequired, displayOrder, isActive } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: "Field ID is required." }, { status: 400 });
    }

    const updated = await prisma.studentProfileField.update({
      where: { id },
      data: {
        ...(label !== undefined && { label: label.trim() }),
        ...(type !== undefined && { type: type as FieldType }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(placeholder !== undefined && { placeholder: placeholder?.trim() || null }),
        ...(options !== undefined && { options: Array.isArray(options) ? options : [] }),
        ...(isRequired !== undefined && { isRequired: Boolean(isRequired) }),
        ...(displayOrder !== undefined && { displayOrder: parseInt(String(displayOrder), 10) }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    });

    return NextResponse.json({ success: true, message: "Profile field updated successfully!", field: updated });
  } catch (error: any) {
    console.error("Update student field error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// DELETE /api/admin/student-fields - delete a profile field
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, message: "Field ID is required." }, { status: 400 });
    }

    await prisma.studentProfileField.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Profile field deleted successfully." });
  } catch (error: any) {
    console.error("Delete student field error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
