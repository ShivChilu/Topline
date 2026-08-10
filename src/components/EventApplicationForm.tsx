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
    name: "",
    phone: "",
    email: "",
    university: "",
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
        <h3 className="text-2xl font-bold text-emerald-400">Application Submitted!</h3>
        <p className="text-gray-300 whitespace-pre-wrap">{message}</p>
        <button
          onClick={() => {
            setIsSuccess(false);
            setMessage(null);
            setFormData({ name: "", phone: "", email: "", university: "", universityId: "", profilePhotoUrl: "" });
            setCustomData({});
          }}
          className="mt-4 bg-red-600 hover:bg-red-700 text-black font-bold px-6 py-2 rounded transition"
        >
          Submit Another Application
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-[#0c0d12] p-8 rounded-xl border border-gray-800">
      <BrandLogo width={80} height={80} className="mx-auto overflow-hidden rounded border border-gray-800 bg-[#07080b] p-1" />
      <h3 className="text-xl font-bold text-white text-center mb-6 border-b border-gray-800 pb-3">Student Recruitment Form</h3>

      {message && (
        <div className="bg-red-950/20 text-red-400 border border-red-900/30 p-3 rounded text-sm text-center">
          {message}
        </div>
      )}

      {/* Standard Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Full Name *</label>
          <input
            type="text"
            name="name"
            required
            value={formData.name}
            onChange={handleProfileChange}
            placeholder="Rahul Kumar"
            className="w-full bg-[#161822] border border-gray-800 rounded px-3 py-2 text-white focus:outline-none focus:border-red-600"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">WhatsApp Phone Number *</label>
          <input
            type="tel"
            name="phone"
            required
            value={formData.phone}
            onChange={handleProfileChange}
            placeholder="9876543210"
            className="w-full bg-[#161822] border border-gray-800 rounded px-3 py-2 text-white focus:outline-none focus:border-red-600"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Email Address *</label>
          <input
            type="email"
            name="email"
            required
            value={formData.email}
            onChange={handleProfileChange}
            placeholder="rahul@university.edu"
            className="w-full bg-[#161822] border border-gray-800 rounded px-3 py-2 text-white focus:outline-none focus:border-red-600"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">University / College Name *</label>
          <input
            type="text"
            name="university"
            required
            value={formData.university}
            onChange={handleProfileChange}
            placeholder="Panjab University"
            className="w-full bg-[#161822] border border-gray-800 rounded px-3 py-2 text-white focus:outline-none focus:border-red-600"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">University ID Card / Roll No *</label>
        <input
          type="text"
          name="universityId"
          required
          value={formData.universityId}
          onChange={handleProfileChange}
          placeholder="PU-2024-887"
          className="w-full bg-[#161822] border border-gray-800 rounded px-3 py-2 text-white focus:outline-none focus:border-red-600"
        />
      </div>

      {/* Dynamic Fields */}
      {customFields.length > 0 && (
        <div className="pt-6 border-t border-gray-800 space-y-4">
          <h4 className="text-sm font-semibold text-red-600 uppercase tracking-wider">Additional Questionnaire</h4>
          {customFields.map((field) => (
            <div key={field.id}>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                {field.label} {field.required && "*"}
              </label>
              {field.description && <p className="text-xs text-gray-500 mb-2">{field.description}</p>}

              {field.type === "yesno" && (
                <div className="flex gap-4">
                  {["Yes", "No"].map((opt) => (
                    <label key={opt} className="inline-flex items-center space-x-2 text-sm text-gray-300">
                      <input
                        type="radio"
                        name={field.id}
                        required={field.required}
                        onChange={() => handleCustomChange(field.id, opt)}
                        className="text-red-600 focus:ring-red-600"
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
                  className="w-full bg-[#161822] border border-gray-800 rounded px-3 py-2 text-white focus:outline-none focus:border-red-600"
                >
                  <option value="">Choose an option...</option>
                  {field.options?.map((opt) => (
                    <option key={opt} value={opt}>
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
                  className="w-full bg-[#161822] border border-gray-800 rounded px-3 py-2 text-white focus:outline-none focus:border-red-600"
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
                  className="w-full bg-[#161822] border border-gray-800 rounded px-3 py-2 text-white focus:outline-none focus:border-red-600"
                />
              )}

              {field.type === "paragraph" && (
                <textarea
                  required={field.required}
                  placeholder={field.placeholder || ""}
                  onChange={(e) => handleCustomChange(field.id, e.target.value)}
                  className="w-full bg-[#161822] border border-gray-800 rounded px-3 py-2 text-white focus:outline-none focus:border-red-600 h-24"
                ></textarea>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-red-600 hover:bg-red-700 text-black font-bold py-3 rounded transition duration-200"
      >
        {isSubmitting ? "Submitting Application..." : "Submit Recruitment Application"}
      </button>
    </form>
  );
}
