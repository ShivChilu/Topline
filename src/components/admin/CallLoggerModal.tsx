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
  Sparkles,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  UserCheck,
  UserX,
  PhoneForwarded,
  PhoneMissed,
  PhoneOff,
  FileText,
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
    advanceToNext?: boolean;
  }) => Promise<void>;
  onNext?: () => void;
  onPrev?: () => void;
  currentIndex?: number;
  totalCount?: number;
  isProcessing?: boolean;
  isSaving?: boolean;
}

interface QuickOutcome {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  remarks: string;
  targetStatus?: string;
  statusBadge: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}

const QUICK_OUTCOMES: QuickOutcome[] = [
  {
    id: "confirmed",
    label: "Confirmed & Attending",
    icon: CheckCircle,
    remarks: "Confirmed available and attending event",
    targetStatus: "CONFIRMED",
    statusBadge: "CONFIRMED",
    colorClass: "text-emerald-700",
    bgClass: "bg-emerald-50 hover:bg-emerald-100/90 active:bg-emerald-200",
    borderClass: "border-emerald-300",
  },
  {
    id: "selected_ready",
    label: "Approved & Selected",
    icon: UserCheck,
    remarks: "Candidate verified & selected for roster",
    targetStatus: "SELECTED",
    statusBadge: "SELECTED",
    colorClass: "text-blue-700",
    bgClass: "bg-blue-50 hover:bg-blue-100/90 active:bg-blue-200",
    borderClass: "border-blue-300",
  },
  {
    id: "ringing",
    label: "Ringing / No Answer",
    icon: PhoneMissed,
    remarks: "Ringing, candidate did not answer call",
    statusBadge: "Keep Status",
    colorClass: "text-amber-700",
    bgClass: "bg-amber-50 hover:bg-amber-100/90 active:bg-amber-200",
    borderClass: "border-amber-300",
  },
  {
    id: "callback",
    label: "Busy / Call Later",
    icon: PhoneForwarded,
    remarks: "Busy at the moment, requested call back later",
    statusBadge: "Keep Status",
    colorClass: "text-sky-700",
    bgClass: "bg-sky-50 hover:bg-sky-100/90 active:bg-sky-200",
    borderClass: "border-sky-300",
  },
  {
    id: "unreachable",
    label: "Switched Off / Unreachable",
    icon: PhoneOff,
    remarks: "Phone switched off / network unreachable",
    statusBadge: "Keep Status",
    colorClass: "text-purple-700",
    bgClass: "bg-purple-50 hover:bg-purple-100/90 active:bg-purple-200",
    borderClass: "border-purple-300",
  },
  {
    id: "declined",
    label: "Declined / Not Available",
    icon: UserX,
    remarks: "Declined, not available for event date",
    targetStatus: "CANCELLED",
    statusBadge: "CANCELLED",
    colorClass: "text-rose-700",
    bgClass: "bg-rose-50 hover:bg-rose-100/90 active:bg-rose-200",
    borderClass: "border-rose-300",
  },
];

const PRESET_TAGS = [
  "Confirmed for Lead Steward",
  "First Time Participant",
  "Informed about Timings & Uniform",
  "Recheck Availability Tomorrow",
  "Wrong Phone Number",
];

