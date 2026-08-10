"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  FileSpreadsheet,
  MessageSquare,
  Share2,
  DollarSign,
  Briefcase
} from "lucide-react";

export default function AdminEventDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const eventId = params.id;

  const [event, setEvent] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Custom payout override input state
  const [tempPayouts, setTempPayouts] = useState<Record<string, number>>({});

  const fetchEventData = async () => {
    try {
      setLoading(true);
      const eventRes = await fetch(`/api/admin/events/${eventId}`);
      const eventData = await eventRes.json();
      
      const appRes = await fetch(`/api/admin/applications?eventId=${eventId}`);
      const appData = await appRes.json();

      if (eventData.success) setEvent(eventData.event);
      if (appData.success) setApplications(appData.applications);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventData();
  }, [eventId]);

  if (loading) return <div className="text-white text-center py-12">Loading event management portal...</div>;
  if (!event) return <div className="text-white text-center py-12">Event not found.</div>;

  // Compute application statistics
  const totalApps = applications.length;
  const selectedCount = applications.filter((a) => a.status === "selected").length;
  const confirmedCount = applications.filter((a) => a.status === "confirmed").length;
  const attendedCount = applications.filter((a) => a.status === "attended").length;
  const paidCount = applications.filter((a) => a.status === "paid").length;

  // Compute live financials
  let workerPaymentsTotal = 0;
  applications.forEach((app) => {
    if (["selected", "confirmed", "attended", "paid"].includes(app.status)) {
      workerPaymentsTotal += app.paymentOverride ?? event.paymentPerStudent ?? 0;
    }
  });

  const revenue = event.clientRevenue || 0;
  const expenses = event.otherExpenses || 0;
  const profit = revenue - workerPaymentsTotal - expenses;
  const profitMargin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;

  // Toggle selection checkbox
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

  // Bulk status update
  const handleBulkStatusChange = async (targetStatus: string) => {
    if (selectedIds.length === 0) {
      alert("No student applications selected.");
      return;
    }

    if (!confirm(`Mark ${selectedIds.length} candidates as ${targetStatus.toUpperCase()}?`)) return;

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
        fetchEventData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Single application status change
  const handleSingleStatusChange = async (id: string, targetStatus: string) => {
    try {
      const res = await fetch("/api/admin/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id], status: targetStatus }),
      });
      const data = await res.json();
      if (data.success) {
        fetchEventData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit payment override for a specific student
  const handleSavePayoutOverride = async (appId: string) => {
    const amt = tempPayouts[appId];
    if (amt === undefined || isNaN(amt)) return;

    try {
      const res = await fetch("/api/admin/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [appId], status: "attended", paymentOverride: amt }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Payment override saved!");
        fetchEventData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Change Event status
  const handleUpdateEventStatus = async (newStatus: string) => {
    if (!confirm(`Are you sure you want to transition this event to ${newStatus}?`)) return;

    try {
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Event status updated!");
        fetchEventData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Generate WhatsApp message and open link
  const handleWhatsAppShare = () => {
    const dateStr = new Date(event.date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const publicUrl = `${window.location.origin}/events/${eventId}`;

    const text = `*TOPLINE ODC*\n🔔 New Hospitality Opportunity\n\n📅 *Date:* ${dateStr}\n📍 *Location:* ${event.location}\n👨🍳 *Work:* ${event.workType}\n💰 *Payment:* ₹${event.paymentPerStudent}\n👥 *Required:* ${event.workersRequired}\n⏰ *Reporting:* ${event.reportingTime}\n\nApply here:\n${publicUrl}`;
    
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank");
  };

  // Export to CSV
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Student Name,Phone,Email,University,University ID,Application Status,Payment\n";

    applications.forEach((app) => {
      const s = app.studentId || {};
      const payout = app.paymentOverride ?? event.paymentPerStudent;
      csvContent += `"${s.name || ''}","${s.phone || ''}","${s.email || ''}","${s.university || ''}","${s.universityId || ''}","${app.status}","₹${payout}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${event.name.replace(/\s+/g, "_")}_StaffList.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 text-white">
      {/* Title block */}
      <div className="flex items-center space-x-3">
        <Link href="/admin/events" className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold tracking-wider text-rose-600 uppercase">{event.name}</h1>
          <p className="text-gray-400 text-sm mt-1">Status: <span className="text-rose-600 font-bold">{event.status}</span></p>
        </div>
      </div>

      {/* Grid of logistics and action panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Logistics card */}
        <div className="bg-[#0c0d12] p-6 rounded-xl border border-gray-800 space-y-4">
          <h2 className="text-lg font-bold border-b border-gray-850 pb-2">Event Logistics</h2>
          <div className="space-y-3 text-sm text-gray-300">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-rose-600" />
              <span>Date: {new Date(event.date).toLocaleDateString("en-GB")}</span>
            </div>
            <div className="flex items-start space-x-2">
              <MapPin className="w-4 h-4 text-rose-600 mt-0.5" />
              <span>Location: {event.location}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-rose-600" />
              <span>Reporting: {event.reportingTime}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-rose-600" />
              <span>Workers Required: {event.workersRequired} candidates</span>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-850 flex flex-wrap gap-2">
            <button
              onClick={handleWhatsAppShare}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-xs font-bold transition flex items-center space-x-1"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp Message</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded text-xs font-bold transition flex items-center space-x-1"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Change event status and application rules */}
        <div className="bg-[#0c0d12] p-6 rounded-xl border border-gray-800 space-y-4">
          <h2 className="text-lg font-bold border-b border-gray-850 pb-2">Operational Controls</h2>
          <p className="text-xs text-gray-400">Current application limits: {event.applicationsCount} / {event.maxApplications}</p>
          
          <div className="flex flex-wrap gap-2 pt-2">
            {event.status === "DRAFT" && (
              <button
                onClick={() => handleUpdateEventStatus("OPEN")}
                className="bg-emerald-500 text-black px-4 py-2 rounded text-xs font-bold transition"
              >
                Publish Form (OPEN)
              </button>
            )}
            {event.status === "OPEN" && (
              <>
                <button
                  onClick={() => handleUpdateEventStatus("CLOSED")}
                  className="bg-rose-500 text-white px-4 py-2 rounded text-xs font-bold transition"
                >
                  Close Form manually
                </button>
                <button
                  onClick={() => handleUpdateEventStatus("FULL")}
                  className="bg-rose-700 text-white px-4 py-2 rounded text-xs font-bold transition"
                >
                  Mark FULL
                </button>
              </>
            )}
            {event.status === "FULL" && (
              <button
                onClick={() => handleUpdateEventStatus("OPEN")}
                className="bg-emerald-500 text-black px-4 py-2 rounded text-xs font-bold transition"
              >
                Reopen applications
              </button>
            )}
            {["OPEN", "FULL", "CLOSED"].includes(event.status) && (
              <button
                onClick={() => handleUpdateEventStatus("COMPLETED")}
                className="bg-purple-600 text-white px-4 py-2 rounded text-xs font-bold transition w-full"
              >
                Mark Event as COMPLETED
              </button>
            )}
          </div>
        </div>

        {/* Financials details - admin only */}
        <div className="bg-[#0c0d12] p-6 rounded-xl border border-gray-800 space-y-4">
          <h2 className="text-lg font-bold text-rose-600 border-b border-gray-850 pb-2 uppercase tracking-wide">Event Financials</h2>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Client Revenue:</span>
              <span className="font-bold text-white">₹{revenue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Worker Payouts:</span>
              <span className="font-bold text-rose-400">₹{workerPaymentsTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Other Expenses:</span>
              <span className="font-bold text-rose-400">₹{expenses.toLocaleString()}</span>
            </div>
            <hr className="border-gray-850" />
            <div className="flex justify-between text-sm">
              <span className="font-semibold text-emerald-400">Net Profit:</span>
              <span className="font-bold text-emerald-400">₹{profit.toLocaleString()} ({profitMargin}%)</span>
            </div>
          </div>
        </div>

      </div>

      {/* Bulk actions header */}
      <div className="bg-[#0c0d12] p-4 rounded-xl border border-gray-800 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div>
          <span className="text-sm font-semibold text-gray-400">Selected: {selectedIds.length} students</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleBulkStatusChange("selected")}
            className="bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-black border border-rose-600/30 px-3 py-1.5 rounded text-xs font-bold transition"
          >
            Mark Selected
          </button>
          <button
            onClick={() => handleBulkStatusChange("confirmed")}
            className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-black border border-emerald-500/30 px-3 py-1.5 rounded text-xs font-bold transition"
          >
            Mark Confirmed
          </button>
          <button
            onClick={() => handleBulkStatusChange("attended")}
            className="bg-purple-500/20 text-purple-400 hover:bg-purple-500 hover:text-white border border-purple-500/30 px-3 py-1.5 rounded text-xs font-bold transition"
          >
            Mark Attended
          </button>
          <button
            onClick={() => handleBulkStatusChange("cancelled")}
            className="bg-rose-500/20 text-rose-450 hover:bg-rose-500 hover:text-white border border-rose-500/30 px-3 py-1.5 rounded text-xs font-bold transition"
          >
            Mark Cancelled
          </button>
        </div>
      </div>

      {/* Applications list table */}
      <div className="bg-[#0c0d12] p-6 rounded-xl border border-gray-800">
        <h2 className="text-lg font-bold uppercase tracking-wider mb-4 border-b border-gray-850 pb-2">Registered Applicants ({totalApps})</h2>
        {applications.length === 0 ? (
          <p className="text-gray-500 text-center py-6 text-sm">No applications submitted yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="text-gray-500 border-b border-gray-850 uppercase text-xs">
                  <th className="pb-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === applications.length}
                      onChange={handleSelectAll}
                      className="rounded border-gray-800 text-rose-600 focus:ring-rose-600"
                    />
                  </th>
                  <th className="pb-3 pl-3">Student Name</th>
                  <th className="pb-3">Phone</th>
                  <th className="pb-3">University</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Custom Fields</th>
                  <th className="pb-3">Payment (₹)</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-850">
                {applications.map((app) => {
                  const s = app.studentId || {};
                  return (
                    <tr key={app._id} className="hover:bg-gray-850/20 transition">
                      <td className="py-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(app._id)}
                          onChange={() => handleToggleSelect(app._id)}
                          className="rounded border-gray-850 text-rose-600 focus:ring-rose-600"
                        />
                      </td>
                      <td className="py-4 pl-3 font-bold text-white">{s.name}</td>
                      <td className="py-4 text-gray-400">{s.phone}</td>
                      <td className="py-4 text-gray-400">
                        <span className="block font-medium">{s.university}</span>
                        <span className="text-xs text-gray-500">{s.universityId}</span>
                      </td>
                      <td className="py-4">
                        <span className="bg-rose-600/10 text-rose-600 border border-rose-600/20 px-2 py-0.5 rounded text-xs uppercase font-bold">
                          {app.status}
                        </span>
                      </td>
                      <td className="py-4 text-xs text-gray-400 max-w-xs truncate">
                        {Object.entries(app.customFieldsData || {}).map(([k, v]) => (
                          <div key={k}>
                            <span className="font-semibold text-gray-500">{k}:</span> {String(v)}
                          </div>
                        ))}
                      </td>
                      <td className="py-4">
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            placeholder={event.paymentPerStudent}
                            value={tempPayouts[app._id] !== undefined ? tempPayouts[app._id] : (app.paymentOverride ?? "")}
                            onChange={(e) => setTempPayouts({ ...tempPayouts, [app._id]: Number(e.target.value) })}
                            className="w-20 bg-[#161822] border border-gray-800 rounded px-2 py-1 text-white text-xs text-center focus:outline-none"
                          />
                          <button
                            onClick={() => handleSavePayoutOverride(app._id)}
                            className="bg-gray-800 hover:bg-rose-600 hover:text-black text-gray-300 text-xs px-2 py-1 rounded transition"
                          >
                            Set
                          </button>
                        </div>
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleSingleStatusChange(app._id, "attended")}
                            className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500 hover:text-black border border-emerald-500/20 rounded text-emerald-400 text-xs font-bold transition"
                          >
                            Attended
                          </button>
                          <button
                            onClick={() => handleSingleStatusChange(app._id, "absent")}
                            className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500 hover:text-white border border-rose-500/20 rounded text-rose-400 text-xs font-bold transition"
                          >
                            Absent
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
