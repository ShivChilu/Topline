import { prisma } from "@/lib/prisma";
import {
  Users,
  CalendarCheck,
  TrendingUp,
  Banknote,
  DollarSign,
  Percent,
  Layers,
  ArrowUpRight
} from "lucide-react";
import Link from "next/link";

export const revalidate = 0; // Fresh stats on reload

function formatTime12(timeStr: string) {
  if (!timeStr) return "";
  const parts = timeStr.split(":");
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  if (isNaN(hours)) return timeStr;
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strHours = hours < 10 ? "0" + hours : hours;
  return `${strHours}:${minutes} ${ampm}`;
}

export default async function AdminDashboardPage() {
  let stats = {
    totalStudents: 0,
    totalEvents: 0,
    openForms: 0,
    totalApplications: 0,
    selectedStudents: 0,
    completedEvents: 0,
  };

  let finances = {
    revenue: 0,
    workerPayments: 0,
    expenses: 0,
    profit: 0,
    margin: 0,
  };

  let upcomingEvents: any[] = [];

  try {
    // 1. Overview counts
    stats.totalStudents = await prisma.user.count({ where: { role: "USER" } });
    stats.totalEvents = await prisma.event.count();
    stats.openForms = await prisma.event.count({ where: { status: "OPEN" } });
    stats.totalApplications = await prisma.application.count();
    stats.selectedStudents = await prisma.application.count({ where: { status: "SELECTED" } });
    stats.completedEvents = await prisma.event.count({ where: { status: "COMPLETED" } });

    // 2. Load events to calculate finances (exclude DRAFT events)
    const activeEvents = await prisma.event.findMany({
      where: { status: { not: "DRAFT" } },
    });

    // Calculate worker payouts by querying applications with positive statuses
    const applications = await prisma.application.findMany({
      include: { event: true },
    });

    let totalWorkerPayments = 0;
    applications.forEach((app) => {
      if (app.event && ["SELECTED", "CONFIRMED", "ATTENDED", "PAID"].includes(app.status)) {
        totalWorkerPayments += app.paymentOverride ?? app.event.paymentPerStudent ?? 0;
      }
    });

    let totalRevenue = 0;
    let totalOtherExpenses = 0;

    activeEvents.forEach((ev) => {
      totalRevenue += ev.clientRevenue || 0;
      totalOtherExpenses += ev.otherExpenses || 0;
    });

    finances.revenue = totalRevenue;
    finances.workerPayments = totalWorkerPayments;
    finances.expenses = totalOtherExpenses;
    finances.profit = totalRevenue - totalWorkerPayments - totalOtherExpenses;
    finances.margin = totalRevenue > 0 ? Math.round((finances.profit / totalRevenue) * 100) : 0;

    // 3. Get upcoming events
    upcomingEvents = await prisma.event.findMany({
      where: { status: { in: ["OPEN", "FULL", "CLOSED"] } },
      orderBy: { date: "asc" },
      take: 5,
    });
  } catch (error) {
    console.error("Dashboard DB fetch error:", error);
  }

  const kpis = [
    { name: "Total Students", value: stats.totalStudents, icon: <Users className="w-5 h-5 text-red-600" /> },
    { name: "Open Forms", value: stats.openForms, icon: <CalendarCheck className="w-5 h-5 text-emerald-500" /> },
    { name: "Total Applications", value: stats.totalApplications, icon: <Layers className="w-5 h-5 text-sky-500" /> },
    { name: "Completed Events", value: stats.completedEvents, icon: <TrendingUp className="w-5 h-5 text-purple-500" /> },
  ];

  return (
    <div className="space-y-8 text-slate-900">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-wider text-red-600 uppercase">
          Business Overview
        </h1>
        <p className="text-slate-500 text-sm mt-1">Real-time catering recruitment operations and financial performance</p>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-450 font-semibold uppercase tracking-wider">{kpi.name}</p>
              <h3 className="text-3xl font-bold mt-2">{kpi.value}</h3>
            </div>
            <div className="w-10 h-10 bg-slate-100/50 rounded-lg flex items-center justify-center border border-slate-200">
              {kpi.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Financial Section */}
      <div className="bg-white p-8 rounded-xl border border-slate-200 space-y-6">
        <h2 className="text-xl font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-3 flex items-center space-x-2">
          <Banknote className="text-red-600" />
          <span>Financial Performance Summary</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="p-4 bg-gray-850/20 rounded-lg border border-slate-200">
            <p className="text-xs text-slate-450 font-semibold uppercase">Client Revenue</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">₹{finances.revenue.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-gray-850/20 rounded-lg border border-slate-200">
            <p className="text-xs text-slate-450 font-semibold uppercase">Worker Payouts</p>
            <p className="text-2xl font-bold text-red-400 mt-1">₹{finances.workerPayments.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-gray-850/20 rounded-lg border border-slate-200">
            <p className="text-xs text-slate-450 font-semibold uppercase">Other Expenses</p>
            <p className="text-2xl font-bold text-red-400 mt-1">₹{finances.expenses.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-emerald-950/20 rounded-lg border border-emerald-900/30">
            <p className="text-xs text-emerald-500 font-semibold uppercase">Net Profit</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">₹{finances.profit.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-red-600/10 rounded-lg border border-red-600/20">
            <p className="text-xs text-red-600 font-semibold uppercase">Profit Margin</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{finances.margin}%</p>
          </div>
        </div>
      </div>

      {/* Upcoming Events / Operations Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Events table */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wider">Active Staffing Queue</h3>
            <Link href="/admin/events" className="text-red-600 hover:underline text-xs flex items-center space-x-1">
              <span>All Events</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {upcomingEvents.length === 0 ? (
            <p className="text-slate-450 text-sm text-center py-6">No events in queue.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="text-slate-450 border-b border-slate-200 uppercase text-xs">
                    <th className="pb-3">Event Name</th>
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Reporting</th>
                    <th className="pb-3 text-center">Applications</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-850">
                  {upcomingEvents.map((ev) => (
                    <tr key={ev.id} className="hover:bg-slate-100/20 transition">
                      <td className="py-3 font-bold text-slate-900">
                        <Link href={`/admin/events/${ev.id}`} className="hover:text-red-600">
                          {ev.name}
                        </Link>
                      </td>
                      <td className="py-3 text-slate-500">{new Date(ev.date).toLocaleDateString("en-GB")}</td>
                      <td className="py-3 text-slate-500">{formatTime12(ev.reportingTime)}</td>
                      <td className="py-3 text-center font-semibold text-slate-650">
                        {ev.applicationsCount} / {ev.maxApplications}
                      </td>
                      <td className="py-3">
                        <span className="bg-red-600/10 text-red-600 border border-red-600/20 px-2 py-0.5 rounded text-xs uppercase font-bold">
                          {ev.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column: Quick Admin Tools */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
          <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-3">Quick Actions</h3>
          <div className="grid grid-cols-1 gap-3">
            <Link
              href="/admin/events/create"
              className="bg-red-600 hover:bg-red-700 text-white font-bold p-3 rounded-lg text-center text-sm transition"
            >
              Create New Event
            </Link>
            <Link
              href="/admin/applications"
              className="bg-slate-50 hover:bg-slate-100 text-slate-900 font-bold p-3 rounded-lg text-center text-sm border border-slate-200 transition"
            >
              Review Pending Applications
            </Link>
            <Link
              href="/admin/students"
              className="bg-slate-50 hover:bg-slate-100 text-slate-900 font-bold p-3 rounded-lg text-center text-sm border border-slate-200 transition"
            >
              Search Student Profiles
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
