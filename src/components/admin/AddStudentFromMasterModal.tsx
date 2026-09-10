"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Search,
  X,
  Plus,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  MapPin,
  Phone,
  Mail,
  Sparkles,
  ShieldCheck,
  Send,
  Loader2,
  Check,
  Filter,
  Users,
} from "lucide-react";

interface AddStudentFromMasterModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventName: string;
  existingApplications: any[];
  onStudentAdded: (newApplication: any, message: string) => void;
}

export default function AddStudentFromMasterModal({
  isOpen,
  onClose,
  eventId,
  eventName,
  existingApplications,
  onStudentAdded,
}: AddStudentFromMasterModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectionFilter, setSelectionFilter] = useState("ALL");
  const [genderFilter, setGenderFilter] = useState("ALL");
  const [photoFilter, setPhotoFilter] = useState("ALL");

  // Chosen student for enrollment
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [targetStatus, setTargetStatus] = useState("SELECTED");
  const [remarks, setRemarks] = useState("");
  const [sendEmailNotification, setSendEmailNotification] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set of existing student IDs and registration numbers enrolled in this event
  const enrolledStudentMap = useMemo(() => {
    const map = new Map<string, string>();
    existingApplications.forEach((app) => {
      if (app.userId || app.user?.id) {
        map.set(app.userId || app.user?.id, app.status || "APPLIED");
      }
      if (app.registrationNumber) {
        map.set(app.registrationNumber.toLowerCase().trim(), app.status || "APPLIED");
      }
      if (app.user?.registrationNumber) {
        map.set(app.user.registrationNumber.toLowerCase().trim(), app.status || "APPLIED");
      }
    });
    return map;
  }, [existingApplications]);

  // Fetch students from /api/admin/students
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchStudents = async () => {
      setLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams();
        if (searchQuery.trim()) queryParams.set("search", searchQuery.trim());
        if (selectionFilter !== "ALL") queryParams.set("selectionStatus", selectionFilter);
        if (photoFilter !== "ALL") queryParams.set("photoFilter", photoFilter);

        const res = await fetch(`/api/admin/students?${queryParams.toString()}`);
        const data = await res.json();
        if (isMounted) {
          if (data.success) {
            setStudents(data.students || []);
          } else {
            setError(data.message || "Failed to load master students list.");
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Error fetching students.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    const timeoutId = setTimeout(fetchStudents, 250);
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [isOpen, searchQuery, selectionFilter, photoFilter]);

  // Filter students by gender in memory if applied
  const filteredStudents = useMemo(() => {
    if (genderFilter === "ALL") return students;
    return students.filter((s) => {
      const g = (s.gender || "").toUpperCase();
      if (genderFilter === "FEMALE") return g === "FEMALE" || g === "WOMEN" || g === "GIRL";
      if (genderFilter === "MALE") return g === "MALE" || g === "MEN" || g === "BOY";
      return true;
    });
  }, [students, genderFilter]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!selectedStudent) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/events/${eventId}/add-student`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudent.id || selectedStudent._id,
          status: targetStatus,
          remarks,
          sendEmailNotification: targetStatus === "SELECTED" && sendEmailNotification,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onStudentAdded(data.application, data.message);
        onClose();
      } else {
        setError(data.message || "Failed to add student to event.");
      }
    } catch (err: any) {
      setError(err.message || "Network error adding student.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0 shadow-inner">
              <Users className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight text-white">
                  Add Registered Student from Master Database
                </h2>
                <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-red-600/30 text-red-300 border border-red-500/40">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-slate-300 line-clamp-1 mt-0.5">
                Target Event: <span className="text-white font-bold">{eventName}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 bg-slate-50/70 border-b border-slate-200 space-y-3 shrink-0">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by candidate name, phone number, roll/reg no, university, city..."
              className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 shadow-xs transition"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
              <Filter className="w-3 h-3 text-slate-400" /> Filters:
            </span>

            {/* Selection Status Filter */}
            <select
              value={selectionFilter}
              onChange={(e) => setSelectionFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:border-red-500"
            >
              <option value="ALL">All Profile Statuses</option>
              <option value="SELECTED">✓ Verified Selected Profiles</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="ON_HOLD">On Hold</option>
            </select>

            {/* Gender Filter */}
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:border-red-500"
            >
              <option value="ALL">All Genders</option>
              <option value="FEMALE">👩 Girls Only (Female)</option>
              <option value="MALE">👨 Boys Only (Male)</option>
            </select>

            {/* Photo Filter */}
            <select
              value={photoFilter}
              onChange={(e) => setPhotoFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:border-red-500"
            >
              <option value="ALL">All (With/Without Photos)</option>
              <option value="WITH_PHOTOS">📸 Must Have Photos</option>
            </select>

            <span className="ml-auto text-[11px] font-bold text-slate-500">
              Found: <strong className="text-slate-900">{filteredStudents.length}</strong> candidates
            </span>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {/* Candidates List Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-red-600" />
              <p className="text-xs font-semibold">Searching registered students database...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-16 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">No registered students found</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Try searching by different name keywords, phone numbers, or clear filter criteria.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredStudents.map((s) => {
                const sId = s.id || s._id;
                const regNo = (s.registrationNumber || s.universityId || "").toLowerCase().trim();
                const existingStatus = enrolledStudentMap.get(sId) || (regNo ? enrolledStudentMap.get(regNo) : null);
                const isAlreadyEnrolled = !!existingStatus;
                const isSelectedForAdd = selectedStudent?.id === sId || selectedStudent?._id === sId;

                return (
                  <div
                    key={sId}
                    onClick={() => {
                      if (!isAlreadyEnrolled) {
                        setSelectedStudent(s);
                      }
                    }}
                    className={`p-3.5 rounded-2xl border transition relative flex items-start gap-3 cursor-pointer ${
                      isAlreadyEnrolled
                        ? "bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed"
                        : isSelectedForAdd
                        ? "bg-red-50/50 border-red-500 ring-2 ring-red-500/20 shadow-md"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
                    }`}
                  >
                    {/* Photo / Avatar */}
                    <div className="relative shrink-0">
                      {s.profilePhotoUrl ? (
                        <img
                          src={s.profilePhotoUrl}
                          alt={s.name || "Student"}
                          className="w-13 h-13 rounded-xl object-cover bg-slate-100 border border-slate-200"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="w-13 h-13 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-slate-400 text-sm">
                          {(s.name || "S").charAt(0).toUpperCase()}
                        </div>
                      )}
                      {s.selectionStatus === "SELECTED" && (
                        <div
                          className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[9px] shadow-xs"
                          title="Verified Selected Student"
                        >
                          ✓
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5">
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {s.name || "Student"}
                        </h4>
                        {isAlreadyEnrolled ? (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 whitespace-nowrap">
                            Enrolled ({existingStatus})
                          </span>
                        ) : isSelectedForAdd ? (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-red-600 text-white whitespace-nowrap flex items-center gap-1 shadow-2xs">
                            <Check className="w-3 h-3" /> Selected
                          </span>
                        ) : null}
                      </div>

                      <div className="text-[11px] font-mono text-slate-500 mt-0.5 flex items-center gap-2">
                        <span>{s.registrationNumber || s.universityId || "No Reg No"}</span>
                        {s.phone && s.phone !== "N/A" && (
                          <span className="text-slate-400">• {s.phone}</span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[10px] text-slate-600">
                        {s.gender && (
                          <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700 font-medium">
                            {s.gender}
                          </span>
                        )}
                        {s.height && (
                          <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700 font-medium">
                            {s.height}
                          </span>
                        )}
                        {s.university && (
                          <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700 font-medium max-w-[130px] truncate">
                            {s.university}
                          </span>
                        )}
                        {s.city && (
                          <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700 font-medium truncate">
                            {s.city}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Candidate Enrollment Action Drawer */}
        {selectedStudent && (
          <div className="p-4 bg-gradient-to-r from-red-50/40 via-white to-red-50/40 border-t border-red-200 space-y-3 shrink-0 animate-in slide-in-from-bottom-2 duration-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {(selectedStudent.name || "S").charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-slate-900">
                      Add {selectedStudent.name} to {eventName}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      ({selectedStudent.registrationNumber || "Reg No N/A"})
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Phone: {selectedStudent.phone} • Email: {selectedStudent.email}
                  </p>
                </div>
              </div>

              {/* Status Dropdown */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs font-bold text-slate-700 whitespace-nowrap">
                  Assign Status:
                </span>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value)}
                  className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 shadow-2xs cursor-pointer"
                >
                  <option value="SELECTED">🎉 SELECTED (Immediate Selection)</option>
                  <option value="CONFIRMED">✅ CONFIRMED (Confirmed Slot)</option>
                  <option value="APPLIED">📝 APPLIED (Standard Applied)</option>
                  <option value="UNDER_REVIEW">⏳ UNDER_REVIEW (Under Review)</option>
                  <option value="ON_HOLD">⏸️ ON_HOLD (On Hold)</option>
                </select>
              </div>
            </div>

            {/* Remarks & Email Toggle */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Admin remark / reason (e.g., Selected for VIP Hospitality / Lead Steward)..."
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 shadow-2xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Adding...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Add Candidate to Event</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Selection Email Checkbox if status == SELECTED */}
            {targetStatus === "SELECTED" && (
              <label className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer pt-0.5">
                <input
                  type="checkbox"
                  checked={sendEmailNotification}
                  onChange={(e) => setSendEmailNotification(e.target.checked)}
                  className="rounded text-red-600 focus:ring-red-500 border-slate-300 w-3.5 h-3.5"
                />
                <span className="flex items-center gap-1">
                  <Send className="w-3 h-3 text-red-600" />
                  Send official duty selection notification email with 1-click RSVP link
                </span>
              </label>
            )}
          </div>
        )}

        {/* Footer info if no candidate chosen */}
        {!selectedStudent && (
          <div className="p-3.5 bg-slate-50 border-t border-slate-200 text-slate-500 text-xs flex items-center justify-between shrink-0">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Click any candidate card above to select and add them to this event.
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
