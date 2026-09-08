"use client";

import { useEffect, useState, use } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Calendar,
  MessageCircle,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  UserCheck,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface RSVPResponse {
  success: boolean;
  message: string;
  status: "CONFIRMED" | "CANCELLED" | "SELECTED" | "UNDER_REVIEW" | "NOT_SELECTED" | string;
  candidateName?: string;
  eventName?: string;
  eventDate?: string;
  eventLocation?: string;
  reportingTime?: string;
  whatsappGroupLink?: string | null;
}

export default function CandidateRSVPPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const applicationId = resolvedParams.id;
  const searchParams = useSearchParams();
  const initialAction = searchParams.get("action")?.toUpperCase();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<RSVPResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Fetch or process initial RSVP
  useEffect(() => {
    async function loadRSVP() {
      try {
        setLoading(true);
        setError(null);

        const query = new URLSearchParams({ appId: applicationId });
        if (initialAction === "CONFIRM" || initialAction === "YES") {
          query.set("action", "CONFIRM");
        } else if (initialAction === "DECLINE" || initialAction === "NO" || initialAction === "CANCEL") {
          query.set("action", "DECLINE");
        }

        const res = await fetch(`/api/rsvp?` + query.toString());
        const json = await res.json();

        if (!res.ok || !json.success) {
          setError(json.message || "Unable to load assignment details. Please check your link or contact support.");
        } else {
          setData(json);
        }
      } catch (err: any) {
        setError(err.message || "Failed to communicate with server.");
      } finally {
        setLoading(false);
      }
    }

    if (applicationId) {
      loadRSVP();
    }
  }, [applicationId, initialAction]);

  const handleAction = async (action: "CONFIRM" | "DECLINE") => {
    try {
      setSubmitting(true);
      setError(null);

      const query = new URLSearchParams({ appId: applicationId, action });
      const res = await fetch(`/api/rsvp?` + query.toString());
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.message || "Failed to update attendance status.");
      } else {
        setData(json);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyWhatsAppLink = () => {
    if (data?.whatsappGroupLink) {
      navigator.clipboard.writeText(data.whatsappGroupLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col font-sans selection:bg-red-600 selection:text-white">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-10 relative overflow-hidden">
        {/* Ambient Gradient Background Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-xl relative z-10">
          {loading ? (
            <div className="bg-[#0f172a]/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-10 text-center shadow-2xl flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-12 h-12 text-red-500 animate-spin" />
              <p className="text-slate-300 font-medium">Verifying duty assignment & availability...</p>
            </div>
          ) : error ? (
            <div className="bg-[#0f172a]/90 backdrop-blur-xl border border-red-500/30 rounded-3xl p-8 text-center shadow-2xl space-y-6">
              <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto text-red-400 border border-red-500/20">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-white">Verification Notice</h2>
              <p className="text-slate-300 text-sm leading-relaxed">{error}</p>
              <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/profile"
                  className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold transition border border-slate-700"
                >
                  Go to Student Portal
                </Link>
                <Link
                  href="/"
                  className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition"
                >
                  Return Home
                </Link>
              </div>
            </div>
          ) : data ? (
            <div className="bg-[#0f172a]/95 backdrop-blur-2xl border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
              {/* Header Banner */}
              <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 p-6 sm:p-8 text-center relative">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/30 backdrop-blur-md text-white/90 text-xs font-semibold uppercase tracking-wider mb-3">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Topline ODC Duty Roster
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {data.eventName || "Event Assignment"}
                </h1>
                {data.candidateName && (
                  <p className="text-red-100 font-medium text-sm mt-1">
                    Candidate: <span className="text-white font-bold">{data.candidateName}</span>
                  </p>
                )}
              </div>

              {/* Event Key Highlights */}
              <div className="p-6 sm:p-8 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-900/60 rounded-2xl p-4 border border-slate-800/80">
                  {data.eventDate && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-400 uppercase font-semibold">Date</div>
                        <div className="text-sm font-bold text-white">
                          {new Date(data.eventDate).toLocaleDateString("en-GB", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {data.reportingTime && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-400 uppercase font-semibold">Reporting Time</div>
                        <div className="text-sm font-bold text-white">{data.reportingTime}</div>
                      </div>
                    </div>
                  )}

                  {data.eventLocation && (
                    <div className="flex items-center gap-3 sm:col-span-2">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] text-slate-400 uppercase font-semibold">Location / Venue</div>
                        <div className="text-sm font-bold text-white truncate">{data.eventLocation}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* STATUS: CONFIRMED */}
                {data.status === "CONFIRMED" && (
                  <div className="space-y-6">
                    <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-6 text-center">
                      <div className="w-14 h-14 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-400 mb-3">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <h3 className="text-xl font-extrabold text-white">
                        Attendance Confirmed! 🎉
                      </h3>
                      <p className="text-emerald-300 text-xs mt-1 leading-relaxed max-w-md mx-auto">
                        Your duty confirmation is recorded in real-time. Please join the official event WhatsApp group below to receive shift briefings and gate instructions.
                      </p>
                    </div>

                    {/* WhatsApp Group Joining Card */}
                    {data.whatsappGroupLink ? (
                      <div className="bg-[#0b271a] border-2 border-[#25D366]/40 rounded-2xl p-6 text-center space-y-4 shadow-xl">
                        <div className="flex items-center justify-center gap-2 text-[#25D366] font-bold text-sm">
                          <MessageCircle className="w-5 h-5 fill-current" />
                          <span>Official Event WhatsApp Group</span>
                        </div>
                        <p className="text-emerald-100/80 text-xs leading-relaxed">
                          Click below to join the candidate duty group. Live announcements, uniform guidelines, reporting coordinators, and gate entry will be coordinated here.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                          <a
                            href={data.whatsappGroupLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-black px-6 py-3.5 rounded-xl text-sm transition shadow-lg shadow-[#25D366]/20 transform active:scale-95"
                          >
                            <MessageCircle className="w-4 h-4 fill-slate-950" />
                            <span>👉 Join WhatsApp Group</span>
                            <ExternalLink className="w-4 h-4" />
                          </a>

                          <button
                            onClick={copyWhatsAppLink}
                            className="inline-flex items-center justify-center gap-2 bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700 px-4 py-3.5 rounded-xl text-xs font-semibold transition cursor-pointer"
                          >
                            {copiedLink ? (
                              <>
                                <Check className="w-4 h-4 text-emerald-400" />
                                <span className="text-emerald-400">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4 text-slate-400" />
                                <span>Copy Link</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-center text-xs text-slate-400">
                        💬 The Event Admin will share the official WhatsApp Group invite link prior to the event date. Check your student portal for updates.
                      </div>
                    )}

                    <div className="flex items-center justify-center gap-3 pt-2">
                      <Link
                        href="/profile"
                        className="text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 transition underline-offset-4 hover:underline"
                      >
                        <UserCheck className="w-4 h-4 text-emerald-400" />
                        View in Student Dashboard
                      </Link>
                    </div>
                  </div>
                )}

                {/* STATUS: CANCELLED / DECLINED */}
                {data.status === "CANCELLED" && (
                  <div className="space-y-6">
                    <div className="bg-rose-950/40 border border-rose-500/30 rounded-2xl p-6 text-center">
                      <div className="w-14 h-14 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto text-rose-400 mb-3">
                        <XCircle className="w-8 h-8" />
                      </div>
                      <h3 className="text-xl font-extrabold text-white">Duty Declined</h3>
                      <p className="text-rose-300 text-xs mt-1 leading-relaxed max-w-md mx-auto">
                        You have indicated that you are not available for this assignment. Your slot has been released for standby candidates.
                      </p>
                    </div>

                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 text-center space-y-3">
                      <p className="text-xs text-slate-400">
                        Made a mistake or your schedule cleared up? You can re-confirm your attendance below.
                      </p>
                      <button
                        onClick={() => handleAction("CONFIRM")}
                        disabled={submitting}
                        className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shadow disabled:opacity-50 cursor-pointer"
                      >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Re-confirm My Availability
                      </button>
                    </div>

                    <div className="text-center">
                      <Link
                        href="/profile"
                        className="text-xs font-semibold text-slate-400 hover:text-white transition"
                      >
                        ← Back to Student Portal
                      </Link>
                    </div>
                  </div>
                )}

                {/* STATUS: SELECTED / AWAITING RESPONSE */}
                {data.status !== "CONFIRMED" && data.status !== "CANCELLED" && (
                  <div className="space-y-6">
                    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 text-center space-y-4">
                      <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto text-amber-400">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-extrabold text-white">
                          Are you available for this duty?
                        </h3>
                        <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto leading-relaxed">
                          Please confirm whether you will be attending. Confirming will unlock the official WhatsApp Group invite and secure your assignment roster.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <button
                          onClick={() => handleAction("CONFIRM")}
                          disabled={submitting}
                          className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 px-4 rounded-xl text-sm transition shadow-lg shadow-emerald-900/40 active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                          {submitting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4 stroke-3" />
                          )}
                          <span>✅ YES, I AM AVAILABLE</span>
                        </button>

                        <button
                          onClick={() => handleAction("DECLINE")}
                          disabled={submitting}
                          className="w-full flex items-center justify-center gap-2 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 font-bold py-3.5 px-4 rounded-xl text-sm transition active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                          {submitting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                          <span>❌ NO, NOT AVAILABLE</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </main>

      <Footer />
    </div>
  );
}
