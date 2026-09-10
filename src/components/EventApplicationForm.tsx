"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle,
  Sparkles,
  LogIn,
  UserPlus,
  ShieldCheck,
  AlertCircle,
  Lock,
  ArrowRight,
  User,
  Phone,
  GraduationCap
} from "lucide-react";
import BrandLogo from "./BrandLogo";

interface FormField {
  id: string;
  type: string;
  label: string;
  description?: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  min?: number;
  max?: number;
}

export default function EventApplicationForm({
  eventId,
  customFields,
  status,
  allowedGender = "ALL",
  whatsappGroupLink,
}: {
  eventId: string;
  customFields: FormField[];
  status: string;
  allowedGender?: string;
  whatsappGroupLink?: string | null;
}) {
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loggedInUser, setLoggedInUser] = useState<any>(null);

  const [formData, setFormData] = useState<Record<string, any>>({
    name: "",
    phone: "",
    email: "",
    university: "",
    universityId: "",
  });
  const [customData, setCustomData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && data?.user) {
          setLoggedInUser(data.user);
          setFormData({
            name: data.user.name || "",
            phone: data.user.phone || "",
            email: data.user.email || "",
            university: data.user.university || "",
            universityId: data.user.registrationNumber || "",
          });
        }
      })
      .catch((err) => console.error("Auth check error:", err))
      .finally(() => setLoadingAuth(false));
  }, []);

  // If still checking authentication
  if (loadingAuth) {
    return (
      <div className="bg-[#0c0d12] p-8 rounded-2xl border border-[#2A3040] text-center space-y-3">
        <div className="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-xs font-bold text-slate-400">Verifying student session...</p>
      </div>
    );
  }

  // DUPLICATE APPLICATION GATE: Candidate already applied for this event
  const existingApplication = loggedInUser?.applications?.find(
    (app: any) => app.eventId === eventId
  );

  if (existingApplication) {
    const appStatus = (existingApplication.status || "APPLIED").toUpperCase();
    return (
      <div className="bg-[#0c0d12] p-8 rounded-2xl border border-emerald-900/40 shadow-xl space-y-6 text-center">
        <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
          <CheckCircle className="w-8 h-8" />
        </div>

        <div className="space-y-2 max-w-md mx-auto">
          <div className="inline-block bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold px-3 py-1 rounded-full border border-emerald-500/30 uppercase tracking-wider">
            Status: {appStatus}
          </div>
          <h3 className="text-xl font-extrabold text-white">Application Already Submitted</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            You have already applied for this event. Duplicate applications are not allowed for the same event. Selection updates, duty timings, and allocations will be communicated via WhatsApp.
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-300 flex items-center justify-between">
          <span className="font-semibold text-slate-400">Registered Student:</span>
          <span className="font-bold text-white">{loggedInUser.name} ({loggedInUser.registrationNumber})</span>
        </div>

        {appStatus === "SELECTED" && (
          <div className="bg-gradient-to-r from-emerald-950 to-slate-900 border border-emerald-500/40 p-5 rounded-2xl space-y-3 text-center shadow-lg">
            <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-extrabold text-sm uppercase tracking-wide">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>🎉 Congratulations! You are Selected</span>
            </div>
            <p className="text-xs text-emerald-200/90 leading-relaxed">
              Please join the official event WhatsApp group immediately to receive live briefings, shift timings, and reporting instructions:
            </p>
            {whatsappGroupLink ? (
              <a
                href={whatsappGroupLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-extrabold text-xs px-6 py-3 rounded-xl shadow-lg transition"
              >
                <span>📲 Join Official Event WhatsApp Group</span>
              </a>
            ) : (
              <span className="text-slate-400 text-xs italic block">WhatsApp group link pending coordinator update</span>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/profile"
            className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-white font-bold px-6 py-3 rounded-xl text-xs uppercase tracking-wider transition border border-slate-700 flex items-center justify-center gap-2"
          >
            View My Profile
          </Link>
          <Link
            href="/events"
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 rounded-xl text-xs uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2"
          >
            Browse Other Events
          </Link>
        </div>
      </div>
    );
  }

  // CLOSED / FULL EVENT GATE
  if (status !== "OPEN") {
    return (
      <div className="bg-[#0c0d12] p-8 rounded-2xl border border-rose-900/40 shadow-xl text-center space-y-4">
        <div className="w-14 h-14 bg-rose-500/10 rounded-2xl border border-rose-500/30 flex items-center justify-center mx-auto text-rose-500">
          <Lock className="w-7 h-7" />
        </div>
        <div className="space-y-1.5 max-w-md mx-auto">
          <div className="inline-block bg-rose-500/20 text-rose-400 text-[10px] font-extrabold px-3 py-1 rounded-full border border-rose-500/30 uppercase tracking-wider">
            {status === "FULL" ? "⚠️ Applications Full" : "🔒 Applications Closed"}
          </div>
          <h3 className="text-xl font-extrabold text-white">
            {status === "FULL" ? "Registration Full" : "Registration Form Closed"}
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {status === "FULL"
              ? "All available candidate slots for this event have been filled. New applications are currently paused."
              : "The application form for this event is currently closed by administrators. You can check back later or explore other open assignments."}
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/events"
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl text-xs uppercase tracking-wider transition shadow-md inline-flex items-center justify-center gap-2"
          >
            Browse Other Events
          </Link>
        </div>
      </div>
    );
  }

  // AUTHENTICATION GATE: Must be logged in to apply
  if (!loggedInUser) {
    const returnUrl = encodeURIComponent(`/events/${eventId}`);
    return (
      <div className="bg-[#0c0d12] p-8 rounded-2xl border border-[#2A3040] shadow-xl text-center space-y-6">
        <div className="w-16 h-16 bg-red-600/10 rounded-2xl border border-red-600/30 flex items-center justify-center mx-auto text-red-500">
          <Lock className="w-8 h-8" />
        </div>

        <div className="space-y-2 max-w-md mx-auto">
          <h3 className="text-xl font-extrabold text-white">Student Login Required</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            To apply for Topline catering and event assignments, you must sign in with your permanent student account. Your permanent profile details and grooming photos will be linked automatically.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href={`/login?redirect=${returnUrl}`}
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 rounded-xl text-xs uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            Log In to Apply
          </Link>
          <Link
            href={`/register?redirect=${returnUrl}`}
            className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-white font-bold px-6 py-3 rounded-xl text-xs uppercase tracking-wider transition border border-slate-700 flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Create Student Account
          </Link>
        </div>
      </div>
    );
  }

  // PROFILE COMPLETENESS GATE: Must have 100% complete profile
  const completeness = loggedInUser.completeness;
  const isProfileComplete = completeness?.isComplete ?? false;
  const percentage = completeness?.percentage ?? 0;
  const missingItems = [
    ...(completeness?.missingFields || []),
    ...(completeness?.missingPhotos || []),
  ];

  if (!isProfileComplete) {
    return (
      <div className="bg-[#0c0d12] p-8 rounded-2xl border border-amber-900/40 shadow-xl space-y-6">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 bg-amber-500/10 rounded-2xl border border-amber-500/30 flex items-center justify-center mx-auto text-amber-500">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-extrabold text-white uppercase tracking-wider">
            100% Profile Completion Required
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
            To ensure client satisfaction and fair selection, Topline ODC requires all candidates to complete 100% of their permanent profile details and grooming photos before applying to events.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300 uppercase tracking-wider">Your Profile Progress</span>
            <span className="font-extrabold text-amber-400 font-mono">{percentage}%</span>
          </div>
          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-red-500 transition-all duration-500"
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
        </div>

        {/* Missing Requirements Checklist */}
        {missingItems.length > 0 && (
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-2.5">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Pending Requirements to Unlock ({missingItems.length}):
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {missingItems.map((item: string, idx: number) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-rose-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2">
          <Link
            href="/profile"
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 px-6 rounded-xl text-xs uppercase tracking-wider transition shadow-lg flex items-center justify-center gap-2"
          >
            <span>Complete Profile Now ({percentage}%)</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="text-[10px] text-slate-500 text-center mt-2">
            Upload your grooming photo and fill in basic details. Once 100%, you can apply instantly!
          </p>
        </div>
      </div>
    );
  }

  // GENDER ELIGIBILITY GATE: Check if event has gender restrictions
  if (allowedGender === "FEMALE_ONLY" && loggedInUser?.gender?.toLowerCase() !== "female") {
    return (
      <div className="bg-[#0c0d12] p-8 rounded-2xl border border-pink-900/40 shadow-xl space-y-6 text-center">
        <div className="w-16 h-16 bg-pink-500/10 rounded-2xl border border-pink-500/30 flex items-center justify-center mx-auto text-pink-400">
          <Lock className="w-8 h-8" />
        </div>

        <div className="space-y-2 max-w-md mx-auto">
          <div className="inline-block bg-pink-500/20 text-pink-400 text-[10px] font-extrabold px-3 py-1 rounded-full border border-pink-500/30 uppercase tracking-wider">
            👩 Female Candidates Only
          </div>
          <h3 className="text-xl font-extrabold text-white">Girls Exclusive Assignment</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            This event assignment is exclusively reserved for female candidates. According to your verified student profile, your gender is listed as <strong className="text-white">{loggedInUser.gender || "Unspecified"}</strong>.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/events"
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 rounded-xl text-xs uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2"
          >
            Browse Other Events
          </Link>
          <Link
            href="/profile"
            className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-white font-bold px-6 py-3 rounded-xl text-xs uppercase tracking-wider transition border border-slate-700 flex items-center justify-center gap-2"
          >
            View My Profile
          </Link>
        </div>
      </div>
    );
  }

  if (allowedGender === "MALE_ONLY" && loggedInUser?.gender?.toLowerCase() !== "male") {
    return (
      <div className="bg-[#0c0d12] p-8 rounded-2xl border border-blue-900/40 shadow-xl space-y-6 text-center">
        <div className="w-16 h-16 bg-blue-500/10 rounded-2xl border border-blue-500/30 flex items-center justify-center mx-auto text-blue-400">
          <Lock className="w-8 h-8" />
        </div>

        <div className="space-y-2 max-w-md mx-auto">
          <div className="inline-block bg-blue-500/20 text-blue-400 text-[10px] font-extrabold px-3 py-1 rounded-full border border-blue-500/30 uppercase tracking-wider">
            👨 Male Candidates Only
          </div>
          <h3 className="text-xl font-extrabold text-white">Boys Exclusive Assignment</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            This event assignment is exclusively reserved for male candidates. According to your verified student profile, your gender is listed as <strong className="text-white">{loggedInUser.gender || "Unspecified"}</strong>.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/events"
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 rounded-xl text-xs uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2"
          >
            Browse Other Events
          </Link>
          <Link
            href="/profile"
            className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-white font-bold px-6 py-3 rounded-xl text-xs uppercase tracking-wider transition border border-slate-700 flex items-center justify-center gap-2"
          >
            View My Profile
          </Link>
        </div>
      </div>
    );
  }

  const handleCustomChange = (id: string, value: any) => {
    setCustomData({ ...customData, [id]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/events/${eventId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          customFields: customData,
        }),
      });

      const result = await response.json();
      if (response.ok && result.success) {
        setIsSuccess(true);
        setMessage(result.message);
      } else {
        setMessage(result.message || "Failed to submit application.");
      }
    } catch (error) {
      setMessage("Failed to connect to the server. Please check your internet connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="bg-emerald-950/30 border border-emerald-900/50 p-8 rounded-2xl text-center space-y-4">
        <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto" />
        <h3 className="text-2xl font-bold text-emerald-400">Application Submitted!</h3>
        <p className="text-slate-300 text-sm whitespace-pre-wrap">{message}</p>
        <div className="pt-4 flex justify-center gap-3">
          <Link
            href="/profile"
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition border border-slate-700"
          >
            View My Profile
          </Link>
          <Link
            href="/events"
            className="bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition shadow"
          >
            Browse More Events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-[#0c0d12] p-8 rounded-2xl border border-[#2A3040] shadow-xl">
      <BrandLogo width={80} height={80} className="mx-auto overflow-hidden rounded-xl border border-[#2A3040] bg-[#07080b] p-1" />
      
      <div className="text-center border-b border-[#2A3040] pb-4">
        <h3 className="text-xl font-extrabold text-white uppercase tracking-wider">
          Event Application
        </h3>
        <p className="text-xs text-slate-400 mt-1">Submit your availability for this catering assignment</p>
      </div>

      {/* Auto-filled Student Identity Banner */}
      <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-red-600/20 border border-red-600/30 overflow-hidden flex items-center justify-center font-bold text-red-500 text-lg shrink-0">
            {loggedInUser.profilePhotoUrl ? (
              <img src={loggedInUser.profilePhotoUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              loggedInUser.name.charAt(0)
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">{loggedInUser.name}</span>
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/30 uppercase">
                Verified Student
              </span>
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
              <span>Roll: <strong className="text-slate-300 font-mono">{loggedInUser.registrationNumber}</strong></span>
              {loggedInUser.university && <span>• {loggedInUser.university}</span>}
            </div>
          </div>
        </div>
      </div>

      {message && (
        <div className="bg-rose-950/40 text-rose-300 border border-rose-900/50 p-3 rounded-xl text-xs text-center flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Dynamic Event-Specific Fields */}
      {customFields.length > 0 && (
        <div className="pt-2 space-y-4">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Event Specific Questions
          </h4>
          {customFields.map((field) => {
            const fieldType = (field.type || "text").toLowerCase();
            const isYesNo = ["yesno", "yes_no", "boolean"].includes(fieldType);
            const isSelect = ["select", "dropdown", "radio", "checkbox"].includes(fieldType);
            const isNumber = ["number", "rating"].includes(fieldType);
            const isParagraph = ["paragraph", "textarea", "file"].includes(fieldType);

            return (
              <div key={field.id} className="space-y-1">
                <label className="block text-xs font-semibold text-[#F3F4F6] mb-1">
                  {field.label} {field.required && "*"}
                </label>
                {field.description && <p className="text-xs text-slate-400 mb-2">{field.description}</p>}

                {isYesNo && (
                  <div className="flex gap-4 pt-1">
                    {["Yes", "No"].map((opt) => (
                      <label key={opt} className="inline-flex items-center space-x-2 text-sm text-[#F3F4F6] cursor-pointer">
                        <input
                          type="radio"
                          name={field.id}
                          required={field.required}
                          onChange={() => handleCustomChange(field.id, opt)}
                          className="text-[#ED0000] focus:ring-[#ED0000] bg-[#151923] border-[#303747]"
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {isSelect && (
                  <select
                    required={field.required}
                    onChange={(e) => handleCustomChange(field.id, e.target.value)}
                    className="w-full bg-[#151923] border border-[#303747] rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-[#ED0000]"
                  >
                    <option value="" className="text-[#9CA3AF]">Choose an option...</option>
                    {field.options?.map((opt) => (
                      <option key={opt} value={opt} className="text-white bg-[#151923]">
                        {opt}
                      </option>
                    ))}
                  </select>
                )}

                {!isYesNo && !isSelect && !isNumber && !isParagraph && (
                  <input
                    type={fieldType === "email" ? "email" : fieldType === "date" ? "date" : fieldType === "time" ? "time" : "text"}
                    required={field.required}
                    placeholder={field.placeholder || ""}
                    onChange={(e) => handleCustomChange(field.id, e.target.value)}
                    className="w-full bg-[#151923] border border-[#303747] rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-[#ED0000] placeholder:text-[#9CA3AF]"
                  />
                )}

                {isNumber && (
                  <input
                    type="number"
                    required={field.required}
                    min={field.min}
                    max={field.max}
                    placeholder={field.placeholder || ""}
                    onChange={(e) => handleCustomChange(field.id, Number(e.target.value))}
                    className="w-full bg-[#151923] border border-[#303747] rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-[#ED0000] placeholder:text-[#9CA3AF]"
                  />
                )}

                {isParagraph && (
                  <textarea
                    required={field.required}
                    placeholder={field.placeholder || ""}
                    onChange={(e) => handleCustomChange(field.id, e.target.value)}
                    className="w-full bg-[#151923] border border-[#303747] rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-[#ED0000] placeholder:text-[#9CA3AF] h-20"
                  ></textarea>
                )}
              </div>
            );
          })}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-[#ED0000] hover:bg-[#C00000] text-white font-extrabold py-3.5 rounded-xl transition duration-200 uppercase tracking-wider text-xs shadow-lg flex items-center justify-center gap-2"
      >
        <span>{isSubmitting ? "Submitting Application..." : "Confirm & Submit Application"}</span>
      </button>
    </form>
  );
}
