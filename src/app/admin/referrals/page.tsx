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

  // Payout Settlement Modal
  const [settlingReferrer, setSettlingReferrer] = useState<any>(null);
  const [paidReference, setPaidReference] = useState("");
  const [payoutNotes, setPayoutNotes] = useState("");
  const [settlingLoading, setSettlingLoading] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

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

  const handleCopyUpi = (upi: string) => {
    if (!upi || upi === "Not Provided" || upi === "N/A") return;
    navigator.clipboard.writeText(upi);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  const handleCopyPhone = (phone: string) => {
    if (!phone || phone === "N/A") return;
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    setTimeout(() => setCopiedPhone(null), 2500);
  };

  const handleSettlePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlingReferrer) return;

    setSettlingLoading(true);
    try {
      const res = await fetch("/api/admin/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referrerId: settlingReferrer.id,
          paidReference: paidReference.trim() || "Offline UPI Settlement",
          notes: payoutNotes.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setFeedback({ type: "success", message: json.message || "Payout settled successfully!" });
        setSettlingReferrer(null);
        setPaidReference("");
        setPayoutNotes("");
        fetchReferrals();
      } else {
        setFeedback({ type: "error", message: json.message || "Failed to settle payout." });
      }
    } catch (err: any) {
      console.error("Settlement error:", err);
      setFeedback({ type: "error", message: "Network error during settlement." });
    } finally {
      setSettlingLoading(false);
    }
  };

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
                    <th className="p-3.5">Referrer Name</th>
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
                          <button
                            type="button"
                            onClick={() => setSelectedReferrerDetail(ref)}
                            className="text-left font-bold text-slate-900 hover:text-red-600 transition flex items-center gap-1.5 cursor-pointer"
                            title="Click to view all friends referred by this student"
                          >
                            <span>{ref.name}</span>
                            <Eye className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition" />
                          </button>
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
                                onClick={() => setSettlingReferrer(ref)}
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
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 uppercase tracking-wider text-[11px] border-b border-slate-200">
                    <th className="p-3.5">Referrer (Inviter)</th>
                    <th className="p-3.5">Referred Student (Friend)</th>
                    <th className="p-3.5">Event Applications</th>
                    <th className="p-3.5">Code Used</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Reward Amount</th>
                    <th className="p-3.5">Qualifying Event</th>
                    <th className="p-3.5">Signup Date</th>
                    <th className="p-3.5">Settlement Info</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLedger.map((row: any) => {
                    const isPending = row.status === "PENDING";
                    const isQualified = row.status === "QUALIFIED";
                    const isPaid = row.status === "PAID";
                    const refereeApps = row.referee?.applications || [];

                    return (
                      <tr key={row.id} className="hover:bg-slate-50/60 transition">
                        <td className="p-3.5 font-bold text-slate-900">
                          <div>{row.referrer?.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{row.referrer?.phone} • {row.referrer?.upiId || "No UPI"}</div>
                        </td>
                        <td className="p-3.5 font-medium text-slate-800">
                          <div className="font-bold text-slate-900">{row.referee?.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                            <span>{row.referee?.phone}</span>
                            {row.referee?.phone && row.referee?.phone !== "N/A" && (
                              <a
                                href={`https://wa.me/91${row.referee.phone.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-600 hover:text-emerald-700"
                                title="Open WhatsApp chat with student"
                              >
                                <MessageSquare className="w-3 h-3" />
                              </a>
                            )}
                            <span>• {row.referee?.registrationNumber}</span>
                          </div>
                          {row.referee?.university && (
                            <div className="text-[10px] text-slate-400 truncate max-w-[180px]">
                              {row.referee.university}
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
                              <Clock className="w-3 h-3 text-amber-600" /> PENDING (Awaiting 1st Event)
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
                <div className="w-10 h-10 rounded-2xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 shadow-inner shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-extrabold text-white">
                      Referred Friends of {selectedReferrerDetail.name}
                    </h3>
                    <span className="bg-red-500/20 text-red-300 border border-red-400/30 px-2 py-0.5 rounded font-mono text-xs font-bold">
                      Code: {selectedReferrerDetail.referralCode}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Phone: {selectedReferrerDetail.phone} • UPI: {selectedReferrerDetail.upiId}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReferrerDetail(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
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

                        {/* Status Badge & Contact Buttons */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {friend.referralStatus === "QUALIFIED" ? (
                            <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                              <span>1st Event Done (₹{friend.rewardAmount} Due)</span>
                            </span>
                          ) : friend.referralStatus === "PAID" ? (
                            <span className="bg-purple-100 text-purple-800 border border-purple-300 px-2.5 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
                              <span>Reward Paid</span>
                            </span>
                          ) : (
                            <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              <span>Pending 1st Shift</span>
                            </span>
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
                            <div className="flex items-start gap-2 text-amber-900">
                              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-extrabold block">Has not applied for any event yet</span>
                                <p className="text-[11px] text-amber-800 mt-0.5">
                                  This student registered using {selectedReferrerDetail.name}&apos;s link but hasn&apos;t filled out an event application yet.
                                </p>
                              </div>
                            </div>

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
      {settlingReferrer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 border border-slate-200 shadow-2xl space-y-5 relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-700 font-bold">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Settle Referral Payout</h3>
                  <p className="text-xs text-slate-500">Record offline UPI payout to student</p>
                </div>
              </div>
              <button
                onClick={() => setSettlingReferrer(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Referrer Details Card */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-bold uppercase">Beneficiary Student</span>
                  <p className="font-extrabold text-sm text-slate-900">{settlingReferrer.name}</p>
                  <p className="text-xs text-slate-500 font-mono">{settlingReferrer.phone}</p>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-400 font-bold uppercase">Payable Amount</span>
                  <p className="text-2xl font-black text-emerald-600">₹{settlingReferrer.unpaidBalance}</p>
                  <p className="text-[10px] text-emerald-700 font-bold">
                    {settlingReferrer.qualifiedCount} eligible referral reward(s)
                  </p>
                </div>
              </div>

              {/* UPI ID Strip */}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Target UPI ID</span>
                  <p className="font-mono font-bold text-xs text-slate-900 truncate">
                    {settlingReferrer.upiId}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopyUpi(settlingReferrer.upiId)}
                    className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 cursor-pointer transition active:scale-95"
                  >
                    {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedUpi ? "Copied!" : "Copy UPI"}</span>
                  </button>

                  <a
                    href={`upi://pay?pa=${settlingReferrer.upiId}&pn=${encodeURIComponent(
                      settlingReferrer.name
                    )}&am=${settlingReferrer.unpaidBalance}&cu=INR&tn=Topline%20Referral%20Payout`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 transition active:scale-95"
                  >
                    <span>Pay in App</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            <form onSubmit={handleSettlePayout} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Payment Reference / UTR Number (Optional)
                </label>
                <input
                  type="text"
                  value={paidReference}
                  onChange={(e) => setPaidReference(e.target.value)}
                  placeholder="e.g. GPay UTR 429103948192 or Cash / Paytm"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20 transition"
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20 transition"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSettlingReferrer(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={settlingLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <span>{settlingLoading ? "Recording..." : `Confirm Paid (₹${settlingReferrer.unpaidBalance})`}</span>
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
    </div>
  );
}


