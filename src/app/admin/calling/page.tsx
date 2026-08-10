"use client";

import { useEffect, useState } from "react";
import { Search, Calendar, MapPin, Clock, MessageSquare, Check, X, ChevronRight, RefreshCw, AlertCircle } from "lucide-react";

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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

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
  const fetchApplications = async (eventId: string) => {
    if (!eventId) return;
    try {
      setLoadingApps(true);
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
      setLoadingApps(false);
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
      result = result.filter((app) => app.status === statusFilter.toLowerCase());
    }
    if (messageFilter !== "ALL") {
      result = result.filter((app) => (app.messageStatus || "PENDING").toUpperCase() === messageFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((app) => {
        const student = app.studentId || {};
        const regNo = app.registrationNumber || "";
        const name = student.name || "";
        const phone = student.phone || "";
        return regNo.toLowerCase().includes(q) || name.toLowerCase().includes(q) || phone.toLowerCase().includes(q);
      });
    }
    setFilteredApplications(result);
  }, [search, statusFilter, messageFilter, applications]);

  // Bulk Actions
  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to change the status of ${selectedIds.length} applicants to ${newStatus}?`)) return;

    try {
      setActionLoading(true);
      const res = await fetch("/api/admin/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, status: newStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`Successfully marked ${selectedIds.length} applicants as ${newStatus}!`);
        setSelectedIds([]);
        fetchApplications(selectedEventId);
      } else {
        alert(data.message || "Failed to update applications.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkMessageUpdate = async (newMessageStatus: string) => {
    if (selectedIds.length === 0) return;
    try {
      setActionLoading(true);
      const res = await fetch("/api/admin/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, messageStatus: newMessageStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`Successfully updated message status to ${newMessageStatus} for ${selectedIds.length} applicants.`);
        setSelectedIds([]);
        fetchApplications(selectedEventId);
      } else {
        alert(data.message || "Failed to update applications.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Single Action
  const handleSingleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      const res = await fetch("/api/admin/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id], status: newStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchApplications(selectedEventId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSingleMessageUpdate = async (id: string, newMessageStatus: string) => {
    try {
      const res = await fetch("/api/admin/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id], messageStatus: newMessageStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchApplications(selectedEventId);
      }
    } catch (err) {
      console.error(err);
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
                    <span>{eventDetails.reportingTime}</span>
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
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="APPLIED">Applied</option>
                    <option value="SELECTED">Selected</option>
                    <option value="ATTENDED">Attended</option>
                    <option value="CANCELLED">Cancelled</option>
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
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto max-w-full">
                {loadingApps ? (
                  <div className="text-center py-10 text-slate-400">Loading applications list...</div>
                ) : (
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
                        <th className="px-6 py-4">Reg No</th>
                        <th className="px-6 py-4">Name</th>
                        <th className="px-6 py-4">Phone</th>
                        {/* Dynamic Custom Fields */}
                        {eventDetails?.customFormFields?.map((f: any) => (
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
                          <td colSpan={(eventDetails?.customFormFields?.length || 0) + 7} className="px-6 py-10 text-center text-slate-400">
                            No matching applications found.
                          </td>
                        </tr>
                      ) : (
                        filteredApplications.map((app) => {
                          const student = app.studentId || {};
                          return (
                            <tr key={app._id} className="hover:bg-slate-50/50 transition">
                              <td className="px-6 py-4 text-center">
                                <input
                                  type="checkbox"
                                  checked={selectedIds.includes(app._id)}
                                  onChange={() => handleToggleSelect(app._id)}
                                  className="rounded border-slate-200 text-red-655"
                                />
                              </td>
                              <td className="px-6 py-4 font-mono font-bold text-slate-800">{app.registrationNumber || student.universityId || "-"}</td>
                              <td className="px-6 py-4 font-semibold text-slate-800">{student.name || "N/A"}</td>
                              <td className="px-6 py-4">
                                <a
                                  href={`tel:${student.phone}`}
                                  className="text-red-655 hover:underline font-semibold"
                                >
                                  {student.phone || "N/A"}
                                </a>
                              </td>
                              
                              {/* Dynamic Custom Values */}
                              {eventDetails?.customFormFields?.map((f: any) => {
                                const val = getCustomValue(app, f.id);
                                return (
                                  <td key={f.id} className="px-6 py-4 font-medium text-slate-600">
                                    {val || "-"}
                                  </td>
                                );
                              })}

                              <td className="px-6 py-4">
                                <span
                                  className={`text-[10px] font-extrabold px-2.5 py-1 rounded border uppercase tracking-wider ${
                                    app.status === "selected"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : app.status === "attended"
                                      ? "bg-blue-50 text-blue-700 border-blue-200"
                                      : app.status === "cancelled"
                                      ? "bg-rose-50 text-rose-700 border-rose-200"
                                      : "bg-slate-100 text-slate-600 border-slate-200"
                                  }`}
                                >
                                  {app.status}
                                </span>
                              </td>

                              <td className="px-6 py-4 text-xs font-semibold">
                                <span
                                  className={`px-2 py-0.5 rounded border ${
                                    (app.messageStatus || "PENDING") === "SENT"
                                      ? "bg-blue-50 text-blue-600 border-blue-200"
                                      : "bg-slate-100 text-slate-400 border-slate-200"
                                  }`}
                                >
                                  {(app.messageStatus || "PENDING").toUpperCase()}
                                </span>
                              </td>

                              <td className="px-6 py-4 text-right space-x-1.5">
                                {app.status === "applied" ? (
                                  <button
                                    onClick={() => handleSingleStatusUpdate(app._id, "selected")}
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
                )}
              </div>

            </div>

          </div>

        </div>
      )}
    </div>
  );
}
