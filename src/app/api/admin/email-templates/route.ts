import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export interface CustomEmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: "STUDENT" | "EVENT" | "GLOBAL";
  createdAt: string;
  updatedAt: string;
}

const SETTING_KEY = "custom_email_templates";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category"); // "STUDENT" | "EVENT" | "GLOBAL" | null

    const setting = await prisma.setting.findUnique({
      where: { key: SETTING_KEY },
    });

    let templates: CustomEmailTemplate[] = Array.isArray(setting?.value)
      ? (setting?.value as unknown as CustomEmailTemplate[])
      : [];

    if (category && category !== "ALL") {
      templates = templates.filter(
        (t) => t.category === "GLOBAL" || t.category === category
      );
    }

    return NextResponse.json({
      success: true,
      templates,
    });
  } catch (error: any) {
    console.error("Error fetching email templates:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch email templates" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, name, subject, body: templateBody, category = "GLOBAL" } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, message: "Template name is required" },
        { status: 400 }
      );
    }

    if (!subject?.trim() || !templateBody?.trim()) {
      return NextResponse.json(
        { success: false, message: "Subject and Message body are required" },
        { status: 400 }
      );
    }

    const setting = await prisma.setting.findUnique({
      where: { key: SETTING_KEY },
    });

    let templates: CustomEmailTemplate[] = Array.isArray(setting?.value)
      ? (setting?.value as unknown as CustomEmailTemplate[])
      : [];

    const now = new Date().toISOString();

    if (id) {
      // Update existing
      const existingIdx = templates.findIndex((t) => t.id === id);
      if (existingIdx >= 0) {
        templates[existingIdx] = {
          ...templates[existingIdx],
          name: name.trim(),
          subject: subject.trim(),
          body: templateBody.trim(),
          category,
          updatedAt: now,
        };
      } else {
        templates.unshift({
          id,
          name: name.trim(),
          subject: subject.trim(),
          body: templateBody.trim(),
          category,
          createdAt: now,
          updatedAt: now,
        });
      }
    } else {
      // Create new
      const newTemplate: CustomEmailTemplate = {
        id: "tpl_" + crypto.randomUUID(),
        name: name.trim(),
        subject: subject.trim(),
        body: templateBody.trim(),
        category,
        createdAt: now,
        updatedAt: now,
      };
      templates.unshift(newTemplate);
    }

    await prisma.setting.upsert({
      where: { key: SETTING_KEY },
      update: { value: templates as any },
      create: { key: SETTING_KEY, value: templates as any },
    });

    return NextResponse.json({
      success: true,
      message: id ? "Template updated successfully!" : "Template created successfully!",
      templates,
    });
  } catch (error: any) {
    console.error("Error saving email template:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to save email template" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Template ID is required" },
        { status: 400 }
      );
    }

    const setting = await prisma.setting.findUnique({
      where: { key: SETTING_KEY },
    });

    let templates: CustomEmailTemplate[] = Array.isArray(setting?.value)
      ? (setting?.value as unknown as CustomEmailTemplate[])
      : [];

    templates = templates.filter((t) => t.id !== id);

    await prisma.setting.upsert({
      where: { key: SETTING_KEY },
      update: { value: templates as any },
      create: { key: SETTING_KEY, value: templates as any },
    });

    return NextResponse.json({
      success: true,
      message: "Template deleted successfully!",
      templates,
    });
  } catch (error: any) {
    console.error("Error deleting email template:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to delete email template" },
      { status: 500 }
    );
  }
}
