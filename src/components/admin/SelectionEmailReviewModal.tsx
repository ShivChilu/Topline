"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Mail,
  Eye,
  Edit3,
  Sparkles,
  UserCheck,
  Send,
} from "lucide-react";

export interface SelectionEmailPreset {
  id: string;
  name: string;
  badge: string;
  badgeColor: string;
  description: string;
  subject: string;
  body: string;
}

const SELECTION_EMAIL_PRESETS: SelectionEmailPreset[] = [
  {
    id: "standard",
    name: "Standard Selection & RSVP Invite",
    badge: "Recommended",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
    description: "Standard formal invitation asking the candidate to confirm attendance and join WhatsApp.",
    subject: "🎉 Congratulations! Selected for {{eventName}} — Topline ODC",
    body: "You have been shortlisted and SELECTED for the upcoming event duty assignment.\n\nPlease review your assignment details below and confirm your availability immediately to secure your slot on the duty roster.",
  },
  {
    id: "urgent",
    name: "⚡ Urgent 2-Hour RSVP Notice",
    badge: "Urgent Roster",
    badgeColor: "bg-rose-100 text-rose-800 border-rose-300",
    description: "Time-sensitive selection with a 2-hour confirmation window before slot is released.",
    subject: "⚡ URGENT: Confirm Your Duty Slot for {{eventName}} — Topline ODC",
    body: "URGENT NOTICE: You have been selected for duty at {{eventName}}.\n\nYou MUST confirm your availability within 2 hours by clicking YES below. Unconfirmed slots will be automatically reassigned to waitlisted candidates.",
  },
  {
    id: "lead_steward",
    name: "👔 Lead Steward & Duty Briefing",
    badge: "VIP Duty",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-300",
    description: "Duty briefing tailored for team leaders, captains, and lead stewards.",
    subject: "👔 Duty Briefing & Selection: {{eventName}} — Topline ODC",
    body: "Congratulations {{name}}!\n\nYou have been selected for leadership / lead steward duty at {{eventName}}.\n\nPlease strictly adhere to the formal dress code (black trousers, pressed white shirt, polished black formal shoes), arrive punctually, and confirm your attendance below.",
  },
  {
    id: "vip_banquet",
    name: "🍽️ VIP Banquet & Fine-Dining Protocol",
    badge: "Fine Dining",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-300",
    description: "Strict grooming and service standards for premium five-star catering assignments.",
    subject: "🍽️ VIP Banquet Service Assignment: {{eventName}} — Topline ODC",
    body: "You have been selected for the premium VIP Banquet Catering duty at {{eventName}}.\n\nHigh grooming standards, clean formal attire, and 100% punctuality are strictly mandatory. Confirm your availability below.",
  },
];

const PLACEHOLDER_TAGS = [
  { tag: "{{name}}", label: "Name", example: "Rahul Sharma" },
  { tag: "{{eventName}}", label: "Event Name", example: "Grand Royal Banquet" },
  { tag: "{{eventDate}}", label: "Date", example: "Saturday, 12 Oct 2026" },
  { tag: "{{reportingTime}}", label: "Reporting Time", example: "04:30 PM" },
  { tag: "{{eventLocation}}", label: "Location", example: "Radisson Blu, Jalandhar" },
  { tag: "{{registrationNumber}}", label: "Reg No", example: "2023CSE1042" },
  { tag: "{{university}}", label: "University", example: "SRM University" },
  { tag: "{{phone}}", label: "Phone", example: "9876543210" },
];

interface SelectionEmailReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetApplications: any[];
  event: any;
  currentAdminRole?: string | null;
  defaultCallingNote?: string;
  onConfirm: (payload: {
    skipEmail: boolean;
    customSubject?: string;
    customMessage?: string;
    customInstructions?: string;
    notes?: string;
  }) => Promise<void>;
  isProcessing?: boolean;
}

