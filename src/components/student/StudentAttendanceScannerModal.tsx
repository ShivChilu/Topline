"use client";

import React, { useState, useEffect, useRef } from "react";
import jsQR from "jsqr";
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
  Upload,
  RefreshCw,
  Zap,
  ZapOff,
  Image as ImageIcon,
  Check,
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
  const [activeTab, setActiveTab] = useState<"scan" | "upload" | "manual">("scan");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  
  const [submitting, setSubmitting] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any>(null);
  const [scannedSuccess, setScannedSuccess] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {}
      });
      streamRef.current = null;
    }
    setCameraActive(false);
    setTorchOn(false);
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const nextState = !torchOn;
        // @ts-ignore
        await track.applyConstraints({ advanced: [{ torch: nextState }] });
        setTorchOn(nextState);
      } catch (e) {
        console.warn("Failed to toggle torch:", e);
      }
    }
  };

  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  const startCamera = async () => {
    stopCamera();
    setCameraError(null);
    setErrorMsg(null);
    setScannedSuccess(false);

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setCameraError("Camera access not supported on this browser. You can upload a QR image or enter code below.");
        setActiveTab("manual");
        return;
      }

      // Check available devices
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === "videoinput");
        setHasMultipleCameras(videoDevices.length > 1);
      } catch (e) {}

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Check torch capability
      const track = stream.getVideoTracks()[0];
      if (track) {
        try {
          const capabilities: any = track.getCapabilities ? track.getCapabilities() : {};
          setTorchSupported(Boolean(capabilities.torch));
        } catch (e) {}
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        setCameraActive(true);
        startScanLoop();
      }
    } catch (err: any) {
      console.warn("Camera start error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraError("Camera permission was denied. Please allow camera access in your browser settings, or use 1-Tap Quick Mark / Manual Code below.");
      } else {
        setCameraError("Camera is currently unavailable. You can use 1-Tap Quick Mark or upload a QR screenshot.");
      }
    }
  };

  const startScanLoop = () => {
    let isScanning = true;

    const scanFrame = () => {
      if (!isScanning) return;

      const video = videoRef.current;
      if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
        if (!canvasRef.current) {
          canvasRef.current = document.createElement("canvas");
        }
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });

        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          try {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "dontInvert",
            });

            if (qrCode && qrCode.data) {
              const rawData = qrCode.data.trim();
              if (rawData) {
                isScanning = false;
                onQrDetected(rawData);
                return;
              }
            }
          } catch (e) {
            // Frame scan continue
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(scanFrame);
    };

    animationFrameRef.current = requestAnimationFrame(scanFrame);
  };

  const onQrDetected = (rawData: string) => {
    setScannedSuccess(true);
    // Haptic feedback if supported
    try {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
    } catch (e) {}

    setTimeout(() => {
      stopCamera();
      const token = extractToken(rawData);
      submitAttendance(token);
    }, 400);
  };

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setSuccessResult(null);
      setScannedSuccess(false);
      if (activeTab === "scan") {
        startCamera();
      }
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, activeTab, facingMode]);

  if (!isOpen) return null;

  const extractToken = (raw: string) => {
    let clean = raw.trim();
    if (clean.includes("/attendance/")) {
      const parts = clean.split("/attendance/");
      clean = parts[parts.length - 1].split("?")[0].split("#")[0];
    }
    return clean;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setErrorMsg("Could not process image. Please try another photo.");
          return;
        }
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const qrCode = jsQR(imageData.data, imageData.width, imageData.height);

        if (qrCode && qrCode.data) {
          onQrDetected(qrCode.data);
        } else {
          setErrorMsg("No clear QR code found in the uploaded image. Please try pointing camera directly or enter the code manually.");
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white leading-tight">Event Attendance Scanner</h3>
              <p className="text-xs text-slate-300 truncate max-w-[240px] sm:max-w-xs">{event.name}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          {/* Event Context Banner */}
          <div className="bg-gradient-to-r from-slate-50 to-red-50/40 border border-slate-200 rounded-2xl p-3.5 space-y-1.5 text-xs text-slate-700 shadow-2xs">
            <div className="font-extrabold text-slate-950 text-sm flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-red-600 shrink-0" />
              <span className="truncate">{event.name}</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-600 flex-wrap text-[11px] font-medium">
              {event.date && <span>📅 {new Date(event.date).toLocaleDateString("en-GB")}</span>}
              {event.location && <span>📍 {event.location}</span>}
              {event.reportingTime && <span>⏰ {event.reportingTime}</span>}
            </div>
          </div>

          {/* Success Result Display */}
          {successResult ? (
            <div className="text-center py-4 space-y-4 animate-in fade-in">
              <div className="w-16 h-16 bg-emerald-50 border-2 border-emerald-300 rounded-full flex items-center justify-center text-emerald-600 mx-auto shadow-sm animate-bounce">
                <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
              </div>

              <div>
                <h4 className="text-xl font-black text-slate-900">
                  {successResult.alreadyMarked ? "Attendance Already Verified!" : "🎉 Attendance Marked Successfully!"}
                </h4>
                <p className="text-emerald-700 text-xs font-bold mt-1">
                  ✓ Verified Confirmed Duty Assignment
                </p>
              </div>

              <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 text-left text-xs space-y-2.5 shadow-2xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Candidate Name:</span>
                  <span className="font-bold text-slate-900">{successResult.studentName || successResult.attendance?.studentName || "You"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Registration No:</span>
                  <span className="font-mono font-bold text-slate-900">{successResult.registrationNumber || successResult.attendance?.registrationNumber || "Verified"}</span>
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
                  <span className="text-slate-500 font-medium">Attendance Status:</span>
                  <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Check className="w-3 h-3 stroke-3" /> {successResult.status || successResult.attendance?.status || "PRESENT"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3.5 bg-slate-900 hover:bg-black active:scale-95 text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider transition shadow-md cursor-pointer"
              >
                Done & Return to Profile
              </button>
            </div>
          ) : (
            <>
              {/* Tab Navigation */}
              <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveTab("scan")}
                  className={`flex-1 py-2 px-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === "scan"
                      ? "bg-white text-slate-900 shadow-xs border border-slate-200/60"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Camera Scan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("upload")}
                  className={`flex-1 py-2 px-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === "upload"
                      ? "bg-white text-slate-900 shadow-xs border border-slate-200/60"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload QR Photo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("manual")}
                  className={`flex-1 py-2 px-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === "manual"
                      ? "bg-white text-slate-900 shadow-xs border border-slate-200/60"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Scan className="w-3.5 h-3.5" />
                  <span>Manual Code</span>
                </button>
              </div>

              {/* Error Alert */}
              {errorMsg && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-900 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold block">Attendance Error:</span>
                    <span>{errorMsg}</span>
                  </div>
                </div>
              )}

              {/* TAB 1: LIVE CAMERA SCANNER */}
              {activeTab === "scan" && (
                <div className="space-y-3.5">
                  <div className="relative aspect-square w-full max-w-[270px] mx-auto bg-slate-950 rounded-3xl overflow-hidden border-2 border-slate-800 shadow-inner flex items-center justify-center">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      autoPlay
                      className={`w-full h-full object-cover transition-opacity duration-300 ${
                        cameraActive ? "opacity-100" : "opacity-0"
                      }`}
                    />

                    {/* Viewfinder Target Overlay */}
                    <div className="absolute inset-0 m-5 border border-white/20 rounded-2xl pointer-events-none flex flex-col justify-between p-2">
                      <div className="flex justify-between">
                        <div className="w-6 h-6 border-t-3 border-l-3 border-red-500 rounded-tl-lg"></div>
                        <div className="w-6 h-6 border-t-3 border-r-3 border-red-500 rounded-tr-lg"></div>
                      </div>

                      {/* Laser Line */}
                      {cameraActive && !scannedSuccess && (
                        <div className="w-full h-0.5 bg-red-500/90 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.9)]"></div>
                      )}

                      {/* Green Success Pulse */}
                      {scannedSuccess && (
                        <div className="absolute inset-0 bg-emerald-500/25 backdrop-blur-xs flex items-center justify-center">
                          <CheckCircle2 className="w-12 h-12 text-white animate-scale" />
                        </div>
                      )}

                      <div className="flex justify-between">
                        <div className="w-6 h-6 border-b-3 border-l-3 border-red-500 rounded-bl-lg"></div>
                        <div className="w-6 h-6 border-b-3 border-r-3 border-red-500 rounded-br-lg"></div>
                      </div>
                    </div>

                    {/* Camera Controls Overlay */}
                    {cameraActive && (
                      <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 z-10">
                        {torchSupported && (
                          <button
                            type="button"
                            onClick={toggleTorch}
                            className={`p-2 rounded-xl text-white backdrop-blur-md transition ${
                              torchOn ? "bg-amber-500 text-slate-950 shadow-md" : "bg-black/60 hover:bg-black/80"
                            }`}
                            title="Toggle Torch / Flashlight"
                          >
                            {torchOn ? <Zap className="w-4 h-4 fill-slate-950" /> : <ZapOff className="w-4 h-4" />}
                          </button>
                        )}
                        {hasMultipleCameras && (
                          <button
                            type="button"
                            onClick={toggleCameraFacing}
                            className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-xl backdrop-blur-md transition"
                            title="Switch Camera (Front/Back)"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}

                    {!cameraActive && !cameraError && (
                      <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center text-white text-xs gap-2 p-4 text-center">
                        <Loader2 className="w-7 h-7 animate-spin text-red-500" />
                        <span className="font-semibold">Starting camera viewfinder...</span>
                      </div>
                    )}
                  </div>

                  {cameraError ? (
                    <div className="text-center text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-2xl p-3 space-y-1">
                      <p className="font-bold">⚠️ {cameraError}</p>
                      <p className="text-slate-500">You can also use the <strong>1-Tap Quick Mark</strong> button below or upload a photo.</p>
                    </div>
                  ) : (
                    <p className="text-center text-xs text-slate-500 font-medium">
                      Point camera directly at the event attendance QR code shown on the coordinator&apos;s desk or screen.
                    </p>
                  )}

                  {/* 1-Tap Quick Mark Button for Confirmed Roster */}
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => submitAttendance()}
                      className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Verifying Your Duty...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-amber-300" />
                          <span>✓ 1-Tap Quick Mark Attendance</span>
                        </>
                      )}
                    </button>
                    <span className="text-[10.5px] text-slate-400 text-center block mt-1.5">
                      Fast 1-tap check-in for confirmed students already present at the venue.
                    </span>
                  </div>
                </div>
              )}

              {/* TAB 2: UPLOAD QR PHOTO / SCREENSHOT */}
              {activeTab === "upload" && (
                <div className="space-y-4 text-center py-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-red-500 bg-slate-50 hover:bg-red-50/30 rounded-3xl p-8 transition cursor-pointer flex flex-col items-center justify-center space-y-2 group"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-red-100 group-hover:bg-red-200 text-red-600 flex items-center justify-center transition">
                      <ImageIcon className="w-7 h-7" />
                    </div>
                    <div className="font-extrabold text-sm text-slate-900">
                      Upload QR Code Screenshot or Photo
                    </div>
                    <p className="text-xs text-slate-500 max-w-xs">
                      Tap here to choose a photo or screenshot of the coordinator&apos;s attendance QR code from your gallery.
                    </p>
                  </div>

                  {/* 1-Tap Fallback */}
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => submitAttendance()}
                      className="w-full py-3 bg-slate-900 hover:bg-black text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-400" />}
                      <span>1-Tap Quick Mark (Confirmed Roster)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: MANUAL CODE ENTRY */}
              {activeTab === "manual" && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      Attendance Token / Event Code
                    </label>
                    <input
                      type="text"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      placeholder="e.g. Paste QR link or attendance code"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 font-mono transition"
                    />
                    <span className="text-[11px] text-slate-400 block">
                      Ask your event coordinator for the code displayed below the QR code at the desk.
                    </span>
                  </div>

                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => submitAttendance()}
                      className="w-full py-3.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      <span>{submitting ? "Verifying..." : "Submit Attendance"}</span>
                    </button>

                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => submitAttendance()}
                      className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>1-Tap Quick Check-In (Confirmed Roster)</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
