"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Search,
  CheckCircle,
  XCircle,
  Clock,
  ShieldAlert,
  Ban,
  History,
  LayoutGrid,
  List,
  Sliders,
  Mail,
  UserCheck,
  UserX,
  Phone,
  GraduationCap,
  MapPin,
  ExternalLink,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Sparkles,
  Camera,
  AlertCircle
} from "lucide-react";

interface StudentPhoto {
  id: string;
  url: string;
  photoType: string;
  caption?: string;
  isPrimary: boolean;
}

interface DynamicField {
  label: string;
  key: string;
  value: string;
}

interface Student {
  _id: string;
  id: string;
  name: string;
  phone: string;
  email: string;
  university: string;
  universityId: string;
  registrationNumber: string;
  city: string;
  gender: string;
  height: string;
  weight: string;
  age: number | null;
  upiId: string;
  bio: string;
  profilePhotoUrl: string | null;
  selectionStatus: "UNDER_REVIEW" | "SELECTED" | "NOT_SELECTED";
  selectedAt: string | null;
  selectionEmailSentAt: string | null;
  status: "active" | "blocked";
  isActive: boolean;
  appliedCount: number;
  selectedCount: number;
  attendedCount: number;
  cancelledCount: number;
  totalEarnings: number;
  completenessScore: number;
  photos: StudentPhoto[];
  dynamicFields: DynamicField[];
  recentApplications: any[];
  createdAt: string;
}

interface AdminProfileField {
  id: string;
  key: string;
  label: string;
  type: string;
  description?: string;
  placeholder?: string;
  options: string[];
  isRequired: boolean;
  displayOrder: number;
  isActive: boolean;
  _count?: { values: number };
}

