"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Trash, Eye, Shield, Trash2, ArrowLeft, Copy, Sparkles, CalendarClock, Clock, Check, RefreshCw, X } from "lucide-react";
import Link from "next/link";
import TimePicker12Hour from "@/components/TimePicker12Hour";

interface FormField {
  id: string;
  type: 'text' | 'paragraph' | 'number' | 'email' | 'phone' | 'date' | 'time' | 'select' | 'checkbox' | 'radio' | 'yesno' | 'rating' | 'file';
  label: string;
  description: string;
  required: boolean;
  placeholder: string;
  options: string[];
}

function CreateEventForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cloneFromParam = searchParams.get("cloneFrom");

  const [clients, setClients] = useState<any[]>([]);
  const [existingEvents, setExistingEvents] = useState<any[]>([]);
  const [selectedCloneId, setSelectedCloneId] = useState<string>(cloneFromParam || "");
  const [clonedSourceEventName, setClonedSourceEventName] = useState<string | null>(null);
  const [isCloningLoading, setIsCloningLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Event Details state
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [reportingTime, setReportingTime] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [workType, setWorkType] = useState("Catering Staff");
  const [whatsappGroupLink, setWhatsappGroupLink] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [dressCode, setDressCode] = useState("");
  const [dosAndDontsText, setDosAndDontsText] = useState("");

  const [workersRequired, setWorkersRequired] = useState(15);
  const [maxApplications, setMaxApplications] = useState(25);
  const [paymentPerStudent, setPaymentPerStudent] = useState(800);
  const [clientRevenue, setClientRevenue] = useState(15000);
  const [otherExpenses, setOtherExpenses] = useState(1000);
  const [clientId, setClientId] = useState("");
  const [visibility, setVisibility] = useState("VISIBLE");
  const [allowedGender, setAllowedGender] = useState("ALL");

  // Publishing / Scheduling state
  const [publishMode, setPublishMode] = useState<"DRAFT" | "OPEN" | "SCHEDULED">("DRAFT");
  const tomorrowDateStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const [scheduleDate, setScheduleDate] = useState(tomorrowDateStr);
  const [scheduleTime, setScheduleTime] = useState("10:00 AM");

  // Custom Form Builder state
  const [customFields, setCustomFields] = useState<FormField[]>([]);

  // Modal / Temp state for adding a field
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState<FormField["type"]>("text");
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldPlaceholder, setNewFieldPlaceholder] = useState("");
  const [newFieldDescription, setNewFieldDescription] = useState("");
  const [newFieldOptionsText, setNewFieldOptionsText] = useState(""); // comma separated options

  useEffect(() => {
    // Fetch clients
    const fetchClients = async () => {
      try {
        const res = await fetch("/api/admin/clients");
        const data = await res.json();
        if (data.success) {
          setClients(data.clients);
        }
      } catch (err) {
        console.error("Failed to fetch clients:", err);
      }
    };

    // Fetch existing events for cloning
    const fetchExistingEventsList = async () => {
      try {
        const res = await fetch("/api/admin/events");
        const data = await res.json();
        if (data.success) {
          setExistingEvents(data.events || []);
        }
      } catch (err) {
        console.error("Failed to fetch existing events:", err);
      }
    };

    fetchClients();
    fetchExistingEventsList();
  }, []);

  // Handle clone when cloneFrom query param is present on mount
  useEffect(() => {
    if (cloneFromParam) {
      loadEventForCloning(cloneFromParam);
    }
  }, [cloneFromParam]);

  const loadEventForCloning = async (eventId: string) => {
    if (!eventId) return;
    try {
      setIsCloningLoading(true);
      const res = await fetch(`/api/admin/events/${eventId}`);
      const data = await res.json();
      if (data.success && data.event) {
        const ev = data.event;
        setClonedSourceEventName(ev.name);
        setName(`${ev.name} (Copy)`);
        if (ev.date) {
          try {
            setDate(new Date(ev.date).toISOString().split('T')[0]);
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
        setDescription(ev.description || "");
        setInstructions(ev.instructions || "");
        setDressCode(ev.dressCode || "");
        setDosAndDontsText(Array.isArray(ev.dosAndDonts) ? ev.dosAndDonts.join("\n") : "");
        setWorkersRequired(ev.workersRequired || 15);
        setMaxApplications(ev.maxApplications || 25);
        setPaymentPerStudent(ev.paymentPerStudent || 800);
        setClientRevenue(ev.clientRevenue || 0);
        setOtherExpenses(ev.otherExpenses || 0);
        setClientId(ev.clientId || "");
        setVisibility(ev.visibility || "VISIBLE");
        setAllowedGender(ev.allowedGender || "ALL");

        // Clone custom form questions
        if (Array.isArray(ev.customFormFields) && ev.customFormFields.length > 0) {
          const mappedFields: FormField[] = ev.customFormFields.map((f: any, idx: number) => ({
            id: `field_clone_${Date.now()}_${idx}`,
            type: f.type || 'text',
            label: f.label || '',
            description: f.description || '',
            required: Boolean(f.required),
            placeholder: f.placeholder || '',
            options: Array.isArray(f.options) ? f.options : [],
          }));
          setCustomFields(mappedFields);
        }
      } else {
        alert("Could not load selected event for cloning.");
      }
    } catch (err) {
      console.error("Error loading event for cloning:", err);
      alert("Error loading event for cloning.");
    } finally {
      setIsCloningLoading(false);
    }
  };

  const handleSelectCloneEvent = (eventId: string) => {
    setSelectedCloneId(eventId);
    if (eventId) {
      loadEventForCloning(eventId);
    }
  };

  const handleClearClonedBanner = () => {
    setClonedSourceEventName(null);
    setSelectedCloneId("");
  };

  const handleAddField = () => {
    if (!newFieldLabel.trim()) {
      alert("Field Question/Label is required!");
      return;
    }

    const labelLower = newFieldLabel.trim().toLowerCase();
    const reservedNames = ["name", "full name", "student name", "candidate name", "applicant name"];
    const reservedMobiles = ["phone", "phone number", "mobile", "mobile number", "contact", "contact number", "whatsapp", "whatsapp number", "whatsapp phone number"];
    const reservedRegs = ["registration number", "registration no", "registration no.", "roll no", "roll no.", "roll number", "university id", "university roll no", "university registration number"];

    if (reservedNames.includes(labelLower)) {
      alert("Name is already a default system field.\nPlease use the default Name field.");
      return;
    }
    if (reservedMobiles.includes(labelLower)) {
      alert("Mobile Number is already a default system field.\nPlease use the default Mobile Number field.");
      return;
    }
    if (reservedRegs.includes(labelLower)) {
      alert("Registration Number is already a default system field.\nPlease use the default Registration Number field.");
      return;
    }

    const fieldId = `field_${Date.now()}`;
    const options = newFieldOptionsText
      ? newFieldOptionsText.split(",").map((o) => o.trim()).filter((o) => o.length > 0)
      : [];

    const newField: FormField = {
      id: fieldId,
      type: newFieldType,
      label: newFieldLabel,
      description: newFieldDescription,
      required: newFieldRequired,
      placeholder: newFieldPlaceholder,
      options,
    };

    setCustomFields([...customFields, newField]);

    // Reset inputs
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

    const defaultDate = date || new Date(Date.now() + 86400000).toISOString().split('T')[0];

    let scheduledPublishAt: string | null = null;
    if (publishMode === "SCHEDULED") {
      if (!scheduleDate) {
        alert("Please select a valid scheduled date.");
        return;
      }
      scheduledPublishAt = parseScheduleDateTime(scheduleDate, scheduleTime || "10:00 AM");
    }

    const eventPayload = {
      name: name.trim() || "New Event Draft",
      date: defaultDate,
      location: location.trim() || "TBD",
      googleMapsUrl,
      reportingTime: reportingTime || "",
      startTime: startTime || "",
      endTime: endTime || "",
      workType: workType.trim() || "Catering Staff",
      description: description.trim() || "No description provided.",
      instructions: instructions.trim() || "",
      dressCode: dressCode.trim() || "",
      dosAndDonts,
      workersRequired: Number(workersRequired) || 15,
      maxApplications: Number(maxApplications) || 25,
      paymentPerStudent: Number(paymentPerStudent) || 800,
      clientRevenue: Number(clientRevenue) || 0,
      otherExpenses: Number(otherExpenses) || 0,
      clientId: clientId || null,
      customFormFields: customFields,
      visibility,
      allowedGender,
      whatsappGroupLink: whatsappGroupLink.trim() || undefined,
      status: publishMode,
      scheduledPublishAt,
    };

    try {
      setSubmitting(true);
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventPayload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (publishMode === "SCHEDULED") {
          alert(`Event successfully scheduled for ${new Date(scheduledPublishAt!).toLocaleDateString("en-GB")} at ${scheduleTime}!`);
        } else if (publishMode === "OPEN") {
          alert("Event published live and is now Open for student applications!");
        } else {
          alert("Event Draft created successfully!");
        }
        router.push("/admin/events");
      } else {
        alert(data.message || "Failed to create event.");
      }
    } catch (err) {
      alert("Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-900 max-w-5xl mx-auto pb-16">
      {/* Title & Back Link */}
      <div className="flex items-center space-x-3">
        <Link href="/admin/events" className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold tracking-wider text-red-600 uppercase">
            Create Event & Build Form
          </h1>
          <p className="text-slate-500 text-sm mt-1">Configure event specifications, clone past events, schedule release, and build custom applicant questions</p>
        </div>
      </div>

      {/* CLONE FROM EXISTING EVENT CARD */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300/80 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Copy className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-amber-950 uppercase tracking-wide flex items-center gap-1.5">
                <span>Clone & Edit From Existing Event</span>
                <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold">Fast Template</span>
              </h2>
              <p className="text-xs text-amber-900/75">Select any past event to duplicate all details, questions, pay rates, and settings as a new event</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
          <div className="relative flex-1">
            <select
              value={selectedCloneId}
              onChange={(e) => handleSelectCloneEvent(e.target.value)}
              disabled={isCloningLoading}
              className="w-full bg-white border border-amber-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
            >
              <option value="">⚡ Select an existing event to clone...</option>
              {existingEvents.map((ev) => (
                <option key={ev._id || ev.id} value={ev._id || ev.id}>
                  {ev.name} — ({new Date(ev.date).toLocaleDateString("en-GB")}) • {ev.location}
                </option>
              ))}
            </select>
          </div>

          {clonedSourceEventName && (
            <button
              type="button"
              onClick={handleClearClonedBanner}
              className="px-3 py-2 bg-white border border-slate-300 text-slate-650 hover:bg-slate-50 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shrink-0"
              title="Clear cloned banner"
            >
              <X className="w-3.5 h-3.5 text-slate-500" />
              <span>Clear Indicator</span>
            </button>
          )}
        </div>

        {isCloningLoading && (
          <div className="mt-3 flex items-center gap-2 text-xs text-amber-800 font-bold animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
            <span>Loading event configuration & questionnaire...</span>
          </div>
        )}

        {clonedSourceEventName && !isCloningLoading && (
          <div className="mt-3 bg-emerald-50 border border-emerald-300/80 rounded-xl p-3 flex items-center justify-between text-xs text-emerald-900 font-semibold">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                All details & form fields populated from <strong className="font-extrabold underline">{clonedSourceEventName}</strong>. You can tweak any fields below and save or schedule it as a brand new event!
              </span>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Columns: Main configurations */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* General Details */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4 shadow-xs">
            <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wide">General Details</h2>
              <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-semibold">
                All Fields Optional
              </span>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Event Name (Optional)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Grand Corporate Buffet Coordination (Default: New Event Draft)"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-red-600 text-sm font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Event Date (Optional)
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-red-600 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Work Type / Category (Optional)
                </label>
                <input
                  type="text"
                  value={workType}
                  onChange={(e) => setWorkType(e.target.value)}
                  placeholder="Catering Staff / Banquet Host"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-red-600 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Reporting Time (Optional)
                </label>
                <TimePicker12Hour
                  value={reportingTime}
                  onChange={setReportingTime}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Duty Start Time (Optional)
                </label>
                <TimePicker12Hour
                  value={startTime}
                  onChange={setStartTime}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Duty End Time (Optional)
                </label>
                <TimePicker12Hour
                  value={endTime}
                  onChange={setEndTime}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Location / Venue Details (Optional)
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Aura Resort, Chandigarh-Ambala Highway (Default: Venue to be announced)"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-red-600 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Google Maps Link (Optional)
              </label>
              <input
                type="url"
                value={googleMapsUrl}
                onChange={(e) => setGoogleMapsUrl(e.target.value)}
                placeholder="https://maps.google.com/..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-red-600 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-emerald-800 uppercase mb-1 flex items-center gap-1.5">
                <span>📲 Event WhatsApp Group Link (Optional)</span>
              </label>
              <input
                type="url"
                value={whatsappGroupLink}
                onChange={(e) => setWhatsappGroupLink(e.target.value)}
                placeholder="https://chat.whatsapp.com/ABCxyz123..."
                className="w-full bg-emerald-50/40 border border-emerald-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-600 text-sm"
              />
              <span className="text-[11px] text-slate-500 block mt-1">
                When you mark candidates as <strong>SELECTED</strong>, this link is automatically sent in confirmation emails and displayed on student portal passes.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Event Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide a summary of the duties and event settings..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-red-600 text-sm h-24"
              ></textarea>
            </div>
          </div>

          {/* Operational logistics */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4 shadow-xs">
            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-2">Logistics & Dress Code</h2>
            
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Required Dress Code</label>
              <input
                type="text"
                value={dressCode}
                onChange={(e) => setDressCode(e.target.value)}
                placeholder="White shirt, Black trousers, Black leather shoes, Black apron"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-red-600 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Important Instructions (e.g. confirmation message)</label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Details shown to students after submitting application (e.g., report to entry gate, carry physical roll number ID)..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-red-600 text-sm h-20"
              ></textarea>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Do's & Don'ts (One rule per line)</label>
              <textarea
                value={dosAndDontsText}
                onChange={(e) => setDosAndDontsText(e.target.value)}
                placeholder="DO: Arrive on time&#10;DONT: Use mobile phones while on duty"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-red-600 text-sm h-20"
              ></textarea>
            </div>
          </div>

          {/* Dynamic Form Custom Fields List */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4 shadow-xs">
            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-2">Form Structure</h2>
            
            <div className="space-y-2 mb-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Default System Fields</span>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center justify-between bg-slate-100 p-2.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-500">
                  <span>Registration Number *</span>
                  <span className="text-[10px] uppercase bg-slate-200 px-2 py-0.5 rounded text-slate-650 font-bold">Locked</span>
                </div>
                <div className="flex items-center justify-between bg-slate-100 p-2.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-500">
                  <span>Name *</span>
                  <span className="text-[10px] uppercase bg-slate-200 px-2 py-0.5 rounded text-slate-650 font-bold">Locked</span>
                </div>
                <div className="flex items-center justify-between bg-slate-100 p-2.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-500">
                  <span>Mobile Number *</span>
                  <span className="text-[10px] uppercase bg-slate-200 px-2 py-0.5 rounded text-slate-650 font-bold">Locked</span>
                </div>
              </div>
            </div>

            <hr className="border-slate-150 my-3" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Custom Questionnaire</span>
            
            {customFields.length === 0 ? (
              <p className="text-slate-450 text-xs">No additional custom fields added yet. Customize your form in the sidebar.</p>
            ) : (
              <div className="space-y-3">
                {customFields.map((field, idx) => (
                  <div key={field.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div>
                      <p className="text-sm font-semibold">{field.label}</p>
                      <p className="text-xs text-slate-450">
                        Type: <span className="text-red-600 uppercase">{field.type}</span> | Required: {field.required ? "Yes" : "No"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveField(field.id)}
                      className="p-1 text-red-400 hover:text-red-500"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Publishing / Scheduling, Financials, Client, Form builder toolbox */}
        <div className="space-y-6">

          {/* PUBLISH & SCHEDULING CONTROLS */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4 shadow-xs">
            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-2 flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-red-600" />
              <span>Publish & Timing</span>
            </h2>

            <div className="space-y-2.5">
              <label className="block text-xs font-semibold text-slate-500 uppercase">Publishing Mode</label>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => setPublishMode("DRAFT")}
                  className={`p-3 rounded-xl border text-left transition flex items-start justify-between ${
                    publishMode === "DRAFT"
                      ? "border-red-600 bg-red-50/40 text-red-950 font-bold ring-1 ring-red-600"
                      : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
                  }`}
                >
                  <div>
                    <div className="text-xs font-extrabold">💾 Save as Draft</div>
                    <div className="text-[11px] text-slate-500 font-normal mt-0.5">Stay hidden from students until ready</div>
                  </div>
                  {publishMode === "DRAFT" && <Check className="w-4 h-4 text-red-600 shrink-0" />}
                </button>

                <button
                  type="button"
                  onClick={() => setPublishMode("OPEN")}
                  className={`p-3 rounded-xl border text-left transition flex items-start justify-between ${
                    publishMode === "OPEN"
                      ? "border-emerald-600 bg-emerald-50/40 text-emerald-950 font-bold ring-1 ring-emerald-600"
                      : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
                  }`}
                >
                  <div>
                    <div className="text-xs font-extrabold text-emerald-700">🚀 Publish Immediately (Open)</div>
                    <div className="text-[11px] text-slate-500 font-normal mt-0.5">Live now for candidate applications</div>
                  </div>
                  {publishMode === "OPEN" && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                </button>

                <button
                  type="button"
                  onClick={() => setPublishMode("SCHEDULED")}
                  className={`p-3 rounded-xl border text-left transition flex items-start justify-between ${
                    publishMode === "SCHEDULED"
                      ? "border-purple-600 bg-purple-50/50 text-purple-950 font-bold ring-1 ring-purple-600"
                      : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
                  }`}
                >
                  <div>
                    <div className="text-xs font-extrabold text-purple-800">⏰ Schedule Release (Timed)</div>
                    <div className="text-[11px] text-slate-500 font-normal mt-0.5">Auto-opens on a specific date & time</div>
                  </div>
                  {publishMode === "SCHEDULED" && <Check className="w-4 h-4 text-purple-600 shrink-0" />}
                </button>
              </div>
            </div>

            {/* SCHEDULE CONFIGURATION FIELDS */}
            {publishMode === "SCHEDULED" && (
              <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3.5 space-y-3 animate-fade-in">
                <div className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-purple-600" />
                  <span>Set Schedule Date & Time</span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-purple-900 mb-1">
                    Auto-Publish Date:
                  </label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full bg-white border border-purple-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-purple-600 text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-purple-900 mb-1">
                    Auto-Publish Time:
                  </label>
                  <TimePicker12Hour
                    value={scheduleTime}
                    onChange={setScheduleTime}
                  />
                </div>

                <div className="text-[11px] text-purple-800 bg-white/80 border border-purple-200 rounded-lg p-2 leading-relaxed">
                  🗓 <strong>Live Schedule:</strong> This event will automatically become <strong>OPEN</strong> for student applications on <span className="font-bold underline">{new Date(scheduleDate || Date.now()).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span> at <span className="font-bold underline">{scheduleTime}</span>.
                </div>
              </div>
            )}
          </div>
          
          {/* Partnership & Financials */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4 shadow-xs">
            <h2 className="text-lg font-bold text-red-600 uppercase tracking-wide border-b border-slate-200 pb-2">Financials & Partner</h2>
            
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Select Client Resort/Hotel</label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-red-600 text-sm"
              >
                <option value="">Select partner client...</option>
                {clients.map((c) => (
                  <option key={c._id || c.id} value={c._id || c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Required Workers</label>
                <input
                  type="number"
                  value={workersRequired}
                  onChange={(e) => setWorkersRequired(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-red-600 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Max Applications</label>
                <input
                  type="number"
                  value={maxApplications}
                  onChange={(e) => setMaxApplications(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-red-600 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Student Payment (₹ / candidate)</label>
              <input
                type="number"
                value={paymentPerStudent}
                onChange={(e) => setPaymentPerStudent(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-red-600 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Client Revenue (₹ total)</label>
              <input
                type="number"
                value={clientRevenue}
                onChange={(e) => setClientRevenue(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-red-600 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Other Expenses (₹ total)</label>
              <input
                type="number"
                value={otherExpenses}
                onChange={(e) => setOtherExpenses(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-red-600 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Visibility</label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-red-600 text-sm"
              >
                <option value="VISIBLE">VISIBLE</option>
                <option value="HIDDEN">HIDDEN</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                Target Candidate Eligibility
              </label>
              <select
                value={allowedGender}
                onChange={(e) => setAllowedGender(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-red-600 text-sm font-semibold"
              >
                <option value="ALL">👥 Open to All (Male & Female)</option>
                <option value="FEMALE_ONLY">👩 Female Only (Girls Exclusive)</option>
                <option value="MALE_ONLY">👨 Male Only (Boys Exclusive)</option>
              </select>
            </div>
          </div>

          {/* Form Builder Toolbox */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4 shadow-xs">
            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-2">Add Form Field</h2>
            
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Question / Label</label>
              <input
                type="text"
                value={newFieldLabel}
                onChange={(e) => setNewFieldLabel(e.target.value)}
                placeholder="e.g. Select your shirt size"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-red-600 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Field Type</label>
              <select
                value={newFieldType}
                onChange={(e) => setNewFieldType(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-red-600 text-sm"
              >
                <option value="text">Short Answer</option>
                <option value="paragraph">Paragraph</option>
                <option value="number">Number</option>
                <option value="select">Dropdown / Select</option>
                <option value="yesno">Yes / No</option>
              </select>
            </div>

            {newFieldType === "select" && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Options (Comma separated)</label>
                <input
                  type="text"
                  value={newFieldOptionsText}
                  onChange={(e) => setNewFieldOptionsText(e.target.value)}
                  placeholder="S, M, L, XL, XXL"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-red-600 text-sm"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Description / Instruction</label>
              <input
                type="text"
                value={newFieldDescription}
                onChange={(e) => setNewFieldDescription(e.target.value)}
                placeholder="Subtext details..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-red-600 text-sm"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="required_box"
                checked={newFieldRequired}
                onChange={(e) => setNewFieldRequired(e.target.checked)}
                className="rounded border-slate-200 text-red-600 focus:ring-red-600"
              />
              <label htmlFor="required_box" className="text-sm font-semibold text-slate-650">Mark as Required</label>
            </div>

            <button
              type="button"
              onClick={handleAddField}
              className="w-full bg-transparent hover:bg-red-600 hover:text-white border border-red-600/30 text-red-600 font-bold py-2 rounded transition text-sm flex items-center justify-center space-x-1"
            >
              <Plus className="w-4 h-4" />
              <span>Insert Field</span>
            </button>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={submitting}
            className={`w-full text-white font-extrabold py-4 rounded-xl transition duration-200 shadow-md flex items-center justify-center gap-2 ${
              submitting
                ? "bg-slate-400 cursor-not-allowed"
                : publishMode === "SCHEDULED"
                ? "bg-purple-700 hover:bg-purple-800"
                : publishMode === "OPEN"
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {submitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : publishMode === "SCHEDULED" ? (
              <>
                <CalendarClock className="w-5 h-5" />
                <span>Schedule Event for {new Date(scheduleDate || Date.now()).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
              </>
            ) : publishMode === "OPEN" ? (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Publish Event (Open Immediately)</span>
              </>
            ) : (
              <span>Save Event Draft</span>
            )}
          </button>

        </div>

      </form>
    </div>
  );
}

export default function CreateEventPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading Event Creator...</div>}>
      <CreateEventForm />
    </Suspense>
  );
}
