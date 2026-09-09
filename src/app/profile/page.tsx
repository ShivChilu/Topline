"use client";

import { useEffect, useState, useRef } from "react";
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
        showFeedback("success", action === "CONFIRM" ? "Duty attendance confirmed! WhatsApp group unlocked." : "Duty declined and slot released.");
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

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-[#f8fafc] text-slate-700">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm font-bold text-slate-500">Loading student profile...</p>
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

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-8 relative z-10">
        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-2xl text-sm font-semibold flex items-center justify-between shadow-sm animate-in fade-in ${
              feedback.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-rose-50 text-rose-800 border border-rose-200"
            }`}
          >
            <div className="flex items-center space-x-2">
              {feedback.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-700">
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Profile Header with Avatar & Permanent Selection Status */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center space-x-5">
            <div className="relative group">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-100 rounded-3xl border-2 border-slate-200 flex items-center justify-center overflow-hidden shadow-inner flex-shrink-0 text-red-600 font-extrabold text-3xl">
                {user.profilePhotoUrl ? (
                  <img src={user.profilePhotoUrl} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  user.name?.charAt(0)?.toUpperCase() || "S"
                )}
              </div>

              {/* Camera Trigger */}
              <button
                type="button"
                onClick={() => triggerPhotoUpload("FORMAL")}
                disabled={uploadingPhoto}
                className="absolute inset-0 bg-black/60 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-bold p-1 cursor-pointer"
                title="Upload Photo"
              >
                <Camera className="w-5 h-5 mb-1" />
                <span>{uploadingPhoto ? "Uploading..." : "Add Photo"}</span>
              </button>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{user.name}</h1>
                {/* Selection Status Badge */}
                {user.selectionStatus === "SELECTED" && (
                  <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-0.5 rounded-full text-xs font-extrabold flex items-center gap-1 shadow-sm">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Selected Candidate
                  </span>
                )}
                {user.selectionStatus === "UNDER_REVIEW" && (
                  <span className="bg-amber-100 text-amber-800 border border-amber-300 px-3 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Under Review
                  </span>
                )}
                {user.selectionStatus === "NOT_SELECTED" && (
                  <span className="bg-rose-100 text-rose-800 border border-rose-300 px-3 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> Profile Not Selected
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-mono mt-1">
                Roll No: <span className="font-bold text-slate-800">{user.registrationNumber}</span> • {user.university || "University Unspecified"}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Permanent Topline Student Account • 30-Day Persistent Session Active
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 w-full md:w-auto">
            <Link
              href="/events"
              className="flex-1 md:flex-initial bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm uppercase tracking-wider transition shadow-sm text-center"
            >
              Browse Open Events
            </Link>
            <button
              onClick={handleLogout}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm transition flex items-center justify-center space-x-1 border border-slate-200"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Profile Completeness Progress */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-red-600" />
              <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider">
                Profile Completeness & Verification
              </h2>
            </div>
            <span className="text-sm font-extrabold text-red-600">{completeness.percentage}% Completed</span>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all duration-700 ${
                completeness.percentage === 100 ? "bg-emerald-500" : "bg-gradient-to-r from-red-500 to-red-600"
              }`}
              style={{ width: `${completeness.percentage}%` }}
            ></div>
          </div>

          {allMissing.length > 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>
                  Complete your profile to reach 100% and unlock event applications:{" "}
                  <strong className="font-bold">{allMissing.join(", ")}</strong>
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-xs text-emerald-800 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="font-bold">Excellent! Your permanent profile is fully completed and ready for event allocations.</span>
            </div>
          )}
        </div>

        {/* ---------------------------------------------------- */}
        {/* PERMANENT STUDENT PHOTO GALLERY UPLOADER */}
        {/* ---------------------------------------------------- */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-extrabold text-slate-900 uppercase tracking-wider text-base flex items-center gap-2">
                <Camera className="w-5 h-5 text-red-600" />
                Permanent Profile & Grooming Photos
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Upload clear, well-lit formal grooming photos and full-length attire photos. These are permanently stored in your account and visually evaluated by Topline operations managers.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={uploadingPhoto}
                onClick={() => triggerPhotoUpload("FORMAL")}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition shadow-sm flex items-center gap-1.5"
              >
                <UploadCloud className="w-4 h-4" />
                Upload Formal Photo
              </button>
              <button
                type="button"
                disabled={uploadingPhoto}
                onClick={() => triggerPhotoUpload("FULL_LENGTH")}
                className="bg-slate-900 hover:bg-black text-white font-bold text-xs px-3.5 py-2 rounded-xl transition shadow-sm flex items-center gap-1.5"
              >
                <UploadCloud className="w-4 h-4" />
                Upload Full-Length
              </button>
            </div>
          </div>

          {photos.length === 0 ? (
            <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center space-y-3 bg-slate-50">
              <Camera className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">No profile photos uploaded yet</p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Having clear formal and full-length photos is mandatory to get selected for premium five-star catering events.
              </p>
              <button
                type="button"
                onClick={() => triggerPhotoUpload("FORMAL")}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-5 py-2 rounded-xl transition shadow-sm inline-flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                Upload First Photo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
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

                  {/* Hover Delete Action */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2 p-2">
                    <button
                      onClick={() => handleDeletePhoto(photo.id)}
                      className="p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-lg transition"
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

        {/* ---------------------------------------------------- */}
        {/* EDIT PROFILE DETAILS & DYNAMIC ADMIN FIELDS */}
        {/* ---------------------------------------------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Info Form */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 uppercase tracking-wider text-base">
                Personal & Academic Information
              </h3>
              <span className="text-xs text-slate-400 font-mono">Permanent Profile</span>
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

                    {/* Show manual input if non-standard or custom */}
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

                    {/* Live Height Validation Feedback */}
                    {formData.height && (
                      <div className="text-[11px] font-semibold">
                        {isValidHeight(formData.height) ? (
                          <span className="text-emerald-600 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Valid Height ({normalizeHeight(formData.height)})
                          </span>
                        ) : (
                          <span className="text-rose-600 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" /> Invalid height (e.g. 5'10&quot; or 178 cm)
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

              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto bg-slate-900 hover:bg-black text-white font-bold px-8 py-3 rounded-xl text-xs uppercase tracking-wider transition shadow-sm flex items-center justify-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? "Saving Changes..." : "Save Profile Details"}</span>
              </button>
            </form>
          </div>

          {/* Right Column: Event History Overview */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 uppercase tracking-wider text-base">
                Recent Gigs
              </h3>
              <span className="text-xs font-bold text-red-600 font-mono">
                {user.recentApplications?.length || 0} Total
              </span>
            </div>

            {(!user.recentApplications || user.recentApplications.length === 0) ? (
              <div className="text-center py-8 space-y-3">
                <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-slate-500 text-xs font-semibold">No event applications yet.</p>
                <Link
                  href="/events"
                  className="inline-block bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition shadow-sm"
                >
                  Apply for Events
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {user.recentApplications.map((app: any) => (
                  <div key={app.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <Link href={`/events/${app.event?.id}`} className="font-bold text-slate-900 hover:text-red-600 truncate">
                        {app.event?.name}
                      </Link>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        app.status === "ATTENDED"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold"
                          : app.status === "CONFIRMED"
                          ? "bg-teal-100 text-teal-800 border border-teal-200 font-bold"
                          : app.status === "SELECTED"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold"
                          : app.status === "NOT_SELECTED" || app.status === "REJECTED" || app.status === "CANCELLED"
                          ? "bg-rose-100 text-rose-800 border border-rose-200"
                          : "bg-slate-200 text-slate-700"
                      }`}>
                        {app.status === "ATTENDED"
                          ? "🎉 Attended (Present)"
                          : app.status === "CONFIRMED"
                          ? "✅ Confirmed"
                          : app.status === "CANCELLED"
                          ? "❌ Declined"
                          : app.status}
                      </span>
                    </div>
                    <div className="text-slate-400 text-[11px]">
                      {app.event?.date ? new Date(app.event.date).toLocaleDateString("en-GB") : ""} • {app.event?.location}
                    </div>

                    {/* Banner when ATTENDED (Attendance Recorded) */}
                    {app.status === "ATTENDED" && (
                      <div className="pt-2 border-t border-slate-200 flex flex-col gap-2 bg-emerald-50/90 p-3 rounded-xl border border-emerald-300 shadow-2xs">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-700 flex items-center justify-center font-extrabold text-sm shrink-0 border border-emerald-400">
                              ✓
                            </div>
                            <div>
                              <span className="text-emerald-950 font-black text-xs block flex items-center gap-1">
                                🎉 Attendance Recorded: {app.attendance?.attendanceStatus || "PRESENT"}
                              </span>
                              <span className="text-emerald-800 text-[11px] font-medium">
                                Checked in at {app.attendance?.checkInTime ? new Date(app.attendance.checkInTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true }) : "Gate Desk"}
                              </span>
                            </div>
                          </div>

                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-600 text-white shadow-2xs flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" /> Verified On Duty
                          </span>
                        </div>

                        {app.event?.whatsappGroupLink && (
                          <div className="pt-1.5 border-t border-emerald-200/70 flex items-center justify-between">
                            <span className="text-[10px] text-emerald-800 font-semibold">Event official chat:</span>
                            <a
                              href={app.event.whatsappGroupLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-[#25D366] hover:bg-[#20bd5a] text-white text-[11px] font-extrabold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-2xs transition whitespace-nowrap"
                            >
                              <MessageCircle className="w-3 h-3 fill-white" />
                              <span>Open WhatsApp</span>
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action banner when SELECTED (Awaiting Response) */}
                    {app.status === "SELECTED" && (
                      <div className="pt-2 border-t border-slate-200 flex flex-col gap-2.5 bg-emerald-50/80 p-3 rounded-xl border border-emerald-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-emerald-900 font-black text-xs block">🎉 Selected for Event Duty!</span>
                            <span className="text-emerald-700 text-[11px]">Are you available to attend this assignment? Confirm to unlock attendance check-in.</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <button
                            onClick={() => handleRsvpAction(app.id, "CONFIRM")}
                            disabled={rsvpLoadingId === app.id}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition disabled:opacity-50 cursor-pointer"
                          >
                            {rsvpLoadingId === app.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 stroke-3" />}
                            <span>✅ YES, I AM AVAILABLE</span>
                          </button>

                          <button
                            onClick={() => handleRsvpAction(app.id, "DECLINE")}
                            disabled={rsvpLoadingId === app.id}
                            className="bg-slate-200 hover:bg-rose-100 text-slate-700 hover:text-rose-700 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 transition disabled:opacity-50 cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>❌ NO (Decline)</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Banner when CONFIRMED (Attendance Ready + Mark Attendance Button) */}
                    {app.status === "CONFIRMED" && (
                      <div className="pt-2 border-t border-slate-200 flex flex-col gap-2.5 bg-teal-50/90 p-3 rounded-xl border border-teal-200 shadow-2xs">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                          <div>
                            <span className="text-teal-900 font-extrabold text-xs flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 inline" /> Duty Confirmed & Roster Locked
                            </span>
                            <span className="text-teal-700 text-[11px]">You are confirmed on this roster. Scan coordinator&apos;s QR code upon arrival:</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => setScannerEvent({
                              id: app.event?.id || app.eventId,
                              name: app.event?.name,
                              date: app.event?.date,
                              location: app.event?.location,
                              reportingTime: app.event?.reportingTime,
                              attendanceToken: app.event?.attendanceToken,
                              attendanceTokenEnabled: app.event?.attendanceTokenEnabled,
                            })}
                            className="bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition whitespace-nowrap cursor-pointer active:scale-95"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>📷 Mark Attendance</span>
                          </button>
                        </div>

                        {/* WhatsApp Group Link */}
                        <div className="pt-1.5 border-t border-teal-200/60 flex items-center justify-between">
                          <span className="text-[10px] text-teal-800 font-semibold">Live duty coordination chat:</span>
                          {app.event?.whatsappGroupLink ? (
                            <a
                              href={app.event.whatsappGroupLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-[#25D366] hover:bg-[#20bd5a] text-white text-[11px] font-extrabold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-2xs transition whitespace-nowrap"
                            >
                              <MessageCircle className="w-3 h-3 fill-white" />
                              <span>📲 Join WhatsApp Group</span>
                            </a>
                          ) : (
                            <span className="text-slate-400 text-[10px] italic">WhatsApp group link pending coordinator update</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Banner when CANCELLED / DECLINED */}
                    {app.status === "CANCELLED" && (
                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                        <span className="text-rose-800 text-[11px] font-semibold flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5 text-rose-500 inline" /> Duty Assignment Permanently Declined
                        </span>
                        <span className="text-[10px] text-rose-600 italic">Slot released</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Student Attendance Camera QR Scanner Modal */}
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
