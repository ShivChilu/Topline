"use client";

import { useEffect, useState } from "react";
import { Search, Eye, Filter, Trash2, PhoneCall, Phone, Check, Clock, MessageSquare } from "lucide-react";
import Link from "next/link";
import CallLoggerModal from "@/components/admin/CallLoggerModal";

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Filters
  const [selectedEventId, setSelectedEventId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedCallStatus, setSelectedCallStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 2-Call Verification Modal State
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

  const fetchEvents = async () => {
    try {
      const res = await fetch("/api/admin/events");
      const data = await res.json();
      if (data.success) {
        setEvents(data.events);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchApplications = async () => {
    try {
      setLoading(true);
      let url = "/api/admin/applications";
      const params = new URLSearchParams();
      if (selectedEventId) params.append("eventId", selectedEventId);
      if (selectedStatus) params.append("status", selectedStatus);
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        let list = data.applications;
        // Client side filtering for search query
        if (searchQuery) {
          list = list.filter((app: any) => {
            const s = app.studentId || {};
            const call1 = app.call1Remarks || "";
            const call2 = app.call2Remarks || "";
            const q = searchQuery.toLowerCase();
            return (
              (s.name && s.name.toLowerCase().includes(q)) ||
              (s.phone && s.phone.includes(q)) ||
              call1.toLowerCase().includes(q) ||
              call2.toLowerCase().includes(q)
            );
          });
        }
        if (selectedCallStatus === "0_CALLS") {
          list = list.filter((app: any) => !app.call1Done && !app.call2Done);
        } else if (selectedCallStatus === "1_CALL") {
          list = list.filter((app: any) => app.call1Done && !app.call2Done);
        } else if (selectedCallStatus === "2_CALLS") {
          list = list.filter((app: any) => app.call2Done);
        }
        setApplications(list);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [selectedEventId, selectedStatus, selectedCallStatus, searchQuery]);

  const handleBulkStatusChange = async (targetStatus: string) => {
    if (selectedIds.length === 0) {
      alert("No applications selected.");
      return;
    }

    if (!confirm(`Mark ${selectedIds.length} selected applications as ${targetStatus.toUpperCase()}?`)) return;

    try {
      const res = await fetch("/api/admin/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, status: targetStatus }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setSelectedIds([]);
        fetchApplications();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Permanently delete a single application
  const handleDeleteApplication = async (appId: string, candidateName: string) => {
    if (
      !confirm(
        `Are you sure you want to PERMANENTLY delete this event registration for "${candidateName}"?\n\n(The student account itself will remain safe, only this event application will be erased).`
      )
    ) {
      return;
    }

    try {
      setActionLoading(appId);
      const res = await fetch(`/api/admin/applications?id=${appId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        alert("✓ Application deleted successfully.");
        setApplications((prev) => prev.filter((a) => a._id !== appId && a.id !== appId));
        setSelectedIds((prev) => prev.filter((id) => id !== appId));
      } else {
        alert(data.message || "Failed to delete application.");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting application.");
    } finally {
      setActionLoading(null);
    }
  };

  // Permanently delete multiple selected applications
  const handleBulkDeleteApplications = async () => {
    if (selectedIds.length === 0) return;
    if (
      !confirm(
        `Are you sure you want to PERMANENTLY delete ${selectedIds.length} selected application(s)?\n\nThis will remove their event registrations and attendance. Student accounts remain safe.`
      )
    ) {
      return;
    }

    try {
      setActionLoading("bulk");
      const res = await fetch(`/api/admin/applications?ids=${selectedIds.join(",")}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        alert(data.message || "Applications deleted.");
        setApplications((prev) => prev.filter((a) => !selectedIds.includes(a._id) && !selectedIds.includes(a.id)));
        setSelectedIds([]);
      } else {
        alert(data.message || "Bulk delete failed.");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting applications.");
    } finally {
      setActionLoading(null);
    }
  };


  const handleToggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((x) => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === applications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(applications.map((a) => a._id));
    }
  };

  return (
    <div className="space-y-6 text-slate-900">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-wider text-red-600 uppercase">
          Review Applications
        </h1>
        <p className="text-slate-500 text-sm mt-1">Audit student registrations across all active events</p>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-450" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate name / phone..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-red-600"
            />
          </div>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-red-600"
          >
            <option value="">All Events...</option>
            {events.map((e) => (
              <option key={e._id} value={e._id}>
                {e.name} ({new Date(e.date).toLocaleDateString("en-GB")})
              </option>
            ))}
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-red-600"
          >
            <option value="">All Statuses...</option>
            {["applied", "under_review", "selected", "confirmed", "cancelled", "attended", "absent", "paid"].map((st) => (
              <option key={st} value={st}>
                {st.toUpperCase()}
              </option>
            ))}
          </select>
          <select
            value={selectedCallStatus}
            onChange={(e) => setSelectedCallStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-bold focus:outline-none focus:border-red-600"
          >
            <option value="">All Call Statuses...</option>
            <option value="0_CALLS">⏳ 0 Calls (Pending)</option>
            <option value="1_CALL">📞 1st Call Done</option>
            <option value="2_CALLS">✓ 2 Calls Done</option>
          </select>
        </div>
      </div>

      {/* Bulk action buttons */}
      {selectedIds.length > 0 && (
        <div className="bg-red-600/10 p-3 rounded-lg border border-red-600/20 flex flex-wrap gap-2 items-center">
          <span className="text-xs font-bold text-red-600 mr-2 uppercase">Bulk Selection:</span>
          <button
            onClick={() => handleBulkStatusChange("selected")}
            className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded transition"
          >
            Select ({selectedIds.length})
          </button>
          <button
            onClick={() => handleBulkStatusChange("confirmed")}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded transition"
          >
            Confirm
          </button>
          <button
            onClick={() => handleBulkStatusChange("attended")}
            className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3 py-1.5 rounded transition"
          >
            Attended
          </button>
          <button
            onClick={handleBulkDeleteApplications}
            disabled={actionLoading === "bulk"}
            className="bg-red-700 hover:bg-red-800 text-white text-xs font-bold px-3 py-1.5 rounded transition flex items-center gap-1.5 sm:ml-auto"
            title="Permanently delete selected applications"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete ({selectedIds.length})</span>
          </button>
        </div>
      )}

      {/* Table view */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-slate-450">Loading registrations list...</p>
        </div>
      ) : applications.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <p className="text-slate-450">No student applications matching filter criteria.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="text-slate-450 border-b border-slate-200 uppercase text-xs">
                  <th className="p-4 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === applications.length}
                      onChange={handleSelectAll}
                      className="rounded border-slate-200 text-red-600 focus:ring-red-600"
                    />
                  </th>
                  <th className="p-4">Candidate</th>
                  <th className="p-4">Phone</th>
                  <th className="p-4">Target Event</th>
                  <th className="p-4">Calls (2-Call Check)</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Submitted At</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-850">
                {applications.map((app) => {
                  const s = app.studentId || {};
                  const ev = app.eventId || {};
                  const appId = app._id || app.id;
                  return (
                    <tr key={appId} className="hover:bg-slate-100/10 transition">
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(appId)}
                          onChange={() => handleToggleSelect(appId)}
                          className="rounded border-slate-200 text-red-600 focus:ring-red-600"
                        />
                      </td>
                      <td className="p-4 font-bold text-slate-900">
                        <div>{s.name}</div>
                        <div className="text-xs text-slate-450 font-semibold uppercase">{s.universityId}</div>
                      </td>
                      <td className="p-4 text-gray-450">
                        {s.phone ? (
                          <div className="flex items-center gap-1.5">
                            <a
                              href={`tel:${s.phone}`}
                              className="font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 text-xs"
                              title="Click to dial"
                            >
                              <Phone className="w-3 h-3 text-emerald-600" />
                              <span>{s.phone}</span>
                            </a>
                            <a
                              href={`https://wa.me/91${s.phone.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#25D366] hover:text-[#128C7E] ml-1"
                              title="Open WhatsApp Chat"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-[#25D366]" />
                            </a>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">N/A</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-slate-900">{ev.name}</div>
                        <div className="text-xs text-slate-450">{new Date(ev.date).toLocaleDateString("en-GB")}</div>
                      </td>
                      <td className="p-4">
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
                      <td className="p-4">
                        <span className="bg-red-600/10 text-red-600 border border-red-600/20 px-2 py-0.5 rounded text-xs uppercase font-bold">
                          {app.status}
                        </span>
                      </td>
                      <td className="p-4 text-gray-450">{new Date(app.createdAt).toLocaleDateString("en-GB")}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Link
                            href={`/admin/events/${ev._id || ev.id}`}
                            className="text-red-600 hover:text-red-700 font-semibold text-xs flex items-center space-x-1 p-1 rounded hover:bg-red-50 transition"
                            title="Review inside event"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Review</span>
                          </Link>
                          <button
                            onClick={() => handleDeleteApplication(appId, s.name || "Candidate")}
                            disabled={actionLoading === appId}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-rose-50 rounded transition"
                            title="Delete Application Permanently"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