export default function AdminStudentsPage() {
  const [activeTab, setActiveTab] = useState<"gallery" | "table" | "fields">("gallery");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectionFilter, setSelectionFilter] = useState("ALL");
  const [photoFilter, setPhotoFilter] = useState("ALL");
  const [profileFilter, setProfileFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Selection & Bulk
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Detail Modal
  const [inspectStudent, setInspectStudent] = useState<Student | null>(null);
  const [customNote, setCustomNote] = useState("");
  const [sendEmailToggle, setSendEmailToggle] = useState(true);

  // Fields Management
  const [fields, setFields] = useState<AdminProfileField[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [newFieldKey, setNewFieldKey] = useState("");
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState("TEXT");
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldOptions, setNewFieldOptions] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (selectionFilter !== "ALL") params.append("selectionStatus", selectionFilter);
      if (photoFilter !== "ALL") params.append("photoFilter", photoFilter);
      if (profileFilter !== "ALL") params.append("profileFilter", profileFilter);
      if (statusFilter !== "ALL") params.append("status", statusFilter);

      const res = await fetch(`/api/admin/students?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setStudents(data.students || []);
      }
    } catch (err) {
      console.error("Error fetching students:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFields = async () => {
    try {
      setFieldsLoading(true);
      const res = await fetch("/api/admin/student-fields");
      const data = await res.json();
      if (data.success) {
        setFields(data.fields || []);
      }
    } catch (err) {
      console.error("Error fetching profile fields:", err);
    } finally {
      setFieldsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "fields") {
      fetchFields();
    } else {
      fetchStudents();
    }
  }, [search, selectionFilter, photoFilter, profileFilter, statusFilter, activeTab]);

  // Handle single candidate selection change with optimistic update
  const handleUpdateSelection = async (
    studentId: string,
    nextStatus: "SELECTED" | "NOT_SELECTED" | "UNDER_REVIEW",
    notes?: string
  ) => {
    try {
      setActionLoading(studentId);

      // Optimistic update
      setStudents((prev) =>
        prev.map((s) => (s.id === studentId ? { ...s, selectionStatus: nextStatus } : s))
      );
      if (inspectStudent && inspectStudent.id === studentId) {
        setInspectStudent((prev) => (prev ? { ...prev, selectionStatus: nextStatus } : null));
      }

      const res = await fetch(`/api/admin/students/${studentId}/selection`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectionStatus: nextStatus,
          notes: notes || customNote || undefined,
          sendEmail: sendEmailToggle,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Student status updated to ${nextStatus}${sendEmailToggle ? " & email dispatched" : ""}.`);
      } else {
        showToast(`Warning: ${data.message}`);
        fetchStudents(); // revert on failure
      }
    } catch (err: any) {
      console.error(err);
      showToast("Failed to update status.");
      fetchStudents();
    } finally {
      setActionLoading(null);
    }
  };

  // Handle bulk selection update
  const handleBulkSelection = async (nextStatus: "SELECTED" | "NOT_SELECTED" | "UNDER_REVIEW") => {
    if (selectedStudentIds.length === 0) return;
    if (!confirm(`Are you sure you want to mark ${selectedStudentIds.length} candidate(s) as ${nextStatus}?`)) return;

    try {
      setActionLoading("bulk");
      const res = await fetch("/api/admin/students", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIds: selectedStudentIds,
          selectionStatus: nextStatus,
          sendEmail: sendEmailToggle,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        setSelectedStudentIds([]);
        fetchStudents();
      }
    } catch (err) {
      console.error(err);
      showToast("Bulk update failed.");
    } finally {
      setActionLoading(null);
    }
  };

  // Permanently delete a single student
  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (
      !confirm(
        `Are you sure you want to PERMANENTLY delete student "${studentName}"?\n\nThis will remove their permanent profile, photos, and all event applications. This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      setActionLoading(studentId);
      const res = await fetch(`/api/admin/students?id=${studentId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showToast(`✓ Student "${studentName}" permanently deleted.`);
        setStudents((prev) => prev.filter((s) => s.id !== studentId));
        setSelectedStudentIds((prev) => prev.filter((id) => id !== studentId));
        if (inspectStudent && inspectStudent.id === studentId) {
          setInspectStudent(null);
        }
      } else {
        alert(data.message || "Failed to delete student.");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting student.");
    } finally {
      setActionLoading(null);
    }
  };

  // Permanently delete multiple selected students
  const handleBulkDeleteStudents = async () => {
    if (selectedStudentIds.length === 0) return;
    if (
      !confirm(
        `Are you sure you want to PERMANENTLY delete ${selectedStudentIds.length} selected student accounts?\n\nAll photos, applications, and profile data will be permanently removed. This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      setActionLoading("bulk");
      const res = await fetch(`/api/admin/students?ids=${selectedStudentIds.join(",")}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showToast(`✓ ${data.count || selectedStudentIds.length} student account(s) permanently deleted.`);
        setStudents((prev) => prev.filter((s) => !selectedStudentIds.includes(s.id)));
        setSelectedStudentIds([]);
      } else {
        alert(data.message || "Bulk delete failed.");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting students.");
    } finally {
      setActionLoading(null);
    }
  };


  // Toggle active/blocked status
  const handleToggleBlock = async (studentId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "active" ? "blocked" : "active";
    if (!confirm(`Are you sure you want to ${nextStatus === "active" ? "unblock" : "block"} this student?`)) return;

    try {
      const res = await fetch("/api/admin/students", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, status: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        setStudents((prev) =>
          prev.map((s) => (s.id === studentId ? { ...s, status: nextStatus as any, isActive: nextStatus === "active" } : s))
        );
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to toggle block status.");
    }
  };

  // Create new profile field
  const handleCreateField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldKey || !newFieldLabel) {
      alert("Key and Label are required.");
      return;
    }

    try {
      const optionsArray = newFieldOptions
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch("/api/admin/student-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: newFieldKey,
          label: newFieldLabel,
          type: newFieldType,
          isRequired: newFieldRequired,
          options: optionsArray,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast("Profile field created successfully!");
        setNewFieldKey("");
        setNewFieldLabel("");
        setNewFieldOptions("");
        setNewFieldRequired(false);
        fetchFields();
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Error creating profile field.");
    }
  };

  // Delete profile field
  const handleDeleteField = async (fieldId: string) => {
    if (!confirm("Are you sure you want to delete this custom profile field? All candidate answers for it will be removed.")) return;
    try {
      const res = await fetch(`/api/admin/student-fields?id=${fieldId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showToast("Field deleted.");
        fetchFields();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Stats calculation
  const stats = useMemo(() => {
    const total = students.length;
    const selected = students.filter((s) => s.selectionStatus === "SELECTED").length;
    const underReview = students.filter((s) => s.selectionStatus === "UNDER_REVIEW").length;
    const notSelected = students.filter((s) => s.selectionStatus === "NOT_SELECTED").length;
    const withPhotos = students.filter((s) => s.profilePhotoUrl || s.photos.length > 0).length;
    return { total, selected, underReview, notSelected, withPhotos };
  }, [students]);

  const toggleSelectAll = () => {
    if (selectedStudentIds.length === students.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(students.map((s) => s.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6 text-slate-900 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
          <Sparkles className="w-5 h-5 text-red-500" />
          <span className="text-sm font-semibold">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
              Student Accounts & Photo Gallery
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
              {students.length} Students
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Permanent student profiles, visual photo evaluation, 1-click selection, and custom profile attributes.
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab("gallery")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === "gallery" ? "bg-white text-red-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            Photo Gallery
          </button>
          <button
            onClick={() => setActiveTab("table")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === "table" ? "bg-white text-red-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <List className="w-4 h-4" />
            Table View
          </button>
          <button
            onClick={() => setActiveTab("fields")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === "fields" ? "bg-white text-red-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sliders className="w-4 h-4" />
            Profile Fields
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      {activeTab !== "fields" && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-400 block uppercase">Total Candidates</span>
            <span className="text-2xl font-extrabold text-slate-900 mt-1 block">{stats.total}</span>
          </div>
          <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-700 uppercase">Selected</span>
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-2xl font-extrabold text-emerald-700 mt-1 block">{stats.selected}</span>
          </div>
          <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-700 uppercase">Under Review</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <span className="text-2xl font-extrabold text-amber-700 mt-1 block">{stats.underReview}</span>
          </div>
          <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-700 uppercase">Not Selected</span>
              <XCircle className="w-4 h-4 text-rose-600" />
            </div>
            <span className="text-2xl font-extrabold text-rose-700 mt-1 block">{stats.notSelected}</span>
          </div>
          <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-700 uppercase">With Photos</span>
              <Camera className="w-4 h-4 text-indigo-600" />
            </div>
            <span className="text-2xl font-extrabold text-indigo-700 mt-1 block">{stats.withPhotos}</span>
          </div>
        </div>
      )}

      {/* FILTER BAR */}
      {activeTab !== "fields" && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
            {/* Search */}
            <div className="relative w-full lg:w-96">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, roll no, phone, university, city..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 transition"
              />
            </div>

            {/* Quick Filter Buttons */}
            <div className="flex flex-wrap gap-2 w-full lg:w-auto">
              <select
                value={selectionFilter}
                onChange={(e) => setSelectionFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs font-semibold rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:border-red-600"
              >
                <option value="ALL">All Selection Statuses</option>
                <option value="SELECTED">✓ Selected Only</option>
                <option value="UNDER_REVIEW">⏳ Under Review</option>
                <option value="NOT_SELECTED">✗ Not Selected</option>
              </select>

              <select
                value={photoFilter}
                onChange={(e) => setPhotoFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs font-semibold rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:border-red-600"
              >
                <option value="ALL">All Photos</option>
                <option value="WITH_PHOTOS">📸 With Photos Only</option>
                <option value="WITHOUT_PHOTOS">⚠️ Without Photos</option>
              </select>

              <select
                value={profileFilter}
                onChange={(e) => setProfileFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs font-semibold rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:border-red-600"
              >
                <option value="ALL">All Profiles</option>
                <option value="COMPLETE">Complete Profiles</option>
                <option value="INCOMPLETE">Incomplete Profiles</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs font-semibold rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:border-red-600"
              >
                <option value="ALL">All Accounts</option>
                <option value="active">Active Only</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
          </div>

          {/* Bulk Selection Bar */}
          {selectedStudentIds.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-red-800 bg-red-200 px-2.5 py-1 rounded-full">
                  {selectedStudentIds.length} Selected
                </span>
                <button
                  onClick={toggleSelectAll}
                  className="text-xs font-semibold text-red-700 hover:underline"
                >
                  {selectedStudentIds.length === students.length ? "Deselect All" : "Select All"}
                </button>
                <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer ml-4">
                  <input
                    type="checkbox"
                    checked={sendEmailToggle}
                    onChange={(e) => setSendEmailToggle(e.target.checked)}
                    className="accent-red-600 rounded"
                  />
                  Send notification emails on status change
                </label>
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={actionLoading === "bulk"}
                  onClick={() => handleBulkSelection("SELECTED")}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  Mark Selected ({selectedStudentIds.length})
                </button>
                <button
                  disabled={actionLoading === "bulk"}
                  onClick={() => handleBulkSelection("NOT_SELECTED")}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
                >
                  <UserX className="w-3.5 h-3.5" />
                  Mark Not Selected ({selectedStudentIds.length})
                </button>
                <button
                  disabled={actionLoading === "bulk"}
                  onClick={() => handleBulkSelection("UNDER_REVIEW")}
                  className="bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
                >
                  <Clock className="w-3.5 h-3.5" />
                  Under Review
                </button>
                <button
                  disabled={actionLoading === "bulk"}
                  onClick={handleBulkDeleteStudents}
                  className="bg-red-700 hover:bg-red-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
                  title="Permanently delete selected student accounts"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete ({selectedStudentIds.length})
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 1: VISUAL PHOTO GALLERY VIEW */}
      {/* ---------------------------------------------------- */}
      {activeTab === "gallery" && (
        <>
          {loading ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-red-600 border-t-transparent mb-3"></div>
              <p className="text-sm font-semibold text-slate-500">Loading student photo gallery...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
              <Camera className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-800">No student profiles found</h3>
              <p className="text-sm text-slate-500 mt-1">Try adjusting your filters or search keywords.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
              {students.map((student) => {
                const isSelected = selectedStudentIds.includes(student.id);
                return (
                  <div
                    key={student.id}
                    className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md ${
                      isSelected
                        ? "border-red-500 ring-2 ring-red-500/20"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {/* Top Image Section */}
                    <div className="relative aspect-4/3 w-full bg-slate-100 overflow-hidden group">
                      {student.profilePhotoUrl ? (
                        <img
                          src={student.profilePhotoUrl}
                          alt={student.name}
                          className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400">
                          <Camera className="w-10 h-10 stroke-1 mb-1" />
                          <span className="text-xs font-semibold">No Photo Uploaded</span>
                        </div>
                      )}

                      {/* Checkbox Overlay */}
                      <button
                        onClick={() => toggleSelectOne(student.id)}
                        className="absolute top-3 left-3 z-10 w-6 h-6 rounded-md bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/30 hover:bg-black/70 transition"
                      >
                        {isSelected && <Check className="w-4 h-4 text-red-400 stroke-3" />}
                      </button>

                      {/* Selection Status Badge */}
                      <div className="absolute top-3 right-3 z-10">
                        {student.selectionStatus === "SELECTED" && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-500 text-white shadow-md flex items-center gap-1">
                            <Check className="w-3 h-3 stroke-3" /> Selected
                          </span>
                        )}
                        {student.selectionStatus === "UNDER_REVIEW" && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500 text-white shadow-md flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Review
                          </span>
                        )}
                        {student.selectionStatus === "NOT_SELECTED" && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500 text-white shadow-md flex items-center gap-1">
                            <X className="w-3 h-3 stroke-3" /> Not Selected
                          </span>
                        )}
                      </div>

                      {/* Multiple Photos Indicator */}
                      {student.photos.length > 1 && (
                        <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md text-white px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1">
                          <Camera className="w-3 h-3" />
                          +{student.photos.length} Photos
                        </div>
                      )}
                    </div>

                    {/* Body Details */}
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-slate-900 text-base leading-tight hover:text-red-600 transition cursor-pointer" onClick={() => setInspectStudent(student)}>
                            {student.name}
                          </h3>
                          {student.status === "blocked" && (
                            <span title="Blocked" className="text-rose-500">
                              <ShieldAlert className="w-4 h-4" />
                            </span>
                          )}
                        </div>

                        <div className="mt-1 flex items-center gap-1 text-xs text-slate-500 font-medium">
                          <span className="font-bold text-slate-700 uppercase">{student.registrationNumber || "NO REG"}</span>
                          {student.gender && <span>• {student.gender}</span>}
                          {student.height && <span>• {student.height}</span>}
                        </div>

                        <div className="mt-2 space-y-1 text-xs text-slate-600">
                          {student.university && (
                            <div className="flex items-center gap-1.5 truncate">
                              <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{student.university}</span>
                            </div>
                          )}
                          {student.city && (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{student.city}</span>
                            </div>
                          )}
                          {student.phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{student.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                        {/* 1-Click Select / Deselect */}
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            disabled={actionLoading === student.id}
                            onClick={() => handleUpdateSelection(student.id, "SELECTED")}
                            className={`w-full py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${
                              student.selectionStatus === "SELECTED"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            {student.selectionStatus === "SELECTED" ? "Selected" : "Select"}
                          </button>

                          <button
                            disabled={actionLoading === student.id}
                            onClick={() => handleUpdateSelection(student.id, "NOT_SELECTED")}
                            className={`w-full py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${
                              student.selectionStatus === "NOT_SELECTED"
                                ? "bg-rose-100 text-rose-800 border border-rose-300"
                                : "bg-slate-100 hover:bg-rose-600 hover:text-white text-slate-700"
                            }`}
                          >
                            <X className="w-3.5 h-3.5" />
                            {student.selectionStatus === "NOT_SELECTED" ? "Not Selected" : "Deselect"}
                          </button>
                        </div>

                        {/* Inspect full profile & Delete button */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => setInspectStudent(student)}
                            className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition"
                          >
                            View Full Profile & Photos
                          </button>
                          <button
                            disabled={actionLoading === student.id}
                            onClick={() => handleDeleteStudent(student.id, student.name)}
                            className="p-1.5 bg-rose-50 hover:bg-red-600 border border-rose-200 text-rose-600 hover:text-white rounded-lg transition"
                            title="Permanently Delete Student Account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 2: DATA TABLE VIEW */}
      {/* ---------------------------------------------------- */}
      {activeTab === "table" && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="text-slate-400 bg-slate-50/75 border-b border-slate-200 uppercase text-xs">
                  <th className="p-4 w-10">
                    <input
                      type="checkbox"
                      checked={students.length > 0 && selectedStudentIds.length === students.length}
                      onChange={toggleSelectAll}
                      className="accent-red-600 rounded"
                    />
                  </th>
                  <th className="p-4">Student</th>
                  <th className="p-4">Selection Status</th>
                  <th className="p-4">University & City</th>
                  <th className="p-4">Phone / Email</th>
                  <th className="p-4 text-center">Applied</th>
                  <th className="p-4 text-center">Attended</th>
                  <th className="p-4">Total Earnings</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.includes(student.id)}
                        onChange={() => toggleSelectOne(student.id)}
                        className="accent-red-600 rounded"
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden border border-slate-200 shrink-0">
                          {student.profilePhotoUrl ? (
                            <img src={student.profilePhotoUrl} alt={student.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-slate-400 font-bold">
                              {student.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span onClick={() => setInspectStudent(student)} className="cursor-pointer hover:text-red-600">
                              {student.name}
                            </span>
                            {student.status === "blocked" && (
                              <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                            )}
                          </div>
                          <div className="text-xs text-slate-400 font-semibold">{student.registrationNumber}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      {student.selectionStatus === "SELECTED" && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          ✓ Selected
                        </span>
                      )}
                      {student.selectionStatus === "UNDER_REVIEW" && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          ⏳ Under Review
                        </span>
                      )}
                      {student.selectionStatus === "NOT_SELECTED" && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          ✗ Not Selected
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-xs text-slate-600">
                      <div className="font-medium text-slate-800">{student.university || "N/A"}</div>
                      <div className="text-slate-400">{student.city || "N/A"}</div>
                    </td>
                    <td className="p-4 text-xs text-slate-600">
                      <div>{student.phone}</div>
                      <div className="text-slate-400">{student.email || "N/A"}</div>
                    </td>
                    <td className="p-4 text-center font-bold text-slate-700">{student.appliedCount}</td>
                    <td className="p-4 text-center font-bold text-emerald-600">{student.attendedCount}</td>
                    <td className="p-4 font-extrabold text-red-600">₹{student.totalEarnings.toLocaleString()}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setInspectStudent(student)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
                          title="Inspect Profile"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleUpdateSelection(student.id, student.selectionStatus === "SELECTED" ? "NOT_SELECTED" : "SELECTED")}
                          className={`p-1.5 rounded-lg text-xs font-bold ${
                            student.selectionStatus === "SELECTED"
                              ? "bg-rose-100 text-rose-700 hover:bg-rose-200"
                              : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                          }`}
                          title={student.selectionStatus === "SELECTED" ? "Deselect" : "Select"}
                        >
                          {student.selectionStatus === "SELECTED" ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleToggleBlock(student.id, student.status)}
                          className={`p-1.5 rounded-lg ${
                            student.status === "active"
                              ? "bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white"
                              : "bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white"
                          }`}
                          title={student.status === "active" ? "Block" : "Unblock"}
                        >
                          {student.status === "active" ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </button>
                        <button
                          disabled={actionLoading === student.id}
                          onClick={() => handleDeleteStudent(student.id, student.name)}
                          className="p-1.5 bg-rose-50 hover:bg-red-600 border border-rose-200 text-rose-600 hover:text-white rounded-lg transition"
                          title="Permanently Delete Student"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* ---------------------------------------------------- */}
      {/* TAB 3: DYNAMIC PROFILE FIELDS MANAGER */}
      {/* ---------------------------------------------------- */}
      {activeTab === "fields" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Field Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-red-600" />
              Add Custom Profile Field
            </h3>
            <p className="text-xs text-slate-500">
              Define permanent questions (e.g. Instagram Handle, Languages Spoken, Prior Hospitality Experience) required on candidate profiles.
            </p>

            <form onSubmit={handleCreateField} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Field Label *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Instagram Handle"
                  value={newFieldLabel}
                  onChange={(e) => {
                    setNewFieldLabel(e.target.value);
                    if (!newFieldKey) {
                      setNewFieldKey(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "_"));
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Field Key * (Unique identifier)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. instagram_handle"
                  value={newFieldKey}
                  onChange={(e) => setNewFieldKey(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono focus:outline-none focus:border-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Input Type</label>
                <select
                  value={newFieldType}
                  onChange={(e) => setNewFieldType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-red-600"
                >
                  <option value="TEXT">Short Text</option>
                  <option value="PARAGRAPH">Long Paragraph / Bio</option>
                  <option value="NUMBER">Number</option>
                  <option value="SELECT">Dropdown Selection</option>
                  <option value="YESNO">Yes / No Switch</option>
                </select>
              </div>

              {newFieldType === "SELECT" && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Dropdown Options (Comma separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. Fluent, Intermediate, Basic"
                    value={newFieldOptions}
                    onChange={(e) => setNewFieldOptions(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-red-600"
                  />
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isRequired"
                  checked={newFieldRequired}
                  onChange={(e) => setNewFieldRequired(e.target.checked)}
                  className="accent-red-600 rounded"
                />
                <label htmlFor="isRequired" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Mandatory field during student profile setup
                </label>
              </div>

              <button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-sm transition shadow-sm mt-4"
              >
                Create Profile Field
              </button>
            </form>
          </div>

          {/* List of Existing Fields */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Active Profile Dynamic Fields</h3>
            {fieldsLoading ? (
              <p className="text-sm text-slate-400 py-6 text-center">Loading fields...</p>
            ) : fields.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl">
                <Sliders className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500 font-semibold">No custom dynamic fields configured yet.</p>
                <p className="text-xs text-slate-400 mt-0.5">Use the form on the left to add fields.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {fields.map((f) => (
                  <div key={f.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{f.label}</span>
                        <code className="text-[11px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                          {f.key}
                        </code>
                        {f.isRequired && (
                          <span className="text-[10px] font-bold uppercase bg-red-100 text-red-700 px-2 py-0.5 rounded">
                            Required
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Type: <span className="font-semibold text-slate-700">{f.type}</span>
                        {f.options && f.options.length > 0 && ` • Options: ${f.options.join(", ")}`}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteField(f.id)}
                      className="p-2 text-rose-600 hover:bg-rose-100 rounded-lg transition"
                      title="Delete Field"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* CANDIDATE DETAIL INSPECTION MODAL */}
      {/* ---------------------------------------------------- */}
      {inspectStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 flex items-start justify-between bg-slate-50/50 rounded-t-2xl">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-slate-200 overflow-hidden border-2 border-white shadow">
                  {inspectStudent.profilePhotoUrl ? (
                    <img src={inspectStudent.profilePhotoUrl} alt={inspectStudent.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-extrabold text-slate-500 text-lg">
                      {inspectStudent.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900">{inspectStudent.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                    <span className="font-mono font-bold bg-slate-200 text-slate-800 px-2 py-0.5 rounded">
                      {inspectStudent.registrationNumber}
                    </span>
                    <span>• {inspectStudent.university || "University Unspecified"}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setInspectStudent(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Photo Showcase Carousel / Grid */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-red-600" />
                  Permanent Profile Photos ({inspectStudent.photos.length || (inspectStudent.profilePhotoUrl ? 1 : 0)})
                </h4>

                {inspectStudent.photos.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {inspectStudent.photos.map((photo) => (
                      <div key={photo.id} className="relative aspect-3/4 rounded-xl overflow-hidden border border-slate-200 group bg-slate-100">
                        <img src={photo.url} alt="Profile" className="w-full h-full object-cover" />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-white">
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-red-600/80 px-1.5 py-0.5 rounded">
                            {photo.photoType}
                          </span>
                          {photo.isPrimary && (
                            <span className="ml-1 text-[10px] font-bold uppercase bg-emerald-600 px-1.5 py-0.5 rounded">
                              Primary
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : inspectStudent.profilePhotoUrl ? (
                  <div className="w-48 aspect-3/4 rounded-xl overflow-hidden border border-slate-200">
                    <img src={inspectStudent.profilePhotoUrl} alt="Profile" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                    No high-resolution photos uploaded by this student yet.
                  </div>
                )}
              </div>

              {/* Physical & Contact Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-400 uppercase block">Phone</span>
                  <span className="text-sm font-semibold text-slate-900 mt-0.5 block">{inspectStudent.phone}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-400 uppercase block">Email</span>
                  <span className="text-sm font-semibold text-slate-900 mt-0.5 block truncate">{inspectStudent.email || "N/A"}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-400 uppercase block">City</span>
                  <span className="text-sm font-semibold text-slate-900 mt-0.5 block">{inspectStudent.city || "N/A"}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-400 uppercase block">Gender / Height</span>
                  <span className="text-sm font-semibold text-slate-900 mt-0.5 block">
                    {inspectStudent.gender || "-"} / {inspectStudent.height || "-"}
                  </span>
                </div>
              </div>

              {/* Dynamic Field Answers */}
              {inspectStudent.dynamicFields && inspectStudent.dynamicFields.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Custom Profile Attributes
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {inspectStudent.dynamicFields.map((df, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                        <span className="font-bold text-slate-500 block">{df.label}</span>
                        <span className="font-semibold text-slate-900 mt-1 block">{df.value || "Not provided"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Event Attendance & Reliability History */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Event Reliability Record
                </h4>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block font-semibold">Applied</span>
                    <span className="text-base font-extrabold text-slate-800">{inspectStudent.appliedCount}</span>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                    <span className="text-emerald-700 block font-semibold">Selected</span>
                    <span className="text-base font-extrabold text-emerald-800">{inspectStudent.selectedCount}</span>
                  </div>
                  <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200">
                    <span className="text-indigo-700 block font-semibold">Attended</span>
                    <span className="text-base font-extrabold text-indigo-800">{inspectStudent.attendedCount}</span>
                  </div>
                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                    <span className="text-rose-700 block font-semibold">Cancelled</span>
                    <span className="text-base font-extrabold text-rose-800">{inspectStudent.cancelledCount}</span>
                  </div>
                </div>
              </div>

              {/* Selection Decision Box */}
              <div className="p-5 bg-slate-900 text-white rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-base text-white">Selection Decision</h4>
                    <p className="text-xs text-slate-400">Update global candidate eligibility and dispatch automated email.</p>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-800 border border-slate-700">
                    Current: {inspectStudent.selectionStatus}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Admin Remarks / Evaluation Notes (Optional)</label>
                  <input
                    type="text"
                    value={customNote}
                    onChange={(e) => setCustomNote(e.target.value)}
                    placeholder="e.g. Excellent grooming, confirmed for lead steward roles..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendEmailToggle}
                      onChange={(e) => setSendEmailToggle(e.target.checked)}
                      className="accent-red-600 rounded"
                    />
                    Dispatch branded selection / status email to student
                  </label>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdateSelection(inspectStudent.id, "SELECTED")}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow flex items-center gap-1.5"
                    >
                      <UserCheck className="w-4 h-4" />
                      Approve & Select
                    </button>
                    <button
                      onClick={() => handleUpdateSelection(inspectStudent.id, "NOT_SELECTED")}
                      className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow flex items-center gap-1.5"
                    >
                      <UserX className="w-4 h-4" />
                      Mark Not Selected
                    </button>
                    <button
                      onClick={() => handleUpdateSelection(inspectStudent.id, "UNDER_REVIEW")}
                      className="bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs px-4 py-2 rounded-xl transition"
                    >
                      Under Review
                    </button>
                    <button
                      onClick={() => handleDeleteStudent(inspectStudent.id, inspectStudent.name)}
                      className="bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5"
                      title="Permanently Delete Student Profile & Records"
                    >
                      <Trash2 className="w-4 h-4 text-rose-400" />
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
