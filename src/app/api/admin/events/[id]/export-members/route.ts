import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import ExcelJS from "exceljs";

export const dynamic = "force-dynamic";

async function getLoggedInAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded || !decoded.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    include: { assignedEvents: { select: { eventId: true, permissions: true } } },
  });
  if (!user || user.isActive === false || !["ADMIN", "SUPERADMIN", "EVENT_ADMIN", "CALLING_ADMIN"].includes(user.role)) return null;
  return user;
}

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const admin = await getLoggedInAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const eventId = params.id;

    if (admin.role === "EVENT_ADMIN") {
      const isAssigned = admin.assignedEvents.some((a) => a.eventId === eventId);
      if (!isAssigned) {
        return NextResponse.json({ success: false, message: "Forbidden. Access denied for this event." }, { status: 403 });
      }
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return NextResponse.json({ success: false, message: "Event not found" }, { status: 404 });
    }

    // Fetch all eligible applications for this event (Under Review, Selected, Confirmed)
    const applications = await prisma.application.findMany({
      where: {
        eventId,
        status: {
          in: ["CONFIRMED", "SELECTED", "UNDER_REVIEW", "APPLIED", "ATTENDED", "PAID"],
        },
      },
      include: {
        user: true,
      },
    });

    // Custom sorting: Confirmed first, Selected second, Under Review third, then alphabetically by name
    const statusPriority: Record<string, number> = {
      CONFIRMED: 1,
      ATTENDED: 1,
      PAID: 1,
      SELECTED: 2,
      UNDER_REVIEW: 3,
      APPLIED: 3,
    };

    const sortedApps = [...applications].sort((a, b) => {
      const prioA = statusPriority[a.status] || 99;
      const prioB = statusPriority[b.status] || 99;
      if (prioA !== prioB) return prioA - prioB;
      const nameA = (a.name || a.user?.name || "").toLowerCase();
      const nameB = (b.name || b.user?.name || "").toLowerCase();
      return nameA.localeCompare(nameB);
    });

    // Compute status counts for summary
    const confirmedCount = sortedApps.filter((a) => ["CONFIRMED", "ATTENDED", "PAID"].includes(a.status)).length;
    const selectedCount = sortedApps.filter((a) => a.status === "SELECTED").length;
    const underReviewCount = sortedApps.filter((a) => ["UNDER_REVIEW", "APPLIED"].includes(a.status)).length;

    // Create ExcelJS Workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Topline Event Management";
    workbook.lastModifiedBy = admin.name || "Topline Admin";
    workbook.created = new Date();
    workbook.modified = new Date();

    const sheetName = (event.name || "Members").replace(/[*?:/\\\[\]]/g, "").slice(0, 30);
    const worksheet = workbook.addWorksheet(sheetName, {
      views: [{ showGridLines: true, state: "frozen", ySplit: 6 }],
    });

    // Format Event Date
    const formattedDate = event.date
      ? new Date(event.date).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "N/A";

    // 1. Title & Event Meta Header Rows (Rows 1-4)
    worksheet.mergeCells("A1:D1");
    const titleCell = worksheet.getCell("A1");
    titleCell.value = "TOPLINE ODC — EVENT MEMBERS LIST";
    titleCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    titleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0F172A" }, // Slate-900
    };
    worksheet.getRow(1).height = 28;

    worksheet.mergeCells("A2:D2");
    const eventNameCell = worksheet.getCell("A2");
    eventNameCell.value = `Event: ${event.name}  |  Location: ${event.location || "N/A"}`;
    eventNameCell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FF334155" } };
    eventNameCell.alignment = { horizontal: "center", vertical: "middle" };
    eventNameCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF1F5F9" }, // Slate-100
    };
    worksheet.getRow(2).height = 22;

    worksheet.mergeCells("A3:D3");
    const metaCell = worksheet.getCell("A3");
    metaCell.value = `Date: ${formattedDate}  |  Reporting: ${event.reportingTime || "N/A"}  |  Category: ${event.workType || "Staff"}`;
    metaCell.font = { name: "Arial", size: 10, italic: true, color: { argb: "FF475569" } };
    metaCell.alignment = { horizontal: "center", vertical: "middle" };
    metaCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF8FAFC" },
    };
    worksheet.getRow(3).height = 20;

    worksheet.mergeCells("A4:D4");
    const summaryCell = worksheet.getCell("A4");
    summaryCell.value = `Total Members: ${sortedApps.length}   •   Confirmed: ${confirmedCount}   •   Selected (Pending RSVP): ${selectedCount}   •   Under Review: ${underReviewCount}`;
    summaryCell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF065F46" } };
    summaryCell.alignment = { horizontal: "center", vertical: "middle" };
    summaryCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFECFDF5" }, // Emerald-50
    };
    worksheet.getRow(4).height = 22;

    // Row 5: Blank separator
    worksheet.getRow(5).height = 8;

    // 2. Table Column Definitions (Row 6)
    worksheet.columns = [
      { key: "sno", width: 8 },
      { key: "name", width: 34 },
      { key: "phone", width: 22 },
      { key: "confirmationStatus", width: 30 },
    ];

    const tableHeaders = ["S.No", "Candidate Name", "Phone Number", "Confirmation Status"];
    const headerRow = worksheet.getRow(6);
    tableHeaders.forEach((headerText, colIdx) => {
      const cell = headerRow.getCell(colIdx + 1);
      cell.value = headerText;
      cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
      cell.alignment = {
        horizontal: colIdx === 1 ? "left" : "center",
        vertical: "middle",
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E293B" }, // Dark Slate
      };
      cell.border = {
        top: { style: "medium", color: { argb: "FF0F172A" } },
        bottom: { style: "medium", color: { argb: "FF0F172A" } },
        left: { style: "thin", color: { argb: "FFCBD5E1" } },
        right: { style: "thin", color: { argb: "FFCBD5E1" } },
      };
    });
    headerRow.height = 26;

    // 3. Add Candidate Rows
    sortedApps.forEach((app, idx) => {
      const rowIdx = idx + 7;
      const row = worksheet.getRow(rowIdx);

      // Student Name
      const studentName = (app.name || app.user?.name || "Unnamed Candidate").trim();

      // Clean Phone Number
      const rawPhone = app.mobileNumber || app.user?.phone || "N/A";
      const cleanPhone = rawPhone.replace(/[^\d+]/g, "").trim() || rawPhone;

      // Status of Confirmation
      let statusDisplay = "Under Review";
      let statusFgColor = "FF92400E"; // Amber-800
      let statusBgColor = "FFFFFBEB"; // Amber-50

      if (app.status === "CONFIRMED") {
        statusDisplay = "CONFIRMED";
        statusFgColor = "FF065F46"; // Emerald-800
        statusBgColor = "FFECFDF5"; // Emerald-50
      } else if (app.status === "ATTENDED") {
        statusDisplay = "CONFIRMED (Attended)";
        statusFgColor = "FF065F46";
        statusBgColor = "FFECFDF5";
      } else if (app.status === "PAID") {
        statusDisplay = "CONFIRMED (Paid)";
        statusFgColor = "FF065F46";
        statusBgColor = "FFECFDF5";
      } else if (app.status === "SELECTED") {
        statusDisplay = "SELECTED (Pending RSVP)";
        statusFgColor = "FF1E40AF"; // Blue-800
        statusBgColor = "FFEFF6FF"; // Blue-50
      } else if (app.status === "APPLIED") {
        statusDisplay = "UNDER REVIEW (Applied)";
        statusFgColor = "FF92400E";
        statusBgColor = "FFFFFBEB";
      } else if (app.status === "UNDER_REVIEW") {
        statusDisplay = "UNDER REVIEW";
        statusFgColor = "FF92400E";
        statusBgColor = "FFFFFBEB";
      }

      // Populate row cells
      // S.No
      const c1 = row.getCell(1);
      c1.value = idx + 1;
      c1.alignment = { horizontal: "center", vertical: "middle" };
      c1.font = { name: "Arial", size: 10, color: { argb: "FF475569" } };

      // Candidate Name
      const c2 = row.getCell(2);
      c2.value = studentName;
      c2.alignment = { horizontal: "left", vertical: "middle" };
      c2.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF0F172A" } };

      // Phone Number (Formatted as text so leading zeros or 10-digits are never corrupted by Excel)
      const c3 = row.getCell(3);
      c3.value = cleanPhone;
      c3.numFmt = "@";
      c3.alignment = { horizontal: "center", vertical: "middle" };
      c3.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF334155" } };

      // Status of Confirmation
      const c4 = row.getCell(4);
      c4.value = statusDisplay;
      c4.alignment = { horizontal: "center", vertical: "middle" };
      c4.font = { name: "Arial", size: 10, bold: true, color: { argb: statusFgColor } };
      c4.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: statusBgColor },
      };

      // Set alternating background for columns 1-3
      const isEven = idx % 2 === 0;
      const baseRowBg = isEven ? "FFFFFFFF" : "FFF8FAFC";
      [c1, c2, c3].forEach((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: baseRowBg },
        };
      });

      // Borders
      [c1, c2, c3, c4].forEach((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
      });

      row.height = 24;
    });

    // Generate binary buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Clean filename
    const safeEventName = (event.name || "Event")
      .replace(/[^a-zA-Z0-9_\- ]/g, "")
      .trim()
      .replace(/\s+/g, "_");
    const filename = `${safeEventName}_Members_List.xlsx`;

    return new Response(buffer as any, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error: any) {
    console.error("Export Members Excel Error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
