"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  User,
  Phone,
  Mail,
  GraduationCap,
  MapPin,
  Banknote,
  Calendar,
  CheckCircle2,
  Clock,
  LogOut,
  Sparkles,
  AlertCircle,
  Save,
  Check,
  Camera,
  UploadCloud,
  Trash2,
  XCircle,
  Star,
  Sliders,
  ShieldCheck,
  Info,
  MessageCircle,
  Loader2,
  QrCode,
  Scan,
  Edit3,
  ExternalLink,
  ChevronRight,
  ArrowRight,
  Zap,
  CheckCircle,
  RefreshCw,
  Plus,
} from "lucide-react";
import { isValidHeight, isValidUPI, STANDARD_HEIGHT_OPTIONS, normalizeHeight } from "@/lib/validation";
import { compressImage } from "@/lib/image-compress";
import StudentAttendanceScannerModal from "@/components/student/StudentAttendanceScannerModal";

interface StudentPhoto {
  id: string;
  url: string;
  photoType: "FORMAL" | "FULL_LENGTH" | "CASUAL" | "OTHER";
  caption?: string;
  isPrimary: boolean;
  createdAt: string;
}

interface DynamicField {
  id: string;
  key: string;
  label: string;
  type: string;
  description?: string;
  placeholder?: string;
  options: string[];
  isRequired: boolean;
  value?: string;
}

