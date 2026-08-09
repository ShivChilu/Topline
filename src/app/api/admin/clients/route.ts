import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Client } from "@/models";

export async function GET() {
  try {
    await connectToDatabase();
    const clients = await Client.find().sort({ name: 1 }).lean();
    return NextResponse.json({ success: true, clients });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { name, contactPerson, phone, email, address, notes } = body;

    if (!name || !contactPerson || !phone || !email || !address) {
      return NextResponse.json({ success: false, message: "Missing required client fields." }, { status: 400 });
    }

    const client = await Client.create({
      name,
      contactPerson,
      phone,
      email,
      address,
      notes,
    });

    return NextResponse.json({ success: true, message: "Client profile created successfully!", client });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
