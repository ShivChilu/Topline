import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { AttendanceStatus, ApplicationStatus, PaymentStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

async function getLoggedInAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded || !decoded.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
  });
  if (!user || user.isActive === false || !["ADMIN", "SUPERADMIN", "EVENT_ADMIN"].includes(user.role)) return null;
  return user;
}

export interface ClientCustomRoleBilling {
  id: string;
  roleName: string;
  headcount: number;
  ratePerPerson: number;
  totalAmount: number;
}

export interface EventFinanceData {
  billingMode?: "LUMP_SUM" | "ITEMIZED";
  clientRevenue: number;
  clientStewardRate?: number;
  clientCaptainRate?: number;
  clientVehiclesCount?: number;
  clientVehicleRate?: number;
  clientTravelBilling?: number;
  clientCustomRoles?: ClientCustomRoleBilling[];
  clientPaymentStatus: "PAID" | "PARTIAL" | "PENDING";
  clientInvoiceRef?: string;
  clientNotes?: string;
  defaultWorkerPayout: number;
  travelVehiclesCount?: number;
  travelCostPerVehicle?: number;
  travelExpenses: number;
  travelNotes?: string;
  foodExpenses: number;
  foodNotes?: string;
  miscExpenses: Array<{ id: string; label: string; amount: number }>;
  captains: Array<{
    id: string; // userId
    name: string;
    phone?: string;
    registrationNumber?: string;
    upiId?: string;
    gender?: string;
    role?: string;
    roleTitle: string;
    payoutAmount: number;
    paymentStatus: "PAID" | "UNPAID";
    paidReference?: string;
    retainInProfit?: boolean;
  }>;
  workerOverrides: Record<
    string,
    {
      payoutAmount: number;
      paymentStatus: "PAID" | "UNPAID";
      paidReference?: string;
      notes?: string;
    }
  >;
}

