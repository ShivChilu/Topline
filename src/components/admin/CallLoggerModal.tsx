"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Phone,
  PhoneCall,
  Check,
  CheckCircle,
  Clock,
  Copy,
  ExternalLink,
  UserCheck,
  UserX,
  Sparkles,
  AlertCircle,
} from "lucide-react";

export interface CallLoggerModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: any;
  initialCallRound?: 1 | 2;
  initialRound?: 1 | 2;
  onSaveCall?: (payload: {
    applicationId: string;
    callRound: 1 | 2;
    isDone: boolean;
    remarks: string;
    nextStatus?: string;
  }) => Promise<void>;
  onSave?: (data: {
    round: 1 | 2;
    remarks: string;
    updateStatus?: string;
  }) => Promise<void>;
  isProcessing?: boolean;
  isSaving?: boolean;
}

const CALL_REMARK_PRESETS = [
  { label: "Confirmed & Available", icon: "✅", color: "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100" },
  { label: "Ringing / No Answer", icon: "⏳", color: "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100" },
  { label: "Switched Off / Unreachable", icon: "📴", color: "bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100" },
  { label: "Busy / Call Back in 30 mins", icon: "🔄", color: "bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100" },
  { label: "Declined / Not Available", icon: "❌", color: "bg-red-50 text-red-700 border-red-300 hover:bg-red-100" },
  { label: "Confirmed for Lead Steward", icon: "👔", color: "bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100" },
  { label: "Wrong Number / Need Update", icon: "⚠️", color: "bg-orange-50 text-orange-700 border-orange-300 hover:bg-orange-100" },
];

