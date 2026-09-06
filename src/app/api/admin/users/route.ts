import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { Role } from "@prisma/client";

async function getLoggedInAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded || !decoded.id) return null;
  const user = await prisma.user.findUnique({ where: { id: decoded.id } });
  if (!user || !user.isActive || !["ADMIN", "SUPERADMIN", "CALLING_ADMIN"].includes(user.role)) return null;
  return user;
}

export async function GET() {
  const currentAdmin = await getLoggedInAdmin();
  if (!currentAdmin) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const admins = await prisma.user.findMany({
      where: {
        role: { in: [Role.ADMIN, Role.SUPERADMIN, Role.CALLING_ADMIN] },
      },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        assignedEvents: {
          include: {
            event: {
              select: { id: true, name: true, date: true, status: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedAdmins = admins.map((a) => ({
      _id: a.id,
      id: a.id,
      username: a.username,
      name: a.name,
      role: a.role === "CALLING_ADMIN" ? "calling" : a.role === "SUPERADMIN" ? "superadmin" : "admin",
      isActive: a.isActive,
      assignedEvents: a.assignedEvents.map((ae) => ae.event),
      createdAt: a.createdAt,
    }));

    return NextResponse.json({ success: true, admins: formattedAdmins });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const currentAdmin = await getLoggedInAdmin();
  if (!currentAdmin || currentAdmin.role !== "SUPERADMIN") {
    return NextResponse.json({ success: false, message: "Forbidden. Super Admin access required." }, { status: 403 });
  }

  try {
    const { username, password, role, assignedEvents, name } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ success: false, message: "Username and password are required." }, { status: 400 });
    }

    const cleanUsername = username.toLowerCase().trim();

    const existing = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });
    if (existing) {
      return NextResponse.json({ success: false, message: "Username is already taken." }, { status: 409 });
    }

    let roleEnum: Role = Role.ADMIN;
    if (role === "superadmin") roleEnum = Role.SUPERADMIN;
    else if (role === "calling") roleEnum = Role.CALLING_ADMIN;

    const newAdmin = await prisma.user.create({
      data: {
        username: cleanUsername,
        name: name?.trim() || cleanUsername.toUpperCase(),
        passwordHash: hashPassword(password),
        role: roleEnum,
        isActive: true,
      },
    });

    // Assign events if calling admin
    if (Array.isArray(assignedEvents) && assignedEvents.length > 0) {
      await prisma.adminAssignedEvent.createMany({
        data: assignedEvents.map((eventId: string) => ({
          adminId: newAdmin.id,
          eventId,
        })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Admin "${newAdmin.username}" registered successfully!`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const currentAdmin = await getLoggedInAdmin();
  if (!currentAdmin) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { adminId, username, password, role, assignedEvents, isActive, name } = body;

    // 1. Edit another admin (requires SUPERADMIN)
    if (adminId) {
      if (currentAdmin.role !== "SUPERADMIN") {
        return NextResponse.json({ success: false, message: "Forbidden. Super Admin access required." }, { status: 403 });
      }

      const adminToEdit = await prisma.user.findUnique({ where: { id: adminId } });
      if (!adminToEdit) {
        return NextResponse.json({ success: false, message: "Admin account to edit not found." }, { status: 404 });
      }

      const updateData: any = {};

      if (username) {
        const cleanUsername = username.toLowerCase().trim();
        if (cleanUsername !== adminToEdit.username) {
          const existing = await prisma.user.findUnique({ where: { username: cleanUsername } });
          if (existing) {
            return NextResponse.json({ success: false, message: "Username already taken." }, { status: 409 });
          }
          updateData.username = cleanUsername;
        }
      }

      if (name) updateData.name = name.trim();
      if (password) updateData.passwordHash = hashPassword(password);
      if (isActive !== undefined) updateData.isActive = isActive;

      if (role) {
        let roleEnum: Role = Role.ADMIN;
        if (role === "superadmin") roleEnum = Role.SUPERADMIN;
        else if (role === "calling") roleEnum = Role.CALLING_ADMIN;
        updateData.role = roleEnum;
      }

      await prisma.user.update({
        where: { id: adminId },
        data: updateData,
      });

      if (Array.isArray(assignedEvents)) {
        await prisma.adminAssignedEvent.deleteMany({ where: { adminId } });
        if (assignedEvents.length > 0) {
          await prisma.adminAssignedEvent.createMany({
            data: assignedEvents.map((eventId: string) => ({
              adminId,
              eventId,
            })),
            skipDuplicates: true,
          });
        }
      }

      return NextResponse.json({ success: true, message: "Admin account updated successfully!" });
    }

    // 2. Update own credentials
    const updateOwnData: any = {};
    if (username) {
      const cleanUsername = username.toLowerCase().trim();
      if (cleanUsername !== currentAdmin.username) {
        const existing = await prisma.user.findUnique({ where: { username: cleanUsername } });
        if (existing) {
          return NextResponse.json({ success: false, message: "Username already taken." }, { status: 409 });
        }
        updateOwnData.username = cleanUsername;
      }
    }
    if (name) updateOwnData.name = name.trim();
    if (password) updateOwnData.passwordHash = hashPassword(password);

    await prisma.user.update({
      where: { id: currentAdmin.id },
      data: updateOwnData,
    });

    return NextResponse.json({ success: true, message: "Credentials updated successfully!" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
