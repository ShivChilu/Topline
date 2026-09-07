"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Calendar, MapPin, Eye, Edit, Trash2, QrCode, Copy, Archive, X } from "lucide-react";

export default function AdminEventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("ALL");
  const [currentAdminRole, setCurrentAdminRole] = useState<string | null>(null);

  // Delete modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState<any>(null);
  const [deleteStats, setDeleteStats] = useState<any>(null);
  const [confirmNameInput, setConfirmNameInput] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUserRole = async () => {
    try {
      const res = await fetch("/api/admin/users/me");
      const data = await res.json();
      if (data.success) {
        setCurrentAdminRole(data.role);
      }
    } catch (err) {
      console.error("Error fetching user role:", err);
    }
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/events");
      const data = await res.json();
      if (data.success) {
        setEvents(data.events);
        setFilteredEvents(data.events);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchUserRole();
  }, []);

  useEffect(() => {
    let result = events;
    if (tab !== "ALL") {
      result = result.filter((e) => e.status === tab);
    }
    if (search) {
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(search.toLowerCase()) ||
          e.location.toLowerCase().includes(search.toLowerCase())
      );
    }
    setFilteredEvents(result);
  }, [tab, search, events]);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    if (!confirm(`Are you sure you want to change status to ${newStatus}?`)) return;

    try {
      const res = await fetch(`/api/admin/events/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Status updated successfully!");
        fetchEvents();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm("Are you sure you want to archive this event? It will be hidden but retained in records.")) return;

    try {
      const res = await fetch(`/api/admin/events/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ARCHIVED" }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Event archived successfully!");
        fetchEvents();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openDeleteModal = async (eventObj: any) => {
    try {
      setDeletingEvent(eventObj);
      setConfirmNameInput("");
      setShowDeleteModal(true);
      
      // Fetch dynamic stats for confirmation
      const res = await fetch(`/api/admin/events/${eventObj._id}?stats=true`);
      const data = await res.json();
      if (data.success) {
        setDeleteStats(data.stats);
      }
    } catch (err) {
      console.error("Fetch delete stats error:", err);
    }
  };

  const handlePermanentDelete = async () => {
    if (!deletingEvent) return;

    // Strong confirmation validation check
    const hasData = deleteStats && (deleteStats.applicationsCount > 0 || deleteStats.attendanceCount > 0 || deleteStats.paymentsCount > 0);
    if (hasData && confirmNameInput.trim().toLowerCase() !== deletingEvent.name.trim().toLowerCase()) {
      alert("Please enter the correct event name to confirm deletion.");
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch(`/api/admin/events/${deletingEvent._id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        alert(`✓ Event "${deletingEvent.name}" permanently deleted.`);
        setShowDeleteModal(false);
        setDeletingEvent(null);
        setDeleteStats(null);
        fetchEvents();
      } else {
        alert(data.message || "Failed to delete event.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-wider text-red-600 uppercase">
            {currentAdminRole === "event_admin" ? "Assigned Events" : "Manage Events"}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {currentAdminRole === "event_admin"
              ? "View candidate rosters and manage shift attendance for your assigned events"
              : "Create, publish, and monitor catering schedules"}
          </p>
        </div>
        {currentAdminRole !== "event_admin" && currentAdminRole !== "calling" && (
          <Link
            href="/admin/events/create"
            className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition flex items-center justify-center space-x-2 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create Event</span>
          </Link>
        )}
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-450" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-red-650"
          />
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto justify-start">
          {["ALL", "DRAFT", "OPEN", "FULL", "CLOSED", "COMPLETED", "ARCHIVED"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded text-xs font-bold tracking-wider uppercase transition ${
                tab === t ? "bg-red-600 text-white" : "bg-slate-100 text-slate-500 hover:text-slate-800"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of cards */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-slate-450">Loading events...</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <p className="text-slate-450">No events found matching your filter criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => (
            <div
              key={event._id}
              className="bg-white rounded-xl border border-slate-200 flex flex-col justify-between overflow-hidden group hover:border-red-600/30 transition duration-300 shadow-sm"
            >
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-450 font-semibold uppercase">{event.workType}</span>
                  <span className="bg-red-600/10 text-red-600 border border-red-600/20 px-2 py-0.5 rounded text-xs font-bold uppercase">
                    {event.status}
                  </span>
                </div>
                <h3 className="text-xl font-bold hover:text-red-600 transition">
                  <Link href={`/admin/events/${event._id}`}>{event.name}</Link>
                </h3>
                <div className="space-y-2 text-sm text-slate-500">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-red-600" />
                    <span>{new Date(event.date).toLocaleDateString("en-GB")}</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <MapPin className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-1">{event.location}</span>
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="bg-slate-50/50 border-t border-slate-200 px-6 py-4 flex items-center justify-between gap-2">
                <div className="flex gap-2">
                  <Link
                    href={`/admin/events/${event._id}`}
                    className="p-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-slate-650 transition"
                    title="View & Manage"
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                  <Link
                    href={`/admin/events/${event._id}/attendance`}
                    className="p-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-slate-655 transition"
                    title="Attendance QR & Logs"
                  >
                    <QrCode className="w-4 h-4 text-red-600" />
                  </Link>
                  <Link
                    href={`/events/${event._id}`}
                    target="_blank"
                    className="p-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-slate-650 transition"
                    title="Preview Public Page"
                  >
                    <Edit className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/events/${event._id}`;
                      navigator.clipboard.writeText(url);
                      alert("Public event link copied to clipboard!");
                    }}
                    className="p-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-slate-650 transition"
                    title="Copy Public Link"
                  >
                    <Copy className="w-4 h-4 text-slate-600" />
                  </button>
                </div>
                {currentAdminRole !== "event_admin" && currentAdminRole !== "calling" && (
                  <div className="flex gap-2 items-center">
                    {event.status === "DRAFT" && (
                      <button
                        onClick={() => handleUpdateStatus(event._id, "OPEN")}
                        className="bg-emerald-600/10 text-emerald-600 border border-emerald-500/20 px-3 py-1 rounded text-xs font-bold transition hover:bg-emerald-600 hover:text-white"
                      >
                        Publish
                      </button>
                    )}
                    {event.status === "OPEN" && (
                      <button
                        onClick={() => handleUpdateStatus(event._id, "CLOSED")}
                        className="bg-red-500/10 text-red-655 border border-red-550/20 px-3 py-1 rounded text-xs font-bold transition hover:bg-red-655 hover:text-white"
                      >
                        Close Form
                      </button>
                    )}
                    {event.status !== "ARCHIVED" && (
                      <button
                        onClick={() => handleArchive(event._id)}
                        className="p-2 bg-amber-50 hover:bg-amber-600 border border-amber-200 text-amber-700 hover:text-white rounded transition"
                        title="Archive Event"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => openDeleteModal(event)}
                      className="p-2 bg-rose-50 hover:bg-red-600 border border-rose-200 text-red-655 hover:text-white rounded transition"
                      title="Delete Event"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 relative animate-scale-in">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-4">
              <div className="text-center text-red-600 font-extrabold text-lg uppercase tracking-wider">
                Delete Event?
              </div>

              <div className="text-sm text-slate-500 text-center">
                You are about to permanently delete this event and all associated operational records:
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5 text-xs text-slate-700">
                <div>
                  <span className="font-bold text-slate-500">Event:</span> {deletingEvent.name}
                </div>
                <div>
                  <span className="font-bold text-slate-500">Date:</span> {new Date(deletingEvent.date).toLocaleDateString("en-GB")}
                </div>

                {deleteStats ? (
                  <div className="border-t border-slate-200 pt-2.5 mt-2.5 space-y-1.5">
                    <div className="flex justify-between">
                      <span>Applications:</span>
                      <span className="font-bold text-slate-800">{deleteStats.applicationsCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Attendance Records:</span>
                      <span className="font-bold text-slate-800">{deleteStats.attendanceCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Payments Recorded:</span>
                      <span className="font-bold text-slate-800">{deleteStats.paymentsCount}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400 italic text-center pt-2">Loading event statistics...</p>
                )}
              </div>

              <div className="text-xs text-rose-655 font-bold text-center border border-rose-100 bg-rose-50 p-2.5 rounded-xl">
                ⚠ This action is permanent and cannot be undone.
              </div>

              {/* Strong Confirmation Input (if event has operational data) */}
              {deleteStats && (deleteStats.applicationsCount > 0 || deleteStats.attendanceCount > 0 || deleteStats.paymentsCount > 0) && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-500 uppercase block">
                      Type event name to confirm:
                    </label>
                    <button
                      type="button"
                      onClick={() => setConfirmNameInput(deletingEvent.name)}
                      className="text-[11px] text-red-600 font-bold hover:underline cursor-pointer"
                    >
                      ⚡ Auto-fill
                    </button>
                  </div>
                  <input
                    type="text"
                    value={confirmNameInput}
                    onChange={(e) => setConfirmNameInput(e.target.value)}
                    placeholder={`Type "${deletingEvent.name}" here`}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 font-medium"
                    autoFocus
                  />
                  {confirmNameInput.trim().toLowerCase() !== deletingEvent.name.trim().toLowerCase() ? (
                    <p className="text-[10px] text-slate-500">
                      Must match: <span className="font-semibold text-slate-800">{deletingEvent.name}</span>
                    </p>
                  ) : (
                    <p className="text-[10px] text-emerald-600 font-bold">
                      ✓ Name confirmed. Delete button unlocked.
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition border border-slate-200"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handlePermanentDelete}
                  className={`flex-1 py-2.5 font-bold rounded-xl text-xs transition ${
                    deleteStats && (deleteStats.applicationsCount > 0 || deleteStats.attendanceCount > 0 || deleteStats.paymentsCount > 0)
                      ? confirmNameInput.trim().toLowerCase() === deletingEvent.name.trim().toLowerCase()
                        ? "bg-red-600 hover:bg-red-700 text-white shadow-sm cursor-pointer"
                        : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                      : "bg-red-600 hover:bg-red-700 text-white shadow-sm cursor-pointer"
                  }`}
                  disabled={
                    actionLoading ||
                    (!!deleteStats &&
                      (deleteStats.applicationsCount > 0 || deleteStats.attendanceCount > 0 || deleteStats.paymentsCount > 0) &&
                      confirmNameInput.trim().toLowerCase() !== deletingEvent.name.trim().toLowerCase())
                  }
                >
                  {actionLoading ? "Deleting..." : "Permanently Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
