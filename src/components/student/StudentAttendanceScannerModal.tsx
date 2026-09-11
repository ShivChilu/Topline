"use client";

import React, { useState, useEffect, useRef } from "react";
import jsQR from "jsqr";
import {
  X,
  Camera,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Scan,
  RefreshCw,
  Zap,
  ZapOff,
  Check,
  Calendar,
  AlertTriangle,
  RotateCcw,
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
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  
  const [isVerifying, setIsVerifying] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any>(null);
  const [scannedSuccess, setScannedSuccess] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isScanningRef = useRef<boolean>(false);

  const stopCamera = () => {
    isScanningRef.current = false;
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
    setScanError(null);
    setScannedSuccess(false);

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setCameraError("Camera access is not supported on this browser. Please use manual code entry.");
        setShowManualInput(true);
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
        setCameraError("Camera permission was denied. Please allow camera permissions in browser settings.");
      } else {
        setCameraError("Unable to access camera. Please check camera permissions.");
      }
      setShowManualInput(true);
    }
  };

  const startScanLoop = () => {
    isScanningRef.current = true;

    const scanFrame = () => {
      if (!isScanningRef.current) return;

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
                isScanningRef.current = false;
                onQrDetected(rawData);
                return;
              }
            }
          } catch (e) {
            // Continue scanning next frame
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(scanFrame);
    };

    animationFrameRef.current = requestAnimationFrame(scanFrame);
  };

  const extractToken = (raw: string) => {
    let clean = raw.trim();
    if (clean.includes("/attendance/")) {
      const parts = clean.split("/attendance/");
      clean = parts[parts.length - 1].split("?")[0].split("#")[0];
    }
    return clean;
  };

  const onQrDetected = (rawData: string) => {
    setScannedSuccess(true);
    // Haptic vibration feedback
    try {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
    } catch (e) {}

    setTimeout(() => {
      stopCamera();
      const token = extractToken(rawData);
      submitAttendance(token);
    }, 350);
  };

  const handleRetryScan = () => {
    setScanError(null);
    setScannedSuccess(false);
    setShowManualInput(false);
    startCamera();
  };

  const submitAttendance = async (tokenToSubmit: string) => {
    setScanError(null);
    setIsVerifying(true);
    try {
      const token = tokenToSubmit.trim();
      const res = await fetch("/api/student/mark-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: extractToken(token),
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
          // Invalid QR or alignment error
          setScanError(data.message || "Invalid QR code. Please align properly with the event QR.");
        }
      }
    } catch (err: any) {
      setScanError("Network connection error. Please try scanning again.");
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setScanError(null);
      setSuccessResult(null);
      setScannedSuccess(false);
      setShowManualInput(false);
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, facingMode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl max-w-md w-full overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[92dvh] sm:max-h-[85vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
              <Scan className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-sm sm:text-base text-white leading-tight">Event Attendance Scanner</h3>
              <p className="text-xs text-slate-300 truncate max-w-[220px] sm:max-w-xs">{event.name}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close scanner"
            className="w-9 h-9 rounded-full bg-slate-800/90 hover:bg-rose-600 text-slate-200 hover:text-white flex items-center justify-center transition shadow active:scale-95 border border-slate-700 shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          
          {/* Event Context Pill */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-700 space-y-1">
            <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-red-600 shrink-0" />
              <span className="truncate">{event.name}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-500 text-[11px] font-medium flex-wrap">
              {event.date && <span>📅 {new Date(event.date).toLocaleDateString("en-GB")}</span>}
              {event.location && <span>📍 {event.location}</span>}
              {event.reportingTime && <span>⏰ {event.reportingTime}</span>}
            </div>
          </div>

          {/* 1. SUCCESS STATE (Verified) */}
          {successResult ? (
            <div className="text-center py-4 space-y-4 animate-in fade-in">
              <div className="w-16 h-16 bg-emerald-50 border-2 border-emerald-300 rounded-full flex items-center justify-center text-emerald-600 mx-auto shadow-sm animate-bounce">
                <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
              </div>

              <div>
                <h4 className="text-xl font-black text-slate-900">
                  {successResult.alreadyMarked ? "Attendance Already Recorded!" : "🎉 Attendance Marked Successfully!"}
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
                Done & Return to Dashboard
              </button>
            </div>
          ) : isVerifying ? (
            /* 2. VERIFYING STATE */
            <div className="py-12 text-center space-y-3 animate-in fade-in">
              <div className="w-16 h-16 rounded-full bg-blue-50 border-2 border-blue-200 flex items-center justify-center mx-auto text-blue-600">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
              <h4 className="font-extrabold text-slate-900 text-base">Verifying Attendance QR...</h4>
              <p className="text-xs text-slate-500">Checking your assignment against event roster</p>
            </div>
          ) : scanError ? (
            /* 3. ERROR / NOT ALIGNED / INVALID QR STATE */
            <div className="py-6 text-center space-y-4 animate-in fade-in">
              <div className="w-16 h-16 bg-rose-50 border-2 border-rose-300 rounded-full flex items-center justify-center text-rose-600 mx-auto shadow-sm">
                <AlertTriangle className="w-8 h-8" />
              </div>

              <div className="space-y-1 px-2">
                <h4 className="text-base font-black text-rose-950">Invalid or Unaligned QR Code</h4>
                <p className="text-xs text-rose-700 font-medium leading-relaxed">{scanError}</p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11.5px] text-slate-600 text-left space-y-1">
                <p className="font-bold text-slate-800">Quick Tips:</p>
                <p>• Make sure the QR code is fully visible inside the viewfinder frame.</p>
                <p>• Ensure you are scanning the coordinator&apos;s official desk QR code for <strong>{event.name}</strong>.</p>
                <p>• Hold phone steady to avoid blurry frames.</p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleRetryScan}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Scan Again</span>
                </button>
              </div>
            </div>
          ) : showManualInput ? (
            /* 4. MANUAL CODE FALLBACK (If camera unsupported or failed) */
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Event Attendance Token / Code
                </label>
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Paste QR link or enter code"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 font-mono transition"
                />
                <span className="text-[11px] text-slate-400 block">
                  Enter the code displayed below the QR code at the coordinator&apos;s desk.
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleRetryScan}
                  className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition cursor-pointer"
                >
                  Camera Scan
                </button>
                <button
                  type="button"
                  disabled={!manualCode.trim()}
                  onClick={() => submitAttendance(manualCode)}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Verify Code</span>
                </button>
              </div>
            </div>
          ) : (
            /* 5. LIVE AUTOMATIC CAMERA SCANNER (Default & Pure Auto-Scan) */
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

                {/* Target Viewfinder & Corner Brackets */}
                <div className="absolute inset-0 m-5 border border-white/20 rounded-2xl pointer-events-none flex flex-col justify-between p-2">
                  <div className="flex justify-between">
                    <div className="w-6 h-6 border-t-3 border-l-3 border-red-500 rounded-tl-lg"></div>
                    <div className="w-6 h-6 border-t-3 border-r-3 border-red-500 rounded-tr-lg"></div>
                  </div>

                  {/* Automatic Laser Scanning Bar */}
                  {cameraActive && !scannedSuccess && (
                    <div className="w-full h-0.5 bg-red-500/90 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.9)]"></div>
                  )}

                  {/* Green Detection Flash */}
                  {scannedSuccess && (
                    <div className="absolute inset-0 bg-emerald-500/30 backdrop-blur-xs flex items-center justify-center">
                      <CheckCircle2 className="w-12 h-12 text-white animate-scale" />
                    </div>
                  )}

                  <div className="flex justify-between">
                    <div className="w-6 h-6 border-b-3 border-l-3 border-red-500 rounded-bl-lg"></div>
                    <div className="w-6 h-6 border-b-3 border-r-3 border-red-500 rounded-br-lg"></div>
                  </div>
                </div>

                {/* Floating Torch & Flip Controls */}
                {cameraActive && (
                  <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 z-10">
                    {torchSupported && (
                      <button
                        type="button"
                        onClick={toggleTorch}
                        className={`p-2 rounded-xl text-white backdrop-blur-md transition cursor-pointer ${
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
                        className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-xl backdrop-blur-md transition cursor-pointer"
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
                    <span className="font-semibold">Starting camera auto-scanner...</span>
                  </div>
                )}
              </div>

              {cameraError ? (
                <div className="text-center text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-2xl p-3 space-y-1">
                  <p className="font-bold">⚠️ {cameraError}</p>
                </div>
              ) : (
                <div className="text-center space-y-1">
                  <p className="text-xs text-slate-700 font-bold flex items-center justify-center gap-1">
                    <Camera className="w-3.5 h-3.5 text-red-600" />
                    Point at QR code to scan automatically
                  </p>
                  <p className="text-[11px] text-slate-400">
                    No need to click anything — scanner auto-detects and verifies instantly.
                  </p>
                </div>
              )}

              {/* Discreet Manual Code Option */}
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    setShowManualInput(true);
                  }}
                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 underline transition cursor-pointer"
                >
                  Having camera trouble? Enter code manually
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
