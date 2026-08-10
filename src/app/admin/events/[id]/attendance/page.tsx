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

export default function AdminEventAttendancePage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const eventId = params.id;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<any>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [filteredAttendance, setFilteredAttendance] = useState<any[]>([]);
  
  // Controls
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  
  // Settings values
  const [qrEnabled, setQrEnabled] = useState(false);
  const [verificationField, setVerificationField] = useState("registrationNumber");
  const [gracePeriod, setGracePeriod] = useState(15);
  const [qrToken, setQrToken] = useState("");

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/events/${eventId}/attendance?t=${Date.now()}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setAttendance(data.attendance);
        setFilteredAttendance(data.attendance);
        setEvent(data.event);
        setQrEnabled(data.event.attendanceTokenEnabled || false);
        setVerificationField(data.event.attendanceVerificationField || "registrationNumber");
        setGracePeriod(data.event.gracePeriod || 15);
        setQrToken(data.event.attendanceToken || "");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [eventId]);

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
          item.phone.toLowerCase().includes(q)
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

  const handleManualMark = async (studentId: string, applicationId: string, status: string) => {
    const remark = prompt("Enter override remarks (e.g. QR not working, Manual select):", "Manual Override");
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
      item.checkInTime ? new Date(item.checkInTime).toLocaleString() : "-",
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
                    className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 transition"
                    title="Export CSV"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-150 text-xs font-bold text-slate-500 uppercase">
                      <th className="px-6 py-4">Reg Code</th>
                      <th className="px-6 py-4">Student</th>
                      <th className="px-6 py-4">Time</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredAttendance.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-10 text-center text-slate-400">
                          No matching students registered under this event.
                        </td>
                      </tr>
                    ) : (
                      filteredAttendance.map((item) => (
                        <tr key={item.studentId}>
                          <td className="px-6 py-4 font-mono font-semibold text-slate-900">{item.registrationNumber}</td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-800">{item.studentName}</div>
                            <div className="text-xs text-slate-400">{item.phone}</div>
                          </td>
                          <td className="px-6 py-4 text-xs">
                            {item.checkInTime ? new Date(item.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider border ${
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
                          <td className="px-6 py-4 text-right space-x-1.5">
                            {item.status === "ABSENT" ? (
                              <button
                                onClick={() => handleManualMark(item.studentId, item.applicationId, "PRESENT")}
                                className="text-xs bg-emerald-550 text-white px-2.5 py-1.5 rounded hover:bg-emerald-600 transition"
                              >
                                Mark Present
                              </button>
                            ) : (
                              <button
                                onClick={() => handleManualMark(item.studentId, item.applicationId, "ABSENT")}
                                className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1.5 rounded hover:bg-slate-200 transition"
                              >
                                Reset Absent
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
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
                    {/* Render high quality QR code container */}
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

              <div className="space-y-3 text-sm">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Verification field</label>
                  <select
                    value={verificationField}
                    onChange={(e) => setVerificationField(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-red-600"
                  >
                    <option value="registrationNumber">Registration Number</option>
                    <option value="phone">Phone Number</option>
                    <option value="universityId">College Student ID</option>
                    <option value="email">Email ID</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Grace Period (Minutes)</label>
                  <input
                    type="number"
                    value={gracePeriod}
                    onChange={(e) => setGracePeriod(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-red-600"
                  />
                </div>

                <button
                  onClick={handleSaveSettings}
                  className="w-full bg-slate-900 text-white hover:bg-slate-800 py-2.5 rounded-xl font-bold text-xs transition"
                >
                  Save QR Rules
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
