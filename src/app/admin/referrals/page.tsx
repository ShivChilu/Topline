"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Gift,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Banknote,
  Users,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  X,
  CreditCard,
  Sparkles,
  RefreshCw,
  Award,
  Settings,
  Eye,
  Phone,
  MessageSquare,
  Calendar,
  MapPin,
  Briefcase,
  AlertTriangle,
  Mail,
  Send,
  Share2,
} from "lucide-react";

export default function AdminReferralsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [activeView, setActiveView] = useState<"referrers" | "ledger">("referrers");

  // Referred Friends Detail Modal State
  const [selectedReferrerDetail, setSelectedReferrerDetail] = useState<any>(null);

  // Reward Tuner Modal State
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [selectedReward, setSelectedReward] = useState<number>(50);
  const [updatingReward, setUpdatingReward] = useState(false);

  // Payout Settlement Modal & Dynamic Per-Item Amounts
  const [settlingReferrer, setSettlingReferrer] = useState<any>(null);
  const [settlingReferralItem, setSettlingReferralItem] = useState<any>(null);
  const [customPayoutAmount, setCustomPayoutAmount] = useState<string>("");
  const [itemCustomAmounts, setItemCustomAmounts] = useState<Record<string, string>>({});
  const [settlingDirectId, setSettlingDirectId] = useState<string | null>(null);
  const [paidReference, setPaidReference] = useState("");
  const [payoutNotes, setPayoutNotes] = useState("");
  const [sendEmailOnSettle, setSendEmailOnSettle] = useState<boolean>(true);
  const [settlingLoading, setSettlingLoading] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Referral Reminder Email States
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);
  const [sendingProgressNudgeId, setSendingProgressNudgeId] = useState<string | null>(null);
  const [showBroadcastModal, setShowBroadcastModal] = useState<boolean>(false);
  const [broadcasting, setBroadcasting] = useState<boolean>(false);

  // Email History & Audit Inspection Modal State
  const [emailHistoryModalData, setEmailHistoryModalData] = useState<{
    title: string;
    subtitle: string;
    recipientName?: string;
    recipientEmail?: string;
    logs: any[];
  } | null>(null);

  // Helper for per-referral dynamic amount state
  const getItemAmount = (itemKey: string, fallbackAmt: number | string = 50): string => {
    if (itemCustomAmounts[itemKey] !== undefined && itemCustomAmounts[itemKey] !== "") {
      return itemCustomAmounts[itemKey];
    }
    return String(fallbackAmt || 50);
  };

  const setItemAmount = (itemKey: string, val: string) => {
    setItemCustomAmounts((prev) => ({ ...prev, [itemKey]: val }));
  };

  // Helper for human-readable relative/formatted timestamp
  const formatSentTime = (dateStr?: string | null) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;

    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24 && now.getDate() === d.getDate()) {
      return `Today at ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`;
    }
    if (diffDays === 1) {
      return `Yesterday at ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`;
    }
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const fetchReferrals = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/referrals?t=" + Date.now());
      const json = await res.json();
      if (res.ok && json.success) {
        setData(json);
        if (json.metrics?.rewardPerReferral) {
          setSelectedReward(json.metrics.rewardPerReferral);
        }
      } else {
        setFeedback({ type: "error", message: json.message || "Failed to load referrals data." });
      }
    } catch (err: any) {
      console.error("Fetch referrals error:", err);
      setFeedback({ type: "error", message: "Network error loading referrals." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferrals();
  }, []);

  const handleUpdateReward = async (amountToSet: number) => {
    const validAmount = Math.max(20, Math.min(150, Math.round(Number(amountToSet))));
    setUpdatingReward(true);
    try {
      const res = await fetch("/api/admin/referrals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rewardAmount: validAmount }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setFeedback({ type: "success", message: `Referral payout rate updated to ₹${validAmount} per qualified 1st shift!` });
        setSelectedReward(validAmount);
        setShowRewardModal(false);
        fetchReferrals();
      } else {
        setFeedback({ type: "error", message: json.message || "Failed to update reward rate." });
      }
    } catch (err) {
      console.error("Reward rate update error:", err);
      setFeedback({ type: "error", message: "Network error updating reward rate." });
    } finally {
      setUpdatingReward(false);
    }
  };

  const openSettleReferrerModal = (referrer: any) => {
    setSettlingReferrer(referrer);
    setSettlingReferralItem(null);
    setCustomPayoutAmount(referrer.unpaidBalance ? String(referrer.unpaidBalance) : "0");
    setPaidReference("");
    setPayoutNotes("");
    setSendEmailOnSettle(true);
  };

  const openSettleReferralItemModal = (item: any, dynamicAmount?: string | number) => {
    setSettlingReferralItem(item);
    setSettlingReferrer(null);
    const itemKey = item.referralId || item.id;
    const initialAmt =
      dynamicAmount !== undefined && dynamicAmount !== ""
        ? String(dynamicAmount)
        : getItemAmount(itemKey, item.rewardAmount || metrics?.rewardPerReferral || 50);
    setCustomPayoutAmount(initialAmt);
    setPaidReference("");
    setPayoutNotes("");
    setSendEmailOnSettle(true);
  };

  const closeSettleModal = () => {
    setSettlingReferrer(null);
    setSettlingReferralItem(null);
    setPaidReference("");
    setPayoutNotes("");
  };

  const handleCopyUpi = (upi: string) => {
    if (!upi || upi === "Not Provided" || upi === "N/A") return;
    navigator.clipboard.writeText(upi);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleCopyPhone = (phone: string) => {
    if (!phone || phone === "N/A") return;
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  // Instant 1-Click Direct Settlement
  const handleDirectSettleItem = async (friendOrLedgerItem: any, dynamicAmount?: string | number) => {
    const itemKey = friendOrLedgerItem.referralId || friendOrLedgerItem.id;
    const targetAmt = Number(
      dynamicAmount !== undefined && dynamicAmount !== ""
        ? dynamicAmount
        : getItemAmount(itemKey, friendOrLedgerItem.rewardAmount || 50)
    );

    if (!targetAmt || targetAmt <= 0) {
      setFeedback({ type: "error", message: "Please specify a valid reward amount (min ₹1)." });
      return;
    }

    setSettlingDirectId(itemKey);
    try {
      const res = await fetch("/api/admin/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referralId: itemKey,
          amount: targetAmt,
          customRewardAmount: targetAmt,
          sendEmail: true,
          paidReference: "Direct Offline UPI Settlement",
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setFeedback({
          type: "success",
          message: `🎉 Payout of ₹${targetAmt} marked as PAID & celebratory email sent to student!`,
        });

        // Update selectedReferrerDetail locally in-memory if modal is currently open
        if (selectedReferrerDetail) {
          setSelectedReferrerDetail((prev: any) => {
            if (!prev) return prev;
            const updatedFriends = (prev.referredFriends || []).map((f: any) =>
              f.referralId === itemKey || f.id === itemKey
                ? { ...f, referralStatus: "PAID", rewardAmount: targetAmt }
                : f
            );
            return {
              ...prev,
              unpaidBalance: Math.max(0, (prev.unpaidBalance || 0) - targetAmt),
              paidBalance: (prev.paidBalance || 0) + targetAmt,
              paidCount: (prev.paidCount || 0) + 1,
              qualifiedCount: Math.max(0, (prev.qualifiedCount || 1) - 1),
              referredFriends: updatedFriends,
            };
          });
        }
        fetchReferrals();
      } else {
        setFeedback({ type: "error", message: json.message || "Failed to record payout settlement." });
      }
    } catch (err: any) {
      console.error("Direct payout settlement error:", err);
      setFeedback({ type: "error", message: "Network error processing payout settlement." });
    } finally {
      setSettlingDirectId(null);
    }
  };

  const handleConfirmSettlement = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const amount = Number(customPayoutAmount);
    if (!amount || amount <= 0) {
      setFeedback({ type: "error", message: "Please enter a valid payout amount (min ₹1)." });
      return;
    }

    setSettlingLoading(true);
    try {
      const targetItemKey = settlingReferralItem ? (settlingReferralItem.referralId || settlingReferralItem.id) : null;
      const payload: any = {
        amount,
        customRewardAmount: amount,
        paidReference: paidReference.trim() || undefined,
        payoutNotes: payoutNotes.trim() || undefined,
        sendEmail: sendEmailOnSettle,
      };

      if (settlingReferrer) {
        payload.referrerId = settlingReferrer.id;
      } else if (settlingReferralItem) {
        payload.referralId = targetItemKey;
      }

      const res = await fetch("/api/admin/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setFeedback({
          type: "success",
          message: `🎉 Payout of ₹${amount} successfully settled & marked as PAID! Email notification sent.`,
        });

        // Update selectedReferrerDetail locally in-memory if modal is open
        if (selectedReferrerDetail && targetItemKey) {
          setSelectedReferrerDetail((prev: any) => {
            if (!prev) return prev;
            const updatedFriends = (prev.referredFriends || []).map((f: any) =>
              f.referralId === targetItemKey || f.id === targetItemKey
                ? { ...f, referralStatus: "PAID", rewardAmount: amount }
                : f
            );
            return {
              ...prev,
              unpaidBalance: Math.max(0, (prev.unpaidBalance || 0) - amount),
              paidBalance: (prev.paidBalance || 0) + amount,
              paidCount: (prev.paidCount || 0) + 1,
              qualifiedCount: Math.max(0, (prev.qualifiedCount || 1) - 1),
              referredFriends: updatedFriends,
            };
          });
        }

        setSettlingReferrer(null);
        setSettlingReferralItem(null);
        fetchReferrals();
      } else {
        setFeedback({ type: "error", message: json.message || "Failed to record payout settlement." });
      }
    } catch (err: any) {
      console.error("Payout settlement error:", err);
      setFeedback({ type: "error", message: "Network error processing payout settlement." });
    } finally {
      setSettlingLoading(false);
    }
  };

  // Handler for sending individual referral reminder email
  const handleSendIndividualReminder = async (referrer: any) => {
    try {
      setSendingReminderId(referrer.id);
      const res = await fetch("/api/admin/referrals/remind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referrerId: referrer.id }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setFeedback({
          type: "success",
          message: `🚀 Referral reminder email sent to ${referrer.name} (${referrer.email || "email"}) with code ${referrer.referralCode}!`,
        });
        await fetchReferrals();
      } else {
        setFeedback({ type: "error", message: json.message || "Failed to send reminder email." });
      }
    } catch (err: any) {
      console.error("Reminder email error:", err);
      setFeedback({ type: "error", message: "Network error sending reminder email." });
    } finally {
      setSendingReminderId(null);
    }
  };

  // Handler for sending bulk broadcast reminder email to all inactive referrers
  const handleSendBulkReminder = async () => {
    try {
      setBroadcasting(true);
      const res = await fetch("/api/admin/referrals/remind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: "ALL_INACTIVE" }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setFeedback({ type: "success", message: `🚀 Success! ${json.message}` });
        setShowBroadcastModal(false);
        await fetchReferrals();
      } else {
        setFeedback({ type: "error", message: json.message || "Failed to send broadcast emails." });
      }
    } catch (err: any) {
      console.error("Broadcast error:", err);
      setFeedback({ type: "error", message: "Network error sending broadcast emails." });
    } finally {
      setBroadcasting(false);
    }
  };

  // Handler for sending progress milestone notification email to the student referrer
  const handleSendProgressNudge = async (
    friend: any,
    nudgeType: "ASK_FRIEND_APPLY" | "FRIEND_APPLIED" | "REFERRAL_QUALIFIED"
  ) => {
    if (!selectedReferrerDetail) return;
    const nudgeKey = `${selectedReferrerDetail.id}_${friend.id || friend.referralId}_${nudgeType}`;
    setSendingProgressNudgeId(nudgeKey);
    try {
      const res = await fetch("/api/admin/referrals/notify-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referrerId: selectedReferrerDetail.id,
          refereeId: friend.id,
          referralId: friend.referralId,
          nudgeType,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setFeedback({
          type: "success",
          message: `🚀 ${json.message}`,
        });
        // Optimistically update selectedReferrerDetail in memory
        setSelectedReferrerDetail((prev: any) => {
          if (!prev) return prev;
          const nowIso = new Date().toISOString();
          const updatedFriends = (prev.referredFriends || []).map((f: any) => {
            if ((f.id && f.id === friend.id) || (f.referralId && f.referralId === friend.referralId)) {
              const existingLogs = Array.isArray(f.progressEmailLogs) ? f.progressEmailLogs : [];
              const templateTitle =
                nudgeType === "REFERRAL_QUALIFIED"
                  ? "Referral Completion & Reward Unlocked Notice"
                  : nudgeType === "ASK_FRIEND_APPLY"
                  ? "Referral Progress Nudge (Ask to Apply)"
                  : "Referral Progress Notice (Friend Applied)";
              const emailSubject =
                nudgeType === "REFERRAL_QUALIFIED"
                  ? `🎉 Referral Reward Unlocked for inviting ${friend.name}`
                  : nudgeType === "ASK_FRIEND_APPLY"
                  ? `Ask ${friend.name} to Apply`
                  : `${friend.name} Applied`;

              return {
                ...f,
                lastProgressEmailSentAt: nowIso,
                lastProgressEmailType: nudgeType,
                progressEmailsCount: (f.progressEmailsCount || 0) + 1,
                progressEmailLogs: [
                  {
                    id: `log-${Date.now()}`,
                    templateName: templateTitle,
                    subject: emailSubject,
                    sentAt: nowIso,
                  },
                  ...existingLogs,
                ],
              };
            }
            return f;
          });
          return {
            ...prev,
            totalEmailsSent: (prev.totalEmailsSent || 0) + 1,
            lastEmailSentAt: nowIso,
            referredFriends: updatedFriends,
          };
        });
        // Refresh background state
        fetchReferrals();
      } else {
        setFeedback({
          type: "error",
          message: json.message || "Failed to send progress notification email.",
        });
      }
    } catch (err: any) {
      console.error("Progress notification error:", err);
      setFeedback({ type: "error", message: "Network error sending notification." });
    } finally {
      setSendingProgressNudgeId(null);
    }
  };

  // Inactive Referrers (0 invited friends)
  const inactiveReferrers = useMemo(() => {
    if (!data?.referrers) return [];
    return data.referrers.filter((r: any) => (r.totalInvited || 0) === 0);
  }, [data]);

  // Filtered referrers list
  const filteredReferrers = useMemo(() => {
    if (!data?.referrers) return [];
    return data.referrers.filter((r: any) => {
      const q = searchTerm.toLowerCase();
      const referredMatch = (r.referredFriends || []).some(
        (f: any) =>
          f.name?.toLowerCase().includes(q) ||
          f.phone?.toLowerCase().includes(q) ||
          f.registrationNumber?.toLowerCase().includes(q) ||
          f.applications?.some((a: any) => a.event?.name?.toLowerCase().includes(q))
      );

      const matchesSearch =
        r.name?.toLowerCase().includes(q) ||
        r.phone?.toLowerCase().includes(q) ||
        r.upiId?.toLowerCase().includes(q) ||
        r.referralCode?.toLowerCase().includes(q) ||
        r.registrationNumber?.toLowerCase().includes(q) ||
        referredMatch;

      if (!matchesSearch) return false;

      if (statusFilter === "ZERO_INVITED") return (r.totalInvited || 0) === 0;
      if (statusFilter === "UNPAID") return r.unpaidBalance > 0;
      if (statusFilter === "PAID") return r.paidCount > 0;
      if (statusFilter === "ACTIVE") return r.totalInvited > 0;
      if (statusFilter === "WITH_APPS") {
        return (r.referredFriends || []).some((f: any) => f.applicationsCount > 0);
      }
      if (statusFilter === "NO_APPS") {
        return r.totalInvited > 0 && (r.referredFriends || []).every((f: any) => f.applicationsCount === 0);
      }

      return true;
    });
  }, [data, searchTerm, statusFilter]);

  // Filtered ledger list
  const filteredLedger = useMemo(() => {
    if (!data?.ledger) return [];
    return data.ledger.filter((item: any) => {
      const q = searchTerm.toLowerCase();
      const appMatch = (item.referee?.applications || []).some(
        (a: any) => a.event?.name?.toLowerCase().includes(q) || a.status?.toLowerCase().includes(q)
      );

      const matchesSearch =
        item.referrer?.name?.toLowerCase().includes(q) ||
        item.referrer?.phone?.toLowerCase().includes(q) ||
        item.referee?.name?.toLowerCase().includes(q) ||
        item.referee?.phone?.toLowerCase().includes(q) ||
        item.codeUsed?.toLowerCase().includes(q) ||
        item.paidReference?.toLowerCase().includes(q) ||
        appMatch;

      if (!matchesSearch) return false;

      if (statusFilter === "ALL") return true;
      if (statusFilter === "WITH_APPS") return (item.referee?.applicationsCount || 0) > 0;
      if (statusFilter === "NO_APPS") return (item.referee?.applicationsCount || 0) === 0;
      return item.status === statusFilter;
    });
  }, [data, searchTerm, statusFilter]);

  const metrics = data?.metrics || {
    totalCodesCreated: 0,
    totalReferrals: 0,
    pendingCount: 0,
    qualifiedCount: 0,
    paidCount: 0,
    pendingPayoutAmount: 0,
    settledPayoutAmount: 0,
    totalEarningsGenerated: 0,
    rewardPerReferral: 50,
  };

  const rewardPresets = [20, 25, 50, 75, 100, 150];

  return (
    <div className="space-y-6 text-slate-900">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-wider text-red-600 uppercase font-sans">
              Referrals & Offline Payouts
            </h1>
            <button
              onClick={() => setShowRewardModal(true)}
              className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer active:scale-95"
              title="Click to change active referral payout reward"
            >
              <Gift className="w-3.5 h-3.5 text-red-600" />
              <span>₹{metrics.rewardPerReferral || 50} / Active Payout</span>
              <Settings className="w-3 h-3 text-red-500" />
            </button>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Track student invitation codes, verify referred student event applications, and record offline UPI payout settlements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowRewardModal(true)}
            className="bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold px-3.5 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Banknote className="w-4 h-4" />
            <span>Set Reward Rate</span>
          </button>

          <Link
            href="/admin/settings"
            className="bg-white hover:bg-slate-100 text-slate-700 font-bold px-3.5 py-2.5 rounded-xl text-xs transition border border-slate-300 flex items-center gap-1.5 shadow-xs"
          >
            <Settings className="w-4 h-4 text-slate-500" />
            <span>Settings</span>
          </Link>

          <button
            onClick={fetchReferrals}
            disabled={loading}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-2.5 rounded-xl text-xs transition border border-slate-300 flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* STRATEGY & CAMPAIGN SPOTLIGHT BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-red-950 rounded-2xl p-4 sm:p-5 text-white shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="bg-red-500/20 text-red-300 border border-red-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-red-400" />
              Referral Campaign Strategy
            </span>
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
              Promotion: Up to ₹150 / Friend
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-black tracking-tight text-white !text-white">
            Marketing Campaign: "Earn Up to ₹150 by Inviting Friends"
          </h2>
          <p className="text-xs text-slate-300">
            Students see the promotional headline across their profile and share links. As admin, you control the active base payout rate (min ₹20 to max ₹150) currently set at <strong className="text-red-400 font-black">₹{metrics.rewardPerReferral || 50}</strong> per verified 1st event shift.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 bg-white/5 p-2 rounded-xl border border-white/10">
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mr-1">Quick Presets:</span>
          {rewardPresets.map((amt) => (
            <button
              key={amt}
              onClick={() => handleUpdateReward(amt)}
              disabled={updatingReward || metrics.rewardPerReferral === amt}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                metrics.rewardPerReferral === amt
                  ? "bg-red-600 text-white shadow-xs"
                  : "bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white"
              }`}
            >
              ₹{amt}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-between shadow-md animate-in fade-in ${
            feedback.type === "success" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
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
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 5 KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Codes Created</p>
            <Gift className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">{metrics.totalCodesCreated}</p>
          <p className="text-[10px] text-slate-400">Students with unique links</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Referred</p>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">{metrics.totalReferrals}</p>
          <p className="text-[10px] text-slate-400">Registrations via code</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Qualified (1st Event Done)</p>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-600">{metrics.qualifiedCount}</p>
          <p className="text-[10px] text-emerald-600 font-bold">Unclaimed / Payable</p>
        </div>

        <div className="bg-amber-50/80 p-4 sm:p-5 rounded-2xl border border-amber-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Pending Payouts</p>
            <Banknote className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-700">₹{metrics.pendingPayoutAmount}</p>
          <p className="text-[10px] text-amber-800 font-bold">Requires Admin UPI Transfer</p>
        </div>

        <div className="bg-emerald-50/80 p-4 sm:p-5 rounded-2xl border border-emerald-200 shadow-xs space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Settled Payouts</p>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-700">₹{metrics.settledPayoutAmount}</p>
          <p className="text-[10px] text-emerald-700 font-bold">{metrics.paidCount} referral rewards paid</p>
        </div>
      </div>

      {/* Control Bar: View Switcher, Search, Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Left: View Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveView("referrers")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeView === "referrers"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Users className="w-3.5 h-3.5 text-red-600" />
            <span>Referrer Summary ({data?.referrers?.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveView("ledger")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeView === "ledger"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Award className="w-3.5 h-3.5 text-purple-600" />
            <span>Detailed Referral Ledger ({data?.ledger?.length || 0})</span>
          </button>
        </div>

        {/* Right: Search & Status Filter */}
        <div className="flex items-center gap-2.5 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by student, friend, event, phone, code..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20 transition"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-bold focus:outline-none focus:border-red-600 transition cursor-pointer"
          >
            {activeView === "referrers" ? (
              <>
                <option value="ALL">All Referrers</option>
                <option value="ZERO_INVITED">0 Referrals (Inactive - Needs Boost)</option>
                <option value="UNPAID">Has Unpaid (Pending ₹)</option>
                <option value="PAID">Has Settled Payouts</option>
                <option value="ACTIVE">Active (1+ Invited)</option>
                <option value="WITH_APPS">Has Event Applications</option>
                <option value="NO_APPS">No Applications Yet</option>
              </>
            ) : (
              <>
                <option value="ALL">All Statuses</option>
                <option value="PENDING">PENDING (Awaiting 1st Event)</option>
                <option value="QUALIFIED">QUALIFIED (Reward Unlocked)</option>
                <option value="PAID">PAID (Settled)</option>
                <option value="WITH_APPS">Has Event Applications</option>
                <option value="NO_APPS">No Applications Yet</option>
              </>
            )}
          </select>
        </div>
      </div>

      {/* INACTIVE REFERRERS BOOST CAMPAIGN BANNER */}
      {inactiveReferrers.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-extrabold text-amber-950">
                  {inactiveReferrers.length} Student{inactiveReferrers.length > 1 ? "s" : ""} Created Referral Codes with 0 Referrals
                </h3>
                <span className="bg-amber-200/80 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Needs Boost
                </span>
              </div>
              <p className="text-xs text-amber-800/90 mt-0.5">
                Send an engaging referral activation nudge email with their unique code, signup link, and ₹150 earnings reminder.
              </p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {metrics.lastBroadcastSentAt ? (
                  <span className="inline-flex items-center gap-1.5 bg-amber-100/90 text-amber-950 px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-amber-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Last Campaign: {formatSentTime(metrics.lastBroadcastSentAt)} ({metrics.lastBroadcastCount || inactiveReferrers.length} delivered)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-amber-800/90 text-[11px] font-medium">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>No bulk reminder campaign dispatched yet</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowBroadcastModal(true)}
              className="bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-xs cursor-pointer transition"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Email All Inactive ({inactiveReferrers.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* VIEW 1: REFERRER SUMMARY & PAYOUT MANAGEMENT TABLE */}
      {activeView === "referrers" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Referrer Leaderboard & Payout Targets
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              Showing {filteredReferrers.length} student referrers (Click on any referrer to see referred friends)
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs font-bold text-slate-500">Loading referral directory...</p>
            </div>
          ) : filteredReferrers.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-1 text-sm">
              <p className="font-bold">No referrers found matching your filter criteria.</p>
              <p className="text-xs">Once students generate referral codes in their profile, they will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 uppercase tracking-wider text-[11px] border-b border-slate-200">
                    <th className="p-3.5">Referrer Name & Email Status</th>
                    <th className="p-3.5">Phone & Reg No.</th>
                    <th className="p-3.5">Referral Code</th>
                    <th className="p-3.5">Student UPI ID</th>
                    <th className="p-3.5 text-center">Invited Friends</th>
                    <th className="p-3.5 text-center">Qualified (Completed)</th>
                    <th className="p-3.5 text-center">Settled (Paid)</th>
                    <th className="p-3.5 text-right font-black">Unpaid Due (₹)</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReferrers.map((ref: any) => {
                    const hasUnpaid = ref.unpaidBalance > 0;
                    const hasUpi = ref.upiId && ref.upiId !== "Not Provided" && ref.upiId !== "N/A";
                    const totalInvited = ref.totalInvited || 0;

                    return (
                      <tr key={ref.id} className="hover:bg-slate-50/70 transition group">
                        <td className="p-3.5 font-bold text-slate-900">
                          <div className="space-y-1">
                            <button
                              type="button"
                              onClick={() => setSelectedReferrerDetail(ref)}
                              className="text-left font-bold text-slate-900 hover:text-red-600 transition flex items-center gap-1.5 cursor-pointer"
                              title="Click to view all friends referred by this student"
                            >
                              <span>{ref.name}</span>
                              <Eye className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition" />
                            </button>

                            {ref.lastEmailSentAt ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setEmailHistoryModalData({
                                    title: `Email Activity for ${ref.name}`,
                                    subtitle: `All automated & manual emails sent to ${ref.email}`,
                                    recipientName: ref.name,
                                    recipientEmail: ref.email,
                                    logs: ref.emailLogs || [],
                                  })
                                }
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2 py-0.5 rounded-full transition cursor-pointer"
                                title="Click to view full email communication history"
                              >
                                <Mail className="w-3 h-3 text-blue-600" />
                                <span>Emailed {formatSentTime(ref.lastEmailSentAt)} ({ref.totalEmailsSent || 1}x)</span>
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400">
                                <Clock className="w-3 h-3" />
                                <span>Never emailed</span>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5 text-slate-600">
                          <div className="font-mono text-[11px] font-bold text-slate-800 flex items-center gap-1">
                            <span>{ref.phone}</span>
                            {ref.phone !== "N/A" && (
                              <button
                                type="button"
                                onClick={() => handleCopyPhone(ref.phone)}
                                className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                                title="Copy phone number"
                              >
                                {copiedPhone === ref.phone ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">{ref.registrationNumber}</div>
                        </td>
                        <td className="p-3.5 font-mono font-bold text-red-600">
                          <span className="bg-red-50 px-2 py-0.5 rounded border border-red-200">
                            {ref.referralCode || "NONE"}
                          </span>
                        </td>
                        <td className="p-3.5">
                          {hasUpi ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                {ref.upiId}
                              </span>
                              <button
                                onClick={() => handleCopyUpi(ref.upiId)}
                                className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-200 transition cursor-pointer"
                                title="Copy UPI ID"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[10px] font-bold">
                              No UPI Setup Yet
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedReferrerDetail(ref)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-extrabold text-xs transition cursor-pointer shadow-2xs active:scale-95 ${
                              totalInvited > 0
                                ? "bg-red-50 hover:bg-red-100 text-red-700 border border-red-200"
                                : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
                            }`}
                            title="Click to inspect all referred students and event applications"
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>{totalInvited} Invited</span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                          </button>
                        </td>
                        <td className="p-3.5 text-center">
                          <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                            {ref.qualifiedCount}
                          </span>
                        </td>
                        <td className="p-3.5 text-center text-slate-500 font-medium">{ref.paidCount}</td>
                        <td className="p-3.5 text-right font-black">
                          {hasUnpaid ? (
                            <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-1 rounded-lg text-xs">
                              ₹{ref.unpaidBalance}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal">₹0</span>
                          )}
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {totalInvited === 0 && (
                              <button
                                type="button"
                                disabled={sendingReminderId === ref.id}
                                onClick={() => handleSendIndividualReminder(ref)}
                                className={`font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 text-xs cursor-pointer active:scale-95 disabled:opacity-50 ${
                                  ref.lastReminderSentAt
                                    ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300"
                                    : "bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300"
                                }`}
                                title={
                                  ref.lastReminderSentAt
                                    ? `Last reminded: ${formatSentTime(ref.lastReminderSentAt)}. Click to send another reminder email.`
                                    : `Send referral activation reminder email to ${ref.name}`
                                }
                              >
                                {sendingReminderId === ref.id ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
                                ) : ref.lastReminderSentAt ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Mail className="w-3.5 h-3.5 text-amber-600" />
                                )}
                                <span>
                                  {sendingReminderId === ref.id
                                    ? "Sending..."
                                    : ref.lastReminderSentAt
                                    ? `Reminded (${formatSentTime(ref.lastReminderSentAt)})`
                                    : "Nudge Code"}
                                </span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setSelectedReferrerDetail(ref)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1 text-xs cursor-pointer"
                              title="View referred students and event status"
                            >
                              <Eye className="w-3.5 h-3.5 text-blue-600" />
                              <span>View Friends</span>
                            </button>

                            {hasUnpaid ? (
                              <button
                                type="button"
                                onClick={() => openSettleReferrerModal(ref)}
                                className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold px-3 py-1.5 rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>Settle ₹{ref.unpaidBalance}</span>
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: DETAILED REFERRAL LEDGER */}
      {activeView === "ledger" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Individual Referral Attributions Ledger
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              Showing {filteredLedger.length} referral records
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs font-bold text-slate-500">Loading ledger records...</p>
            </div>
          ) : filteredLedger.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-1 text-sm">
              <p className="font-bold">No ledger records found.</p>
              <p className="text-xs">Try clearing search filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/80">
                    <th className="p-3.5">Referrer (Partner)</th>
                    <th className="p-3.5">Referee (Friend)</th>
                    <th className="p-3.5">Event Applications</th>
                    <th className="p-3.5">Code Used</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Reward</th>
                    <th className="p-3.5">Qualifying Event</th>
                    <th className="p-3.5">Joined Date</th>
                    <th className="p-3.5">Settlement Info</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredLedger.map((row: any) => {
                    const isPaid = row.status === "PAID";
                    const isQualified = row.status === "QUALIFIED";
                    const isPending = row.status === "PENDING";
                    const refereeApps = row.referee?.applications || [];

                    return (
                      <tr key={row.id} className="hover:bg-slate-50/70 transition">
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{row.referrer?.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{row.referrer?.phone}</div>
                          <div className="text-[10px] text-slate-400 font-mono">UPI: {row.referrer?.upiId || "N/A"}</div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{row.referee?.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            <span>{row.referee?.phone}</span>
                            <span> • {row.referee?.registrationNumber}</span>
                          </div>
                          {row.referee?.university && (
                            <div className="text-[10px] text-slate-400 truncate max-w-[180px]">
                              {row.referee.university}
                            </div>
                          )}
                          {row.referee?.phone && row.referee?.phone !== "N/A" && (
                            <div className="mt-0.5">
                              <a
                                href={`https://wa.me/91${row.referee.phone.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1 text-[10px]"
                                title="Open WhatsApp chat with student"
                              >
                                <MessageSquare className="w-3 h-3" />
                                <span>WhatsApp</span>
                              </a>
                            </div>
                          )}
                        </td>
                        {/* Event Applications Column */}
                        <td className="p-3.5">
                          {refereeApps.length > 0 ? (
                            <div className="space-y-1 max-w-xs">
                              <span className="font-extrabold text-[10.5px] text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md inline-block">
                                {refereeApps.length} Event{refereeApps.length > 1 ? "s" : ""} Applied
                              </span>
                              <div className="text-[10.5px] text-slate-600 space-y-0.5">
                                {refereeApps.slice(0, 2).map((app: any, idx: number) => (
                                  <div key={app.id || idx} className="truncate flex items-center gap-1">
                                    <span className="font-medium text-slate-800 truncate max-w-[130px]" title={app.event?.name}>
                                      • {app.event?.name || "Event"}:
                                    </span>
                                    <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-extrabold ${
                                      app.status === "SELECTED" || app.status === "CONFIRMED"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : app.status === "ATTENDED"
                                        ? "bg-purple-100 text-purple-800"
                                        : app.status === "CANCELLED"
                                        ? "bg-rose-100 text-rose-800"
                                        : "bg-slate-100 text-slate-700"
                                    }`}>
                                      {app.status}
                                    </span>
                                  </div>
                                ))}
                                {refereeApps.length > 2 && (
                                  <span className="text-[10px] text-slate-400 block font-medium">
                                    +{refereeApps.length - 2} more application(s)
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-0.5">
                              <span className="text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md text-[10.5px] font-bold inline-block">
                                No Applications Yet
                              </span>
                              <div className="text-[10px] text-slate-400">Registered via code only</div>
                            </div>
                          )}
                        </td>
                        <td className="p-3.5 font-mono font-bold text-red-600">
                          <span className="bg-red-50 px-2 py-0.5 rounded border border-red-200">{row.codeUsed}</span>
                        </td>
                        <td className="p-3.5">
                          {isPending && (
                            <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit">
                              <Clock className="w-3 h-3 text-amber-600" /> PENDING
                            </span>
                          )}
                          {isQualified && (
                            <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 w-fit">
                              <Sparkles className="w-3 h-3 text-emerald-600" /> QUALIFIED (Payable)
                            </span>
                          )}
                          {isPaid && (
                            <span className="bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 w-fit">
                              <CheckCircle2 className="w-3 h-3 text-purple-600" /> PAID
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 font-bold text-slate-900">₹{row.rewardAmount}</td>
                        <td className="p-3.5 text-slate-600">
                          {row.qualifyingEvent ? (
                            <div>
                              <div className="font-bold text-slate-900">{row.qualifyingEvent.name}</div>
                              <div className="text-[10px] text-slate-400">
                                {new Date(row.qualifyingEvent.date).toLocaleDateString("en-GB")}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Not Yet Completed</span>
                          )}
                        </td>
                        <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                          {new Date(row.registeredAt).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="p-3.5">
                          {isPaid ? (
                            <div className="text-[10px]">
                              <span className="font-bold text-purple-900 block">{row.paidReference}</span>
                              <span className="text-slate-400 font-mono">
                                Paid on {new Date(row.paidAt).toLocaleDateString("en-GB")}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">-</span>
                          )}
                        </td>
                        <td className="p-3.5 text-right">
                          {!isPaid ? (
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-1">
                                <span className="text-[10px] font-bold text-slate-400 pl-1">₹</span>
                                <input
                                  type="number"
                                  min="1"
                                  value={getItemAmount(row.id, row.rewardAmount || metrics?.rewardPerReferral || 50)}
                                  onChange={(e) => setItemAmount(row.id, e.target.value)}
                                  className="w-14 px-1 py-0.5 bg-white border border-slate-300 rounded text-[11px] font-black text-slate-900 focus:outline-none focus:border-emerald-600 text-center"
                                  title="Custom payout amount"
                                />
                              </div>

                              <button
                                type="button"
                                disabled={settlingDirectId === row.id}
                                onClick={() =>
                                  handleDirectSettleItem(
                                    row,
                                    getItemAmount(row.id, row.rewardAmount || 50)
                                  )
                                }
                                className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold px-2.5 py-1.5 rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer text-xs disabled:opacity-50"
                                title="Instantly settle & send congratulatory email"
                              >
                                {settlingDirectId === row.id ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <CreditCard className="w-3.5 h-3.5" />
                                )}
                                <span>
                                  {settlingDirectId === row.id
                                    ? "Paying..."
                                    : `Settle ₹${getItemAmount(row.id, row.rewardAmount || metrics?.rewardPerReferral || 150)}`}
                                </span>
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  openSettleReferralItemModal(
                                    row,
                                    getItemAmount(row.id, row.rewardAmount || 50)
                                  )
                                }
                                className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs transition cursor-pointer"
                                title="Open full settlement options (UTR reference)"
                              >
                                <Settings className="w-3.5 h-3.5 text-slate-500" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-emerald-700 font-bold text-[11px] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md inline-block">
                              ✓ Paid ₹{row.rewardAmount}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* REFERRED FRIENDS INSPECTION MODAL */}
      {/* ---------------------------------------------------- */}
      {selectedReferrerDetail && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[88vh] shadow-2xl border border-slate-200 animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 duration-200">
            {/* Modal Header */}
            <div className="shrink-0 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400 font-black">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-white">
                    Referred Candidates of {selectedReferrerDetail.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-0.5">
                    <span>Code: {selectedReferrerDetail.referralCode}</span>
                    <span>•</span>
                    <span>UPI: {selectedReferrerDetail.upiId}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReferrerDetail(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Referrer Metric Summary Strip */}
            <div className="shrink-0 bg-slate-100 p-3 sm:p-4 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10.5px] font-bold text-slate-500 uppercase block">Total Invited</span>
                <span className="text-lg font-black text-slate-900">{selectedReferrerDetail.totalInvited || 0} Friends</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10.5px] font-bold text-slate-500 uppercase block">Applied to Events</span>
                <span className="text-lg font-black text-blue-700">
                  {(selectedReferrerDetail.referredFriends || []).filter((f: any) => f.applicationsCount > 0).length} Students
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10.5px] font-bold text-slate-500 uppercase block">Completed 1st Event</span>
                <span className="text-lg font-black text-emerald-600">
                  {selectedReferrerDetail.qualifiedCount + selectedReferrerDetail.paidCount} Qualified
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10.5px] font-bold text-slate-500 uppercase block">Unpaid Reward Due</span>
                <span className="text-lg font-black text-amber-700">₹{selectedReferrerDetail.unpaidBalance || 0}</span>
              </div>
            </div>

            {/* Referred Students List Body */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3.5 bg-slate-50">
              {(!selectedReferrerDetail.referredFriends || selectedReferrerDetail.referredFriends.length === 0) ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
                  <Users className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="font-bold text-slate-700 text-sm">No friends have registered with this code yet.</p>
                  <p className="text-xs text-slate-400">
                    Once friends enter code <code className="font-bold text-red-600">{selectedReferrerDetail.referralCode}</code> during signup, their details and event applications will appear here.
                  </p>
                </div>
              ) : (
                selectedReferrerDetail.referredFriends.map((friend: any, index: number) => {
                  const cleanFriendPhone = (friend.phone || "").replace(/\D/g, "");
                  const hasApplications = friend.applications && friend.applications.length > 0;
                  const isFriendPaid = friend.referralStatus === "PAID";

                  return (
                    <div
                      key={friend.referralId || friend.id || index}
                      className="bg-white rounded-2xl p-4 sm:p-4.5 border border-slate-200 shadow-2xs space-y-3 hover:border-slate-300 transition"
                    >
                      {/* Friend Identity & Contact Bar */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm sm:text-base font-extrabold text-slate-900">{friend.name}</h4>
                            <span className="text-[10.5px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                              {friend.registrationNumber || "NO REG"}
                            </span>
                            {friend.university && (
                              <span className="text-xs text-slate-500 font-medium truncate max-w-[200px]">
                                • {friend.university}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Signed up: {new Date(friend.registeredAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        </div>

                        {/* Status Badge & Contact & Settle Buttons */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {hasApplications && !isFriendPaid && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {friend.lastProgressEmailSentAt ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEmailHistoryModalData({
                                      title: `Progress Email History for ${friend.name}`,
                                      subtitle: `Emails sent to ${selectedReferrerDetail.name} (${selectedReferrerDetail.email}) regarding ${friend.name}`,
                                      recipientName: selectedReferrerDetail.name,
                                      recipientEmail: selectedReferrerDetail.email,
                                      logs: friend.progressEmailLogs || [],
                                    })
                                  }
                                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                                  title="Click to view sent notice timestamp and details"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Notice Sent ({formatSentTime(friend.lastProgressEmailSentAt)})</span>
                                </button>
                              ) : null}

                              {/* Progress / Completion Notice Button */}
                              {(() => {
                                const isFriendAttended =
                                  friend.status === "QUALIFIED" ||
                                  friend.status === "PAID" ||
                                  (friend.attendanceRecords && friend.attendanceRecords.some((a: any) => a.attendanceStatus === "PRESENT" || a.attendanceStatus === "LATE")) ||
                                  (friend.applications && friend.applications.some((app: any) => app.status === "ATTENDED" || (app.attendance && (app.attendance.attendanceStatus === "PRESENT" || app.attendance.attendanceStatus === "LATE"))));

                                const targetNudge = isFriendAttended ? "REFERRAL_QUALIFIED" : "FRIEND_APPLIED";
                                const isSendingThis = sendingProgressNudgeId === `${selectedReferrerDetail.id}_${friend.id || friend.referralId}_${targetNudge}`;

                                return (
                                  <button
                                    type="button"
                                    disabled={isSendingThis}
                                    onClick={() => handleSendProgressNudge(friend, targetNudge)}
                                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs active:scale-95 cursor-pointer disabled:opacity-50 ${
                                      isFriendAttended
                                        ? "bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-300"
                                        : "bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200"
                                    }`}
                                    title={
                                      isFriendAttended
                                        ? `Send reward unlocked congratulatory email to ${selectedReferrerDetail.name} (Friend attended shift, payout pending)`
                                        : `Send update email to ${selectedReferrerDetail.name} that ${friend.name} has applied for an event`
                                    }
                                  >
                                    {isSendingThis ? (
                                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-600" />
                                    ) : isFriendAttended ? (
                                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                                    ) : (
                                      <Send className="w-3.5 h-3.5 text-blue-600" />
                                    )}
                                    <span>
                                      {friend.lastProgressEmailSentAt
                                        ? isFriendAttended
                                          ? `Resend Reward Notice (${friend.progressEmailsCount || 1}x)`
                                          : `Resend Notice (${friend.progressEmailsCount || 1}x)`
                                        : isFriendAttended
                                        ? `🎉 Notify: Reward Unlocked (₹${friend.rewardAmount || metrics?.rewardPerReferral || 150})`
                                        : `Notify ${selectedReferrerDetail.name.split(" ")[0]}: Applied`}
                                    </span>
                                  </button>
                                );
                              })()}
                            </div>
                          )}

                          {isFriendPaid ? (
                            <span className="bg-purple-100 text-purple-800 border border-purple-300 px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-2xs">
                              <CheckCircle2 className="w-4 h-4 text-purple-600" />
                              <span>Paid ₹{friend.rewardAmount || metrics?.rewardPerReferral || 150}</span>
                            </span>
                          ) : (
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Dynamic Amount Input & Quick Presets */}
                              <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-xl p-1.5">
                                <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider pl-1">₹</span>
                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={getItemAmount(friend.referralId || friend.id, friend.rewardAmount || metrics?.rewardPerReferral || 50)}
                                  onChange={(e) => setItemAmount(friend.referralId || friend.id, e.target.value)}
                                  className="w-16 sm:w-20 px-1.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-black text-slate-900 focus:outline-none focus:border-emerald-600 text-center shadow-2xs"
                                  placeholder="Amt"
                                  title="Enter custom payout amount for this referral (e.g. 110, 50)"
                                />
                                <div className="flex items-center gap-1">
                                  {[50, 100, 110, 150].map((presetAmt) => (
                                    <button
                                      key={presetAmt}
                                      type="button"
                                      onClick={() => setItemAmount(friend.referralId || friend.id, String(presetAmt))}
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-black transition cursor-pointer ${
                                        getItemAmount(friend.referralId || friend.id, friend.rewardAmount || 50) === String(presetAmt)
                                          ? "bg-emerald-600 text-white shadow-2xs"
                                          : "bg-white hover:bg-slate-200 text-slate-700 border border-slate-200"
                                      }`}
                                      title={`Set ₹${presetAmt}`}
                                    >
                                      {presetAmt}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <button
                                type="button"
                                disabled={settlingDirectId === (friend.referralId || friend.id)}
                                onClick={() =>
                                  handleDirectSettleItem(
                                    friend,
                                    getItemAmount(friend.referralId || friend.id, friend.rewardAmount || 50)
                                  )
                                }
                                className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer disabled:opacity-50"
                                title="Instantly mark as PAID & send celebratory email to student"
                              >
                                {settlingDirectId === (friend.referralId || friend.id) ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                                ) : (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                )}
                                <span>
                                  {settlingDirectId === (friend.referralId || friend.id)
                                    ? "Paying..."
                                    : `Mark Paid (₹${getItemAmount(friend.referralId || friend.id, friend.rewardAmount || 50)})`}
                                </span>
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  openSettleReferralItemModal(
                                    {
                                      referralId: friend.referralId,
                                      id: friend.referralId,
                                      name: friend.name,
                                      rewardAmount: Number(getItemAmount(friend.referralId || friend.id, friend.rewardAmount || 50)),
                                      referrer: selectedReferrerDetail,
                                    },
                                    getItemAmount(friend.referralId || friend.id, friend.rewardAmount || 50)
                                  )
                                }
                                className="p-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs flex items-center gap-1 transition cursor-pointer"
                                title="Open full settlement options (custom UTR / notes)"
                              >
                                <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                              </button>
                            </div>
                          )}

                          {friend.phone && friend.phone !== "N/A" && (
                            <div className="flex items-center gap-1">
                              <a
                                href={`tel:${friend.phone}`}
                                className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 transition"
                                title={`Call ${friend.phone}`}
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                              {cleanFriendPhone && (
                                <a
                                  href={`https://wa.me/91${cleanFriendPhone}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg bg-emerald-50 hover:bg-[#25D366] text-emerald-700 hover:text-white border border-emerald-200 transition"
                                  title="Open WhatsApp Chat"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 4-Step Milestone Stepper Tracker */}
                      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                        <div className="flex items-center justify-between text-[11px]">
                          {/* Step 1: Claimed */}
                          <div className="flex items-center gap-1.5 font-bold text-emerald-700">
                            <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                              ✓
                            </span>
                            <span>1. Claimed</span>
                          </div>

                          <div className={`h-0.5 flex-1 mx-2 rounded-full ${hasApplications ? "bg-emerald-400" : "bg-slate-200"}`} />

                          {/* Step 2: Applied */}
                          <div className={`flex items-center gap-1.5 font-bold ${hasApplications ? "text-emerald-700" : "text-slate-400"}`}>
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${hasApplications ? "bg-emerald-500 text-white" : "bg-white border border-slate-300 text-slate-400"}`}>
                              {hasApplications ? "✓" : "2"}
                            </span>
                            <span>2. Applied</span>
                          </div>

                          <div className={`h-0.5 flex-1 mx-2 rounded-full ${friend.referralStatus === "QUALIFIED" || friend.referralStatus === "PAID" || (friend.applications || []).some((a: any) => a.attendanceStatus === "PRESENT" || a.attendanceStatus === "LATE") ? "bg-emerald-400" : "bg-slate-200"}`} />

                          {/* Step 3: Present */}
                          {(() => {
                            const isAttended = friend.referralStatus === "QUALIFIED" || friend.referralStatus === "PAID" || (friend.applications || []).some((a: any) => a.attendanceStatus === "PRESENT" || a.attendanceStatus === "LATE");
                            return (
                              <div className={`flex items-center gap-1.5 font-bold ${isAttended ? "text-emerald-700" : "text-slate-400"}`}>
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${isAttended ? "bg-emerald-500 text-white" : "bg-white border border-slate-300 text-slate-400"}`}>
                                  {isAttended ? "✓" : "3"}
                                </span>
                                <span>3. Present</span>
                              </div>
                            );
                          })()}

                          <div className={`h-0.5 flex-1 mx-2 rounded-full ${isFriendPaid ? "bg-emerald-400" : "bg-slate-200"}`} />

                          {/* Step 4: Paid */}
                          <div className={`flex items-center gap-1.5 font-bold ${isFriendPaid ? "text-emerald-700" : "text-slate-400"}`}>
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${isFriendPaid ? "bg-emerald-500 text-white" : "bg-white border border-slate-300 text-slate-400"}`}>
                              {isFriendPaid ? "✓" : "4"}
                            </span>
                            <span>4. Paid</span>
                          </div>
                        </div>
                      </div>

                      {/* Event Applications Section */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                            <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                            <span>Event Applications ({friend.applications?.length || 0})</span>
                          </span>
                          {hasApplications ? (
                            <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              Active Candidate
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              Registered Only
                            </span>
                          )}
                        </div>

                        {hasApplications ? (
                          <div className="space-y-2">
                            {friend.applications.map((app: any) => (
                              <div
                                key={app.id}
                                className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                              >
                                <div className="space-y-0.5">
                                  <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                                    <span>{app.event?.name || "Topline Event"}</span>
                                    {app.event?.id && (
                                      <Link
                                        href={`/admin/events/${app.event.id}`}
                                        target="_blank"
                                        className="text-blue-600 hover:underline inline-flex items-center gap-0.5 text-[11px] font-bold ml-1"
                                      >
                                        <span>Roster</span>
                                        <ExternalLink className="w-3 h-3" />
                                      </Link>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-500 flex items-center gap-2">
                                    {app.event?.date && (
                                      <span className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3 text-slate-400" />
                                        {new Date(app.event.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                      </span>
                                    )}
                                    {app.event?.location && (
                                      <span className="flex items-center gap-1 truncate max-w-[150px]">
                                        <MapPin className="w-3 h-3 text-slate-400" />
                                        {app.event.location}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 flex-wrap">
                                  {/* Application Status Badge */}
                                  <span className={`px-2.5 py-1 rounded-lg text-xs font-extrabold shadow-2xs ${
                                    app.status === "SELECTED"
                                      ? "bg-emerald-600 text-white"
                                      : app.status === "CONFIRMED"
                                      ? "bg-teal-600 text-white"
                                      : app.status === "ATTENDED"
                                      ? "bg-purple-600 text-white"
                                      : app.status === "CANCELLED"
                                      ? "bg-rose-600 text-white"
                                      : app.status === "ON_HOLD"
                                      ? "bg-amber-600 text-white"
                                      : "bg-slate-800 text-white"
                                  }`}>
                                    {app.status}
                                  </span>

                                  {/* Attendance Badge if recorded */}
                                  {app.attendanceStatus && (
                                    <span className={`px-2 py-0.5 rounded text-[10.5px] font-bold border ${
                                      app.attendanceStatus === "PRESENT"
                                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                        : app.attendanceStatus === "LATE"
                                        ? "bg-amber-50 text-amber-800 border-amber-200"
                                        : app.attendanceStatus === "ABSENT"
                                        ? "bg-rose-50 text-rose-800 border-rose-200"
                                        : "bg-slate-100 text-slate-600 border-slate-200"
                                    }`}>
                                      Attendance: {app.attendanceStatus}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                            <div className="space-y-1.5">
                              <div className="flex items-start gap-2 text-amber-900">
                                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-extrabold block">Has not applied for any event yet</span>
                                  <p className="text-[11px] text-amber-800 mt-0.5">
                                    This student registered using {selectedReferrerDetail.name}&apos;s link but hasn&apos;t filled out an event application yet.
                                  </p>
                                </div>
                              </div>

                              {/* Live Email Status */}
                              <div className="flex items-center gap-2">
                                {friend.lastProgressEmailSentAt ? (
                                  <div className="inline-flex items-center gap-1.5 font-bold text-emerald-900 bg-emerald-100/90 border border-emerald-300 px-2.5 py-1 rounded-lg">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span>
                                      Push Email Sent • {formatSentTime(friend.lastProgressEmailSentAt)} ({friend.progressEmailsCount || 1}x sent)
                                    </span>
                                    {friend.progressEmailLogs && friend.progressEmailLogs.length > 0 && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setEmailHistoryModalData({
                                            title: `Push Email Logs for ${friend.name}`,
                                            subtitle: `Emails sent to ${selectedReferrerDetail.name} (${selectedReferrerDetail.email}) regarding ${friend.name}`,
                                            recipientName: selectedReferrerDetail.name,
                                            recipientEmail: selectedReferrerDetail.email,
                                            logs: friend.progressEmailLogs || [],
                                          })
                                        }
                                        className="ml-1 text-[11px] underline text-emerald-950 hover:text-black font-extrabold cursor-pointer"
                                      >
                                        View Log
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center gap-1.5 font-medium text-amber-800 bg-amber-100/60 border border-amber-200 px-2.5 py-1 rounded-lg text-[11px]">
                                    <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    <span>Push reminder email has not been sent yet</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap shrink-0">
                              <button
                                type="button"
                                disabled={sendingProgressNudgeId === `${selectedReferrerDetail.id}_${friend.id || friend.referralId}_ASK_FRIEND_APPLY`}
                                onClick={() => handleSendProgressNudge(friend, "ASK_FRIEND_APPLY")}
                                className={`px-3 py-1.5 rounded-xl font-extrabold flex items-center gap-1.5 transition shadow-xs cursor-pointer active:scale-95 disabled:opacity-50 text-white ${
                                  friend.lastProgressEmailSentAt
                                    ? "bg-amber-700 hover:bg-amber-800"
                                    : "bg-amber-600 hover:bg-amber-700"
                                }`}
                                title={`Send email to ${selectedReferrerDetail.name} asking them to push ${friend.name} to apply for an event`}
                              >
                                {sendingProgressNudgeId === `${selectedReferrerDetail.id}_${friend.id || friend.referralId}_ASK_FRIEND_APPLY` ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                                ) : (
                                  <Mail className="w-3.5 h-3.5 text-white" />
                                )}
                                <span>
                                  {friend.lastProgressEmailSentAt
                                    ? `Resend Push Email (${friend.progressEmailsCount || 1}x)`
                                    : `Email ${selectedReferrerDetail.name.split(" ")[0]}: Push Friend`}
                                </span>
                              </button>

                              {cleanFriendPhone && (
                                <a
                                  href={`https://wa.me/91${cleanFriendPhone}?text=${encodeURIComponent(
                                    `Hi ${friend.name || "there"}, we noticed you registered on Topline ODC! Check out our upcoming events and apply to start earning: https://toplineodc.co.in/events`
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold flex items-center gap-1.5 transition shrink-0 shadow-xs"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span>Invite to Apply</span>
                                </a>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="shrink-0 bg-slate-100 p-3 sm:p-4 border-t border-slate-200 flex items-center justify-between gap-2">
              <span className="text-xs text-slate-500 font-medium">
                Referral reward (₹{selectedReferrerDetail.unpaidBalance || metrics.rewardPerReferral}) unlocks automatically once any referred friend completes their 1st event.
              </span>
              <button
                type="button"
                onClick={() => setSelectedReferrerDetail(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-200 bg-white border border-slate-300 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* SETTLE OFFLINE PAYOUT MODAL */}
      {/* ---------------------------------------------------- */}
      {(settlingReferrer || settlingReferralItem) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 border border-slate-200 shadow-2xl space-y-5 relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-700 font-bold">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {settlingReferralItem
                      ? `Settle Referral: ${settlingReferralItem.name || settlingReferralItem.referee?.name || "Friend"}`
                      : "Settle Referral Payout"}
                  </h3>
                  <p className="text-xs text-slate-500">Record offline UPI payout and notify student</p>
                </div>
              </div>
              <button
                onClick={closeSettleModal}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Referrer Details Card */}
            {(() => {
              const bName =
                settlingReferrer?.name ||
                settlingReferralItem?.referrer?.name ||
                selectedReferrerDetail?.name ||
                "Student Partner";
              const bPhone =
                settlingReferrer?.phone ||
                settlingReferralItem?.referrer?.phone ||
                selectedReferrerDetail?.phone ||
                "N/A";
              const bUpi =
                settlingReferrer?.upiId ||
                settlingReferralItem?.referrer?.upiId ||
                selectedReferrerDetail?.upiId ||
                "Not Provided";
              const hasUpi = bUpi && bUpi !== "Not Provided" && bUpi !== "N/A";

              return (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400 font-bold uppercase">Beneficiary Student</span>
                      <p className="font-extrabold text-sm text-slate-900">{bName}</p>
                      <p className="text-xs text-slate-500 font-mono">{bPhone}</p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-slate-400 font-bold uppercase">Settlement Amount</span>
                      <p className="text-2xl font-black text-emerald-600">₹{customPayoutAmount || "0"}</p>
                      <p className="text-[10px] text-emerald-700 font-bold">
                        {settlingReferralItem
                          ? "Individual referral reward"
                          : `${settlingReferrer?.qualifiedCount || 1} eligible reward(s)`}
                      </p>
                    </div>
                  </div>

                  {/* UPI ID Strip */}
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Target UPI ID</span>
                      <p className="font-mono font-bold text-xs text-slate-900 truncate">{bUpi}</p>
                    </div>

                    {hasUpi && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopyUpi(bUpi)}
                          className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 cursor-pointer transition active:scale-95"
                        >
                          {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedUpi ? "Copied!" : "Copy UPI"}</span>
                        </button>

                        <a
                          href={`upi://pay?pa=${bUpi}&pn=${encodeURIComponent(
                            bName
                          )}&am=${customPayoutAmount || 25}&cu=INR&tn=Topline%20Referral%20Payout`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 transition active:scale-95"
                        >
                          <span>Pay in App</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            <form onSubmit={handleConfirmSettlement} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Custom Payout Amount (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 font-bold text-slate-400 text-sm">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={customPayoutAmount}
                    onChange={(e) => setCustomPayoutAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-3.5 py-2.5 text-sm font-black text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
                    placeholder="Enter reward amount (e.g. 25, 50, 100)"
                  />
                </div>
                <span className="text-[11px] text-slate-500 block">
                  You can customize the exact payout reward amount for this settlement.
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Payment Reference / UTR Number (Optional)
                </label>
                <input
                  type="text"
                  value={paidReference}
                  onChange={(e) => setPaidReference(e.target.value)}
                  placeholder="e.g. GPay UTR 429103948192 or Cash / Paytm"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Admin Internal Notes (Optional)
                </label>
                <input
                  type="text"
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                  placeholder="e.g. Paid via PhonePe by Shiva"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition"
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none bg-emerald-50/70 border border-emerald-200 p-3 rounded-xl">
                <input
                  type="checkbox"
                  checked={sendEmailOnSettle}
                  onChange={(e) => setSendEmailOnSettle(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                />
                <span>Send automated payment confirmation email to student referrer</span>
              </label>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeSettleModal}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={settlingLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <span>{settlingLoading ? "Recording..." : `Confirm Paid (₹${customPayoutAmount || "0"})`}</span>
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* REWARD RATE ADJUSTER MODAL */}
      {/* ---------------------------------------------------- */}
      {showRewardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-5 relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-600 font-bold">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Adjust Referral Reward</h3>
                  <p className="text-xs text-slate-500">Tune active payout per referee 1st shift</p>
                </div>
              </div>
              <button
                onClick={() => setShowRewardModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Campaign Rule Explanation */}
            <div className="bg-gradient-to-br from-red-50 to-pink-50 p-4 rounded-2xl border border-red-100 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-black text-red-900 uppercase">
                <Sparkles className="w-4 h-4 text-red-600" />
                <span>Strategy: "Earn Up to ₹150 / Friend"</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                The public marketing slogan shown to students is <strong>"Earn Up to ₹150"</strong>. You can dynamically adjust the actual base reward given per referral between <strong>₹20</strong> and <strong>₹150</strong> at any time.
              </p>
            </div>

            {/* Presets */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Quick Select Preset (₹)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {rewardPresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setSelectedReward(preset)}
                    className={`py-2 px-3 rounded-xl font-black text-xs transition border cursor-pointer ${
                      selectedReward === preset
                        ? "bg-red-600 text-white border-red-600 shadow-xs scale-102"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200"
                    }`}
                  >
                    ₹{preset} {preset === 20 ? "(Min)" : preset === 150 ? "(Max)" : ""}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Custom Reward Amount (₹20 to ₹150)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 font-bold text-slate-400 text-sm">₹</span>
                <input
                  type="number"
                  min="20"
                  max="150"
                  value={selectedReward}
                  onChange={(e) => setSelectedReward(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3.5 py-2.5 text-sm font-black text-slate-900 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20 transition"
                />
              </div>
              <p className="text-[10px] text-slate-500">Minimum: ₹20 • Maximum: ₹150 per completed 1st event.</p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRewardModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={updatingReward || selectedReward < 20 || selectedReward > 150}
                onClick={() => handleUpdateReward(selectedReward)}
                className="bg-red-600 hover:bg-red-700 active:scale-95 disabled:opacity-50 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <span>{updatingReward ? "Saving..." : `Set Payout to ₹${selectedReward}`}</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* BROADCAST REFERRAL REMINDER EMAIL MODAL */}
      {/* ---------------------------------------------------- */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 border border-slate-200 shadow-2xl space-y-5 relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-700 font-bold">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Send Referral Activation Nudge
                  </h3>
                  <p className="text-xs text-slate-500">Remind students to share their referral codes</p>
                </div>
              </div>
              <button
                onClick={() => setShowBroadcastModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Campaign Summary */}
            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  Target Audience: Inactive Referrers
                </span>
                <span className="bg-amber-200 text-amber-900 font-extrabold text-xs px-2.5 py-0.5 rounded-full">
                  {inactiveReferrers.length} Student{inactiveReferrers.length > 1 ? "s" : ""}
                </span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                These students generated a personal referral code on Topline ODC, but haven&apos;t referred any candidates yet.
              </p>
            </div>

            {/* Preview Email Template Box */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Email Content Preview
              </label>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2 text-slate-700">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-bold text-slate-900">Subject:</span>
                  <span className="text-slate-600">💸 Earn up to ₹150 cash! Your Topline referral code is ready</span>
                </div>
                <div className="space-y-1.5 text-slate-600 text-[11.5px] leading-relaxed pt-1">
                  <p><strong>Hi [Student Name],</strong></p>
                  <p>You created your Topline referral code, but haven&apos;t invited anyone yet!</p>
                  <div className="bg-white border border-slate-200 rounded-xl p-2.5 my-2 flex items-center justify-between">
                    <span className="font-mono font-black text-red-600 text-sm">[STUDENT_CODE]</span>
                    <span className="text-[10.5px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                      Earn up to ₹150 / Friend
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-500">
                    Includes direct registration link + 1-click WhatsApp share button + verified UPI handle.
                  </p>
                </div>
              </div>
            </div>

            {/* Inactive List Preview */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Recipients List ({inactiveReferrers.length}):
              </span>
              <div className="max-h-28 overflow-y-auto bg-slate-50 rounded-xl p-2.5 border border-slate-200 space-y-1 text-xs">
                {inactiveReferrers.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between text-[11px] text-slate-700 py-0.5 border-b border-slate-100 last:border-0">
                    <span className="font-bold truncate max-w-[180px]">{r.name}</span>
                    <span className="font-mono text-red-600 font-bold bg-red-50 px-1.5 py-0.2 rounded border border-red-200 text-[10px]">{r.referralCode}</span>
                    <span className="text-slate-400 font-mono text-[10px]">{r.phone}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowBroadcastModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={broadcasting || inactiveReferrers.length === 0}
                onClick={handleSendBulkReminder}
                className="bg-amber-600 hover:bg-amber-700 active:scale-95 disabled:opacity-50 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition shadow-md flex items-center gap-2 cursor-pointer"
              >
                {broadcasting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Broadcasting Emails...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send to All {inactiveReferrers.length} Students</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* EMAIL COMMUNICATION HISTORY & AUDIT MODAL */}
      {/* ---------------------------------------------------- */}
      {emailHistoryModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 border border-slate-200 shadow-2xl space-y-4 relative max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-700 font-bold">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">{emailHistoryModalData.title}</h3>
                  <p className="text-xs text-slate-500">{emailHistoryModalData.subtitle}</p>
                </div>
              </div>
              <button
                onClick={() => setEmailHistoryModalData(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2.5 pr-1">
              {(!emailHistoryModalData.logs || emailHistoryModalData.logs.length === 0) ? (
                <div className="p-8 text-center text-slate-400 text-xs font-semibold bg-slate-50 rounded-2xl border border-slate-100">
                  <Mail className="w-6 h-6 mx-auto mb-1.5 text-slate-300" />
                  <span>No recorded email dispatches found for this specific filter.</span>
                </div>
              ) : (
                emailHistoryModalData.logs.map((log: any, idx: number) => {
                  const formattedTime = new Date(log.sentAt).toLocaleString("en-GB", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  });

                  return (
                    <div
                      key={log.id || idx}
                      className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 space-y-1.5 text-xs shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold text-slate-900">{log.templateName || "Referral Notification"}</span>
                        <span className="text-[10.5px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Delivered</span>
                        </span>
                      </div>
                      <div className="text-slate-700 font-medium text-[11.5px] bg-white p-2 rounded-xl border border-slate-100">
                        {log.subject}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-200/60">
                        <span className="truncate max-w-[200px]">
                          To: {log.recipientEmail || emailHistoryModalData.recipientEmail || "Student"}
                        </span>
                        <span className="font-mono text-[10.5px] text-slate-400 shrink-0">{formattedTime}</span>
                      </div>
                      {log.openedAt && (
                        <div className="text-[10px] text-blue-600 font-bold flex items-center gap-1 pt-0.5">
                          <Eye className="w-3 h-3" />
                          <span>Opened {log.openCount || 1} time(s) • Last: {formatSentTime(log.openedAt)}</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setEmailHistoryModalData(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


