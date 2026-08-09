"use client";

import { useEffect, useState } from "react";
import { Plus, Building2, User, Phone, Mail, MapPin } from "lucide-react";

export default function AdminClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form inputs
  const [name, setName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const [showAddForm, setShowAddForm] = useState(false);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/clients");
      const data = await res.json();
      if (data.success) {
        setClients(data.clients);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, contactPerson, phone, email, address, notes }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("Client profile added successfully!");
        setShowAddForm(false);
        // Clear state
        setName("");
        setContactPerson("");
        setPhone("");
        setEmail("");
        setAddress("");
        setNotes("");
        fetchClients();
      } else {
        alert(data.message || "Failed to add client.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 text-white max-w-5xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-wider text-amber-500 uppercase">
            Client Directory
          </h1>
          <p className="text-gray-400 text-sm mt-1">Manage hospitality clients, hotels, and resort partners</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-amber-500 hover:bg-amber-600 text-black px-5 py-2.5 rounded-lg text-sm font-bold transition flex items-center justify-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>{showAddForm ? "Close Form" : "Add Client Partner"}</span>
        </button>
      </div>

      {/* Add Client Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-[#0c0d12] p-6 rounded-xl border border-gray-800 space-y-4 max-w-xl">
          <h2 className="text-lg font-bold border-b border-gray-850 pb-2">Add Partner Profile</h2>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Company / Resort Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Grand Regency Resort"
              className="w-full bg-[#161822] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-sm"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Contact Person *</label>
              <input
                type="text"
                required
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="Rajesh Sharma"
                className="w-full bg-[#161822] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Phone Number *</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full bg-[#161822] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Email Address *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="events@grandregency.com"
              className="w-full bg-[#161822] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Address *</label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Sector 17, Chandigarh, India"
              className="w-full bg-[#161822] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Internal Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any details, payment preferences, or special rules..."
              className="w-full bg-[#161822] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-sm h-20"
            ></textarea>
          </div>
          <button
            type="submit"
            className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-2 rounded-lg transition"
          >
            Create Partner Profile
          </button>
        </form>
      )}

      {/* List */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading client profiles...</p>
        </div>
      ) : clients.length === 0 ? (
        <div className="text-center py-16 bg-[#0c0d12] rounded-xl border border-gray-800">
          <p className="text-gray-550">No partner client files found. Create one above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {clients.map((c) => (
            <div key={c._id} className="bg-[#0c0d12] rounded-xl border border-gray-800 p-6 space-y-4 hover:border-amber-500/20 transition duration-300">
              <div className="flex items-center space-x-3 border-b border-gray-850 pb-3">
                <div className="w-10 h-10 bg-amber-500/10 rounded-lg border border-amber-500/20 flex items-center justify-center text-amber-500 flex-shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white leading-tight">{c.name}</h3>
                  <span className="text-xs text-gray-500 font-semibold uppercase">Hospitality Client</span>
                </div>
              </div>

              <div className="space-y-2 text-xs text-gray-300">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-amber-500" />
                  <span>Contact: {c.contactPerson}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-amber-500" />
                  <span>Phone: {c.phone}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-amber-500" />
                  <span>Email: {c.email}</span>
                </div>
                <div className="flex items-start space-x-2">
                  <MapPin className="w-4 h-4 text-amber-500 mt-0.5" />
                  <span>Address: {c.address}</span>
                </div>
              </div>

              {c.notes && (
                <div className="pt-3 border-t border-gray-850">
                  <p className="text-xs text-gray-500 italic">Notes: {c.notes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
