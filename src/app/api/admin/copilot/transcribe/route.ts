import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Groq from "groq-sdk";

export async function POST(req: Request) {
  try {
    // 1. Verify Admin Authentication
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.id) {
      return NextResponse.json({ success: false, message: "Invalid session." }, { status: 401 });
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, role: true, isActive: true },
    });

    if (!adminUser || !adminUser.isActive || !["ADMIN", "SUPERADMIN", "EVENT_ADMIN"].includes(adminUser.role)) {
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, message: "Groq API key missing." }, { status: 500 });
    }

    // 2. Parse Audio File from FormData
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, message: "No audio file provided." }, { status: 400 });
    }

    const groq = new Groq({ apiKey });

    // 3. Transcribe Audio via Groq Whisper Models
    const WHISPER_MODELS = [
      "whisper-large-v3",
      "distil-whisper-large-v3-en",
      "whisper-large-v3-turbo",
    ];

    let transcript = "";
    let lastError: any = null;

    for (const model of WHISPER_MODELS) {
      try {
        const transcription = await groq.audio.transcriptions.create({
          file: file,
          model: model,
          response_format: "json",
          language: "en",
        });

        if (transcription && transcription.text) {
          transcript = transcription.text.trim();
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[CopilotTranscribe] Model ${model} failed:`, err?.message);
      }
    }

    if (!transcript && lastError) {
      throw lastError;
    }

    return NextResponse.json({
      success: true,
      text: transcript,
    });
  } catch (error: any) {
    console.error("[CopilotTranscribe] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Audio transcription failed.",
      },
      { status: 500 }
    );
  }
}
