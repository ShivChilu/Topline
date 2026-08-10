"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash, Eye, Shield, Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface FormField {
  id: string;
  type: 'text' | 'paragraph' | 'number' | 'email' | 'phone' | 'date' | 'time' | 'select' | 'checkbox' | 'radio' | 'yesno' | 'rating' | 'file';
  label: string;
  description: string;
  required: boolean;
  placeholder: string;
  options: string[];
}

export default function CreateEventPage() {
  const router = useRouter();
  const [clients, setClients] = useState<any[]>([]);

  // Event Details state
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [reportingTime, setReportingTime] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [workType, setWorkType] = useState("Catering Staff");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [dressCode, setDressCode] = useState("");
  const [dosAndDontsText, setDosAndDontsText] = useState("");

  const [workersRequired, setWorkersRequired] = useState(15);
  const [maxApplications, setMaxApplications] = useState(25);
  const [paymentPerStudent, setPaymentPerStudent] = useState(800);
  const [clientRevenue, setClientRevenue] = useState(15000);
  const [otherExpenses, setOtherExpenses] = useState(1000);
  const [clientId, setClientId] = useState("");
  const [visibility, setVisibility] = useState("VISIBLE");

  // Custom Form Builder state
  const [customFields, setCustomFields] = useState<FormField[]>([]);

  // Modal / Temp state for adding a field
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState<FormField["type"]>("text");
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldPlaceholder, setNewFieldPlaceholder] = useState("");
  const [newFieldDescription, setNewFieldDescription] = useState("");
  const [newFieldOptionsText, setNewFieldOptionsText] = useState(""); // comma separated options

  useEffect(() => {
    // Fetch clients
    const fetchClients = async () => {
      try {
        const res = await fetch("/api/admin/clients");
        const data = await res.json();
        if (data.success) {
          setClients(data.clients);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchClients();
  }, []);

  const handleAddField = () => {
    if (!newFieldLabel.trim()) {
      alert("Field Question/Label is required!");
      return;
    }

    const fieldId = `field_${Date.now()}`;
    const options = newFieldOptionsText
      ? newFieldOptionsText.split(",").map((o) => o.trim()).filter((o) => o.length > 0)
      : [];

    const newField: FormField = {
      id: fieldId,
      type: newFieldType,
      label: newFieldLabel,
      description: newFieldDescription,
      required: newFieldRequired,
      placeholder: newFieldPlaceholder,
      options,
    };

    setCustomFields([...customFields, newField]);

    // Reset inputs
    setNewFieldLabel("");
    setNewFieldRequired(false);
    setNewFieldPlaceholder("");
    setNewFieldDescription("");
    setNewFieldOptionsText("");
  };

  const handleRemoveField = (id: string) => {
    setCustomFields(customFields.filter((f) => f.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const dosAndDonts = dosAndDontsText
      ? dosAndDontsText.split("\n").map((line) => line.trim()).filter((line) => line.length > 0)
      : [];

    const eventPayload = {
      name,
      date,
      location,
      googleMapsUrl,
      reportingTime,
      startTime,
      endTime,
      workType,
      description,
      instructions,
      dressCode,
      dosAndDonts,
      workersRequired: Number(workersRequired),
      maxApplications: Number(maxApplications),
      paymentPerStudent: Number(paymentPerStudent),
      clientRevenue: Number(clientRevenue),
      otherExpenses: Number(otherExpenses),
      clientId: clientId || null,
      customFormFields: customFields,
      visibility,
    };

    try {
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventPayload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        alert("Event Draft created successfully!");
        router.push("/admin/events");
      } else {
        alert(data.message || "Failed to create event.");
      }
    } catch (err) {
      alert("Network error.");
    }
  };

  return (
    <div className="space-y-6 text-white max-w-5xl mx-auto pb-12">
      {/* Title */}
      <div className="flex items-center space-x-3">
        <Link href="/admin/events" className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold tracking-wider text-rose-600 uppercase">
            Create Event & Build Form
          </h1>
          <p className="text-gray-400 text-sm mt-1">Configure event specifications and custom applicant questions</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Columns: Main configurations */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* General Details */}
          <div className="bg-[#0c0d12] p-6 rounded-xl border border-gray-800 space-y-4">
            <h2 className="text-lg font-bold text-white uppercase tracking-wide border-b border-gray-800 pb-2">General Details</h2>
            
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Event Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Grand Corporate Buffet Coordination"
                className="w-full bg-[#161822] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-600 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Event Date *</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-[#161822] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-600 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Work Type / Category *</label>
                <input
                  type="text"
                  required
                  value={workType}
                  onChange={(e) => setWorkType(e.target.value)}
                  placeholder="Catering Staff / Banquet Host"
                  className="w-full bg-[#161822] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-600 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Reporting Time *</label>
                <input
                  type="time"
                  required
                  value={reportingTime}
                  onChange={(e) => setReportingTime(e.target.value)}
                  className="w-full bg-[#161822] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-600 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Duty Start Time *</label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-[#161822] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-600 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Duty End Time *</label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-[#161822] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-600 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Location Details *</label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Aura Resort, Chandigarh-Ambala Highway"
                className="w-full bg-[#161822] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-600 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Google Maps Link</label>
              <input
                type="url"
                value={googleMapsUrl}
                onChange={(e) => setGoogleMapsUrl(e.target.value)}
                placeholder="https://maps.google.com/..."
                className="w-full bg-[#161822] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-600 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Event Description *</label>
              <textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide a summary of the duties and event settings..."
                className="w-full bg-[#161822] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-600 text-sm h-24"
              ></textarea>
            </div>
          </div>

          {/* Operational logistics */}
          <div className="bg-[#0c0d12] p-6 rounded-xl border border-gray-800 space-y-4">
            <h2 className="text-lg font-bold text-white uppercase tracking-wide border-b border-gray-800 pb-2">Logistics & Dress Code</h2>
            
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Required Dress Code</label>
              <input
                type="text"
                value={dressCode}
                onChange={(e) => setDressCode(e.target.value)}
                placeholder="White shirt, Black trousers, Black leather shoes, Black apron"
                className="w-full bg-[#161822] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-600 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Important Instructions (e.g. confirmation message)</label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Details shown to students after submitting application (e.g., report to entry gate, carry physical roll number ID)..."
                className="w-full bg-[#161822] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-600 text-sm h-20"
              ></textarea>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Do's & Don'ts (One rule per line)</label>
              <textarea
                value={dosAndDontsText}
                onChange={(e) => setDosAndDontsText(e.target.value)}
                placeholder="DO: Arrive on time&#10;DONT: Use mobile phones while on duty"
                className="w-full bg-[#161822] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-600 text-sm h-20"
              ></textarea>
            </div>
          </div>

          {/* Dynamic Form Custom Fields List */}
          <div className="bg-[#0c0d12] p-6 rounded-xl border border-gray-800 space-y-4">
            <h2 className="text-lg font-bold text-white uppercase tracking-wide border-b border-gray-800 pb-2">Custom Questionnaire</h2>
            
            {customFields.length === 0 ? (
              <p className="text-gray-500 text-sm">No custom fields added yet. Standard profile inputs (Name, Phone, Email, University, University ID) are included by default.</p>
            ) : (
              <div className="space-y-3">
                {customFields.map((field, idx) => (
                  <div key={field.id} className="flex items-center justify-between bg-[#161822] p-3 rounded-lg border border-gray-800">
                    <div>
                      <p className="text-sm font-semibold">{field.label}</p>
                      <p className="text-xs text-gray-500">
                        Type: <span className="text-rose-600 uppercase">{field.type}</span> | Required: {field.required ? "Yes" : "No"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveField(field.id)}
                      className="p-1 text-rose-400 hover:text-rose-500"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Financials, Client, Form builder toolbox */}
        <div className="space-y-6">
          
          {/* Partnership & Financials */}
          <div className="bg-[#0c0d12] p-6 rounded-xl border border-gray-800 space-y-4">
            <h2 className="text-lg font-bold text-rose-600 uppercase tracking-wide border-b border-gray-850 pb-2">Financials & Partner</h2>
            
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Select Client Resort/Hotel</label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full bg-[#161822] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-600 text-sm"
              >
                <option value="">Select partner client...</option>
                {clients.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Required Workers</label>
                <input
                  type="number"
                  required
                  value={workersRequired}
                  onChange={(e) => setWorkersRequired(Number(e.target.value))}
                  className="w-full bg-[#161822] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-600 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Max Applications</label>
                <input
                  type="number"
                  required
                  value={maxApplications}
                  onChange={(e) => setMaxApplications(Number(e.target.value))}
                  className="w-full bg-[#161822] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-600 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Student Payment (₹ / candidate)</label>
              <input
                type="number"
                required
                value={paymentPerStudent}
                onChange={(e) => setPaymentPerStudent(Number(e.target.value))}
                className="w-full bg-[#161822] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-600 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Client Revenue (₹ total)</label>
              <input
                type="number"
                value={clientRevenue}
                onChange={(e) => setClientRevenue(Number(e.target.value))}
                className="w-full bg-[#161822] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-600 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Other Expenses (₹ total)</label>
              <input
                type="number"
                value={otherExpenses}
                onChange={(e) => setOtherExpenses(Number(e.target.value))}
                className="w-full bg-[#161822] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-600 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Visibility</label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className="w-full bg-[#161822] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-600 text-sm"
              >
                <option value="VISIBLE">VISIBLE</option>
                <option value="HIDDEN">HIDDEN</option>
              </select>
            </div>
          </div>

          {/* Form Builder Toolbox */}
          <div className="bg-[#0c0d12] p-6 rounded-xl border border-gray-800 space-y-4">
            <h2 className="text-lg font-bold text-white uppercase tracking-wide border-b border-gray-850 pb-2">Add Form Field</h2>
            
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Question / Label</label>
              <input
                type="text"
                value={newFieldLabel}
                onChange={(e) => setNewFieldLabel(e.target.value)}
                placeholder="e.g. Select your shirt size"
                className="w-full bg-[#161822] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-600 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Field Type</label>
              <select
                value={newFieldType}
                onChange={(e) => setNewFieldType(e.target.value as any)}
                className="w-full bg-[#161822] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-600 text-sm"
              >
                <option value="text">Short Answer</option>
                <option value="paragraph">Paragraph</option>
                <option value="number">Number</option>
                <option value="select">Dropdown / Select</option>
                <option value="yesno">Yes / No</option>
              </select>
            </div>

            {newFieldType === "select" && (
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Options (Comma separated)</label>
                <input
                  type="text"
                  value={newFieldOptionsText}
                  onChange={(e) => setNewFieldOptionsText(e.target.value)}
                  placeholder="S, M, L, XL, XXL"
                  className="w-full bg-[#161822] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-600 text-sm"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Description / Instruction</label>
              <input
                type="text"
                value={newFieldDescription}
                onChange={(e) => setNewFieldDescription(e.target.value)}
                placeholder="Subtext details..."
                className="w-full bg-[#161822] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-600 text-sm"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="required_box"
                checked={newFieldRequired}
                onChange={(e) => setNewFieldRequired(e.target.checked)}
                className="rounded border-gray-800 text-rose-600 focus:ring-rose-600"
              />
              <label htmlFor="required_box" className="text-sm font-semibold text-gray-300">Mark as Required</label>
            </div>

            <button
              type="button"
              onClick={handleAddField}
              className="w-full bg-transparent hover:bg-rose-600 hover:text-black border border-rose-600/30 text-rose-600 font-bold py-2 rounded transition text-sm flex items-center justify-center space-x-1"
            >
              <Plus className="w-4 h-4" />
              <span>Insert Field</span>
            </button>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            className="w-full bg-rose-600 hover:bg-rose-700 text-black font-extrabold py-3.5 rounded-xl transition duration-200"
          >
            Save Event Draft
          </button>

        </div>

      </form>
    </div>
  );
}