export async function GET(request: Request) {
  try {
    const admin = await getLoggedInAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    // 1. Fetch all events with related attendees and clients
    const events = await prisma.event.findMany({
      include: {
        client: {
          select: {
            id: true,
            name: true,
            contactPerson: true,
            phone: true,
            email: true,
          },
        },
        applications: {
          where: {
            OR: [
              { status: { in: [ApplicationStatus.ATTENDED, ApplicationStatus.CONFIRMED, ApplicationStatus.SELECTED] } },
              { attendance: { attendanceStatus: { in: [AttendanceStatus.PRESENT, AttendanceStatus.LATE] } } },
            ],
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                registrationNumber: true,
                university: true,
                upiId: true,
                gender: true,
                role: true,
              },
            },
            attendance: {
              select: {
                attendanceStatus: true,
                checkInTime: true,
                checkOutTime: true,
                manualRemarks: true,
              },
            },
          },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { date: "desc" },
    });

    // 2. Fetch all saved event finance configs from Settings table
    const financeSettings = await prisma.setting.findMany({
      where: {
        key: { startsWith: "event_finance_" },
      },
    });

    const financeMap = new Map<string, EventFinanceData>();
    financeSettings.forEach((s) => {
      const eventId = s.key.replace("event_finance_", "");
      financeMap.set(eventId, s.value as unknown as EventFinanceData);
    });

    // 3. Fetch Master User list (including SuperAdmins and Admins) for Captain selector
    const masterStudents = await prisma.user.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        registrationNumber: true,
        university: true,
        upiId: true,
        selectionStatus: true,
        gender: true,
        role: true,
      },
      orderBy: [
        { role: "desc" },
        { name: "asc" },
      ],
    });

    // 4. Transform and calculate metrics per event
    let totalAllRevenue = 0;
    let totalAllWorkerPayouts = 0;
    let totalAllCaptainPayouts = 0;
    let totalAllTravel = 0;
    let totalAllFoodMisc = 0;
    let totalAllExpenses = 0;
    let totalAllProfit = 0;
    let totalAllPresentees = 0;

    const eventSheets = events.map((ev) => {
      const savedFinance: EventFinanceData = financeMap.get(ev.id) || {
        billingMode: "ITEMIZED",
        clientRevenue: ev.clientRevenue || 0,
        clientStewardRate: (ev.paymentPerStudent || 500) + 200,
        clientCaptainRate: 1500,
        clientVehiclesCount: 1,
        clientVehicleRate: 2000,
        clientTravelBilling: 2000,
        clientCustomRoles: [],
        clientPaymentStatus: "PENDING",
        clientInvoiceRef: "",
        clientNotes: "",
        defaultWorkerPayout: ev.paymentPerStudent || 500,
        travelVehiclesCount: 1,
        travelCostPerVehicle: 1500,
        travelExpenses: 0,
        travelNotes: "",
        foodExpenses: 0,
        foodNotes: "",
        miscExpenses: [],
        captains: [],
        workerOverrides: {},
      };

      // Extract verified presentees
      const presentWorkers = ev.applications
        .filter((app) => {
          const isAttended = app.status === ApplicationStatus.ATTENDED;
          const isPresent =
            app.attendance &&
            (app.attendance.attendanceStatus === AttendanceStatus.PRESENT ||
              app.attendance.attendanceStatus === AttendanceStatus.LATE);
          return isAttended || isPresent;
        })
        .map((app) => {
          const override = savedFinance.workerOverrides?.[app.id] || savedFinance.workerOverrides?.[app.userId] || null;
          const assignedPayout = override?.payoutAmount !== undefined ? override.payoutAmount : savedFinance.defaultWorkerPayout;
          const isPaid = override?.paymentStatus ? override.paymentStatus === "PAID" : app.paymentStatus === PaymentStatus.PAID;

          return {
            applicationId: app.id,
            userId: app.userId,
            name: app.name || app.user?.name || "Student",
            phone: app.mobileNumber || app.user?.phone || "N/A",
            email: app.user?.email || "N/A",
            registrationNumber: app.registrationNumber || app.user?.registrationNumber || "N/A",
            university: app.user?.university || "N/A",
            upiId: app.user?.upiId || "Not Provided",
            gender: app.user?.gender || "N/A",
            attendanceStatus: app.attendance?.attendanceStatus || "PRESENT",
            checkInTime: app.attendance?.checkInTime || null,
            payoutAmount: assignedPayout,
            paymentStatus: isPaid ? ("PAID" as const) : ("UNPAID" as const),
            paidReference: override?.paidReference || "",
            notes: override?.notes || "",
          };
        });

      // Calculate Event Financial Sums
      const effectiveRevenue = savedFinance.clientRevenue || ev.clientRevenue || 0;      // P&L Logic: External crew payouts are direct cash outflows.
      // Super Admin / Founder captain payouts are retained directly in Net Profit (no cash outflow to third-party crew).
      const totalWorkerPayouts = presentWorkers.reduce((sum, w) => sum + (Number(w.payoutAmount) || 0), 0);
      const externalCaptainPayouts = (savedFinance.captains || [])
        .filter((c) => !c.retainInProfit && c.role !== "SUPERADMIN")
        .reduce((sum, c) => sum + (Number(c.payoutAmount) || 0), 0);
      const superAdminRetainedCaptainProfit = (savedFinance.captains || [])
        .filter((c) => !!c.retainInProfit || c.role === "SUPERADMIN")
        .reduce((sum, c) => sum + (Number(c.payoutAmount) || 0), 0);
      const totalCaptainPayouts = (savedFinance.captains || []).reduce((sum, c) => sum + (Number(c.payoutAmount) || 0), 0);
      const travelExp = Number(savedFinance.travelExpenses) || 0;
      const foodExp = Number(savedFinance.foodExpenses) || 0;
      const miscExp = (savedFinance.miscExpenses || []).reduce((sum, m) => sum + (Number(m.amount) || 0), 0);

      const totalDirectExpenses = totalWorkerPayouts + externalCaptainPayouts + travelExp + foodExp + miscExp;
      const netProfit = effectiveRevenue - totalDirectExpenses;
      const profitMarginPct = effectiveRevenue > 0 ? (netProfit / effectiveRevenue) * 100 : 0;
      const isAttendanceClosed = !ev.attendanceTokenEnabled || ["CLOSED", "COMPLETED"].includes(ev.status);

      // Aggregate global KPI sums
      if (presentWorkers.length > 0 || effectiveRevenue > 0) {
        totalAllRevenue += effectiveRevenue;
        totalAllWorkerPayouts += totalWorkerPayouts;
        totalAllCaptainPayouts += externalCaptainPayouts;
        totalAllTravel += travelExp;
        totalAllFoodMisc += foodExp + miscExp;
        totalAllExpenses += totalDirectExpenses;
        totalAllProfit += netProfit;
        totalAllPresentees += presentWorkers.length;
      }

      return {
        id: ev.id,
        name: ev.name,
        date: ev.date,
        location: ev.location,
        workType: ev.workType,
        workersRequired: ev.workersRequired,
        client: ev.client,
        status: ev.status,
        attendanceTokenEnabled: ev.attendanceTokenEnabled,
        isAttendanceClosed,
        presentCount: presentWorkers.length,
        presentWorkers,
        financials: {
          billingMode: savedFinance.billingMode || "ITEMIZED",
          clientRevenue: effectiveRevenue,
          clientStewardRate: savedFinance.clientStewardRate !== undefined ? savedFinance.clientStewardRate : (ev.paymentPerStudent || 500) + 200,
          clientCaptainRate: savedFinance.clientCaptainRate !== undefined ? savedFinance.clientCaptainRate : 1500,
          clientVehiclesCount: savedFinance.clientVehiclesCount !== undefined ? savedFinance.clientVehiclesCount : 1,
          clientVehicleRate: savedFinance.clientVehicleRate !== undefined ? savedFinance.clientVehicleRate : 2000,
          clientTravelBilling: savedFinance.clientTravelBilling !== undefined ? savedFinance.clientTravelBilling : 2000,
          clientCustomRoles: savedFinance.clientCustomRoles || [],
          clientPaymentStatus: savedFinance.clientPaymentStatus || "PENDING",
          clientInvoiceRef: savedFinance.clientInvoiceRef || "",
          clientNotes: savedFinance.clientNotes || "",
          defaultWorkerPayout: savedFinance.defaultWorkerPayout,
          totalWorkerPayouts,
          captains: savedFinance.captains || [],
          totalCaptainPayouts,
          travelVehiclesCount: savedFinance.travelVehiclesCount !== undefined ? savedFinance.travelVehiclesCount : 1,
          travelCostPerVehicle: savedFinance.travelCostPerVehicle !== undefined ? savedFinance.travelCostPerVehicle : 1500,
          travelExpenses: travelExp,
          travelNotes: savedFinance.travelNotes || "",
          foodExpenses: foodExp,
          foodNotes: savedFinance.foodNotes || "",
          miscExpenses: savedFinance.miscExpenses || [],
          totalDirectExpenses,
          netProfit,
          profitMarginPct: Number(profitMarginPct.toFixed(1)),
          costPerWorker: presentWorkers.length > 0 ? Math.round(totalDirectExpenses / presentWorkers.length) : 0,
          revenuePerWorker: presentWorkers.length > 0 ? Math.round(effectiveRevenue / presentWorkers.length) : 0,
        },
      };
    });

    const overallMargin = totalAllRevenue > 0 ? (totalAllProfit / totalAllRevenue) * 100 : 0;

    return NextResponse.json({
      success: true,
      metrics: {
        totalEventsCount: eventSheets.length,
        closedEventsCount: eventSheets.filter((e) => e.isAttendanceClosed && e.presentCount > 0).length,
        totalRevenue: totalAllRevenue,
        totalWorkerPayouts: totalAllWorkerPayouts,
        totalCaptainPayouts: totalAllCaptainPayouts,
        totalTravelExpenses: totalAllTravel,
        totalFoodMiscExpenses: totalAllFoodMisc,
        totalExpenses: totalAllExpenses,
        netProfit: totalAllProfit,
        profitMarginPct: Number(overallMargin.toFixed(1)),
        totalPresentWorkersCount: totalAllPresentees,
      },
      events: eventSheets,
      masterStudents,
    });
  } catch (error: any) {
    console.error("Admin Payments GET Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await getLoggedInAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { eventId, financeData } = body;

    if (!eventId || typeof eventId !== "string") {
      return NextResponse.json({ success: false, message: "Missing eventId." }, { status: 400 });
    }

    if (!financeData || typeof financeData !== "object") {
      return NextResponse.json({ success: false, message: "Invalid financeData payload." }, { status: 400 });
    }

    const clientRevNum = Math.max(0, Number(financeData.clientRevenue) || 0);
    const defaultWageNum = Math.max(0, Number(financeData.defaultWorkerPayout) || 500);
    const otherExpNum =
      (Number(financeData.travelExpenses) || 0) +
      (Number(financeData.foodExpenses) || 0) +
      ((financeData.miscExpenses || []).reduce((sum: number, m: any) => sum + (Number(m.amount) || 0), 0));

    // 1. Update core Event record
    await prisma.event.update({
      where: { id: eventId },
      data: {
        clientRevenue: clientRevNum,
        paymentPerStudent: defaultWageNum,
        otherExpenses: otherExpNum,
      },
    });

    // 2. Upsert structured finance configuration in Setting
    const settingKey = `event_finance_${eventId}`;
    await prisma.setting.upsert({
      where: { key: settingKey },
      update: {
        value: financeData,
      },
      create: {
        key: settingKey,
        value: financeData,
      },
    });

    // 3. Synchronize individual Application payment overrides & statuses if provided
    if (financeData.workerOverrides && typeof financeData.workerOverrides === "object") {
      const updates = Object.entries(financeData.workerOverrides).map(([appOrUserId, ov]: [string, any]) => {
        return prisma.application
          .updateMany({
            where: {
              eventId,
              OR: [{ id: appOrUserId }, { userId: appOrUserId }],
            },
            data: {
              paymentOverride: ov.payoutAmount !== undefined ? Number(ov.payoutAmount) : undefined,
              paymentStatus: ov.paymentStatus === "PAID" ? PaymentStatus.PAID : PaymentStatus.UNPAID,
            },
          })
          .catch((err) => console.warn(`Failed to update application ${appOrUserId}:`, err));
      });
      await Promise.all(updates);
    }

    // 4. Synchronize Captain & Specialized Staff assignments to their individual Profile history
    if (Array.isArray(financeData.captains)) {
      for (const cap of financeData.captains) {
        if (!cap.id) continue;
        try {
          const studentUser = await prisma.user.findUnique({
            where: { id: cap.id },
            select: { id: true, name: true, phone: true, registrationNumber: true },
          });
          if (!studentUser) continue;

          const roleRemarks = `Assigned Role: ${cap.roleTitle || "Event Lead Captain"}`;
          const paymentStatusVal = cap.paymentStatus === "PAID" ? PaymentStatus.PAID : PaymentStatus.UNPAID;
          const payoutOverrideVal = Number(cap.payoutAmount) || 0;

          const existingApp = await prisma.application.findUnique({
            where: {
              eventId_userId: {
                eventId,
                userId: studentUser.id,
              },
            },
          });

          if (existingApp) {
            await prisma.application.update({
              where: { id: existingApp.id },
              data: {
                paymentOverride: payoutOverrideVal,
                paymentStatus: paymentStatusVal,
                callingRemarks: roleRemarks,
                status: ApplicationStatus.ATTENDED,
              },
            });

            const regNo = studentUser.registrationNumber || cap.registrationNumber || "N/A";

            await prisma.attendance.upsert({
              where: { applicationId: existingApp.id },
              update: {
                attendanceStatus: AttendanceStatus.PRESENT,
                manualRemarks: roleRemarks,
              },
              create: {
                applicationId: existingApp.id,
                eventId,
                userId: studentUser.id,
                registrationNumber: regNo,
                attendanceStatus: AttendanceStatus.PRESENT,
                manualRemarks: roleRemarks,
              },
            });
          } else {
            const regNo = studentUser.registrationNumber || cap.registrationNumber || "N/A";
            await prisma.application.create({
              data: {
                eventId,
                userId: studentUser.id,
                name: studentUser.name || cap.name,
                mobileNumber: studentUser.phone || cap.phone || "N/A",
                registrationNumber: regNo,
                status: ApplicationStatus.ATTENDED,
                paymentStatus: paymentStatusVal,
                paymentOverride: payoutOverrideVal,
                callingRemarks: roleRemarks,
                attendance: {
                  create: {
                    eventId,
                    userId: studentUser.id,
                    registrationNumber: regNo,
                    attendanceStatus: AttendanceStatus.PRESENT,
                    manualRemarks: roleRemarks,
                  },
                },
              },
            });
          }
        } catch (capErr) {
          console.warn(`Failed to synchronize captain role for user ${cap.id}:`, capErr);
        }
      }
    }

    // 5. Record audit log
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: "UPDATE_EVENT_FINANCIALS",
        target: eventId,
        metadata: {
          clientRevenue: clientRevNum,
          defaultWorkerPayout: defaultWageNum,
          totalExpenses: otherExpNum,
          captainsCount: (financeData.captains || []).length,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Event financials & P&L sheet successfully saved.",
    });
  } catch (error: any) {
    console.error("Admin Payments POST Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Internal server error" }, { status: 500 });
  }
}
