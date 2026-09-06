"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BrandLogo from "@/components/BrandLogo";
import {
  User,
  Phone,
  Mail,
  GraduationCap,
  Hash,
  Lock,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  Check,
  X
} from "lucide-react";

export default function StudentRegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    university: "",
    registrationNumber: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  // Real-time password requirement checks
  const passChecks = {
    length: formData.password.length >= 8,
    uppercase: /[A-Z]/.test(formData.password),
    lowercase: /[a-z]/.test(formData.password),
    number: /\d/.test(formData.password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password),
  };

  const isPasswordValid = Object.values(passChecks).every(Boolean);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSuccess(null);

    const errors: Record<string, string> = {};

    // 1. Name
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      errors.name = "Please enter your full name (minimum 2 characters).";
    }

    // 2. Mobile Phone
    const digits = formData.phone.replace(/[^0-9]/g, "").slice(-10);
    if (!/^[6-9]\d{9}$/.test(digits)) {
      errors.phone = "Please enter a valid 10-digit Indian mobile number (starting with 6-9).";
    }

    // 3. Registration Number
    if (!formData.registrationNumber.trim() || formData.registrationNumber.trim().length < 2) {
      errors.registrationNumber = "Registration / Roll number is required.";
    }

    // 4. University
    if (!formData.university.trim() || formData.university.trim().length < 2) {
      errors.university = "University / College name is required.";
    }

    // 5. Email (Mandatory)
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = "A valid email address is mandatory.";
    }

    // 6. Password Requirements
    if (!isPasswordValid) {
      errors.password = "Password must satisfy all security requirements listed below.";
    }

    // 7. Confirm Password Match
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          phone: digits,
          email: formData.email.trim().toLowerCase(),
          university: formData.university.trim(),
          registrationNumber: formData.registrationNumber.trim().toUpperCase(),
          password: formData.password,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(data.message || "Account created successfully! Redirecting to profile...");
        setTimeout(() => {
          router.push("/profile");
          router.refresh();
        }, 1200);
      } else {
        if (data.field) {
          setFieldErrors({ [data.field]: data.message });
        } else {
          setError(data.message || "Registration failed. Please check your information.");
        }
      }
    } catch (err) {
      console.error("Register error:", err);
      setError("Network connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc] text-slate-700 relative grid-bg overflow-hidden">
      <Navbar />

      <main className="flex-grow flex items-center justify-center px-4 py-16 relative z-10">
        <div className="w-full max-w-lg bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <BrandLogo width={64} height={64} className="mx-auto rounded-xl border border-slate-200 p-1 bg-white shadow-sm" />
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 uppercase tracking-wider">
              Student Registration
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Create your profile to apply for luxury catering and hospitality gigs in 1 click.
            </p>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl text-xs sm:text-sm flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-2xl text-xs sm:text-sm flex items-start space-x-2 animate-in fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span className="font-semibold">{success}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Full Name & Mobile Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Shiva Prasad"
                    className={`w-full bg-slate-50 border rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 transition ${
                      fieldErrors.name
                        ? "border-rose-500 focus:ring-rose-500/20"
                        : "border-slate-200 focus:border-red-600 focus:ring-red-600/20"
                    }`}
                  />
                </div>
                {fieldErrors.name && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1">{fieldErrors.name}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Mobile Phone *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="7986955634"
                    className={`w-full bg-slate-50 border rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 transition ${
                      fieldErrors.phone
                        ? "border-rose-500 focus:ring-rose-500/20"
                        : "border-slate-200 focus:border-red-600 focus:ring-red-600/20"
                    }`}
                  />
                </div>
                {fieldErrors.phone && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1">{fieldErrors.phone}</p>
                )}
              </div>
            </div>

            {/* Registration Number & University */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Registration / Roll No. *
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    name="registrationNumber"
                    required
                    value={formData.registrationNumber}
                    onChange={handleChange}
                    placeholder="123042588"
                    className={`w-full bg-slate-50 border rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 transition ${
                      fieldErrors.registrationNumber
                        ? "border-rose-500 focus:ring-rose-500/20"
                        : "border-slate-200 focus:border-red-600 focus:ring-red-600/20"
                    }`}
                  />
                </div>
                {fieldErrors.registrationNumber && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1">{fieldErrors.registrationNumber}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  University / College *
                </label>
                <div className="relative">
                  <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    name="university"
                    required
                    value={formData.university}
                    onChange={handleChange}
                    placeholder="e.g. Chitkara University / IPU"
                    className={`w-full bg-slate-50 border rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 transition ${
                      fieldErrors.university
                        ? "border-rose-500 focus:ring-rose-500/20"
                        : "border-slate-200 focus:border-red-600 focus:ring-red-600/20"
                    }`}
                  />
                </div>
                {fieldErrors.university && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1">{fieldErrors.university}</p>
                )}
              </div>
            </div>

            {/* MANDATORY EMAIL ADDRESS */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="student@example.com"
                  className={`w-full bg-slate-50 border rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 transition ${
                    fieldErrors.email
                      ? "border-rose-500 focus:ring-rose-500/20"
                      : "border-slate-200 focus:border-red-600 focus:ring-red-600/20"
                  }`}
                />
              </div>
              {fieldErrors.email && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1">{fieldErrors.email}</p>
              )}
            </div>

            {/* Passwords with Eye Visibility Toggle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Topline@123"
                    className={`w-full bg-slate-50 border rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 transition ${
                      fieldErrors.password
                        ? "border-rose-500 focus:ring-rose-500/20"
                        : "border-slate-200 focus:border-red-600 focus:ring-red-600/20"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Topline@123"
                    className={`w-full bg-slate-50 border rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 transition ${
                      fieldErrors.confirmPassword
                        ? "border-rose-500 focus:ring-rose-500/20"
                        : "border-slate-200 focus:border-red-600 focus:ring-red-600/20"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 p-1"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {fieldErrors.password && (
              <p className="text-[11px] text-rose-600 font-semibold">{fieldErrors.password}</p>
            )}
            {fieldErrors.confirmPassword && (
              <p className="text-[11px] text-rose-600 font-semibold">{fieldErrors.confirmPassword}</p>
            )}

            {/* Password Security Checklist */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5 text-xs text-slate-600">
              <span className="font-bold text-slate-700 uppercase text-[10px] tracking-wider block mb-1">
                Password Security Checklist
              </span>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <div className={`flex items-center gap-1.5 ${passChecks.length ? "text-emerald-700 font-bold" : "text-slate-400"}`}>
                  {passChecks.length ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                  <span>8+ Characters</span>
                </div>
                <div className={`flex items-center gap-1.5 ${passChecks.uppercase ? "text-emerald-700 font-bold" : "text-slate-400"}`}>
                  {passChecks.uppercase ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                  <span>1 Uppercase Letter</span>
                </div>
                <div className={`flex items-center gap-1.5 ${passChecks.lowercase ? "text-emerald-700 font-bold" : "text-slate-400"}`}>
                  {passChecks.lowercase ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                  <span>1 Lowercase Letter</span>
                </div>
                <div className={`flex items-center gap-1.5 ${passChecks.number ? "text-emerald-700 font-bold" : "text-slate-400"}`}>
                  {passChecks.number ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                  <span>1 Number (0-9)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${passChecks.special ? "text-emerald-700 font-bold" : "text-slate-400"} col-span-2`}>
                  {passChecks.special ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                  <span>1 Special Character (!@#$%^&*)</span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#ED0000] hover:bg-[#C00000] disabled:opacity-50 text-white font-extrabold py-3.5 rounded-2xl uppercase tracking-wider text-xs sm:text-sm transition shadow-md hover:shadow-lg flex items-center justify-center space-x-2 mt-4"
            >
              <span>{loading ? "Creating Account..." : "Create Student Account"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="text-center pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Already have an account?{" "}
              <Link href="/login" className="text-red-600 font-bold hover:underline">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
