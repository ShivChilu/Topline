"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Share2,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Eye,
  EyeOff,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  Users,
  Settings2,
  Lock,
} from "lucide-react";

interface ClientShareModalProps {
  eventId: string;
  eventName: string;
  isOpen: boolean;
  onClose: () => void;
}

const AVAILABLE_FIELDS = [
  { id: "photos", label: "Candidate Photos (Formal & Full-Length)", icon: "📸", default: true },
  { id: "name", label: "Full Name", icon: "👤", default: true },
  { id: "height", label: "Height (cm / ft)", icon: "📏", default: true },
  { id: "gender", label: "Gender", icon: "⚧", default: true },
  { id: "attendanceStatus", label: "Duty Attendance (Present / Absent / Confirmed Badge)", icon: "✅", default: false },
  { id: "university", label: "University / College", icon: "🎓", default: false },
  { id: "city", label: "City / Hometown", icon: "📍", default: false },
  { id: "age", label: "Age", icon: "🎂", default: false },
  { id: "course", label: "Degree Course & Year", icon: "📚", default: false },
  {
    id: "phone",
    label: "Phone Number",
    icon: "📞",
    default: false,
    warning: "Keep disabled to protect student privacy unless client needs direct contact",
  },
];

export default function ClientShareModal({
  eventId,
  eventName,
  isOpen,
  onClose,
}: ClientShareModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Share Settings State
  const [token, setToken] = useState<string>("");
  const [enabled, setEnabled] = useState<boolean>(true);
  const [title, setTitle] = useState<string>("");
  const [selectedFields, setSelectedFields] = useState<string[]>(["name", "photos", "height", "gender"]);
  const [candidateStatus, setCandidateStatus] = useState<string[]>(["CONFIRMED"]);
  const [customNotes, setCustomNotes] = useState<string>("");
  const [candidateCount, setCandidateCount] = useState<number>(0);
  const [counts, setCounts] = useState<{
    confirmed: number;
    selected: number;
    present: number;
    absent: number;
    confirmedAndSelected: number;
    presentAndConfirmed: number;
  }>({
    confirmed: 0,
    selected: 0,
    present: 0,
    absent: 0,
    confirmedAndSelected: 0,
    presentAndConfirmed: 0,
  });

  // Copy Feedback
  const [copied, setCopied] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Compute live active count based on current selection
  const activeCount = useMemo(() => {
    if (candidateStatus.length === 1 && (candidateStatus[0] === "ATTENDED" || candidateStatus[0] === "PRESENT")) {
      return counts.present;
    }
    if (candidateStatus.includes("ATTENDED") && candidateStatus.includes("CONFIRMED") && !candidateStatus.includes("SELECTED") && !candidateStatus.includes("ABSENT")) {
      return counts.presentAndConfirmed;
    }
    if (candidateStatus.length === 1 && candidateStatus[0] === "CONFIRMED") {
      return counts.confirmed;
    }
    if (candidateStatus.includes("CONFIRMED") && candidateStatus.includes("SELECTED") && !candidateStatus.includes("ATTENDED") && !candidateStatus.includes("ABSENT")) {
      return counts.confirmedAndSelected;
    }
    if (candidateStatus.length === 1 && candidateStatus[0] === "ABSENT") {
      return counts.absent;
    }
    if (candidateStatus.includes("SELECTED") && candidateStatus.includes("CONFIRMED") && candidateStatus.includes("ATTENDED")) {
      return counts.selected + counts.confirmed + counts.present;
    }
    return candidateCount;
  }, [candidateStatus, counts, candidateCount]);

  useEffect(() => {
    if (!isOpen || !eventId) return;

    async function fetchShareSettings() {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/events/${eventId}/client-share`);
        const data = await res.json();
        if (data.success && data.share) {
          setToken(data.share.token || "");
          setEnabled(data.share.enabled ?? true);
          setTitle(data.share.title || eventName || "");
          setSelectedFields(data.share.fields || ["name", "photos", "height", "gender"]);
          setCandidateStatus(data.share.candidateStatus || ["CONFIRMED"]);
          setCustomNotes(data.share.customNotes || "");
          setCandidateCount(data.share.candidateCount || 0);
          if (data.share.counts) {
            setCounts(data.share.counts);
          }
        }
      } catch (err) {
        console.error("Failed to load share settings:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchShareSettings();
  }, [isOpen, eventId, eventName]);

  if (!isOpen) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const shareableUrl = token ? `${origin}/s/${token}` : "";

  const handleCopyLink = () => {
    if (!shareableUrl) return;
    navigator.clipboard.writeText(shareableUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const toggleField = (fieldId: string) => {
    setSelectedFields((prev) =>
      prev.includes(fieldId) ? prev.filter((f) => f !== fieldId) : [...prev, fieldId]
    );
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      setSavedSuccess(false);
      const res = await fetch(`/api/admin/events/${eventId}/client-share`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          title,
          fields: selectedFields,
          candidateStatus,
          customNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSavedSuccess(true);
        if (data.share?.candidateCount !== undefined) {
          setCandidateCount(data.share.candidateCount);
        }
        if (data.share?.counts) {
          setCounts(data.share.counts);
        }
        setTimeout(() => setSavedSuccess(false), 3000);
      } else {
        alert(data.message || "Failed to save settings");
      }
    } catch (err: any) {
      console.error("Save share settings error:", err);
      alert("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleResetToken = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to RESET this link?\n\nThis will generate a brand new random link. The old link will immediately stop working and will no longer be accessible to anyone."
    );
    if (!confirmed) return;

    try {
      setResetting(true);
      const res = await fetch(`/api/admin/events/${eventId}/client-share`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success && data.share) {
        setToken(data.share.token);
        setEnabled(true);
        alert("Link reset successfully! The previous link is now permanently expired.");
      } else {
        alert(data.message || "Failed to reset link");
      }
    } catch (err: any) {
      console.error("Reset token error:", err);
      alert("Failed to reset link. Please try again.");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-purple-50 via-white to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Share Crew Showcase with Client
              </h2>
              <p className="text-xs text-slate-500">
                Generate an anonymous, secure link showing only the candidate fields you choose
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {loading ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="font-bold text-slate-600">Loading showcase configuration...</p>
            </div>
          ) : (
            <>
              {/* 1. Shareable Link Box & Active Toggle */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span>Client Share Link</span>
                  </span>

                  {/* Enable / Disable Switch */}
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-xs select-none">
                    <span className={enabled ? "text-emerald-600" : "text-slate-400"}>
                      {enabled ? "Active (Client Can View)" : "Disabled (Link Inactive)"}
                    </span>
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => setEnabled(e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                        enabled ? "bg-emerald-600" : "bg-slate-300"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                          enabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </div>
                  </label>
                </div>

                {/* Link URL Bar */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 select-all truncate">
                    {shareableUrl}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-extrabold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-white" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                  <a
                    href={shareableUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl transition cursor-pointer"
                    title="Open in new tab to see client preview"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                {/* Reset / Revoke Link */}
                <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                  <span>Anyone with this link can view the selected candidates without login.</span>
                  <button
                    type="button"
                    onClick={handleResetToken}
                    disabled={resetting}
                    className="text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 hover:underline transition cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${resetting ? "animate-spin" : ""}`} />
                    <span>Reset Link</span>
                  </button>
                </div>
              </div>

              {/* 2. Choose Fields to Share */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                      Visible Fields for Client
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Check only the fields you wish to reveal. All other details stay strictly private.
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                    {selectedFields.length} Fields Enabled
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {AVAILABLE_FIELDS.map((f) => {
                    const isChecked = selectedFields.includes(f.id);
                    return (
                      <label
                        key={f.id}
                        onClick={() => toggleField(f.id)}
                        className={`border rounded-xl p-3 flex items-start gap-2.5 transition cursor-pointer select-none ${
                          isChecked
                            ? "bg-purple-50/60 border-purple-300 text-slate-900"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // handled by parent onClick
                          className="mt-0.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500 accent-purple-600"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-xs flex items-center gap-1.5">
                            <span>{f.icon}</span>
                            <span>{f.label}</span>
                          </span>
                          {f.warning && (
                            <p className="text-[10px] text-amber-700 font-medium mt-0.5 leading-snug">
                              {f.warning}
                            </p>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 3. Candidate Status Filter */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <span>Which Candidates to Display</span>
                    <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                      {activeCount} Active
                    </span>
                  </h3>
                </div>

                {/* Filter Presets Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {/* 1. Present / Attended Only */}
                  <label
                    onClick={() => setCandidateStatus(["ATTENDED"])}
                    className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                      candidateStatus.length === 1 && (candidateStatus[0] === "ATTENDED" || candidateStatus[0] === "PRESENT")
                        ? "bg-emerald-50/80 border-emerald-500 shadow-xs ring-1 ring-emerald-500"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="candidateStatusPreset"
                      checked={candidateStatus.length === 1 && (candidateStatus[0] === "ATTENDED" || candidateStatus[0] === "PRESENT")}
                      onChange={() => setCandidateStatus(["ATTENDED"])}
                      className="mt-0.5 accent-emerald-600 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-black text-slate-900 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <span>Present Students Only</span>
                        </span>
                        <span className="font-mono font-black text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-1.5 py-0.2 rounded text-[10.5px]">
                          {counts.present}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                        Show only verified candidates marked Present on duty
                      </p>
                    </div>
                  </label>

                  {/* 2. Present + Confirmed */}
                  <label
                    onClick={() => setCandidateStatus(["ATTENDED", "CONFIRMED"])}
                    className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                      candidateStatus.includes("ATTENDED") && candidateStatus.includes("CONFIRMED") && !candidateStatus.includes("SELECTED") && !candidateStatus.includes("ABSENT")
                        ? "bg-teal-50/80 border-teal-500 shadow-xs ring-1 ring-teal-500"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="candidateStatusPreset"
                      checked={candidateStatus.includes("ATTENDED") && candidateStatus.includes("CONFIRMED") && !candidateStatus.includes("SELECTED") && !candidateStatus.includes("ABSENT")}
                      onChange={() => setCandidateStatus(["ATTENDED", "CONFIRMED"])}
                      className="mt-0.5 accent-teal-600 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-black text-slate-900 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                          <span>Present + Confirmed</span>
                        </span>
                        <span className="font-mono font-black text-teal-800 bg-teal-100/90 border border-teal-300 px-1.5 py-0.2 rounded text-[10.5px]">
                          {counts.presentAndConfirmed}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                        Students on duty plus accepted upcoming arrivals
                      </p>
                    </div>
                  </label>

                  {/* 3. Confirmed Candidates Only */}
                  <label
                    onClick={() => setCandidateStatus(["CONFIRMED"])}
                    className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                      candidateStatus.length === 1 && candidateStatus[0] === "CONFIRMED"
                        ? "bg-purple-50/80 border-purple-500 shadow-xs ring-1 ring-purple-500"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="candidateStatusPreset"
                      checked={candidateStatus.length === 1 && candidateStatus[0] === "CONFIRMED"}
                      onChange={() => setCandidateStatus(["CONFIRMED"])}
                      className="mt-0.5 accent-purple-600 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-black text-slate-900 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          <span>Confirmed Only</span>
                        </span>
                        <span className="font-mono font-black text-blue-800 bg-blue-100/90 border border-blue-300 px-1.5 py-0.2 rounded text-[10.5px]">
                          {counts.confirmed}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                        Candidates who confirmed duty availability
                      </p>
                    </div>
                  </label>

                  {/* 4. Confirmed + Selected */}
                  <label
                    onClick={() => setCandidateStatus(["CONFIRMED", "SELECTED"])}
                    className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                      candidateStatus.includes("CONFIRMED") && candidateStatus.includes("SELECTED") && !candidateStatus.includes("ATTENDED") && !candidateStatus.includes("ABSENT")
                        ? "bg-purple-50/80 border-purple-500 shadow-xs ring-1 ring-purple-500"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="candidateStatusPreset"
                      checked={candidateStatus.includes("CONFIRMED") && candidateStatus.includes("SELECTED") && !candidateStatus.includes("ATTENDED") && !candidateStatus.includes("ABSENT")}
                      onChange={() => setCandidateStatus(["CONFIRMED", "SELECTED"])}
                      className="mt-0.5 accent-purple-600 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-black text-slate-900 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                          <span>Confirmed + Selected</span>
                        </span>
                        <span className="font-mono font-black text-purple-800 bg-purple-100/90 border border-purple-300 px-1.5 py-0.2 rounded text-[10.5px]">
                          {counts.confirmedAndSelected}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                        All shortlisted candidates including pending RSVPs
                      </p>
                    </div>
                  </label>

                  {/* 5. Absent Students Only */}
                  <label
                    onClick={() => setCandidateStatus(["ABSENT"])}
                    className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                      candidateStatus.length === 1 && candidateStatus[0] === "ABSENT"
                        ? "bg-rose-50/80 border-rose-500 shadow-xs ring-1 ring-rose-500"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="candidateStatusPreset"
                      checked={candidateStatus.length === 1 && candidateStatus[0] === "ABSENT"}
                      onChange={() => setCandidateStatus(["ABSENT"])}
                      className="mt-0.5 accent-rose-600 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-black text-slate-900 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                          <span>Absent Students Only</span>
                        </span>
                        <span className="font-mono font-black text-rose-800 bg-rose-100/90 border border-rose-300 px-1.5 py-0.2 rounded text-[10.5px]">
                          {counts.absent}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                        Candidates who were marked absent / did not report
                      </p>
                    </div>
                  </label>

                  {/* 6. All Active Candidates (Selected + Confirmed + Present) */}
                  <label
                    onClick={() => setCandidateStatus(["SELECTED", "CONFIRMED", "ATTENDED"])}
                    className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                      candidateStatus.includes("SELECTED") && candidateStatus.includes("CONFIRMED") && candidateStatus.includes("ATTENDED") && !candidateStatus.includes("ABSENT")
                        ? "bg-slate-100 border-slate-700 shadow-xs ring-1 ring-slate-700"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="candidateStatusPreset"
                      checked={candidateStatus.includes("SELECTED") && candidateStatus.includes("CONFIRMED") && candidateStatus.includes("ATTENDED") && !candidateStatus.includes("ABSENT")}
                      onChange={() => setCandidateStatus(["SELECTED", "CONFIRMED", "ATTENDED"])}
                      className="mt-0.5 accent-slate-800 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-black text-slate-900 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-slate-700"></span>
                          <span>All Active Candidates</span>
                        </span>
                        <span className="font-mono font-black text-slate-800 bg-slate-200 px-1.5 py-0.2 rounded text-[10.5px]">
                          {counts.selected + counts.confirmed + counts.present}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                        Selected, Confirmed, and Present on duty
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* 4. Custom Client Note / Grooming Brief (Optional) */}
              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-900 text-xs uppercase tracking-wider block">
                  Coordinator Notes for Client (Optional)
                </label>
                <input
                  type="text"
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="e.g. Verified for banquet service &bull; Clean shaven &bull; Black shoes &amp; socks"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-600 focus:bg-white transition"
                />
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div>
            {savedSuccess && (
              <span className="text-emerald-700 font-bold text-xs flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Settings saved &amp; live!</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={saving || loading}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-extrabold rounded-xl text-xs shadow-md transition cursor-pointer disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Showcase Settings"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
