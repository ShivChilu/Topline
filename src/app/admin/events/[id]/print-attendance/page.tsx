"use client";

import React, { use, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Printer,
  ArrowLeft,
  LayoutGrid,
  List,
  Filter,
  CheckCircle,
  Users,
  Calendar,
  MapPin,
  Clock,
  User,
  ShieldCheck,
  Phone,
  FileSpreadsheet,
} from "lucide-react";

interface Application {
  id: string;
  name: string;
  registrationNumber?: string;
  mobileNumber?: string;
  status: string;
  photoUrl?: string;
  user?: {
    name?: string;
    registrationNumber?: string;
    phone?: string;
    university?: string;
    city?: string;
    gender?: string;
  };
}

interface EventData {
  id: string;
  name: string;
  date: string;
  location: string;
  reportingTime: string;
  startTime: string;
  endTime: string;
  workType: string;
  workersRequired?: number;
}

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

export default function PrintAttendancePage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const eventId = params.id;

  const [event, setEvent] = useState<EventData | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Print customization controls
  const [layoutMode, setLayoutMode] = useState<"grid" | "table">("grid");
  const [statusFilter, setStatusFilter] = useState<"CONFIRMED" | "CONFIRMED_SELECTED" | "ALL">("CONFIRMED");
  const [sortBy, setSortBy] = useState<"name" | "regNo" | "order">("name");
  const [gridDensity, setGridDensity] = useState<"10" | "8">("10"); // 10 per page (2x5) or 8 per page (2x4)
  const [showPhone, setShowPhone] = useState(true);
  const [showUniversity, setShowUniversity] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const [eventRes, appRes] = await Promise.all([
          fetch(`/api/admin/events/${eventId}`),
          fetch(`/api/admin/applications?eventId=${eventId}`),
        ]);

        const eventData = await eventRes.json();
        const appData = await appRes.json();

        if (eventData.success) {
          setEvent(eventData.event);
        } else {
          setError(eventData.message || "Failed to load event details.");
        }

        if (appData.success) {
          const apps: Application[] = appData.applications || [];
          setApplications(apps);

          // If no applications are strictly CONFIRMED, fallback to CONFIRMED_SELECTED
          const confirmedCount = apps.filter((a) => a.status === "CONFIRMED").length;
          if (confirmedCount === 0 && apps.some((a) => a.status === "SELECTED")) {
            setStatusFilter("CONFIRMED_SELECTED");
          }
        }
      } catch (err: any) {
        console.error("Error loading attendance print data:", err);
        setError("Failed to load attendance roster data.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [eventId]);

  // Filtered and Sorted Candidates
  const filteredCandidates = useMemo(() => {
    let list = applications.filter((app) => {
      if (statusFilter === "CONFIRMED") return app.status === "CONFIRMED";
      if (statusFilter === "CONFIRMED_SELECTED") return app.status === "CONFIRMED" || app.status === "SELECTED";
      return !["REJECTED", "NOT_SELECTED", "CANCELLED"].includes(app.status);
    });

    return list.sort((a, b) => {
      if (sortBy === "name") {
        const nameA = (a.name || a.user?.name || "").toLowerCase();
        const nameB = (b.name || b.user?.name || "").toLowerCase();
        return nameA.localeCompare(nameB);
      }
      if (sortBy === "regNo") {
        const regA = (a.registrationNumber || a.user?.registrationNumber || "").toLowerCase();
        const regB = (b.registrationNumber || b.user?.registrationNumber || "").toLowerCase();
        return regA.localeCompare(regB);
      }
      return 0; // default order
    });
  }, [applications, statusFilter, sortBy]);

  const handlePrint = () => {
    window.print();
  };

  // Estimated sheets
  const estimatedPages = useMemo(() => {
    if (layoutMode === "grid") {
      const perPage = parseInt(gridDensity, 10);
      return Math.ceil(filteredCandidates.length / perPage) || 1;
    }
    return Math.ceil(filteredCandidates.length / 13) || 1;
  }, [filteredCandidates.length, layoutMode, gridDensity]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-2xl shadow-md border border-slate-200 text-center space-y-3">
          <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <h2 className="text-base font-bold text-slate-800">Preparing Physical Attendance Sheets...</h2>
          <p className="text-xs text-slate-500">Loading candidate photos, registration numbers, and event data</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-2xl shadow-md border border-slate-200 text-center space-y-4 max-w-md">
          <p className="text-rose-600 font-bold text-sm">{error || "Event not found"}</p>
          <Link
            href={`/admin/events/${eventId}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Event</span>
          </Link>
        </div>
      </div>
    );
  }

  const formattedEventDate = new Date(event.date).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-slate-200/70 text-slate-900 pb-16 font-sans">
      {/* ------------------------------------------------------------- */}
      {/* TOP CONTROL BAR (HIDDEN IN PRINT)                             */}
      {/* ------------------------------------------------------------- */}
      <header className="no-print sticky top-0 z-50 bg-slate-900 text-white border-b border-slate-800 px-4 py-3 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href={`/admin/events/${eventId}`}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition"
              title="Back to Event"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-red-600 font-black px-2 py-0.5 rounded text-white uppercase tracking-wider">
                  Print Ready
                </span>
                <h1 className="text-sm font-extrabold truncate max-w-md">{event.name}</h1>
              </div>
              <p className="text-[11px] text-slate-400">
                {filteredCandidates.length} students &bull; ~{estimatedPages} {estimatedPages === 1 ? "page" : "pages"} A4
              </p>
            </div>
          </div>

          {/* Action & Filter Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle */}
            <div className="bg-slate-800 p-0.5 rounded-xl border border-slate-700 flex items-center text-xs">
              <button
                type="button"
                onClick={() => setLayoutMode("grid")}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  layoutMode === "grid" ? "bg-red-600 text-white shadow" : "text-slate-300 hover:text-white"
                }`}
                title="Grid Boxes (8-10 students per page with large photo & signature box)"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Grid Cards ({gridDensity}/page)</span>
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode("table")}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  layoutMode === "table" ? "bg-red-600 text-white shadow" : "text-slate-300 hover:text-white"
                }`}
                title="Compact Table Roster (12-14 students per page, maximum paper savings)"
              >
                <List className="w-3.5 h-3.5" />
                <span>Compact Table (14/page)</span>
              </button>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-800 border border-slate-700 text-white text-xs font-bold rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-red-500"
            >
              <option value="CONFIRMED">Confirmed Only ({applications.filter((a) => a.status === "CONFIRMED").length})</option>
              <option value="CONFIRMED_SELECTED">
                Confirmed + Selected ({applications.filter((a) => ["CONFIRMED", "SELECTED"].includes(a.status)).length})
              </option>
              <option value="ALL">All Active Candidates ({applications.length})</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-800 border border-slate-700 text-white text-xs font-bold rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-red-500"
            >
              <option value="name">Sort: Name (A-Z)</option>
              <option value="regNo">Sort: Reg / Roll No</option>
              <option value="order">Sort: Application Order</option>
            </select>

            {/* Density (for grid mode) */}
            {layoutMode === "grid" && (
              <select
                value={gridDensity}
                onChange={(e) => setGridDensity(e.target.value as any)}
                className="bg-slate-800 border border-slate-700 text-white text-xs font-bold rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-red-500"
              >
                <option value="10">10 / Page (2×5)</option>
                <option value="8">8 / Page (2×4)</option>
              </select>
            )}

            {/* Primary Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-lg transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Sheet / Save PDF</span>
            </button>
          </div>
        </div>
      </header>

      {/* Screen Instructions Banner (Hidden on Print) */}
      <div className="no-print max-w-5xl mx-auto px-4 mt-4">
        <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-2xl p-3 sm:p-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>Print Setup:</strong> Paper is formatted for standard <strong>A4 Portrait</strong>. Page breaks and signature boxes are automatically optimized to avoid cutting students across sheets.
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0 text-slate-700 font-semibold">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showPhone}
                onChange={(e) => setShowPhone(e.target.checked)}
                className="accent-blue-600 rounded"
              />
              Show Phone
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showUniversity}
                onChange={(e) => setShowUniversity(e.target.checked)}
                className="accent-blue-600 rounded"
              />
              Show College
            </label>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* PRINTABLE A4 PAPER CONTAINER                                  */}
      {/* ------------------------------------------------------------- */}
      <main className="max-w-[210mm] mx-auto mt-4 sm:mt-6 bg-white p-5 sm:p-7 shadow-2xl rounded-xl print:shadow-none print:p-0 print:m-0 print:max-w-none print:w-full print:rounded-none">
        {/* Document Master Header */}
        <div className="border-b-2 border-black pb-3 mb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-base sm:text-lg tracking-wider text-black uppercase">TOPLINE ODC</span>
                <span className="text-xs font-bold text-slate-600 uppercase border-l border-slate-400 pl-2">
                  Event Attendance &amp; Physical Signature Sheet
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-black uppercase tracking-tight mt-1 leading-snug">
                {event.name}
              </h2>
            </div>
            <div className="text-right shrink-0">
              <span className="inline-block bg-black text-white text-[11px] font-black uppercase px-2.5 py-0.5 rounded">
                Official Roster
              </span>
              <p className="text-[10px] text-slate-600 font-mono mt-1">
                Generated: {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
          </div>

          {/* Event Specs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-2 border-t border-slate-300 text-xs">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-700 shrink-0" />
              <div>
                <span className="text-[9px] text-slate-500 uppercase block font-bold">Event Date</span>
                <span className="font-bold text-black">{formattedEventDate}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-700 shrink-0" />
              <div>
                <span className="text-[9px] text-slate-500 uppercase block font-bold">Reporting Time</span>
                <span className="font-bold text-black">{formatTime12(event.reportingTime) || "As per duty slot"}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-700 shrink-0" />
              <div>
                <span className="text-[9px] text-slate-500 uppercase block font-bold">Venue / Location</span>
                <span className="font-bold text-black truncate block max-w-[150px]">{event.location}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-700 shrink-0" />
              <div>
                <span className="text-[9px] text-slate-500 uppercase block font-bold">Confirmed Stewards</span>
                <span className="font-black text-black">
                  {filteredCandidates.length} Total {event.workersRequired ? `(Req: ${event.workersRequired})` : ""}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* LAYOUT 1: GRID CARDS BOX VIEW (8 - 10 PER PAGE)               */}
        {/* ------------------------------------------------------------- */}
        {layoutMode === "grid" && (
          <div
            className={`grid grid-cols-2 gap-3 ${
              gridDensity === "10" ? "print:gap-2.5" : "print:gap-3.5"
            }`}
          >
            {filteredCandidates.map((candidate, idx) => {
              const name = candidate.name || candidate.user?.name || "Student";
              const regNo = candidate.registrationNumber || candidate.user?.registrationNumber || "Reg No N/A";
              const phone = candidate.mobileNumber || candidate.user?.phone || "";
              const university = candidate.user?.university || "";
              const photo = candidate.photoUrl;

              return (
                <div
                  key={candidate.id}
                  className="print-avoid-break bg-white border-2 border-black rounded-lg p-2.5 flex items-stretch gap-2.5 relative shadow-2xs print:shadow-none"
                  style={{
                    pageBreakInside: "avoid",
                    breakInside: "avoid",
                    minHeight: gridDensity === "10" ? "42mm" : "50mm",
                  }}
                >
                  {/* S.No Badge */}
                  <span className="absolute top-1 right-1 text-[10px] font-black bg-black text-white px-1.5 py-0.2 rounded font-mono">
                    #{idx + 1}
                  </span>

                  {/* Candidate Photo Box */}
                  <div className="w-[62px] h-[78px] shrink-0 bg-slate-100 border border-black rounded overflow-hidden flex items-center justify-center relative">
                    {photo ? (
                      <img
                        src={photo}
                        alt={name}
                        className="w-full h-full object-cover"
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-1 text-center">
                        <User className="w-5 h-5 text-slate-400" />
                        <span className="text-[8px] font-black uppercase text-slate-500 mt-0.5">No Photo</span>
                      </div>
                    )}
                  </div>

                  {/* Student Details & Signature Box */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between pr-4">
                    <div>
                      {/* Name */}
                      <h4 className="font-black text-xs sm:text-sm text-black leading-tight truncate uppercase">
                        {name}
                      </h4>

                      {/* Reg No / Roll No */}
                      <p className="text-[11px] font-black font-mono text-black mt-0.5 tracking-tight truncate">
                        ID: {regNo}
                      </p>

                      {/* Phone & College */}
                      <div className="text-[10px] text-slate-700 space-y-0.5 mt-0.5 font-medium">
                        {showPhone && phone && (
                          <p className="truncate font-semibold text-slate-800">Ph: {phone}</p>
                        )}
                        {showUniversity && university && (
                          <p className="truncate text-slate-600">{university}</p>
                        )}
                      </div>
                    </div>

                    {/* Physical Signature Box */}
                    <div className="mt-1.5 pt-1 border-t border-slate-300">
                      <div className="border border-black rounded px-2 py-1 bg-slate-50/50 print:bg-transparent h-9 flex flex-col justify-between">
                        <span className="text-[7.5px] font-black uppercase tracking-wider text-slate-700 block">
                          Student Physical Signature
                        </span>
                        <div className="flex items-end justify-between text-[8px] text-slate-400 font-mono">
                          <span>Sign above</span>
                          <span>In: ______</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* LAYOUT 2: COMPACT TABLE ROSTER (12 - 14 PER PAGE)             */}
        {/* ------------------------------------------------------------- */}
        {layoutMode === "table" && (
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full border-collapse border-2 border-black text-left text-xs">
              <thead>
                <tr className="bg-slate-200 print:bg-slate-200 border-b-2 border-black text-black">
                  <th className="p-1.5 border border-black text-center w-8 font-black">#</th>
                  <th className="p-1.5 border border-black text-center w-14 font-black">Photo</th>
                  <th className="p-1.5 border border-black font-black">Candidate Name &amp; Contact</th>
                  <th className="p-1.5 border border-black font-black w-32">Roll / Reg No</th>
                  {showUniversity && (
                    <th className="p-1.5 border border-black font-black w-28">University / City</th>
                  )}
                  <th className="p-1.5 border border-black text-center font-black w-44">
                    Physical Signature (Pen)
                  </th>
                  <th className="p-1.5 border border-black text-center font-black w-20">In-Time</th>
                </tr>
              </thead>
              <tbody>
                {filteredCandidates.map((candidate, idx) => {
                  const name = candidate.name || candidate.user?.name || "Student";
                  const regNo = candidate.registrationNumber || candidate.user?.registrationNumber || "N/A";
                  const phone = candidate.mobileNumber || candidate.user?.phone || "";
                  const university = candidate.user?.university || "";
                  const photo = candidate.photoUrl;

                  return (
                    <tr
                      key={candidate.id}
                      className="print-avoid-break border-b border-black text-black"
                      style={{ pageBreakInside: "avoid", breakInside: "avoid", height: "17mm" }}
                    >
                      {/* Serial Number */}
                      <td className="p-1 border border-black text-center font-black font-mono">
                        {idx + 1}
                      </td>

                      {/* Photo Thumbnail */}
                      <td className="p-1 border border-black text-center">
                        <div className="w-10 h-12 mx-auto bg-slate-100 border border-slate-400 rounded overflow-hidden flex items-center justify-center">
                          {photo ? (
                            <img src={photo} alt={name} className="w-full h-full object-cover" crossOrigin="anonymous" />
                          ) : (
                            <User className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </td>

                      {/* Name & Phone */}
                      <td className="p-1.5 border border-black">
                        <p className="font-black text-xs uppercase leading-tight">{name}</p>
                        {showPhone && phone && (
                          <p className="text-[10px] text-slate-700 font-mono font-medium mt-0.5">{phone}</p>
                        )}
                      </td>

                      {/* Reg No */}
                      <td className="p-1.5 border border-black font-black font-mono text-xs">
                        {regNo}
                      </td>

                      {/* University */}
                      {showUniversity && (
                        <td className="p-1.5 border border-black text-[10.5px] text-slate-700 truncate max-w-[120px]">
                          {university || "-"}
                        </td>
                      )}

                      {/* Physical Signature Column */}
                      <td className="p-1 border border-black text-center">
                        <div className="w-full h-9 border border-dashed border-slate-400 rounded flex items-end justify-center pb-0.5">
                          <span className="text-[7.5px] uppercase tracking-wider text-slate-400 font-bold">
                            Signature Line
                          </span>
                        </div>
                      </td>

                      {/* In-Time / Remarks */}
                      <td className="p-1 border border-black text-center">
                        <div className="h-9 flex items-center justify-center text-[10px] font-mono text-slate-400">
                          ____:____
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty State */}
        {filteredCandidates.length === 0 && (
          <div className="py-12 text-center text-slate-500 space-y-2">
            <p className="text-sm font-bold">No candidates found for selected status: {statusFilter}</p>
            <p className="text-xs">Try selecting &quot;Confirmed + Selected&quot; or &quot;All Active Candidates&quot; at the top.</p>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* DOCUMENT FOOTER & SUPERVISOR VERIFICATION SIGN-OFF            */}
        {/* ------------------------------------------------------------- */}
        <div
          className="print-avoid-break mt-6 pt-3 border-t-2 border-black text-xs text-black"
          style={{ pageBreakInside: "avoid", breakInside: "avoid" }}
        >
          <div className="grid grid-cols-3 gap-4 pb-2">
            <div>
              <p className="font-bold text-[10px] uppercase text-slate-600">Event In-Charge / Supervisor</p>
              <div className="h-10 border-b border-black flex items-end pb-1 font-mono text-[11px]">
                Name:
              </div>
            </div>
            <div>
              <p className="font-bold text-[10px] uppercase text-slate-600">Attendance Headcount</p>
              <div className="h-10 border-b border-black flex items-end justify-between pb-1 font-mono text-[11px]">
                <span>Present: _____</span>
                <span>Absent: _____</span>
              </div>
            </div>
            <div>
              <p className="font-bold text-[10px] uppercase text-slate-600">Authorized Signature</p>
              <div className="h-10 border-b border-black flex items-end pb-1 font-mono text-[11px]">
                Sign:
              </div>
            </div>
          </div>
          <p className="text-[9px] text-slate-500 text-center pt-2">
            TOPLINE ODC Operations &bull; Physical Identity Verified with Physical University ID &bull; Confidential
          </p>
        </div>
      </main>

      {/* Embedded Print Styling */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 8mm 8mm 8mm;
          }
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .print-avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}
