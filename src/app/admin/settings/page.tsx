"use client";

import { useEffect, useState } from "react";
import { Save, UserPlus, Key, Users } from "lucide-react";

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Homepage / Website settings States
  const [headline, setHeadline] = useState("");
  const [subheadline, setSubheadline] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [email, setEmail] = useState("");
  const [aboutText, setAboutText] = useState("");
  const [dosText, setDosText] = useState("");
  const [dontsText, setDontsText] = useState("");

  // Admin users state
  const [admins, setAdmins] = useState<any[]>([]);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("admin");

  const [myUsername, setMyUsername] = useState("");
  const [myPassword, setMyPassword] = useState("");

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      const data = await res.json();
      if (data.success && data.settings) {
        const val = data.settings;
        setHeadline(val.headline || "");
        setSubheadline(val.subheadline || "");
        setWhatsappNumber(val.whatsappNumber || "");
        setEmail(val.email || "");
        setAboutText(val.aboutText || "");
        setDosText(Array.isArray(val.dos) ? val.dos.join("\n") : "");
        setDontsText(Array.isArray(val.donts) ? val.donts.join("\n") : "");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAdmins = async () => {
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (data.success) {
        setAdmins(data.admins);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchSettings(), fetchAdmins()]);
      setLoading(false);
    };
    init();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const dos = dosText.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
    const donts = dontsText.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);

    const payload = {
      headline,
      subheadline,
      whatsappNumber,
      email,
      aboutText,
      dos,
      donts,
    };

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("Website settings updated successfully!");
      } else {
        alert(data.message || "Failed to save settings.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) return;

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          role: newRole,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(data.message);
        setNewUsername("");
        setNewPassword("");
        fetchAdmins();
      } else {
        alert(data.message || "Failed to create admin.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateOwnCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myUsername.trim() && !myPassword.trim()) {
      alert("Please enter a new username or password to update.");
      return;
    }

    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(myUsername.trim() && { username: myUsername }),
          ...(myPassword.trim() && { password: myPassword }),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("Your credentials have been updated successfully! Please note your new login details.");
        setMyUsername("");
        setMyPassword("");
        fetchAdmins();
      } else {
        alert(data.message || "Failed to update credentials.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="text-white text-center py-12">Loading settings module...</div>;

  return (
    <div className="space-y-12 text-white max-w-4xl mx-auto pb-12">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-wider text-amber-500 uppercase">
          Website Settings
        </h1>
        <p className="text-gray-400 text-sm mt-1">Configure banner copywriting, social networks, and student conduct guidelines</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6 bg-[#0c0d12] p-8 rounded-xl border border-gray-800">
        
        <div className="space-y-4">
          <h2 className="text-lg font-bold border-b border-gray-850 pb-2 uppercase tracking-wide text-amber-500">Homepage Banner Copy</h2>
          
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Headline</label>
            <input
              type="text"
              required
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="w-full bg-[#161822] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Subheadline / Supporting Text</label>
            <textarea
              required
              value={subheadline}
              onChange={(e) => setSubheadline(e.target.value)}
              className="w-full bg-[#161822] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-sm h-24"
            ></textarea>
          </div>
        </div>

        <div className="space-y-4 pt-6 border-t border-gray-850">
          <h2 className="text-lg font-bold border-b border-gray-850 pb-2 uppercase tracking-wide text-amber-500">Contact Details</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">WhatsApp Group / Contact Number</label>
              <input
                type="text"
                required
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="e.g. 919876543210"
                className="w-full bg-[#161822] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Contact Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#161822] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">About Section Text</label>
            <textarea
              value={aboutText}
              onChange={(e) => setAboutText(e.target.value)}
              className="w-full bg-[#161822] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-sm h-24"
            ></textarea>
          </div>
        </div>

        <div className="space-y-4 pt-6 border-t border-gray-850 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-bold border-b border-gray-850 pb-2 uppercase tracking-wide text-emerald-450">Do's Rules (One per line)</h2>
            <textarea
              value={dosText}
              onChange={(e) => setDosText(e.target.value)}
              placeholder="Arrive on time&#10;Wear correct uniform"
              className="w-full bg-[#161822] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-sm h-48 mt-2"
            ></textarea>
          </div>
          <div>
            <h2 className="text-lg font-bold border-b border-gray-850 pb-2 uppercase tracking-wide text-rose-450">Don'ts Rules (One per line)</h2>
            <textarea
              value={dontsText}
              onChange={(e) => setDontsText(e.target.value)}
              placeholder="Do not leave early&#10;Do not damage hotel property"
              className="w-full bg-[#161822] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-sm h-48 mt-2"
            ></textarea>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-amber-500 hover:bg-amber-600 text-black font-extrabold py-3 rounded-lg transition duration-200 flex items-center justify-center space-x-2"
        >
          <Save className="w-5 h-5" />
          <span>{saving ? "Saving Changes..." : "Save Website Settings"}</span>
        </button>
      </form>

      {/* Admin User Management Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Update Own Credentials Card */}
        <div className="bg-[#0c0d12] p-8 rounded-xl border border-gray-800 space-y-4">
          <h2 className="text-lg font-bold border-b border-gray-850 pb-2 uppercase tracking-wide text-amber-500 flex items-center space-x-2">
            <Key className="w-5 h-5" />
            <span>Change My Credentials</span>
          </h2>
          <form onSubmit={handleUpdateOwnCredentials} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">New Username</label>
              <input
                type="text"
                value={myUsername}
                onChange={(e) => setMyUsername(e.target.value)}
                placeholder="Enter new username..."
                className="w-full bg-[#161822] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">New Password</label>
              <input
                type="password"
                value={myPassword}
                onChange={(e) => setMyPassword(e.target.value)}
                placeholder="Enter new password..."
                className="w-full bg-[#161822] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-transparent hover:bg-amber-500 hover:text-black border border-amber-500/30 text-amber-500 font-bold py-2 rounded-lg transition text-sm"
            >
              Update Credentials
            </button>
          </form>
        </div>

        {/* Create New Admin Card */}
        <div className="bg-[#0c0d12] p-8 rounded-xl border border-gray-800 space-y-4">
          <h2 className="text-lg font-bold border-b border-gray-850 pb-2 uppercase tracking-wide text-amber-500 flex items-center space-x-2">
            <UserPlus className="w-5 h-5" />
            <span>Create New Admin</span>
          </h2>
          <form onSubmit={handleCreateAdmin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Username *</label>
              <input
                type="text"
                required
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="e.g. captain_aman"
                className="w-full bg-[#161822] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Password *</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#161822] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Role</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full bg-[#161822] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-sm"
              >
                <option value="admin">Captain (Admin)</option>
                <option value="superadmin">Super Admin</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-2 rounded-lg transition text-sm"
            >
              Register New Admin
            </button>
          </form>
        </div>

      </div>

      {/* Admin Users Roster */}
      <div className="bg-[#0c0d12] p-8 rounded-xl border border-gray-800 space-y-4">
        <h2 className="text-lg font-bold border-b border-gray-850 pb-2 uppercase tracking-wide text-amber-500 flex items-center space-x-2">
          <Users className="w-5 h-5" />
          <span>Active Administrators ({admins.length})</span>
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-gray-500 border-b border-gray-850 uppercase text-xs">
                <th className="pb-3">Username</th>
                <th className="pb-3">Role</th>
                <th className="pb-3">Registered Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-850 text-gray-300">
              {admins.map((adm) => (
                <tr key={adm._id} className="hover:bg-gray-850/10">
                  <td className="py-3 font-semibold text-white">{adm.username}</td>
                  <td className="py-3 uppercase text-xs">
                    <span className={`px-2 py-0.5 rounded ${adm.role === "superadmin" ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" : "bg-gray-800 text-gray-400"}`}>
                      {adm.role}
                    </span>
                  </td>
                  <td className="py-3 text-xs text-gray-500">{new Date(adm.createdAt).toLocaleDateString("en-GB")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
