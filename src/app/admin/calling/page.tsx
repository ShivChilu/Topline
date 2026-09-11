"use client";

import { useEffect, useState, useMemo } from "react";
import { Search, Calendar, MapPin, Clock, MessageSquare, Check, X, ChevronRight, RefreshCw, AlertCircle, PhoneCall, Phone } from "lucide-react";
import CallLoggerModal from "@/components/admin/CallLoggerModal";

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

const isReservedField = (label: string) => {
  const norm = label.toLowerCase().trim();
  const reservedNames = ["name", "full name", "student name", "candidate name", "applicant name"];
  const reservedMobiles = ["phone", "phone number", "mobile", "mobile number", "contact", "contact number", "whatsapp", "whatsapp number", "whatsapp phone number"];
  const reservedRegs = ["registration number", "registration no", "registration no.", "roll no", "roll no.", "roll number", "university id", "university roll no", "university registration number"];
  return reservedNames.includes(norm) || reservedMobiles.includes(norm) || reservedRegs.includes(norm);
};

const getApplicantName = (app: any, eventCustomFormFields?: any[]) => {
  if (app.name) return app.name;
  
  if (app.customFieldsData) {
    const data = app.customFieldsData;
    const nameKeys = ["name", "full name", "student name", "candidate name", "applicant name"];
    for (const key of Object.keys(data)) {
      if (nameKeys.includes(key.toLowerCase().trim())) {
        const val = typeof data.get === 'function' ? data.get(key) : data[key];
        if (val) return String(val).trim();
      }
    }
    if (eventCustomFormFields) {
      const field = eventCustomFormFields.find(f => nameKeys.includes(f.label.toLowerCase().trim()));
      if (field) {
        const val = typeof data.get === 'function' ? data.get(field.id) : data[field.id];
        if (val) return String(val).trim();
      }
    }
  }

  if (app.studentId?.name) return app.studentId.name;
  return `Student ${app.registrationNumber || "N/A"}`;
};

const getApplicantMobile = (app: any, eventCustomFormFields?: any[]) => {
  const regNo = (app.registrationNumber || app.studentId?.universityId || "").trim();
  
  const isValid = (val: string) => {
    if (!val) return false;
    const cleanVal = val.trim();
    if (cleanVal === regNo) return false;
    const digits = cleanVal.replace(/[^0-9]/g, "");
    return digits.length >= 10;
  };

  if (app.mobileNumber && isValid(app.mobileNumber)) {
    return app.mobileNumber.trim();
  }

  if (app.customFieldsData) {
    const data = app.customFieldsData;
    const phoneKeys = [
      "phone", "phone number", "phone no", "phone no.", "phone no:",
      "mobile", "mobile number", "mobile no", "mobile no.", "mobile no:",
      "contact", "contact number", "whatsapp", "whatsapp number", "whatsapp phone number"
    ];
    for (const key of Object.keys(data)) {
      const normKey = key.toLowerCase().trim();
      if (phoneKeys.some(k => normKey.startsWith(k) || normKey.includes(k))) {
        const val = typeof data.get === 'function' ? data.get(key) : data[key];
        if (val && isValid(String(val))) return String(val).trim();
      }
    }
    if (eventCustomFormFields) {
      const field = eventCustomFormFields.find(f => {
        const normLabel = f.label.toLowerCase().trim();
        return phoneKeys.some(k => normLabel.startsWith(k) || normLabel.includes(k));
      });
      if (field) {
        const val = typeof data.get === 'function' ? data.get(field.id) : data[field.id];
        if (val && isValid(String(val))) return String(val).trim();
      }
    }
  }

  if (app.studentId?.phone && isValid(app.studentId.phone)) {
    return app.studentId.phone.trim();
  }
  return "";
};

