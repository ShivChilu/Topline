"use client";

import { useEffect, useState } from "react";
import { Search, Eye, Filter } from "lucide-react";
import Link from "next/link";

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [selectedEventId, setSelectedEventId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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
            return (
              (s.name && s.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
              (s.phone && s.phone.includes(searchQuery))
            );
          });
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
  }, [selectedEventId, selectedStatus, searchQuery]);

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
    <div className="space-y-6 text-white">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-wider text-rose-600 uppercase">
          Review Applications
        </h1>
        <p className="text-gray-400 text-sm mt-1">Audit student registrations across all active events</p>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[#0c0d12] p-4 rounded-xl border border-gray-800 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate name / phone..."
              className="w-full bg-[#161822] border border-gray-800 rounded-lg pl-10 pr-3 py-2 text-sm text-white focus:outline-none focus:border-rose-600"
            />
          </div>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="bg-[#161822] border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-600"
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
            className="bg-[#161822] border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-600"
          >
            <option value="">All Statuses...</option>
            {["applied", "under_review", "selected", "confirmed", "cancelled", "attended", "absent", "paid"].map((st) => (
              <option key={st} value={st}>
                {st.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bulk action buttons */}
      {selectedIds.length > 0 && (
        <div className="bg-rose-600/10 p-3 rounded-lg border border-rose-600/20 flex gap-2 items-center">
          <span className="text-xs font-bold text-rose-600 mr-2 uppercase">Bulk Selection:</span>
          <button
            onClick={() => handleBulkStatusChange("selected")}
            className="bg-rose-600 hover:bg-rose-700 text-black text-xs font-bold px-3 py-1.5 rounded transition"
          >
            Select ({selectedIds.length})
          </button>
          <button
            onClick={() => handleBulkStatusChange("confirmed")}
            className="bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold px-3 py-1.5 rounded transition"
          >
            Confirm
          </button>
          <button
            onClick={() => handleBulkStatusChange("attended")}
            className="bg-purple-600 hover:bg-purple-750 text-white text-xs font-bold px-3 py-1.5 rounded transition"
          >
            Attended
          </button>
        </div>
      )}

      {/* Table view */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading registrations list...</p>
        </div>
      ) : applications.length === 0 ? (
        <div className="text-center py-16 bg-[#0c0d12] rounded-xl border border-gray-800">
          <p className="text-gray-500">No student applications matching filter criteria.</p>
        </div>
      ) : (
        <div className="bg-[#0c0d12] rounded-xl border border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="text-gray-500 border-b border-gray-850 uppercase text-xs">
                  <th className="p-4 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === applications.length}
                      onChange={handleSelectAll}
                      className="rounded border-gray-800 text-rose-600 focus:ring-rose-600"
                    />
                  </th>
                  <th className="p-4">Candidate</th>
                  <th className="p-4">Phone</th>
                  <th className="p-4">Target Event</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Submitted At</th>
                  <th className="p-4 text-right">Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-850">
                {applications.map((app) => {
                  const s = app.studentId || {};
                  const ev = app.eventId || {};
                  return (
                    <tr key={app._id} className="hover:bg-gray-800/10 transition">
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(app._id)}
                          onChange={() => handleToggleSelect(app._id)}
                          className="rounded border-gray-850 text-rose-600 focus:ring-rose-600"
                        />
                      </td>
                      <td className="p-4 font-bold text-white">
                        <div>{s.name}</div>
                        <div className="text-xs text-gray-500 font-semibold uppercase">{s.universityId}</div>
                      </td>
                      <td className="p-4 text-gray-450">{s.phone}</td>
                      <td className="p-4">
                        <div className="font-semibold text-white">{ev.name}</div>
                        <div className="text-xs text-gray-500">{new Date(ev.date).toLocaleDateString("en-GB")}</div>
                      </td>
                      <td className="p-4">
                        <span className="bg-rose-600/10 text-rose-600 border border-rose-600/20 px-2 py-0.5 rounded text-xs uppercase font-bold">
                          {app.status}
                        </span>
                      </td>
                      <td className="p-4 text-gray-450">{new Date(app.createdAt).toLocaleDateString("en-GB")}</td>
                      <td className="p-4 text-right">
                        <Link
                          href={`/admin/events/${ev._id}`}
                          className="text-rose-600 hover:underline text-xs flex items-center justify-end space-x-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Review</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
