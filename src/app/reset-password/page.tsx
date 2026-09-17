"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BrandLogo from "@/components/BrandLogo";
import {
  Lock,
  KeyRound,
  CheckCircle,
  AlertCircle,
  Clock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Loader2,
} from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [remainingSeconds, setRemainingSeconds] = useState<number>(300);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Verify token on mount
  useEffect(() => {
    if (!token) {
      setVerifying(false);
      setTokenValid(false);
      setError("No reset token provided. Please request a new password reset link.");
      return;
    }

    const verifyToken = async () => {
      try {
        setVerifying(true);
        const res = await fetch(`/api/auth/verify-reset-token?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (res.ok && data.success) {
          setTokenValid(true);
          setUserName(data.userName || "Student");
          setRemainingSeconds(data.remainingSeconds || 300);
        } else {
          setTokenValid(false);
          setError(data.message || "This reset link is invalid or has expired (links expire after 5 minutes).");
        }
      } catch (err) {
        console.error(err);
        setTokenValid(false);
        setError("Failed to verify reset link. Please check your network.");
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  // Live timer
  useEffect(() => {
    if (!tokenValid || remainingSeconds <= 0) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [tokenValid, remainingSeconds]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please re-type carefully.");
      return;
    }

    if (remainingSeconds <= 0) {
      setError("This reset link has expired (5-minute window). Please request a new one.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
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
        setError(data.message || "Failed to reset password.");
      }
    } catch (err: any) {
      console.error(err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xl space-y-6">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <BrandLogo width={64} height={64} className="mx-auto rounded-xl border border-slate-200 p-1 bg-white shadow-sm" />
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 uppercase tracking-wider">
          Set New Password
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          {userName ? `Welcome back, ${userName}! Enter your new password below.` : "Create a new secure password for your account."}
        </p>
      </div>

      {/* Loading state */}
      {verifying && (
        <div className="py-12 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-red-600 animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-500">Verifying secure reset link...</p>
        </div>
      )}

      {/* Error state */}
      {!verifying && !tokenValid && (
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs sm:text-sm flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error || "Invalid or expired link."}</span>
          </div>

          <Link
            href="/forgot-password"
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl uppercase tracking-wider text-xs sm:text-sm transition shadow-md flex items-center justify-center space-x-2"
          >
            <span>Request New 5-Minute Link</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Success alert */}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-xs sm:text-sm flex items-start space-x-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <span className="leading-relaxed">{success}</span>
        </div>
      )}

      {/* Valid token form */}
      {!verifying && tokenValid && (
        <form onSubmit={handleReset} className="space-y-4">
          {/* 5-minute countdown */}
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-xs">
            <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
              <Clock className={`w-3.5 h-3.5 ${remainingSeconds <= 60 ? "text-red-500 animate-pulse" : "text-amber-500"}`} />
              <span>Link Expiration:</span>
            </div>
            <span
              className={`font-mono font-bold text-xs px-2 py-0.5 rounded-md ${
                remainingSeconds <= 60
                  ? "bg-red-100 text-red-700 font-black animate-pulse"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {remainingSeconds > 0 ? formatTimer(remainingSeconds) : "Expired (5 mins up)"}
            </span>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs sm:text-sm flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

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
                autoFocus
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
            disabled={loading || remainingSeconds <= 0}
            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl uppercase tracking-wider text-sm transition shadow-md hover:shadow-lg flex items-center justify-center space-x-2 cursor-pointer"
          >
            <span>{loading ? "Updating Password..." : "Update Password & Sign In"}</span>
            <CheckCircle className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* Back to Login Link */}
      <div className="text-center pt-4 border-t border-slate-100">
        <Link href="/login" className="text-xs text-slate-500 hover:text-slate-900 font-bold flex items-center justify-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sign In</span>
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc] text-slate-700 relative grid-bg overflow-hidden">
      <Navbar />
      <main className="flex-grow flex items-center justify-center px-4 py-16 relative z-10">
        <Suspense
          fallback={
            <div className="w-full max-w-md bg-white rounded-3xl p-12 text-center shadow-xl border border-slate-200">
              <Loader2 className="w-8 h-8 text-red-600 animate-spin mx-auto" />
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
