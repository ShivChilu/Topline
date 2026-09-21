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

    // Fetch all eligible applications for this event with candidate user details and attendance
    const applications = await prisma.application.findMany({
      where: {
        eventId,
        status: { in: ["CONFIRMED", "ATTENDED", "ABSENT", "SELECTED", "PAID"] },
      },
      include: {
        user: true,
        attendance: true,
      },
      orderBy: [
        { createdAt: "asc" },
      ],
    });

    // Create ExcelJS Workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Topline Event Management";
    workbook.lastModifiedBy = admin.name || "Topline Admin";
    workbook.created = new Date();
    workbook.modified = new Date();

    const sheetName = (event.name || "Attendance").replace(/[*?:/\\\[\]]/g, "").slice(0, 30);
    const worksheet = workbook.addWorksheet(sheetName, {
      views: [{ showGridLines: true, state: "frozen", ySplit: 1 }],
    });

    // Column Definitions: Exactly 4 requested columns
    worksheet.columns = [
      { header: "S.No", key: "sno", width: 10 },
      { header: "Registration Number", key: "regNo", width: 24 },
      { header: "Candidate Full Name", key: "name", width: 34 },
      { header: "Payment Status", key: "paymentStatus", width: 22 },
    ];

    // Style Header Row (Row 1)
    const headerRow = worksheet.getRow(1);
    headerRow.height = 30;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0F172A" }, // Dark Slate 900
      };
      cell.font = {
        name: "Calibri",
        size: 11,
        bold: true,
        color: { argb: "FFFFFFFF" }, // White
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: "center",
        wrapText: true,
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FF334155" } },
        bottom: { style: "medium", color: { argb: "FF000000" } },
        left: { style: "thin", color: { argb: "FF334155" } },
        right: { style: "thin", color: { argb: "FF334155" } },
      };
    });

    // Populate Data Rows
    applications.forEach((app, index) => {
      const student = app.user;
      const resolvedName = app.name || student?.name || `Student ${app.registrationNumber || "N/A"}`;
      const resolvedRegNo = (app.registrationNumber || student?.registrationNumber || "N/A").trim();
      const initialPaymentStatus = app.paymentStatus === "PAID" ? "PAID" : "PENDING";

      const row = worksheet.addRow({
        sno: index + 1,
        regNo: resolvedRegNo,
        name: resolvedName,
        paymentStatus: initialPaymentStatus,
      });

      row.height = 26;

      // Base cell styling
      row.eachCell((cell, colNumber) => {
        cell.font = { name: "Calibri", size: 11 };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };

        // Alignments
        if (colNumber === 1 || colNumber === 2 || colNumber === 4) {
          cell.alignment = { vertical: "middle", horizontal: "center" };
        } else {
          cell.alignment = { vertical: "middle", horizontal: "left" };
        }
      });

      // Add In-Cell Dropdown Data Validation for Payment Status Column (Column 4 / D)
      const paymentCell = row.getCell(4);
      paymentCell.dataValidation = {
        type: "list",
        allowBlank: false,
        formulae: ['"PENDING,PAID"'],
        showErrorMessage: true,
        errorTitle: "Invalid Payment Status",
        error: "Please select either PENDING or PAID from the dropdown list.",
      };
    });

    const totalRows = applications.length;
    const lastRowIndex = Math.max(2, totalRows + 1);

    // Conditional Formatting Rules:
    // When Payment Status (Column D) is "PENDING" -> whole row (A-D) is soft red/rose (#FFE2E5)
    // When Payment Status (Column D) is "PAID" -> whole row (A-D) is soft green/emerald (#DCFCE7)
    if (totalRows > 0) {
      worksheet.addConditionalFormatting({
        ref: `A2:D${lastRowIndex}`,
        rules: [
          {
            priority: 1,
            type: "expression",
            formulae: [`$D2="PENDING"`],
            style: {
              fill: {
                type: "pattern",
                pattern: "solid",
                bgColor: { argb: "FFFFE2E5" },
                fgColor: { argb: "FFFFE2E5" },
              },
              font: {
                color: { argb: "FF991B1B" }, // Red text
                bold: true,
              },
            },
          },
          {
            priority: 2,
            type: "expression",
            formulae: [`$D2="PAID"`],
            style: {
              fill: {
                type: "pattern",
                pattern: "solid",
                bgColor: { argb: "FFDCFCE7" },
                fgColor: { argb: "FFDCFCE7" },
              },
              font: {
                color: { argb: "FF166534" }, // Green text
                bold: true,
              },
            },
          },
        ],
      });
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    const cleanEventName = (event.name || "Event").replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `Topline_Attendance_${cleanEventName}_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error("Export attendance sheet error:", error);
    return NextResponse.json({ success: false, message: error.message || "Failed to export spreadsheet." }, { status: 500 });
  }
}