export default function CallingDashboard() {
  const [assignedEvents, setAssignedEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [eventDetails, setEventDetails] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<any[]>([]);
  
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingApps, setLoadingApps] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [messageFilter, setMessageFilter] = useState("ALL");
  const [callFilter, setCallFilter] = useState("ALL");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [expandedCardIds, setExpandedCardIds] = useState<Record<string, boolean>>({});

  const callStats = useMemo(() => {
    const total = applications.length;
    const calls0 = applications.filter((a) => !a.call1Done && !a.call2Done).length;
    const calls1 = applications.filter((a) => a.call1Done && !a.call2Done).length;
    const calls2 = applications.filter((a) => a.call2Done).length;
    return { total, calls0, calls1, calls2 };
  }, [applications]);

  // 2-Call Verification Logger State
  const [callLogModalOpen, setCallLogModalOpen] = useState(false);
  const [callLogApp, setCallLogApp] = useState<any>(null);
  const [callLogRound, setCallLogRound] = useState<1 | 2>(1);
  const [savingCallLog, setSavingCallLog] = useState(false);

  const openCallLogModal = (app: any, round: 1 | 2 = 1) => {
    setCallLogApp(app);
    setCallLogRound(round);
    setCallLogModalOpen(true);
  };

  const handleSaveCallLog = async (data: {
    round: 1 | 2;
    remarks: string;
    updateStatus?: string;
  }) => {
    if (!callLogApp) return;
    const appId = callLogApp._id || callLogApp.id;

    try {
      setSavingCallLog(true);
      const payload: any = {
        ids: [appId],
      };

      if (data.round === 1) {
        payload.call1Done = true;
        payload.call1Remarks = data.remarks;
      } else {
        payload.call2Done = true;
        payload.call2Remarks = data.remarks;
      }

      if (data.updateStatus) {
        payload.status = data.updateStatus;
      }

      const res = await fetch("/api/admin/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        setApplications((prev) =>
          prev.map((a) => {
            if ((a._id || a.id) === appId) {
              return {
                ...a,
                ...(data.round === 1
                  ? { call1Done: true, call1Remarks: data.remarks, call1At: new Date().toISOString() }
                  : { call2Done: true, call2Remarks: data.remarks, call2At: new Date().toISOString() }),
                ...(data.updateStatus ? { status: data.updateStatus } : {}),
              };
            }
            return a;
          })
        );
        setCallLogModalOpen(false);
        setCallLogApp(null);
      } else {
        alert(resData.message || "Failed to log call outcome.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error. Failed to save call record.");
    } finally {
      setSavingCallLog(false);
    }
  };
  const toggleCardDetails = (id: string) => {
    setExpandedCardIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleNextCard = (currentIndex: number) => {
    if (currentIndex < filteredApplications.length - 1) {
      const nextApp = filteredApplications[currentIndex + 1];
      setExpandedCardIds({ [nextApp._id]: true });
      setTimeout(() => {
        document.getElementById(`card-${nextApp._id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    }
  };

  const handlePrevCard = (currentIndex: number) => {
    if (currentIndex > 0) {
      const prevApp = filteredApplications[currentIndex - 1];
      setExpandedCardIds({ [prevApp._id]: true });
      setTimeout(() => {
        document.getElementById(`card-${prevApp._id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    }
  };

  // Fetch only assigned events
  const fetchAssignedEvents = async () => {
    try {
      setLoadingEvents(true);
      const res = await fetch("/api/admin/events");
      const data = await res.json();
      if (data.success) {
        setAssignedEvents(data.events);
        if (data.events.length > 0) {
          setSelectedEventId(data.events[0]._id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    fetchAssignedEvents();
  }, []);

  // Fetch applications for selected event
  const fetchApplications = async (eventId: string, silent = false) => {
    if (!eventId) return;
    try {
      if (!silent) {
        setLoadingApps(true);
      }
      setSelectedIds([]);
      // Fetch event details
      const eventRes = await fetch(`/api/admin/events/${eventId}`);
      const eventData = await eventRes.json();
      if (eventData.success) {
        setEventDetails(eventData.event);
      }

      // Fetch applications
      const appRes = await fetch(`/api/admin/applications?eventId=${eventId}`);
      const appData = await appRes.json();
      if (appRes.ok && appData.success) {
        setApplications(appData.applications);
        setFilteredApplications(appData.applications);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) {
        setLoadingApps(false);
      }
    }
  };

  useEffect(() => {
    if (selectedEventId) {
      fetchApplications(selectedEventId);
    }
  }, [selectedEventId]);

  // Search & Filtering
  useEffect(() => {
    let result = applications;
    if (statusFilter !== "ALL") {
      const sf = statusFilter.toUpperCase();
      if (sf === "CONFIRMED_ATTENDED" || sf === "CONFIRMED_OR_ATTENDED") {
        result = result.filter((app) => ["CONFIRMED", "ATTENDED"].includes((app.status || "").toUpperCase()));
      } else {
        result = result.filter((app) => (app.status || "").toUpperCase() === sf);
      }
    }
    if (messageFilter !== "ALL") {
      result = result.filter((app) => (app.messageStatus || "PENDING").toUpperCase() === messageFilter);
    }
    if (callFilter === "0_CALLS") {
      result = result.filter((app) => !app.call1Done && !app.call2Done);
    } else if (callFilter === "1_CALL") {
      result = result.filter((app) => app.call1Done && !app.call2Done);
    } else if (callFilter === "2_CALLS") {
      result = result.filter((app) => app.call2Done);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((app) => {
        const student = app.studentId || {};
        const regNo = app.registrationNumber || "";
        const name = student.name || "";
        const phone = student.phone || "";
        const call1 = app.call1Remarks || "";
        const call2 = app.call2Remarks || "";
        const remarks = app.callingRemarks || "";
        
        const customMatches = Object.values(app.customFieldsData || {}).some(val => 
          String(val).toLowerCase().includes(q)
        );

        return regNo.toLowerCase().includes(q) || 
               name.toLowerCase().includes(q) || 
               phone.toLowerCase().includes(q) ||
               call1.toLowerCase().includes(q) ||
               call2.toLowerCase().includes(q) ||
               remarks.toLowerCase().includes(q) ||
               customMatches;
      });
    }
    setFilteredApplications(result);
  }, [search, statusFilter, messageFilter, callFilter, applications]);

  // Bulk Actions
  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to change the status of ${selectedIds.length} applicants to ${newStatus}?`)) return;

    const previous = [...applications];
    setApplications((prev) =>
      prev.map((app) => (selectedIds.includes(app._id) ? { ...app, status: newStatus } : app))
    );

    try {
      setActionLoading(true);
      const res = await fetch("/api/admin/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, status: newStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSelectedIds([]);
        fetchApplications(selectedEventId, true);
      } else {
        setApplications(previous);
        alert(data.message || "Failed to update applications.");
      }
    } catch (err) {
      console.error(err);
      setApplications(previous);
      alert("Network error. Failed to update applications.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkMessageUpdate = async (newMessageStatus: string) => {
    if (selectedIds.length === 0) return;
    const previous = [...applications];
    setApplications((prev) =>
      prev.map((app) => (selectedIds.includes(app._id) ? { ...app, messageStatus: newMessageStatus } : app))
    );

    try {
      setActionLoading(true);
      const res = await fetch("/api/admin/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, messageStatus: newMessageStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSelectedIds([]);
        fetchApplications(selectedEventId, true);
      } else {
        setApplications(previous);
        alert(data.message || "Failed to update applications.");
      }
    } catch (err) {
      console.error(err);
      setApplications(previous);
      alert("Network error. Failed to update applications.");
    } finally {
      setActionLoading(false);
    }
  };

  // Single Action
  const handleSingleStatusUpdate = async (id: string, newStatus: string) => {
    const previous = [...applications];
    setApplications((prev) =>
      prev.map((app) => (app._id === id ? { ...app, status: newStatus } : app))
    );

    try {
      const res = await fetch("/api/admin/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id], status: newStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchApplications(selectedEventId, true);
      } else {
        setApplications(previous);
        alert(data.message || "Failed to update status.");
      }
    } catch (err) {
      console.error(err);
      setApplications(previous);
      alert("Network error. Failed to update status.");
    }
  };

  const handleSingleMessageUpdate = async (id: string, newMessageStatus: string) => {
    const previous = [...applications];
    setApplications((prev) =>
      prev.map((app) => (app._id === id ? { ...app, messageStatus: newMessageStatus } : app))
    );

    try {
      const res = await fetch("/api/admin/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id], messageStatus: newMessageStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchApplications(selectedEventId, true);
      } else {
        setApplications(previous);
        alert(data.message || "Failed to update message status.");
      }
    } catch (err) {
      console.error(err);
      setApplications(previous);
      alert("Network error. Failed to update message status.");
    }
  };

  const handleSingleGroupAddedUpdate = async (id: string, groupAdded: boolean) => {
    const previous = [...applications];
    setApplications((prev) =>
      prev.map((app) => (app._id === id ? { ...app, whatsappGroupAdded: groupAdded } : app))
    );

    try {
      const res = await fetch("/api/admin/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id], whatsappGroupAdded: groupAdded }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchApplications(selectedEventId, true);
      } else {
        setApplications(previous);
        alert(data.message || "Failed to update WhatsApp group status.");
      }
    } catch (err) {
      console.error(err);
      setApplications(previous);
      alert("Network error. Failed to update WhatsApp group status.");
    }
  };

  const handleBulkGroupAddedUpdate = async (groupAdded: boolean) => {
    if (selectedIds.length === 0) return;
    const actionText = groupAdded ? "mark as added to WhatsApp group" : "revert WhatsApp group status";
    if (!confirm(`Are you sure you want to ${actionText} for ${selectedIds.length} applicants?`)) return;

    const previous = [...applications];
    setApplications((prev) =>
      prev.map((app) => (selectedIds.includes(app._id) ? { ...app, whatsappGroupAdded: groupAdded } : app))
    );

    try {
      setActionLoading(true);
      const res = await fetch("/api/admin/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, whatsappGroupAdded: groupAdded }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSelectedIds([]);
        fetchApplications(selectedEventId, true);
      } else {
        setApplications(previous);
        alert(data.message || "Failed to update WhatsApp group status.");
      }
    } catch (err) {
      console.error(err);
      setApplications(previous);
      alert("Network error. Failed to update WhatsApp group status.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredApplications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredApplications.map((app) => app._id));
    }
  };

  const handleToggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((x) => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const getCustomValue = (app: any, fieldId: string) => {
    if (!app.customFieldsData) return "";
    const data = app.customFieldsData;
    let val = typeof data.get === 'function' ? data.get(fieldId) : data[fieldId];
    if (val === undefined && eventDetails?.customFormFields) {
      const fieldObj = eventDetails.customFormFields.find((f: any) => f.id === fieldId);
      if (fieldObj) {
        val = typeof data.get === 'function' ? data.get(fieldObj.label) : data[fieldObj.label];
      }
    }
    return val !== undefined ? String(val) : "";
  };

  if (loadingEvents) {
    return (
      <div className="text-center py-16 text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-red-655" />
        <p className="font-bold text-sm">Loading your assigned calling schedules...</p>
      </div>
    );
  }

  if (assignedEvents.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-16 bg-white border border-slate-200 rounded-3xl p-8 space-y-4 shadow-sm mt-8">
        <AlertCircle className="w-12 h-12 text-slate-400 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900 uppercase">No Event Assigned</h2>
        <p className="text-slate-500 text-sm">
          You are currently not assigned to any events. Please contact your Super Administrator to get calling duties.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-800">
      {/* Header Selector */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 uppercase tracking-wider">Calling Dashboard</h1>
          <p className="text-slate-500 text-xs mt-1">Manage event applicants and confirm status</p>
        </div>

        <div className="w-full md:w-80 space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Select Assigned Event</label>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-red-650"
          >
            {assignedEvents.map((ev) => (
              <option key={ev._id} value={ev._id}>
                {new Date(ev.date).toLocaleDateString("en-GB")} — {ev.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Container */}
      {selectedEventId && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Operational Details Card */}
          <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-fit space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <Calendar className="w-5 h-5 text-red-600" />
              <h3 className="font-extrabold text-slate-950 text-md uppercase">Operational Info</h3>
            </div>

            {eventDetails ? (
              <div className="space-y-3.5 text-xs text-slate-700">
                <div>
                  <span className="font-bold text-slate-450 block uppercase text-[10px]">Event Name</span>
                  <span className="text-sm font-bold text-slate-900">{eventDetails.name}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-450 block uppercase text-[10px]">Date</span>
                  <span>{new Date(eventDetails.date).toLocaleDateString("en-GB")}</span>
                </div>
                <div className="flex items-start space-x-2">
                  <MapPin className="w-4 h-4 text-red-600 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-450 block uppercase text-[10px]">Location</span>
                    <span className="line-clamp-2">{eventDetails.location}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <div>
                    <span className="font-bold text-slate-450 block uppercase text-[10px]">Reporting Time</span>
                    <span>{formatTime12(eventDetails.reportingTime)}</span>
                  </div>
                </div>
                <div className="border-t border-slate-100 pt-3 flex justify-between">
                  <div>
                    <span className="font-bold text-slate-450 block uppercase text-[10px]">Workers Required</span>
                    <span className="text-sm font-extrabold text-slate-800">{eventDetails.workersRequired}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-450 block uppercase text-[10px]">Applications</span>
                    <span className="text-sm font-extrabold text-slate-800">{applications.length}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Fetching info...</p>
            )}
          </div>

          {/* Applicant Log table */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Bulk actions toolbar */}
            {selectedIds.length > 0 && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
                <div>
                  <span className="text-sm font-semibold text-slate-600">
                    Selected: <span className="text-red-655 font-extrabold">{selectedIds.length}</span> applicants
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleBulkStatusUpdate("selected")}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm"
                    disabled={actionLoading}
                  >
                    Confirm Selection
                  </button>
                  <button
                    onClick={() => handleBulkStatusUpdate("applied")}
                    className="bg-slate-650 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm"
                    disabled={actionLoading}
                  >
                    Revert Applied
                  </button>
                  <button
                    onClick={() => handleBulkMessageUpdate("SENT")}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm"
                    disabled={actionLoading}
                  >
                    Mark Msg Sent
                  </button>
                  <button
                    onClick={() => handleBulkGroupAddedUpdate(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm"
                    disabled={actionLoading}
                  >
                    Mark Added
                  </button>
                  <button
                    onClick={() => handleBulkGroupAddedUpdate(false)}
                    className="bg-slate-500 hover:bg-slate-655 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm"
                    disabled={actionLoading}
                  >
                    Revert Added
                  </button>
                </div>
              </div>
            )}

            {/* List block */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              
              {/* Filters */}
              <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name, phone or reg..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2 text-sm focus:outline-none focus:border-red-650"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-bold focus:outline-none"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="CONFIRMED_ATTENDED">🎉 Confirmed + Attended</option>
                    <option value="CONFIRMED">✅ Confirmed (Attending)</option>
                    <option value="ATTENDED">👔 Attended / Present</option>
                    <option value="SELECTED">✨ Selected</option>
                    <option value="APPLIED">📝 Applied</option>
                    <option value="CANCELLED">🚫 Cancelled</option>
                  </select>

                  <select
                    value={messageFilter}
                    onChange={(e) => setMessageFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none"
                  >
                    <option value="ALL">All Msg Statuses</option>
                    <option value="PENDING">Msg Pending</option>
                    <option value="SENT">Msg Sent</option>
                  </select>

                  <select
                    value={callFilter}
                    onChange={(e) => setCallFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none"
                  >
                    <option value="ALL">All Call Statuses</option>
                    <option value="0_CALLS">⏳ 0 Calls (Pending)</option>
                    <option value="1_CALL">📞 1st Call Done</option>
                    <option value="2_CALLS">✓ 2 Calls Done</option>
                  </select>
                </div>
              </div>

              {/* 2-Call Verification Quick Filter Pills Bar */}
              <div className="px-6 py-3 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5 shrink-0 mr-1">
                    <PhoneCall className="w-3.5 h-3.5 text-blue-600" />
                    <span>Call Status:</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => setCallFilter("ALL")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap shrink-0 border cursor-pointer active:scale-95 ${
                      callFilter === "ALL"
                        ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>All Candidates</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                      callFilter === "ALL" ? "bg-white/25 text-white" : "bg-slate-100 text-slate-700"
                    }`}>
                      {callStats.total}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCallFilter("0_CALLS")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap shrink-0 border cursor-pointer active:scale-95 ${
                      callFilter === "0_CALLS"
                        ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                        : "bg-amber-50/80 text-amber-900 border-amber-200 hover:bg-amber-100"
                    }`}
                  >
                    <span>⏳ 0 Calls (Pending)</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                      callFilter === "0_CALLS" ? "bg-white/25 text-white" : "bg-amber-100 text-amber-900"
                    }`}>
                      {callStats.calls0}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCallFilter("1_CALL")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap shrink-0 border cursor-pointer active:scale-95 ${
                      callFilter === "1_CALL"
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-blue-50/80 text-blue-900 border-blue-200 hover:bg-blue-100"
                    }`}
                  >
                    <span>📞 1st Call Done</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                      callFilter === "1_CALL" ? "bg-white/25 text-white" : "bg-blue-100 text-blue-900"
                    }`}>
                      {callStats.calls1}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCallFilter("2_CALLS")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap shrink-0 border cursor-pointer active:scale-95 ${
                      callFilter === "2_CALLS"
                        ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                        : "bg-purple-50/80 text-purple-900 border-purple-200 hover:bg-purple-100"
                    }`}
                  >
                    <span>✓ 2 Calls Done</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                      callFilter === "2_CALLS" ? "bg-white/25 text-white" : "bg-purple-100 text-purple-900"
                    }`}>
                      {callStats.calls2}
                    </span>
                  </button>
                </div>

                <div className="text-xs text-slate-500 font-semibold self-end sm:self-auto">
                  <span>Showing <strong className="text-slate-900">{filteredApplications.length}</strong> of {callStats.total}</span>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto max-w-full">
                {loadingApps ? (
                  <div className="text-center py-10 text-slate-400">Loading applications list...</div>
                ) : (
                  <>
                    <div className="hidden md:block overflow-x-auto max-w-full">
                      <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-150 text-xs font-bold text-slate-500 uppercase">
                            <th className="px-6 py-4 text-center w-12">
                              <input
                                type="checkbox"
                                checked={selectedIds.length === filteredApplications.length && filteredApplications.length > 0}
                                onChange={handleSelectAll}
                                className="rounded border-slate-200 text-red-655"
                              />
                            </th>
                            <th className="px-6 py-4 text-slate-400 w-16 font-bold">S.No.</th>
                            <th className="px-6 py-4">Reg No.</th>
                            <th className="px-6 py-4">Name</th>
                            <th className="px-6 py-4">Calls (2-Call Check)</th>
                            <th className="px-6 py-4">Mobile No.</th>
                            {/* Dynamic Custom Fields from Form Schema only */}
                            {eventDetails?.customFormFields?.filter((f: any) => !isReservedField(f.label)).map((f: any) => (
                              <th key={f.id} className="px-6 py-4">{f.label}</th>
                            ))}
                            <th className="px-6 py-4">App Status</th>
                            <th className="px-6 py-4">WhatsApp</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                          {filteredApplications.length === 0 ? (
                            <tr>
                              <td colSpan={(eventDetails?.customFormFields?.filter((f: any) => !isReservedField(f.label)).length || 0) + 8} className="px-6 py-10 text-center text-slate-400">
                                No matching applications found.
                              </td>
                            </tr>
                          ) : (
                            filteredApplications.map((app, index) => {
                              const student = app.studentId || {};
                              const regNo = app.registrationNumber || student.universityId || "N/A";
                              const resolvedName = getApplicantName(app, eventDetails?.customFormFields);
                              const resolvedMobile = getApplicantMobile(app, eventDetails?.customFormFields);
                              return (
                                <tr key={app._id} className="hover:bg-slate-50/50 transition">
                                  <td className="px-6 py-4 text-center">
                                    <input
                                      type="checkbox"
                                      checked={selectedIds.includes(app._id)}
                                      onChange={() => handleToggleSelect(app._id)}
                                      className="rounded border-slate-200 text-red-655"
                                      id={`select-${app._id}`}
                                    />
                                  </td>
                                  <td className="px-6 py-4 font-mono text-xs text-slate-450 font-bold">
                                    {index + 1}
                                  </td>
                                  <td className="px-6 py-4 font-mono font-bold text-slate-800">
                                    {regNo}
                                  </td>
                                  <td className="px-6 py-4 font-semibold text-slate-850">
                                    {resolvedName}
                                  </td>
                                  <td className="px-6 py-4">
                                    <button
                                      type="button"
                                      onClick={() => openCallLogModal(app, app.call1Done && !app.call2Done ? 2 : 1)}
                                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition flex items-center gap-1 cursor-pointer shadow-2xs ${
                                        app.call2Done
                                          ? "bg-purple-50 text-purple-900 border-purple-300 hover:bg-purple-100"
                                          : app.call1Done
                                          ? "bg-blue-50 text-blue-900 border-blue-300 hover:bg-blue-100"
                                          : "bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100"
                                      }`}
                                      title={app.call2Remarks ? `Call 2: ${app.call2Remarks}` : app.call1Remarks ? `Call 1: ${app.call1Remarks}` : "Click to log call outcome"}
                                    >
                                      <PhoneCall className="w-3.5 h-3.5" />
                                      <span>
                                        {app.call2Done
                                          ? "✓ 2 Calls Done"
                                          : app.call1Done
                                          ? "📞 1st Call Done"
                                          : "⏳ 0/2 Calls"}
                                      </span>
                                    </button>
                                  </td>
                                  <td className="px-6 py-4 font-mono text-slate-650">
                                    {resolvedMobile ? (
                                      <a href={`tel:${resolvedMobile}`} className="text-red-655 hover:underline font-semibold">
                                        {resolvedMobile}
                                      </a>
                                    ) : (
                                      "N/A"
                                    )}
                                  </td>
                                  
                                  {/* Dynamic Custom Fields from Form Schema only */}
                                  {eventDetails?.customFormFields?.filter((f: any) => !isReservedField(f.label)).map((f: any) => {
                                    const val = getCustomValue(app, f.id);
                                    const isPhone = f.type === "phone" || f.label.toLowerCase().includes("phone") || f.label.toLowerCase().includes("mobile") || f.label.toLowerCase().includes("contact");
                                    return (
                                      <td key={f.id} className="px-6 py-4 font-medium text-slate-600">
                                        {isPhone && val ? (
                                          <a href={`tel:${val}`} className="text-red-655 hover:underline font-semibold">
                                            {val}
                                          </a>
                                        ) : (
                                          val || "-"
                                        )}
                                      </td>
                                    );
                                  })}

                                  <td className="px-6 py-4">
                                    <span
                                      className={`text-[10px] font-extrabold px-2.5 py-1 rounded border uppercase tracking-wider ${
                                        app.status === "confirmed"
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                          : app.status === "selected"
                                          ? "bg-teal-50 text-teal-700 border-teal-200"
                                          : app.status === "attended"
                                          ? "bg-blue-50 text-blue-700 border-blue-200"
                                          : app.status === "cancelled"
                                          ? "bg-rose-50 text-rose-700 border-rose-200"
                                          : "bg-slate-100 text-slate-650 border-slate-200"
                                      }`}
                                    >
                                      {app.status}
                                    </span>
                                  </td>

                                  <td className="px-6 py-4">
                                    <div className="flex flex-col space-y-1.5 items-start">
                                      <span
                                        className={`px-2 py-0.5 rounded border text-[10px] font-semibold ${
                                          (app.messageStatus || "PENDING") === "SENT"
                                            ? "bg-blue-50 text-blue-600 border-blue-200"
                                            : "bg-slate-100 text-slate-400 border-slate-200"
                                        }`}
                                      >
                                        {(app.messageStatus || "PENDING").toUpperCase()}
                                      </span>
                                      {app.whatsappGroupAdded ? (
                                        <div className="flex items-center space-x-1">
                                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold">
                                            ✓ Added
                                          </span>
                                          <button
                                            onClick={() => {
                                              if (confirm("Are you sure you want to revert this student's WhatsApp group status?")) {
                                                handleSingleGroupAddedUpdate(app._id, false);
                                              }
                                            }}
                                            className="text-[10px] text-slate-400 hover:text-red-655 font-bold"
                                          >
                                            Revert
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          onClick={() => handleSingleGroupAddedUpdate(app._id, true)}
                                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-0.5 rounded text-[10px] font-bold transition shadow-sm"
                                        >
                                          + Added
                                        </button>
                                      )}
                                    </div>
                                  </td>

                                  <td className="px-6 py-4 text-right space-x-1.5">
                                    {app.status === "applied" ? (
                                      <button
                                        onClick={() => handleSingleStatusUpdate(app._id, "confirmed")}
                                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded transition font-bold"
                                      >
                                        Confirm
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleSingleStatusUpdate(app._id, "applied")}
                                        className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded hover:bg-slate-200 transition font-bold border border-slate-200"
                                      >
                                        Revert
                                      </button>
                                    )}
                                    
                                    {(app.messageStatus || "PENDING") === "PENDING" ? (
                                      <button
                                        onClick={() => handleSingleMessageUpdate(app._id, "SENT")}
                                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded transition font-bold"
                                        title="Mark Message Sent"
                                      >
                                        Sent
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleSingleMessageUpdate(app._id, "PENDING")}
                                        className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded hover:bg-slate-200 transition font-bold border border-slate-200"
                                        title="Reset Message Pending"
                                      >
                                        Reset
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="block md:hidden space-y-4">
                      {/* Mobile Header Toolbar for Bulk Selection */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-2">
                        <label className="flex items-center space-x-2 text-xs text-slate-700 font-semibold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedIds.length === filteredApplications.length && filteredApplications.length > 0}
                            onChange={handleSelectAll}
                            className="rounded border-slate-200 text-red-655"
                          />
                          <span>Select All ({filteredApplications.length})</span>
                        </label>
                      </div>

                      {/* List of Cards */}
                      {filteredApplications.length === 0 ? (
                        <p className="text-center py-6 text-xs text-slate-400">No matching applications found.</p>
                      ) : (
                        filteredApplications.map((app, index) => {
                          const student = app.studentId || {};
                          const regNo = app.registrationNumber || student.universityId || "N/A";
                          const name = getApplicantName(app, eventDetails?.customFormFields);
                          const phone = getApplicantMobile(app, eventDetails?.customFormFields);

                          const isExpanded = !!expandedCardIds[app._id];

                          return (
                            <div key={app._id} id={`card-${app._id}`} className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/80 shadow-sm space-y-3 relative text-left">
                              {/* Card Header */}
                              <div className="flex items-start justify-between">
                                <div className="flex items-start space-x-3">
                                  <input
                                    type="checkbox"
                                    checked={selectedIds.includes(app._id)}
                                    onChange={() => handleToggleSelect(app._id)}
                                    className="rounded border-slate-200 text-red-655 focus:ring-red-655 mt-1"
                                  />
                                  <div>
                                    <h3 className="font-extrabold text-slate-900 text-sm leading-tight">{index + 1}. {name}</h3>
                                    <p className="text-xs text-slate-500 font-mono">Reg No: {regNo}</p>
                                    {phone ? (
                                      <a href={`tel:${phone}`} className="text-xs text-red-655 font-bold hover:underline inline-flex items-center mt-1">
                                        📞 Call Student ({phone})
                                      </a>
                                    ) : (
                                      <span className="text-xs text-slate-450 block mt-1">Mobile number not available</span>
                                    )}
                                  </div>
                                </div>

                                <span
                                  className={`text-[9px] font-extrabold px-2 py-0.5 rounded border uppercase tracking-wider ${
                                    app.status === "confirmed"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : app.status === "selected"
                                      ? "bg-teal-50 text-teal-700 border-teal-200"
                                      : app.status === "attended"
                                      ? "bg-blue-50 text-blue-700 border-blue-200"
                                      : app.status === "cancelled"
                                      ? "bg-rose-50 text-rose-700 border-rose-200"
                                      : "bg-slate-100 text-slate-655 border-slate-200"
                                  }`}
                                >
                                  {app.status}
                                </span>
                              </div>

                              {/* 2-Call Verification Box */}
                              <div className="bg-slate-100/90 rounded-xl p-3 border border-slate-200 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-extrabold text-slate-700 flex items-center gap-1">
                                    <PhoneCall className="w-3 h-3 text-blue-600" />
                                    <span>2-Call Verification</span>
                                  </span>
                                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                                    app.call2Done
                                      ? "bg-purple-100 text-purple-800 border border-purple-200"
                                      : app.call1Done
                                      ? "bg-blue-100 text-blue-800 border border-blue-200"
                                      : "bg-amber-100 text-amber-800 border border-amber-200"
                                  }`}>
                                    {app.call2Done ? "✓ 2 Calls Done" : app.call1Done ? "📞 1st Call Done" : "⏳ 0/2 Calls"}
                                  </span>
                                </div>

                                {app.call1Done && (
                                  <div className="text-[11px] bg-white border border-blue-100 rounded-lg p-1.5 text-slate-700 space-y-0.5">
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-blue-700 flex items-center gap-1">
                                        <Check className="w-3 h-3 text-blue-600 stroke-3" /> Call 1 Done
                                      </span>
                                      {app.call1At && (
                                        <span className="text-[10px] text-slate-400 font-mono">
                                          {new Date(app.call1At).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                        </span>
                                      )}
                                    </div>
                                    {app.call1Remarks && (
                                      <p className="text-slate-600 italic line-clamp-2 m-0 text-[10.5px]">
                                        &ldquo;{app.call1Remarks}&rdquo;
                                      </p>
                                    )}
                                  </div>
                                )}

                                {app.call2Done && (
                                  <div className="text-[11px] bg-white border border-purple-100 rounded-lg p-1.5 text-slate-700 space-y-0.5">
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-purple-700 flex items-center gap-1">
                                        <Check className="w-3 h-3 text-purple-600 stroke-3" /> Call 2 Done
                                      </span>
                                      {app.call2At && (
                                        <span className="text-[10px] text-slate-400 font-mono">
                                          {new Date(app.call2At).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                        </span>
                                      )}
                                    </div>
                                    {app.call2Remarks && (
                                      <p className="text-slate-600 italic line-clamp-2 m-0 text-[10.5px]">
                                        &ldquo;{app.call2Remarks}&rdquo;
                                      </p>
                                    )}
                                  </div>
                                )}

                                <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                                  <button
                                    type="button"
                                    onClick={() => openCallLogModal(app, 1)}
                                    className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                                      app.call1Done
                                        ? "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                                        : "bg-blue-600 hover:bg-blue-700 text-white"
                                    }`}
                                  >
                                    <Phone className="w-3 h-3" />
                                    <span>{app.call1Done ? "Edit Call 1" : "Log Call 1"}</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => openCallLogModal(app, 2)}
                                    className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                                      app.call2Done
                                        ? "bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100"
                                        : "bg-purple-600 hover:bg-purple-700 text-white"
                                    }`}
                                  >
                                    <PhoneCall className="w-3 h-3" />
                                    <span>{app.call2Done ? "Edit Call 2" : "Log Call 2"}</span>
                                  </button>
                                </div>
                              </div>

                              {/* Status row info */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs border-t border-slate-100 pt-3">
                                <div>
                                  <span className="text-[10px] text-slate-400 font-extrabold block uppercase tracking-wider mb-1">WhatsApp Status</span>
                                  <div className="flex flex-col space-y-1 items-start">
                                    <span
                                      className={`px-2 py-0.5 rounded border text-[10px] font-semibold ${
                                        (app.messageStatus || "PENDING") === "SENT"
                                          ? "bg-blue-50 text-blue-600 border-blue-200"
                                          : "bg-slate-100 text-slate-400 border-slate-200"
                                      }`}
                                    >
                                      {(app.messageStatus || "PENDING").toUpperCase()}
                                    </span>
                                    {app.whatsappGroupAdded ? (
                                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold">
                                        ✓ Added to Group
                                      </span>
                                    ) : (
                                      <span className="bg-slate-100 text-slate-400 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-bold">
                                        Not Added
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Expandable Custom Form Details */}
                              <div className="border-t border-slate-100 pt-2">
                                <button
                                  onClick={() => toggleCardDetails(app._id)}
                                  className="w-full text-center text-xs font-bold text-slate-500 hover:text-slate-700 py-1 bg-slate-100/50 rounded hover:bg-slate-100 transition"
                                >
                                  {isExpanded ? "Hide Details ▲" : "View All Details ▼"}
                                </button>

                                {isExpanded && (
                                  <div className="mt-3 bg-white p-3 rounded-lg border border-slate-200 space-y-2 text-xs">
                                    <h4 className="font-extrabold text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1 mb-2">
                                      Custom form details
                                    </h4>
                                    {eventDetails?.customFormFields?.filter((field: any) => !isReservedField(field.label)).map((field: any) => {
                                      const val = getCustomValue(app, field.id);
                                      return (
                                        <div key={field.id} className="flex flex-col sm:flex-row justify-between sm:items-center py-1 border-b border-slate-50 last:border-0 gap-1">
                                          <span className="text-slate-500 font-semibold">{field.label}:</span>
                                          <span className="text-slate-800 font-bold overflow-wrap break-word max-w-full">{val || "-"}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              {/* Actions Grid */}
                              <div className="border-t border-slate-100 pt-3 space-y-2">
                                <span className="text-[10px] text-slate-400 font-extrabold block uppercase tracking-wider mb-1">Management Actions</span>
                                <div className="flex flex-wrap gap-2">
                                  {/* Confirm/Revert */}
                                  {app.status === "applied" ? (
                                    <button
                                      onClick={() => handleSingleStatusUpdate(app._id, "confirmed")}
                                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex-1 min-h-[40px] flex items-center justify-center shadow-sm"
                                    >
                                      Confirm
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleSingleStatusUpdate(app._id, "applied")}
                                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-650 text-xs font-bold transition border border-slate-200 flex-1 min-h-[40px] flex items-center justify-center"
                                    >
                                      Revert Status
                                    </button>
                                  )}

                                  {/* WhatsApp Sent / Reset */}
                                  {(app.messageStatus || "PENDING") === "PENDING" ? (
                                    <button
                                      onClick={() => handleSingleMessageUpdate(app._id, "SENT")}
                                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex-1 min-h-[40px] flex items-center justify-center shadow-sm"
                                    >
                                      Mark Sent
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleSingleMessageUpdate(app._id, "PENDING")}
                                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-655 text-xs font-bold transition border border-slate-200 flex-1 min-h-[40px] flex items-center justify-center"
                                    >
                                      Reset Msg Status
                                    </button>
                                  )}
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  {/* WhatsApp Group Added */}
                                  {app.whatsappGroupAdded ? (
                                    <button
                                      onClick={() => {
                                        if (confirm("Are you sure you want to revert this student's WhatsApp group status?")) {
                                          handleSingleGroupAddedUpdate(app._id, false);
                                        }
                                      }}
                                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-655 text-xs font-bold transition border border-slate-200 flex-1 min-h-[40px] flex items-center justify-center"
                                    >
                                      Revert Group Added
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleSingleGroupAddedUpdate(app._id, true)}
                                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex-1 min-h-[40px] flex items-center justify-center shadow-sm"
                                    >
                                      + Added to Group
                                    </button>
                                  )}
                                </div>

                                {/* Sequential Navigation Toolbar (Previous / Next) */}
                                <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-2 gap-4">
                                  <button
                                    onClick={() => handlePrevCard(index)}
                                    disabled={index === 0}
                                    className="px-3 py-2 bg-slate-100 border border-slate-200 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs font-bold text-slate-600 flex-1 min-h-[36px]"
                                  >
                                    ← Previous
                                  </button>
                                  <button
                                    onClick={() => handleNextCard(index)}
                                    disabled={index === filteredApplications.length - 1}
                                    className="px-3 py-2 bg-slate-100 border border-slate-200 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs font-bold text-slate-600 flex-1 min-h-[36px]"
                                  >
                                    Next →
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                )}
              </div>

            </div>

          </div>

        </div>
      )}

      {/* 2-Call Verification Logging Modal */}
      {callLogModalOpen && (
        <CallLoggerModal
          isOpen={callLogModalOpen}
          application={callLogApp}
          initialRound={callLogRound}
          isSaving={savingCallLog}
          onClose={() => {
            setCallLogModalOpen(false);
            setCallLogApp(null);
          }}
          onSave={handleSaveCallLog}
        />
      )}
    </div>
  );
}