export default function SelectionEmailReviewModal({
  isOpen,
  onClose,
  targetApplications,
  event,
  defaultCallingNote = "",
  onConfirm,
  isProcessing = false,
}: SelectionEmailReviewModalProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "compose" | "templates">("preview");
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState(0);

  // Template State
  const [subject, setSubject] = useState<string>("🎉 Congratulations! Selected for {{eventName}} — Topline ODC");
  const [messageBody, setMessageBody] = useState<string>(
    "You have been shortlisted and SELECTED for the upcoming event duty assignment.\n\nPlease review your assignment details below and confirm your availability immediately to secure your slot on the duty roster."
  );
  const [instructions, setInstructions] = useState<string>(event?.instructions || "");
  const [notes, setNotes] = useState<string>(defaultCallingNote || "");

  // Active focus tracking for tag injection
  const [lastFocusedField, setLastFocusedField] = useState<"subject" | "body" | "instructions" | "notes">("body");

  const subjectInputRef = useRef<HTMLInputElement | null>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const instructionsTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const notesInputRef = useRef<HTMLInputElement | null>(null);

  // Test email state
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [testEmailStatus, setTestEmailStatus] = useState<string | null>(null);

  // Sync initial state when modal opens or event changes
  useEffect(() => {
    if (isOpen) {
      setInstructions(event?.instructions || "");
      setNotes(defaultCallingNote || "");
      setSelectedPreviewIndex(0);
      setTestEmailStatus(null);
    }
  }, [isOpen, event, defaultCallingNote]);

  if (!isOpen) return null;

  const currentPreviewApp = targetApplications[selectedPreviewIndex] || targetApplications[0] || {
    name: "Rahul Sharma",
    registrationNumber: "2023CSE1042",
    mobileNumber: "9876543210",
    studentId: {
      name: "Rahul Sharma",
      registrationNumber: "2023CSE1042",
      university: "SRM University",
      phone: "9876543210",
    },
  };

  const studentData = currentPreviewApp.studentId || {};
  const sampleCandidateName = currentPreviewApp.name || studentData.name || "Candidate";
  const sampleRegNo = currentPreviewApp.registrationNumber || studentData.registrationNumber || "2023CSE1042";
  const sampleUniversity = studentData.university || "SRM University";
  const samplePhone = currentPreviewApp.mobileNumber || studentData.phone || "9876543210";

  const formattedEventDate = event?.date
    ? new Date(event.date).toLocaleDateString("en-GB", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Saturday, 12 October 2026";

  const interpolate = (text: string) => {
    if (!text) return "";
    const map: Record<string, string> = {
      name: sampleCandidateName,
      studentName: sampleCandidateName,
      eventName: event?.name || "Event",
      eventDate: formattedEventDate,
      eventLocation: event?.location || "To be communicated",
      reportingTime: event?.reportingTime || "As scheduled",
      registrationNumber: sampleRegNo,
      regNo: sampleRegNo,
      university: sampleUniversity,
      phone: samplePhone,
      mobile: samplePhone,
    };

    let result = text;
    for (const [key, val] of Object.entries(map)) {
      const regexDouble = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "gi");
      const regexSingle = new RegExp(`\\{\\s*${key}\\s*\\}`, "gi");
      result = result.replace(regexDouble, val).replace(regexSingle, val);
    }
    return result;
  };

  const insertTag = (tag: string) => {
    if (lastFocusedField === "subject") {
      const input = subjectInputRef.current;
      if (!input) {
        setSubject((prev: string) => (prev ? prev + " " + tag : tag));
        return;
      }
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const val = subject;
      setSubject(val.substring(0, start) + tag + val.substring(end));
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + tag.length, start + tag.length);
      }, 0);
    } else if (lastFocusedField === "body") {
      const textarea = bodyTextareaRef.current;
      if (!textarea) {
        setMessageBody((prev: string) => (prev ? prev + " " + tag : tag));
        return;
      }
      const start = textarea.selectionStart || 0;
      const end = textarea.selectionEnd || 0;
      const val = messageBody;
      setMessageBody(val.substring(0, start) + tag + val.substring(end));
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + tag.length, start + tag.length);
      }, 0);
    } else if (lastFocusedField === "instructions") {
      const textarea = instructionsTextareaRef.current;
      if (!textarea) {
        setInstructions((prev: string) => (prev ? prev + " " + tag : tag));
        return;
      }
      const start = textarea.selectionStart || 0;
      const end = textarea.selectionEnd || 0;
      const val = instructions;
      setInstructions(val.substring(0, start) + tag + val.substring(end));
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + tag.length, start + tag.length);
      }, 0);
    } else if (lastFocusedField === "notes") {
      const input = notesInputRef.current;
      if (!input) {
        setNotes((prev: string) => (prev ? prev + " " + tag : tag));
        return;
      }
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const val = notes;
      setNotes(val.substring(0, start) + tag + val.substring(end));
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + tag.length, start + tag.length);
      }, 0);
    }
  };

  const handleApplyPreset = (preset: SelectionEmailPreset) => {
    setSubject(preset.subject);
    setMessageBody(preset.body);
    setActiveTab("preview");
  };

  const handleSendTestEmail = async () => {
    try {
      setSendingTestEmail(true);
      setTestEmailStatus(null);
      const res = await fetch(`/api/admin/events/${event.id}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationIds: [currentPreviewApp._id || currentPreviewApp.id],
          subject: subject,
          message: messageBody,
          sendTestCopy: true,
          sendTestToAdmin: true,
          templateName: "Event Selection Email (Admin Test Copy)",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestEmailStatus("✅ Test email sent to admin inbox.");
      } else {
        setTestEmailStatus(`⚠️ ${data.message || "Failed to send test email."}`);
      }
    } catch (err: any) {
      setTestEmailStatus(`❌ Error: ${err.message}`);
    } finally {
      setSendingTestEmail(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[94vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white p-4 sm:p-5 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-white shadow-inner">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold flex items-center gap-2">
                <span>Selection Email Preview & Template Editor</span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/25 border border-white/40 text-white">
                  {targetApplications.length} {targetApplications.length === 1 ? "Candidate" : "Candidates"} Selected
                </span>
              </h3>
              <p className="text-xs text-red-100 mt-0.5">
                Inspect live candidate email, edit wording, or choose from pre-approved templates before sending.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="bg-slate-100 px-5 pt-3 border-b border-slate-200 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("preview")}
              className={`px-4 py-2 rounded-t-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === "preview"
                  ? "bg-white text-slate-900 border-t-2 border-red-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              <Eye className="w-3.5 h-3.5 text-red-600" />
              <span>Live Visual Email Preview</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("compose")}
              className={`px-4 py-2 rounded-t-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === "compose"
                  ? "bg-white text-slate-900 border-t-2 border-red-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              <Edit3 className="w-3.5 h-3.5 text-blue-600" />
              <span>Customize Template & Notes</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("templates")}
              className={`px-4 py-2 rounded-t-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === "templates"
                  ? "bg-white text-slate-900 border-t-2 border-red-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Template Presets ({SELECTION_EMAIL_PRESETS.length})</span>
            </button>
          </div>

          {/* Candidate Preview Switcher */}
          {targetApplications.length > 1 && (
            <div className="flex items-center gap-2 pb-2 text-xs">
              <span className="text-slate-500 font-medium">Previewing for:</span>
              <select
                value={selectedPreviewIndex}
                onChange={(e) => setSelectedPreviewIndex(Number(e.target.value))}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:border-red-600"
              >
                {targetApplications.map((app, idx) => (
                  <option key={app._id || app.id || idx} value={idx}>
                    #{idx + 1}: {app.name || app.studentId?.name || "Candidate"} ({app.registrationNumber || "No Reg"})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50/50">
          {/* TAB 1: LIVE VISUAL PREVIEW */}
          {activeTab === "preview" && (
            <div className="space-y-4">
              {/* Subject Bar Preview */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 truncate text-xs">
                  <span className="font-extrabold text-slate-400 uppercase tracking-wider">Subject:</span>
                  <span className="font-bold text-slate-900 truncate">{interpolate(subject)}</span>
                </div>
                <button
                  onClick={() => setActiveTab("compose")}
                  className="text-xs font-bold text-red-600 hover:underline shrink-0 flex items-center gap-1"
                >
                  <Edit3 className="w-3 h-3" /> Edit
                </button>
              </div>

              {/* Realistic Email Client View */}
              <div className="max-w-xl mx-auto bg-slate-950 text-slate-100 rounded-2xl overflow-hidden border border-slate-800 shadow-xl font-sans">
                {/* Email Header */}
                <div className="bg-[#ED0000] p-5 text-center text-white font-black tracking-widest text-xl">
                  TOPLINE ODC
                </div>

                <div className="p-6 sm:p-8 space-y-5">
                  {/* Selection Badge */}
                  <div className="inline-block bg-[#059669] text-white text-xs font-extrabold px-3 py-1 rounded-full tracking-wider">
                    ✓ SELECTED FOR EVENT DUTY
                  </div>

                  {/* Salutation */}
                  <h2 className="text-xl sm:text-2xl font-black text-white m-0">
                    Congratulations, {sampleCandidateName}!
                  </h2>

                  {/* Intro Message Body */}
                  <div className="text-slate-300 text-sm leading-relaxed space-y-2">
                    {interpolate(messageBody)
                      .split("\n\n")
                      .map((para, idx) => (
                        <p key={idx} className="m-0 whitespace-pre-line">
                          {para}
                        </p>
                      ))}
                  </div>

                  {/* Event Details Card */}
                  <div className="bg-slate-900 border-l-4 border-[#ED0000] rounded-xl p-4 space-y-2.5 text-xs">
                    <div className="font-bold text-slate-400 uppercase text-[11px] tracking-wider mb-2">
                      Event Assignment Details
                    </div>
                    <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                      <span className="text-slate-400">Event Name:</span>
                      <span className="font-bold text-white">{event?.name || "Event Title"}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                      <span className="text-slate-400">Event Date:</span>
                      <span className="font-bold text-white">{formattedEventDate}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                      <span className="text-slate-400">Location / Venue:</span>
                      <span className="font-bold text-white">{event?.location || "Venue details to be communicated"}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                      <span className="text-slate-400">Reporting Time:</span>
                      <span className="font-bold text-white">{event?.reportingTime || "As per shift briefing"}</span>
                    </div>
                    <div className="flex justify-between pt-0.5">
                      <span className="text-slate-400">Selection Status:</span>
                      <span className="font-bold text-emerald-400">Selected (Awaiting RSVP)</span>
                    </div>
                  </div>

                  {/* AVAILABILITY RSVP ACTION BOX */}
                  <div className="bg-slate-900/90 border-2 border-blue-500/80 rounded-2xl p-5 text-center space-y-3 shadow-lg">
                    <div className="text-base font-extrabold text-white flex items-center justify-center gap-1.5">
                      <span>⚡ Are you available to attend this duty?</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed m-0">
                      Please confirm your availability immediately. Selecting <strong>YES</strong> confirms your slot on the duty roster and unlocks the <strong>Official WhatsApp Group link</strong> for briefing updates.
                    </p>

                    <div className="space-y-2 pt-2">
                      <div className="w-full bg-emerald-600 text-white font-extrabold text-xs sm:text-sm py-3 px-4 rounded-xl shadow-md border border-emerald-400/50 flex items-center justify-center gap-2 cursor-default">
                        <span>✅ YES, I AM AVAILABLE (Confirm & Join WhatsApp)</span>
                      </div>
                      <div className="w-full bg-slate-800 text-rose-400 font-bold text-xs py-2.5 px-4 rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 cursor-default">
                        <span>❌ NO, NOT AVAILABLE (Decline & Release Slot)</span>
                      </div>
                    </div>
                  </div>

                  {/* Optional Instructions */}
                  {instructions && (
                    <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-300">
                      <strong className="text-white block mb-1">📋 Instructions & Dress Code:</strong>
                      <span className="whitespace-pre-line">{interpolate(instructions)}</span>
                    </div>
                  )}

                  {/* Optional Notes */}
                  {notes && (
                    <div className="bg-slate-800/80 rounded-xl p-3 text-xs text-slate-300 border border-slate-700">
                      <strong className="text-amber-400">Admin Note:</strong> {interpolate(notes)}
                    </div>
                  )}

                  <p className="text-xs text-slate-400 leading-relaxed">
                    Please ensure you are punctual, groomed as per standards, and carry your college / government photo ID.
                  </p>

                  <div className="text-center pt-2">
                    <span className="inline-block bg-[#ED0000] text-white text-xs font-bold px-4 py-2 rounded-lg">
                      Open Student Portal
                    </span>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-4 text-center text-[11px] text-slate-500 border-t border-slate-900">
                  &copy; {new Date().getFullYear()} Topline ODC & Catering Management. All rights reserved.<br />
                  This is an automated system notification.
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COMPOSE & CUSTOMIZE TEMPLATE */}
          {activeTab === "compose" && (
            <div className="space-y-4">
              {/* Interactive Tags Toolbar */}
              <div className="bg-white border border-slate-200 p-3.5 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-red-600" />
                    Interactive Dynamic Tags
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Click any tag to insert into the active field ({lastFocusedField})
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {PLACEHOLDER_TAGS.map((tagItem) => (
                    <button
                      key={tagItem.tag}
                      type="button"
                      onClick={() => insertTag(tagItem.tag)}
                      className="bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-300 text-slate-700 hover:text-red-700 text-xs font-semibold px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer"
                      title={`Example: ${tagItem.example}`}
                    >
                      <code className="text-red-600 font-bold text-[11px]">{tagItem.tag}</code>
                      <span className="text-slate-500 text-[10.5px]">({tagItem.label})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject Input */}
              <div className="bg-white border border-slate-200 p-4 rounded-2xl space-y-1.5">
                <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  Email Subject Line *
                </label>
                <input
                  ref={subjectInputRef}
                  type="text"
                  value={subject}
                  onFocus={() => setLastFocusedField("subject")}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. 🎉 Congratulations! Selected for {{eventName}} — Topline ODC"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600"
                />
              </div>

              {/* Message Body Input */}
              <div className="bg-white border border-slate-200 p-4 rounded-2xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                    Custom Message Body / Introduction *
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Paragraphs & line breaks are preserved
                  </span>
                </div>
                <textarea
                  ref={bodyTextareaRef}
                  rows={5}
                  value={messageBody}
                  onFocus={() => setLastFocusedField("body")}
                  onChange={(e) => setMessageBody(e.target.value)}
                  placeholder="Type your customized message here..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 font-mono"
                />
              </div>

              {/* Event Instructions Override */}
              <div className="bg-white border border-slate-200 p-4 rounded-2xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                    Event Instructions & Dress Code (Optional)
                  </label>
                  <span className="text-[11px] text-slate-400">Pre-filled from event configuration</span>
                </div>
                <textarea
                  ref={instructionsTextareaRef}
                  rows={3}
                  value={instructions}
                  onFocus={() => setLastFocusedField("instructions")}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g. Black formal shoes, clean shaved, reach venue 15 minutes before reporting time..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600"
                />
              </div>

              {/* Coordinator Notes */}
              <div className="bg-white border border-slate-200 p-4 rounded-2xl space-y-1.5">
                <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  Admin / Coordinator Note (Optional)
                </label>
                <input
                  ref={notesInputRef}
                  type="text"
                  value={notes}
                  onFocus={() => setLastFocusedField("notes")}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Shift 1 steward, assigned to Main Stage buffet table..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600"
                />
              </div>
            </div>
          )}

          {/* TAB 3: TEMPLATE PRESETS */}
          {activeTab === "templates" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SELECTION_EMAIL_PRESETS.map((preset) => (
                <div
                  key={preset.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-md transition flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-extrabold text-slate-900 text-sm">{preset.name}</h4>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${preset.badgeColor}`}>
                        {preset.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{preset.description}</p>

                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs space-y-1.5">
                      <div className="font-bold text-slate-700 truncate">
                        <span className="text-slate-400">Subject: </span>
                        {preset.subject}
                      </div>
                      <p className="text-slate-600 line-clamp-3 text-[11.5px] italic">
                        &ldquo;{preset.body}&rdquo;
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="w-full py-2 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white font-extrabold text-xs rounded-xl transition border border-red-200 hover:border-red-600 flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Apply & Preview This Preset</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-100 p-4 sm:p-5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <button
              type="button"
              disabled={sendingTestEmail || isProcessing}
              onClick={handleSendTestEmail}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition flex items-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
              title="Send a sample test copy to the logged-in admin inbox"
            >
              <Send className="w-3.5 h-3.5 text-blue-600" />
              <span>{sendingTestEmail ? "Sending Test Copy..." : "Send Test Copy to Me"}</span>
            </button>
            {testEmailStatus && (
              <span className="text-xs font-semibold text-slate-700 animate-in fade-in">
                {testEmailStatus}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              disabled={isProcessing}
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={isProcessing}
              onClick={() =>
                onConfirm({
                  skipEmail: true,
                  customSubject: subject,
                  customMessage: messageBody,
                  customInstructions: instructions,
                  notes: notes,
                })
              }
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-800 bg-slate-200 hover:bg-slate-300 transition disabled:opacity-50 cursor-pointer"
              title="Update status to SELECTED without sending an automated email"
            >
              Mark Selected (Skip Email)
            </button>

            <button
              type="button"
              disabled={isProcessing}
              onClick={() =>
                onConfirm({
                  skipEmail: false,
                  customSubject: subject,
                  customMessage: messageBody,
                  customInstructions: instructions,
                  notes: notes,
                })
              }
              className="px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 transition shadow-md flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              <span>
                {isProcessing
                  ? "Processing..."
                  : `⚡ Confirm & Send Emails (${targetApplications.length})`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
