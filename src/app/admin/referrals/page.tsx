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
} from "lucide-react";

export default function AdminReferralsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [activeView, setActiveView] = useState<"referrers" | "ledger">("referrers");

  // Payout Settlement Modal
  const [settlingReferrer, setSettlingReferrer] = useState<any>(null);
  const [paidReference, setPaidReference] = useState("");
  const [payoutNotes, setPayoutNotes] = useState("");
  const [settlingLoading, setSettlingLoading] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchReferrals = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/referrals?t=" + Date.now());
      const json = await res.json();
      if (res.ok && json.success) {
        setData(json);
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

  const handleCopyUpi = (upi: string) => {
    if (!upi || upi === "Not Provided" || upi === "N/A") return;
    navigator.clipboard.writeText(upi);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2500);
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
      const matchesSearch =
        r.name?.toLowerCase().includes(q) ||
        r.phone?.toLowerCase().includes(q) ||
        r.upiId?.toLowerCase().includes(q) ||
        r.referralCode?.toLowerCase().includes(q) ||
        r.registrationNumber?.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (statusFilter === "UNPAID") return r.unpaidBalance > 0;
      if (statusFilter === "PAID") return r.paidCount > 0;
      if (statusFilter === "ACTIVE") return r.totalInvited > 0;

      return true;
    });
  }, [data, searchTerm, statusFilter]);

  // Filtered ledger list
  const filteredLedger = useMemo(() => {
    if (!data?.ledger) return [];
    return data.ledger.filter((item: any) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        item.referrer?.name?.toLowerCase().includes(q) ||
        item.referrer?.phone?.toLowerCase().includes(q) ||
        item.referee?.name?.toLowerCase().includes(q) ||
        item.referee?.phone?.toLowerCase().includes(q) ||
        item.codeUsed?.toLowerCase().includes(q) ||
        item.paidReference?.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (statusFilter === "ALL") return true;
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
    rewardPerReferral: 25,
  };

  return (
    <div className="space-y-6 text-slate-900">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-wider text-red-600 uppercase font-sans">
              Referrals & Offline Payouts
            </h1>
            <span className="bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider">
              ₹{metrics.rewardPerReferral || 50} / Active Default
            </span>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Track student invitation codes, verify first-event completions, and record offline UPI payout settlements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/settings"
            className="bg-white hover:bg-slate-100 text-slate-700 font-bold px-3.5 py-2.5 rounded-xl text-xs transition border border-slate-300 flex items-center gap-1.5 shadow-xs"
          >
            <Settings className="w-4 h-4 text-slate-500" />
            <span>Reward Settings</span>
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
              placeholder="Search by student, phone, UPI, or code..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20 transition"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-bold focus:outline-none focus:border-red-600 transition"
          >
            {activeView === "referrers" ? (
              <>
                <option value="ALL">All Referrers</option>
                <option value="UNPAID">Has Unpaid (Pending ₹)</option>
                <option value="PAID">Has Settled Payouts</option>
                <option value="ACTIVE">Active (1+ Invited)</option>
              </>
            ) : (
              <>
                <option value="ALL">All Statuses</option>
                <option value="PENDING">PENDING (Awaiting 1st Event)</option>
                <option value="QUALIFIED">QUALIFIED (Reward Unlocked)</option>
                <option value="PAID">PAID (Settled)</option>
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
              Showing {filteredReferrers.length} student referrers
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
                    <th className="p-3.5 text-center">Invited</th>
                    <th className="p-3.5 text-center">Qualified (Completed)</th>
                    <th className="p-3.5 text-center">Settled (Paid)</th>
                    <th className="p-3.5 text-right font-black">Unpaid Due (₹)</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReferrers.map((ref: any) => {
                    const hasUnpaid = ref.unpaidBalance > 0;
                    const hasUpi = ref.upiId && ref.upiId !== "Not Provided" && ref.upiId !== "N/A";

                    return (
                      <tr key={ref.id} className="hover:bg-slate-50/60 transition group">
                        <td className="p-3.5 font-bold text-slate-900">
                          <span>{ref.name}</span>
                        </td>
                        <td className="p-3.5 text-slate-600">
                          <div className="font-mono text-[11px] font-bold text-slate-800">{ref.phone}</div>
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
                        <td className="p-3.5 text-center font-bold text-slate-700">{ref.totalInvited}</td>
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
                          {hasUnpaid ? (
                            <button
                              type="button"
                              onClick={() => setSettlingReferrer(ref)}
                              className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold px-3.5 py-1.5 rounded-xl shadow-xs transition flex items-center gap-1.5 ml-auto cursor-pointer"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Settle ₹{ref.unpaidBalance}</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">All Settled</span>
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

      {/* VIEW 2: DETAILED REFERRAL LEDGER */}
      {activeView === "ledger" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Individual Referral Attributions Ledger
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              Showing {filteredLedger.length} referral events
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

                    return (
                      <tr key={row.id} className="hover:bg-slate-50/60 transition">
                        <td className="p-3.5 font-bold text-slate-900">
                          <div>{row.referrer?.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{row.referrer?.phone} • {row.referrer?.upiId || "No UPI"}</div>
                        </td>
                        <td className="p-3.5 font-medium text-slate-800">
                          <div>{row.referee?.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{row.referee?.phone} • {row.referee?.registrationNumber}</div>
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
    </div>
  );
}
