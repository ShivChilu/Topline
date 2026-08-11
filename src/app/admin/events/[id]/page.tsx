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
  Briefcase,
  QrCode
} from "lucide-react";

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

export default function AdminEventDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const eventId = params.id;

  const [event, setEvent] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Custom payout override input state
  const [tempPayouts, setTempPayouts] = useState<Record<string, number>>({});

  const fetchEventData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      
      const eventRes = await fetch(`/api/admin/events/${eventId}?t=${Date.now()}`, { cache: "no-store" });
      if (eventRes.status === 403) {
        setErrorMsg("403 Access Denied. You do not have permission to view this event.");
        setLoading(false);
        return;
      }
      
      const eventData = await eventRes.json();
      if (!eventData.success) {
        setErrorMsg(eventData.message || "Failed to load event.");
        setLoading(false);
        return;
      }

      const appRes = await fetch(`/api/admin/applications?eventId=${eventId}&t=${Date.now()}`, { cache: "no-store" });
      const appData = await appRes.json();

      setEvent(eventData.event);
      if (appData.success) setApplications(appData.applications);
    } catch (err) {
      console.error(err);
      setErrorMsg("An error occurred while loading event details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventData();
  }, [eventId]);

  if (loading) return <div className="text-slate-900 text-center py-12">Loading event management portal...</div>;
  
  if (errorMsg) {
    return (
      <div className="max-w-md mx-auto text-center py-16 bg-white border border-slate-200 rounded-3xl p-8 space-y-4 shadow-sm mt-8">
        <div className="text-rose-600 text-lg font-bold uppercase">403 Access Denied</div>
        <p className="text-slate-500 text-sm">{errorMsg}</p>
        <Link href="/admin/calling" className="inline-block bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold transition">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  if (!event) return <div className="text-slate-900 text-center py-12">Event not found.</div>;

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

  // Bulk update applications (status, payment, message)
  const handleBulkUpdate = async (updatePayload: { status?: string; paymentStatus?: string; messageStatus?: string; paymentOverride?: number; whatsappGroupAdded?: boolean }) => {
    if (selectedIds.length === 0) {
      alert("No student applications selected.");
      return;
    }

    let confirmationMsg = "Update selected applications?";
    if (updatePayload.status) {
      confirmationMsg = `Update status to ${updatePayload.status.toUpperCase()} for ${selectedIds.length} students?`;
    } else if (updatePayload.paymentStatus) {
      confirmationMsg = `Mark ${selectedIds.length} selected students as ${updatePayload.paymentStatus.toUpperCase()}?`;
    } else if (updatePayload.messageStatus) {
      confirmationMsg = `Send message to ${selectedIds.length} selected students?`;
    } else if (updatePayload.paymentOverride) {
      confirmationMsg = `Apply payment of ₹${updatePayload.paymentOverride} to ${selectedIds.length} selected students?`;
    } else if (updatePayload.whatsappGroupAdded !== undefined) {
      confirmationMsg = updatePayload.whatsappGroupAdded
        ? `Mark ${selectedIds.length} selected students as ADDED to WhatsApp Group?`
        : `Revert WhatsApp Group status to NOT ADDED for ${selectedIds.length} selected students?`;
    }

    if (!confirm(confirmationMsg)) return;

    try {
      const res = await fetch("/api/admin/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, ...updatePayload }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || "Successfully updated applications!");
        setSelectedIds([]);
        fetchEventData();
      } else {
        alert(data.message || "Failed to update applications.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Single update application
  const handleSingleUpdate = async (id: string, updatePayload: { status?: string; paymentStatus?: string; messageStatus?: string; paymentOverride?: number; whatsappGroupAdded?: boolean }) => {
    try {
      const res = await fetch("/api/admin/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id], ...updatePayload }),
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
    await handleSingleUpdate(appId, { paymentOverride: amt });
    alert("Payment override saved!");
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

    const text = `*TOPLINE ODC*\n🔔 New Hospitality Opportunity\n\n📅 *Date:* ${dateStr}\n📍 *Location:* ${event.location}\n👨🍳 *Work:* ${event.workType}\n💰 *Payment:* ₹${event.paymentPerStudent}\n👥 *Required:* ${event.workersRequired}\n⏰ *Reporting:* ${formatTime12(event.reportingTime)}\n\nApply here:\n${publicUrl}`;
    
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
    <div className="space-y-8 text-slate-900">
      {/* Title block */}
      <div className="flex items-center space-x-3">
        <Link href="/admin/events" className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold tracking-wider text-red-600 uppercase">{event.name}</h1>
          <p className="text-slate-500 text-sm mt-1">Status: <span className="text-red-600 font-bold">{event.status}</span></p>
        </div>
      </div>

      {/* Grid of logistics and action panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Logistics card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
          <h2 className="text-lg font-bold border-b border-slate-200 pb-2">Event Logistics</h2>
          <div className="space-y-3 text-sm text-slate-650">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-red-600" />
              <span>Date: {new Date(event.date).toLocaleDateString("en-GB")}</span>
            </div>
            <div className="flex items-start space-x-2">
              <MapPin className="w-4 h-4 text-red-600 mt-0.5" />
              <span>Location: {event.location}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-red-600" />
              <span>Reporting: {formatTime12(event.reportingTime)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-red-600" />
              <span>Workers Required: {event.workersRequired} candidates</span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex flex-wrap gap-2">
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
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
          <h2 className="text-lg font-bold border-b border-slate-200 pb-2">Operational Controls</h2>
          <p className="text-xs text-slate-500">Current application limits: {event.applicationsCount} / {event.maxApplications}</p>
          
          <div className="flex flex-wrap gap-2 pt-2">
            {event.status === "DRAFT" && (
              <button
                onClick={() => handleUpdateEventStatus("OPEN")}
                className="bg-emerald-600 text-white px-4 py-2 rounded text-xs font-bold transition"
              >
                Publish Form (OPEN)
              </button>
            )}
            {event.status === "OPEN" && (
              <>
                <button
                  onClick={() => handleUpdateEventStatus("CLOSED")}
                  className="bg-red-500 text-white px-4 py-2 rounded text-xs font-bold transition"
                >
                  Close Form manually
                </button>
                <button
                  onClick={() => handleUpdateEventStatus("FULL")}
                  className="bg-red-700 text-white px-4 py-2 rounded text-xs font-bold transition"
                >
                  Mark FULL
                </button>
              </>
            )}
            {event.status === "FULL" && (
              <button
                onClick={() => handleUpdateEventStatus("OPEN")}
                className="bg-emerald-600 text-white px-4 py-2 rounded text-xs font-bold transition"
              >
                Reopen applications
              </button>
            )}
            {["OPEN", "FULL", "CLOSED"].includes(event.status) && (
              <button
                onClick={() => handleUpdateEventStatus("COMPLETED")}
                className="bg-purple-650 text-white px-4 py-2 rounded text-xs font-bold transition w-full"
              >
                Mark Event as COMPLETED
              </button>
            )}

            <div className="pt-4 border-t border-slate-200 w-full">
              <Link
                href={`/admin/events/${eventId}/attendance`}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 w-full shadow-sm"
              >
                <QrCode className="w-4 h-4" />
                <span>Open Attendance QR & Tracker</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Financials details - admin only */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
          <h2 className="text-lg font-bold text-red-600 border-b border-slate-200 pb-2 uppercase tracking-wide">Event Financials</h2>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Client Revenue:</span>
              <span className="font-bold text-slate-900">₹{revenue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Worker Payouts:</span>
              <span className="font-bold text-red-400">₹{workerPaymentsTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Other Expenses:</span>
              <span className="font-bold text-red-400">₹{expenses.toLocaleString()}</span>
            </div>
            <hr className="border-slate-200" />
            <div className="flex justify-between text-sm">
              <span className="font-semibold text-emerald-400">Net Profit:</span>
              <span className="font-bold text-emerald-400">₹{profit.toLocaleString()} ({profitMargin}%)</span>
            </div>
          </div>
        </div>

      </div>

      {/* Helper function to get custom fields values dynamically */}
      {(() => {
        (globalThis as any).getCustomValue = (app: any, fieldId: string) => {
          if (!app.customFieldsData) return "";
          const data = app.customFieldsData;
          // Plain object or Map lookup
          let val = typeof data.get === 'function' ? data.get(fieldId) : data[fieldId];
          if (val === undefined) {
            // Also try resolving by lowercased field label mapping to cover cases where keys are labels
            const fieldObj = event.customFormFields?.find((f: any) => f.id === fieldId);
            if (fieldObj) {
              val = typeof data.get === 'function' ? data.get(fieldObj.label) : data[fieldObj.label];
            }
          }
          return val !== undefined ? String(val) : "";
        };
        return null;
      })()}

      {/* Bulk actions toolbar */}
      {selectedIds.length > 0 && (
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between animate-fade-in shadow-sm">
          <div>
            <span className="text-sm font-semibold text-slate-600">
              Selected: <span className="text-red-650 font-extrabold">{selectedIds.length}</span> students
            </span>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={() => handleBulkUpdate({ status: "confirmed" })}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm"
            >
              Confirm Selected
            </button>
            <button
              onClick={() => handleBulkUpdate({ messageStatus: "SENT" })}
              className="bg-sky-600 hover:bg-sky-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm"
            >
              Send Selected
            </button>
            <button
              onClick={() => handleBulkUpdate({ paymentStatus: "PAID" })}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm"
            >
              Mark Paid
            </button>
            <button
              onClick={() => handleBulkUpdate({ status: "attended" })}
              className="bg-purple-650 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm"
            >
              Mark Attended
            </button>
            <button
              onClick={() => handleBulkUpdate({ status: "absent" })}
              className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm"
            >
              Mark Absent
            </button>
            <button
              onClick={() => handleBulkUpdate({ status: "cancelled" })}
              className="bg-slate-600 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm"
            >
              Cancel Selected
            </button>
            <button
              onClick={() => handleBulkUpdate({ whatsappGroupAdded: true })}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm"
            >
              Mark Added to Group
            </button>
            <button
              onClick={() => handleBulkUpdate({ whatsappGroupAdded: false })}
              className="bg-slate-500 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm"
            >
              Revert Group Added
            </button>
            
            {/* Bulk Payment Apply */}
            <div className="flex items-center space-x-1 border border-slate-200 rounded-lg p-1 bg-white text-xs">
              <input
                type="number"
                placeholder="₹800"
                id="bulk_pay_val"
                className="w-14 bg-slate-50 border border-slate-100 rounded px-1 py-0.5 text-center focus:outline-none focus:border-red-600"
              />
              <button
                onClick={() => {
                  const val = Number((document.getElementById("bulk_pay_val") as HTMLInputElement)?.value);
                  if (isNaN(val) || val <= 0) {
                    alert("Please enter a valid payment amount.");
                    return;
                  }
                  handleBulkUpdate({ paymentOverride: val });
                }}
                className="bg-slate-900 hover:bg-slate-800 text-white px-2 py-0.5 rounded transition font-bold"
              >
                Apply Pay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Applications list table */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <h2 className="text-lg font-bold uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">
          Registered Applicants ({totalApps})
        </h2>
        {applications.length === 0 ? (
          <p className="text-slate-450 text-center py-6 text-sm">No applications submitted yet.</p>
        ) : (
          <div className="overflow-x-auto max-w-full">
            <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
              <thead>
                <tr className="text-slate-400 border-b border-slate-200 uppercase text-xs">
                  <th className="pb-3 text-center w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === applications.length && applications.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-slate-200 text-red-655 focus:ring-red-655"
                    />
                  </th>
                  <th className="pb-3 pl-3">Registration No.</th>

                  {/* Dynamic Header Columns from Form Schema */}
                  {event.customFormFields?.map((field: any) => (
                    <th key={field.id} className="pb-3 px-3">{field.label}</th>
                  ))}

                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 px-3">WhatsApp Message</th>
                  <th className="pb-3 px-3">Payment</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {applications.map((app) => {
                  const s = app.studentId || {};
                  return (
                    <tr key={app._id} className="hover:bg-slate-50/50 transition">
                      <td className="py-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(app._id)}
                          onChange={() => handleToggleSelect(app._id)}
                          className="rounded border-slate-200 text-red-655 focus:ring-red-655"
                        />
                      </td>
                      <td className="py-4 pl-3 font-mono font-bold text-slate-800">
                        {s.universityId || app.registrationNumber || "N/A"}
                      </td>

                      {/* Dynamic Field Values */}
                      {event.customFormFields?.map((field: any) => {
                        const val = (globalThis as any).getCustomValue(app, field.id);
                        return (
                          <td key={field.id} className="py-4 px-3 font-medium text-slate-800">
                            {val || "-"}
                          </td>
                        );
                      })}

                      {/* Status badge */}
                      <td className="py-4 px-3">
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded border uppercase tracking-wider ${
                            app.status === "confirmed"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : app.status === "attended"
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : app.status === "absent"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : app.status === "cancelled"
                              ? "bg-slate-100 text-slate-600 border-slate-200"
                              : "bg-red-50 text-red-655 border-red-200"
                          }`}
                        >
                          {app.status}
                        </span>
                      </td>

                      {/* WhatsApp Sent Action & Group Added */}
                      <td className="py-4 px-3">
                        <div className="flex flex-col space-y-1.5 items-start text-xs">
                          <div className="flex items-center space-x-1">
                            {app.messageStatus === "SENT" ? (
                              <span className="text-blue-600 font-bold border border-blue-200 bg-blue-50 px-2 py-0.5 rounded text-[10px] uppercase">
                                ✓ Sent
                              </span>
                            ) : (
                              <button
                                onClick={() => handleSingleUpdate(app._id, { messageStatus: "SENT" })}
                                className="text-red-650 hover:text-red-750 font-bold border border-red-200 hover:bg-red-50 px-2 py-0.5 rounded text-[10px] transition uppercase"
                              >
                                Send
                              </button>
                            )}
                          </div>
                          
                          {app.whatsappGroupAdded ? (
                            <div className="flex items-center space-x-1.5">
                              <span className="text-emerald-750 font-bold border border-emerald-200 bg-emerald-50 px-2 py-0.5 rounded text-[10px]">
                                ✓ Added
                              </span>
                              <button
                                onClick={() => {
                                  if (confirm("Are you sure you want to revert this student's WhatsApp group status?")) {
                                    handleSingleUpdate(app._id, { whatsappGroupAdded: false });
                                  }
                                }}
                                className="text-[10px] text-slate-400 hover:text-red-650 font-semibold underline"
                              >
                                Revert
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleSingleUpdate(app._id, { whatsappGroupAdded: true })}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2 py-0.5 rounded text-[10px] transition shadow-sm"
                            >
                              + Added
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Payment Status & Override */}
                      <td className="py-4 px-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center space-x-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                              app.paymentStatus === "PAID"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-100 text-slate-500 border-slate-200"
                            }`}>
                              {app.paymentStatus === "PAID" ? "✓ PAID" : "UNPAID"}
                            </span>
                            {app.paymentStatus === "PAID" ? (
                              <button
                                onClick={() => {
                                  if (confirm(`Revert payment status for ${s.name || "student"}?`)) {
                                    handleSingleUpdate(app._id, { paymentStatus: "UNPAID" });
                                  }
                                }}
                                className="text-[10px] text-slate-400 hover:text-slate-600 underline"
                              >
                                Revert
                              </button>
                            ) : (
                              <button
                                onClick={() => handleSingleUpdate(app._id, { paymentStatus: "PAID" })}
                                className="text-[10px] text-red-650 hover:text-red-750 font-bold"
                              >
                                Mark Paid
                              </button>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-1.5">
                            <input
                              type="number"
                              placeholder={event.paymentPerStudent}
                              value={tempPayouts[app._id] !== undefined ? tempPayouts[app._id] : (app.paymentOverride ?? "")}
                              onChange={(e) => setTempPayouts({ ...tempPayouts, [app._id]: Number(e.target.value) })}
                              className="w-16 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-slate-900 text-xs text-center focus:outline-none"
                            />
                            <button
                              onClick={() => handleSavePayoutOverride(app._id)}
                              className="bg-slate-150 hover:bg-slate-250 text-slate-650 text-[10px] px-1.5 py-0.5 rounded transition"
                            >
                              Set
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Row actions */}
                      <td className="py-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          {app.status !== "confirmed" ? (
                            <button
                              onClick={() => handleSingleUpdate(app._id, { status: "confirmed" })}
                              className="px-2 py-1 bg-red-655/10 hover:bg-red-600 hover:text-white border border-red-600/20 rounded text-red-655 text-xs font-bold transition"
                            >
                              Confirm
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                if (confirm(`Revert status to applied for ${s.name || "student"}?`)) {
                                  handleSingleUpdate(app._id, { status: "applied" });
                                }
                              }}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-700 text-xs font-bold transition border border-slate-200"
                            >
                              Revert
                            </button>
                          )}
                          <button
                            onClick={() => handleSingleUpdate(app._id, { status: "attended" })}
                            className="px-2 py-1 bg-purple-50 hover:bg-purple-650 hover:text-white border border-purple-200 rounded text-purple-750 text-xs font-bold transition"
                          >
                            Attended
                          </button>
                          <button
                            onClick={() => handleSingleUpdate(app._id, { status: "absent" })}
                            className="px-2 py-1 bg-rose-50 hover:bg-rose-650 hover:text-white border border-rose-200 rounded text-rose-700 text-xs font-bold transition"
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