export default function CallLoggerModal({
  isOpen,
  onClose,
  application,
  initialCallRound,
  initialRound,
  onSaveCall,
  onSave,
  onNext,
  onPrev,
  currentIndex,
  totalCount,
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
      const selectedRound = initialCallRound || initialRound || (application.call1Done ? 2 : 1);
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

  const handleSwitchRound = (targetRound: 1 | 2) => {
    setActiveCallRound(targetRound);
    if (targetRound === 1) {
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
  const cleanPhone = mobileNumber.replace(/\D/g, "");
  const regNo =
    application.registrationNumber ||
    application.studentId?.registrationNumber ||
    application.studentId?.universityId ||
    "N/A";
  const university = application.university || application.studentId?.university || "";
  const gender = application.gender || application.studentId?.gender || "";

  const handleCopyPhone = () => {
    if (!mobileNumber) return;
    navigator.clipboard.writeText(mobileNumber);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  // 1-Tap Quick Action Execution: Logs call + sets remarks + status + saves immediately
  const handleQuickOutcomeClick = async (outcome: QuickOutcome) => {
    const finalRemarks = outcome.remarks;
    const finalStatus = outcome.targetStatus || undefined;

    setRemarks(finalRemarks);
    if (finalStatus) setNextStatus(finalStatus);

    if (onSave) {
      await onSave({
        round: activeCallRound,
        remarks: finalRemarks,
        updateStatus: finalStatus,
        advanceToNext: !!onNext,
      });
    } else if (onSaveCall) {
      await onSaveCall({
        applicationId: application._id || application.id,
        callRound: activeCallRound,
        isDone: true,
        remarks: finalRemarks,
        nextStatus: finalStatus,
      });
    }
  };

  const handleFormSubmit = async (e: React.FormEvent, advance = false) => {
    e.preventDefault();
    if (!remarks.trim()) return;

    if (onSave) {
      await onSave({
        round: activeCallRound,
        remarks: remarks.trim(),
        updateStatus: nextStatus || undefined,
        advanceToNext: advance && !!onNext,
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-xl w-full overflow-hidden flex flex-col max-h-[94dvh] sm:max-h-[88vh] shadow-2xl border border-slate-200 animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 duration-200">
        
        {/* Top Header with Progress & Navigation */}
        <div className="shrink-0 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white p-3.5 sm:p-4.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-400 shadow-inner shrink-0">
              <PhoneCall className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-extrabold text-white truncate">
                  Calling Assistant
                </h3>
                {currentIndex !== undefined && totalCount !== undefined && (
                  <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    Candidate {currentIndex + 1} of {totalCount}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                Call, log remarks & update status in 1 tap
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onPrev && (
              <button
                type="button"
                onClick={onPrev}
                disabled={processing || currentIndex === 0}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30 disabled:hover:bg-slate-800 flex items-center justify-center transition cursor-pointer"
                title="Previous Candidate"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            {onNext && (
              <button
                type="button"
                onClick={onNext}
                disabled={processing || (currentIndex !== undefined && totalCount !== undefined && currentIndex >= totalCount - 1)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30 disabled:hover:bg-slate-800 flex items-center justify-center transition cursor-pointer"
                title="Next Candidate"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={processing}
              aria-label="Close modal"
              className="w-8 h-8 rounded-lg bg-slate-800/90 hover:bg-rose-600 text-slate-200 hover:text-white flex items-center justify-center transition shadow active:scale-95 border border-slate-700 ml-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Candidate Summary & Direct Dial Action Bar */}
        <div className="shrink-0 bg-slate-100 p-3 sm:p-4 border-b border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h4 className="font-extrabold text-slate-900 text-sm sm:text-base truncate">
                {candidateName}
              </h4>
              <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-0.5 font-medium flex-wrap">
                <span className="bg-white px-2 py-0.5 rounded border border-slate-300 font-mono font-bold text-slate-800">
                  {regNo}
                </span>
                {gender && <span>• {gender}</span>}
                {university && <span className="truncate max-w-[220px]">• {university}</span>}
              </div>
            </div>
            <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-slate-900 text-white shrink-0 shadow-xs">
              {application.status || "APPLIED"}
            </span>
          </div>

          {/* High-Visibility Call & WhatsApp Dial Strip */}
          <div className="bg-white rounded-2xl p-2 sm:p-2.5 border border-slate-300 flex items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2 min-w-0 pl-1">
              <span className="text-xs sm:text-sm font-extrabold text-slate-900 font-mono tracking-wider truncate">
                {mobileNumber || "No Phone on Record"}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={handleCopyPhone}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                title="Copy phone number"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedPhone ? "Copied" : "Copy"}</span>
              </button>

              {cleanPhone && (
                <a
                  href={`https://wa.me/91${cleanPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold flex items-center gap-1 transition active:scale-95"
                  title="Open WhatsApp Chat"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden xs:inline">WhatsApp</span>
                </a>
              )}

              {mobileNumber && (
                <a
                  href={`tel:${mobileNumber}`}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-extrabold flex items-center gap-1.5 shadow transition active:scale-95"
                  title="Click to dial immediately"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call Now</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Call Round Selector (Call 1 vs Call 2) */}
        <div className="shrink-0 px-3.5 sm:px-4 py-2.5 bg-slate-50 border-b border-slate-200">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleSwitchRound(1)}
              className={`p-2 sm:p-2.5 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                activeCallRound === 1
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-500/20"
                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
              }`}
            >
              <div>
                <div className="font-extrabold text-xs flex items-center gap-1.5">
                  <Phone className="w-3 h-3" />
                  <span>Call 1 Verification</span>
                </div>
                <div className={`text-[10.5px] mt-0.5 font-medium ${activeCallRound === 1 ? "text-blue-100" : "text-slate-500"}`}>
                  {application.call1Done ? "Completed" : "Pending"}
                  {application.call1Remarks && ` • "${application.call1Remarks.slice(0, 18)}..."`}
                </div>
              </div>
              {application.call1Done && (
                <span className={`w-5 h-5 rounded-full flex items-center justify-center ${
                  activeCallRound === 1 ? "bg-white text-blue-600" : "bg-blue-100 text-blue-700"
                }`}>
                  <Check className="w-3 h-3 stroke-3" />
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleSwitchRound(2)}
              className={`p-2 sm:p-2.5 rounded-xl border text-left transition cursor-pointer ${
                activeCallRound === 2
                  ? "bg-purple-600 text-white border-purple-600 shadow-sm ring-2 ring-purple-500/20"
                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
              }`}
            >
              <div>
                <div className="font-extrabold text-xs flex items-center gap-1.5">
                  <PhoneCall className="w-3 h-3" />
                  <span>Call 2 Final Confirmation</span>
                </div>
                <div className={`text-[10.5px] mt-0.5 font-medium ${activeCallRound === 2 ? "text-purple-100" : "text-slate-500"}`}>
                  {application.call2Done ? "Completed" : "Pending"}
                  {application.call2Remarks && ` • "${application.call2Remarks.slice(0, 18)}..."`}
                </div>
              </div>
              {application.call2Done && (
                <span className={`w-5 h-5 rounded-full flex items-center justify-center ${
                  activeCallRound === 2 ? "bg-white text-purple-600" : "bg-purple-100 text-purple-700"
                }`}>
                  <Check className="w-3 h-3 stroke-3" />
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form
          id="call-logger-form"
          onSubmit={(e) => handleFormSubmit(e, false)}
          className="p-3.5 sm:p-4.5 space-y-4 overflow-y-auto flex-1 min-h-0 text-slate-900 bg-white"
        >
          {/* SECTION 1: 1-Tap Instant Outcome Buttons */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>1-Tap Instant Outcomes</span>
              </label>
              <span className="text-[10.5px] font-bold text-slate-400">
                Saves & updates status instantly
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {QUICK_OUTCOMES.map((outcome) => {
                const IconComponent = outcome.icon;
                return (
                  <button
                    key={outcome.id}
                    type="button"
                    disabled={processing}
                    onClick={() => handleQuickOutcomeClick(outcome)}
                    className={`p-2.5 rounded-2xl border text-left transition flex flex-col justify-between gap-1.5 shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50 ${outcome.bgClass} ${outcome.borderClass}`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <IconComponent className={`w-4 h-4 ${outcome.colorClass}`} />
                      <span className="text-[9.5px] font-extrabold px-1.5 py-0.5 rounded bg-white/80 text-slate-700 border border-slate-200">
                        {outcome.statusBadge}
                      </span>
                    </div>
                    <div>
                      <div className={`font-bold text-xs leading-tight ${outcome.colorClass}`}>
                        {outcome.label}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 2: Custom / Detailed Remarks */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Call {activeCallRound} Detailed Notes</span>
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  id="mark-done-toggle"
                  checked={isDone}
                  onChange={(e) => setIsDone(e.target.checked)}
                  className="accent-blue-600 rounded w-3.5 h-3.5"
                />
                <label htmlFor="mark-done-toggle" className="text-[11px] font-bold text-slate-600 cursor-pointer">
                  Mark Done
                </label>
              </div>
            </div>

            {/* Quick Preset Tags */}
            <div className="flex flex-wrap gap-1">
              {PRESET_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setRemarks((prev) => (prev ? `${prev}, ${tag}` : tag))}
                  className="text-[10.5px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded-lg border border-slate-200 transition cursor-pointer"
                >
                  + {tag}
                </button>
              ))}
            </div>

            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Type specific notes discussed with candidate (timings, uniform, availability, special roles)..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          {/* SECTION 3: Update Application Status (Manual Dropdown) */}
          <div className="space-y-1">
            <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">
              Application Status
            </label>
            <select
              value={nextStatus}
              onChange={(e) => setNextStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600 cursor-pointer"
            >
              <option value="">Keep Current Status ({application.status || "APPLIED"})</option>
              <option value="SELECTED">Selected (Approved)</option>
              <option value="CONFIRMED">Confirmed (Attending)</option>
              <option value="ON_HOLD">Mark as Hold / Waitlist</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="NOT_SELECTED">Not Selected / Rejected</option>
              <option value="CANCELLED">Cancelled / Declined</option>
            </select>
          </div>
        </form>

        {/* Sticky Fixed Footer Action Bar */}
        <div className="shrink-0 bg-slate-50 p-3 sm:p-4 border-t border-slate-200 flex items-center justify-between gap-2 shadow-inner flex-wrap">
          <button
            type="button"
            disabled={processing}
            onClick={onClose}
            className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 bg-white border border-slate-300 transition active:scale-95 cursor-pointer"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={processing || !remarks.trim()}
              onClick={(e) => handleFormSubmit(e, false)}
              className="px-4 py-2.5 rounded-xl text-xs font-extrabold text-slate-700 hover:text-slate-900 bg-slate-200 hover:bg-slate-300 transition active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              Save Record
            </button>

            {onNext ? (
              <button
                type="button"
                disabled={processing || !remarks.trim()}
                onClick={(e) => handleFormSubmit(e, true)}
                className="px-4.5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition shadow-md flex items-center gap-1.5 disabled:opacity-50 active:scale-95 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Save & Call Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                form="call-logger-form"
                disabled={processing || !remarks.trim()}
                className="px-4.5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 transition shadow-md flex items-center gap-1.5 disabled:opacity-50 active:scale-95 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Save Call {activeCallRound}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
