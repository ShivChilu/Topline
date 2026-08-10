"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Calendar, MapPin, Eye, Edit, Trash2 } from "lucide-react";

export default function AdminEventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("ALL");

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
    if (!confirm("Are you sure you want to archive (soft-delete) this event?")) return;

    try {
      const res = await fetch(`/api/admin/events/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        alert("Event archived successfully!");
        fetchEvents();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 text-slate-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-wider text-red-600 uppercase">
            Manage Events
          </h1>
          <p className="text-slate-500 text-sm mt-1">Create, publish, and monitor catering schedules</p>
        </div>
        <Link
          href="/admin/events/create"
          className="bg-red-600 hover:bg-red-700 text-black px-5 py-2.5 rounded-lg text-sm font-bold transition flex items-center justify-center space-x-2 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create Event</span>
        </Link>
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-450" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-red-600"
          />
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto justify-start">
          {["ALL", "DRAFT", "OPEN", "FULL", "CLOSED", "COMPLETED", "ARCHIVED"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded text-xs font-bold tracking-wider uppercase transition ${
                tab === t ? "bg-red-600 text-black" : "bg-gray-800/60 text-slate-500 hover:text-slate-900"
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
              className="bg-white rounded-xl border border-slate-200 flex flex-col justify-between overflow-hidden group hover:border-red-600/30 transition duration-300"
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
                    className="p-2 bg-gray-800 hover:bg-gray-700 rounded text-slate-650 transition"
                    title="View & Manage"
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                  <Link
                    href={`/events/${event._id}`}
                    target="_blank"
                    className="p-2 bg-gray-800 hover:bg-gray-700 rounded text-slate-650 transition"
                    title="Preview Public Page"
                  >
                    <Edit className="w-4 h-4" />
                  </Link>
                </div>
                <div className="flex gap-2">
                  {event.status === "DRAFT" && (
                    <button
                      onClick={() => handleUpdateStatus(event._id, "OPEN")}
                      className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-black border border-emerald-500/20 px-3 py-1 rounded text-xs font-bold transition"
                    >
                      Publish
                    </button>
                  )}
                  {event.status === "OPEN" && (
                    <button
                      onClick={() => handleUpdateStatus(event._id, "CLOSED")}
                      className="bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-slate-900 border border-red-500/20 px-3 py-1 rounded text-xs font-bold transition"
                    >
                      Close Form
                    </button>
                  )}
                  {event.status !== "ARCHIVED" && (
                    <button
                      onClick={() => handleArchive(event._id)}
                      className="p-2 bg-red-950/20 hover:bg-red-500 hover:text-black border border-red-900/30 rounded text-red-400 transition"
                      title="Archive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
