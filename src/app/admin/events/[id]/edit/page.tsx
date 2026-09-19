"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Calendar,
  MapPin,
  Clock,
  Briefcase,
  IndianRupee,
  Users,
  Shield,
  FileText,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import TimePicker12Hour from "@/components/TimePicker12Hour";

interface FormField {
  id: string;
  type: "text" | "paragraph" | "number" | "email" | "phone" | "date" | "time" | "select" | "checkbox" | "radio" | "yesno" | "rating" | "file";
  label: string;
  description: string;
  required: boolean;
  placeholder: string;
  options: string[];
}

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const eventId = resolvedParams.id;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [clients, setClients] = useState<any[]>([]);

  // Event Details State
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [reportingTime, setReportingTime] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [workType, setWorkType] = useState("Catering Staff");
  const [whatsappGroupLink, setWhatsappGroupLink] = useState("");
  const [autoSendSelectionEmail, setAutoSendSelectionEmail] = useState(true);
  const [autoSendSelectionDelayHours, setAutoSendSelectionDelayHours] = useState<number | string>(2);
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [dressCode, setDressCode] = useState("");
  const [dosAndDontsText, setDosAndDontsText] = useState("");

  const [workersRequired, setWorkersRequired] = useState(15);
  const [maxApplications, setMaxApplications] = useState(25);
  const [paymentPerStudent, setPaymentPerStudent] = useState(800);
  const [clientId, setClientId] = useState("");
  const [visibility, setVisibility] = useState("VISIBLE");
  const [allowedGender, setAllowedGender] = useState("ALL");
  const [status, setStatus] = useState("OPEN");

  // Publishing / Scheduling
  const [scheduledPublishDate, setScheduledPublishDate] = useState("");
  const [scheduledPublishTime, setScheduledPublishTime] = useState("10:00 AM");

  // Custom Form Builder state
  const [customFields, setCustomFields] = useState<FormField[]>([]);
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState<FormField["type"]>("text");
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldPlaceholder, setNewFieldPlaceholder] = useState("");
  const [newFieldDescription, setNewFieldDescription] = useState("");
  const [newFieldOptionsText, setNewFieldOptionsText] = useState("");

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await fetch("/api/admin/clients");
        const data = await res.json();
        if (data.success && Array.isArray(data.clients)) {
          setClients(data.clients);
        }
      } catch (err) {
        console.error("Failed to load clients:", err);
      }
    };

    const fetchEvent = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);
        const res = await fetch(`/api/admin/events/${eventId}?t=${Date.now()}`);
        if (!res.ok) {
          setErrorMsg("Failed to load event data. Make sure you have admin permissions.");
          return;
        }
        const data = await res.json();
        if (data.success && data.event) {
          const ev = data.event;
          setName(ev.name || "");
          if (ev.date) {
            try {
              setDate(new Date(ev.date).toISOString().split("T")[0]);
            } catch (e) {
              setDate("");
            }
          }
          setLocation(ev.location || "");
          setGoogleMapsUrl(ev.googleMapsUrl || "");
          setReportingTime(ev.reportingTime || "");
          setStartTime(ev.startTime || "");
          setEndTime(ev.endTime || "");
          setWorkType(ev.workType || "Catering Staff");
          setWhatsappGroupLink(ev.whatsappGroupLink || "");
          setAutoSendSelectionEmail(ev.autoSendSelectionEmail !== undefined ? Boolean(ev.autoSendSelectionEmail) : true);
          setAutoSendSelectionDelayHours(ev.autoSendSelectionDelayHours !== undefined ? ev.autoSendSelectionDelayHours : 2);
          setDescription(ev.description || "");
          setInstructions(ev.instructions || "");
          setDressCode(ev.dressCode || "");
          setDosAndDontsText(Array.isArray(ev.dosAndDonts) ? ev.dosAndDonts.join("\n") : "");
          setWorkersRequired(ev.workersRequired ?? 15);
          setMaxApplications(ev.maxApplications ?? 25);
          setPaymentPerStudent(ev.paymentPerStudent ?? 800);
          setClientId(ev.clientId || "");
          setVisibility(ev.visibility || "VISIBLE");
          setAllowedGender(ev.allowedGender || "ALL");
          setStatus(ev.status || "OPEN");

          if (ev.scheduledPublishAt) {
            try {
              const sched = new Date(ev.scheduledPublishAt);
              setScheduledPublishDate(sched.toISOString().split("T")[0]);
              setScheduledPublishTime(
                sched.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
              );
            } catch (e) {
              // ignore date parse error
            }
          }

          if (Array.isArray(ev.customFormFields)) {
            setCustomFields(
              ev.customFormFields.map((f: any, idx: number) => ({
                id: f.id || `field_${idx}`,
                type: (f.type || "text").toLowerCase() as FormField["type"],
                label: f.label || "",
                description: f.description || "",
                required: Boolean(f.required),
                placeholder: f.placeholder || "",
                options: Array.isArray(f.options) ? f.options : [],
              }))
            );
          }
        } else {
          setErrorMsg(data.message || "Event not found.");
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Network error loading event.");
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
    fetchEvent();
  }, [eventId]);

  const handleAddField = () => {
    if (!newFieldLabel.trim()) {
      alert("Please provide a label/question title for the field.");
      return;
    }

    const fieldId = `field_${Date.now()}`;
    const options = newFieldOptionsText
      ? newFieldOptionsText.split(",").map((o) => o.trim()).filter((o) => o.length > 0)
      : [];

    const newField: FormField = {
      id: fieldId,
      type: newFieldType,
      label: newFieldLabel.trim(),
      description: newFieldDescription.trim(),
      required: newFieldRequired,
      placeholder: newFieldPlaceholder.trim(),
      options,
    };

    setCustomFields([...customFields, newField]);
    setNewFieldLabel("");
    setNewFieldRequired(false);
    setNewFieldPlaceholder("");
    setNewFieldDescription("");
    setNewFieldOptionsText("");
  };

  const handleRemoveField = (id: string) => {
    setCustomFields(customFields.filter((f) => f.id !== id));
  };

  const parseScheduleDateTime = (dateStr: string, time12Str: string): string => {
    try {
      let [hoursStr, remainder] = time12Str.split(":");
      let minutes = "00";
      let ampm = "AM";
      if (remainder) {
        const parts = remainder.trim().split(/\s+/);
        minutes = parts[0] || "00";
        ampm = (parts[1] || "AM").toUpperCase();
      }
      let hours = parseInt(hoursStr, 10);
      if (ampm === "PM" && hours < 12) hours += 12;
      if (ampm === "AM" && hours === 12) hours = 0;

      const dateObj = new Date(dateStr);
      dateObj.setHours(hours, parseInt(minutes, 10), 0, 0);
      return dateObj.toISOString();
    } catch (e) {
      return new Date(dateStr).toISOString();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const dosAndDonts = dosAndDontsText
      ? dosAndDontsText.split("\n").map((line) => line.trim()).filter((line) => line.length > 0)
      : [];

    let scheduledPublishAt: string | null = null;
    if (status === "SCHEDULED") {
      if (!scheduledPublishDate) {
        alert("Please select a scheduled release date.");
        return;
      }
      scheduledPublishAt = parseScheduleDateTime(scheduledPublishDate, scheduledPublishTime || "10:00 AM");
    }

    const payload = {
      name: name.trim(),
      date,
      location: location.trim(),
      googleMapsUrl: googleMapsUrl.trim() || null,
      reportingTime: reportingTime.trim(),
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      workType: workType.trim(),
      description: description.trim(),
      instructions: instructions.trim() || null,
      dressCode: dressCode.trim() || null,
      dosAndDonts,
      workersRequired: Number(workersRequired) || 1,
      maxApplications: Number(maxApplications) || 1,
      paymentPerStudent: Number(paymentPerStudent) || 0,
      clientRevenue: 0,
      otherExpenses: 0,
      clientId: clientId || null,
      visibility,
      allowedGender,
      whatsappGroupLink: whatsappGroupLink.trim() || null,
      autoSendSelectionEmail,
      autoSendSelectionDelayHours: Math.max(0, Number(autoSendSelectionDelayHours) || 0),
      status,
      scheduledPublishAt,
      customFormFields: customFields,
    };

    try {
      setSubmitting(true);
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast("Event updated successfully!");
        setTimeout(() => {
          router.push(`/admin/events/${eventId}`);
        }, 800);
      } else {
        alert(data.message || "Failed to update event.");
      }
    } catch (err: any) {
      alert("Network error updating event: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center text-slate-500 font-bold text-sm">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mr-3"></div>
        Loading event data...
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="max-w-2xl mx-auto p-8 bg-red-50 border border-red-200 rounded-2xl text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-red-600 mx-auto" />
        <h2 className="text-xl font-bold text-red-900">Error Loading Event</h2>
        <p className="text-sm text-red-700">{errorMsg}</p>
        <Link
          href="/admin/events"
          className="inline-block px-4 py-2 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition"
        >
          Back to Events List
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-900 max-w-5xl mx-auto pb-20">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link
            href={`/admin/events/${eventId}`}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition"
            title="Back to Event"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-wider text-slate-900 uppercase">
                Edit Event
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase bg-red-100 text-red-700 border border-red-200">
                {status}
              </span>
            </div>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
              Update event name, payouts, shifts, capacity, guidelines, and custom questionnaire
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/events/${eventId}`}
            target="_blank"
            className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Public View</span>
          </Link>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center space-x-2 shadow-sm disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{submitting ? "Saving..." : "Save Changes"}</span>
          </button>
        </div>
      </div>

      {/* Toast Alert */}
      {toastMsg && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm animate-fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Main Event Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* General Details */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4 shadow-xs">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-red-600" />
                <span>General Event Details</span>
              </h2>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Event Title / Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Grand Royal Wedding Banquet"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-red-600 text-sm font-semibold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Event Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-red-600 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Work Type / Role
                </label>
                <input
                  type="text"
                  value={workType}
                  onChange={(e) => setWorkType(e.target.value)}
                  placeholder="e.g. STEWARDS (SNACKS BOYS)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-red-600 text-sm font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Location / Venue Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Radisson Blu Resort, Amritsar"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-red-600 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Google Maps Link (Optional)
                </label>
                <input
                  type="url"
                  value={googleMapsUrl}
                  onChange={(e) => setGoogleMapsUrl(e.target.value)}
                  placeholder="https://maps.app.goo.gl/..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-red-600 text-sm font-medium"
                />
              </div>
            </div>

            {/* WhatsApp Group Link & Auto-Selection System */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div>
                <label className="block text-xs font-bold text-emerald-800 uppercase mb-1 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Event WhatsApp Group Link (Optional)</span>
                </label>
                <input
                  type="url"
                  value={whatsappGroupLink}
                  onChange={(e) => setWhatsappGroupLink(e.target.value)}
                  placeholder="https://chat.whatsapp.com/ABCxyz123..."
                  className="w-full bg-emerald-50/40 border border-emerald-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-emerald-600 text-sm font-medium"
                />
                <span className="text-[11px] text-slate-500 block mt-1">
                  Used for automated selection emails and candidate confirmation passes.
                </span>
              </div>

              {/* Auto-Send Selection Emails Feature Box */}
              <div className="bg-gradient-to-br from-emerald-50 via-teal-50/40 to-slate-50 border border-emerald-200 rounded-xl p-3.5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="text-xs font-black text-emerald-950 uppercase tracking-wider block">
                        Auto-Send Selection Email with WhatsApp Link
                      </span>
                      <span className="text-[11px] text-emerald-800">
                        Automatically approves candidates and sends selection email with WhatsApp invite.
                      </span>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-emerald-300 shadow-2xs shrink-0">
                    <input
                      type="checkbox"
                      checked={autoSendSelectionEmail}
                      onChange={(e) => setAutoSendSelectionEmail(e.target.checked)}
                      className="accent-emerald-600 rounded w-3.5 h-3.5 cursor-pointer"
                    />
                    <span className={`text-[11px] font-bold ${autoSendSelectionEmail ? "text-emerald-700" : "text-slate-400"}`}>
                      {autoSendSelectionEmail ? "AUTO-SEND: ON" : "AUTO-SEND: OFF"}
                    </span>
                  </label>
                </div>

                {autoSendSelectionEmail && (
                  <div className="pt-2 border-t border-emerald-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <label className="font-bold text-slate-700 whitespace-nowrap">
                        ⏱ Delay Timer:
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="72"
                        step="0.5"
                        value={autoSendSelectionDelayHours}
                        onChange={(e) => setAutoSendSelectionDelayHours(e.target.value)}
                        className="w-20 bg-white border border-emerald-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                      />
                      <span className="text-slate-600 font-semibold">Hours after candidate applies (Default: 2h)</span>
                    </div>

                    {!whatsappGroupLink.trim() ? (
                      <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                        ⚠️ Paused until WhatsApp link is entered
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                        ✓ Ready to auto-send with WhatsApp link
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Shift Timings */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4 shadow-xs">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <Clock className="w-4 h-4 text-red-600" />
                <span>Shift & Reporting Timings</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Reporting Time
                </label>
                <TimePicker12Hour
                  value={reportingTime}
                  onChange={setReportingTime}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Shift Start Time
                </label>
                <TimePicker12Hour
                  value={startTime}
                  onChange={setStartTime}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Shift End Time
                </label>
                <TimePicker12Hour
                  value={endTime}
                  onChange={setEndTime}
                />
              </div>
            </div>
          </div>

          {/* Capacity, Staff Count & Student Payout */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4 shadow-xs">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-emerald-600" />
                <span>Capacity, Staff Requirements & Student Payout</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                <label className="block text-xs font-bold text-emerald-900 uppercase mb-1">
                  Payout Per Student (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={paymentPerStudent}
                  onChange={(e) => setPaymentPerStudent(Number(e.target.value))}
                  placeholder="800"
                  className="w-full bg-white border border-emerald-300 rounded-lg px-3 py-2 text-slate-900 font-extrabold focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
                <span className="text-[10px] text-emerald-700 mt-1 block">Paid per candidate per shift</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Staff Required
                </label>
                <input
                  type="number"
                  min="1"
                  value={workersRequired}
                  onChange={(e) => setWorkersRequired(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-red-600 text-sm"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Target candidates to select</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Max Applications Cap
                </label>
                <input
                  type="number"
                  min="1"
                  value={maxApplications}
                  onChange={(e) => setMaxApplications(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-red-600 text-sm"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Form auto-closes when full</span>
              </div>
            </div>


          </div>

          {/* Description & Guidelines */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4 shadow-xs">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <FileText className="w-4 h-4 text-red-600" />
                <span>Job Description & Event Guidelines</span>
              </h2>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Event Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Overview of duties, venue specifics, and expectations..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-red-600 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Dress Code & Grooming
                </label>
                <textarea
                  rows={2}
                  value={dressCode}
                  onChange={(e) => setDressCode(e.target.value)}
                  placeholder="e.g. Formal White Shirt, Black Trousers, Black Leather Shoes, Clean Shave..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-red-600 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Special Instructions / Briefing Note
                </label>
                <textarea
                  rows={2}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Carry physical college ID card, reach 15 minutes before reporting time..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-red-600 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Dos & Don'ts (One per line)
              </label>
              <textarea
                rows={3}
                value={dosAndDontsText}
                onChange={(e) => setDosAndDontsText(e.target.value)}
                placeholder="Do arrive on time&#10;Do wear formal attire&#10;Don't use mobile phones on floor"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-red-600 text-sm font-mono text-xs"
              />
            </div>
          </div>

          {/* Custom Form Builder Questions */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4 shadow-xs">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Custom Application Questionnaire ({customFields.length})</span>
              </h2>
            </div>

            {customFields.length > 0 ? (
              <div className="space-y-2.5">
                {customFields.map((f, idx) => (
                  <div
                    key={f.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <span>{idx + 1}. {f.label}</span>
                        {f.required && (
                          <span className="px-1.5 py-0.2 bg-red-100 text-red-700 text-[10px] rounded font-bold">
                            Required
                          </span>
                        )}
                        <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 text-[10px] rounded font-mono uppercase">
                          {f.type}
                        </span>
                      </div>
                      {f.description && <p className="text-[11px] text-slate-500 mt-0.5">{f.description}</p>}
                      {f.options && f.options.length > 0 && (
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Options: {f.options.join(", ")}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveField(f.id)}
                      className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg transition"
                      title="Remove question"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-500">
                No custom questions added. Default candidate profile fields (Name, Phone, University, Photos) are automatically collected.
              </div>
            )}

            {/* Add Question Box */}
            <div className="p-4 bg-indigo-50/40 border border-indigo-200 rounded-xl space-y-3">
              <span className="text-xs font-bold text-indigo-950 uppercase tracking-wide block">
                + Add Custom Question to Event Form
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={newFieldLabel}
                  onChange={(e) => setNewFieldLabel(e.target.value)}
                  placeholder="Question Label (e.g. Do you have black shoes?)"
                  className="sm:col-span-2 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <select
                  value={newFieldType}
                  onChange={(e) => setNewFieldType(e.target.value as FormField["type"])}
                  className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="text">Text Input</option>
                  <option value="paragraph">Paragraph / Long Text</option>
                  <option value="number">Number</option>
                  <option value="select">Dropdown Select</option>
                  <option value="radio">Single Choice Radio</option>
                  <option value="checkbox">Multiple Checkbox</option>
                  <option value="yesno">Yes / No Toggle</option>
                  <option value="file">File / Photo Upload</option>
                </select>
              </div>

              {["select", "radio", "checkbox"].includes(newFieldType) && (
                <input
                  type="text"
                  value={newFieldOptionsText}
                  onChange={(e) => setNewFieldOptionsText(e.target.value)}
                  placeholder="Comma-separated choices (e.g. Yes, No, Maybe)"
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none"
                />
              )}

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newFieldRequired}
                    onChange={(e) => setNewFieldRequired(e.target.checked)}
                    className="rounded text-red-600"
                  />
                  <span>Mandatory / Required question</span>
                </label>
                <button
                  type="button"
                  onClick={handleAddField}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Question</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Column: Meta, Status, Client, WhatsApp */}
        <div className="space-y-6">
          {/* Status & Visibility Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-2">
              Status & Visibility
            </h2>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Event Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-red-600"
              >
                <option value="OPEN">🟢 OPEN (Accepting Applications)</option>
                <option value="FULL">🟡 FULL (Capacity Reached)</option>
                <option value="CLOSED">🔴 CLOSED (Registrations Paused)</option>
                <option value="DRAFT">⚪ DRAFT (Unpublished)</option>
                <option value="SCHEDULED">⏰ SCHEDULED (Auto-publish timer)</option>
                <option value="COMPLETED">🏁 COMPLETED (Finished Event)</option>
                <option value="ARCHIVED">📦 ARCHIVED (Hidden)</option>
              </select>
            </div>

            {status === "SCHEDULED" && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl space-y-2 text-xs">
                <span className="font-bold text-purple-900 block">Auto-Publish Schedule:</span>
                <input
                  type="date"
                  value={scheduledPublishDate}
                  onChange={(e) => setScheduledPublishDate(e.target.value)}
                  className="w-full bg-white border border-purple-300 rounded-lg p-2 font-semibold"
                />
                <TimePicker12Hour
                  value={scheduledPublishTime}
                  onChange={setScheduledPublishTime}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Portal Visibility
              </label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none"
              >
                <option value="VISIBLE">Visible on Public Events Board</option>
                <option value="HIDDEN">Hidden (Direct Link Only)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Gender Restriction
              </label>
              <select
                value={allowedGender}
                onChange={(e) => setAllowedGender(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none"
              >
                <option value="ALL">All Candidates (Male & Female)</option>
                <option value="MALE_ONLY">Male Candidates Only</option>
                <option value="FEMALE_ONLY">Female Candidates Only</option>
              </select>
            </div>
          </div>

          {/* Client & Communication Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-2">
              Client & Communication
            </h2>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Assign Client
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none"
              >
                <option value="">-- No Client Assigned --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.contactPerson})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-1 text-[#128C7E]">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Official WhatsApp Group Link</span>
              </label>
              <input
                type="url"
                value={whatsappGroupLink}
                onChange={(e) => setWhatsappGroupLink(e.target.value)}
                placeholder="https://chat.whatsapp.com/..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 text-xs font-mono focus:outline-none focus:border-[#25D366]"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Included in confirmation emails so selected candidates can join the event group.
              </p>
            </div>
          </div>

          {/* Action Card */}
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-3">
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl uppercase tracking-wider text-sm transition shadow-md flex items-center justify-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{submitting ? "Updating Event..." : "Save Changes"}</span>
            </button>
            <Link
              href={`/admin/events/${eventId}`}
              className="w-full bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition text-center block"
            >
              Cancel & Return
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
