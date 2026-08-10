"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, AlertCircle, Calendar, MapPin, Clock, ArrowRight } from "lucide-react";
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

  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/attendance/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, verificationValue: "LOAD_DETAILS_ONLY_DUMMY_VAL" }),
        });
        const data = await res.json();
        if (data.success && data.loadOnly) {
          setEvent(data.event);
        } else {
          setError(data.message || "Attendance session is invalid or disabled.");
        }
      } catch (err) {
        setError("Failed to connect to the server.");
      } finally {
        setLoading(false);
      }
    };
    if (token) {
      fetchEventDetails();
    }
  }, [token]);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-700 flex flex-col relative grid-bg">
      <Navbar />
      
      <main className="flex-grow flex items-center justify-center p-4 py-16 relative z-10">
        <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200/50">
          <div className="text-center mb-6">
            <span className="text-red-650 font-extrabold tracking-widest text-xs uppercase bg-red-600/10 px-3 py-1.5 rounded-full border border-red-600/20">
              Attendance System
            </span>
          </div>

          {loading ? (
            <div className="space-y-4 py-6">
              <div className="h-6 bg-slate-100 rounded skeleton-loading w-3/4 mx-auto"></div>
              <div className="h-4 bg-slate-100 rounded skeleton-loading w-1/2 mx-auto"></div>
              <div className="h-20 bg-slate-50 rounded-2xl border border-slate-100 skeleton-loading"></div>
            </div>
          ) : result ? (
            <div className="space-y-6 text-center animate-fade-in">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center border border-emerald-200 mx-auto">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Attendance Successful</h2>
                <p className="text-emerald-700 text-sm font-semibold mt-1">✓ You have been marked present</p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 text-left text-sm space-y-3">
                <div>
                  <span className="text-slate-400 block text-xs uppercase">Student</span>
                  <span className="font-bold text-slate-800">{result.studentName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs uppercase">Registration Number</span>
                  <span className="font-bold text-slate-800">{result.registrationNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs uppercase">Check-In Time</span>
                  <span className="font-bold text-slate-800">
                    {new Date(result.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs uppercase">Status</span>
                  <span className={`font-bold uppercase text-xs ${result.status === 'LATE' ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {result.status}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!inputVal.trim()) return;
                setError("");
                setSubmitting(true);
                try {
                  const res = await fetch("/api/attendance/verify", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token, verificationValue: inputVal }),
                  });
                  const data = await res.json();
                  if (data.success) {
                    setResult(data);
                  } else {
                    setError(data.message || "Verification failed.");
                  }
                } catch (err) {
                  setError("Connection error. Please try again.");
                } finally {
                  setSubmitting(false);
                }
              }}
              className="space-y-6"
            >
              <div className="text-center space-y-1">
                <h1 className="text-2xl font-bold text-slate-900 uppercase">Topline ODC</h1>
                <p className="text-slate-500 text-xs">Enter your registration number or phone number below</p>
              </div>

              {event && (
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-sm space-y-2">
                  <div className="font-bold text-slate-900 text-base">{event.name}</div>
                  <div className="flex items-center space-x-2 text-slate-600 text-xs">
                    <Calendar className="w-3.5 h-3.5 text-red-600" />
                    <span>{new Date(event.date).toLocaleDateString("en-GB", { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-slate-600 text-xs">
                    <MapPin className="w-3.5 h-3.5 text-red-600" />
                    <span className="truncate">{event.location}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-slate-600 text-xs">
                    <Clock className="w-3.5 h-3.5 text-red-600" />
                    <span>Reporting: {event.reportingTime}</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 text-red-700 text-xs p-3.5 rounded-xl border border-red-200 flex items-start space-x-2.5">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase">Registration / Phone Number</label>
                <input
                  type="text"
                  required
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder="e.g. TL-2026-12345 or +919876543210"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-650 focus:bg-white transition"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white py-3.5 rounded-xl font-bold text-sm shadow-sm transition flex items-center justify-center space-x-2"
              >
                <span>{submitting ? "Checking..." : "Mark Attendance"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center text-[10px] text-slate-400">
                Only selected and confirmed students are allowed to record shift check-in.
              </div>
            </form>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
