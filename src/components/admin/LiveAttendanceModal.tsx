"use client";

import React, { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";
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
  Radio,
  Search,
  UserCheck,
  Maximize2,
  Minimize2,
  Sparkles,
  Zap,
  Phone,
  PhoneOff,
  RotateCcw,
  Lock,
  AlertTriangle,
  Mail,
} from "lucide-react";

interface LiveAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventName: string;
  eventDate?: string;
  reportingTime?: string;
  onAttendanceChanged?: (updated?: { applicationId: string; studentId: string; status: "PRESENT" | "ABSENT" | "LATE" }) => void;
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
  const [fullscreenMode, setFullscreenMode] = useState(false);
  const [regeneratingToken, setRegeneratingToken] = useState(false);
  const [togglingToken, setTogglingToken] = useState(false);
  const [mobileTab, setMobileTab] = useState<"qr" | "feed" | "roster">("qr");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [canCloseAttendance, setCanCloseAttendance] = useState(false);

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchLiveAttendance = async (showLoading = false) => {
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      return;
    }
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
        if (data.canCloseAttendance !== undefined) {
          setCanCloseAttendance(Boolean(data.canCloseAttendance));
        }
      }
    } catch (err) {
      console.error("Failed to poll live attendance:", err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    fetchLiveAttendance(true);

    if (isLiveActive) {
      pollTimerRef.current = setInterval(() => {
        fetchLiveAttendance(false);
      }, 3000);
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isLiveActive) {
        fetchLiveAttendance(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isOpen, eventId, isLiveActive]);

  const attendanceToken = eventData?.attendanceToken || "";
  const isQrEnabled = eventData?.attendanceTokenEnabled || false;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const publicQrUrl = attendanceToken ? `${origin}/attendance/${attendanceToken}` : "";

  // Local, zero-latency QR data URL generation
  useEffect(() => {
    if (!attendanceToken || !publicQrUrl) {
      setQrDataUrl("");
      return;
    }
    QRCode.toDataURL(publicQrUrl, {
      width: 400,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#000000", light: "#ffffff" },
    })
      .then((url) => setQrDataUrl(url))
      .catch((e) => console.error("QR generation error:", e));
  }, [attendanceToken, publicQrUrl]);

  if (!isOpen) return null;

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
      // Optimistic update
      setEventData((prev: any) => prev ? { ...prev, attendanceTokenEnabled: enable } : prev);
      const res = await fetch(`/api/admin/events/${eventId}/attendance-qr`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendanceTokenEnabled: enable }),
      });
      const data = await res.json();
      if (data.success) {
        fetchLiveAttendance(false);
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
        fetchLiveAttendance(false);
        if (onAttendanceChanged) onAttendanceChanged();
      }
    } catch (err) {
      console.error("Regenerate QR error:", err);
    } finally {
      setRegeneratingToken(false);
    }
  };

  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [sendClosingEmails, setSendClosingEmails] = useState(true);
  const [closingAttendance, setClosingAttendance] = useState(false);
  const [closeSuccessMsg, setCloseSuccessMsg] = useState<string | null>(null);

  const handleCloseAttendanceSubmit = async () => {
    try {
      setClosingAttendance(true);
      const res = await fetch(`/api/admin/events/${eventId}/close-attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sendEmails: sendClosingEmails }),
      });
      const data = await res.json();
      if (data.success) {
        setCloseSuccessMsg(data.message);
        setTimeout(() => {
          setCloseModalOpen(false);
          setCloseSuccessMsg(null);
        }, 3000);
        fetchLiveAttendance(false);
        if (onAttendanceChanged) onAttendanceChanged();
      } else {
        alert(data.message || "Failed to close attendance.");
      }
    } catch (err) {
      console.error(err);
      alert("Error closing attendance.");
    } finally {
      setClosingAttendance(false);
    }
  };

  const handleManualSpotMark = async (applicationId: string, studentId: string, status: "PRESENT" | "ABSENT") => {
    const candidate = roster.find((c) => c.applicationId === applicationId || c.studentId === studentId);
    const nowIso = new Date().toISOString();

    // 1. INSTANT OPTIMISTIC LOCAL STATE UPDATE (<5ms)
    setRoster((prev) =>
      prev.map((c) => {
        if (c.applicationId === applicationId || c.studentId === studentId) {
          return {
            ...c,
            attendanceStatus: status,
            isAttended: status === "PRESENT",
            checkInTime: status === "PRESENT" ? nowIso : null,
          };
        }
        return c;
      })
    );

    // 2. INSTANT OPTIMISTIC STATS UPDATE
    setStats((prev) => {
      const deltaCheckedIn = status === "PRESENT" ? 1 : -1;
      const newCheckedIn = Math.max(0, Math.min(prev.totalConfirmed, prev.totalCheckedIn + deltaCheckedIn));
      const newMarkedPresent = Math.max(0, prev.markedPresent + deltaCheckedIn);
      const newPending = Math.max(0, prev.totalConfirmed - newCheckedIn);
      const newRate = prev.totalConfirmed > 0 ? Math.round((newCheckedIn / prev.totalConfirmed) * 100) : 0;
      return {
        ...prev,
        totalCheckedIn: newCheckedIn,
        markedPresent: newMarkedPresent,
        pendingCheckIn: newPending,
        turnoutRate: newRate,
      };
    });

    // 3. INSTANT OPTIMISTIC FEED UPDATE
    if (candidate && status === "PRESENT") {
      setLiveFeed((prev) => [
        {
          id: `opt-${Date.now()}`,
          studentName: candidate.name,
          registrationNumber: candidate.registrationNumber,
          status: "PRESENT",
          checkInTime: nowIso,
          remarks: "Admin Spot Check-In",
        },
        ...prev.slice(0, 19),
      ]);
    }

    // 4. INSTANT SILENT PARENT NOTIFICATION (Zero Full Page Blocking)
    if (onAttendanceChanged) {
      onAttendanceChanged({ applicationId, studentId, status });
    }

    // 5. SILENT BACKGROUND SERVER SYNC
    try {
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
      if (!data.success) {
        console.error("Attendance update failed on server:", data.message);
        // Rollback on server error
        fetchLiveAttendance(false);
      }
    } catch (err) {
      console.error("Manual spot mark background sync error:", err);
      // Rollback on network failure
      fetchLiveAttendance(false);
    }
  };

  // Auto-sort roster: Pending/Absent candidates stay at the TOP for quick calling/marking; Present candidates sink to the BOTTOM
  const filteredRoster = roster
    .filter((item) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        (item.name || "").toLowerCase().includes(q) ||
        (item.registrationNumber || "").toLowerCase().includes(q) ||
        (item.phone || "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const aPresent = a.attendanceStatus === "PRESENT" || a.attendanceStatus === "LATE";
      const bPresent = b.attendanceStatus === "PRESENT" || b.attendanceStatus === "LATE";
      if (aPresent !== bPresent) {
        return aPresent ? 1 : -1; // Non-present on TOP (0), Present at BOTTOM (1)
      }
      return (a.name || "").localeCompare(b.name || "");
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div
        className={`bg-white border-0 sm:border sm:border-slate-200 rounded-none sm:rounded-3xl w-full shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
          fullscreenMode ? "h-screen sm:h-[98vh] max-w-full sm:max-w-[98vw]" : "h-screen sm:h-auto sm:max-h-[92vh] max-w-6xl"
        }`}
      >
        {/* Header */}
        <div className="p-3.5 sm:p-5 md:p-6 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 text-white shrink-0">
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0 shadow-inner">
                <QrCode className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <h2 className="text-sm sm:text-lg md:text-xl font-black tracking-tight text-white truncate max-w-[200px] xs:max-w-[260px] sm:max-w-md">
                    {eventName}
                  </h2>
                  <span className="bg-red-500/20 text-red-300 border border-red-500/40 text-[9px] sm:text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping"></span>
                    Live Hub
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Close Attendance Button (Restricted to Superadmin / Authorized IAM) */}
              {canCloseAttendance && (
                <button
                  type="button"
                  onClick={() => setCloseModalOpen(true)}
                  className="px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-black bg-red-600 hover:bg-red-700 active:scale-95 text-white shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                  title="Finalize attendance session, put absent students on hold, and dispatch status emails"
                >
                  <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span className="hidden xs:inline">Close Attendance</span>
                  <span className="xs:hidden">Close</span>
                </button>
              )}

              {/* Live Auto-Refresh Toggle */}
              <button
                type="button"
                onClick={() => setIsLiveActive(!isLiveActive)}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition flex items-center gap-1 border ${
                  isLiveActive
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : "bg-white/10 text-slate-400 border-white/10 hover:bg-white/20"
                }`}
                title="Toggle automatic 3-second live refresh"
              >
                <Radio className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isLiveActive ? "text-emerald-400 animate-pulse" : "text-slate-400"}`} />
                <span className="hidden sm:inline">{isLiveActive ? "Live (3s)" : "Paused"}</span>
              </button>

              {/* Fullscreen Toggle (Hidden on small mobile) */}
              <button
                type="button"
                onClick={() => setFullscreenMode(!fullscreenMode)}
                className="hidden sm:flex p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition"
                title={fullscreenMode ? "Exit Fullscreen" : "Fullscreen"}
              >
                {fullscreenMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              {/* Close */}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 sm:p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
                title="Close Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Sub-header Event Meta */}
          <div className="flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs text-slate-300 mt-2 font-medium flex-wrap">
            {eventDate && <span>Date: {new Date(eventDate).toLocaleDateString("en-GB")}</span>}
            {reportingTime && <span>• Report: {reportingTime}</span>}
            <span>• {stats.totalConfirmed} Confirmed</span>
          </div>
        </div>

        {/* Real-time Metric Cards Banner (Ultra-Compact Single-Row on Mobile & Desktop) */}
        <div className="grid grid-cols-4 gap-1.5 sm:gap-3 p-2 sm:p-3 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="bg-white p-1.5 sm:p-2.5 rounded-xl border border-slate-200 shadow-2xs text-center sm:text-left">
            <span className="text-[8px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block truncate">Confirmed</span>
            <div className="text-sm sm:text-lg font-black text-slate-900 mt-0.5 leading-none">{stats.totalConfirmed}</div>
            <span className="hidden sm:block text-[9px] text-slate-400 font-medium truncate mt-0.5">Accepted</span>
          </div>

          <div className="bg-white p-1.5 sm:p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/30 shadow-2xs text-center sm:text-left">
            <span className="text-[8px] sm:text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider block truncate">Present</span>
            <div className="text-sm sm:text-lg font-black text-emerald-600 mt-0.5 leading-none flex items-baseline justify-center sm:justify-start gap-0.5">
              <span>{stats.markedPresent}</span>
              {stats.markedLate > 0 && <span className="text-[9px] text-amber-600 font-bold">({stats.markedLate}L)</span>}
            </div>
            <span className="hidden sm:block text-[9px] text-emerald-600 font-medium truncate mt-0.5">Checked-in</span>
          </div>

          <div className="bg-white p-1.5 sm:p-2.5 rounded-xl border border-amber-200 bg-amber-50/30 shadow-2xs text-center sm:text-left">
            <span className="text-[8px] sm:text-[10px] font-extrabold text-amber-700 uppercase tracking-wider block truncate">Pending</span>
            <div className="text-sm sm:text-lg font-black text-amber-600 mt-0.5 leading-none">{stats.pendingCheckIn}</div>
            <span className="hidden sm:block text-[9px] text-amber-600 font-medium truncate mt-0.5">Yet to Scan</span>
          </div>

          <div className="bg-white p-1.5 sm:p-2.5 rounded-xl border border-blue-200 bg-blue-50/30 shadow-2xs text-center sm:text-left">
            <span className="text-[8px] sm:text-[10px] font-extrabold text-blue-700 uppercase tracking-wider block truncate">Turnout</span>
            <div className="text-sm sm:text-lg font-black text-blue-600 mt-0.5 leading-none">{stats.turnoutRate}%</div>
            <div className="w-full bg-slate-100 rounded-full h-1 mt-1 overflow-hidden hidden sm:block">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, stats.turnoutRate)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Mobile Tab Switcher (Visible on Mobile & Tablets, Hidden on Desktop lg+) */}
        <div className="flex lg:hidden items-center bg-slate-100 p-1.5 border-b border-slate-200 shrink-0">
          <button
            type="button"
            onClick={() => setMobileTab("qr")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
              mobileTab === "qr"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <QrCode className="w-3.5 h-3.5 text-red-600" />
            <span>QR Scanner</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("feed")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
              mobileTab === "feed"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Live Feed ({liveFeed.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("roster")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
              mobileTab === "roster"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Users className="w-3.5 h-3.5 text-blue-600" />
            <span>Roster ({roster.length})</span>
          </button>
        </div>

        {/* Modal Body: Multi-column on Desktop / Tabbed on Mobile */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 md:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
            
            {/* ---------------------------------------------------- */}
            {/* LEFT SECTION: QR Code Display & Controls (5 Cols) */}
            {/* ---------------------------------------------------- */}
            <div className={`lg:col-span-5 space-y-4 ${mobileTab === "qr" ? "block" : "hidden lg:block"}`}>
              <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-center flex flex-col items-center justify-center space-y-3.5 sm:space-y-4 shadow-sm relative overflow-hidden">
                {/* QR Status Pill */}
                <div className="flex items-center justify-between w-full">
                  <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-slate-400">Attendance QR</span>
                  <span
                    className={`text-[10px] sm:text-[11px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
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
                <div className="p-2 sm:p-3 bg-white rounded-2xl border-2 border-slate-900 shadow-md relative group max-w-full">
                  {attendanceToken && isQrEnabled && qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="Event Attendance QR Code"
                      className="w-48 h-48 sm:w-56 sm:h-56 object-contain rounded-xl max-w-full"
                    />
                  ) : attendanceToken && isQrEnabled && !qrDataUrl ? (
                    <div className="w-48 h-48 sm:w-56 sm:h-56 bg-slate-50 rounded-xl flex flex-col items-center justify-center p-4 text-center max-w-full">
                      <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mb-2" />
                      <span className="text-xs font-bold text-slate-700">Generating QR...</span>
                    </div>
                  ) : (
                    <div className="w-48 h-48 sm:w-56 sm:h-56 bg-slate-100 rounded-xl flex flex-col items-center justify-center p-4 text-center max-w-full">
                      <QrCode className="w-10 h-10 sm:w-12 sm:h-12 text-slate-300 mb-2" />
                      <span className="text-xs font-bold text-slate-700">QR Code Inactive</span>
                      <span className="text-[10px] sm:text-[11px] text-slate-400 mt-1">Activate below to allow student scans</span>
                    </div>
                  )}
                </div>

                {/* Short Token Display */}
                {attendanceToken && (
                  <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-2">
                    <div className="text-left min-w-0">
                      <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase block">Event Check-In Code</span>
                      <span className="font-mono text-[11px] sm:text-xs font-extrabold text-slate-800 tracking-wider truncate block">
                        {attendanceToken.slice(0, 14)}...
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="px-2.5 py-1 text-xs font-bold bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg transition flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? "Copied" : "Copy"}</span>
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
                      {togglingToken ? "Updating..." : "Activate QR"}
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={regeneratingToken}
                    onClick={handleRegenerateToken}
                    className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${regeneratingToken ? "animate-spin" : ""}`} />
                    <span>{regeneratingToken ? "..." : "New Code"}</span>
                  </button>
                </div>

                {publicQrUrl && (
                  <a
                    href={publicQrUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-red-600 hover:text-red-700 font-bold flex items-center gap-1 transition pt-1"
                  >
                    <span>Open Public Check-In Page</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            {/* ---------------------------------------------------- */}
            {/* RIGHT SECTION: Live Stream Feed & Candidate Roster (7 Cols) */}
            {/* ---------------------------------------------------- */}
            <div className={`lg:col-span-7 space-y-4 flex flex-col ${mobileTab !== "qr" ? "block" : "hidden lg:block"}`}>
              
              {/* 1. Live Check-in Feed Ticker */}
              <div className={`bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-5 text-white shadow-md ${mobileTab === "roster" ? "hidden lg:block" : "block"}`}>
                <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">Real-Time Check-In Stream</h3>
                  </div>
                  <span className="text-[10px] sm:text-[11px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    {liveFeed.length} Scanned
                  </span>
                </div>

                <div className="mt-2.5 sm:mt-3 space-y-2 max-h-40 sm:max-h-44 overflow-y-auto pr-1">
                  {liveFeed.length === 0 ? (
                    <div className="text-center py-5 sm:py-6 text-slate-400 text-xs italic">
                      Waiting for students to scan QR code... incoming check-ins will show here live!
                    </div>
                  ) : (
                    liveFeed.slice(0, 15).map((log) => (
                      <div
                        key={log.id}
                        className="p-2 sm:p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs animate-in slide-in-from-top-1"
                      >
                        <div className="flex items-center gap-2 sm:gap-2.5 truncate">
                          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px] sm:text-[11px] shrink-0 border border-emerald-500/30">
                            ✓
                          </div>
                          <div className="truncate">
                            <span className="font-bold text-white block truncate">{log.studentName}</span>
                            <span className="text-[9px] sm:text-[10px] text-slate-400 font-mono">{log.registrationNumber}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`text-[9px] sm:text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                            log.attendanceStatus === "LATE"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                              : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          }`}>
                            {log.attendanceStatus}
                          </span>
                          <span className="block text-[9px] sm:text-[10px] text-slate-400 font-mono mt-0.5">
                            {new Date(log.checkInTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 2. Confirmed Roster with Spot Manual Check-In */}
              <div className={`bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm flex-1 flex flex-col ${mobileTab === "feed" ? "hidden lg:flex" : "flex"}`}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-xs sm:text-sm font-extrabold text-slate-900">Confirmed Candidate Roster</h3>
                    <p className="text-[11px] text-slate-400">
                      Unmarked at top • 1-tap call & instant spot check-in
                    </p>
                  </div>

                  {/* Search candidate */}
                  <div className="relative w-full sm:w-52">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search candidate or phone..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600"
                    />
                  </div>
                </div>

                {/* Roster List */}
                <div className="mt-2.5 space-y-1.5 max-h-[55vh] sm:max-h-[60vh] overflow-y-auto pr-1 flex-1">
                  {filteredRoster.length === 0 ? (
                    <div className="text-center py-6 sm:py-8 text-slate-400 text-xs">
                      {roster.length === 0 ? "No confirmed candidates for this event yet." : "No matching candidates found."}
                    </div>
                  ) : (
                    filteredRoster.map((candidate) => {
                      const isPresent = candidate.attendanceStatus === "PRESENT" || candidate.attendanceStatus === "LATE";
                      const cleanPhone = (candidate.phone || "").replace(/\D/g, "");

                      return (
                        <div
                          key={candidate.applicationId}
                          className={`p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border transition flex items-center justify-between gap-2 text-xs ${
                            isPresent
                              ? "bg-slate-50/50 border-slate-200/60 opacity-80"
                              : "bg-white border-slate-200 shadow-2xs hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-2 sm:gap-2.5 truncate min-w-0">
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-200 overflow-hidden shrink-0 border border-slate-300">
                              {candidate.photoUrl ? (
                                <img src={candidate.photoUrl} alt={candidate.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center font-bold text-slate-500 text-xs">
                                  {candidate.name.charAt(0)}
                                </div>
                              )}
                            </div>
                            <div className="truncate min-w-0">
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="font-bold text-slate-900 truncate text-xs">{candidate.name}</span>
                              </div>
                              <div className="text-[10px] sm:text-[11px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className="truncate">{candidate.registrationNumber}</span>
                                {cleanPhone ? (
                                  <>
                                    <span>•</span>
                                    <a
                                      href={`tel:${cleanPhone}`}
                                      onClick={(e) => e.stopPropagation()}
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded font-semibold text-[10px] transition active:scale-95"
                                      title={`Click to call ${candidate.name} (${candidate.phone})`}
                                    >
                                      <Phone className="w-2.5 h-2.5 text-emerald-600 fill-emerald-600/30" />
                                      <span>{candidate.phone}</span>
                                    </a>
                                  </>
                                ) : (
                                  <span>• No phone</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* 1-Tap Call Icon Shortcut */}
                            {cleanPhone && (
                              <a
                                href={`tel:${cleanPhone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="w-8 h-8 sm:w-9 sm:h-9 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl transition flex items-center justify-center shrink-0 shadow-2xs hover:scale-105 active:scale-95"
                                title={`1-Tap Call ${candidate.name}`}
                              >
                                <Phone className="w-4 h-4 text-emerald-600 fill-emerald-600/20" />
                              </a>
                            )}

                            {isPresent ? (
                              <div className="flex items-center gap-1.5">
                                <div className="text-right">
                                  <span className="px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    {candidate.attendanceStatus}
                                  </span>
                                  {candidate.checkInTime && (
                                    <span className="block text-[8px] sm:text-[9px] text-slate-400 font-mono">
                                      {new Date(candidate.checkInTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true })}
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleManualSpotMark(candidate.applicationId, candidate.studentId, "ABSENT")}
                                  className="px-2 py-1.5 bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-700 border border-rose-200 hover:border-rose-300 rounded-xl text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                                  title="Marked by mistake? Click to revert to Absent"
                                >
                                  <RotateCcw className="w-3 h-3 text-rose-600" />
                                  <span>Absent</span>
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleManualSpotMark(candidate.applicationId, candidate.studentId, "PRESENT")}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-black shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                                title="Mark candidate present immediately"
                              >
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                <span>Present</span>
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

      {/* Close Attendance Confirmation Modal */}
      {closeModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 text-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5 text-red-600">
                <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center text-red-600 font-bold border border-red-200 shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-black text-slate-900 leading-tight">Close &amp; Finalize Attendance</h3>
                  <p className="text-xs text-slate-400 font-medium truncate">Event: {eventName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCloseModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {closeSuccessMsg ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="text-base font-black text-slate-900">Attendance Finalized!</h4>
                <p className="text-xs text-slate-600 px-4">{closeSuccessMsg}</p>
              </div>
            ) : (
              <>
                {/* Summary Metric Stats */}
                <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Confirmed</span>
                    <span className="text-lg font-black text-slate-900">{stats.totalConfirmed}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-emerald-600 uppercase block">Present</span>
                    <span className="text-lg font-black text-emerald-600">{stats.markedPresent}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-rose-600 uppercase block">Absent (Hold)</span>
                    <span className="text-lg font-black text-rose-600">{stats.pendingCheckIn}</span>
                  </div>
                </div>

                {/* Business Logic Explanations */}
                <div className="space-y-2 text-xs text-slate-600 bg-amber-50/70 border border-amber-200 p-3.5 rounded-2xl">
                  <div className="flex items-start gap-2 text-amber-900 font-semibold">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>Closing attendance executes the following:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-slate-700 text-[11px] pl-1">
                    <li>QR Scanner session is deactivated immediately.</li>
                    <li><strong>{stats.markedPresent} Present</strong> candidates are marked as <strong>ATTENDED</strong>.</li>
                    <li><strong>{stats.pendingCheckIn} Absent</strong> candidates are marked as <strong>ABSENT</strong> and their student profiles are placed <strong>ON HOLD</strong> (future registrations restricted).</li>
                    <li>Absent students receive instructions to submit valid reasons / emergencies to admin on WhatsApp (<strong>7986955634</strong>).</li>
                  </ul>
                </div>

                {/* Email Notification Checkbox */}
                <label className="flex items-start gap-3 p-3 rounded-2xl border border-slate-200 bg-slate-50/60 cursor-pointer hover:bg-slate-50 transition">
                  <input
                    type="checkbox"
                    checked={sendClosingEmails}
                    onChange={(e) => setSendClosingEmails(e.target.checked)}
                    className="w-4 h-4 rounded text-red-600 focus:ring-red-500 mt-0.5 cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="font-extrabold text-slate-900 block">Send Automated Status Emails</span>
                    <span className="text-slate-500 text-[11px]">
                      Present students receive their dashboard link; absent students receive the Account On-Hold notification &amp; WhatsApp appeal button.
                    </span>
                  </div>
                </label>

                {/* Action Buttons */}
                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    disabled={closingAttendance}
                    onClick={() => setCloseModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={closingAttendance}
                    onClick={handleCloseAttendanceSubmit}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    {closingAttendance ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Closing Attendance...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>Confirm &amp; Finalize Attendance</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
