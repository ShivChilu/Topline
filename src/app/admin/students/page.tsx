"use client";

import { useEffect, useState } from "react";
import { Search, ShieldAlert, CheckCircle, Ban, History } from "lucide-react";

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [activeStudent, setActiveStudent] = useState<any>(null); // Detail modal

  const fetchStudents = async () => {
    try {
      setLoading(true);
      let url = "/api/admin/students";
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (statusFilter) params.append("status", statusFilter);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setStudents(data.students);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [search, statusFilter]);

  const handleToggleBlock = async (studentId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "active" ? "blocked" : "active";
    if (!confirm(`Are you sure you want to change student status to ${nextStatus.toUpperCase()}?`)) return;

    try {
      const res = await fetch("/api/admin/students", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, status: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchStudents();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 text-slate-900">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-wider text-red-600 uppercase">
          Student Database
        </h1>
        <p className="text-slate-500 text-sm mt-1">Monitor, query, and verify student applicant reliability profiles</p>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-450" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, university ID..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-red-600"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setStatusFilter("")}
            className={`px-3 py-1.5 rounded text-xs font-bold transition uppercase tracking-wider ${
              statusFilter === "" ? "bg-red-600 text-black" : "bg-gray-800/60 text-slate-500 hover:text-slate-900"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter("active")}
            className={`px-3 py-1.5 rounded text-xs font-bold transition uppercase tracking-wider ${
              statusFilter === "active" ? "bg-emerald-500 text-black" : "bg-gray-800/60 text-slate-500 hover:text-slate-900"
            }`}
          >
            Active Only
          </button>
          <button
            onClick={() => setStatusFilter("blocked")}
            className={`px-3 py-1.5 rounded text-xs font-bold transition uppercase tracking-wider ${
              statusFilter === "blocked" ? "bg-red-650 text-slate-900" : "bg-gray-800/60 text-slate-500 hover:text-slate-900"
            }`}
          >
            Blocked
          </button>
        </div>
      </div>

      {/* Table grid */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-slate-450">Loading student files...</p>
        </div>
      ) : students.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <p className="text-slate-450">No student profiles found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="text-slate-450 border-b border-slate-200 uppercase text-xs">
                  <th className="p-4">Candidate Name</th>
                  <th className="p-4">Phone</th>
                  <th className="p-4">University details</th>
                  <th className="p-4 text-center">Applied</th>
                  <th className="p-4 text-center">Selected</th>
                  <th className="p-4 text-center">Attended</th>
                  <th className="p-4 text-center">Cancelled</th>
                  <th className="p-4">Earnings</th>
                  <th className="p-4 text-right">Settings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-850">
                {students.map((student) => (
                  <tr key={student._id} className="hover:bg-gray-800/10 transition">
                    <td className="p-4 font-bold text-slate-900 flex items-center space-x-2">
                      <span>{student.name}</span>
                      {student.status === "blocked" && (
                        <span title="Blocked Student">
                          <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-slate-500">{student.phone}</td>
                    <td className="p-4 text-slate-500">
                      <div>{student.university}</div>
                      <div className="text-xs text-slate-450 uppercase">{student.universityId}</div>
                    </td>
                    <td className="p-4 text-center font-semibold text-slate-650">{student.appliedCount}</td>
                    <td className="p-4 text-center font-semibold text-emerald-450">{student.selectedCount}</td>
                    <td className="p-4 text-center font-semibold text-emerald-400">{student.attendedCount}</td>
                    <td className="p-4 text-center font-semibold text-red-400">{student.cancelledCount}</td>
                    <td className="p-4 font-bold text-red-600">₹{student.totalEarnings.toLocaleString()}</td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setActiveStudent(student)}
                          className="p-1 bg-gray-800 hover:bg-gray-700 text-slate-650 rounded"
                          title="View History"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleBlock(student._id, student.status)}
                          className={`p-1 rounded ${
                            student.status === "active"
                              ? "bg-red-950/20 text-red-400 hover:bg-red-500 hover:text-black border border-red-900/30"
                              : "bg-emerald-950/20 text-emerald-400 hover:bg-emerald-500 hover:text-black border border-emerald-900/30"
                          }`}
                          title={student.status === "active" ? "Block Candidate" : "Activate Profile"}
                        >
                          {student.status === "active" ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* History modal */}
      {activeStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
          <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-md w-full space-y-4">
            <div className="flex justify-between items-start border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-xl font-bold">{activeStudent.name}</h3>
                <p className="text-xs text-slate-450">University ID: {activeStudent.universityId}</p>
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded border uppercase ${
                activeStudent.status === "active" ? "border-emerald-500/20 text-emerald-400" : "border-red-500/20 text-red-400"
              }`}>
                {activeStudent.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-gray-850/20 border border-slate-200 rounded">
                <span className="text-slate-450 block text-xs">Total Earnings</span>
                <span className="font-bold text-red-600 text-lg">₹{activeStudent.totalEarnings}</span>
              </div>
              <div className="p-3 bg-gray-850/20 border border-slate-200 rounded">
                <span className="text-slate-450 block text-xs">Events Attended</span>
                <span className="font-bold text-lg">{activeStudent.attendedCount} / {activeStudent.selectedCount}</span>
              </div>
            </div>

            <div className="space-y-2 text-sm text-slate-650">
              <p><span className="font-semibold text-slate-450">Phone:</span> {activeStudent.phone}</p>
              <p><span className="font-semibold text-slate-450">Email:</span> {activeStudent.email}</p>
              <p><span className="font-semibold text-slate-450">University:</span> {activeStudent.university}</p>
              <p><span className="font-semibold text-slate-450">Member Since:</span> {new Date(activeStudent.createdAt).toLocaleDateString("en-GB")}</p>
            </div>

            <button
              onClick={() => setActiveStudent(null)}
              className="w-full bg-gray-800 hover:bg-gray-700 text-slate-900 font-bold py-2 rounded text-sm transition"
            >
              Close Window
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
