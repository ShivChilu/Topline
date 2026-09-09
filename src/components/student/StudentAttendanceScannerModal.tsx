"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Camera,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  Scan,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Calendar,
  MapPin,
} from "lucide-react";

interface StudentAttendanceScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: {
    id: string;
    name: string;
    date?: string;
    location?: string;
    reportingTime?: string;
    attendanceToken?: string;
    attendanceTokenEnabled?: boolean;
  };
  onSuccess: (result: any) => void;
}

export default function StudentAttendanceScannerModal({
  isOpen,
  onClose,
  event,
  onSuccess,
}: StudentAttendanceScannerModalProps) {
  const [activeTab, setActiveTab] = useState<"scan" | "manual">("scan");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    stopCamera();
    setCameraError(null);
    setErrorMsg(null);

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setCameraError("Camera access not supported on this device/browser. Please enter the check-in code manually below.");
        setActiveTab("manual");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }

      // Check if BarcodeDetector is available natively
      if ("BarcodeDetector" in window) {
        // @ts-ignore
        const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
        scanIntervalRef.current = setInterval(async () => {
          if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes.length > 0) {
                const rawValue = barcodes[0].rawValue;
                if (rawValue) {
                  stopCamera();
                  handleScannedToken(rawValue);
                }
              }
            } catch (e) {
              // Ignore frame detect errors
            }
          }
        }, 500);
      }
    } catch (err: any) {
      console.warn("Camera start error:", err);
      setCameraError("Camera access denied or unavailable. You can enter the event code manually below.");
      setActiveTab("manual");
    }
  };

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setSuccessResult(null);
      if (activeTab === "scan") {
        startCamera();
      }
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const extractToken = (raw: string) => {
    let clean = raw.trim();
    if (clean.includes("/attendance/")) {
      const parts = clean.split("/attendance/");
      clean = parts[parts.length - 1].split("?")[0].split("#")[0];
    }
    return clean;
  };

  const submitAttendance = async (tokenToSubmit?: string) => {
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const token = tokenToSubmit || manualCode || event.attendanceToken;
      const res = await fetch("/api/student/mark-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token ? extractToken(token) : undefined,
          eventId: event.id,
        }),
      });

      const data = await res.json();
      if (data.success) {
        stopCamera();
        setSuccessResult(data);
        onSuccess(data);
      } else {
        if (data.alreadyMarked) {
          stopCamera();
          setSuccessResult(data);
          onSuccess(data);
        } else {
          setErrorMsg(data.message || "Failed to mark attendance.");
        }
      }
    } catch (err: any) {
      setErrorMsg("Network error connecting to server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleScannedToken = (scannedText: string) => {
    const token = extractToken(scannedText);
    submitAttendance(token);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-950 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Mark Event Attendance</h3>
              <p className="text-xs text-slate-300 truncate max-w-[260px]">{event.name}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Event Context Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1.5 text-xs text-slate-600">
            <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-red-600" />
              <span>{event.name}</span>
            </div>
            <div className="flex items-center gap-3 text-slate-500 flex-wrap">
              {event.date && <span>📅 {new Date(event.date).toLocaleDateString("en-GB")}</span>}
              {event.location && <span>📍 {event.location}</span>}
              {event.reportingTime && <span>⏰ Reporting: {event.reportingTime}</span>}
            </div>
          </div>

          {/* Success State */}
          {successResult ? (
            <div className="text-center py-4 space-y-4 animate-in fade-in">
              <div className="w-16 h-16 bg-emerald-50 border-2 border-emerald-300 rounded-full flex items-center justify-center text-emerald-600 mx-auto shadow-inner">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <h4 className="text-xl font-black text-slate-900">
                  {successResult.alreadyMarked ? "Attendance Already Recorded" : "Attendance Marked Successfully!"}
                </h4>
                <p className="text-emerald-700 text-xs font-semibold mt-1">
                  ✓ Verified Confirmed Duty Assignment
                </p>
              </div>

              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 text-left text-xs space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Candidate Name:</span>
                  <span className="font-bold text-slate-900">{successResult.studentName || successResult.attendance?.studentName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Registration No:</span>
                  <span className="font-mono font-bold text-slate-900">{successResult.registrationNumber || successResult.attendance?.registrationNumber}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Check-In Time:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {new Date(successResult.checkInTime || successResult.attendance?.checkInTime || Date.now()).toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Status:</span>
                  <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full">
                    ✓ {successResult.status || successResult.attendance?.status || "PRESENT"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 bg-slate-900 hover:bg-black text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider transition shadow-sm cursor-pointer"
              >
                Close & Return to Dashboard
              </button>
            </div>
          ) : (
            <>
              {/* Tab Switcher */}
              <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab("scan")}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === "scan"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Scan Camera QR</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("manual")}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === "manual"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Scan className="w-3.5 h-3.5" />
                  <span>Enter Code / 1-Tap</span>
                </button>
              </div>

              {/* Error Message Alert */}
              {errorMsg && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Check-In Denied:</span>
                    <span>{errorMsg}</span>
                  </div>
                </div>
              )}

              {/* Tab 1: Live Camera Scanner */}
              {activeTab === "scan" && (
                <div className="space-y-4">
                  <div className="relative aspect-square w-full max-w-[280px] mx-auto bg-slate-900 rounded-3xl overflow-hidden border-2 border-slate-800 shadow-inner flex items-center justify-center">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />

                    {/* Scanner Viewfinder Box Overlay */}
                    <div className="absolute inset-0 border-2 border-red-500/50 rounded-2xl m-6 pointer-events-none flex flex-col justify-between p-2">
                      <div className="flex justify-between">
                        <div className="w-4 h-4 border-t-2 border-l-2 border-red-500"></div>
                        <div className="w-4 h-4 border-t-2 border-r-2 border-red-500"></div>
                      </div>
                      <div className="w-full h-0.5 bg-red-500/80 animate-bounce shadow-md"></div>
                      <div className="flex justify-between">
                        <div className="w-4 h-4 border-b-2 border-l-2 border-red-500"></div>
                        <div className="w-4 h-4 border-b-2 border-r-2 border-red-500"></div>
                      </div>
                    </div>

                    {!cameraActive && !cameraError && (
                      <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center text-white text-xs gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-red-500" />
                        <span>Starting camera...</span>
                      </div>
                    )}
                  </div>

                  <p className="text-center text-xs text-slate-500 font-medium">
                    Point your camera at the event attendance QR code shown on the coordinator&apos;s screen or registration desk.
                  </p>

                  {cameraError && (
                    <div className="text-center text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-2.5">
                      {cameraError}
                    </div>
                  )}

                  {/* Quick 1-Tap button if event token already exists */}
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => submitAttendance()}
                      className="w-full py-2.5 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
                      <span>{submitting ? "Verifying Attendance..." : "1-Tap Quick Mark (Confirmed Roster)"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 2: Manual Code Entry */}
              {activeTab === "manual" && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      Event Attendance Code / QR URL
                    </label>
                    <input
                      type="text"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      placeholder="e.g. Paste QR link or attendance token"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 font-mono transition"
                    />
                    <span className="text-[11px] text-slate-400 block">
                      Ask the event coordinator for the code displayed below their QR code.
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => submitAttendance()}
                    className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>{submitting ? "Verifying..." : "Submit Attendance"}</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
