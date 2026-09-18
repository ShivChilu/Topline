"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, AlertCircle, Calendar, MapPin, Clock, ArrowRight, Loader2, Sparkles, UserCheck } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function PublicAttendancePage() {
  const params = useParams();
  const token = params.token as string;

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inputVal, setInputVal] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [autoCheckingIn, setAutoCheckingIn] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const initAttendance = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`/api/attendance/verify?token=${encodeURIComponent(token)}&t=${Date.now()}`, {
          cache: "no-store",
        });
        const data = await res.json();

        if (!isMounted) return;

        if (!data.success) {
          setError(data.message || "Attendance session is invalid or disabled.");
          setLoading(false);
          return;
        }

        setEvent(data.event);

        // If student is logged in:
        if (data.loggedInStudent) {
          const student = data.loggedInStudent;

          // If already checked in
          if (student.alreadyCheckedIn) {
            setResult({
              studentName: student.name,
              registrationNumber: student.registrationNumber || "Verified",
              checkInTime: student.checkInTime || new Date().toISOString(),
              status: student.attendanceStatus || "PRESENT",
              alreadyMarked: true,
            });
            setLoading(false);
            return;
          }

          // If student has a confirmed application, perform instant 1-tap auto check-in
          if (student.hasApplication && (student.applicationStatus === "CONFIRMED" || student.applicationStatus === "ATTENDED")) {
            setAutoCheckingIn(true);
            try {
              const autoRes = await fetch("/api/attendance/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token }),
              });
              const autoData = await autoRes.json();
              if (isMounted) {
                if (autoData.success || autoData.alreadyMarked) {
                  setResult(autoData);
                } else {
                  setError(autoData.message || "Verification failed.");
                }
              }
            } catch (e) {
              if (isMounted) setError("Failed to auto check-in. Please enter credential below.");
            } finally {
              if (isMounted) setAutoCheckingIn(false);
            }
          } else if (student.registrationNumber || student.phone) {
            setInputVal(student.registrationNumber || student.phone);
          }
        }
      } catch (err) {
        if (isMounted) setError("Failed to connect to the server.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (token) {
      initAttendance();
    }

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/attendance/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, verificationValue: inputVal.trim() }),
      });
      const data = await res.json();
      if (data.success || data.alreadyMarked) {
        setResult(data);
      } else {
        setError(data.message || "Verification failed.");
      }
    } catch (err) {
      setError("Connection error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-700 flex flex-col relative grid-bg">
      <Navbar />

      <main className="flex-grow flex items-center justify-center p-4 py-12 relative z-10">
        <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200">
          
          <div className="text-center mb-5">
            <span className="text-red-600 font-extrabold tracking-wider text-[11px] uppercase bg-red-50 border border-red-200 px-3 py-1 rounded-full inline-flex items-center gap-1.5 shadow-2xs">
              <Sparkles className="w-3 h-3 text-amber-500" />
              Topline Shift Attendance
            </span>
          </div>

          {loading || autoCheckingIn ? (
            <div className="py-12 text-center space-y-4">
              <div className="w-14 h-14 bg-red-50 border-2 border-red-200 rounded-full flex items-center justify-center text-red-600 mx-auto">
                <Loader2 className="w-7 h-7 animate-spin" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold text-slate-900">
                  {autoCheckingIn ? "Auto-Verifying Your Duty..." : "Connecting to Check-In Desk..."}
                </h3>
                <p className="text-xs text-slate-400">Verifying session against official event roster</p>
              </div>
            </div>
          ) : result ? (
            <div className="space-y-5 text-center animate-in fade-in">
              <div className="w-16 h-16 bg-emerald-50 border-2 border-emerald-300 rounded-full flex items-center justify-center text-emerald-600 mx-auto shadow-sm animate-bounce">
                <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
              </div>

              <div>
                <h2 className="text-xl font-black text-slate-900">
                  {result.alreadyMarked ? "Attendance Already Recorded!" : "Attendance Marked Successfully!"}
                </h2>
                <p className="text-emerald-700 text-xs font-bold mt-1">Verified Confirmed Duty Assignment</p>
              </div>

              {event && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-700 text-left space-y-1">
                  <div className="font-extrabold text-slate-900 truncate">{event.name}</div>
                  <div className="flex items-center gap-2.5 text-slate-500 text-[11px] font-medium flex-wrap">
                    {event.date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-red-600" />
                        <span>{new Date(event.date).toLocaleDateString("en-GB")}</span>
                      </span>
                    )}
                    {event.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-red-600" />
                        <span>{event.location}</span>
                      </span>
                    )}
                    {event.reportingTime && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-red-600" />
                        <span>{event.reportingTime}</span>
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 text-left text-xs space-y-2.5 shadow-2xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Candidate Name:</span>
                  <span className="font-bold text-slate-900">{result.studentName || "Verified Student"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Registration No:</span>
                  <span className="font-mono font-bold text-slate-900">{result.registrationNumber || "Verified"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Check-In Time:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {new Date(result.checkInTime || Date.now()).toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Attendance Status:</span>
                  <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-black px-2.5 py-0.5 rounded-full">
                    {result.status || "PRESENT"}
                  </span>
                </div>
              </div>

              <Link
                href="/profile"
                className="inline-block w-full py-3.5 bg-slate-900 hover:bg-black text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider transition shadow-md"
              >
                Go to Student Portal
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in">
              <div className="text-center space-y-1">
                <h1 className="text-xl font-black text-slate-900">Desk Check-In</h1>
                <p className="text-slate-500 text-xs">Enter your Roll Number or Mobile to verify attendance</p>
              </div>

              {event && (
                <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 text-xs space-y-1.5">
                  <div className="font-extrabold text-slate-900 text-sm truncate">{event.name}</div>
                  <div className="flex items-center gap-2.5 text-slate-600 text-[11px] flex-wrap">
                    {event.date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-red-600" />
                        <span>{new Date(event.date).toLocaleDateString("en-GB")}</span>
                      </span>
                    )}
                    {event.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-red-600" />
                        <span>{event.location}</span>
                      </span>
                    )}
                    {event.reportingTime && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-red-600" />
                        <span>{event.reportingTime}</span>
                      </span>
                    )}
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-rose-50 text-rose-800 text-xs p-3.5 rounded-2xl border border-rose-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                  <span className="font-medium leading-relaxed">{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Registration Number / Phone
                </label>
                <input
                  type="text"
                  required
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder="e.g. 12304958 or 9876543210"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 font-mono transition"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !inputVal.trim()}
                className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-3.5 rounded-2xl font-extrabold text-xs uppercase tracking-wider shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <span>{submitting ? "Verifying..." : "Mark Attendance"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center text-[10.5px] text-slate-400">
                Only candidates with Confirmed duty status can record attendance.
              </div>
            </form>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
