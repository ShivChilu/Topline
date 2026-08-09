import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Setting } from "@/models";

export async function GET() {
  try {
    await connectToDatabase();
    const config = await Setting.findOne({ key: "homepage_content" });
    return NextResponse.json({ success: true, settings: config?.value || {} });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json();

    const config = await Setting.findOneAndUpdate(
      { key: "homepage_content" },
      { value: body, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, message: "Settings updated successfully!", settings: config.value });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
