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
  const [expandedCardIds, setExpandedCardIds] = useState<Record<string, boolean>>({});
  const toggleCardDetails = (id: string) => {
    setExpandedCardIds(prev => ({ ...prev, [id]: !prev[id] }));
  };
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addFormData, setAddFormData] = useState<Record<string, any>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [addModalError, setAddModalError] = useState<string | null>(null);
  const fetchEventData = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
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
      if (!silent) {
        setLoading(false);
      }
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
  const appliedCount = applications.filter((a) => a.status === "applied").length;
  const selectedCount = applications.filter((a) => a.status === "selected").length;
  const confirmedCount = applications.filter((a) => a.status === "confirmed").length;
  const attendedCount = applications.filter((a) => a.status === "attended").length;
  const absentCount = applications.filter((a) => a.status === "absent").length;
  const whatsappSentCount = applications.filter((a) => a.messageStatus === "SENT").length;
  const whatsappAddedCount = applications.filter((a) => a.whatsappGroupAdded === true).length;
  const paidCount = applications.filter((a) => a.paymentStatus === "PAID").length;
  const unpaidCount = applications.filter((a) => a.paymentStatus !== "PAID").length;

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

    const previousApplications = [...applications];
    // Optimistically update applications
    setApplications((prev) =>
      prev.map((app) => {
        if (selectedIds.includes(app._id)) {
          return {
            ...app,
            ...updatePayload,
            ...(updatePayload.whatsappGroupAdded !== undefined ? {
              whatsappGroupAddedAt: updatePayload.whatsappGroupAdded ? new Date() : undefined
            } : {})
          };
        }
        return app;
      })
    );

    try {
      const res = await fetch("/api/admin/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, ...updatePayload }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedIds([]);
        fetchEventData(true);
      } else {
        setApplications(previousApplications);
        alert(data.message || "Failed to update applications.");
      }
    } catch (err) {
      console.error(err);
      setApplications(previousApplications);
      alert("Network error. Failed to update applications.");
    }
  };

  // Single update application
  const handleSingleUpdate = async (id: string, updatePayload: { status?: string; paymentStatus?: string; messageStatus?: string; paymentOverride?: number; whatsappGroupAdded?: boolean }) => {
    const previousApplications = [...applications];
    // Optimistically update application
    setApplications((prev) =>
      prev.map((app) => {
        if (app._id === id) {
          return {
            ...app,
            ...updatePayload,
            ...(updatePayload.whatsappGroupAdded !== undefined ? {
              whatsappGroupAddedAt: updatePayload.whatsappGroupAdded ? new Date() : undefined
            } : {})
          };
        }
        return app;
      })
    );

    try {
      const res = await fetch("/api/admin/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id], ...updatePayload }),
      });
      const data = await res.json();
      if (data.success) {
        fetchEventData(true);
      } else {
        setApplications(previousApplications);
        alert(data.message || "Failed to update application.");
      }
    } catch (err) {
      console.error(err);
      setApplications(previousApplications);
      alert("Network error. Failed to update application.");
    }
  };

  const handleDeleteApplicant = async (appId: string, studentName: string, regNo: string) => {
    if (!confirm(`Delete Applicant?\n\nAre you sure you want to permanently delete:\n${studentName}\nRegistration No: ${regNo}\n\nThis action cannot be undone.`)) {
      return;
    }

    const previousApplications = [...applications];
    setApplications(prev => prev.filter(app => app._id !== appId));

    try {
      const res = await fetch(`/api/admin/applications?id=${appId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        fetchEventData(true);
      } else {
        setApplications(previousApplications);
        alert(data.message || "Failed to delete student.");
      }
    } catch (err) {
      console.error(err);
      setApplications(previousApplications);
      alert("Network error. Failed to delete student.");
    }
  };

  const handleAddStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    setAddModalError(null);

    try {
      const res = await fetch("/api/admin/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          customFields: addFormData,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsAddModalOpen(false);
        setAddFormData({});
        setApplications(prev => [data.application, ...prev]);
        fetchEventData(true);
      } else {
        setAddModalError(data.message || "Failed to add student.");
      }
    } catch (err) {
      console.error(err);
      setAddModalError("Network error. Failed to add student.");
    } finally {
      setIsAdding(false);
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
    let csvContent = "";
    
    // Build Headers
    const headers = ["Registration No."];
    if (event.customFormFields) {
      event.customFormFields.forEach((field: any) => {
        headers.push(field.label);
      });
    }
    headers.push("Application Status", "WhatsApp Message", "WhatsApp Group Added", "Payment");
    
    csvContent += headers.map(h => `"${h.replace(/"/g, '""')}"`).join(",") + "\n";

    // Build Rows
    applications.forEach((app) => {
      const s = app.studentId || {};
      const regNo = s.universityId || app.registrationNumber || "N/A";
      const payout = app.paymentOverride ?? event.paymentPerStudent;
      
      const row = [regNo];
      
      if (event.customFormFields) {
        event.customFormFields.forEach((field: any) => {
          const val = (globalThis as any).getCustomValue ? (globalThis as any).getCustomValue(app, field.id) : "";
          row.push(val);
        });
      }
      
      row.push(
        app.status,
        app.messageStatus || "PENDING",
        app.whatsappGroupAdded ? "ADDED" : "NOT_ADDED",
        `₹${payout}`
      );
      
      csvContent += row.map(r => `"${String(r).replace(/"/g, '""')}"`).join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
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

      {/* Applicant Summary Statistics Panel */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">Total</span>
          <span className="text-2xl font-bold text-slate-800">{totalApps}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">Applied</span>
          <span className="text-2xl font-bold text-slate-650">{appliedCount}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">Confirmed</span>
          <span className="text-2xl font-bold text-emerald-650">{confirmedCount}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center col-span-2 md:col-span-1 grid grid-cols-2 md:grid-cols-1 gap-2 md:gap-0">
          <div className="text-center">
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">WA Sent</span>
            <span className="text-lg font-bold text-blue-600">{whatsappSentCount}</span>
          </div>
          <div className="text-center border-l md:border-l-0 md:border-t border-slate-100 md:pt-1">
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">WA Added</span>
            <span className="text-lg font-bold text-emerald-700">{whatsappAddedCount}</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center col-span-2 md:col-span-1 grid grid-cols-4 md:grid-cols-2 gap-2">
          <div className="text-center col-span-2 md:col-span-1">
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">Paid</span>
            <span className="text-base font-bold text-emerald-600">{paidCount}</span>
          </div>
          <div className="text-center col-span-2 md:col-span-1 border-l md:border-l-0 border-slate-100">
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">Unpaid</span>
            <span className="text-base font-bold text-slate-500">{unpaidCount}</span>
          </div>
          <div className="text-center col-span-2 md:col-span-1 border-t border-slate-100 pt-1">
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">Attended</span>
            <span className="text-base font-bold text-purple-600">{attendedCount}</span>
          </div>
          <div className="text-center col-span-2 md:col-span-1 border-t border-l border-slate-100 pt-1">
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">Absent</span>
            <span className="text-base font-bold text-rose-600">{absentCount}</span>
          </div>
        </div>
      </div>

      {/* Applications list table */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 border-b border-slate-200 pb-2 gap-2">
          <h2 className="text-lg font-bold uppercase tracking-wider">
            Registered Applicants ({totalApps})
          </h2>
          <button
            onClick={() => {
              setAddFormData({});
              setAddModalError(null);
              setIsAddModalOpen(true);
            }}
            className="bg-red-655 hover:bg-red-750 text-white font-extrabold px-3 py-2 rounded-lg text-xs transition shadow-sm uppercase tracking-wider self-start sm:self-center"
          >
            + Add Student
          </button>
        </div>
        {applications.length === 0 ? (
          <p className="text-slate-450 text-center py-6 text-sm">No applications submitted yet.</p>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto max-w-full">
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
                    <th className="pb-3 px-2 text-slate-400 w-12 font-bold">S.No.</th>
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
                  {applications.map((app, index) => {
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
                        <td className="py-4 px-2 font-mono text-xs text-slate-450 font-bold">
                          {index + 1}
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
                                  className="text-[10px] text-slate-400 hover:text-red-655 font-semibold underline"
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
                                  className="text-[10px] text-slate-400 hover:text-slate-655 underline"
                                >
                                  Revert
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleSingleUpdate(app._id, { paymentStatus: "PAID" })}
                                  className="text-[10px] text-red-655 hover:text-red-750 font-bold"
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
                                className="bg-slate-150 hover:bg-slate-250 text-slate-655 text-[10px] px-1.5 py-0.5 rounded transition"
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
                            <button
                              onClick={() => handleDeleteApplicant(app._id, s.name || `Student ${s.universityId || app.registrationNumber || "N/A"}`, s.universityId || app.registrationNumber || "N/A")}
                              className="px-2 py-1 bg-red-655 hover:bg-red-750 text-white rounded text-xs font-bold transition shadow-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="block md:hidden space-y-4">
              {/* Mobile Header Toolbar for Bulk Selection */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-2">
                <label className="flex items-center space-x-2 text-xs text-slate-700 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === applications.length && applications.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-slate-200 text-red-655 focus:ring-red-655"
                  />
                  <span>Select All ({applications.length})</span>
                </label>
              </div>

              {/* List of cards */}
              {applications.map((app, index) => {
                const s = app.studentId || {};
                const name = s.name || `Student ${s.universityId || app.registrationNumber || "N/A"}`;
                const phone = s.phone || "N/A";
                const isExpanded = !!expandedCardIds[app._id];
                const payout = app.paymentOverride ?? event.paymentPerStudent;

                return (
                  <div key={app._id} className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/80 shadow-sm space-y-3 relative">
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
                          <p className="text-xs text-slate-500 font-mono">Reg No: {s.universityId || app.registrationNumber || "N/A"}</p>
                          {phone !== "N/A" && (
                            <a href={`tel:${phone}`} className="text-xs text-red-655 font-bold hover:underline inline-flex items-center mt-1">
                              📞 {phone}
                            </a>
                          )}
                        </div>
                      </div>

                      <span
                        className={`text-[9px] font-extrabold px-2 py-0.5 rounded border uppercase tracking-wider ${
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
                    </div>

                    {/* Status Grid info */}
                    <div className="grid grid-cols-2 gap-3 text-xs border-t border-slate-100 pt-3">
                      <div>
                        <span className="text-[10px] text-slate-400 font-extrabold block uppercase tracking-wider mb-1">WhatsApp Status</span>
                        <div className="flex flex-col space-y-1 items-start">
                          {app.messageStatus === "SENT" ? (
                            <span className="text-blue-600 font-bold border border-blue-200 bg-blue-50 px-1.5 py-0.5 rounded text-[10px] uppercase">
                              ✓ Sent
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSingleUpdate(app._id, { messageStatus: "SENT" })}
                              className="text-red-650 hover:text-red-750 font-bold border border-red-200 hover:bg-red-50 px-1.5 py-0.5 rounded text-[10px] uppercase"
                            >
                              Send
                            </button>
                          )}
                          {app.whatsappGroupAdded ? (
                            <span className="text-emerald-750 font-bold border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] uppercase">
                              ✓ Added to Group
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSingleUpdate(app._id, { whatsappGroupAdded: true })}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-1.5 py-0.5 rounded text-[10px] transition shadow-sm uppercase"
                            >
                              + Added to Group
                            </button>
                          )}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 font-extrabold block uppercase tracking-wider mb-1">Payment info</span>
                        <div className="space-y-1">
                          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${
                            app.paymentStatus === "PAID"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-100 text-slate-500 border-slate-200"
                          }`}>
                            {app.paymentStatus === "PAID" ? "✓ PAID" : "UNPAID"}
                          </span>
                          <div className="text-xs font-bold text-slate-800">
                            Payout: ₹{payout}
                          </div>
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
                          {event.customFormFields?.map((field: any) => {
                            const val = (globalThis as any).getCustomValue(app, field.id);
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
                    <div className="border-t border-slate-100 pt-3">
                      <span className="text-[10px] text-slate-400 font-extrabold block uppercase tracking-wider mb-2">Management Actions</span>
                      <div className="flex flex-wrap gap-2">
                        {/* Confirm/Revert */}
                        {app.status !== "confirmed" ? (
                          <button
                            onClick={() => handleSingleUpdate(app._id, { status: "confirmed" })}
                            className="px-3 py-1.5 bg-red-655/10 hover:bg-red-600 hover:text-white border border-red-600/20 rounded-lg text-red-655 text-xs font-bold transition flex-1 min-h-[40px] flex items-center justify-center"
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
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-700 text-xs font-bold transition border border-slate-200 flex-1 min-h-[40px] flex items-center justify-center"
                          >
                            Revert
                          </button>
                        )}

                        {/* Attended */}
                        <button
                          onClick={() => handleSingleUpdate(app._id, { status: "attended" })}
                          className="px-3 py-1.5 bg-purple-50 hover:bg-purple-650 hover:text-white border border-purple-200 rounded-lg text-purple-750 text-xs font-bold transition flex-1 min-h-[40px] flex items-center justify-center"
                        >
                          Attended
                        </button>

                        {/* Absent */}
                        <button
                          onClick={() => handleSingleUpdate(app._id, { status: "absent" })}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-650 hover:text-white border border-rose-200 rounded-lg text-rose-700 text-xs font-bold transition flex-1 min-h-[40px] flex items-center justify-center"
                        >
                          Absent
                        </button>
                        
                        {/* Delete */}
                        <button
                          onClick={() => handleDeleteApplicant(app._id, name, s.universityId || app.registrationNumber || "N/A")}
                          className="px-3 py-1.5 bg-red-655 hover:bg-red-750 text-white rounded-lg text-xs font-bold transition flex-1 min-h-[40px] flex items-center justify-center shadow-sm"
                        >
                          Delete
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-2">
                        {/* Revert WhatsApp Group Added if already added */}
                        {app.whatsappGroupAdded && (
                          <button
                            onClick={() => {
                              if (confirm("Are you sure you want to revert this student's WhatsApp group status?")) {
                                handleSingleUpdate(app._id, { whatsappGroupAdded: false });
                              }
                            }}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-700 text-xs font-semibold transition border border-slate-200 flex-1 min-h-[40px] flex items-center justify-center"
                          >
                            Revert Group Added
                          </button>
                        )}

                        {/* Payment Toggle/Override */}
                        {app.paymentStatus === "PAID" ? (
                          <button
                            onClick={() => {
                              if (confirm(`Revert payment status for ${s.name || "student"}?`)) {
                                handleSingleUpdate(app._id, { paymentStatus: "UNPAID" });
                              }
                            }}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-700 text-xs font-bold transition border border-slate-200 flex-1 min-h-[40px] flex items-center justify-center"
                          >
                            Revert Payment
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSingleUpdate(app._id, { paymentStatus: "PAID" })}
                            className="px-3 py-1.5 bg-emerald-55 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition flex-1 min-h-[40px] flex items-center justify-center"
                          >
                            Mark Paid
                          </button>
                        )}
                      </div>

                      {/* Set Custom payout */}
                      <div className="flex items-center space-x-2 mt-2 bg-white p-2 rounded-lg border border-slate-200 justify-between">
                        <span className="text-xs text-slate-500 font-semibold">Set Custom Payout:</span>
                        <div className="flex items-center space-x-1.5">
                          <input
                            type="number"
                            placeholder={event.paymentPerStudent}
                            value={tempPayouts[app._id] !== undefined ? tempPayouts[app._id] : (app.paymentOverride ?? "")}
                            onChange={(e) => setTempPayouts({ ...tempPayouts, [app._id]: Number(e.target.value) })}
                            className="w-16 bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-slate-900 text-xs text-center focus:outline-none focus:border-red-655"
                          />
                          <button
                            onClick={() => handleSavePayoutOverride(app._id)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-750 text-xs font-bold px-3 py-1.5 rounded transition border border-slate-200 min-h-[30px]"
                          >
                            Set
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      {/* Add Student Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-slate-150 flex items-center justify-between bg-slate-50">
              <h3 className="font-extrabold text-slate-800 text-base uppercase tracking-wider">
                Add Student / Applicant
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-450 hover:text-slate-650 font-bold text-xl"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddStudentSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {addModalError && (
                <div className="bg-red-50 border border-red-200 text-red-655 p-3 rounded-lg text-xs font-semibold">
                  ⚠️ {addModalError}
                </div>
              )}

              {/* Dynamic form field loops */}
              {event.customFormFields?.map((field: any) => {
                const isRequired = field.required;
                const value = addFormData[field.id] !== undefined ? addFormData[field.id] : "";

                return (
                  <div key={field.id} className="space-y-1 text-left">
                    <label className="block text-xs font-bold text-slate-700 uppercase">
                      {field.label} {isRequired && <span className="text-red-500">*</span>}
                    </label>
                    {field.description && (
                      <p className="text-[10px] text-slate-450">{field.description}</p>
                    )}

                    {field.type === "yesno" && (
                      <div className="flex gap-4 pt-1">
                        {["Yes", "No"].map((opt) => (
                          <label key={opt} className="inline-flex items-center space-x-2 text-xs text-slate-700 font-semibold cursor-pointer">
                            <input
                              type="radio"
                              name={field.id}
                              required={isRequired}
                              checked={value === opt}
                              onChange={() => setAddFormData({ ...addFormData, [field.id]: opt })}
                              className="text-red-655 focus:ring-red-655 border-slate-200"
                            />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {field.type === "select" && (
                      <select
                        required={isRequired}
                        value={value}
                        onChange={(e) => setAddFormData({ ...addFormData, [field.id]: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-250 rounded-lg px-3 py-2 text-slate-800 text-xs focus:outline-none focus:border-red-655 focus:ring-1 focus:ring-red-655/20"
                      >
                        <option value="">Choose an option...</option>
                        {field.options?.map((opt: string) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    )}

                    {(field.type === "text" || field.type === "phone" || field.type === "email") && (
                      <input
                        type={field.type === "email" ? "email" : "text"}
                        required={isRequired}
                        placeholder={field.placeholder || ""}
                        value={value}
                        onChange={(e) => setAddFormData({ ...addFormData, [field.id]: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-250 rounded-lg px-3 py-2 text-slate-800 text-xs focus:outline-none focus:border-red-655 focus:ring-1 focus:ring-red-655/20"
                      />
                    )}

                    {field.type === "number" && (
                      <input
                        type="number"
                        required={isRequired}
                        min={field.min}
                        max={field.max}
                        placeholder={field.placeholder || ""}
                        value={value}
                        onChange={(e) => setAddFormData({ ...addFormData, [field.id]: e.target.value ? Number(e.target.value) : "" })}
                        className="w-full bg-slate-50 border border-slate-250 rounded-lg px-3 py-2 text-slate-800 text-xs focus:outline-none focus:border-red-655 focus:ring-1 focus:ring-red-655/20"
                      />
                    )}

                    {field.type === "paragraph" && (
                      <textarea
                        required={isRequired}
                        placeholder={field.placeholder || ""}
                        value={value}
                        onChange={(e) => setAddFormData({ ...addFormData, [field.id]: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-250 rounded-lg px-3 py-2 text-slate-800 text-xs focus:outline-none focus:border-red-655 focus:ring-1 focus:ring-red-655/20 h-20 resize-none"
                      ></textarea>
                    )}
                  </div>
                );
              })}

              <div className="pt-4 border-t border-slate-150 flex items-center justify-end space-x-2 bg-slate-50 -mx-6 -mb-6 p-4">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-250 text-slate-650 hover:bg-slate-100 rounded-lg text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="px-4 py-2 bg-red-655 hover:bg-red-750 text-white rounded-lg text-xs font-bold transition shadow-sm disabled:opacity-50"
                >
                  {isAdding ? "Adding Student..." : "Add Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
