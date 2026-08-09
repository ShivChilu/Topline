import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Student } from "@/models";

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");

    const filter: any = {};
    if (status) {
      filter.status = status;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { universityId: { $regex: search, $options: "i" } },
      ];
    }

    const students = await Student.find(filter).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, students });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await connectToDatabase();
    const { studentId, status } = await request.json();

    if (!studentId || !status) {
      return NextResponse.json({ success: false, message: "Missing student ID or target status." }, { status: 400 });
    }

    const student = await Student.findByIdAndUpdate(studentId, { status }, { new: true });
    if (!student) {
      return NextResponse.json({ success: false, message: "Student profile not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: `Student status updated to ${status}.`, student });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
