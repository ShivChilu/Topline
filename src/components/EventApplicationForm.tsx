"use client";

import { useState } from "react";
import { CheckCircle } from "lucide-react";
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
  status
}: {
  eventId: string;
  customFields: FormField[];
  status: string;
}) {
  const [formData, setFormData] = useState<Record<string, any>>({
    name: "N/A",
    phone: "N/A",
    email: "N/A",
    university: "N/A",
    universityId: "",
    profilePhotoUrl: ""
  });
  const [customData, setCustomData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (status !== "OPEN") {
    return (
      <div className="bg-red-950/20 border border-red-900/30 rounded-xl p-8 text-center text-red-400 font-bold uppercase tracking-wider">
        {status === "FULL" ? "⚠️ Applications Full" : "❌ Applications Closed"}
      </div>
    );
  }

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

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
          customFields: customData
        })
      });

      const result = await response.json();
      if (response.ok) {
        setIsSuccess(true);
        setMessage(result.message);
      } else {
        setMessage(result.message || "Something went wrong.");
      }
    } catch (error) {
      setMessage("Failed to connect to the server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="bg-emerald-950/30 border border-emerald-950 p-8 rounded-xl text-center space-y-4">
        <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto" />
        <h3 className="text-2xl font-bold text-emerald-400">Registration Submitted!</h3>
        <p className="text-gray-350 whitespace-pre-wrap">{message}</p>
        <button
          onClick={() => {
            setIsSuccess(false);
            setMessage(null);
            setFormData({ name: "", phone: "", email: "", university: "", universityId: "", profilePhotoUrl: "" });
            setCustomData({});
          }}
          className="mt-4 bg-[#ED0000] hover:bg-[#C00000] text-white font-bold px-6 py-2 rounded transition"
        >
          Submit Another Registration
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-[#0c0d12] p-8 rounded-xl border border-[#2A3040] shadow-xl">
      <BrandLogo width={80} height={80} className="mx-auto overflow-hidden rounded border border-[#2A3040] bg-[#07080b] p-1" />
      <h3 className="text-xl font-extrabold text-white text-center mb-6 border-b border-[#2A3040] pb-3 uppercase tracking-wider">Registration Form</h3>

      {message && (
        <div className="bg-red-950/20 text-red-400 border border-red-900/30 p-3 rounded text-sm text-center">
          {message}
        </div>
      )}

      {/* Standard Fields */}
      <div>
        <label className="block text-xs font-bold text-[#F3F4F6] uppercase mb-1">University Registration Number *</label>
        <input
          type="text"
          name="universityId"
          required
          value={formData.universityId}
          onChange={handleProfileChange}
          placeholder="PU-2024-887"
          className="w-full bg-[#151923] border border-[#303747] rounded px-3 py-2 text-white focus:outline-none focus:border-[#ED0000] focus:ring-2 focus:ring-[#ED0000]/15 placeholder:text-[#9CA3AF]"
        />
      </div>

      {/* Dynamic Fields */}
      {customFields.length > 0 && (
        <div className="pt-6 border-t border-[#2A3040] space-y-4">
          <h4 className="text-sm font-bold text-[#FFFFFF] uppercase tracking-wider">Additional Details</h4>
          {customFields.map((field) => (
            <div key={field.id} className="space-y-1">
              <label className="block text-xs font-semibold text-[#F3F4F6] mb-1">
                {field.label} {field.required && "*"}
              </label>
              {field.description && <p className="text-xs text-slate-400 mb-2">{field.description}</p>}

              {field.type === "yesno" && (
                <div className="flex gap-4 pt-1">
                  {["Yes", "No"].map((opt) => (
                    <label key={opt} className="inline-flex items-center space-x-2 text-sm text-[#F3F4F6] cursor-pointer">
                      <input
                        type="radio"
                        name={field.id}
                        required={field.required}
                        onChange={() => handleCustomChange(field.id, opt)}
                        className="text-[#ED0000] focus:ring-[#ED0000] focus:ring-offset-[#151923] bg-[#151923] border-[#303747]"
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              )}

              {field.type === "select" && (
                <select
                  required={field.required}
                  onChange={(e) => handleCustomChange(field.id, e.target.value)}
                  className="w-full bg-[#151923] border border-[#303747] rounded px-3 py-2 text-white focus:outline-none focus:border-[#ED0000] focus:ring-2 focus:ring-[#ED0000]/15"
                >
                  <option value="" className="text-[#9CA3AF]">Choose an option...</option>
                  {field.options?.map((opt) => (
                    <option key={opt} value={opt} className="text-white bg-[#151923]">
                      {opt}
                    </option>
                  ))}
                </select>
              )}

              {(field.type === "text" || field.type === "phone" || field.type === "email") && (
                <input
                  type={field.type === "email" ? "email" : "text"}
                  required={field.required}
                  placeholder={field.placeholder || ""}
                  onChange={(e) => handleCustomChange(field.id, e.target.value)}
                  className="w-full bg-[#151923] border border-[#303747] rounded px-3 py-2 text-white focus:outline-none focus:border-[#ED0000] focus:ring-2 focus:ring-[#ED0000]/15 placeholder:text-[#9CA3AF]"
                />
              )}

              {field.type === "number" && (
                <input
                  type="number"
                  required={field.required}
                  min={field.min}
                  max={field.max}
                  placeholder={field.placeholder || ""}
                  onChange={(e) => handleCustomChange(field.id, Number(e.target.value))}
                  className="w-full bg-[#151923] border border-[#303747] rounded px-3 py-2 text-white focus:outline-none focus:border-[#ED0000] focus:ring-2 focus:ring-[#ED0000]/15 placeholder:text-[#9CA3AF]"
                />
              )}

              {field.type === "paragraph" && (
                <textarea
                  required={field.required}
                  placeholder={field.placeholder || ""}
                  onChange={(e) => handleCustomChange(field.id, e.target.value)}
                  className="w-full bg-[#151923] border border-[#303747] rounded px-3 py-2 text-white focus:outline-none focus:border-[#ED0000] focus:ring-2 focus:ring-[#ED0000]/15 placeholder:text-[#9CA3AF] h-24"
                ></textarea>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-[#ED0000] hover:bg-[#C00000] text-white font-extrabold py-3.5 rounded transition duration-200 uppercase tracking-wider text-sm shadow-md"
      >
        {isSubmitting ? "Submitting Registration..." : "Submit Registration"}
      </button>
    </form>
  );
}