export default function StudentProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [photos, setPhotos] = useState<StudentPhoto[]>([]);
  const [dynamicFields, setDynamicFields] = useState<DynamicField[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadType, setUploadType] = useState<"FORMAL" | "FULL_LENGTH" | "CASUAL">("FORMAL");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Active navigation tab: "overview" | "gigs" | "edit" | "photos"
  const [activeTab, setActiveTab] = useState<"overview" | "gigs" | "edit" | "photos">("overview");
  const [gigFilter, setGigFilter] = useState<"ALL" | "CONFIRMED" | "SELECTED" | "ATTENDED" | "APPLIED">("ALL");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    university: "",
    course: "",
    year: "",
    city: "",
    gender: "",
    height: "",
    weight: "",
    age: "",
    upiId: "",
    bio: "",
    profilePhotoUrl: "",
  });

  const [dynamicResponses, setDynamicResponses] = useState<Record<string, string>>({});
  const [rsvpLoadingId, setRsvpLoadingId] = useState<string | null>(null);
  const [scannerEvent, setScannerEvent] = useState<any>(null);

  const showFeedback = (type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  const handleRsvpAction = async (appId: string, action: "CONFIRM" | "DECLINE") => {
    try {
      setRsvpLoadingId(appId);
      const query = new URLSearchParams({ appId, action });
      const res = await fetch(`/api/rsvp?` + query.toString());
      const json = await res.json();
      if (res.ok && json.success) {
        showFeedback(
          "success",
          action === "CONFIRM"
            ? "🎉 Duty attendance confirmed! WhatsApp group and QR check-in unlocked."
            : "Duty declined and slot released."
        );
        fetchProfile();
      } else {
        showFeedback("error", json.message || "Failed to update attendance.");
      }
    } catch (err: any) {
      showFeedback("error", err.message || "Error updating attendance.");
    } finally {
      setRsvpLoadingId(null);
    }
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/user/profile");
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        const u = data.user;
        setUser(u);
        setPhotos(u.studentPhotos || []);
        setDynamicFields(u.dynamicFields || []);

        const initialDynMap: Record<string, string> = {};
        if (Array.isArray(u.dynamicFields)) {
          u.dynamicFields.forEach((df: DynamicField) => {
            initialDynMap[df.id] = df.value || "";
          });
        }
        setDynamicResponses(initialDynMap);

        setFormData({
          name: u.name || "",
          email: u.email || "",
          university: u.university || "",
          course: u.course || "",
          year: u.year || "",
          city: u.city || "",
          gender: u.gender || "",
          height: u.height || "",
          weight: u.weight || "",
          age: u.age ? String(u.age) : "",
          upiId: u.upiId || "",
          bio: u.bio || "",
          profilePhotoUrl: u.profilePhotoUrl || "",
        });
      } else {
        router.push("/login");
      }
    } catch (err) {
      console.error("Profile fetch error:", err);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const triggerPhotoUpload = (type: "FORMAL" | "FULL_LENGTH" | "CASUAL") => {
    setUploadType(type);
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      showFeedback("error", "Photo file size must be less than 15MB.");
      return;
    }

    setUploadingPhoto(true);

    try {
      // Step 1: Automatically compress image in browser to ~150KB-250KB before upload
      const optimizedFile = await compressImage(file);

      const body = new FormData();
      body.append("file", optimizedFile);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body,
      });
      const uploadData = await uploadRes.json();

      if (!uploadRes.ok || !uploadData.success) {
        showFeedback("error", uploadData.message || "Failed to upload photo file.");
        return;
      }

      // Step 2: Save to student photo gallery table
      const isFirst = photos.length === 0;
      const photoSaveRes = await fetch("/api/user/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: uploadData.url,
          photoType: uploadType,
          isPrimary: isFirst || uploadType === "FORMAL",
        }),
      });

      const photoSaveData = await photoSaveRes.json();
      if (photoSaveData.success) {
        showFeedback("success", `New ${uploadType.toLowerCase()} photo saved to your profile!`);
        fetchProfile();
      } else {
        showFeedback("error", photoSaveData.message || "Failed to link photo.");
      }
    } catch (err) {
      console.error("Upload error:", err);
      showFeedback("error", "Network error during photo upload.");
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm("Are you sure you want to remove this photo?")) return;
    try {
      const res = await fetch(`/api/user/photos?id=${photoId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showFeedback("success", "Photo deleted.");
        fetchProfile();
      } else {
        showFeedback("error", data.message || "Failed to delete photo.");
      }
    } catch (err) {
      console.error(err);
      showFeedback("error", "Failed to delete photo.");
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validations
    if (formData.height && !isValidHeight(formData.height)) {
      showFeedback("error", "Invalid height format. Please select a height or enter a valid format like 5'10\" or 178 cm.");
      return;
    }

    if (formData.upiId && !isValidUPI(formData.upiId)) {
      showFeedback("error", "Invalid UPI ID format. Please enter a valid UPI ID (e.g., 9869556343@paytm or yourname@oksbi).");
      return;
    }

    setSaving(true);

    try {
      const formattedDynamic = Object.entries(dynamicResponses).map(([fieldId, value]) => ({
        fieldId,
        value,
      }));

      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          height: formData.height ? normalizeHeight(formData.height) : "",
          dynamicFieldResponses: formattedDynamic,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showFeedback("success", "Profile updated successfully!");
        fetchProfile();
      } else {
        showFeedback("error", data.message || "Failed to update profile.");
      }
    } catch (err) {
      console.error(err);
      showFeedback("error", "Network error. Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  // Authoritative server-side completeness score from profile API
  const completeness = user?.completeness || {
    percentage: 0,
    isComplete: false,
    missingFields: [],
    missingPhotos: [],
  };

  const allMissing = [...(completeness.missingFields || []), ...(completeness.missingPhotos || [])];

  // Active or Confirmed Gig (High Priority Action Card)
  const activeConfirmedGigs = useMemo(() => {
    if (!user?.recentApplications) return [];
    return user.recentApplications.filter(
      (app: any) => app.status === "CONFIRMED" || app.status === "SELECTED" || app.status === "ATTENDED"
    );
  }, [user]);

  // Filtered Gigs list
  const filteredGigs = useMemo(() => {
    if (!user?.recentApplications) return [];
    if (gigFilter === "ALL") return user.recentApplications;
    if (gigFilter === "CONFIRMED") return user.recentApplications.filter((a: any) => a.status === "CONFIRMED");
    if (gigFilter === "SELECTED") return user.recentApplications.filter((a: any) => a.status === "SELECTED");
    if (gigFilter === "ATTENDED") return user.recentApplications.filter((a: any) => a.status === "ATTENDED");
    if (gigFilter === "APPLIED") return user.recentApplications.filter((a: any) => a.status === "APPLIED" || a.status === "UNDER_REVIEW");
    return user.recentApplications;
  }, [user, gigFilter]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-[#f8fafc] text-slate-700">
        <Navbar />
        <main className="flex-grow flex items-center justify-center p-6">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm font-bold text-slate-500">Loading student dashboard...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc] text-slate-700 relative grid-bg overflow-hidden">
      <Navbar />

      {/* Hidden File Input for Image Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
      />

      <main className="flex-grow max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 w-full space-y-5 sm:space-y-6 relative z-10">
        
        {/* Feedback Alert Toast */}
        {feedback && (
          <div
            className={`p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-between shadow-md animate-in fade-in slide-in-from-top-2 duration-200 ${
              feedback.type === "success"
                ? "bg-emerald-600 text-white"
                : "bg-rose-600 text-white"
            }`}
          >
            <div className="flex items-center space-x-2">
              {feedback.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-white/80 hover:text-white p-1">
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* HERO PROFILE CARD & QUICK ACTIONS HUB */}
        {/* ---------------------------------------------------- */}
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm relative overflow-hidden">
          {/* Subtle decorative background gradient */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-red-500/10 via-amber-500/5 to-transparent rounded-bl-full pointer-events-none"></div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 relative z-10">
            {/* Left: Avatar & Identity */}
            <div className="flex items-center gap-4 min-w-0">
              <div className="relative group shrink-0">
                <div className="w-18 h-18 sm:w-20 sm:h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl sm:rounded-3xl border-2 border-slate-200 flex items-center justify-center overflow-hidden shadow-inner text-red-600 font-black text-2xl sm:text-3xl">
                  {user.profilePhotoUrl ? (
                    <img src={user.profilePhotoUrl} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    user.name?.charAt(0)?.toUpperCase() || "S"
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => triggerPhotoUpload("FORMAL")}
                  disabled={uploadingPhoto}
                  className="absolute -bottom-1 -right-1 w-7 h-7 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-md transition active:scale-95 border-2 border-white"
                  title="Update Photo"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 truncate">{user.name}</h1>
                  {user.selectionStatus === "SELECTED" && (
                    <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold flex items-center gap-1 shadow-2xs">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Selected
                    </span>
                  )}
                  {user.selectionStatus === "UNDER_REVIEW" && (
                    <span className="bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-600" /> Under Review
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono mt-1 flex-wrap">
                  <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-700 font-bold">
                    {user.registrationNumber || "No Roll No"}
                  </span>
                  {user.university && <span className="truncate max-w-[200px] text-slate-600">• {user.university}</span>}
                </div>

                {/* Completeness Pill */}
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        completeness.percentage === 100 ? "bg-emerald-500" : "bg-red-600"
                      }`}
                      style={{ width: `${completeness.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-[11px] font-bold text-slate-600">
                    {completeness.percentage}% Profile Complete
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Primary Call to Actions */}
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 flex-wrap">
              <Link
                href="/events"
                className="flex-1 sm:flex-initial bg-red-600 hover:bg-red-700 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition shadow-md flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Browse Events</span>
              </Link>

              <button
                type="button"
                onClick={() => setActiveTab("edit")}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3.5 py-2.5 rounded-xl text-xs transition border border-slate-200 flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                title="Edit Profile"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                <span>Edit Profile</span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-700 font-bold p-2.5 rounded-xl text-xs transition border border-slate-200 cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* QUICK ACTION SHORTCUT STRIP */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={`p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === "overview"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Overview</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("gigs")}
              className={`p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === "gigs"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
              <span>My Gigs ({user.recentApplications?.length || 0})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("photos")}
              className={`p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === "photos"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
              }`}
            >
              <Camera className="w-3.5 h-3.5 text-purple-500" />
              <span>Photos ({photos.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("edit")}
              className={`p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === "edit"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
              }`}
            >
              <Edit3 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Edit Details</span>
            </button>
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* ACTIVE CONFIRMED GIG SPOTLIGHT (Top Priority Card) */}
        {/* ---------------------------------------------------- */}
        {activeConfirmedGigs.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5 px-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Active Event Assignments & Attendance
            </h3>

            {activeConfirmedGigs.map((app: any) => {
              const ev = app.event || {};
              const isConfirmed = app.status === "CONFIRMED";
              const isSelected = app.status === "SELECTED";
              const isAttended = app.status === "ATTENDED";

              return (
                <div
                  key={app.id}
                  className={`rounded-3xl p-5 sm:p-6 border shadow-md transition ${
                    isAttended
                      ? "bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50/80 border-emerald-300"
                      : isConfirmed
                      ? "bg-gradient-to-r from-teal-900 via-slate-900 to-teal-950 text-white border-teal-500/50 shadow-xl"
                      : "bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-amber-300"
                  }`}
                >
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                            isAttended
                              ? "bg-emerald-600 text-white"
                              : isConfirmed
                              ? "bg-teal-500 text-slate-950 font-extrabold"
                              : "bg-amber-500 text-white"
                          }`}
                        >
                          {isAttended ? "🎉 Attended (Present)" : isConfirmed ? "✓ Confirmed Roster" : "✨ Selected (Awaiting RSVP)"}
                        </span>

                        {ev.reportingTime && (
                          <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md ${
                            isConfirmed ? "bg-white/10 text-teal-200" : "bg-white text-slate-700 border border-slate-200"
                          }`}>
                            ⏰ Report by {ev.reportingTime}
                          </span>
                        )}
                      </div>

                      <h4 className={`text-base sm:text-lg font-black truncate ${isConfirmed ? "text-white" : "text-slate-900"}`}>
                        {ev.name || "Topline Catering Event"}
                      </h4>

                      <div className={`flex items-center gap-3 text-xs font-medium flex-wrap ${isConfirmed ? "text-teal-200/90" : "text-slate-600"}`}>
                        {ev.date && <span>📅 {new Date(ev.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>}
                        {ev.location && <span>📍 {ev.location}</span>}
                        {ev.paymentPerStudent && <span>💰 ₹{ev.paymentPerStudent}</span>}
                      </div>
                    </div>

                    {/* Action Buttons for Active Gigs */}
                    <div className="flex items-center gap-2 w-full md:w-auto flex-wrap shrink-0">
                      {/* CONFIRMED: Direct Attendance Scanner & WhatsApp */}
                      {isConfirmed && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setScannerEvent({
                                id: ev.id || app.eventId,
                                name: ev.name,
                                date: ev.date,
                                location: ev.location,
                                reportingTime: ev.reportingTime,
                                attendanceToken: ev.attendanceToken,
                                attendanceTokenEnabled: ev.attendanceTokenEnabled,
                              })
                            }
                            className="flex-1 md:flex-initial bg-red-600 hover:bg-red-500 active:scale-95 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5 shadow-lg cursor-pointer"
                          >
                            <QrCode className="w-4 h-4" />
                            <span>Mark Attendance (Scan QR)</span>
                          </button>

                          {ev.whatsappGroupLink && (
                            <a
                              href={ev.whatsappGroupLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-[#25D366] hover:bg-[#20bd5a] active:scale-95 text-white font-extrabold px-3.5 py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-md whitespace-nowrap"
                            >
                              <MessageCircle className="w-4 h-4 fill-white" />
                              <span>WhatsApp</span>
                            </a>
                          )}
                        </>
                      )}

                      {/* SELECTED: 1-Tap Confirm / Decline */}
                      {isSelected && (
                        <div className="flex items-center gap-2 w-full md:w-auto">
                          <button
                            onClick={() => handleRsvpAction(app.id, "CONFIRM")}
                            disabled={rsvpLoadingId === app.id}
                            className="flex-1 md:flex-initial bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-md transition disabled:opacity-50 cursor-pointer"
                          >
                            {rsvpLoadingId === app.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 stroke-3" />}
                            <span>Confirm Available</span>
                          </button>

                          <button
                            onClick={() => handleRsvpAction(app.id, "DECLINE")}
                            disabled={rsvpLoadingId === app.id}
                            className="bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 text-xs font-bold px-3 py-2.5 rounded-xl flex items-center justify-center gap-1 border border-slate-200 transition disabled:opacity-50 cursor-pointer"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Decline</span>
                          </button>
                        </div>
                      )}

                      {/* ATTENDED: Verified badge */}
                      {isAttended && (
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-600 text-white shadow-2xs flex items-center gap-1">
                            <ShieldCheck className="w-4 h-4" />
                            <span>Attendance Verified ({app.attendance?.attendanceStatus || "PRESENT"})</span>
                          </span>
                          {ev.whatsappGroupLink && (
                            <a
                              href={ev.whatsappGroupLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 shadow-2xs transition"
                            >
                              <MessageCircle className="w-3.5 h-3.5 fill-white" />
                              <span>WhatsApp</span>
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 1: OVERVIEW DASHBOARD */}
        {/* ---------------------------------------------------- */}
        {activeTab === "overview" && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Gigs Applied</span>
                <span className="text-xl font-black text-slate-900 mt-1 block">{user.recentApplications?.length || 0}</span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">Lifetime applications</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Confirmed / Attended</span>
                <span className="text-xl font-black text-emerald-600 mt-1 block">
                  {user.recentApplications?.filter((a: any) => a.status === "CONFIRMED" || a.status === "ATTENDED").length || 0}
                </span>
                <span className="text-[11px] text-emerald-700 mt-0.5 block">Verified duty slots</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Attire Photos</span>
                <span className="text-xl font-black text-purple-600 mt-1 block">{photos.length}</span>
                <span className="text-[11px] text-purple-700 mt-0.5 block">{photos.length >= 2 ? "✓ Verified photos" : "Upload formal & full"}</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Payout UPI Handle</span>
                <span className="text-xs font-mono font-bold text-slate-900 mt-1.5 block truncate">
                  {formData.upiId || "Not set yet"}
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">{formData.upiId ? "✓ Direct settlement" : "⚠️ Add UPI in Edit"}</span>
              </div>
            </div>

            {/* Profile Completeness Checklist Box */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-red-600" />
                  Profile Completeness Checklist
                </h3>
                <span className="text-xs font-black text-red-600">{completeness.percentage}%</span>
              </div>

              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all duration-700 ${
                    completeness.percentage === 100 ? "bg-emerald-500" : "bg-gradient-to-r from-red-500 to-red-600"
                  }`}
                  style={{ width: `${completeness.percentage}%` }}
                ></div>
              </div>

              {allMissing.length > 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <span className="font-bold block">Missing items to complete profile (100%):</span>
                    <span className="text-[11px] text-amber-800">{allMissing.join(" • ")}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("edit")}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl whitespace-nowrap"
                  >
                    Complete Now
                  </button>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-bold">Excellent! Your permanent student profile is 100% complete and ready for event assignments.</span>
                </div>
              )}
            </div>

            {/* Recent Gigs Summary List */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-red-600" />
                  Recent Applications ({user.recentApplications?.length || 0})
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab("gigs")}
                  className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                >
                  <span>View All Gigs</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {(!user.recentApplications || user.recentApplications.length === 0) ? (
                <div className="text-center py-8 space-y-3">
                  <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-slate-500 text-xs font-semibold">You have not applied for any event gigs yet.</p>
                  <Link
                    href="/events"
                    className="inline-block bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition shadow-sm"
                  >
                    Browse Open Events
                  </Link>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {user.recentApplications.slice(0, 3).map((app: any) => (
                    <div
                      key={app.id}
                      className="p-3.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 transition"
                    >
                      <div className="min-w-0">
                        <Link href={`/events/${app.event?.id}`} className="font-extrabold text-slate-900 hover:text-red-600 text-xs sm:text-sm truncate block">
                          {app.event?.name}
                        </Link>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {app.event?.date ? new Date(app.event.date).toLocaleDateString("en-GB") : ""} • {app.event?.location}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase ${
                            app.status === "ATTENDED"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : app.status === "CONFIRMED"
                              ? "bg-teal-100 text-teal-800 border border-teal-300"
                              : app.status === "SELECTED"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {app.status}
                        </span>

                        {app.status === "CONFIRMED" && (
                          <button
                            type="button"
                            onClick={() =>
                              setScannerEvent({
                                id: app.event?.id || app.eventId,
                                name: app.event?.name,
                                date: app.event?.date,
                                location: app.event?.location,
                                reportingTime: app.event?.reportingTime,
                                attendanceToken: app.event?.attendanceToken,
                                attendanceTokenEnabled: app.event?.attendanceTokenEnabled,
                              })
                            }
                            className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
                            title="Scan Attendance QR"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 2: MY GIGS & HISTORY */}
        {/* ---------------------------------------------------- */}
        {activeTab === "gigs" && (
          <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-5 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-black text-slate-900 text-base uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-red-600" />
                  My Gigs & Applications History
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Track your application decisions, duty attendance status, and event earnings.
                </p>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {(["ALL", "CONFIRMED", "SELECTED", "ATTENDED", "APPLIED"] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setGigFilter(filter)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                      gigFilter === filter
                        ? "bg-slate-900 text-white shadow-2xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {filter === "ALL" ? "All" : filter}
                  </button>
                ))}
              </div>
            </div>

            {filteredGigs.length === 0 ? (
              <div className="text-center py-12 space-y-3 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
                <p className="text-slate-700 font-bold text-sm">No applications matching {gigFilter !== "ALL" ? gigFilter : ""}</p>
                <Link
                  href="/events"
                  className="inline-block bg-red-600 hover:bg-red-700 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition shadow-sm"
                >
                  Browse Available Gigs
                </Link>
              </div>
            ) : (
              <div className="space-y-3.5">
                {filteredGigs.map((app: any) => {
                  const ev = app.event || {};
                  return (
                    <div key={app.id} className="p-4 bg-slate-50/90 border border-slate-200 rounded-2xl space-y-3 text-xs">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <div>
                          <Link href={`/events/${ev.id}`} className="font-black text-slate-900 hover:text-red-600 text-sm">
                            {ev.name}
                          </Link>
                          <div className="flex items-center gap-2 text-slate-500 text-[11px] mt-0.5 flex-wrap">
                            {ev.date && <span>📅 {new Date(ev.date).toLocaleDateString("en-GB")}</span>}
                            {ev.location && <span>📍 {ev.location}</span>}
                            {ev.reportingTime && <span>⏰ {ev.reportingTime}</span>}
                            {ev.paymentPerStudent && <span className="font-bold text-slate-800">💰 ₹{ev.paymentPerStudent}</span>}
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${
                            app.status === "ATTENDED"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : app.status === "CONFIRMED"
                              ? "bg-teal-100 text-teal-800 border border-teal-300"
                              : app.status === "SELECTED"
                              ? "bg-emerald-100 text-emerald-800"
                              : app.status === "CANCELLED"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {app.status === "ATTENDED"
                            ? "🎉 Attended"
                            : app.status === "CONFIRMED"
                            ? "✅ Confirmed"
                            : app.status === "CANCELLED"
                            ? "❌ Declined"
                            : app.status}
                        </span>
                      </div>

                      {/* Action buttons inside Gig card */}
                      {app.status === "CONFIRMED" && (
                        <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-teal-800 font-bold text-[11px]">
                            ✓ Ready for Duty. Scan QR code when you arrive at venue:
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setScannerEvent({
                                  id: ev.id || app.eventId,
                                  name: ev.name,
                                  date: ev.date,
                                  location: ev.location,
                                  reportingTime: ev.reportingTime,
                                  attendanceToken: ev.attendanceToken,
                                  attendanceTokenEnabled: ev.attendanceTokenEnabled,
                                })
                              }
                              className="bg-red-600 hover:bg-red-700 active:scale-95 text-white font-extrabold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 shadow-sm transition cursor-pointer"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                              <span>Scan Attendance</span>
                            </button>

                            {ev.whatsappGroupLink && (
                              <a
                                href={ev.whatsappGroupLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 shadow-2xs transition"
                              >
                                <MessageCircle className="w-3 h-3 fill-white" />
                                <span>WhatsApp</span>
                              </a>
                            )}
                          </div>
                        </div>
                      )}

                      {app.status === "SELECTED" && (
                        <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-emerald-800 font-bold text-[11px]">
                            🎉 You were selected! Confirm your availability:
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleRsvpAction(app.id, "CONFIRM")}
                              disabled={rsvpLoadingId === app.id}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-sm"
                            >
                              {rsvpLoadingId === app.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                              <span>I Am Available</span>
                            </button>
                            <button
                              onClick={() => handleRsvpAction(app.id, "DECLINE")}
                              disabled={rsvpLoadingId === app.id}
                              className="bg-slate-200 hover:bg-rose-100 text-slate-700 hover:text-rose-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      )}

                      {app.status === "ATTENDED" && (
                        <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between text-[11px] text-emerald-800 font-bold">
                          <span>✓ Duty Completed & Recorded</span>
                          {ev.whatsappGroupLink && (
                            <a
                              href={ev.whatsappGroupLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#25D366] hover:underline flex items-center gap-1 font-bold"
                            >
                              <span>WhatsApp Chat</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 3: EDIT PROFILE DETAILS */}
        {/* ---------------------------------------------------- */}
        {activeTab === "edit" && (
          <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-6 animate-in fade-in duration-200">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-900 uppercase tracking-wider text-base flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-red-600" />
                  Edit Profile & Academic Details
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update your contact, university, physical attributes, and payout UPI handle.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-red-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Mobile Phone (Fixed)</label>
                  <input
                    type="text"
                    disabled
                    value={user.phone}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-500 cursor-not-allowed font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="student@example.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-red-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">University / College *</label>
                  <input
                    type="text"
                    required
                    value={formData.university}
                    onChange={(e) => setFormData({ ...formData, university: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-red-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">City / Region *</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g. Amritsar, Jalandhar"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-red-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Gender
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-red-600"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Height *
                  </label>
                  <div className="space-y-1.5">
                    <select
                      value={
                        STANDARD_HEIGHT_OPTIONS.some((opt) => opt.value === formData.height)
                          ? formData.height
                          : formData.height
                          ? "CUSTOM"
                          : ""
                      }
                      onChange={(e) => {
                        if (e.target.value !== "CUSTOM") {
                          setFormData({ ...formData, height: e.target.value });
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-red-600"
                    >
                      <option value="">Select Height...</option>
                      {STANDARD_HEIGHT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                      <option value="CUSTOM">Custom / Other Format...</option>
                    </select>

                    {(!STANDARD_HEIGHT_OPTIONS.some((opt) => opt.value === formData.height) || formData.height === "CUSTOM") && (
                      <input
                        type="text"
                        value={formData.height === "CUSTOM" ? "" : formData.height}
                        onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                        placeholder="e.g. 5'10&quot; or 178 cm"
                        className={`w-full bg-slate-50 border rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none ${
                          formData.height && !isValidHeight(formData.height)
                            ? "border-rose-400 focus:border-rose-500 bg-rose-50/40"
                            : "border-slate-200 focus:border-red-600"
                        }`}
                      />
                    )}

                    {formData.height && (
                      <div className="text-[11px] font-semibold">
                        {isValidHeight(formData.height) ? (
                          <span className="text-emerald-600 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Valid Height ({normalizeHeight(formData.height)})
                          </span>
                        ) : (
                          <span className="text-rose-600 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" /> Invalid height format
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Dynamic Admin Fields */}
              {dynamicFields.length > 0 && (
                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-red-600" />
                    Additional Profile Requirements
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {dynamicFields.map((field) => (
                      <div key={field.id}>
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                          {field.label} {field.isRequired && "*"}
                        </label>
                        {field.type === "SELECT" && field.options?.length > 0 ? (
                          <select
                            value={dynamicResponses[field.id] || ""}
                            onChange={(e) =>
                              setDynamicResponses({ ...dynamicResponses, [field.id]: e.target.value })
                            }
                            required={field.isRequired}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-red-600"
                          >
                            <option value="">Select option</option>
                            {field.options.map((opt, i) => (
                              <option key={i} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : field.type === "YESNO" ? (
                          <select
                            value={dynamicResponses[field.id] || ""}
                            onChange={(e) =>
                              setDynamicResponses({ ...dynamicResponses, [field.id]: e.target.value })
                            }
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-red-600"
                          >
                            <option value="">Select</option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </select>
                        ) : (
                          <input
                            type="text"
                            required={field.isRequired}
                            placeholder={field.placeholder || ""}
                            value={dynamicResponses[field.id] || ""}
                            onChange={(e) =>
                              setDynamicResponses({ ...dynamicResponses, [field.id]: e.target.value })
                            }
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-red-600"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Direct UPI Payout Settings */}
              <div className="pt-4 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  UPI ID for Direct Payout Settlements
                </label>
                <div className="relative">
                  <Banknote className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={formData.upiId}
                    onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                    placeholder="e.g. mobile@paytm or yourname@oksbi"
                    className={`w-full bg-slate-50 border rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-900 focus:outline-none ${
                      formData.upiId && !isValidUPI(formData.upiId)
                        ? "border-rose-400 focus:border-rose-500 bg-rose-50/40"
                        : "border-slate-200 focus:border-red-600"
                    }`}
                  />
                </div>
                {formData.upiId && !isValidUPI(formData.upiId) ? (
                  <span className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Invalid UPI handle format (e.g. 9869556343@paytm or name@oksbi)
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Topline event payments are credited directly to this verified UPI ID after duty completion.
                  </span>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full sm:w-auto bg-slate-900 hover:bg-black text-white font-extrabold px-8 py-3 rounded-xl text-xs uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? "Saving Changes..." : "Save Profile Details"}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 4: GROOMING PHOTOS */}
        {/* ---------------------------------------------------- */}
        {activeTab === "photos" && (
          <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-black text-slate-900 uppercase tracking-wider text-base flex items-center gap-2">
                  <Camera className="w-5 h-5 text-red-600" />
                  Permanent Profile & Grooming Photos
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Upload clear, well-lit formal grooming photos and full-length attire photos.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={uploadingPhoto}
                  onClick={() => triggerPhotoUpload("FORMAL")}
                  className="bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs px-3.5 py-2.5 rounded-xl transition shadow-sm flex items-center gap-1.5 active:scale-95 cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Upload Formal Photo</span>
                </button>
                <button
                  type="button"
                  disabled={uploadingPhoto}
                  onClick={() => triggerPhotoUpload("FULL_LENGTH")}
                  className="bg-slate-900 hover:bg-black text-white font-extrabold text-xs px-3.5 py-2.5 rounded-xl transition shadow-sm flex items-center gap-1.5 active:scale-95 cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Upload Full-Length</span>
                </button>
              </div>
            </div>

            {photos.length === 0 ? (
              <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center space-y-3 bg-slate-50">
                <Camera className="w-12 h-12 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-700">No profile photos uploaded yet</p>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Having clear formal and full-length photos is required to be selected for catering events.
                </p>
                <button
                  type="button"
                  onClick={() => triggerPhotoUpload("FORMAL")}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-sm inline-flex items-center gap-2 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Upload First Photo</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="relative aspect-3/4 rounded-2xl overflow-hidden border border-slate-200 group bg-slate-100 shadow-sm"
                  >
                    <img
                      src={photo.url}
                      alt="Grooming"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = "none";
                      }}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Category Pill */}
                    <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md text-white px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider">
                      {photo.photoType}
                    </div>

                    {photo.isPrimary && (
                      <div className="absolute top-2 right-2 bg-emerald-600 text-white p-1 rounded-full shadow" title="Primary Profile Photo">
                        <Star className="w-3 h-3 fill-white" />
                      </div>
                    )}

                    {/* Delete Action */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2 p-2">
                      <button
                        onClick={() => handleDeletePhoto(photo.id)}
                        className="p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-lg transition active:scale-95 cursor-pointer"
                        title="Delete Photo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* ATTENDANCE CAMERA QR SCANNER MODAL */}
        {/* ---------------------------------------------------- */}
        {scannerEvent && (
          <StudentAttendanceScannerModal
            isOpen={!!scannerEvent}
            onClose={() => setScannerEvent(null)}
            event={scannerEvent}
            onSuccess={(result) => {
              showFeedback("success", `Attendance successfully recorded as ${result.status || "PRESENT"}!`);
              fetchProfile();
            }}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}