export default function CallLoggerModal({
  isOpen,
  onClose,
  application,
  initialCallRound,
  initialRound,
  onSaveCall,
  onSave,
  isProcessing = false,
  isSaving = false,
}: CallLoggerModalProps) {
  const round = initialCallRound || initialRound || 1;
  const processing = isProcessing || isSaving;
  const [activeCallRound, setActiveCallRound] = useState<1 | 2>(round);
  const [remarks, setRemarks] = useState<string>("");
  const [isDone, setIsDone] = useState<boolean>(true);
  const [nextStatus, setNextStatus] = useState<string>("");
  const [copiedPhone, setCopiedPhone] = useState(false);

  useEffect(() => {
    if (isOpen && application) {
      const selectedRound = initialCallRound || initialRound || 1;
      setActiveCallRound(selectedRound);
      if (selectedRound === 1) {
        setRemarks(application.call1Remarks || "");
        setIsDone(application.call1Done !== undefined ? application.call1Done : true);
      } else {
        setRemarks(application.call2Remarks || "");
        setIsDone(application.call2Done !== undefined ? application.call2Done : true);
      }
      setNextStatus("");
    }
  }, [isOpen, application, initialCallRound, initialRound]);

  const handleSwitchRound = (round: 1 | 2) => {
    setActiveCallRound(round);
    if (round === 1) {
      setRemarks(application.call1Remarks || "");
      setIsDone(application.call1Done !== undefined ? application.call1Done : true);
    } else {
      setRemarks(application.call2Remarks || "");
      setIsDone(application.call2Done !== undefined ? application.call2Done : true);
    }
  };

  if (!isOpen || !application) return null;

  const candidateName = application.name || application.studentId?.name || "Student Candidate";
  const mobileNumber = application.mobileNumber || application.studentId?.phone || "";
  const regNo = application.registrationNumber || application.studentId?.registrationNumber || application.studentId?.universityId || "N/A";
  const university = application.university || application.studentId?.university || "";

  const handleCopyPhone = () => {
    if (!mobileNumber) return;
    navigator.clipboard.writeText(mobileNumber);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleApplyPreset = (presetLabel: string) => {
    setRemarks(presetLabel);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (onSave) {
      await onSave({
        round: activeCallRound,
        remarks: remarks.trim(),
        updateStatus: nextStatus || undefined,
      });
    } else if (onSaveCall) {
      await onSaveCall({
        applicationId: application._id || application.id,
        callRound: activeCallRound,
        isDone,
        remarks: remarks.trim(),
        nextStatus: nextStatus || undefined,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden flex flex-col shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-400 shadow-inner">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold flex items-center gap-2">
                <span>Candidate Call Logger</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  2-Call Verification
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Log Call 1 and Call 2 outcome, status remarks, and availability.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Candidate Mini Profile Card with Direct Phone Action */}
        <div className="bg-slate-100/90 p-4 border-b border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-extrabold text-slate-900 text-sm">{candidateName}</h4>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5 font-mono font-medium">
                <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                  {regNo}
                </span>
                {university && <span>• {university}</span>}
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-800 text-white shadow-2xs">
              {application.status}
            </span>
          </div>

          {/* Phone Dialer Bar */}
          <div className="bg-white rounded-xl p-2.5 border border-slate-200 flex items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4" />
              </div>
              <span className="text-sm font-extrabold text-slate-900 font-mono tracking-wider">
                {mobileNumber || "No Phone on Record"}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopyPhone}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 transition"
                title="Copy phone number"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedPhone ? "Copied!" : "Copy"}</span>
              </button>

              {mobileNumber && (
                <a
                  href={`tel:${mobileNumber}`}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-1 shadow transition"
                  title="Click to dial student immediately"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Call Now</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Round Switcher Tabs (Call 1 vs Call 2) */}
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleSwitchRound(1)}
              className={`p-3 rounded-2xl border text-left transition flex items-center justify-between ${
                activeCallRound === 1
                  ? "bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-500/20"
                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
              }`}
            >
              <div>
                <div className="font-extrabold text-xs flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  <span>1st Call (Call 1)</span>
                </div>
                <div className={`text-[11px] mt-0.5 ${activeCallRound === 1 ? "text-blue-100" : "text-slate-500"}`}>
                  {application.call1Done ? "✓ Completed" : "⏳ Not logged"}
                </div>
              </div>
              {application.call1Done && (
                <span className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  activeCallRound === 1 ? "bg-white text-blue-600" : "bg-blue-100 text-blue-700"
                }`}>
                  <Check className="w-3.5 h-3.5 stroke-3" />
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleSwitchRound(2)}
              className={`p-3 rounded-2xl border text-left transition flex items-center justify-between ${
                activeCallRound === 2
                  ? "bg-purple-600 text-white border-purple-600 shadow-md ring-2 ring-purple-500/20"
                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
              }`}
            >
              <div>
                <div className="font-extrabold text-xs flex items-center gap-1.5">
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>2nd Call (Call 2)</span>
                </div>
                <div className={`text-[11px] mt-0.5 ${activeCallRound === 2 ? "text-purple-100" : "text-slate-500"}`}>
                  {application.call2Done ? "✓ Completed" : "⏳ Follow-up / Pending"}
                </div>
              </div>
              {application.call2Done && (
                <span className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  activeCallRound === 2 ? "bg-white text-purple-600" : "bg-purple-100 text-purple-700"
                }`}>
                  <Check className="w-3.5 h-3.5 stroke-3" />
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 text-slate-900">
          {/* Done Checkbox Toggle */}
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-xl">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isDone}
                onChange={(e) => setIsDone(e.target.checked)}
                className="accent-blue-600 rounded w-4 h-4 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-800">
                Mark Call {activeCallRound} as Completed / Done
              </span>
            </label>
            <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
              isDone ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
            }`}>
              {isDone ? "Call Completed" : "Unmarked"}
            </span>
          </div>

          {/* Quick Preset Remarks Chips */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Quick Call Remarks:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CALL_REMARK_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleApplyPreset(preset.label)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition flex items-center gap-1 shadow-2xs ${preset.color} ${
                    remarks === preset.label ? "ring-2 ring-blue-500" : ""
                  }`}
                >
                  <span>{preset.icon}</span>
                  <span>{preset.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Remarks Input */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
              Call {activeCallRound} Remarks / Discussion Notes *
            </label>
            <textarea
              rows={3}
              required
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder={`e.g. Student confirmed available for evening duty, informed about black formal attire...`}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          {/* Optional Quick Status Decision */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
              Optional: Update Application Status
            </label>
            <select
              value={nextStatus}
              onChange={(e) => setNextStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600"
            >
              <option value="">Keep Current Status ({application.status})</option>
              <option value="SELECTED">✓ Approve & Select</option>
              <option value="ON_HOLD">⏸ Mark as Hold / Waitlist</option>
              <option value="NOT_SELECTED">✗ Mark as Not Selected / Reject</option>
              <option value="CONFIRMED">🎉 Mark Confirmed (Attending)</option>
            </select>
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
            <button
              type="button"
              disabled={isProcessing}
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isProcessing || !remarks.trim()}
              className="px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 transition shadow-md flex items-center gap-1.5 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>
                {isProcessing
                  ? "Saving..."
                  : `Save Call ${activeCallRound} & Remarks`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
