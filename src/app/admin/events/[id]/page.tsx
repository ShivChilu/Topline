"use client";

import { useEffect, useState, use, useMemo, useRef } from "react";
import Link from "next/link";
import EventPhotoGalleryManager from "@/components/EventPhotoGalleryManager";
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
  QrCode,
  LayoutGrid,
  List,
  Search,
  Camera,
  GraduationCap,
  Phone,
  Mail,
  Trash2,
  Check,
  X,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  UserCheck,
  UserX,
  ShieldAlert,
  ArrowUpDown,
  Sliders,
  AlertCircle,
  Info,
  Send,
  Eye,
  Edit3,
  GripVertical,
  FileText,
  Plus
} from "lucide-react";
import EmailTemplateManagerModal, { CustomEmailTemplate } from "@/components/admin/EmailTemplateManagerModal";

const EVENT_PLACEHOLDER_TAGS = [
  { tag: "{{name}}", label: "Candidate Name", example: "Rahul Sharma", desc: "Candidate's full name" },
  { tag: "{{registrationNumber}}", label: "Roll / Reg No", example: "2023CSE1042", desc: "Roll or registration number" },
  { tag: "{{eventName}}", label: "Event Name", example: "Grand Royal Banquet", desc: "Current event title" },
  { tag: "{{eventDate}}", label: "Event Date", example: "Saturday, 12 October 2026", desc: "Event date" },
  { tag: "{{eventLocation}}", label: "Location / Venue", example: "Radisson Blu, Jalandhar", desc: "Event venue address" },
  { tag: "{{reportingTime}}", label: "Reporting Time", example: "04:30 PM", desc: "Shift reporting time" },
  { tag: "{{applicationStatus}}", label: "Status", example: "SELECTED", desc: "Current application status" },
  { tag: "{{paymentPerStudent}}", label: "Payout", example: "₹650", desc: "Payment rate per student" },
  { tag: "{{university}}", label: "University", example: "SRM University", desc: "College / University" },
  { tag: "{{city}}", label: "City", example: "Jalandhar", desc: "City / Location" },
  { tag: "{{phone}}", label: "Phone", example: "9876543210", desc: "Contact mobile number" },
  { tag: "{{gender}}", label: "Gender", example: "Male", desc: "Candidate gender" },
  { tag: "{{attendanceStatus}}", label: "Attendance", example: "PRESENT", desc: "Attendance status" },
  { tag: "{{callingRemarks}}", label: "Remarks", example: "Confirmed lead steward", desc: "Calling remarks" },
];

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

  // View state: photo gallery (default), table, event photos
  const [activeView, setActiveView] = useState<"gallery" | "table" | "eventPhotos">("gallery");

  // Selection & bulk
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [sendEmailToggle, setSendEmailToggle] = useState(true);

  // Sorting & Queue workflow
  const [pendingFirstQueue, setPendingFirstQueue] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [photoFilter, setPhotoFilter] = useState("ALL");
  const [profileFilter, setProfileFilter] = useState("ALL");
  const [whatsappFilter, setWhatsappFilter] = useState("ALL");
  const [paymentFilter, setPaymentFilter] = useState("ALL");

  // Candidate Inspection Modal & Lightbox
  const [inspectCandidate, setInspectCandidate] = useState<any>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [callingNote, setCallingNote] = useState("");

  // Delete Confirmation Modal
  const [deleteCandidate, setDeleteCandidate] = useState<any>(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Add Manual Candidate Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addFormData, setAddFormData] = useState<Record<string, any>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [addModalError, setAddModalError] = useState<string | null>(null);

  // Custom Email Broadcast & Single Message Modal
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailTargetApps, setEmailTargetApps] = useState<any[]>([]);
  const [customEmailSubject, setCustomEmailSubject] = useState("Duty Instructions & Confirmation: {{eventName}} — {{name}}");
  const [customEmailBody, setCustomEmailBody] = useState(
    "Dear {{name}},\n\nYou are scheduled for {{eventName}}.\n\n📅 Date: {{eventDate}}\n📍 Venue: {{eventLocation}}\n⏰ Reporting Time: {{reportingTime}}\n💰 Payout: {{paymentPerStudent}}\n\nPlease report on time in formal grooming (pressed black formal trousers, clean white shirt, polished black shoes).\n\nBest regards,\nTopline Operations Team"
  );
  const [customEmailBranding, setCustomEmailBranding] = useState(true);
  const [emailSending, setEmailSending] = useState(false);
  const [emailTab, setEmailTab] = useState<"compose" | "preview">("compose");
  const messageTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const subjectInputRef = useRef<HTMLInputElement | null>(null);
  const [lastFocusedField, setLastFocusedField] = useState<"subject" | "body">("body");

  // Template Manager Modal
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [customTemplates, setCustomTemplates] = useState<CustomEmailTemplate[]>([]);

  const fetchEmailTemplates = async () => {
    try {
      const res = await fetch("/api/admin/email-templates?category=EVENT");
      const data = await res.json();
      if (data.success && Array.isArray(data.templates)) {
        setCustomTemplates(data.templates);
      }
    } catch (err) {
      console.error("Error fetching email templates:", err);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchEventData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
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

      setEvent(eventData.event);

      try {
        const appRes = await fetch(`/api/admin/applications?eventId=${eventId}&t=${Date.now()}`, { cache: "no-store" });
        if (appRes.ok) {
          const appData = await appRes.json();
          if (appData.success) setApplications(appData.applications || []);
        } else {
          console.error("Applications fetch status:", appRes.status);
        }
      } catch (appErr) {
        console.error("Failed to parse applications:", appErr);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("An error occurred while loading event details.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventData();
    fetchEmailTemplates();
  }, [eventId]);

  // Handle single candidate status update with optimistic UI
  const handleUpdateStatus = async (
    appId: string,
    nextStatus: string,
    notes?: string
  ) => {
    try {
      setActionLoadingId(appId);

      // Optimistic update
      setApplications((prev) =>
        prev.map((app) =>
          app._id === appId || app.id === appId
            ? { ...app, status: nextStatus.toUpperCase() }
            : app
        )
      );

      if (inspectCandidate && (inspectCandidate._id === appId || inspectCandidate.id === appId)) {
        setInspectCandidate((prev: any) =>
          prev ? { ...prev, status: nextStatus.toUpperCase() } : null
        );
      }

      const res = await fetch(`/api/admin/applications`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: [appId],
          status: nextStatus,
          notes: notes || callingNote || undefined,
          sendEmail: sendEmailToggle,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Candidate status updated to ${nextStatus.toUpperCase()}${sendEmailToggle ? " & email dispatched" : ""}.`);
        fetchEventData(true);
      } else {
        showToast(`Warning: ${data.message}`);
        fetchEventData(true);
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to update status.");
      fetchEventData(true);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Bulk update
  const handleBulkUpdate = async (updatePayload: {
    status?: string;
    paymentStatus?: string;
    messageStatus?: string;
    whatsappGroupAdded?: boolean;
  }) => {
    if (selectedIds.length === 0) return;

    try {
      setActionLoadingId("bulk");
      const res = await fetch(`/api/admin/applications`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: selectedIds,
          ...updatePayload,
          sendEmail: sendEmailToggle,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        setSelectedIds([]);
        fetchEventData(true);
      } else {
        showToast(data.message || "Bulk update failed.");
      }
    } catch (err) {
      console.error(err);
      showToast("Network error during bulk update.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Safe delete application
  const handleDeleteApplication = async (appId: string) => {
    try {
      setActionLoadingId(appId);
      const res = await fetch(`/api/admin/applications?id=${appId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showToast("Application deleted. Student account remains intact.");
        setDeleteCandidate(null);
        if (inspectCandidate && (inspectCandidate._id === appId || inspectCandidate.id === appId)) {
          setInspectCandidate(null);
        }
        fetchEventData(true);
      } else {
        showToast(data.message || "Failed to delete application.");
      }
    } catch (err) {
      console.error(err);
      showToast("Delete error.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Safe bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      setActionLoadingId("bulk");
      const res = await fetch(`/api/admin/applications?ids=${selectedIds.join(",")}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showToast(`Removed ${selectedIds.length} application(s).`);
        setSelectedIds([]);
        setIsBulkDeleteModalOpen(false);
        fetchEventData(true);
      } else {
        showToast(data.message || "Failed to delete applications.");
      }
    } catch (err) {
      console.error(err);
      showToast("Bulk delete error.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Open Custom Email Modal for single or multiple event applications
  const openCustomEmailModal = (targetList: any[]) => {
    if (!targetList || targetList.length === 0) return;
    setEmailTargetApps(targetList);
    setEmailTab("compose");
    setEmailModalOpen(true);
  };

  // Insert placeholder tag into subject or message body
  const insertTag = (tag: string) => {
    if (lastFocusedField === "subject") {
      const input = subjectInputRef.current;
      if (!input) {
        setCustomEmailSubject((prev) => (prev ? prev + " " + tag : tag));
        return;
      }
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const text = customEmailSubject;
      const before = text.substring(0, start);
      const after = text.substring(end, text.length);
      setCustomEmailSubject(before + tag + after);
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + tag.length, start + tag.length);
      }, 0);
    } else {
      const textarea = messageTextareaRef.current;
      if (!textarea) {
        setCustomEmailBody((prev) => (prev ? prev + " " + tag : tag));
        return;
      }
      const start = textarea.selectionStart || 0;
      const end = textarea.selectionEnd || 0;
      const text = customEmailBody;
      const before = text.substring(0, start);
      const after = text.substring(end, text.length);
      setCustomEmailBody(before + tag + after);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + tag.length, start + tag.length);
      }, 0);
    }
  };

  // Dispatch custom email to event candidates
  const handleSendCustomEmail = async () => {
    if (emailTargetApps.length === 0) return;
    if (!customEmailSubject.trim()) {
      showToast("Please enter an email subject.");
      return;
    }
    if (!customEmailBody.trim()) {
      showToast("Please enter email message content.");
      return;
    }

    try {
      setEmailSending(true);
      const res = await fetch(`/api/admin/events/${eventId}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationIds: emailTargetApps.map((a) => a._id || a.id),
          subject: customEmailSubject,
          message: customEmailBody,
          includeBranding: customEmailBranding,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message || `Email successfully dispatched to ${emailTargetApps.length} candidate(s).`);
        setEmailModalOpen(false);
      } else {
        showToast(`Warning: ${data.message}`);
      }
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || "Failed to dispatch emails.");
    } finally {
      setEmailSending(false);
    }
  };

  // Helper to interpolate tags for live preview
  const getPreviewText = (template: string) => {
    if (!template) return "";
    const app = emailTargetApps[0] || applications[0] || {
      name: "Rahul Sharma",
      registrationNumber: "2023CSE1042",
      mobileNumber: "9876543210",
      status: "SELECTED",
      callingRemarks: "Lead Steward",
      attendanceStatus: "PENDING",
      studentId: {
        name: "Rahul Sharma",
        registrationNumber: "2023CSE1042",
        university: "SRM University",
        city: "Jalandhar",
        phone: "9876543210",
        gender: "Male",
        selectionStatus: "SELECTED",
        age: 21,
        upiId: "rahul@okaxis",
        email: "rahul@example.com",
      },
    };

    const student = app.studentId || {};
    const formattedDate = event?.date
      ? new Date(event.date).toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
      : "";

    const replacements: Record<string, string> = {
      name: app.name || student.name || "Candidate",
      studentName: app.name || student.name || "Candidate",
      registrationNumber: app.registrationNumber || student.registrationNumber || "N/A",
      regNo: app.registrationNumber || student.registrationNumber || "N/A",
      rollNo: app.registrationNumber || student.registrationNumber || "N/A",
      university: student.university || "N/A",
      college: student.university || "N/A",
      city: student.city || "N/A",
      phone: app.mobileNumber || student.phone || "N/A",
      mobile: app.mobileNumber || student.phone || "N/A",
      gender: student.gender || "N/A",
      applicationStatus: app.status || "APPLIED",
      status: app.status || "APPLIED",
      selectionStatus: student.selectionStatus || "UNDER_REVIEW",
      eventName: event?.name || "Event",
      eventDate: formattedDate || (event?.date ? String(event.date) : "N/A"),
      eventLocation: event?.location || "N/A",
      reportingTime: event?.reportingTime || "N/A",
      workType: event?.workType || "N/A",
      paymentPerStudent: event?.paymentPerStudent ? `₹${event.paymentPerStudent}` : "N/A",
      callingRemarks: app.callingRemarks || "None",
      attendanceStatus: app.attendanceStatus || "PENDING",
      age: student.age ? String(student.age) : "N/A",
      upiId: student.upiId || "N/A",
      email: student.email || "",
    };

    let result = template;
    for (const [key, value] of Object.entries(replacements)) {
      const regexDouble = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "gi");
      const regexSingle = new RegExp(`\\{\\s*${key}\\s*\\}`, "gi");
      result = result.replace(regexDouble, value).replace(regexSingle, value);
    }
    return result;
  };

  // Filter & Queue Sorting
  const filteredAndSortedApplications = useMemo(() => {
    let list = [...applications];

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((app) => {
        const name = (app.name || app.studentId?.name || "").toLowerCase();
        const reg = (app.registrationNumber || app.studentId?.registrationNumber || "").toLowerCase();
        const phone = (app.mobileNumber || app.studentId?.phone || "").toLowerCase();
        const email = (app.studentId?.email || "").toLowerCase();
        const uni = (app.studentId?.university || "").toLowerCase();
        const city = (app.studentId?.city || "").toLowerCase();
        return name.includes(q) || reg.includes(q) || phone.includes(q) || email.includes(q) || uni.includes(q) || city.includes(q);
      });
    }

    // Status filter
    if (statusFilter !== "ALL") {
      list = list.filter((a) => (a.status || "").toUpperCase() === statusFilter);
    }

    // Photo filter
    if (photoFilter === "WITH_PHOTOS") {
      list = list.filter((a) => a.photoUrl || (a.studentId?.studentPhotos && a.studentId.studentPhotos.length > 0));
    } else if (photoFilter === "WITHOUT_PHOTOS") {
      list = list.filter((a) => !a.photoUrl && (!a.studentId?.studentPhotos || a.studentId.studentPhotos.length === 0));
    }

    // Profile filter
    if (profileFilter === "COMPLETE") {
      list = list.filter((a) => (a.completenessScore || 0) >= 80);
    } else if (profileFilter === "INCOMPLETE") {
      list = list.filter((a) => (a.completenessScore || 0) < 80);
    }

    // WhatsApp filter
    if (whatsappFilter === "ADDED") {
      list = list.filter((a) => a.whatsappGroupAdded === true);
    } else if (whatsappFilter === "NOT_ADDED") {
      list = list.filter((a) => a.whatsappGroupAdded !== true);
    }

    // Payment filter
    if (paymentFilter === "PAID") {
      list = list.filter((a) => a.paymentStatus === "PAID");
    } else if (paymentFilter === "UNPAID") {
      list = list.filter((a) => a.paymentStatus !== "PAID");
    }

    // Calling queue priority sorting:
    // When pendingFirstQueue is active:
    // APPLIED & UNDER_REVIEW -> Top
    // SELECTED, NOT_SELECTED, CONFIRMED, ATTENDED, CANCELLED -> Bottom
    if (pendingFirstQueue) {
      const getPriority = (statusStr: string) => {
        const s = (statusStr || "").toUpperCase();
        if (s === "APPLIED") return 1;
        if (s === "UNDER_REVIEW") return 2;
        if (s === "SELECTED") return 3;
        if (s === "CONFIRMED") return 4;
        if (s === "NOT_SELECTED" || s === "REJECTED") return 5;
        if (s === "ATTENDED") return 6;
        if (s === "ABSENT") return 7;
        if (s === "CANCELLED") return 8;
        return 9;
      };

      list.sort((a, b) => {
        const prioA = getPriority(a.status);
        const prioB = getPriority(b.status);
        if (prioA !== prioB) return prioA - prioB;
        // Secondary stable sort: createdAt
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateA - dateB;
      });
    }

    return list;
  }, [applications, search, statusFilter, photoFilter, profileFilter, whatsappFilter, paymentFilter, pendingFirstQueue]);

  // Statistics
  const stats = useMemo(() => {
    const total = applications.length;
    const applied = applications.filter((a) => (a.status || "").toUpperCase() === "APPLIED").length;
    const underReview = applications.filter((a) => (a.status || "").toUpperCase() === "UNDER_REVIEW").length;
    const selected = applications.filter((a) => (a.status || "").toUpperCase() === "SELECTED").length;
    const notSelected = applications.filter((a) => ["NOT_SELECTED", "REJECTED"].includes((a.status || "").toUpperCase())).length;
    const confirmed = applications.filter((a) => (a.status || "").toUpperCase() === "CONFIRMED").length;
    const attended = applications.filter((a) => (a.status || "").toUpperCase() === "ATTENDED").length;
    const absent = applications.filter((a) => (a.status || "").toUpperCase() === "ABSENT").length;
    const cancelled = applications.filter((a) => (a.status || "").toUpperCase() === "CANCELLED").length;
    const paid = applications.filter((a) => a.paymentStatus === "PAID").length;
    const unpaid = total - paid;
    return { total, applied, underReview, selected, notSelected, confirmed, attended, absent, cancelled, paid, unpaid };
  }, [applications]);

  // Financials
  const financials = useMemo(() => {
    if (!event) return { revenue: 0, expenses: 0, workerPayments: 0, profit: 0, profitMargin: 0 };
    let workerTotal = 0;
    applications.forEach((app) => {
      const s = (app.status || "").toUpperCase();
      if (["SELECTED", "CONFIRMED", "ATTENDED", "PAID"].includes(s)) {
        workerTotal += app.paymentOverride ?? event.paymentPerStudent ?? 0;
      }
    });
    const rev = event.clientRevenue || 0;
    const exp = event.otherExpenses || 0;
    const prof = rev - workerTotal - exp;
    const margin = rev > 0 ? Math.round((prof / rev) * 100) : 0;
    return { revenue: rev, expenses: exp, workerPayments: workerTotal, profit: prof, profitMargin: margin };
  }, [event, applications]);

  // Next candidate in queue helper for Drawer
  const handleNextCandidate = () => {
    if (!inspectCandidate) return;
    const currentIndex = filteredAndSortedApplications.findIndex(
      (a) => a._id === inspectCandidate._id || a.id === inspectCandidate.id
    );
    if (currentIndex >= 0 && currentIndex < filteredAndSortedApplications.length - 1) {
      setInspectCandidate(filteredAndSortedApplications[currentIndex + 1]);
    } else {
      showToast("You have reached the end of the candidate queue!");
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredAndSortedApplications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredAndSortedApplications.map((a) => a._id || a.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  if (loading) {
    return (
      <div className="text-center py-24">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-red-600 border-t-transparent mb-3"></div>
        <p className="text-sm font-semibold text-slate-500">Loading event management workspace...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="max-w-md mx-auto text-center py-16 bg-white border border-slate-200 rounded-3xl p-8 space-y-4 shadow-sm mt-8">
        <ShieldAlert className="w-12 h-12 text-rose-600 mx-auto" />
        <h3 className="text-lg font-bold text-slate-900 uppercase">Access Notice</h3>
        <p className="text-slate-500 text-sm">{errorMsg}</p>
        <Link href="/admin/events" className="inline-block bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition">
          Return to Events
        </Link>
      </div>
    );
  }

  if (!event) return null;

  return (
    <div className="space-y-6 text-slate-900 pb-20">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
          <Sparkles className="w-5 h-5 text-red-500" />
          <span className="text-sm font-semibold">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/events"
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 transition shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{event.name}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase border ${
                event.status === "OPEN"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : event.status === "FULL"
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-slate-100 text-slate-700 border-slate-200"
              }`}>
                {event.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
              <span>{new Date(event.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
              <span>•</span>
              <span>{event.location}</span>
              <span>•</span>
              <span>Reporting: {formatTime12(event.reportingTime)}</span>
            </p>
          </div>
        </div>

        {/* Quick Operations Links */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/admin/events/${eventId}/attendance`}
            className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
          >
            <QrCode className="w-3.5 h-3.5 text-slate-500" />
            QR Attendance
          </Link>
          <a
            href={`/events/${eventId}`}
            target="_blank"
            rel="noreferrer"
            className="bg-slate-900 hover:bg-black text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Public Page
          </a>
        </div>
      </div>

      {/* Financials & Quota Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase block">Workers Required</span>
          <span className="text-xl font-extrabold text-slate-900 mt-0.5 block">{event.workersRequired}</span>
        </div>
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase block">Max Applications</span>
          <span className="text-xl font-extrabold text-slate-900 mt-0.5 block">{event.maxApplications}</span>
        </div>
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase block">Pay / Student</span>
          <span className="text-xl font-extrabold text-red-600 font-mono mt-0.5 block">₹{event.paymentPerStudent}</span>
        </div>
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase block">Client Revenue</span>
          <span className="text-xl font-extrabold text-slate-900 font-mono mt-0.5 block">₹{financials.revenue.toLocaleString()}</span>
        </div>
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase block">Total Worker Payout</span>
          <span className="text-xl font-extrabold text-slate-700 font-mono mt-0.5 block">₹{financials.workerPayments.toLocaleString()}</span>
        </div>
        <div>
          <span className="text-[11px] font-bold text-emerald-600 uppercase block">Est. Net Profit</span>
          <span className="text-xl font-extrabold text-emerald-600 font-mono mt-0.5 block">
            ₹{financials.profit.toLocaleString()} ({financials.profitMargin}%)
          </span>
        </div>
      </div>

      {/* Dynamic Statistics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        <button
          onClick={() => setStatusFilter("ALL")}
          className={`p-3 rounded-xl border text-left transition shadow-sm ${
            statusFilter === "ALL" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-800 border-slate-200 hover:border-slate-300"
          }`}
        >
          <span className="text-[10px] font-bold uppercase opacity-70 block">Total</span>
          <span className="text-lg font-extrabold mt-0.5 block">{stats.total}</span>
        </button>

        <button
          onClick={() => setStatusFilter("APPLIED")}
          className={`p-3 rounded-xl border text-left transition shadow-sm ${
            statusFilter === "APPLIED" ? "bg-slate-800 text-white border-slate-800" : "bg-slate-50 text-slate-800 border-slate-200 hover:border-slate-300"
          }`}
        >
          <span className="text-[10px] font-bold uppercase text-slate-500 block">Applied</span>
          <span className="text-lg font-extrabold text-slate-900 mt-0.5 block">{stats.applied}</span>
        </button>

        <button
          onClick={() => setStatusFilter("UNDER_REVIEW")}
          className={`p-3 rounded-xl border text-left transition shadow-sm ${
            statusFilter === "UNDER_REVIEW" ? "bg-amber-600 text-white border-amber-600" : "bg-amber-50/60 text-amber-900 border-amber-200 hover:border-amber-300"
          }`}
        >
          <span className="text-[10px] font-bold uppercase text-amber-700 block">Under Review</span>
          <span className="text-lg font-extrabold text-amber-800 mt-0.5 block">{stats.underReview}</span>
        </button>

        <button
          onClick={() => setStatusFilter("SELECTED")}
          className={`p-3 rounded-xl border text-left transition shadow-sm ${
            statusFilter === "SELECTED" ? "bg-emerald-600 text-white border-emerald-600" : "bg-emerald-50/60 text-emerald-900 border-emerald-200 hover:border-emerald-300"
          }`}
        >
          <span className="text-[10px] font-bold uppercase text-emerald-700 block">Selected</span>
          <span className="text-lg font-extrabold text-emerald-700 mt-0.5 block">{stats.selected}</span>
        </button>

        <button
          onClick={() => setStatusFilter("NOT_SELECTED")}
          className={`p-3 rounded-xl border text-left transition shadow-sm ${
            statusFilter === "NOT_SELECTED" ? "bg-rose-600 text-white border-rose-600" : "bg-rose-50/60 text-rose-900 border-rose-200 hover:border-rose-300"
          }`}
        >
          <span className="text-[10px] font-bold uppercase text-rose-700 block">Not Selected</span>
          <span className="text-lg font-extrabold text-rose-700 mt-0.5 block">{stats.notSelected}</span>
        </button>

        <button
          onClick={() => setStatusFilter("CONFIRMED")}
          className={`p-3 rounded-xl border text-left transition shadow-sm ${
            statusFilter === "CONFIRMED" ? "bg-teal-600 text-white border-teal-600" : "bg-teal-50/60 text-teal-900 border-teal-200 hover:border-teal-300"
          }`}
        >
          <span className="text-[10px] font-bold uppercase text-teal-700 block">Confirmed</span>
          <span className="text-lg font-extrabold text-teal-700 mt-0.5 block">{stats.confirmed}</span>
        </button>

        <button
          onClick={() => setStatusFilter("ATTENDED")}
          className={`p-3 rounded-xl border text-left transition shadow-sm ${
            statusFilter === "ATTENDED" ? "bg-blue-600 text-white border-blue-600" : "bg-blue-50/60 text-blue-900 border-blue-200 hover:border-blue-300"
          }`}
        >
          <span className="text-[10px] font-bold uppercase text-blue-700 block">Attended</span>
          <span className="text-lg font-extrabold text-blue-700 mt-0.5 block">{stats.attended}</span>
        </button>

        <button
          onClick={() => setStatusFilter("CANCELLED")}
          className={`p-3 rounded-xl border text-left transition shadow-sm ${
            statusFilter === "CANCELLED" ? "bg-slate-600 text-white border-slate-600" : "bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300"
          }`}
        >
          <span className="text-[10px] font-bold uppercase text-slate-500 block">Cancelled</span>
          <span className="text-lg font-extrabold text-slate-600 mt-0.5 block">{stats.cancelled}</span>
        </button>
      </div>

      {/* FILTER & VIEW TOOLBAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3.5">
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
          {/* Search bar & Create Template Button */}
          <div className="flex items-center gap-2.5 w-full lg:w-auto flex-1 max-w-lg">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search candidate, roll no, phone..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 transition"
              />
            </div>
            <button
              type="button"
              onClick={() => setTemplateModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition shadow-2xs whitespace-nowrap cursor-pointer active:scale-95"
              title="Create or manage reusable email templates"
            >
              <FileText className="w-3.5 h-3.5 text-red-600" />
              <span>Create Template</span>
            </button>
          </div>

          {/* Filters & Queue Switch */}
          <div className="flex flex-wrap gap-2 w-full lg:w-auto items-center">
            {/* Queue Mode Toggle */}
            <button
              onClick={() => setPendingFirstQueue(!pendingFirstQueue)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition border ${
                pendingFirstQueue
                  ? "bg-red-50 text-red-700 border-red-200"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
              title="When enabled, unreviewed candidates stay on top; selected/rejected candidates automatically move to bottom"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>Queue: {pendingFirstQueue ? "Pending First" : "Default Order"}</span>
            </button>

            {/* Photo filter */}
            <select
              value={photoFilter}
              onChange={(e) => setPhotoFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs font-semibold rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:border-red-600"
            >
              <option value="ALL">All Photos</option>
              <option value="WITH_PHOTOS">📸 With Photos</option>
              <option value="WITHOUT_PHOTOS">⚠️ Without Photos</option>
            </select>

            {/* Profile completeness filter */}
            <select
              value={profileFilter}
              onChange={(e) => setProfileFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs font-semibold rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:border-red-600"
            >
              <option value="ALL">All Profiles</option>
              <option value="COMPLETE">Complete (80%+)</option>
              <option value="INCOMPLETE">Incomplete</option>
            </select>

            {/* View Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 ml-auto">
              <button
                onClick={() => setActiveView("gallery")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeView === "gallery" ? "bg-white text-red-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Photo Gallery
              </button>
              <button
                onClick={() => setActiveView("table")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeView === "table" ? "bg-white text-red-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <List className="w-3.5 h-3.5" />
                Table View
              </button>
              <button
                onClick={() => setActiveView("eventPhotos")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeView === "eventPhotos" ? "bg-white text-red-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                Event Photos
              </button>
            </div>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.length > 0 && activeView !== "eventPhotos" && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-red-800 bg-red-200 px-2.5 py-1 rounded-full">
                {selectedIds.length} Selected
              </span>
              <button
                onClick={toggleSelectAll}
                className="text-xs font-semibold text-red-700 hover:underline"
              >
                {selectedIds.length === filteredAndSortedApplications.length ? "Deselect All" : "Select All"}
              </button>
              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer ml-3">
                <input
                  type="checkbox"
                  checked={sendEmailToggle}
                  onChange={(e) => setSendEmailToggle(e.target.checked)}
                  className="accent-red-600 rounded"
                />
                Send automated email on status change
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={actionLoadingId === "bulk"}
                onClick={() => openCustomEmailModal(applications.filter((a) => selectedIds.includes(a.id || a._id)))}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
                title="Send personalized custom email to selected candidates"
              >
                <Mail className="w-3.5 h-3.5" />
                Send Custom Message ({selectedIds.length})
              </button>

              <button
                disabled={actionLoadingId === "bulk"}
                onClick={() => handleBulkUpdate({ status: "SELECTED" })}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
              >
                <UserCheck className="w-3.5 h-3.5" />
                Mark Selected ({selectedIds.length})
              </button>

              <button
                disabled={actionLoadingId === "bulk"}
                onClick={() => handleBulkUpdate({ status: "NOT_SELECTED" })}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
              >
                <UserX className="w-3.5 h-3.5" />
                Mark Not Selected ({selectedIds.length})
              </button>

              <button
                disabled={actionLoadingId === "bulk"}
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete ({selectedIds.length})
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------- */}
      {/* VIEW 1: EVENT CANDIDATE PHOTO GALLERY */}
      {/* ---------------------------------------------------- */}
      {activeView === "gallery" && (
        <>
          {filteredAndSortedApplications.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <Camera className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-800">No event applicants found</h3>
              <p className="text-sm text-slate-500 mt-1">Try adjusting your search criteria or filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredAndSortedApplications.map((app) => {
                const isSelectedCheckbox = selectedIds.includes(app._id || app.id);
                const sStatus = (app.status || "").toUpperCase();
                const student = app.studentId || {};
                const photosList = student.studentPhotos || [];

                return (
                  <div
                    key={app._id || app.id}
                    className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md ${
                      isSelectedCheckbox
                        ? "border-red-500 ring-2 ring-red-500/20"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {/* Top Photo Section */}
                    <div className="relative aspect-4/3 w-full bg-slate-100 overflow-hidden group">
                      {app.photoUrl ? (
                        <img
                          src={app.photoUrl}
                          alt={app.name}
                          className="w-full h-full object-cover object-top cursor-pointer transition-transform duration-300 group-hover:scale-105"
                          onClick={() => setLightboxPhoto(app.photoUrl)}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400">
                          <Camera className="w-10 h-10 stroke-1 mb-1" />
                          <span className="text-xs font-semibold">No Photo Uploaded</span>
                        </div>
                      )}

                      {/* Multi-Select Checkbox */}
                      <button
                        onClick={() => toggleSelectOne(app._id || app.id)}
                        className="absolute top-3 left-3 z-10 w-6 h-6 rounded-md bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/30 hover:bg-black/70 transition"
                      >
                        {isSelectedCheckbox && <Check className="w-4 h-4 text-red-400 stroke-3" />}
                      </button>

                      {/* Event Application Status Badge */}
                      <div className="absolute top-3 right-3 z-10">
                        {sStatus === "SELECTED" && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-500 text-white shadow-md flex items-center gap-1">
                            <Check className="w-3 h-3 stroke-3" /> Selected
                          </span>
                        )}
                        {sStatus === "UNDER_REVIEW" && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500 text-white shadow-md flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Under Review
                          </span>
                        )}
                        {(sStatus === "NOT_SELECTED" || sStatus === "REJECTED") && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500 text-white shadow-md flex items-center gap-1">
                            <X className="w-3 h-3 stroke-3" /> Not Selected
                          </span>
                        )}
                        {sStatus === "CONFIRMED" && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-teal-500 text-white shadow-md flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Confirmed
                          </span>
                        )}
                        {sStatus === "ATTENDED" && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-blue-500 text-white shadow-md flex items-center gap-1">
                            Attended
                          </span>
                        )}
                        {sStatus === "APPLIED" && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-white shadow-md">
                            Applied
                          </span>
                        )}
                      </div>

                      {/* Permanent Photos Count Pill */}
                      {photosList.length > 1 && (
                        <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md text-white px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1">
                          <Camera className="w-3 h-3" />
                          +{photosList.length} Photos
                        </div>
                      )}
                    </div>

                    {/* Body Information */}
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3
                            onClick={() => setInspectCandidate(app)}
                            className="font-bold text-slate-900 text-base leading-tight hover:text-red-600 transition cursor-pointer"
                          >
                            {app.name || student.name}
                          </h3>
                        </div>

                        {/* Identification numbers & authoritiative details */}
                        <div className="mt-1 flex items-center gap-1 text-xs text-slate-500 font-medium">
                          <span className="font-bold text-slate-700 uppercase font-mono">
                            {app.registrationNumber || student.registrationNumber || "NO REG"}
                          </span>
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
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-semibold text-slate-800">{app.mobileNumber}</span>
                          </div>
                        </div>

                        {/* Permanent profile status indicator */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                          <span className="text-slate-400 font-medium">Student Profile:</span>
                          <span className="font-bold text-slate-700">
                            {student.selectionStatus === "SELECTED"
                              ? "✓ Verified Selected"
                              : student.selectionStatus === "NOT_SELECTED"
                              ? "Profile Not Selected"
                              : "Under Review"}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                        {/* 1-Click Event Selection */}
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            disabled={actionLoadingId === (app._id || app.id)}
                            onClick={() => handleUpdateStatus(app._id || app.id, "SELECTED")}
                            className={`w-full py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${
                              sStatus === "SELECTED"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            {sStatus === "SELECTED" ? "Selected" : "Select"}
                          </button>

                          <button
                            disabled={actionLoadingId === (app._id || app.id)}
                            onClick={() => handleUpdateStatus(app._id || app.id, "NOT_SELECTED")}
                            className={`w-full py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${
                              sStatus === "NOT_SELECTED" || sStatus === "REJECTED"
                                ? "bg-rose-100 text-rose-800 border border-rose-300"
                                : "bg-slate-100 hover:bg-rose-600 hover:text-white text-slate-700"
                            }`}
                          >
                            <X className="w-3.5 h-3.5" />
                            {sStatus === "NOT_SELECTED" || sStatus === "REJECTED" ? "Not Selected" : "Deselect"}
                          </button>
                        </div>

                        {/* View Full Profile, Send Custom Message, & Safe Delete */}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openCustomEmailModal([app])}
                            className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-600 border border-blue-200 text-blue-700 hover:text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 shadow-sm"
                            title="Send Custom Message / Email"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            <span>Message</span>
                          </button>

                          <button
                            onClick={() => setInspectCandidate(app)}
                            className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition text-center truncate"
                          >
                            Full Profile
                          </button>

                          <button
                            onClick={() => setDeleteCandidate(app)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition shrink-0"
                            title="Remove Application from Event"
                          >
                            <Trash2 className="w-4 h-4" />
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
      {/* VIEW 2: OPERATIONAL TABLE VIEW */}
      {/* ---------------------------------------------------- */}
      {activeView === "table" && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="text-slate-400 bg-slate-50/75 border-b border-slate-200 uppercase text-xs">
                  <th className="p-4 w-10">
                    <input
                      type="checkbox"
                      checked={filteredAndSortedApplications.length > 0 && selectedIds.length === filteredAndSortedApplications.length}
                      onChange={toggleSelectAll}
                      className="accent-red-600 rounded"
                    />
                  </th>
                  <th className="p-4">Candidate</th>
                  <th className="p-4">Event Status</th>
                  <th className="p-4">Mobile Number</th>
                  <th className="p-4">University</th>
                  <th className="p-4">WhatsApp</th>
                  <th className="p-4">Payment</th>
                  <th className="p-4">Attendance</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAndSortedApplications.map((app) => {
                  const sStatus = (app.status || "").toUpperCase();
                  const isChecked = selectedIds.includes(app._id || app.id);
                  const student = app.studentId || {};

                  return (
                    <tr key={app._id || app.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectOne(app._id || app.id)}
                          className="accent-red-600 rounded"
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden border border-slate-200 shrink-0">
                            {app.photoUrl ? (
                              <img src={app.photoUrl} alt={app.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs text-slate-400 font-bold">
                                {app.name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div>
                            <div
                              onClick={() => setInspectCandidate(app)}
                              className="font-bold text-slate-900 cursor-pointer hover:text-red-600 transition"
                            >
                              {app.name || student.name}
                            </div>
                            <div className="text-xs text-slate-400 font-mono font-semibold">
                              {app.registrationNumber || student.registrationNumber}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase border ${
                          sStatus === "SELECTED"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : sStatus === "UNDER_REVIEW"
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : sStatus === "NOT_SELECTED" || sStatus === "REJECTED"
                            ? "bg-rose-50 text-rose-800 border-rose-200"
                            : sStatus === "CONFIRMED"
                            ? "bg-teal-50 text-teal-800 border-teal-200"
                            : sStatus === "ATTENDED"
                            ? "bg-blue-50 text-blue-800 border-blue-200"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}>
                          {sStatus}
                        </span>
                      </td>
                      <td className="p-4 font-semibold text-xs text-slate-800 font-mono">
                        {app.mobileNumber}
                      </td>
                      <td className="p-4 text-xs text-slate-600">
                        {student.university || "N/A"}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          app.whatsappGroupAdded ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
                        }`}>
                          {app.whatsappGroupAdded ? "Added" : "Pending"}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-xs">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          app.paymentStatus === "PAID" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                        }`}>
                          {app.paymentStatus}
                        </span>
                      </td>
                      <td className="p-4 text-xs">
                        {app.attendance?.attendanceStatus ? (
                          <span className="font-bold text-emerald-700">{app.attendance.attendanceStatus}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openCustomEmailModal([app])}
                            className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition"
                            title="Send Custom Message / Email"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setInspectCandidate(app)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
                            title="Inspect Profile & Responses"
                          >
                            <Sliders className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(app._id || app.id, sStatus === "SELECTED" ? "NOT_SELECTED" : "SELECTED")}
                            className={`p-1.5 rounded-lg text-xs font-bold ${
                              sStatus === "SELECTED"
                                ? "bg-rose-100 text-rose-700 hover:bg-rose-200"
                                : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                            }`}
                            title={sStatus === "SELECTED" ? "Deselect" : "Select"}
                          >
                            {sStatus === "SELECTED" ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => setDeleteCandidate(app)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100"
                            title="Remove Application"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* VIEW 3: EVENT PHOTO GALLERY (EVENT / SETUP PHOTOS) */}
      {/* ---------------------------------------------------- */}
      {activeView === "eventPhotos" && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <EventPhotoGalleryManager eventId={eventId} />
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* CANDIDATE INSPECTION DRAWER & MODAL */}
      {/* ---------------------------------------------------- */}
      {inspectCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 flex items-start justify-between bg-slate-50/75 rounded-t-2xl">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-200 overflow-hidden border-2 border-white shadow">
                  {inspectCandidate.photoUrl ? (
                    <img src={inspectCandidate.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-extrabold text-slate-500 text-xl">
                      {inspectCandidate.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-extrabold text-slate-900">{inspectCandidate.name}</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-slate-900 text-white">
                      {inspectCandidate.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                    <span className="font-mono font-bold bg-slate-200 text-slate-800 px-2 py-0.5 rounded">
                      {inspectCandidate.registrationNumber || inspectCandidate.studentId?.registrationNumber}
                    </span>
                    <span>• {inspectCandidate.studentId?.university || "University Unspecified"}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setInspectCandidate(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Photo Showcase Carousel / Grid */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-red-600" />
                  Permanent Student Photos ({inspectCandidate.studentId?.studentPhotos?.length || (inspectCandidate.photoUrl ? 1 : 0)})
                </h4>

                {inspectCandidate.studentId?.studentPhotos && inspectCandidate.studentId.studentPhotos.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {inspectCandidate.studentId.studentPhotos.map((photo: any) => (
                      <div
                        key={photo.id}
                        onClick={() => setLightboxPhoto(photo.url)}
                        className="relative aspect-3/4 rounded-xl overflow-hidden border border-slate-200 group bg-slate-100 cursor-pointer shadow-sm"
                      >
                        <img src={photo.url} alt="Grooming" className="w-full h-full object-cover transition duration-300 group-hover:scale-105" />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-white">
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-red-600 px-1.5 py-0.5 rounded">
                            {photo.photoType}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : inspectCandidate.photoUrl ? (
                  <div
                    onClick={() => setLightboxPhoto(inspectCandidate.photoUrl)}
                    className="w-48 aspect-3/4 rounded-xl overflow-hidden border border-slate-200 cursor-pointer shadow-sm"
                  >
                    <img src={inspectCandidate.photoUrl} alt="Photo" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                    No grooming photos uploaded by student yet.
                  </div>
                )}
              </div>

              {/* Authoritative Student Info */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-400 uppercase block">Phone</span>
                  <span className="text-sm font-semibold text-slate-900 mt-0.5 block font-mono">{inspectCandidate.mobileNumber}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-400 uppercase block">Email</span>
                  <span className="text-sm font-semibold text-slate-900 mt-0.5 block truncate">{inspectCandidate.studentId?.email || "N/A"}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-400 uppercase block">City / Gender</span>
                  <span className="text-sm font-semibold text-slate-900 mt-0.5 block">
                    {inspectCandidate.studentId?.city || "-"} / {inspectCandidate.studentId?.gender || "-"}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-400 uppercase block">Height / Age</span>
                  <span className="text-sm font-semibold text-slate-900 mt-0.5 block">
                    {inspectCandidate.studentId?.height || "-"} / {inspectCandidate.studentId?.age ? `${inspectCandidate.studentId.age} yrs` : "-"}
                  </span>
                </div>
              </div>

              {/* Dynamic Permanent Profile Attributes */}
              {inspectCandidate.studentId?.dynamicProfileFields && inspectCandidate.studentId.dynamicProfileFields.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-red-600" />
                    Permanent Profile Attributes
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {inspectCandidate.studentId.dynamicProfileFields.map((df: any, idx: number) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                        <span className="font-bold text-slate-500 block">{df.label}</span>
                        <span className="font-semibold text-slate-900 mt-1 block">{df.value || "Not provided"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Event-Specific Custom Form Responses */}
              {inspectCandidate.dynamicEventResponses && inspectCandidate.dynamicEventResponses.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-red-600" />
                    Event Application Form Responses
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {inspectCandidate.dynamicEventResponses.map((ef: any, idx: number) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                        <span className="font-bold text-slate-500 block">{ef.label}</span>
                        <span className="font-semibold text-slate-900 mt-1 block">{ef.value || "Not answered"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Event Selection & Calling Workflow Box */}
              <div className="p-5 bg-slate-900 text-white rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="font-extrabold text-base text-white">Calling & Selection Decision</h4>
                    <p className="text-xs text-slate-400">Update event application status and dispatch branded notification email.</p>
                  </div>
                  <button
                    onClick={handleNextCandidate}
                    className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 self-start sm:self-auto"
                  >
                    <span>Next Candidate</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Coordinator Remarks / Call Notes</label>
                  <input
                    type="text"
                    value={callingNote}
                    onChange={(e) => setCallingNote(e.target.value)}
                    placeholder="e.g. Confirmed attendance for evening shift, uniform ready..."
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
                    Dispatch automated notification email
                  </label>

                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => {
                        const target = inspectCandidate;
                        setInspectCandidate(null);
                        openCustomEmailModal([target]);
                      }}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition shadow flex items-center gap-1.5"
                      title="Send custom email with placeholder tags to this candidate"
                    >
                      <Mail className="w-4 h-4" />
                      Send Custom Message
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(inspectCandidate._id || inspectCandidate.id, "SELECTED")}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow flex items-center gap-1.5"
                    >
                      <UserCheck className="w-4 h-4" />
                      Approve & Select
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(inspectCandidate._id || inspectCandidate.id, "NOT_SELECTED")}
                      className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow flex items-center gap-1.5"
                    >
                      <UserX className="w-4 h-4" />
                      Not Selected
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(inspectCandidate._id || inspectCandidate.id, "CONFIRMED")}
                      className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(inspectCandidate._id || inspectCandidate.id, "UNDER_REVIEW")}
                      className="bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition"
                    >
                      Under Review
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* PHOTO LIGHTBOX MODAL */}
      {/* ---------------------------------------------------- */}
      {lightboxPhoto && (
        <div
          onClick={() => setLightboxPhoto(null)}
          className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4 animate-in fade-in cursor-pointer"
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            <img src={lightboxPhoto} alt="Zoom" className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl" />
            <button
              onClick={() => setLightboxPhoto(null)}
              className="absolute top-3 right-3 bg-black/70 hover:bg-black text-white p-2 rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* SINGLE DELETE CONFIRMATION MODAL */}
      {/* ---------------------------------------------------- */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Remove Application from Event?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Are you sure you want to remove <strong className="text-slate-900">{deleteCandidate.name}</strong> from this event?
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 flex items-start gap-2">
              <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <span>
                <strong>Data Safe:</strong> This will delete only this event application. The student's permanent account, photos, and other event applications will remain completely intact.
              </span>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDeleteCandidate(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                disabled={actionLoadingId === (deleteCandidate._id || deleteCandidate.id)}
                onClick={() => handleDeleteApplication(deleteCandidate._id || deleteCandidate.id)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition shadow-sm disabled:opacity-50"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* BULK DELETE CONFIRMATION MODAL */}
      {/* ---------------------------------------------------- */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Delete {selectedIds.length} Applications?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                You are about to remove <strong className="text-slate-900">{selectedIds.length} candidate applications</strong> from this event.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 flex items-start gap-2">
              <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <span>
                <strong>Data Safe:</strong> Student accounts, uploaded profile photos, and other event history will NOT be deleted.
              </span>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                disabled={actionLoadingId === "bulk"}
                onClick={handleBulkDelete}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition shadow-sm disabled:opacity-50"
              >
                Delete Applications
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* CUSTOM EMAIL BROADCAST & MESSAGE MODAL (EVENT SCOPED) */}
      {/* ---------------------------------------------------- */}
      {emailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-400 shadow-inner">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold flex items-center gap-2">
                    Event Custom Email Dispatch
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-600/40 border border-blue-400/50 text-blue-300">
                      {emailTargetApps.length === 1
                        ? `1 Candidate: ${emailTargetApps[0]?.name || emailTargetApps[0]?.studentId?.name}`
                        : `${emailTargetApps.length} Selected Candidates`}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Targeted event messaging with interactive candidate & event placeholder tags.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEmailModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Modal Content */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-900">
              {/* PLACEHOLDER TAGS TOOLBAR */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    Interactive Candidate & Event Tags
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    💡 Click to insert or drag & drop into Subject / Body
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {EVENT_PLACEHOLDER_TAGS.map((tagItem) => (
                    <button
                      key={tagItem.tag}
                      type="button"
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", tagItem.tag);
                      }}
                      onClick={() => insertTag(tagItem.tag)}
                      className="group bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-400 text-slate-700 hover:text-blue-700 rounded-xl px-2.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs hover:shadow-xs active:scale-95 cursor-grab"
                      title={`${tagItem.desc} (Example: ${tagItem.example})`}
                    >
                      <GripVertical className="w-3 h-3 text-slate-300 group-hover:text-blue-500" />
                      <code className="text-[11px] font-bold text-blue-600 bg-blue-50 px-1 py-0.5 rounded">
                        {tagItem.tag}
                      </code>
                      <span className="text-slate-500 text-[11px] group-hover:text-blue-800">
                        ({tagItem.label})
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Template Presets */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-500 uppercase text-[11px]">Quick Templates:</span>
                  <button
                    type="button"
                    onClick={() => setTemplateModalOpen(true)}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" />
                    Manage
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCustomEmailSubject("Duty & Reporting Instructions: {{eventName}} — {{name}}");
                    setCustomEmailBody(
                      "Dear {{name}},\n\nYou are scheduled for duty at {{eventName}}.\n\n📅 Date: {{eventDate}}\n📍 Venue: {{eventLocation}}\n⏰ Mandatory Reporting Time: {{reportingTime}}\n💰 Payout: {{paymentPerStudent}}\n\n📋 Mandatory Instructions & Grooming Checklist:\n1. Arrive 15 minutes before the reporting time.\n2. Wear clean pressed black formal trousers, plain white formal shirt, and polished black formal shoes.\n3. Bring your college ID card (Roll No: {{registrationNumber}}).\n\nPlease confirm receipt of this schedule.\n\nBest regards,\nTopline Operations & Coordination Team"
                    );
                  }}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition"
                >
                  Reporting & Duty Instructions
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomEmailSubject("Selection Notice & Shift Confirmation: {{eventName}} — {{name}}");
                    setCustomEmailBody(
                      "Congratulations {{name}}!\n\nYour application status for {{eventName}} is currently {{applicationStatus}}.\n\n📅 Date: {{eventDate}}\n📍 Venue: {{eventLocation}}\n\nPlease log in to your Topline Student Portal to confirm your attendance pass and view check-in details.\n\nBest regards,\nTopline Operations Team"
                    );
                  }}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition"
                >
                  Selection Confirmation
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomEmailSubject("Payment & Payout Confirmation: {{eventName}} — {{name}}");
                    setCustomEmailBody(
                      "Hi {{name}},\n\nRegarding your completed assignment for {{eventName}}:\n\nAttendance Record: {{attendanceStatus}}\nPayout Amount: {{paymentPerStudent}}\n\nPlease verify that your UPI ID ({{upiId}}) is active on your portal profile for automated direct bank transfer.\n\nThank you for your dedicated service!\nTopline Accounts & Coordination"
                    );
                  }}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition"
                >
                  Payment & Bank Info
                </button>

                {/* Dynamic Custom Templates */}
                {customTemplates.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => {
                      setCustomEmailSubject(tpl.subject);
                      setCustomEmailBody(tpl.body);
                    }}
                    className="px-2.5 py-1 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-lg font-bold transition flex items-center gap-1 shadow-2xs"
                    title={`Custom Template: ${tpl.subject}`}
                  >
                    <Sparkles className="w-3 h-3 text-red-500" />
                    {tpl.name}
                  </button>
                ))}
              </div>

              {/* TAB TOGGLE: COMPOSE VS PREVIEW */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <button
                  type="button"
                  onClick={() => setEmailTab("compose")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    emailTab === "compose"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Compose Message
                </button>
                <button
                  type="button"
                  onClick={() => setEmailTab("preview")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    emailTab === "preview"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  Live Preview ({emailTargetApps[0]?.name || emailTargetApps[0]?.studentId?.name || "Candidate"})
                </button>
              </div>

              {/* COMPOSE VIEW */}
              {emailTab === "compose" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Email Subject Line *
                    </label>
                    <input
                      ref={subjectInputRef}
                      type="text"
                      required
                      value={customEmailSubject}
                      onFocus={() => setLastFocusedField("subject")}
                      onChange={(e) => setCustomEmailSubject(e.target.value)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const tag = e.dataTransfer.getData("text/plain");
                        if (tag) insertTag(tag);
                      }}
                      placeholder="e.g. Duty Instructions & Confirmation: {{eventName}} — {{name}}"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700 uppercase">
                        Email Message Body *
                      </label>
                      <span className="text-[11px] text-slate-400">
                        Line breaks will be preserved as clean paragraphs
                      </span>
                    </div>
                    <textarea
                      ref={messageTextareaRef}
                      rows={9}
                      required
                      value={customEmailBody}
                      onFocus={() => setLastFocusedField("body")}
                      onChange={(e) => setCustomEmailBody(e.target.value)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const tag = e.dataTransfer.getData("text/plain");
                        if (tag) insertTag(tag);
                      }}
                      placeholder="Type your message here or drag & drop tags..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm text-slate-900 font-normal leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition font-mono"
                    />
                  </div>

                  <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={customEmailBranding}
                      onChange={(e) => setCustomEmailBranding(e.target.checked)}
                      className="accent-blue-600 rounded"
                    />
                    <span className="font-semibold">
                      Include Topline ODC official header banner and portal link button
                    </span>
                  </label>
                </div>
              )}

              {/* LIVE PREVIEW VIEW */}
              {emailTab === "preview" && (
                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 text-white space-y-4">
                  <div className="text-xs text-slate-400 border-b border-slate-800 pb-3 space-y-1">
                    <div>
                      <span className="font-bold text-slate-300">To: </span>
                      <span className="text-blue-400">
                        {emailTargetApps[0]?.name || emailTargetApps[0]?.studentId?.name || "Candidate"} &lt;
                        {emailTargetApps[0]?.studentId?.email || "candidate@example.com"}&gt;
                      </span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-300">Subject: </span>
                      <span className="text-white font-semibold">{getPreviewText(customEmailSubject)}</span>
                    </div>
                  </div>

                  {/* Simulated Email Container */}
                  <div className="bg-[#111827] border border-slate-700 rounded-xl overflow-hidden max-w-xl mx-auto shadow-lg">
                    {customEmailBranding && (
                      <div className="bg-[#ED0000] p-4 text-center">
                        <h1 className="m-0 text-white text-lg font-extrabold tracking-wider">TOPLINE ODC</h1>
                      </div>
                    )}
                    <div className="p-6">
                      <div className="inline-block bg-blue-600 text-white text-[11px] font-bold px-3 py-1 rounded-full mb-4">
                        OFFICIAL NOTIFICATION
                      </div>
                      <h2 className="text-white text-lg font-bold mb-3">
                        Dear {getPreviewText("{{name}}")},
                      </h2>
                      <div className="text-slate-300 text-sm leading-relaxed space-y-3 whitespace-pre-wrap">
                        {getPreviewText(customEmailBody)}
                      </div>
                      <div className="text-center mt-6">
                        <span className="inline-block bg-[#ED0000] text-white font-bold text-xs px-5 py-2.5 rounded-lg shadow">
                          Go to Topline Portal
                        </span>
                      </div>
                    </div>
                    {customEmailBranding && (
                      <div className="p-4 bg-slate-900 text-center text-[11px] text-slate-500 border-t border-slate-800">
                        &copy; {new Date().getFullYear()} Topline ODC & Catering Management. All rights reserved.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setEmailModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
              >
                Cancel
              </button>

              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 font-medium">
                  {emailTargetApps.length} email{emailTargetApps.length > 1 ? "s" : ""} will be sent
                </span>
                <button
                  type="button"
                  disabled={emailSending}
                  onClick={handleSendCustomEmail}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow transition flex items-center gap-2 disabled:opacity-50"
                >
                  {emailSending ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Dispatching...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send to {emailTargetApps.length} Candidate{emailTargetApps.length > 1 ? "s" : ""}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Template Manager Modal */}
      <EmailTemplateManagerModal
        isOpen={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        scope="EVENT"
        placeholderTags={EVENT_PLACEHOLDER_TAGS}
        onTemplatesUpdated={(tpls) => setCustomTemplates(tpls)}
        onSelectTemplate={(tpl) => {
          setCustomEmailSubject(tpl.subject);
          setCustomEmailBody(tpl.body);
        }}
      />
    </div>
  );
}

