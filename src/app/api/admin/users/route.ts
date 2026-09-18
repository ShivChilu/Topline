import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { Role } from "@prisma/client";
import { sendAdminCredentialsEmail, sendAdminEventAssignmentEmail } from "@/lib/email";

async function getLoggedInAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded || !decoded.id) return null;
  const user = await prisma.user.findUnique({ where: { id: decoded.id } });
  if (!user || !user.isActive || !["ADMIN", "SUPERADMIN", "CALLING_ADMIN", "EVENT_ADMIN"].includes(user.role)) return null;
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
        role: { in: [Role.ADMIN, Role.SUPERADMIN, Role.CALLING_ADMIN, Role.EVENT_ADMIN] },
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        customPermissions: true,
        createdAt: true,
        assignedEvents: {
          include: {
            event: {
              select: { id: true, name: true, date: true, status: true, location: true },
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
      email: a.email || "",
      phone: a.phone || "",
      role:
        a.role === "EVENT_ADMIN"
          ? "event_admin"
          : a.role === "CALLING_ADMIN"
          ? "calling"
          : a.role === "SUPERADMIN"
          ? "superadmin"
          : "admin",
      isActive: a.isActive,
      customPermissions: a.customPermissions || [],
      assignedEvents: a.assignedEvents.map((ae) => ({
        ...ae.event,
        permissions: ae.permissions || [],
      })),
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
    const {
      username,
      password,
      role,
      assignedEvents,
      name,
      email,
      phone,
      permissions,
      customPermissions,
      sendEmailCredentials = true,
    } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ success: false, message: "Username and password are required." }, { status: 400 });
    }

    const cleanUsername = username.toLowerCase().trim();
    const cleanEmail = email ? email.toLowerCase().trim() : null;

    const existing = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });
    if (existing) {
      return NextResponse.json({ success: false, message: "Username is already taken." }, { status: 409 });
    }

    if (cleanEmail) {
      const existingEmail = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });
      if (existingEmail) {
        return NextResponse.json({ success: false, message: "Email address is already registered." }, { status: 409 });
      }
    }

    let roleEnum: Role = Role.ADMIN;
    if (role === "superadmin") roleEnum = Role.SUPERADMIN;
    else if (role === "calling") roleEnum = Role.CALLING_ADMIN;
    else if (role === "event_admin") roleEnum = Role.EVENT_ADMIN;

    const permsList: string[] = Array.isArray(permissions)
      ? permissions
      : Array.isArray(customPermissions)
      ? customPermissions
      : [];

    const newAdmin = await prisma.user.create({
      data: {
        username: cleanUsername,
        name: name?.trim() || cleanUsername.toUpperCase(),
        email: cleanEmail,
        phone: phone?.trim() || null,
        passwordHash: hashPassword(password),
        role: roleEnum,
        isActive: true,
        customPermissions: permsList,
      },
    });

    let assignedEventNames: string[] = [];

    // Assign events if calling admin or event admin
    if (Array.isArray(assignedEvents) && assignedEvents.length > 0) {
      const eventIds = assignedEvents.map((item: any) => (typeof item === "string" ? item : item.eventId));
      const eventAssignmentsData = assignedEvents.map((item: any) => {
        const eventId = typeof item === "string" ? item : item.eventId;
        const itemPerms = typeof item === "object" && Array.isArray(item.permissions) ? item.permissions : permsList;
        return {
          adminId: newAdmin.id,
          eventId,
          permissions: itemPerms,
        };
      });

      await prisma.adminAssignedEvent.createMany({
        data: eventAssignmentsData,
        skipDuplicates: true,
      });

      const eventsData = await prisma.event.findMany({
        where: { id: { in: eventIds } },
      });
      assignedEventNames = eventsData.map((e) => e.name);

      // Dispatch event assignment emails to the admin
      if (cleanEmail && (roleEnum === Role.EVENT_ADMIN || roleEnum === Role.CALLING_ADMIN)) {
        for (const ev of eventsData) {
          sendAdminEventAssignmentEmail({
            adminName: newAdmin.name,
            email: cleanEmail,
            eventName: ev.name,
            eventDate: ev.date,
            eventLocation: ev.location,
            reportingTime: ev.reportingTime,
            workType: ev.workType,
            workersRequired: ev.workersRequired,
            paymentPerStudent: ev.paymentPerStudent,
            instructions: ev.instructions,
            whatsappGroupLink: ev.whatsappGroupLink,
            assignedByAdminName: currentAdmin.name || currentAdmin.username,
          }).catch((err) => console.error("Admin event assignment email dispatch error:", err));
        }
      }
    }

    // Automatically send login credentials to admin's email if provided
    let emailSent = false;
    if (cleanEmail && sendEmailCredentials) {
      const emailResult = await sendAdminCredentialsEmail({
        adminName: newAdmin.name,
        email: cleanEmail,
        username: cleanUsername,
        password,
        role: roleEnum,
        assignedEventNames,
      });
      emailSent = emailResult.success;
    }

    return NextResponse.json({
      success: true,
      message: `Admin "${newAdmin.username}" registered successfully!${
        emailSent ? " Credentials dispatched to " + cleanEmail : ""
      }`,
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
    const {
      adminId,
      username,
      password,
      role,
      assignedEvents,
      isActive,
      name,
      email,
      phone,
      permissions,
      customPermissions,
      resendCredentials,
    } = body;

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

      if (email !== undefined) {
        const cleanEmail = email ? email.toLowerCase().trim() : null;
        if (cleanEmail && cleanEmail !== adminToEdit.email) {
          const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
          if (existing) {
            return NextResponse.json({ success: false, message: "Email already taken." }, { status: 409 });
          }
        }
        updateData.email = cleanEmail;
      }

      if (phone !== undefined) updateData.phone = phone ? phone.trim() : null;
      if (name) updateData.name = name.trim();
      if (password && password.trim()) updateData.passwordHash = hashPassword(password);
      if (isActive !== undefined) updateData.isActive = isActive;

      const permsList: string[] | undefined = Array.isArray(permissions)
        ? permissions
        : Array.isArray(customPermissions)
        ? customPermissions
        : undefined;

      if (permsList !== undefined) {
        updateData.customPermissions = permsList;
      }

      let newRoleEnum = adminToEdit.role;
      if (role) {
        if (role === "superadmin") newRoleEnum = Role.SUPERADMIN;
        else if (role === "calling") newRoleEnum = Role.CALLING_ADMIN;
        else if (role === "event_admin") newRoleEnum = Role.EVENT_ADMIN;
        else newRoleEnum = Role.ADMIN;
        updateData.role = newRoleEnum;
      }

      const updatedUser = await prisma.user.update({
        where: { id: adminId },
        data: updateData,
      });

      let assignedEventNames: string[] = [];
      let newlyAssignedEvents: any[] = [];

      if (Array.isArray(assignedEvents)) {
        const eventIds = assignedEvents.map((item: any) => (typeof item === "string" ? item : item.eventId));
        const existingAssignments = await prisma.adminAssignedEvent.findMany({
          where: { adminId },
          select: { eventId: true },
        });
        const existingIds = existingAssignments.map((a) => a.eventId);
        const newlyAssignedIds = eventIds.filter((id: string) => !existingIds.includes(id));

        await prisma.adminAssignedEvent.deleteMany({ where: { adminId } });
        if (assignedEvents.length > 0) {
          const effectivePerms = permsList !== undefined ? permsList : adminToEdit.customPermissions || [];
          const eventAssignmentsData = assignedEvents.map((item: any) => {
            const eventId = typeof item === "string" ? item : item.eventId;
            const itemPerms = typeof item === "object" && Array.isArray(item.permissions) ? item.permissions : effectivePerms;
            return {
              adminId,
              eventId,
              permissions: itemPerms,
            };
          });

          await prisma.adminAssignedEvent.createMany({
            data: eventAssignmentsData,
            skipDuplicates: true,
          });

          const eventsData = await prisma.event.findMany({
            where: { id: { in: eventIds } },
          });
          assignedEventNames = eventsData.map((e) => e.name);
          newlyAssignedEvents = eventsData.filter((e) => newlyAssignedIds.includes(e.id));
        }
      }

      // Send event assignment email to the admin for newly assigned events
      if (
        updatedUser.email &&
        (updatedUser.role === Role.EVENT_ADMIN || updatedUser.role === Role.CALLING_ADMIN) &&
        newlyAssignedEvents.length > 0
      ) {
        for (const ev of newlyAssignedEvents) {
          sendAdminEventAssignmentEmail({
            adminName: updatedUser.name || updatedUser.username,
            email: updatedUser.email,
            eventName: ev.name,
            eventDate: ev.date,
            eventLocation: ev.location,
            reportingTime: ev.reportingTime,
            workType: ev.workType,
            workersRequired: ev.workersRequired,
            paymentPerStudent: ev.paymentPerStudent,
            instructions: ev.instructions,
            whatsappGroupLink: ev.whatsappGroupLink,
            assignedByAdminName: currentAdmin.name || currentAdmin.username,
          }).catch((err) => console.error("Admin event assignment email dispatch error:", err));
        }
      }

      // Re-send credentials if requested and password or email updated
      if (resendCredentials && updatedUser.email && password) {
        await sendAdminCredentialsEmail({
          adminName: updatedUser.name,
          email: updatedUser.email,
          username: updatedUser.username,
          password,
          role: updatedUser.role,
          assignedEventNames,
        });
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
    if (password && password.trim()) updateOwnData.passwordHash = hashPassword(password);

    await prisma.user.update({
      where: { id: currentAdmin.id },
      data: updateOwnData,
    });

    return NextResponse.json({ success: true, message: "Credentials updated successfully!" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const currentAdmin = await getLoggedInAdmin();
  if (!currentAdmin || currentAdmin.role !== "SUPERADMIN") {
    return NextResponse.json({ success: false, message: "Forbidden. Super Admin access required." }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const adminId = searchParams.get("id");

    if (!adminId) {
      return NextResponse.json({ success: false, message: "Admin ID is required." }, { status: 400 });
    }

    if (adminId === currentAdmin.id) {
      return NextResponse.json({ success: false, message: "You cannot delete your own account." }, { status: 400 });
    }

    await prisma.user.delete({
      where: { id: adminId },
    });

    return NextResponse.json({ success: true, message: "Admin account deleted successfully!" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
