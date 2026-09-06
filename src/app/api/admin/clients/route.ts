import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { events: true },
        },
      },
    });
    const formatted = clients.map((c) => ({ ...c, _id: c.id }));
    return NextResponse.json({ success: true, clients: formatted });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, contactPerson, phone, email, address, notes } = body;

    if (!name || !contactPerson || !phone || !email || !address) {
      return NextResponse.json({ success: false, message: "Missing required client fields." }, { status: 400 });
    }

    const client = await prisma.client.create({
      data: {
        name,
        contactPerson,
        phone,
        email,
        address,
        notes,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Client profile created successfully!",
      client: { ...client, _id: client.id },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
