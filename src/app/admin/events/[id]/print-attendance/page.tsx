"use client";

import React, { use, useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Download,
  Printer,
  ArrowLeft,
  LayoutGrid,
  List,
  CheckCircle,
  Users,
  Calendar,
  MapPin,
  Clock,
  User,
  Loader2,
  Phone,
  FileCheck,
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

async function fetchPhotoAsDataUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    if (!res.ok) return url;
    const blob = await res.blob();
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string) || url);
      reader.readAsDataURL(blob);
    });
  } catch {
    return url;
  }
}

export default function PrintAttendancePage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const eventId = params.id;

  const [event, setEvent] = useState<EventData | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // PDF Generation State
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<string | null>(null);

  // View & Customization Controls
  const [layoutMode, setLayoutMode] = useState<"table" | "grid">("table");
  const [statusFilter, setStatusFilter] = useState<"CONFIRMED" | "CONFIRMED_SELECTED" | "ALL">("CONFIRMED");
  const [sortBy, setSortBy] = useState<"name" | "regNo" | "order">("name");
  const [gridDensity, setGridDensity] = useState<"10" | "8">("10"); // 10 per page (2x5) or 8 per page (2x4)
  const [showPhone, setShowPhone] = useState(true);
  const [showUniversity, setShowUniversity] = useState(true);

  const pagesContainerRef = useRef<HTMLDivElement>(null);

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

          // Pre-fetch candidate photos as base64 in background for instant, 100% reliable PDF canvas export
          Promise.all(
            apps.map(async (app) => {
              if (app.photoUrl && app.photoUrl.startsWith("/")) {
                const base64 = await fetchPhotoAsDataUrl(app.photoUrl);
                return { ...app, photoUrl: base64 };
              }
              return app;
            })
          ).then((updatedApps) => {
            setApplications(updatedApps);
          });
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

  // Filter and sort candidates
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

  // Calculate clean, mathematically exact multi-page chunks
  // Table View:
  // - If <= 11 students: All fit on Page 1 along with Supervisor Sign-Off box
  // - Otherwise: Page 1 holds 13 rows; Subsequent pages hold 14 rows; Last page holds up to 9 rows + Supervisor Box
  const pagedTableData = useMemo(() => {
    const list = filteredCandidates;
    if (list.length === 0) return [[]];
    if (list.length <= 11) {
      return [list];
    }
    const chunks: Application[][] = [];
    chunks.push(list.slice(0, 13));
    let remaining = list.slice(13);

    while (remaining.length > 0) {
      // If remaining <= 9, it fits on this final page with the supervisor box
      if (remaining.length <= 9) {
        chunks.push(remaining);
        break;
      }
      // If remaining is 10-14, take 13 so it doesn't leave an awkward lone student
      if (remaining.length <= 14) {
        chunks.push(remaining);
        break;
      }
      chunks.push(remaining.slice(0, 14));
      remaining = remaining.slice(14);
    }
    return chunks;
  }, [filteredCandidates]);

  // Grid View:
  // - 10 students per page (2x5) or 8 students per page (2x4)
  const pagedGridData = useMemo(() => {
    const list = filteredCandidates;
    if (list.length === 0) return [[]];
    const perPage = parseInt(gridDensity, 10) || 10;
    const chunks: Application[][] = [];
    for (let i = 0; i < list.length; i += perPage) {
      chunks.push(list.slice(i, i + perPage));
    }
    return chunks;
  }, [filteredCandidates, gridDensity]);

  const activePages = layoutMode === "table" ? pagedTableData : pagedGridData;
  const totalPages = activePages.length;

  // Direct PDF Download Handler
  const handleDownloadPdf = async () => {
    if (isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    setPdfProgress("Initializing PDF engine...");

    try {
      const { jsPDF } = await import("jspdf");
      const html2canvas = (await import("html2canvas")).default;

      const pageElements = document.querySelectorAll<HTMLElement>(".printable-a4-page");
      if (!pageElements.length) {
        alert("No attendance pages found to export.");
        return;
      }

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      for (let i = 0; i < pageElements.length; i++) {
        setPdfProgress(`Rendering Sheet ${i + 1} of ${pageElements.length}...`);
        const pageEl = pageElements[i];

        const canvas = await html2canvas(pageEl, {
          scale: 2, // 2x sharp high-DPI quality
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          logging: false,
          windowWidth: 1200,
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.95);

        if (i > 0) {
          doc.addPage("a4", "portrait");
        }
        doc.addImage(imgData, "JPEG", 0, 0, 210, 297, undefined, "FAST");
      }

      setPdfProgress("Saving PDF to Downloads...");
      const safeTitle = (event?.name || "Event")
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .replace(/_+/g, "_")
        .slice(0, 35);
      const dateStr = event?.date ? new Date(event.date).toISOString().slice(0, 10) : "roster";
      const fileName = `Attendance_${safeTitle}_${dateStr}.pdf`;

      doc.save(fileName);
    } catch (err: any) {
      console.error("PDF generation error:", err);
      alert("Failed to generate PDF. Please try again or use the browser print option.");
    } finally {
      setIsGeneratingPdf(false);
      setPdfProgress(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

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
    <div className="min-h-screen bg-slate-200/80 text-slate-900 pb-16 font-sans">
      {/* ------------------------------------------------------------- */}
      {/* TOP CONTROL BAR (HIDDEN DURING PRINT)                         */}
      {/* ------------------------------------------------------------- */}
      <header className="no-print sticky top-0 z-50 bg-slate-900 text-white border-b border-slate-800 px-4 py-3 shadow-lg">
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
                  Attendance PDF
                </span>
                <h1 className="text-sm font-extrabold truncate max-w-md">{event.name}</h1>
              </div>
              <p className="text-[11px] text-slate-400">
                {filteredCandidates.length} students &bull; {totalPages} {totalPages === 1 ? "page" : "pages"} A4
              </p>
            </div>
          </div>

          {/* Action & Filter Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle */}
            <div className="bg-slate-800 p-0.5 rounded-xl border border-slate-700 flex items-center text-xs">
              <button
                type="button"
                onClick={() => setLayoutMode("table")}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  layoutMode === "table" ? "bg-red-600 text-white shadow" : "text-slate-300 hover:text-white"
                }`}
                title="Compact Table Roster (13-14 students per page, maximum paper savings)"
              >
                <List className="w-3.5 h-3.5" />
                <span>Compact Table</span>
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode("grid")}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  layoutMode === "grid" ? "bg-red-600 text-white shadow" : "text-slate-300 hover:text-white"
                }`}
                title="Grid Boxes (8-10 students per page with large photo & signature box)"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Grid Cards</span>
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

            {/* DIRECT DOWNLOAD PDF BUTTON (PRIMARY) */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-lg transition cursor-pointer disabled:opacity-50"
              title="Directly download PDF file with complete list into your Downloads folder"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>{pdfProgress || "Generating PDF..."}</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download PDF ({filteredCandidates.length})</span>
                </>
              )}
            </button>

            {/* Secondary Browser Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={isGeneratingPdf}
              className="bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
              title="Open browser print dialog (Ctrl+P)"
            >
              <Printer className="w-3.5 h-3.5 text-slate-400" />
              <span>Print</span>
            </button>
          </div>
        </div>
      </header>

      {/* Screen Helper Banner (Hidden on Print) */}
      <div className="no-print max-w-5xl mx-auto px-4 mt-4">
        <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-2xl p-3 sm:p-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>Direct PDF Download:</strong> Click the green <strong>&quot;Download PDF&quot;</strong> button above to download the complete file with all <strong>{filteredCandidates.length} students</strong> directly into your Downloads folder across {totalPages} clean A4 {totalPages === 1 ? "page" : "pages"}.
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
      {/* PAGINATED A4 PAGES CONTAINER                                 */}
      {/* ------------------------------------------------------------- */}
      <div ref={pagesContainerRef} className="mt-4 sm:mt-6">
        {activePages.map((pageCandidates, pageIndex) => {
          const pageNum = pageIndex + 1;
          const isFirstPage = pageIndex === 0;
          const isLastPage = pageIndex === activePages.length - 1;

          // Calculate running candidate starting index
          let startIndex = 0;
          for (let p = 0; p < pageIndex; p++) {
            startIndex += activePages[p].length;
          }

          return (
            <div
              key={`page-${pageIndex}`}
              className="printable-a4-page mx-auto bg-white p-5 sm:p-6 mb-6 shadow-2xl rounded-sm print:shadow-none print:m-0 print:rounded-none"
              style={{
                width: "210mm",
                minHeight: "297mm",
                boxSizing: "border-box",
                pageBreakAfter: "always",
                breakAfter: "page",
              }}
            >
              {/* PAGE TOP: HEADER */}
              {isFirstPage ? (
                /* Master Document Header on Page 1 */
                <div className="border-b-2 border-black pb-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-base sm:text-lg tracking-wider text-black uppercase">
                        TOPLINE ODC
                      </span>
                      <span className="text-xs font-bold text-slate-600 uppercase border-l border-slate-400 pl-2">
                        Attendance Sheet
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-black uppercase tracking-tight mt-1 leading-snug">
                      {event.name}
                    </h2>
                  </div>

                  {/* Event Specs */}
                  <div className="grid grid-cols-3 gap-3 mt-2.5 pt-2 border-t border-slate-300 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                      <div>
                        <span className="text-[8.5px] text-slate-500 uppercase block font-bold">Event Date</span>
                        <span className="font-bold text-black text-[11px]">{formattedEventDate}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                      <div>
                        <span className="text-[8.5px] text-slate-500 uppercase block font-bold">Reporting Time</span>
                        <span className="font-bold text-black text-[11px]">
                          {formatTime12(event.reportingTime) || "As per duty slot"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                      <div>
                        <span className="text-[8.5px] text-slate-500 uppercase block font-bold">Venue / Location</span>
                        <span className="font-bold text-black text-[11px] truncate block">{event.location}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Compact Repeat Header on Page 2+ */
                <div className="border-b-2 border-black pb-2 mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm tracking-wider text-black uppercase">TOPLINE ODC</span>
                    <span className="text-xs text-slate-700 font-bold uppercase truncate max-w-md">
                      &bull; {event.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono font-bold text-slate-600">
                      {formattedEventDate} &bull; Page {pageNum} of {totalPages}
                    </span>
                  </div>
                </div>
              )}

              {/* PAGE BODY */}
              <div className="flex-1">
                {layoutMode === "table" ? (
                  /* ---------------- TABLE LAYOUT ---------------- */
                  <table className="w-full border-collapse border-2 border-black text-left text-xs">
                    <thead>
                      <tr className="bg-slate-200 border-b-2 border-black text-black">
                        <th className="p-1 border border-black text-center w-8 font-black">#</th>
                        <th className="p-1 border border-black text-center w-12 font-black">Photo</th>
                        <th className="p-1.5 border border-black font-black">Candidate Name &amp; Contact</th>
                        <th className="p-1.5 border border-black font-black w-28">Roll / Reg No</th>
                        {showUniversity && (
                          <th className="p-1.5 border border-black font-black w-28">University / City</th>
                        )}
                        <th className="p-1.5 border border-black text-center font-black w-40">
                          Signature
                        </th>
                        <th className="p-1.5 border border-black text-center font-black w-18">In-Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageCandidates.map((candidate, rowIdx) => {
                        const globalIdx = startIndex + rowIdx + 1;
                        const name = candidate.name || candidate.user?.name || "Student";
                        const regNo = candidate.registrationNumber || candidate.user?.registrationNumber || "N/A";
                        const phone = candidate.mobileNumber || candidate.user?.phone || "";
                        const university = candidate.user?.university || "";
                        const photo = candidate.photoUrl;

                        return (
                          <tr
                            key={candidate.id}
                            className="border-b border-black text-black"
                            style={{ height: "16.5mm" }}
                          >
                            {/* Serial Number */}
                            <td className="p-1 border border-black text-center font-black font-mono">
                              {globalIdx}
                            </td>

                            {/* Photo Thumbnail */}
                            <td className="p-1 border border-black text-center">
                              <div className="w-9 h-11 mx-auto bg-slate-100 border border-slate-400 rounded overflow-hidden flex items-center justify-center">
                                {photo ? (
                                  <img
                                    src={photo}
                                    alt={name}
                                    className="w-full h-full object-cover"
                                    crossOrigin="anonymous"
                                  />
                                ) : (
                                  <User className="w-4 h-4 text-slate-400" />
                                )}
                              </div>
                            </td>

                            {/* Name & Phone */}
                            <td className="p-1.5 border border-black">
                              <p className="font-black text-xs uppercase leading-tight truncate max-w-[180px]">
                                {name}
                              </p>
                              {showPhone && phone && (
                                <p className="text-[10px] text-slate-700 font-mono font-semibold mt-0.5">{phone}</p>
                              )}
                            </td>

                            {/* Reg No */}
                            <td className="p-1.5 border border-black font-black font-mono text-xs truncate max-w-[120px]">
                              {regNo}
                            </td>

                            {/* University */}
                            {showUniversity && (
                              <td className="p-1.5 border border-black text-[10px] text-slate-700 truncate max-w-[120px]">
                                {university || "-"}
                              </td>
                            )}

                            {/* Signature Box */}
                            <td className="p-1 border border-black text-center">
                              <div className="w-full h-9 border border-dashed border-slate-400 rounded flex items-end justify-center pb-0.5">
                                <span className="text-[7.5px] uppercase tracking-wider text-slate-400 font-bold">
                                  Signature
                                </span>
                              </div>
                            </td>

                            {/* In-Time */}
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
                ) : (
                  /* ---------------- GRID CARDS LAYOUT ---------------- */
                  <div
                    className={`grid grid-cols-2 gap-2.5 ${
                      gridDensity === "10" ? "gap-y-2.5" : "gap-y-3.5"
                    }`}
                  >
                    {pageCandidates.map((candidate, rowIdx) => {
                      const globalIdx = startIndex + rowIdx + 1;
                      const name = candidate.name || candidate.user?.name || "Student";
                      const regNo = candidate.registrationNumber || candidate.user?.registrationNumber || "Reg No N/A";
                      const phone = candidate.mobileNumber || candidate.user?.phone || "";
                      const university = candidate.user?.university || "";
                      const photo = candidate.photoUrl;

                      return (
                        <div
                          key={candidate.id}
                          className="bg-white border-2 border-black rounded-lg p-2 flex items-stretch gap-2 relative"
                          style={{
                            minHeight: gridDensity === "10" ? "42mm" : "48mm",
                          }}
                        >
                          {/* S.No Badge */}
                          <span className="absolute top-1 right-1 text-[9.5px] font-black bg-black text-white px-1.5 py-0.2 rounded font-mono">
                            #{globalIdx}
                          </span>

                          {/* Candidate Photo Box */}
                          <div className="w-[58px] h-[74px] shrink-0 bg-slate-100 border border-black rounded overflow-hidden flex items-center justify-center relative">
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
                                <span className="text-[7.5px] font-black uppercase text-slate-500 mt-0.5">No Photo</span>
                              </div>
                            )}
                          </div>

                          {/* Student Details & Signature Box */}
                          <div className="flex-1 min-w-0 flex flex-col justify-between pr-3">
                            <div>
                              <h4 className="font-black text-xs text-black leading-tight truncate uppercase">
                                {name}
                              </h4>
                              <p className="text-[10.5px] font-black font-mono text-black mt-0.5 tracking-tight truncate">
                                ID: {regNo}
                              </p>
                              <div className="text-[9.5px] text-slate-700 space-y-0.5 mt-0.5">
                                {showPhone && phone && (
                                  <p className="truncate font-semibold text-slate-800">Ph: {phone}</p>
                                )}
                                {showUniversity && university && (
                                  <p className="truncate text-slate-600">{university}</p>
                                )}
                              </div>
                            </div>

                            {/* Signature Box */}
                            <div className="mt-1 pt-1 border-t border-slate-300">
                              <div className="border border-black rounded px-1.5 py-0.5 bg-slate-50 h-8 flex flex-col justify-between">
                                <span className="text-[7px] font-black uppercase tracking-wider text-slate-700 block">
                                  Signature
                                </span>
                                <div className="flex items-end justify-between text-[7.5px] text-slate-400 font-mono">
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
              </div>

              {/* PAGE BOTTOM: SUPERVISOR SIGN-OFF (ONLY ON LAST PAGE) */}
              {isLastPage && (
                <div className="mt-4 pt-2.5 border-t-2 border-black text-xs text-black">
                  <div className="grid grid-cols-3 gap-4 pb-1.5">
                    <div>
                      <p className="font-bold text-[9.5px] uppercase text-slate-600">Event In-Charge / Supervisor</p>
                      <div className="h-8 border-b border-black flex items-end pb-0.5 font-mono text-[10.5px]">
                        Name:
                      </div>
                    </div>
                    <div>
                      <p className="font-bold text-[9.5px] uppercase text-slate-600">Headcount Verification</p>
                      <div className="h-8 border-b border-black flex items-end justify-between pb-0.5 font-mono text-[10.5px]">
                        <span>Present: _____</span>
                        <span>Absent: _____</span>
                      </div>
                    </div>
                    <div>
                      <p className="font-bold text-[9.5px] uppercase text-slate-600">Authorized Signature</p>
                      <div className="h-8 border-b border-black flex items-end pb-0.5 font-mono text-[10.5px]">
                        Sign:
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SHEET FOOTER */}
              <div className="mt-2 pt-1 border-t border-slate-300 flex items-center justify-between text-[8.5px] text-slate-500 font-mono">
                <span>TOPLINE ODC Operations &bull; Physical Attendance &bull; Confidential</span>
                <span className="font-bold text-black">
                  Page {pageNum} of {totalPages}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Embedded Print Styling for Standard Print Dialog */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          html, body {
            background-color: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .printable-a4-page {
            box-shadow: none !important;
            border-radius: 0 !important;
            margin: 0 !important;
            padding: 8mm 10mm !important;
            page-break-after: always !important;
            break-after: page !important;
            height: 297mm !important;
          }
        }
      `}</style>
    </div>
  );
}
