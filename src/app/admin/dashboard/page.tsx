import { connectToDatabase } from "@/lib/db";
import { Student, Event, Application } from "@/models";
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
    await connectToDatabase();

    // 1. Overview counts
    stats.totalStudents = await Student.countDocuments();
    stats.totalEvents = await Event.countDocuments();
    stats.openForms = await Event.countDocuments({ status: "OPEN" });
    stats.totalApplications = await Application.countDocuments();
    stats.selectedStudents = await Application.countDocuments({ status: "selected" });
    stats.completedEvents = await Event.countDocuments({ status: "COMPLETED" });

    // 2. Load events to calculate finances (exclude DRAFT events)
    const activeEvents = await Event.find({ status: { $ne: "DRAFT" } }).lean();
    
    // Calculate worker payouts by querying applications with positive statuses
    const applications = await Application.find().populate('eventId').lean();
    
    let totalWorkerPayments = 0;
    applications.forEach((app: any) => {
      if (app.eventId && ["selected", "confirmed", "attended", "paid"].includes(app.status)) {
        // use override or event standard payment
        totalWorkerPayments += app.paymentOverride ?? app.eventId.paymentPerStudent ?? 0;
      }
    });

    let totalRevenue = 0;
    let totalOtherExpenses = 0;

    activeEvents.forEach((ev: any) => {
      totalRevenue += ev.clientRevenue || 0;
      totalOtherExpenses += ev.otherExpenses || 0;
    });

    finances.revenue = totalRevenue;
    finances.workerPayments = totalWorkerPayments;
    finances.expenses = totalOtherExpenses;
    finances.profit = totalRevenue - totalWorkerPayments - totalOtherExpenses;
    finances.margin = totalRevenue > 0 ? Math.round((finances.profit / totalRevenue) * 100) : 0;

    // 3. Get upcoming events
    upcomingEvents = await Event.find({ status: { $in: ["OPEN", "FULL", "CLOSED"] } })
      .sort({ date: 1 })
      .limit(5)
      .lean();

  } catch (error) {
    console.error("Dashboard DB fetch error:", error);
  }

  const kpis = [
    { name: "Total Students", value: stats.totalStudents, icon: <Users className="w-5 h-5 text-amber-500" /> },
    { name: "Open Forms", value: stats.openForms, icon: <CalendarCheck className="w-5 h-5 text-emerald-500" /> },
    { name: "Total Applications", value: stats.totalApplications, icon: <Layers className="w-5 h-5 text-sky-500" /> },
    { name: "Completed Events", value: stats.completedEvents, icon: <TrendingUp className="w-5 h-5 text-purple-500" /> },
  ];

  return (
    <div className="space-y-8 text-white">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-wider text-amber-500 uppercase">
          Business Overview
        </h1>
        <p className="text-gray-400 text-sm mt-1">Real-time catering recruitment operations and financial performance</p>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="bg-[#0c0d12] p-6 rounded-xl border border-gray-800 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">{kpi.name}</p>
              <h3 className="text-3xl font-bold mt-2">{kpi.value}</h3>
            </div>
            <div className="w-10 h-10 bg-gray-800/50 rounded-lg flex items-center justify-center border border-gray-800">
              {kpi.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Financial Section */}
      <div className="bg-[#0c0d12] p-8 rounded-xl border border-gray-800 space-y-6">
        <h2 className="text-xl font-bold text-white uppercase tracking-wider border-b border-gray-800 pb-3 flex items-center space-x-2">
          <Banknote className="text-amber-500" />
          <span>Financial Performance Summary</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="p-4 bg-gray-850/20 rounded-lg border border-gray-850">
            <p className="text-xs text-gray-500 font-semibold uppercase">Client Revenue</p>
            <p className="text-2xl font-bold text-white mt-1">₹{finances.revenue.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-gray-850/20 rounded-lg border border-gray-850">
            <p className="text-xs text-gray-500 font-semibold uppercase">Worker Payouts</p>
            <p className="text-2xl font-bold text-rose-400 mt-1">₹{finances.workerPayments.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-gray-850/20 rounded-lg border border-gray-850">
            <p className="text-xs text-gray-500 font-semibold uppercase">Other Expenses</p>
            <p className="text-2xl font-bold text-rose-400 mt-1">₹{finances.expenses.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-emerald-950/20 rounded-lg border border-emerald-900/30">
            <p className="text-xs text-emerald-500 font-semibold uppercase">Net Profit</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">₹{finances.profit.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
            <p className="text-xs text-amber-500 font-semibold uppercase">Profit Margin</p>
            <p className="text-2xl font-bold text-amber-500 mt-1">{finances.margin}%</p>
          </div>
        </div>
      </div>

      {/* Upcoming Events / Operations Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Events table */}
        <div className="lg:col-span-2 bg-[#0c0d12] p-6 rounded-xl border border-gray-800 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-800 pb-3">
            <h3 className="text-lg font-bold text-white uppercase tracking-wider">Active Staffing Queue</h3>
            <Link href="/admin/events" className="text-amber-500 hover:underline text-xs flex items-center space-x-1">
              <span>All Events</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {upcomingEvents.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-6">No events in queue.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-850 uppercase text-xs">
                    <th className="pb-3">Event Name</th>
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Reporting</th>
                    <th className="pb-3 text-center">Applications</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-850">
                  {upcomingEvents.map((ev) => (
                    <tr key={ev._id.toString()} className="hover:bg-gray-800/20 transition">
                      <td className="py-3 font-bold text-white">
                        <Link href={`/admin/events/${ev._id}`} className="hover:text-amber-500">
                          {ev.name}
                        </Link>
                      </td>
                      <td className="py-3 text-gray-400">{new Date(ev.date).toLocaleDateString("en-GB")}</td>
                      <td className="py-3 text-gray-400">{ev.reportingTime}</td>
                      <td className="py-3 text-center font-semibold text-gray-300">
                        {ev.applicationsCount} / {ev.maxApplications}
                      </td>
                      <td className="py-3">
                        <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded text-xs uppercase font-bold">
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
        <div className="bg-[#0c0d12] p-6 rounded-xl border border-gray-800 space-y-4">
          <h3 className="text-lg font-bold text-white uppercase tracking-wider border-b border-gray-800 pb-3">Quick Actions</h3>
          <div className="grid grid-cols-1 gap-3">
            <Link
              href="/admin/events/create"
              className="bg-amber-500 hover:bg-amber-600 text-black font-bold p-3 rounded-lg text-center text-sm transition"
            >
              Create New Event
            </Link>
            <Link
              href="/admin/applications"
              className="bg-[#161822] hover:bg-gray-800 text-white font-bold p-3 rounded-lg text-center text-sm border border-gray-800 transition"
            >
              Review Pending Applications
            </Link>
            <Link
              href="/admin/students"
              className="bg-[#161822] hover:bg-gray-800 text-white font-bold p-3 rounded-lg text-center text-sm border border-gray-800 transition"
            >
              Search Student Profiles
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
