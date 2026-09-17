"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BrandLogo from "@/components/BrandLogo";
import {
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  KeyRound,
  RefreshCw,
  Clock,
  Eye,
  EyeOff,
  MessageSquare,
  ArrowLeft,
} from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();

  // Wizard Step: 1 = Request OTP, 2 = Verify OTP & Reset Password
  const [step, setStep] = useState<1 | 2>(1);

  // Form inputs
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Status & feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState<string>("");
  const [noEmailUser, setNoEmailUser] = useState<any | null>(null);

  // 5-minute Countdown Timer (300 seconds)
  const [timeLeft, setTimeLeft] = useState<number>(300);
  const [resendCooldown, setResendCooldown] = useState<number>(60);

  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // 5-min OTP countdown timer
  useEffect(() => {
    if (step !== 2) return;
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [step, timeLeft]);

  // 60-second Resend cooldown timer
  useEffect(() => {
    if (step !== 2) return;
    if (resendCooldown <= 0) return;

    const cooldown = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(cooldown);
  }, [step, resendCooldown]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Step 1: Request 6-digit OTP
  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!identifier.trim()) {
      setError("Please enter your Registration Number, Mobile Phone, or Email.");
      return;
    }

    setError(null);
    setSuccess(null);
    setNoEmailUser(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMaskedEmail(data.maskedEmail);
        setStep(2);
        setTimeLeft(300); // Reset 5-minute timer
        setResendCooldown(60);
        setSuccess(`Verification code sent to ${data.maskedEmail}. Valid for 5 minutes.`);
        // Focus first OTP box
        setTimeout(() => otpInputsRef.current[0]?.focus(), 150);
      } else {
        if (data.noEmail) {
          setNoEmailUser(data.user || { identifier });
        }
        setError(data.message || "Failed to find account. Please verify your details.");
      }
    } catch (err: any) {
      console.error(err);
      setError("Network error. Please check your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  // Handle single digit OTP inputs
  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    const cleaned = value.replace(/\D/g, "");
    const updated = [...otp];

    if (cleaned.length > 1) {
      // Handle pasted full 6-digit code
      const pastedDigits = cleaned.slice(0, 6).split("");
      pastedDigits.forEach((d, idx) => {
        if (idx < 6) updated[idx] = d;
      });
      setOtp(updated);
      const nextFocusIdx = Math.min(5, pastedDigits.length);
      otpInputsRef.current[nextFocusIdx]?.focus();
      return;
    }

    updated[index] = cleaned;
    setOtp(updated);

    // Auto-advance to next input
    if (cleaned && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  // Step 2: Verify OTP & Submit New Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const fullOtp = otp.join("");
    if (fullOtp.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please re-type carefully.");
      return;
    }

    if (timeLeft <= 0) {
      setError("Your verification code has expired (5-minute limit). Please click 'Resend Code'.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim(),
          otp: fullOtp,
          newPassword,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess("Password updated successfully! Logging you in...");
        setTimeout(() => {
          router.push("/profile");
          router.refresh();
        }, 1200);
      } else {
        setError(data.message || "Failed to reset password. Please check your verification code.");
      }
    } catch (err: any) {
      console.error(err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc] text-slate-700 relative grid-bg overflow-hidden">
      <Navbar />

      <main className="flex-grow flex items-center justify-center px-4 py-16 relative z-10">
        <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xl space-y-6">
          {/* Brand Header */}
          <div className="text-center space-y-2">
            <BrandLogo width={64} height={64} className="mx-auto rounded-xl border border-slate-200 p-1 bg-white shadow-sm" />
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 uppercase tracking-wider">
              {step === 1 ? "Reset Password" : "Set New Password"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              {step === 1
                ? "Enter your Registration Number, Phone, or Email to receive a 5-minute reset code."
                : `Enter the 6-digit code sent to ${maskedEmail || "your email"}.`}
            </p>
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs sm:text-sm flex items-start space-x-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-xs sm:text-sm flex items-start space-x-2 animate-in fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed">{success}</span>
            </div>
          )}

          {/* STEP 1: Enter Identifier Form */}
          {step === 1 && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Registration No. / Mobile Phone / Email
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    autoFocus
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. PU-2024-887, 9876543210, or student@gmail.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !identifier.trim()}
                className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl uppercase tracking-wider text-sm transition shadow-md hover:shadow-lg flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>{loading ? "Sending Verification Code..." : "Send Reset Code (OTP)"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* STEP 2: Enter 6-Digit OTP & New Password Form */}
          {step === 2 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              {/* 5-Minute Timer Badge */}
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-xs">
                <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
                  <Clock className={`w-3.5 h-3.5 ${timeLeft <= 60 ? "text-red-500 animate-pulse" : "text-amber-500"}`} />
                  <span>Code Validity:</span>
                </div>
                <span
                  className={`font-mono font-bold text-xs px-2 py-0.5 rounded-md ${
                    timeLeft <= 60
                      ? "bg-red-100 text-red-700 font-black animate-pulse"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {timeLeft > 0 ? formatTimer(timeLeft) : "Expired (5 mins up)"}
                </span>
              </div>

              {/* 6-Digit OTP Input Boxes */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    6-Digit Verification Code *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setOtp(["", "", "", "", "", ""]);
                    }}
                    className="text-[11px] font-semibold text-slate-500 hover:text-red-600 transition flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3 h-3" /> Change ID
                  </button>
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        otpInputsRef.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="w-full text-center bg-slate-50 border-2 border-slate-200 focus:border-red-600 rounded-xl py-2.5 text-lg font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600/20 font-mono transition"
                    />
                  ))}
                </div>
              </div>

              {/* New Password Field */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  New Password *
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Confirm New Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || otp.join("").length !== 6 || timeLeft <= 0}
                className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl uppercase tracking-wider text-sm transition shadow-md hover:shadow-lg flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>{loading ? "Resetting Password..." : "Submit & Reset Password"}</span>
                <CheckCircle className="w-4 h-4" />
              </button>

              {/* Resend Code Button */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  disabled={loading || resendCooldown > 0}
                  onClick={() => handleRequestOtp()}
                  className="text-xs font-bold text-slate-600 hover:text-red-600 disabled:text-slate-400 transition inline-flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                  <span>
                    {resendCooldown > 0
                      ? `Resend Code in ${resendCooldown}s`
                      : "Didn't receive code? Resend Code"}
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* Fallback WhatsApp Support Card (Especially for students without email) */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2">
            <div className="flex items-center gap-2 text-slate-800 font-extrabold">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span>Need Direct Help / No Email Access?</span>
            </div>
            <p className="text-slate-500 leading-relaxed text-[11.5px]">
              If you cannot access your registered email, contact our administrative coordinator team directly on WhatsApp to verify and reset your account.
            </p>
            <a
              href={`https://wa.me/917986955634?text=${encodeURIComponent(
                `Hello Topline Support Team, I am unable to reset my password for Registration/Phone: ${
                  identifier || "My Account"
                }. Please assist me with account verification.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs transition shadow-2xs cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Contact Coordinator on WhatsApp</span>
            </a>
          </div>

          {/* Back to Login Link */}
          <div className="text-center pt-2 border-t border-slate-100">
            <Link href="/login" className="text-xs text-slate-500 hover:text-slate-900 font-bold flex items-center justify-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
