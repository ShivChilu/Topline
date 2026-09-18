import { prisma } from "@/lib/prisma";
import {
  Users,
  CalendarCheck,
  TrendingUp,
  Banknote,
  DollarSign,
  Percent,
  Layers,
  ArrowUpRight,
  Eye,
  Calendar,
  MapPin,
  Clock,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  UserCheck,
  Gift,
} from "lucide-react";
import Link from "next/link";

import { isEventPast, getEffectiveEventStatus } from "@/lib/event-utils";
import AdminRefreshButton from "@/components/admin/AdminRefreshButton";

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
    totalReferrals: 0,
    qualifiedReferrals: 0,
    pendingReferralPayout: 0,
  };

  let recentEvents: any[] = [];
  let latestActiveEvent: any = null;

  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // 1. Overview counts (Past events dynamically excluded from open forms & counted towards completed)
    stats.totalStudents = await prisma.user.count({ where: { role: "USER" } });
    stats.totalEvents = await prisma.event.count();
    stats.openForms = await prisma.event.count({
      where: {
        status: "OPEN",
        date: { gte: startOfToday },
      },
    });
    stats.totalApplications = await prisma.application.count();
    stats.selectedStudents = await prisma.application.count({ where: { status: "SELECTED" } });
    stats.completedEvents = await prisma.event.count({
      where: {
        OR: [
          { status: "COMPLETED" },
          { date: { lt: startOfToday }, status: { notIn: ["ARCHIVED", "DRAFT"] } },
        ],
      },
    });

    // Referral Metrics
    stats.totalReferrals = await prisma.referral.count();
    stats.qualifiedReferrals = await prisma.referral.count({ where: { status: "QUALIFIED" } });
    const pendingReferralSum = await prisma.referral.aggregate({
      where: { status: "QUALIFIED" },
      _sum: { rewardAmount: true },
    });
    stats.pendingReferralPayout = pendingReferralSum._sum.rewardAmount || 0;

    // 2. Get recent & upcoming events with real registered application counts
    recentEvents = await prisma.event.findMany({
      where: { status: { not: "ARCHIVED" } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 8,
      include: {
        _count: {
          select: {
            applications: true,
          },
        },
      },
    });

    // Find the primary spotlight event (Active OPEN first, then other upcoming events, or fallback to most recent)
    latestActiveEvent =
      recentEvents.find((e) => getEffectiveEventStatus(e) === "OPEN") ||
      recentEvents.find((e) => ["FULL", "CLOSED", "SCHEDULED"].includes(getEffectiveEventStatus(e))) ||
      recentEvents[0] ||
      null;
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-wider text-red-600 uppercase">
            Business Overview
          </h1>
          <p className="text-slate-500 text-sm mt-1">Real-time catering recruitment operations and financial performance</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <AdminRefreshButton />
          <Link
            href="/admin/events"
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 transition flex items-center gap-2"
          >
            <Calendar className="w-4 h-4 text-slate-600" />
            <span>Manage All Events</span>
          </Link>
          <Link
            href="/admin/events/create"
            className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-2"
          >
            <span>+ Create Event</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-450 font-semibold uppercase tracking-wider">{kpi.name}</p>
              <h3 className="text-3xl font-bold mt-2 text-slate-900">{kpi.value}</h3>
            </div>
            <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-200 shadow-xs">
              {kpi.icon}
            </div>
          </div>
        ))}
      </div>

      {/* SPOTLIGHT RECENT EVENT QUICK ACCESS CARD */}
      {latestActiveEvent && (() => {
        const spotlightStatus = getEffectiveEventStatus(latestActiveEvent);
        return (
        <div className="bg-gradient-to-r from-red-600 via-red-700 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="space-y-2 z-10 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 border border-white/30">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                Latest Event Spotlight
              </span>
              <span className="bg-black/30 backdrop-blur-md px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border border-white/20">
                {spotlightStatus}
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tight leading-snug">
              {latestActiveEvent.name}
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-red-100 font-medium pt-1">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-red-200" />
                {new Date(latestActiveEvent.date).toLocaleDateString("en-GB", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
              {latestActiveEvent.reportingTime && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-red-200" />
                  Reporting: {formatTime12(latestActiveEvent.reportingTime)}
                </span>
              )}
              {latestActiveEvent.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-red-200" />
                  {latestActiveEvent.location}
                </span>
              )}
              <span className="flex items-center gap-1 font-bold text-white bg-black/20 px-2 py-0.5 rounded-md">
                <Users className="w-3.5 h-3.5" />
                {latestActiveEvent._count?.applications || latestActiveEvent.applicationsCount || 0} Registered Members
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 z-10 shrink-0">
            <Link
              href={`/admin/events/${latestActiveEvent.id}`}
              className="bg-white hover:bg-slate-100 text-red-700 font-extrabold text-sm px-6 py-3.5 rounded-xl shadow-lg transition flex items-center justify-center gap-2 group"
            >
              <Eye className="w-4 h-4 text-red-600 transition-transform group-hover:scale-110" />
              <span>Open & View Registered Members</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Decorative background glow */}
          <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-red-500/20 rounded-full blur-3xl pointer-events-none" />
        </div>
        );
      })()}



      {/* Recent Events & Registered Staffing Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Events table with direct Open links */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wider">Recent Events & Staffing Queue</h3>
              <p className="text-xs text-slate-500 mt-0.5">Click "Open Event" to review candidate photos, calls, and selection status.</p>
            </div>
            <Link href="/admin/events" className="text-red-600 hover:text-red-700 font-bold text-xs flex items-center space-x-1">
              <span>View All ({stats.totalEvents})</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentEvents.length === 0 ? (
            <p className="text-slate-450 text-sm text-center py-6">No events on record.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="text-slate-400 bg-slate-50/75 border-b border-slate-200 uppercase text-xs">
                    <th className="p-3">Event Name & Details</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Reporting</th>
                    <th className="p-3 text-center">Registered Members</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentEvents.map((ev) => {
                    const applicantCount = ev._count?.applications ?? ev.applicationsCount ?? 0;
                    const effectiveStatus = getEffectiveEventStatus(ev);
                    return (
                      <tr key={ev.id} className="hover:bg-slate-50/80 transition group">
                        <td className="p-3">
                          <Link href={`/admin/events/${ev.id}`} className="font-bold text-slate-900 hover:text-red-600 transition flex items-center gap-1.5">
                            <span>{ev.name}</span>
                          </Link>
                          <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                            {ev.location && <span>{ev.location}</span>}
                            {ev.workType && <span>• {ev.workType}</span>}
                          </div>
                        </td>
                        <td className="p-3 text-slate-600 text-xs font-medium">
                          {new Date(ev.date).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="p-3 text-slate-600 text-xs font-medium">{formatTime12(ev.reportingTime)}</td>
                        <td className="p-3 text-center">
                          <Link
                            href={`/admin/events/${ev.id}`}
                            className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-800 px-2.5 py-1 rounded-full text-xs font-bold transition"
                            title="Click to view registered members"
                          >
                            <Users className="w-3 h-3 text-slate-600" />
                            <span>{applicantCount} applied</span>
                            <span className="text-slate-400 font-normal">/ {ev.workersRequired || ev.maxApplications || 45}</span>
                          </Link>
                        </td>
                        <td className="p-3">
                          {effectiveStatus === "OPEN" && (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-xs uppercase font-extrabold flex items-center gap-1 w-fit">
                              <Sparkles className="w-3 h-3" /> OPEN
                            </span>
                          )}
                          {effectiveStatus === "FULL" && (
                            <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full text-xs uppercase font-bold w-fit">
                              FULL
                            </span>
                          )}
                          {effectiveStatus === "CLOSED" && (
                            <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 rounded-full text-xs uppercase font-bold w-fit">
                              CLOSED
                            </span>
                          )}
                          {effectiveStatus === "COMPLETED" && (
                            <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-0.5 rounded-full text-xs uppercase font-bold w-fit">
                              COMPLETED
                            </span>
                          )}
                          {effectiveStatus === "SCHEDULED" && (
                            <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full text-xs uppercase font-bold w-fit">
                              SCHEDULED
                            </span>
                          )}
                          {effectiveStatus === "DRAFT" && (
                            <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded-full text-xs uppercase font-bold w-fit">
                              DRAFT
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <Link
                            href={`/admin/events/${ev.id}`}
                            className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg shadow-xs transition hover:scale-105"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Open</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column: Quick Admin Tools */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4 shadow-xs">
          <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-3">Quick Navigation</h3>
          <div className="grid grid-cols-1 gap-3">
            <Link
              href="/admin/events/create"
              className="bg-red-600 hover:bg-red-700 text-white font-bold p-3.5 rounded-xl text-center text-sm shadow transition flex items-center justify-center gap-2"
            >
              <span>+ Create New Event</span>
            </Link>
            <Link
              href="/admin/events"
              className="bg-slate-50 hover:bg-slate-100 text-slate-900 font-bold p-3.5 rounded-xl text-center text-sm border border-slate-200 transition flex items-center justify-center gap-2"
            >
              <Calendar className="w-4 h-4 text-slate-600" />
              <span>Events & Rosters ({stats.totalEvents})</span>
            </Link>
            <Link
              href="/admin/students"
              className="bg-slate-50 hover:bg-slate-100 text-slate-900 font-bold p-3.5 rounded-xl text-center text-sm border border-slate-200 transition flex items-center justify-center gap-2"
            >
              <Users className="w-4 h-4 text-slate-600" />
              <span>Student Visual Gallery ({stats.totalStudents})</span>
            </Link>
            <Link
              href="/admin/referrals"
              className="bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 text-purple-950 font-bold p-3.5 rounded-xl text-center text-sm border border-purple-200 transition flex items-center justify-between shadow-2xs"
            >
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-purple-600" />
                <span>Referrals & Payouts</span>
              </div>
              {stats.pendingReferralPayout > 0 ? (
                <span className="bg-amber-500 text-white font-black text-[10px] px-2 py-0.5 rounded-full">
                  ₹{stats.pendingReferralPayout} Due
                </span>
              ) : (
                <span className="text-xs text-purple-700 font-bold">{stats.totalReferrals} referred</span>
              )}
            </Link>
            <Link
              href="/admin/applications"
              className="bg-slate-50 hover:bg-slate-100 text-slate-900 font-bold p-3.5 rounded-xl text-center text-sm border border-slate-200 transition flex items-center justify-center gap-2"
            >
              <Layers className="w-4 h-4 text-slate-600" />
              <span>All Applications Queue ({stats.totalApplications})</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

