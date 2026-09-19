import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const config = await prisma.setting.findUnique({
      where: { key: "homepage_content" },
    });
    return NextResponse.json({ success: true, settings: config?.value || {} });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const config = await prisma.setting.upsert({
      where: { key: "homepage_content" },
      update: { value: body },
      create: { key: "homepage_content", value: body },
    });

    if (body.autoSelectionEmailsEnabled !== undefined) {
      await prisma.setting.upsert({
        where: { key: "auto_selection_emails_enabled" },
        update: { value: Boolean(body.autoSelectionEmailsEnabled) },
        create: { key: "auto_selection_emails_enabled", value: Boolean(body.autoSelectionEmailsEnabled) },
      });
    }

    if (body.defaultAutoSelectionDelayHours !== undefined) {
      await prisma.setting.upsert({
        where: { key: "default_auto_selection_delay_hours" },
        update: { value: Number(body.defaultAutoSelectionDelayHours) || 2 },
        create: { key: "default_auto_selection_delay_hours", value: Number(body.defaultAutoSelectionDelayHours) || 2 },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Settings updated successfully!",
      settings: config.value,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
