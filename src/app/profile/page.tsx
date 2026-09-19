"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  User,
  Users,
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
  Gift,
  Share2,
  Copy,
  ChevronDown,
  ChevronUp,
  Wallet,
  FileText,
  Lock,
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

  // Active navigation tab: "overview" | "gigs" | "referral" | "photos" | "edit"
  const [activeTab, setActiveTab] = useState<"overview" | "gigs" | "referral" | "photos" | "edit">("overview");
  const [gigFilter, setGigFilter] = useState<"ALL" | "CONFIRMED" | "SELECTED" | "ATTENDED" | "APPLIED">("ALL");

  // Referral System States
  const [referralData, setReferralData] = useState<any>(null);
  const [loadingReferral, setLoadingReferral] = useState(false);
  const [referralUpiInput, setReferralUpiInput] = useState("");
  const [customCodeInput, setCustomCodeInput] = useState("");
  const [savingReferral, setSavingReferral] = useState(false);
  const [copiedRefCode, setCopiedRefCode] = useState(false);
  const [copiedRefLink, setCopiedRefLink] = useState(false);
  const [editingUpi, setEditingUpi] = useState(false);
  const [faqOpen, setFaqOpen] = useState<Record<number, boolean>>({});
  const [termsOpen, setTermsOpen] = useState(false);
  const [referralViewMode, setReferralViewMode] = useState<"trackers" | "table">("trackers");

  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [replacingPhotoId, setReplacingPhotoId] = useState<string | null>(null);
  const [photoActionLoading, setPhotoActionLoading] = useState<string | null>(null);

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

  const fetchProfile = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetch(`/api/user/profile?t=${Date.now()}`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        const u = data.user;
        const isAdminRole = ["ADMIN", "SUPERADMIN", "CALLING_ADMIN", "EVENT_ADMIN"].includes(u.role);
        if (isAdminRole) {
          const redirectUrl =
            u.role === "CALLING_ADMIN"
              ? "/admin/calling"
              : u.role === "EVENT_ADMIN"
              ? "/admin/events"
              : "/admin/dashboard";
          router.replace(redirectUrl);
          return;
        }

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
        if (!silent) router.push("/login");
      }
    } catch (err) {
      console.error("Profile fetch error:", err);
      if (!silent) router.push("/login");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchReferralData = async (silent = false) => {
    try {
      if (!silent) setLoadingReferral(true);
      const res = await fetch(`/api/user/referral?t=${Date.now()}`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data.success) {
        setReferralData(data);
        if (data.user?.upiId) {
          setReferralUpiInput(data.user.upiId);
        }
      }
    } catch (err) {
      console.error("Error fetching referral data:", err);
    } finally {
      if (!silent) setLoadingReferral(false);
    }
  };

  const handleSaveReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!referralUpiInput || !isValidUPI(referralUpiInput.trim())) {
      showFeedback("error", "Please enter a valid UPI ID (e.g., 9876543210@paytm or yourname@oksbi).");
      return;
    }

    try {
      setSavingReferral(true);
      const res = await fetch("/api/user/referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          upiId: referralUpiInput.trim(),
          customCode: customCodeInput.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showFeedback("success", data.message || "Referral details updated successfully!");
        setEditingUpi(false);
        setCustomCodeInput("");
        fetchReferralData(true);
        fetchProfile(true);
      } else {
        showFeedback("error", data.message || "Failed to update referral details.");
      }
    } catch (err: any) {
      showFeedback("error", err.message || "Network error. Failed to update referral.");
    } finally {
      setSavingReferral(false);
    }
  };

  const handleCopyRefCode = () => {
    const code = referralData?.user?.referralCode;
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedRefCode(true);
    showFeedback("success", "Referral code copied to clipboard!");
    setTimeout(() => setCopiedRefCode(false), 2500);
  };

  const handleCopyRefLink = () => {
    const link = referralData?.user?.inviteUrl;
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopiedRefLink(true);
    showFeedback("success", "Referral invite link copied to clipboard!");
    setTimeout(() => setCopiedRefLink(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const code = referralData?.user?.referralCode || "";
    const url = referralData?.user?.inviteUrl || window.location.origin;
    const msg = `Hey! 👋 Join Topline to work flexible student catering events and earn quick daily payouts. Register using my invite code ${code} or click here: ${url}`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, "_blank");
  };

  const handleShareTelegram = () => {
    const code = referralData?.user?.referralCode || "";
    const url = referralData?.user?.inviteUrl || window.location.origin;
    const msg = `Join Topline to work flexible student catering events and earn quick daily payouts! Use code: ${code}`;
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(msg)}`;
    window.open(tgUrl, "_blank");
  };

  const handleNativeShare = async () => {
    const code = referralData?.user?.referralCode || "";
    const url = referralData?.user?.inviteUrl || window.location.origin;
    const shareData = {
      title: "Join Topline & Earn with Me",
      text: `Join Topline to work flexible student catering events! Use my referral code ${code}:`,
      url: url,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or share failed
      }
    } else {
      handleCopyRefLink();
    }
  };

  const toggleFaq = (index: number) => {
    setFaqOpen((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  useEffect(() => {
    fetchProfile(false);
    fetchReferralData(false);
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

  const triggerPhotoUpload = (type: "FORMAL" | "FULL_LENGTH" | "CASUAL" | "OTHER" = "FORMAL") => {
    setReplacingPhotoId(null);
    setUploadType(type === "OTHER" ? "FORMAL" : type);
    fileInputRef.current?.click();
  };

  const handleReplacePhoto = (photoId: string, type: "FORMAL" | "FULL_LENGTH" | "CASUAL" | "OTHER" = "FORMAL") => {
    setReplacingPhotoId(photoId);
    setUploadType(type === "OTHER" ? "FORMAL" : type);
    fileInputRef.current?.click();
  };

  const handleSetPrimaryPhoto = async (photoId: string) => {
    try {
      setPhotoActionLoading(photoId);
      // Optimistic UI update
      setPhotos((prev) =>
        prev.map((p) => ({
          ...p,
          isPrimary: p.id === photoId,
        }))
      );
      setUser((prev: any) => ({
        ...prev,
        profilePhotoUrl: `/api/photos/student?photoId=${photoId}&t=${Date.now()}`,
      }));

      const res = await fetch("/api/user/photos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId, isPrimary: true }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showFeedback("success", "Primary profile picture updated!");
        fetchProfile(true);
      } else {
        showFeedback("error", data.message || "Failed to set profile picture.");
        fetchProfile(true);
      }
    } catch (err) {
      console.error("Set primary photo error:", err);
      showFeedback("error", "Error setting profile picture.");
    } finally {
      setPhotoActionLoading(null);
    }
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

      // Step 2: Save or Replace in student photo gallery table
      const isFirst = photos.length === 0;
      const isPrimaryTarget = isFirst || uploadType === "FORMAL" || Boolean(avatarModalOpen);

      const photoSaveRes = await fetch("/api/user/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: uploadData.url,
          photoType: uploadType,
          isPrimary: isPrimaryTarget,
          replacePhotoId: replacingPhotoId || undefined,
        }),
      });

      const photoSaveData = await photoSaveRes.json();
      if (photoSaveData.success) {
        showFeedback(
          "success",
          replacingPhotoId
            ? "Photo replaced successfully!"
            : isPrimaryTarget
            ? "Profile photo updated successfully!"
            : `New ${uploadType.toLowerCase()} photo saved to your profile!`
        );
        // Instant visual update for avatar
        setUser((prev: any) => ({
          ...prev,
          profilePhotoUrl: `/api/photos/student?userId=${user.id}&t=${Date.now()}`,
        }));
        setAvatarModalOpen(false);
        fetchProfile(true);
      } else {
        showFeedback("error", photoSaveData.message || "Failed to link photo.");
      }
    } catch (err) {
      console.error("Upload error:", err);
      showFeedback("error", "Network error during photo upload.");
    } finally {
      setUploadingPhoto(false);
      setReplacingPhotoId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm("Are you sure you want to remove this photo?")) return;
    try {
      setPhotoActionLoading(photoId);
      const res = await fetch(`/api/user/photos?id=${photoId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showFeedback("success", "Photo deleted.");
        fetchProfile(true);
      } else {
        showFeedback("error", data.message || "Failed to delete photo.");
      }
    } catch (err) {
      console.error(err);
      showFeedback("error", "Failed to delete photo.");
    } finally {
      setPhotoActionLoading(null);
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

  const isAdmin = ["ADMIN", "SUPERADMIN", "CALLING_ADMIN", "EVENT_ADMIN"].includes(user?.role);
  const adminDashboardUrl =
    user?.role === "CALLING_ADMIN"
      ? "/admin/calling"
      : user?.role === "EVENT_ADMIN"
      ? "/admin/events"
      : "/admin/dashboard";

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
        
        {/* Administrator Access Hub Banner */}
        {isAdmin && (
          <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white p-5 rounded-3xl shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-red-500/30 animate-in fade-in">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30 text-white">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black tracking-wide">Topline Administration Workspace</h2>
                  <span className="bg-white text-red-700 px-2.5 py-0.5 rounded-full text-[10px] uppercase font-black tracking-wider">
                    {user.role}
                  </span>
                </div>
                <p className="text-xs text-white/90 mt-0.5">
                  You are signed in as an administrator. Access event operations, candidate rosters, attendance QR codes, and communications.
                </p>
              </div>
            </div>
            <Link
              href={adminDashboardUrl}
              className="bg-white hover:bg-slate-50 text-red-700 font-extrabold px-5 py-2.5 rounded-2xl text-xs uppercase tracking-wider shadow-md transition shrink-0 flex items-center gap-2 active:scale-95"
            >
              <span>Go to Admin Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

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
                <div
                  onClick={() => setAvatarModalOpen(true)}
                  className="w-18 h-18 sm:w-20 sm:h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl sm:rounded-3xl border-2 border-slate-200 flex items-center justify-center overflow-hidden shadow-inner text-red-600 font-black text-2xl sm:text-3xl cursor-pointer transition hover:ring-2 hover:ring-red-500/50"
                  title="Click to view or change profile photo"
                >
                  {user.profilePhotoUrl ? (
                    <img
                      src={user.profilePhotoUrl}
                      alt={user.name}
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = "none";
                      }}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    user.name?.charAt(0)?.toUpperCase() || "S"
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setAvatarModalOpen(true)}
                  disabled={uploadingPhoto}
                  className="absolute -bottom-1 -right-1 w-7 h-7 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-md transition active:scale-95 border-2 border-white cursor-pointer"
                  title="Change Profile Picture"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 truncate">{user.name}</h1>
                  {isAdmin ? (
                    <span className="bg-purple-100 text-purple-900 border border-purple-300 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold flex items-center gap-1 shadow-2xs">
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-600" /> Admin ({user.role})
                    </span>
                  ) : user.selectionStatus === "SELECTED" ? (
                    <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold flex items-center gap-1 shadow-2xs">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Selected
                    </span>
                  ) : user.selectionStatus === "UNDER_REVIEW" ? (
                    <span className="bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-600" /> Under Review
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono mt-1 flex-wrap">
                  <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-700 font-bold">
                    {user.registrationNumber || (isAdmin ? "ADMIN-ACCOUNT" : "No Roll No")}
                  </span>
                  {user.university && <span className="truncate max-w-[200px] text-slate-600">• {user.university}</span>}
                </div>

                {/* Completeness / Role Pill */}
                {isAdmin ? (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="bg-purple-50 text-purple-800 border border-purple-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                      ⭐ Full Operational Console Access
                    </span>
                  </div>
                ) : (
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
                )}
              </div>
            </div>

            {/* Right: Primary Call to Actions */}
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 flex-wrap">
              {isAdmin ? (
                <Link
                  href={adminDashboardUrl}
                  className="flex-1 sm:flex-initial bg-red-600 hover:bg-red-700 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition shadow-md flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-white" />
                  <span>Admin Dashboard</span>
                </Link>
              ) : (
                <Link
                  href="/events"
                  className="flex-1 sm:flex-initial bg-red-600 hover:bg-red-700 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition shadow-md flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Browse Events</span>
                </Link>
              )}

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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mt-5 pt-4 border-t border-slate-100">
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
              <span>My Events ({user.recentApplications?.length || 0})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("referral")}
              className={`col-span-2 sm:col-span-1 p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === "referral"
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md font-black"
                  : "bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 text-purple-900 border border-purple-200"
              }`}
            >
              <Gift className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>Refer & Earn (Up to ₹150)</span>
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
              <span>Your Active Shift Assignments</span>
            </h3>

            <div className="space-y-3">
              {activeConfirmedGigs.map((app: any) => {
                const ev = app.event || {};
                const isConfirmed = app.status === "CONFIRMED";
                const isAttended = app.status === "ATTENDED";
                const isSelected = app.status === "SELECTED";

                return (
                  <div
                    key={app.id}
                    className={`rounded-3xl p-5 sm:p-6 border transition-all duration-300 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-5 ${
                      isConfirmed
                        ? "bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white border-emerald-500/50 shadow-emerald-950/20"
                        : isAttended
                        ? "bg-white border-emerald-300 shadow-emerald-500/5"
                        : "bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent bg-white border-amber-300 shadow-amber-500/5"
                    }`}
                  >
                    {/* Left: Duty Details */}
                    <div className="space-y-2 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs ${
                            isConfirmed
                              ? "bg-emerald-400 text-slate-950 font-black"
                              : isAttended
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : "bg-amber-400 text-slate-950 font-black"
                          }`}
                        >
                          {isConfirmed ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Duty Confirmed &amp; Ready</span>
                            </>
                          ) : isAttended ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Shift Completed (Attended)</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3" />
                              <span>Selected • Confirm Availability</span>
                            </>
                          )}
                        </span>

                        {ev.reportingTime && (
                          <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                            isConfirmed ? "bg-white/10 text-teal-200" : "bg-white text-slate-700 border border-slate-200"
                          }`}>
                            <Clock className="w-3 h-3" />
                            <span>Report by {ev.reportingTime}</span>
                          </span>
                        )}
                      </div>

                      <h4 className={`text-base sm:text-lg font-black truncate ${isConfirmed ? "text-white" : "text-slate-900"}`}>
                        {ev.name || "Topline Catering Event"}
                      </h4>

                      <div className={`flex items-center gap-3 text-xs font-medium flex-wrap ${isConfirmed ? "text-teal-200/90" : "text-slate-600"}`}>
                        {ev.date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-red-500" />
                            <span>{new Date(ev.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
                          </span>
                        )}
                        {ev.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-red-500" />
                            <span>{ev.location}</span>
                          </span>
                        )}
                        {ev.paymentPerStudent && (
                          <span className="flex items-center gap-1 font-bold">
                            <Banknote className="w-3.5 h-3.5 text-emerald-500" />
                            <span>₹{ev.paymentPerStudent}</span>
                          </span>
                        )}
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
                );
              })}
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 1: OVERVIEW DASHBOARD */}
        {/* ---------------------------------------------------- */}
        {activeTab === "overview" && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Events Applied</span>
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

              <button
                type="button"
                onClick={() => setActiveTab("referral")}
                className="bg-gradient-to-br from-purple-50 to-indigo-50/70 p-4 rounded-2xl border border-purple-200 shadow-2xs text-left hover:border-purple-300 transition cursor-pointer group"
              >
                <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider flex items-center justify-between">
                  <span>Referral Rewards</span>
                  <Gift className="w-3.5 h-3.5 text-amber-500 group-hover:scale-110 transition" />
                </span>
                <span className="text-xl font-black text-purple-950 mt-1 block">
                  ₹{referralData?.stats?.totalEarned || 0}
                </span>
                <span className="text-[11px] text-purple-700 mt-0.5 block font-medium">
                  {referralData?.stats?.paidEarnings ? `₹${referralData.stats.paidEarnings} paid to UPI` : `${referralData?.stats?.totalInvited || 0} friends invited`}
                </span>
              </button>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Attire Photos</span>
                <span className="text-xl font-black text-purple-600 mt-1 block">{photos.length}</span>
                <span className="text-[11px] text-purple-700 mt-0.5 block">{photos.length >= 2 ? "✓ Verified photos" : "Upload formal & full"}</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Payout UPI Handle</span>
                <span className="text-xs font-mono font-bold text-slate-900 mt-1.5 block truncate">
                  {formData.upiId || "Not set yet"}
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">{formData.upiId ? "✓ Direct settlement" : "⚠️ Add UPI in Edit"}</span>
              </div>
            </div>

            {/* Profile Completeness or Admin Quick Console */}
            {isAdmin ? (
              <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 text-white rounded-3xl p-5 sm:p-6 shadow-md space-y-4 border border-slate-700">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2 text-white">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Admin Management Center</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Quick access to operational controls, events, and rosters</p>
                  </div>
                  <Link
                    href={adminDashboardUrl}
                    className="bg-red-600 hover:bg-red-700 text-white font-extrabold px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition shadow-sm flex items-center gap-1 active:scale-95"
                  >
                    <span>Open Admin Console</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <Link
                    href="/admin/events"
                    className="p-3.5 bg-white/10 hover:bg-white/15 rounded-2xl border border-white/10 transition text-center space-y-1 block group"
                  >
                    <Calendar className="w-5 h-5 mx-auto text-amber-400 group-hover:scale-110 transition" />
                    <span className="text-xs font-bold block">Manage Events</span>
                  </Link>
                  <Link
                    href="/admin/applications"
                    className="p-3.5 bg-white/10 hover:bg-white/15 rounded-2xl border border-white/10 transition text-center space-y-1 block group"
                  >
                    <Users className="w-5 h-5 mx-auto text-blue-400 group-hover:scale-110 transition" />
                    <span className="text-xs font-bold block">Applications</span>
                  </Link>
                  <Link
                    href="/admin/students"
                    className="p-3.5 bg-white/10 hover:bg-white/15 rounded-2xl border border-white/10 transition text-center space-y-1 block group"
                  >
                    <GraduationCap className="w-5 h-5 mx-auto text-emerald-400 group-hover:scale-110 transition" />
                    <span className="text-xs font-bold block">Student Master</span>
                  </Link>
                  <Link
                    href="/admin/settings"
                    className="p-3.5 bg-white/10 hover:bg-white/15 rounded-2xl border border-white/10 transition text-center space-y-1 block group"
                  >
                    <Sliders className="w-5 h-5 mx-auto text-purple-400 group-hover:scale-110 transition" />
                    <span className="text-xs font-bold block">Settings & Fields</span>
                  </Link>
                </div>
              </div>
            ) : (
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
            )}

            {/* Refer & Earn Overview Spotlight Card */}
            <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-5 sm:p-6 border border-purple-500/30 shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-purple-500/20 via-indigo-500/10 to-transparent rounded-bl-full pointer-events-none"></div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                <div className="space-y-1.5 max-w-xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                      Earn Cash
                    </span>
                    <span className="text-xs font-bold text-purple-200">Topline Student Referral Program</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-white">
                    Refer Friends & Earn Up to ₹150 Direct to UPI
                  </h3>
                  <p className="text-xs text-purple-200/90 leading-relaxed">
                    Invite your college classmates and friends. Earn up to ₹150 deposited directly into your UPI account for every friend who joins Topline and completes their first event.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  {referralData?.user?.hasCode ? (
                    <>
                      <button
                        type="button"
                        onClick={handleShareWhatsApp}
                        className="bg-[#25D366] hover:bg-[#20bd5a] text-white font-extrabold px-3.5 py-2.5 rounded-xl text-xs transition shadow flex items-center gap-1.5 active:scale-95 cursor-pointer"
                      >
                        <MessageCircle className="w-4 h-4 fill-white" />
                        <span>WhatsApp</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab("referral")}
                        className="bg-white hover:bg-slate-100 text-purple-900 font-extrabold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition shadow flex items-center gap-1.5 active:scale-95 cursor-pointer"
                      >
                        <span>View Earnings ({referralData.stats?.totalReferred || 0})</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveTab("referral")}
                      className="bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition shadow-md flex items-center gap-1.5 active:scale-95 cursor-pointer"
                    >
                      <Gift className="w-4 h-4" />
                      <span>Activate & Get Code</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
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
                  <span>View All Events</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {(!user.recentApplications || user.recentApplications.length === 0) ? (
                <div className="text-center py-8 space-y-3">
                  <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-slate-500 text-xs font-semibold">You have not applied for any events yet.</p>
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
        {/* TAB 2: MY EVENTS & HISTORY */}
        {/* ---------------------------------------------------- */}
        {activeTab === "gigs" && (
          <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-5 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-black text-slate-900 text-base uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-red-600" />
                  My Events & Applications History
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
                  Browse Available Events
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
                          <div className="flex items-center gap-2.5 text-slate-500 text-[11px] mt-0.5 flex-wrap">
                            {ev.date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-red-500" />
                                <span>{new Date(ev.date).toLocaleDateString("en-GB")}</span>
                              </span>
                            )}
                            {ev.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-red-500" />
                                <span>{ev.location}</span>
                              </span>
                            )}
                            {ev.reportingTime && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-red-500" />
                                <span>{ev.reportingTime}</span>
                              </span>
                            )}
                            {ev.paymentPerStudent && (
                              <span className="font-bold text-slate-800 flex items-center gap-1">
                                <Banknote className="w-3 h-3 text-emerald-600" />
                                <span>₹{ev.paymentPerStudent}</span>
                              </span>
                            )}
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
        {/* TAB: REFER & EARN (₹25 PER FRIEND) */}
        {/* ---------------------------------------------------- */}
        {activeTab === "referral" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Referral Hero Header */}
            <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-purple-500/30 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-purple-500/20 via-indigo-500/10 to-transparent rounded-bl-full pointer-events-none"></div>

              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                <div className="space-y-2 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-400 text-slate-950 font-black px-3 py-1 rounded-full text-xs uppercase tracking-wider shadow-sm flex items-center gap-1">
                      <Gift className="w-3.5 h-3.5" />
                      Up to ₹150 Cash Reward
                    </span>
                    <span className="text-xs font-bold text-purple-200">Official Student Affiliate</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    Refer College Friends & Earn Up to ₹150 Direct to UPI
                  </h2>
                  <p className="text-xs sm:text-sm text-purple-200/90 leading-relaxed">
                    Invite your friends to work flexible catering events with Topline. Earn up to ₹150 for every friend who registers with your code and completes their first event work.
                  </p>
                </div>

                {/* Quick Earnings Box on Hero */}
                {referralData?.user?.hasCode && (
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 sm:p-5 text-center min-w-[200px] shrink-0 space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-purple-200">Total Referral Earnings</span>
                    <div className="text-3xl font-black text-amber-300">
                      ₹{referralData?.stats?.totalEarned || 0}
                    </div>
                    <div className="flex items-center justify-center gap-2 text-[11px] text-white/80 font-medium">
                      <span>{referralData?.stats?.totalReferred || 0} Friends Invited</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {loadingReferral ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto" />
                <p className="text-xs font-bold text-slate-500">Loading referral dashboard...</p>
              </div>
            ) : !referralData?.user?.hasCode ? (
              /* ACTIVATION FORM (IF USER HAS NO REFERRAL CODE YET) */
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
                <div className="max-w-xl mx-auto text-center space-y-2">
                  <div className="w-14 h-14 bg-purple-100 text-purple-700 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                    <Gift className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900">Activate Your Personal Referral Link</h3>
                  <p className="text-xs text-slate-500">
                    Enter your UPI ID so our admin team can transfer your referral cash rewards directly to your bank account.
                  </p>
                </div>

                {!completeness.isComplete ? (
                  /* LOCKED STATE: Profile Not 100% Complete */
                  <div className="max-w-md mx-auto bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-rose-500/10 border-2 border-dashed border-amber-300 rounded-3xl p-6 text-center space-y-4">
                    <div className="w-12 h-12 bg-amber-100 text-amber-800 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                      <Lock className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-900 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                        100% Profile Completion Required
                      </div>
                      <h4 className="text-base font-black text-slate-900 pt-1">
                        Complete Profile to Unlock Referral Code
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                        Referral codes and cash rewards are reserved for students with verified, 100% completed profiles.
                      </p>
                    </div>

                    {/* Progress Bar & Missing Items */}
                    <div className="space-y-2 text-left bg-white p-4 rounded-2xl border border-amber-200 shadow-2xs">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-600">Your Profile Progress</span>
                        <span className="text-amber-700 font-mono">{completeness.percentage}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                          style={{ width: `${completeness.percentage}%` }}
                        />
                      </div>
                      {allMissing.length > 0 && (
                        <div className="text-[11px] text-slate-500 pt-1">
                          <span className="font-semibold text-slate-700">Missing to unlock: </span>
                          <span>{allMissing.slice(0, 3).join(", ")}{allMissing.length > 3 ? ` +${allMissing.length - 3} more` : ""}</span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab("edit")}
                      className="w-full bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold py-3.5 px-6 rounded-2xl text-xs uppercase tracking-wider shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>Complete Profile to Unlock Code</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  /* ACTIVE FORM: Profile is 100% Complete */
                  <form onSubmit={handleSaveReferral} className="max-w-md mx-auto space-y-4 pt-2">
                    <div>
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                        Your Payout UPI ID *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={referralUpiInput}
                          onChange={(e) => setReferralUpiInput(e.target.value)}
                          placeholder="e.g. 9876543210@paytm or yourname@oksbi"
                          className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-4 py-3 text-sm text-slate-900 font-mono focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20"
                        />
                        <Wallet className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                      </div>
                      <span className="text-[11px] text-slate-500 mt-1 block">
                        Rewards will be deposited to this UPI handle upon qualification.
                      </span>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                        Custom Referral Code (Optional)
                      </label>
                      <input
                        type="text"
                        value={customCodeInput}
                        onChange={(e) => setCustomCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                        placeholder="e.g. TOPLINE25, RAHUL99"
                        maxLength={12}
                        className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-4 py-3 text-sm text-slate-900 font-mono uppercase focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20"
                      />
                      <span className="text-[11px] text-slate-500 mt-1 block">
                        Leave blank to auto-generate a unique code.
                      </span>
                    </div>

                    <button
                      type="submit"
                      disabled={savingReferral}
                      className="w-full bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 active:scale-98 text-white font-extrabold py-3.5 px-6 rounded-2xl text-xs uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {savingReferral ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Generating Code...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-amber-300" />
                          <span>Activate & Get My Invite Link</span>
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* Collapsible Terms & Conditions (Only shown when pressed) */}
                <div className="max-w-md mx-auto pt-2">
                  <button
                    type="button"
                    onClick={() => setTermsOpen(!termsOpen)}
                    className="w-full py-2.5 px-3.5 flex items-center justify-between text-left text-xs font-semibold text-slate-600 hover:text-purple-700 bg-slate-50 hover:bg-purple-50/50 rounded-xl transition border border-slate-200 cursor-pointer select-none"
                  >
                    <span className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      <span>Referral Program Terms & Conditions (T&C)</span>
                    </span>
                    {termsOpen ? (
                      <ChevronUp className="w-4 h-4 text-purple-600 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                  </button>

                  {termsOpen && (
                    <div className="mt-3 p-4 bg-purple-50/40 rounded-2xl border border-purple-200/80 text-xs text-slate-600 space-y-3 animate-in fade-in duration-200">
                      <div className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span>Terms & Program Rules</span>
                      </div>
                      <ul className="space-y-2 text-[11px] sm:text-xs leading-relaxed text-slate-600">
                        <li className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0"></span>
                          <div>
                            <strong className="text-slate-800">Profile Eligibility:</strong> Only students who have completed 100% of their profile details and formal photo are eligible to activate referral codes.
                          </div>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0"></span>
                          <div>
                            <strong className="text-slate-800">Reward Qualification:</strong> The referral cash bonus (up to ₹150, minimum ₹20, as configured by Topline management) is unlocked once your referred friend completes registration with your code, applies for an event, and completes their first event work with verified attendance.
                          </div>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0"></span>
                          <div>
                            <strong className="text-slate-800">Direct UPI Payouts:</strong> Qualified rewards are processed directly by Topline administrators to your registered UPI handle.
                          </div>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0"></span>
                          <div>
                            <strong className="text-slate-800">No Referral Limit:</strong> You can invite unlimited college friends and classmates.
                          </div>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0"></span>
                          <div>
                            <strong className="text-slate-800">Fair Play Policy:</strong> Self-referrals, duplicate accounts, or fraudulent registrations are strictly prohibited and will result in forfeiture of rewards.
                          </div>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0"></span>
                          <div>
                            <strong className="text-slate-800">Management Discretion:</strong> Topline reserves the right to review attendance logs and update program terms as needed.
                          </div>
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* ACTIVE REFERRAL DASHBOARD (CODE + STATS + SHARE KIT) */
              <>
                {/* 1. VIRAL SHARE TOOLKIT */}
                <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="font-black text-slate-900 text-base uppercase tracking-wider flex items-center gap-2">
                        <Share2 className="w-5 h-5 text-purple-600" />
                        Your Personal Referral Hub
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Share your unique code or direct link with friends across social channels.
                      </p>
                    </div>

                    {/* Registered Payout UPI Status */}
                    <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 px-3.5 py-2 rounded-2xl shrink-0">
                      <Wallet className="w-4 h-4 text-purple-600 shrink-0" />
                      <div className="text-xs">
                        <span className="text-slate-500 font-medium block text-[10px] uppercase">Payout Target UPI</span>
                        <span className="font-mono font-bold text-purple-950 truncate max-w-[180px] block">
                          {referralData.user.upiId}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingUpi(!editingUpi)}
                        className="text-[11px] font-bold text-purple-700 hover:text-purple-900 underline ml-1 cursor-pointer"
                      >
                        {editingUpi ? "Cancel" : "Edit"}
                      </button>
                    </div>
                  </div>

                  {/* Inline UPI Edit Form */}
                  {editingUpi && (
                    <form onSubmit={handleSaveReferral} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col sm:flex-row items-center gap-3 animate-in fade-in">
                      <div className="flex-1 w-full">
                        <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                          Update Registered UPI ID
                        </label>
                        <input
                          type="text"
                          required
                          value={referralUpiInput}
                          onChange={(e) => setReferralUpiInput(e.target.value)}
                          placeholder="e.g. 9876543210@paytm"
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-purple-600"
                        />
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto pt-2 sm:pt-4">
                        <button
                          type="submit"
                          disabled={savingReferral}
                          className="flex-1 sm:flex-initial bg-purple-600 hover:bg-purple-700 text-white font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition cursor-pointer disabled:opacity-50"
                        >
                          {savingReferral ? "Saving..." : "Save UPI"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingUpi(false)}
                          className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Code & Link Share Widgets */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Unique Referral Code Box */}
                    <div className="p-4 sm:p-5 bg-gradient-to-br from-purple-50 to-indigo-50/50 rounded-2xl border border-purple-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                          Your Referral Code
                        </span>
                        <span className="text-[10px] font-bold text-purple-700 bg-white px-2 py-0.5 rounded-md border border-purple-200">
                          Friends enter on signup
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-white border-2 border-purple-400 rounded-xl px-4 py-3 font-mono font-black text-xl text-purple-950 tracking-widest text-center shadow-inner select-all">
                          {referralData.user.referralCode}
                        </div>
                        <button
                          type="button"
                          onClick={handleCopyRefCode}
                          className={`px-4 py-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5 shrink-0 shadow-sm cursor-pointer ${
                            copiedRefCode
                              ? "bg-emerald-600 text-white"
                              : "bg-purple-600 hover:bg-purple-700 text-white active:scale-95"
                          }`}
                        >
                          {copiedRefCode ? (
                            <>
                              <Check className="w-4 h-4 stroke-3" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Direct Auto-fill Invite Link */}
                    <div className="p-4 sm:p-5 bg-gradient-to-br from-indigo-50 to-slate-50 rounded-2xl border border-indigo-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                          Direct Signup Link
                        </span>
                        <span className="text-[10px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-indigo-200">
                          Auto-fills code
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={referralData.user.inviteUrl}
                          className="flex-1 bg-white border border-indigo-300 rounded-xl px-3.5 py-3 text-xs font-mono text-slate-700 truncate shadow-inner select-all"
                        />
                        <button
                          type="button"
                          onClick={handleCopyRefLink}
                          className={`px-4 py-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5 shrink-0 shadow-sm cursor-pointer ${
                            copiedRefLink
                              ? "bg-emerald-600 text-white"
                              : "bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95"
                          }`}
                        >
                          {copiedRefLink ? (
                            <>
                              <Check className="w-4 h-4 stroke-3" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              <span>Copy Link</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 1-Click Viral Social Share Strip */}
                  <div className="pt-2">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2.5">
                      Share Instantly with One Click:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <button
                        type="button"
                        onClick={handleShareWhatsApp}
                        className="bg-[#25D366] hover:bg-[#20bd5a] active:scale-95 text-white font-extrabold py-3 px-4 rounded-2xl text-xs transition shadow flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <MessageCircle className="w-4 h-4 fill-white" />
                        <span>Share on WhatsApp</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleShareTelegram}
                        className="bg-[#229ED9] hover:bg-[#1e8cc0] active:scale-95 text-white font-extrabold py-3 px-4 rounded-2xl text-xs transition shadow flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Share on Telegram</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleNativeShare}
                        className="bg-slate-900 hover:bg-black active:scale-95 text-white font-extrabold py-3 px-4 rounded-2xl text-xs transition shadow flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Share2 className="w-4 h-4 text-amber-400" />
                        <span>Share via Other Apps</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. LIVE REFERRAL METRICS & EARNINGS */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-gradient-to-br from-purple-50 to-indigo-50/50 p-4 sm:p-5 rounded-2xl border border-purple-200 shadow-2xs space-y-1">
                    <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block">Total Rewards Generated</span>
                    <span className="text-2xl font-black text-purple-900 block">
                      ₹{referralData.stats?.totalEarned || 0}
                    </span>
                    <span className="text-[11px] text-purple-700 block font-medium">
                      Lifetime referral earnings
                    </span>
                  </div>

                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 p-4 sm:p-5 rounded-2xl border border-emerald-200 shadow-2xs space-y-1">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Paid Out to UPI</span>
                    <span className="text-2xl font-black text-emerald-700 block">
                      ₹{referralData.stats?.paidEarnings || referralData.stats?.paidPayout || 0}
                    </span>
                    <span className="text-[11px] text-emerald-800 block font-medium">
                      {referralData.stats?.paidCount || 0} transfer(s) settled
                    </span>
                  </div>

                  <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 p-4 sm:p-5 rounded-2xl border border-amber-200 shadow-2xs space-y-1">
                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Pending Payout</span>
                    <span className="text-2xl font-black text-amber-700 block">
                      ₹{referralData.stats?.pendingPayout || 0}
                    </span>
                    <span className="text-[11px] text-amber-800 block font-medium">
                      {referralData.stats?.qualifiedCount || 0} shift(s) queued for transfer
                    </span>
                  </div>

                  <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Friends Invited</span>
                    <span className="text-2xl font-black text-slate-900 block">
                      {referralData.stats?.totalInvited || referralData.stats?.totalReferred || 0}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      {referralData.stats?.pendingCount || 0} awaiting 1st shift
                    </span>
                  </div>
                </div>

                {/* 3. HOW IT WORKS (3 STEPS) */}
                <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    How It Works
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 font-black text-sm flex items-center justify-center">
                        1
                      </div>
                      <h4 className="font-extrabold text-slate-900 text-sm">Share Your Link</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Send your personal referral code or invite URL to your college friends, batchmates, and groups.
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 font-black text-sm flex items-center justify-center">
                        2
                      </div>
                      <h4 className="font-extrabold text-slate-900 text-sm">Friend Works 1st Event</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Your friend creates an account, gets selected for an event, and attends duty with attendance verified.
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 font-black text-sm flex items-center justify-center">
                        3
                      </div>
                      <h4 className="font-extrabold text-slate-900 text-sm">Receive Cash to UPI</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Cash reward is credited to your dashboard and settled by the admin team directly to your registered UPI ID with instant email notification.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 4. REFERRED FRIENDS HISTORY & STEP-BY-STEP PROGRESS TRACKER */}
                <div className="space-y-4">
                  <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="bg-purple-100 text-purple-800 font-black px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider">
                          Live Milestones
                        </span>
                        <h3 className="font-black text-slate-900 text-base uppercase tracking-wider flex items-center gap-2">
                          <Users className="w-5 h-5 text-purple-600" />
                          Invited Friends Tracker ({referralData.stats?.referrals?.length || 0})
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Track every friend step-by-step: Referral Claimed → Event Applied → Shift Attended (Present) → Paid to UPI.
                      </p>
                    </div>

                    {/* View Switcher: Card Tracker vs Compact Table */}
                    {referralData.stats?.referrals && referralData.stats.referrals.length > 0 && (
                      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 shrink-0 self-start sm:self-center">
                        <button
                          type="button"
                          onClick={() => setReferralViewMode("trackers")}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                            referralViewMode === "trackers"
                              ? "bg-white text-purple-900 shadow-2xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                          <span>Progress Map</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setReferralViewMode("table")}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                            referralViewMode === "table"
                              ? "bg-white text-purple-900 shadow-2xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          <FileText className="w-3.5 h-3.5 text-purple-600" />
                          <span>Ledger Table</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {(!referralData.stats?.referrals || referralData.stats.referrals.length === 0) ? (
                    <div className="text-center py-12 space-y-3 bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                      <Users className="w-12 h-12 text-slate-300 mx-auto" />
                      <p className="text-slate-800 font-extrabold text-sm">No referrals yet</p>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        Share your referral link on WhatsApp or Instagram to invite friends and track their milestone progress here!
                      </p>
                      <button
                        type="button"
                        onClick={handleShareWhatsApp}
                        className="bg-[#25D366] hover:bg-[#20bd5a] text-white font-extrabold px-5 py-2.5 rounded-xl text-xs transition shadow-sm inline-flex items-center gap-2 cursor-pointer active:scale-95"
                      >
                        <MessageCircle className="w-4 h-4 fill-white" />
                        <span>Share on WhatsApp</span>
                      </button>
                    </div>
                  ) : referralViewMode === "trackers" ? (
                    /* VISUAL PROGRESS MAP (GPAY / FLIPKART STYLE STEPPER CARDS) */
                    <div className="space-y-4">
                      {referralData.stats.referrals.map((item: any) => {
                        const friendName = item.refereeName || item.referee?.name || "Friend";
                        const friendPhone = item.refereePhone || item.referee?.phone || "";
                        const joinedDate = item.registeredAt || item.createdAt;
                        const isPaid = item.status === "PAID";
                        const isQualified = item.status === "QUALIFIED";
                        const steps = item.steps || [];

                        return (
                          <div
                            key={item.id}
                            className="bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition p-5 sm:p-6 space-y-5"
                          >
                            {/* Card Header: Referee & Status */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                              <div className="flex items-center gap-3.5">
                                <div
                                  className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 shadow-inner ${
                                    isPaid
                                      ? "bg-emerald-100 text-emerald-700"
                                      : isQualified
                                      ? "bg-purple-100 text-purple-700"
                                      : "bg-slate-100 text-slate-700"
                                  }`}
                                >
                                  {friendName.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-black text-slate-900 text-sm sm:text-base">
                                      {friendName}
                                    </span>
                                    {friendPhone && (
                                      <span className="text-[10px] font-mono text-slate-400 font-normal">
                                        ({friendPhone})
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5 flex-wrap">
                                    <span>
                                      Joined {joinedDate ? new Date(joinedDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Recently"}
                                    </span>
                                    <span>•</span>
                                    <span className="font-semibold text-purple-700">Code: {referralData.user.referralCode}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 self-start sm:self-center">
                                <div className="text-right">
                                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Reward</span>
                                  <span
                                    className={`text-lg font-black ${
                                      isPaid ? "text-emerald-600" : isQualified ? "text-purple-600" : "text-slate-700"
                                    }`}
                                  >
                                    ₹{item.rewardAmount || 25}
                                  </span>
                                </div>
                                <span
                                  className={`text-[10px] font-extrabold uppercase px-3 py-1.5 rounded-full border shadow-2xs ${
                                    isPaid
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : isQualified
                                      ? "bg-purple-50 text-purple-700 border-purple-200"
                                      : "bg-amber-50 text-amber-700 border-amber-200"
                                  }`}
                                >
                                  {isPaid ? "Paid to UPI" : isQualified ? "Reward Earned" : "Pending 1st Shift"}
                                </span>
                              </div>
                            </div>

                            {/* Visual Connected Stepper (Flipkart / GPay Milestone Tracker) */}
                            <div className="pt-2 pb-1">
                              {/* Desktop / Tablet Stepper (Horizontal) */}
                              <div className="hidden sm:block">
                                <div className="relative flex items-start justify-between">
                                  {/* Base Connecting Track */}
                                  <div className="absolute left-[12.5%] right-[12.5%] top-4 h-1.5 bg-slate-100 -translate-y-1/2 z-0 rounded-full" />
                                  {/* Active Filled Progress Bar */}
                                  <div
                                    className="absolute left-[12.5%] top-4 h-1.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-500 -translate-y-1/2 z-0 rounded-full transition-all duration-700"
                                    style={{
                                      width:
                                        item.progressPercent === 100
                                          ? "75%"
                                          : item.progressPercent === 75
                                          ? "50%"
                                          : item.progressPercent === 50
                                          ? "25%"
                                          : "0%",
                                    }}
                                  />

                                  {steps.map((step: any) => {
                                    const isDone = step.status === "completed";
                                    const isCurr = step.status === "current";
                                    const isAction = step.status === "action_needed";

                                    return (
                                      <div key={step.id} className="flex flex-col items-center text-center relative z-10 w-1/4 px-1.5">
                                        <div
                                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 shadow-sm ${
                                            isDone
                                              ? "bg-emerald-500 text-white ring-4 ring-emerald-50"
                                              : isCurr
                                              ? "bg-purple-600 text-white ring-4 ring-purple-100 animate-pulse"
                                              : isAction
                                              ? "bg-amber-500 text-white ring-4 ring-amber-100"
                                              : "bg-white text-slate-400 border-2 border-slate-200"
                                          }`}
                                        >
                                          {isDone ? (
                                            <Check className="w-4 h-4 stroke-3" />
                                          ) : (
                                            <span>{step.stepNumber}</span>
                                          )}
                                        </div>

                                        <div className="mt-2.5 space-y-1 max-w-[150px]">
                                          <span
                                            className={`text-xs font-black block leading-tight ${
                                              isDone
                                                ? "text-slate-900"
                                                : isCurr
                                                ? "text-purple-700 font-extrabold"
                                                : "text-slate-400"
                                            }`}
                                          >
                                            {step.title}
                                          </span>
                                          <span className="text-[10.5px] text-slate-500 line-clamp-2 leading-snug block">
                                            {step.subtitle}
                                          </span>
                                          {step.timestamp && (
                                            <span className="text-[9.5px] text-slate-400 font-mono block pt-0.5">
                                              {new Date(step.timestamp).toLocaleDateString("en-GB", {
                                                day: "numeric",
                                                month: "short",
                                              })}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Mobile Stepper (Vertical Connected Track) */}
                              <div className="sm:hidden space-y-4 relative pl-6 border-l-2 border-slate-200 ml-3">
                                {steps.map((step: any) => {
                                  const isDone = step.status === "completed";
                                  const isCurr = step.status === "current";
                                  const isAction = step.status === "action_needed";

                                  return (
                                    <div key={step.id} className="relative">
                                      {/* Connected Stepper Dot */}
                                      <div
                                        className={`absolute -left-[31px] top-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-xs ${
                                          isDone
                                            ? "bg-emerald-500 text-white"
                                            : isCurr
                                            ? "bg-purple-600 text-white ring-2 ring-purple-200 animate-pulse"
                                            : isAction
                                            ? "bg-amber-500 text-white"
                                            : "bg-white text-slate-400 border border-slate-300"
                                        }`}
                                      >
                                        {isDone ? <Check className="w-3 h-3 stroke-3" /> : step.stepNumber}
                                      </div>

                                      <div className="space-y-0.5">
                                        <div className="flex items-center justify-between">
                                          <span
                                            className={`text-xs font-black ${
                                              isDone
                                                ? "text-slate-900"
                                                : isCurr
                                                ? "text-purple-700 font-extrabold"
                                                : "text-slate-400"
                                            }`}
                                          >
                                            {step.title}
                                          </span>
                                          {step.timestamp && (
                                            <span className="text-[9.5px] text-slate-400 font-mono">
                                              {new Date(step.timestamp).toLocaleDateString("en-GB", {
                                                day: "numeric",
                                                month: "short",
                                              })}
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-[11px] text-slate-500 leading-snug">
                                          {step.subtitle}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Contextual Action / Status Banner */}
                            {!item.isApplied && (
                              <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3.5 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                <div className="text-amber-900 text-[11px]">
                                  <span className="font-bold">Next Step: </span>
                                  <span>
                                    {friendName} registered with your code but hasn't applied for a shift yet. Remind them to apply to unlock your ₹{item.rewardAmount || 25} reward!
                                  </span>
                                </div>
                                <a
                                  href={`https://wa.me/?text=${encodeURIComponent(
                                    `Hey ${friendName}! Check out the open catering shifts on Topline and apply for an event so we both earn rewards: ${referralData.user.inviteUrl}`
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-[#25D366] hover:bg-[#20bd5a] active:scale-95 text-white font-extrabold px-3.5 py-2 rounded-xl text-[11px] flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer transition"
                                >
                                  <MessageCircle className="w-3.5 h-3.5 fill-white" />
                                  <span>Remind on WhatsApp</span>
                                </a>
                              </div>
                            )}

                            {item.isApplied && !item.isAttended && (
                              <div className="bg-blue-50 border border-blue-200/80 rounded-2xl p-3 text-xs text-blue-900 flex items-center justify-between gap-2">
                                <div className="text-[11px]">
                                  <span className="font-bold">Shift Scheduled: </span>
                                  <span>
                                    {friendName} applied for <strong>{item.referee?.firstApplication?.eventName || "Event Shift"}</strong>. Once their duty attendance is recorded as Present, your ₹{item.rewardAmount || 25} reward will be credited!
                                  </span>
                                </div>
                              </div>
                            )}

                            {isQualified && (
                              <div className="bg-purple-50 border border-purple-200/80 rounded-2xl p-3 text-xs text-purple-900 flex items-center justify-between gap-2">
                                <div className="text-[11px]">
                                  <span className="font-bold">🎉 Reward Earned! </span>
                                  <span>
                                    {friendName} completed their first event duty. Topline administration will transfer ₹{item.rewardAmount || 25} directly to your registered UPI ID ({referralData.user.upiId}).
                                  </span>
                                </div>
                              </div>
                            )}

                            {isPaid && (
                              <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3 text-xs text-emerald-900 flex flex-wrap items-center justify-between gap-2">
                                <div className="text-[11px] flex items-center gap-1.5">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                  <span>
                                    <strong>₹{item.rewardAmount || 25} Paid Out: </strong> Transferred to your UPI ID ({referralData.user.upiId})
                                  </span>
                                </div>
                                {item.paidReference && (
                                  <span className="bg-white border border-emerald-200 px-2.5 py-0.5 rounded-lg font-mono text-[10px] text-emerald-800 font-bold">
                                    Ref: {item.paidReference}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* COMPACT LEDGER TABLE VIEW */
                    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50">
                            <th className="p-3 rounded-l-xl">Friend</th>
                            <th className="p-3">Joined On</th>
                            <th className="p-3">Current Step</th>
                            <th className="p-3">Event / Shift</th>
                            <th className="p-3 rounded-r-xl text-right">Reward</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {referralData.stats.referrals.map((item: any) => {
                            const friendName = item.refereeName || item.referee?.name || "Friend";
                            const friendPhone = item.refereePhone || item.referee?.phone || "";
                            const joinedDate = item.registeredAt || item.createdAt;
                            const evName = item.qualifyingEventName || item.event?.name || null;
                            const isPaid = item.status === "PAID";
                            const isQualified = item.status === "QUALIFIED";

                            return (
                              <tr key={item.id} className="hover:bg-slate-50 transition">
                                <td className="p-3 font-extrabold text-slate-900">
                                  <div>{friendName}</div>
                                  {friendPhone && (
                                    <div className="text-[10px] font-mono text-slate-400 font-normal">
                                      {friendPhone}
                                    </div>
                                  )}
                                </td>
                                <td className="p-3 text-slate-500">
                                  {joinedDate
                                    ? new Date(joinedDate).toLocaleDateString("en-GB", {
                                        day: "numeric",
                                        month: "short",
                                        year: "numeric",
                                      })
                                    : "Recent"}
                                </td>
                                <td className="p-3">
                                  {isPaid ? (
                                    <div className="space-y-0.5">
                                      <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold px-2.5 py-0.5 rounded-full text-[10px] inline-flex items-center gap-1 shadow-2xs">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                        <span>4. Paid to UPI</span>
                                      </span>
                                      {item.paidReference && (
                                        <div className="text-[9.5px] text-slate-400 font-mono truncate max-w-[140px]" title={item.paidReference}>
                                          Ref: {item.paidReference}
                                        </div>
                                      )}
                                    </div>
                                  ) : isQualified ? (
                                    <span className="bg-purple-100 text-purple-800 border border-purple-300 font-extrabold px-2.5 py-1 rounded-full text-[10px] inline-flex items-center gap-1 shadow-2xs">
                                      <Sparkles className="w-3 h-3 text-purple-600" />
                                      <span>3. Marked Present (In Payout Queue)</span>
                                    </span>
                                  ) : item.isApplied ? (
                                    <span className="bg-blue-100 text-blue-800 border border-blue-200 font-bold px-2.5 py-1 rounded-full text-[10px] inline-flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-blue-500" />
                                      <span>2. Applied (Awaiting Shift)</span>
                                    </span>
                                  ) : (
                                    <span className="bg-slate-100 text-slate-700 border border-slate-200 font-bold px-2.5 py-1 rounded-full text-[10px] inline-flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-slate-400" />
                                      <span>1. Claimed (Not Applied)</span>
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 text-slate-600">
                                  {evName ? (
                                    <span className="font-bold text-slate-800">{evName}</span>
                                  ) : item.referee?.firstApplication?.eventName ? (
                                    <span className="text-slate-700">{item.referee.firstApplication.eventName}</span>
                                  ) : (
                                    <span className="text-slate-400 italic">Not applied yet</span>
                                  )}
                                </td>
                                <td className="p-3 font-black text-right text-slate-900">
                                  <span className={isPaid ? "text-emerald-600 text-sm font-black" : isQualified ? "text-purple-600 text-sm font-black" : "text-slate-400"}>
                                    ₹{item.rewardAmount || 25}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* 5. COLLAPSIBLE TERMS & CONDITIONS / FAQ */}
                <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="font-black text-slate-900 text-base uppercase tracking-wider flex items-center gap-2">
                      <Info className="w-5 h-5 text-slate-500" />
                      Terms & Conditions & Program FAQ
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Everything you need to know about the referral rewards and payout schedule.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    {[
                      {
                        q: "When is my referral cash reward credited?",
                        a: "The referral reward (up to ₹150) is unlocked and credited to your pending balance as soon as your invited friend signs up and completes their first confirmed event assignment with verified duty attendance.",
                      },
                      {
                        q: "How are referral payouts transferred?",
                        a: "Topline administrators process referral payouts directly to your registered UPI ID. Once transferred, the transaction reference is recorded and the status is marked as 'Paid to UPI'.",
                      },
                      {
                        q: "Is there any limit to how much I can earn?",
                        a: "There is no cap or limit! You can invite as many college friends as you like and earn up to ₹150 for every friend who joins and attends their first event shift.",
                      },
                      {
                        q: "What are the rules regarding fair referrals?",
                        a: "Self-referrals (referring your own duplicate email or phone number) or fake accounts are strictly prohibited. Rewards are only issued for authentic students who attend confirmed catering events.",
                      },
                    ].map((faq, i) => (
                      <div key={i} className="border border-slate-200 rounded-2xl overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleFaq(i)}
                          className="w-full p-4 text-left font-bold text-slate-900 text-xs sm:text-sm flex items-center justify-between gap-3 bg-slate-50/70 hover:bg-slate-100 transition cursor-pointer"
                        >
                          <span>{faq.q}</span>
                          {faqOpen[i] ? (
                            <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                          )}
                        </button>
                        {faqOpen[i] && (
                          <div className="p-4 text-xs text-slate-600 bg-white border-t border-slate-100 leading-relaxed animate-in fade-in duration-150">
                            {faq.a}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
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
                    className={`relative aspect-3/4 rounded-2xl overflow-hidden border group bg-slate-100 shadow-sm transition ${
                      photo.isPrimary ? "border-emerald-500 ring-2 ring-emerald-500/30" : "border-slate-200"
                    }`}
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

                    {photo.isPrimary ? (
                      <div className="absolute top-2 right-2 bg-emerald-600 text-white px-2 py-0.5 rounded-md text-[10px] font-extrabold flex items-center gap-1 shadow" title="Primary Profile Photo">
                        <Star className="w-3 h-3 fill-white" />
                        <span>Profile Pic</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetPrimaryPhoto(photo.id)}
                        disabled={photoActionLoading === photo.id}
                        className="absolute top-2 right-2 bg-black/60 hover:bg-emerald-600 text-white p-1 rounded-md text-[10px] font-bold flex items-center gap-1 shadow transition opacity-90 group-hover:opacity-100 cursor-pointer"
                        title="Set as Main Profile Picture"
                      >
                        <Star className="w-3 h-3" />
                      </button>
                    )}

                    {/* Hover Controls Overlay */}
                    <div className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-2 p-2">
                      {!photo.isPrimary && (
                        <button
                          type="button"
                          onClick={() => handleSetPrimaryPhoto(photo.id)}
                          disabled={photoActionLoading === photo.id}
                          className="w-full py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 shadow transition active:scale-95 cursor-pointer disabled:opacity-50"
                        >
                          <Star className="w-3 h-3 fill-white" />
                          <span>Set as Profile</span>
                        </button>
                      )}

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleReplacePhoto(photo.id, photo.photoType)}
                          disabled={uploadingPhoto}
                          className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow transition active:scale-95 cursor-pointer"
                          title="Replace this photo"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeletePhoto(photo.id)}
                          disabled={photoActionLoading === photo.id}
                          className="p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow transition active:scale-95 cursor-pointer disabled:opacity-50"
                          title="Delete Photo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* DEDICATED PROFILE PHOTO & AVATAR MANAGER MODAL */}
        {/* ---------------------------------------------------- */}
        {avatarModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white">Profile Picture & Avatar</h3>
                    <p className="text-xs text-slate-400">Update or choose your main profile photo</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAvatarModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 sm:p-6 space-y-5">
                {/* Large Preview */}
                <div className="flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-slate-100 border-4 border-slate-200 overflow-hidden shadow-inner flex items-center justify-center text-red-600 font-black text-4xl relative group">
                    {user.profilePhotoUrl ? (
                      <img src={user.profilePhotoUrl} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      user.name?.charAt(0)?.toUpperCase() || "S"
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    This photo is visible to event coordinators, banquet managers, and on your candidate profile card.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    disabled={uploadingPhoto}
                    onClick={() => triggerPhotoUpload("FORMAL")}
                    className="bg-red-600 hover:bg-red-700 active:scale-95 text-white font-extrabold px-4 py-3 rounded-2xl text-xs uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {uploadingPhoto ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4" />
                        <span>Upload New Photo</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAvatarModalOpen(false);
                      setActiveTab("photos");
                    }}
                    className="bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 font-bold px-4 py-3 rounded-2xl text-xs transition border border-slate-200 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Camera className="w-4 h-4 text-purple-600" />
                    <span>Manage All Photos ({photos.length})</span>
                  </button>
                </div>

                {/* Select from Existing Photos */}
                {photos.length > 0 && (
                  <div className="space-y-2.5 pt-3 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      Or Select from Uploaded Photos:
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                      {photos.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => handleSetPrimaryPhoto(p.id)}
                          className={`relative aspect-square rounded-xl overflow-hidden border-2 cursor-pointer transition group hover:scale-102 ${
                            p.isPrimary
                              ? "border-emerald-500 ring-2 ring-emerald-500/40 shadow-sm"
                              : "border-slate-200 hover:border-slate-400"
                          }`}
                          title={p.isPrimary ? "Active Primary Photo" : "Click to set as profile photo"}
                        >
                          <img src={p.url} alt="Photo" className="w-full h-full object-cover" />
                          {p.isPrimary ? (
                            <div className="absolute top-1 right-1 bg-emerald-600 text-white p-0.5 rounded-full shadow">
                              <Check className="w-2.5 h-2.5 stroke-3" />
                            </div>
                          ) : (
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                              <span className="text-[9px] font-extrabold text-white bg-black/60 px-1.5 py-0.5 rounded">
                                Set
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setAvatarModalOpen(false)}
                  className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
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
              // Optimistically update active applications in local state instantly
              setUser((prev: any) => {
                if (!prev) return prev;
                const updatedRecent = (prev.recentApplications || []).map((app: any) => {
                  const evId = app.event?.id || app.eventId;
                  if (evId === scannerEvent.id || app.id === result.applicationId) {
                    return {
                      ...app,
                      status: "ATTENDED",
                      attendance: {
                        attendanceStatus: result.status || "PRESENT",
                        checkInTime: result.checkInTime || new Date().toISOString(),
                      },
                    };
                  }
                  return app;
                });
                return { ...prev, recentApplications: updatedRecent };
              });
              // Authoritative sync in background without tearing down UI
              fetchProfile(true);
            }}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}
