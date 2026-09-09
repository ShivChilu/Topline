"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  X,
  QrCode,
  CheckCircle2,
  Clock,
  Users,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Download,
  AlertCircle,
  Radio,
  Search,
  UserCheck,
  ShieldCheck,
  Maximize2,
  Minimize2,
  Sparkles,
} from "lucide-react";

interface LiveAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventName: string;
  eventDate?: string;
  reportingTime?: string;
  onAttendanceChanged?: () => void;
}

export default function LiveAttendanceModal({
  isOpen,
  onClose,
  eventId,
  eventName,
  eventDate,
  reportingTime,
  onAttendanceChanged,
}: LiveAttendanceModalProps) {
  const [loading, setLoading] = useState(true);
  const [isLiveActive, setIsLiveActive] = useState(true);
  const [eventData, setEventData] = useState<any>(null);
  const [stats, setStats] = useState({
    totalConfirmed: 0,
    totalCheckedIn: 0,
    markedPresent: 0,
    markedLate: 0,
    pendingCheckIn: 0,
    turnoutRate: 0,
  });
  const [roster, setRoster] = useState<any[]>([]);
  const [liveFeed, setLiveFeed] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [fullscreenMode, setFullscreenMode] = useState(false);
  const [regeneratingToken, setRegeneratingToken] = useState(false);
  const [togglingToken, setTogglingToken] = useState(false);

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchLiveAttendance = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/live-attendance?t=${Date.now()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.success) {
        setEventData(data.event);
        setStats(data.stats);
        setRoster(data.roster || []);
        setLiveFeed(data.liveFeed || []);
      }
    } catch (err) {
      console.error("Failed to poll live attendance:", err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLiveAttendance(true);
      if (isLiveActive) {
        pollTimerRef.current = setInterval(() => {
          fetchLiveAttendance(false);
        }, 3000);
      }
    }
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [isOpen, eventId, isLiveActive]);

  if (!isOpen) return null;

  const attendanceToken = eventData?.attendanceToken || "";
  const isQrEnabled = eventData?.attendanceTokenEnabled || false;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const publicQrUrl = attendanceToken ? `${origin}/attendance/${attendanceToken}` : "";
  const qrImageSrc = attendanceToken
    ? `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(publicQrUrl)}`
    : "";

  const handleCopyLink = async () => {
    if (!publicQrUrl) return;
    try {
      await navigator.clipboard.writeText(publicQrUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleQR = async (enable: boolean) => {
    try {
      setTogglingToken(true);
      const res = await fetch(`/api/admin/events/${eventId}/attendance-qr`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendanceTokenEnabled: enable }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchLiveAttendance(false);
        if (onAttendanceChanged) onAttendanceChanged();
      }
    } catch (err) {
      console.error("Toggle QR error:", err);
    } finally {
      setTogglingToken(false);
    }
  };

  const handleRegenerateToken = async () => {
    if (!confirm("Regenerate a brand new QR Code? Any previously printed or shared QR codes for this event will be invalidated.")) return;
    try {
      setRegeneratingToken(true);
      const res = await fetch(`/api/admin/events/${eventId}/attendance-qr`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        await fetchLiveAttendance(false);
        if (onAttendanceChanged) onAttendanceChanged();
      }
    } catch (err) {
      console.error("Regenerate QR error:", err);
    } finally {
      setRegeneratingToken(false);
    }
  };

  const handleManualSpotMark = async (applicationId: string, studentId: string, status: "PRESENT" | "ABSENT") => {
    try {
      setActionLoadingId(applicationId);
      const res = await fetch(`/api/admin/events/${eventId}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          studentId,
          status,
          remarks: "Admin Spot Check-In",
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchLiveAttendance(false);
        if (onAttendanceChanged) onAttendanceChanged();
      }
    } catch (err) {
      console.error("Manual spot mark error:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredRoster = roster.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.registrationNumber.toLowerCase().includes(q) ||
      item.phone.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div
        className={`bg-white border border-slate-200 rounded-3xl w-full shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
          fullscreenMode ? "h-[98vh] max-w-[98vw]" : "max-h-[92vh] max-w-6xl"
        }`}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 text-white">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0 shadow-inner">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">{eventName}</h2>
                <span className="bg-red-500/20 text-red-300 border border-red-500/40 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping"></span>
                  Live Check-In Hub
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-300 mt-1 font-medium">
                {eventDate && <span>📅 {new Date(eventDate).toLocaleDateString("en-GB")}</span>}
                {reportingTime && <span>• ⏰ Reporting: {reportingTime}</span>}
                <span>• 👥 {stats.totalConfirmed} Confirmed Roster</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Live Auto-Refresh Toggle */}
            <button
              type="button"
              onClick={() => setIsLiveActive(!isLiveActive)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                isLiveActive
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  : "bg-white/10 text-slate-400 border-white/10 hover:bg-white/20"
              }`}
              title="Toggle automatic 3-second live refresh stream"
            >
              <Radio className={`w-3.5 h-3.5 ${isLiveActive ? "text-emerald-400 animate-pulse" : "text-slate-400"}`} />
              <span>{isLiveActive ? "Live (3s Auto)" : "Live Paused"}</span>
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => setFullscreenMode(!fullscreenMode)}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition"
              title={fullscreenMode ? "Exit Fullscreen" : "Fullscreen Projection"}
            >
              {fullscreenMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Real-time Metric Cards Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 sm:p-5 bg-slate-50 border-b border-slate-200">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Confirmed Roster</span>
            <div className="text-2xl font-black text-slate-900 mt-0.5">{stats.totalConfirmed}</div>
            <span className="text-[10px] text-slate-500 font-semibold mt-0.5 block">Accepted Duty</span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-emerald-200/80 bg-emerald-50/20 shadow-2xs">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">Marked Present</span>
            <div className="text-2xl font-black text-emerald-600 mt-0.5 flex items-baseline gap-1.5">
              <span>{stats.markedPresent}</span>
              {stats.markedLate > 0 && <span className="text-xs text-amber-600 font-bold">({stats.markedLate} Late)</span>}
            </div>
            <span className="text-[10px] text-emerald-700 font-semibold mt-0.5 block">Checked-in & Active</span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-amber-200/80 bg-amber-50/20 shadow-2xs">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">Pending Arrival</span>
            <div className="text-2xl font-black text-amber-600 mt-0.5">{stats.pendingCheckIn}</div>
            <span className="text-[10px] text-amber-700 font-semibold mt-0.5 block">Yet to Scan</span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-blue-200/80 bg-blue-50/20 shadow-2xs">
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">Turnout Rate</span>
            <div className="text-2xl font-black text-blue-600 mt-0.5">{stats.turnoutRate}%</div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, stats.turnoutRate)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Modal Body: Two Columns (Left: QR Code & Controls, Right: Live Feed & Spot Check-In) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: QR Code Display & Management (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-5 sm:p-6 text-center flex flex-col items-center justify-center space-y-4 shadow-sm relative overflow-hidden">
              {/* QR Status Pill */}
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Attendance QR Code</span>
                <span
                  className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                    isQrEnabled
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : "bg-rose-100 text-rose-800 border border-rose-300"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isQrEnabled ? "bg-emerald-600 animate-ping" : "bg-rose-600"}`}></span>
                  {isQrEnabled ? "Active & Scanning" : "QR Inactive"}
                </span>
              </div>

              {/* Big QR Code Card */}
              <div className="p-3 bg-white rounded-2xl border-2 border-slate-900 shadow-md relative group">
                {attendanceToken && isQrEnabled ? (
                  <img
                    src={qrImageSrc}
                    alt="Event Attendance QR Code"
                    className="w-56 h-56 object-contain rounded-xl"
                  />
                ) : (
                  <div className="w-56 h-56 bg-slate-100 rounded-xl flex flex-col items-center justify-center p-4 text-center">
                    <QrCode className="w-12 h-12 text-slate-300 mb-2" />
                    <span className="text-xs font-bold text-slate-700">QR Code Inactive</span>
                    <span className="text-[11px] text-slate-400 mt-1">Enable below to activate attendance scanning</span>
                  </div>
                )}
              </div>

              {/* Short Token Display */}
              {attendanceToken && (
                <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between">
                  <div className="text-left">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Event Check-In Code</span>
                    <span className="font-mono text-xs font-extrabold text-slate-800 tracking-wider">
                      {attendanceToken.slice(0, 16)}...
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-2.5 py-1 text-xs font-bold bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg transition flex items-center gap-1"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? "Copied" : "Copy Link"}</span>
                  </button>
                </div>
              )}

              {/* QR Management Action Buttons */}
              <div className="w-full grid grid-cols-2 gap-2 pt-1">
                {isQrEnabled ? (
                  <button
                    type="button"
                    disabled={togglingToken}
                    onClick={() => handleToggleQR(false)}
                    className="w-full py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                  >
                    {togglingToken ? "Updating..." : "Deactivate QR"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={togglingToken}
                    onClick={() => handleToggleQR(true)}
                    className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition disabled:opacity-50 cursor-pointer"
                  >
                    {togglingToken ? "Updating..." : "✓ Activate QR"}
                  </button>
                )}

                <button
                  type="button"
                  disabled={regeneratingToken}
                  onClick={handleRegenerateToken}
                  className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${regeneratingToken ? "animate-spin" : ""}`} />
                  <span>{regeneratingToken ? "Generating..." : "New Code"}</span>
                </button>
              </div>

              {publicQrUrl && (
                <a
                  href={publicQrUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-red-600 hover:text-red-700 font-bold flex items-center gap-1 transition"
                >
                  <span>Open Public Check-In Page</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Live Stream Feed & Spot Check-In (7 Cols) */}
          <div className="lg:col-span-7 space-y-4 flex flex-col">
            {/* Live Check-in Feed Ticker */}
            <div className="bg-slate-900 rounded-3xl p-4 sm:p-5 text-white shadow-md">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">Real-Time Check-In Stream</h3>
                </div>
                <span className="text-[11px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  {liveFeed.length} Recorded
                </span>
              </div>

              <div className="mt-3 space-y-2 max-h-44 overflow-y-auto pr-1">
                {liveFeed.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs italic">
                    Waiting for students to scan QR code... incoming check-ins will show here live!
                  </div>
                ) : (
                  liveFeed.slice(0, 15).map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs animate-in slide-in-from-top-1"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[11px] shrink-0 border border-emerald-500/30">
                          ✓
                        </div>
                        <div className="truncate">
                          <span className="font-bold text-white block truncate">{log.studentName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{log.registrationNumber}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                          log.attendanceStatus === "LATE"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                            : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        }`}>
                          {log.attendanceStatus}
                        </span>
                        <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                          {new Date(log.checkInTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Confirmed Roster with Spot Manual Check-In */}
            <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-sm flex-1 flex flex-col">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Confirmed Candidate Roster</h3>
                  <p className="text-xs text-slate-400">1-Tap spot check-in for battery-dead or offline students</p>
                </div>

                {/* Search candidate */}
                <div className="relative w-full sm:w-56">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search candidate..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600"
                  />
                </div>
              </div>

              {/* Roster List */}
              <div className="mt-3 space-y-2 max-h-64 overflow-y-auto pr-1 flex-1">
                {filteredRoster.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    {roster.length === 0 ? "No confirmed candidates for this event yet." : "No matching candidates found."}
                  </div>
                ) : (
                  filteredRoster.map((candidate) => {
                    const isPresent = candidate.attendanceStatus === "PRESENT" || candidate.attendanceStatus === "LATE";
                    return (
                      <div
                        key={candidate.applicationId}
                        className={`p-3 rounded-2xl border transition flex items-center justify-between gap-2 text-xs ${
                          isPresent
                            ? "bg-emerald-50/40 border-emerald-200"
                            : "bg-slate-50/60 border-slate-200/80 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-3 truncate">
                          <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden shrink-0 border border-slate-300">
                            {candidate.photoUrl ? (
                              <img src={candidate.photoUrl} alt={candidate.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center font-bold text-slate-500 text-xs">
                                {candidate.name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div className="truncate">
                            <span className="font-bold text-slate-900 block truncate">{candidate.name}</span>
                            <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                              <span>{candidate.registrationNumber}</span>
                              <span>•</span>
                              <span>{candidate.phone}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isPresent ? (
                            <div className="text-right">
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                {candidate.attendanceStatus}
                              </span>
                              {candidate.checkInTime && (
                                <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                                  {new Date(candidate.checkInTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true })}
                                </span>
                              )}
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={actionLoadingId === candidate.applicationId}
                              onClick={() => handleManualSpotMark(candidate.applicationId, candidate.studentId, "PRESENT")}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition disabled:opacity-50 cursor-pointer flex items-center gap-1"
                              title="Mark this candidate present immediately"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>{actionLoadingId === candidate.applicationId ? "..." : "Mark Present"}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
