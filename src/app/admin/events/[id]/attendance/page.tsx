"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  QrCode,
  Download,
  RefreshCw,
  Search,
  CheckCircle,
  Clock,
  UserX,
  FileSpreadsheet,
  Settings,
  ShieldCheck,
  AlertCircle
} from "lucide-react";

const isReservedField = (label: string) => {
  const norm = label.toLowerCase().trim();
  const reservedNames = ["name", "full name", "student name", "candidate name", "applicant name"];
  const reservedMobiles = ["phone", "phone number", "mobile", "mobile number", "contact", "contact number", "whatsapp", "whatsapp number", "whatsapp phone number"];
  const reservedRegs = ["registration number", "registration no", "registration no.", "roll no", "roll no.", "roll number", "university id", "university roll no", "university registration number"];
  return reservedNames.includes(norm) || reservedMobiles.includes(norm) || reservedRegs.includes(norm);
};

export default function AdminEventAttendancePage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const eventId = params.id;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [event, setEvent] = useState<any>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [filteredAttendance, setFilteredAttendance] = useState<any[]>([]);
  
  // Controls
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [displayFields, setDisplayFields] = useState<string[]>(["registrationNumber", "name", "phone"]);
  
  // Settings values
  const [qrEnabled, setQrEnabled] = useState(false);
  const [verificationField, setVerificationField] = useState("registrationNumber");
  const [gracePeriod, setGracePeriod] = useState(15);
  const [qrToken, setQrToken] = useState("");

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      
      const res = await fetch(`/api/admin/events/${eventId}/attendance?t=${Date.now()}`, { cache: "no-store" });
      if (res.status === 403) {
        setErrorMsg("403 Access Denied. You do not have permission to view or manage attendance for this event.");
        setLoading(false);
        return;
      }
      
      const data = await res.json();
      if (!data.success) {
        setErrorMsg(data.message || "Failed to load attendance logs.");
        setLoading(false);
        return;
      }

      setAttendance(data.attendance);
      setFilteredAttendance(data.attendance);
      setEvent(data.event);
      setQrEnabled(data.event.attendanceTokenEnabled || false);
      setVerificationField(data.event.attendanceVerificationField || "registrationNumber");
      setGracePeriod(data.event.gracePeriod || 15);
      setQrToken(data.event.attendanceToken || "");
      setDisplayFields(data.event.attendanceDisplayFields && data.event.attendanceDisplayFields.length > 0
        ? data.event.attendanceDisplayFields
        : ["registrationNumber", "name", "phone"]);
    } catch (err) {
      console.error(err);
      setErrorMsg("An error occurred while loading attendance.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [eventId]);

  if (loading) return <div className="text-slate-900 text-center py-12">Loading attendance dashboard...</div>;

  if (errorMsg) {
    return (
      <div className="max-w-md mx-auto text-center py-16 bg-white border border-slate-200 rounded-3xl p-8 space-y-4 shadow-sm mt-8 text-slate-800">
        <div className="text-rose-600 text-lg font-bold uppercase">403 Access Denied</div>
        <p className="text-slate-500 text-sm">{errorMsg}</p>
        <Link href="/admin/calling" className="inline-block bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold transition">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  useEffect(() => {
    let result = attendance;
    if (statusFilter !== "ALL") {
      result = result.filter((item) => item.status === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (item) =>
          item.studentName.toLowerCase().includes(q) ||
          item.registrationNumber.toLowerCase().includes(q) ||
          item.phone.toLowerCase().includes(q) ||
          Object.values(item.customFieldsData || {}).some((v) =>
            String(v).toLowerCase().includes(q)
          )
      );
    }
    setFilteredAttendance(result);
  }, [search, statusFilter, attendance]);

  const handleGenerateQR = async () => {
    try {
      const res = await fetch(`/api/admin/events/${eventId}/attendance-qr`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setQrToken(data.attendanceToken);
        setQrEnabled(data.attendanceTokenEnabled);
        alert("QR Attendance session successfully generated/regenerated!");
        fetchAttendance();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleQR = async (enabled: boolean) => {
    try {
      const res = await fetch(`/api/admin/events/${eventId}/attendance-qr`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendanceTokenEnabled: enabled }),
      });
      const data = await res.json();
      if (data.success) {
        setQrEnabled(enabled);
        alert(`QR Attendance is now ${enabled ? "enabled" : "disabled"}!`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSettings = async () => {
    try {
      const res = await fetch(`/api/admin/events/${eventId}/attendance-qr`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendanceVerificationField: verificationField,
          gracePeriod: gracePeriod,
          attendanceDisplayFields: displayFields,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Settings saved successfully!");
        fetchAttendance();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === attendance.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(attendance.map((a) => a.applicationId));
    }
  };

  const handleToggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((x) => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkAttendanceMark = async (status: string) => {
    if (selectedIds.length === 0) {
      alert("No student applications selected.");
      return;
    }

    if (!confirm(`Mark attendance as ${status} for ${selectedIds.length} selected students?`)) return;

    try {
      await Promise.all(
        selectedIds.map(async (id) => {
          const item = attendance.find((a) => a.applicationId === id);
          if (item) {
            await fetch(`/api/admin/events/${eventId}/attendance`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                studentId: item.studentId,
                applicationId: item.applicationId,
                status,
                remarks: "Bulk Admin Override",
              }),
            });
          }
        })
      );
      alert("Bulk attendance updated successfully!");
      setSelectedIds([]);
      fetchAttendance();
    } catch (err) {
      console.error(err);
    }
  };

  const handleManualMark = async (studentId: string, applicationId: string, status: string) => {
    const remark = status === "ABSENT" ? "Reset to Absent" : prompt("Enter override remarks (e.g. QR not working, Manual select):", "Manual Override");
    if (remark === null) return; // Cancelled

    try {
      const res = await fetch(`/api/admin/events/${eventId}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, applicationId, status, remarks: remark }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Attendance status updated successfully!");
        fetchAttendance();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportCSV = () => {
    if (attendance.length === 0) return;
    const headers = ["Registration Number", "Student Name", "Phone", "Status", "Check-in Time", "Remarks"];
    const rows = attendance.map((item) => [
      item.registrationNumber,
      item.studentName,
      item.phone,
      item.status,
      item.checkInTime ? new Date(item.checkInTime).toLocaleString([], { hour12: true }) : "-",
      item.manualRemarks || "-",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.map((val) => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Attendance_${event?.name || "Event"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getCustomValue = (item: any, fieldId: string) => {
    if (!item.customFieldsData) return "";
    const data = item.customFieldsData;
    // Map or object lookup
    let val = typeof data.get === 'function' ? data.get(fieldId) : data[fieldId];
    if (val === undefined) {
      const fieldObj = event?.customFormFields?.find((f: any) => f.id === fieldId);
      if (fieldObj) {
        val = typeof data.get === 'function' ? data.get(fieldObj.label) : data[fieldObj.label];
      }
    }
    return val !== undefined ? String(val) : "";
  };

  const presentCount = attendance.filter((r) => r.status === "PRESENT").length;
  const lateCount = attendance.filter((r) => r.status === "LATE").length;
  const absentCount = attendance.filter((r) => r.status === "ABSENT").length;
  const totalEligible = attendance.length;
  const attendanceRate = totalEligible > 0 ? Math.round(((presentCount + lateCount) / totalEligible) * 100) : 0;

  const publicQRUrl = typeof window !== "undefined" ? `${window.location.origin}/attendance/${qrToken}` : "";

  return (
    <div className="space-y-6 text-slate-800">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Link href={`/admin/events/${eventId}`} className="p-2 hover:bg-slate-100 rounded-lg transition text-slate-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 uppercase">Event Attendance Log</h1>
          <p className="text-slate-500 text-sm">{event?.name || "Loading event details..."}</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-slate-400">Loading attendance data...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Attendance List */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Present</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{presentCount}</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Late</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{lateCount}</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Not Checked In</p>
                <p className="text-2xl font-bold text-rose-600 mt-1">{absentCount}</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Rate</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{attendanceRate}%</p>
              </div>
            </div>

            {/* Bulk actions toolbar */}
            {selectedIds.length > 0 && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
                <div>
                  <span className="text-sm font-semibold text-slate-600">
                    Selected: <span className="text-red-655 font-extrabold">{selectedIds.length}</span> students
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleBulkAttendanceMark("PRESENT")}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm"
                  >
                    Mark Present
                  </button>
                  <button
                    onClick={() => handleBulkAttendanceMark("LATE")}
                    className="bg-amber-500 hover:bg-amber-650 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm"
                  >
                    Mark Late
                  </button>
                  <button
                    onClick={() => handleBulkAttendanceMark("ABSENT")}
                    className="bg-slate-600 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm"
                  >
                    Revert Absent
                  </button>
                </div>
              </div>
            )}

            {/* List block */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Filter controls */}
              <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name or reg no..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2 text-sm focus:outline-none focus:border-red-650"
                  />
                </div>
                <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
                  {["ALL", "PRESENT", "LATE", "ABSENT"].map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        statusFilter === st ? "bg-red-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                  <button
                    onClick={handleExportCSV}
                    className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 transition border border-slate-200"
                    title="Export CSV"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Table view (Desktop Only) */}
              <div className="hidden md:block overflow-x-auto max-w-full">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-150 text-xs font-bold text-slate-500 uppercase">
                      <th className="px-6 py-4 text-center w-12">
                        <input
                          type="checkbox"
                          checked={selectedIds.length === filteredAttendance.length && filteredAttendance.length > 0}
                          onChange={handleSelectAll}
                          className="rounded border-slate-200 text-red-655 focus:ring-red-655"
                        />
                      </th>
                      {displayFields.filter((fieldId) => {
                        if (fieldId === "registrationNumber" || fieldId === "name" || fieldId === "phone") return true;
                        const f = event?.customFormFields?.find((x: any) => x.id === fieldId);
                        return f ? !isReservedField(f.label) : true;
                      }).map((fieldId) => {
                        if (fieldId === "registrationNumber") return <th key={fieldId} className="px-6 py-4">Registration No.</th>;
                        if (fieldId === "name") return <th key={fieldId} className="px-6 py-4">Name</th>;
                        if (fieldId === "phone") return <th key={fieldId} className="px-6 py-4">Phone</th>;
                        const f = event?.customFormFields?.find((x: any) => x.id === fieldId);
                        return <th key={fieldId} className="px-6 py-4">{f ? f.label : fieldId}</th>;
                      })}
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Check-in Time</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                    {filteredAttendance.length === 0 ? (
                      <tr>
                        <td colSpan={displayFields.length + 4} className="px-6 py-10 text-center text-slate-400">
                          No matching students registered under this event.
                        </td>
                      </tr>
                    ) : (
                      filteredAttendance.map((item) => (
                        <tr key={item.applicationId} className="hover:bg-slate-50/50 transition">
                          <td className="px-6 py-4 text-center">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(item.applicationId)}
                              onChange={() => handleToggleSelect(item.applicationId)}
                              className="rounded border-slate-200 text-red-655 focus:ring-red-655"
                            />
                          </td>
                          {displayFields.filter((fieldId) => {
                            if (fieldId === "registrationNumber" || fieldId === "name" || fieldId === "phone") return true;
                            const f = event?.customFormFields?.find((x: any) => x.id === fieldId);
                            return f ? !isReservedField(f.label) : true;
                          }).map((fieldId) => {
                            if (fieldId === "registrationNumber") {
                              return <td key={fieldId} className="px-6 py-4 font-mono font-bold text-slate-800">{item.registrationNumber}</td>;
                            }
                            if (fieldId === "name") {
                              return <td key={fieldId} className="px-6 py-4 font-semibold text-slate-800">{item.studentName}</td>;
                            }
                            if (fieldId === "phone") {
                              return <td key={fieldId} className="px-6 py-4 text-slate-550">{item.phone || "Mobile number not available"}</td>;
                            }
                            const val = getCustomValue(item, fieldId);
                            return <td key={fieldId} className="px-6 py-4 text-slate-700 font-medium">{val || "-"}</td>;
                          })}
                          
                          <td className="px-6 py-4">
                            <span
                              className={`text-[10px] font-extrabold px-2.5 py-1 rounded border uppercase tracking-wider ${
                                item.status === "PRESENT"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : item.status === "LATE"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-rose-50 text-rose-700 border-rose-200"
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs font-semibold text-slate-500">
                            {item.checkInTime ? new Date(item.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : "-"}
                          </td>
                          <td className="px-6 py-4 text-right space-x-1.5">
                            {item.status === "ABSENT" ? (
                              <>
                                <button
                                  onClick={() => handleManualMark(item.studentId, item.applicationId, "PRESENT")}
                                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded transition font-bold"
                                >
                                  Mark Present
                                </button>
                                <button
                                  onClick={() => handleManualMark(item.studentId, item.applicationId, "LATE")}
                                  className="text-xs bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1.5 rounded transition font-bold"
                                >
                                  Late
                                </button>
                              </>
                            ) : (
                              <button
                                  onClick={() => handleManualMark(item.studentId, item.applicationId, "ABSENT")}
                                  className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1.5 rounded hover:bg-slate-200 transition font-bold border border-slate-200"
                              >
                                Revert
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile View Card List */}
              <div className="block md:hidden space-y-4">
                {filteredAttendance.length === 0 ? (
                  <p className="text-center py-6 text-xs text-slate-400">No matching students registered under this event.</p>
                ) : (
                  filteredAttendance.map((item, index) => {
                    const status = item.status;
                    const phoneVal = item.phone || "";
                    return (
                      <div key={item.applicationId} className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/80 shadow-sm space-y-3 relative text-left">
                        {/* Header info */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(item.applicationId)}
                              onChange={() => handleToggleSelect(item.applicationId)}
                              className="rounded border-slate-200 text-red-655 focus:ring-red-655 mt-1"
                            />
                            <div>
                              <h3 className="font-extrabold text-slate-900 text-sm leading-tight">{index + 1}. {item.studentName}</h3>
                              <p className="text-xs text-slate-500 font-mono">Reg No: {item.registrationNumber}</p>
                              {phoneVal ? (
                                <a href={`tel:${phoneVal}`} className="text-xs text-red-655 font-bold hover:underline inline-flex items-center mt-1">
                                  📞 {phoneVal}
                                </a>
                              ) : (
                                <span className="text-xs text-slate-450 block mt-1">Mobile number not available</span>
                              )}
                            </div>
                          </div>

                          <span
                            className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded border uppercase tracking-wider ${
                              status === "PRESENT"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : status === "LATE"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                          >
                            {status}
                          </span>
                        </div>

                        {item.checkInTime && (
                          <p className="text-[10px] text-slate-400 font-semibold font-mono">
                            Checked In: {new Date(item.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                          </p>
                        )}

                        {/* Actions */}
                        <div className="border-t border-slate-100 pt-2 flex justify-end gap-2">
                          {status === "ABSENT" ? (
                            <>
                              <button
                                onClick={() => handleManualMark(item.studentId, item.applicationId, "PRESENT")}
                                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded transition font-bold"
                              >
                                Mark Present
                              </button>
                              <button
                                onClick={() => handleManualMark(item.studentId, item.applicationId, "LATE")}
                                className="text-xs bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1.5 rounded transition font-bold"
                              >
                                Late
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleManualMark(item.studentId, item.applicationId, "ABSENT")}
                              className="text-xs bg-slate-100 text-slate-655 px-2.5 py-1.5 rounded hover:bg-slate-200 transition font-bold border border-slate-200"
                            >
                              Revert
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Sidebar controls for QR generation */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                <QrCode className="w-5 h-5 text-red-600" />
                <h3 className="font-bold text-slate-900 text-lg">Shift Attendance QR</h3>
              </div>

              {qrToken ? (
                <div className="space-y-4 text-center">
                  <div className="bg-slate-100 p-4 rounded-2xl inline-block border border-slate-200">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(publicQRUrl)}`}
                      alt="Attendance QR Code"
                      className="w-48 h-48 mx-auto"
                    />
                  </div>
                  <div className="text-xs font-mono break-all text-slate-400 bg-slate-50 p-2 rounded border border-slate-200">
                    {publicQRUrl}
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleQR(!qrEnabled)}
                      className={`flex-grow py-2 rounded-xl text-xs font-bold transition ${
                        qrEnabled ? "bg-amber-500 text-white" : "bg-emerald-555 text-white"
                      }`}
                    >
                      {qrEnabled ? "Disable Session" : "Enable Session"}
                    </button>
                    <button
                      onClick={handleGenerateQR}
                      className="p-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-600"
                      title="Regenerate Token"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-slate-450 text-sm mb-4">No attendance session has been generated for this event yet.</p>
                  <button
                    onClick={handleGenerateQR}
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold text-sm shadow-sm transition"
                  >
                    Generate Attendance QR
                  </button>
                </div>
              )}
            </div>

            {/* Attendance Settings Card */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                <Settings className="w-5 h-5 text-red-600" />
                <h3 className="font-bold text-slate-900 text-lg">QR Verification Rule</h3>
              </div>

              <div className="space-y-4 text-sm">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase block">Verification field</label>
                  <select
                    value={verificationField}
                    onChange={(e) => setVerificationField(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-red-650 text-xs"
                  >
                    <option value="registrationNumber">Registration Number</option>
                    <option value="universityId">University ID / Student ID</option>
                    <option value="phone">Phone Number</option>
                    <option value="email">Email Address</option>
                    {event?.customFormFields?.map((f: any) => (
                      <option key={f.id} value={f.id}>{f.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5 border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                  <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Attendance Display Fields</label>
                  
                  <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={displayFields.includes("registrationNumber")}
                      onChange={(e) => {
                        if (e.target.checked) setDisplayFields([...displayFields, "registrationNumber"]);
                        else setDisplayFields(displayFields.filter(f => f !== "registrationNumber"));
                      }}
                      className="rounded border-slate-200 text-red-655"
                    />
                    <span>Registration Number</span>
                  </label>

                  <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={displayFields.includes("name")}
                      onChange={(e) => {
                        if (e.target.checked) setDisplayFields([...displayFields, "name"]);
                        else setDisplayFields(displayFields.filter(f => f !== "name"));
                      }}
                      className="rounded border-slate-200 text-red-655"
                    />
                    <span>Name</span>
                  </label>

                  <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={displayFields.includes("phone")}
                      onChange={(e) => {
                        if (e.target.checked) setDisplayFields([...displayFields, "phone"]);
                        else setDisplayFields(displayFields.filter(f => f !== "phone"));
                      }}
                      className="rounded border-slate-200 text-red-655"
                    />
                    <span>Phone Number</span>
                  </label>

                  {event?.customFormFields?.map((field: any) => (
                    <label key={field.id} className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={displayFields.includes(field.id)}
                        onChange={(e) => {
                          if (e.target.checked) setDisplayFields([...displayFields, field.id]);
                          else setDisplayFields(displayFields.filter(f => f !== field.id));
                        }}
                        className="rounded border-slate-200 text-red-655"
                      />
                      <span>{field.label}</span>
                    </label>
                  ))}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase block">Grace Period (Minutes)</label>
                  <input
                    type="number"
                    value={gracePeriod}
                    onChange={(e) => setGracePeriod(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-red-650 text-xs"
                  />
                </div>

                <button
                  onClick={handleSaveSettings}
                  className="w-full bg-slate-900 text-white hover:bg-slate-800 py-2.5 rounded-xl font-bold text-xs transition"
                >
                  Save settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
