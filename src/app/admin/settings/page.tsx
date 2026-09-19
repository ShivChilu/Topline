"use client";

import { useEffect, useState } from "react";
import { Save, UserPlus, Key, Users, Mail, Trash2, Edit2, Shield, Calendar, Sparkles, Check, Send, Plus, RefreshCw, X, ExternalLink, Search, CheckCircle2, AlertCircle, MapPin, Gift, Banknote, Lock, Unlock } from "lucide-react";
import { EVENT_PERMISSIONS, PERMISSION_PRESETS, EventPermissionKey } from "@/lib/permissions";

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  // Homepage / Website settings States
  const [headline, setHeadline] = useState("");
  const [subheadline, setSubheadline] = useState("");
  const [whatsappLink, setWhatsappLink] = useState("");
  const [email, setEmail] = useState("");
  const [aboutText, setAboutText] = useState("");
  const [dosText, setDosText] = useState("");
  const [dontsText, setDontsText] = useState("");
  const [referralRewardAmount, setReferralRewardAmount] = useState<number | string>(25);
  const [autoSelectionEmailsEnabled, setAutoSelectionEmailsEnabled] = useState(true);
  const [defaultAutoSelectionDelayHours, setDefaultAutoSelectionDelayHours] = useState<number | string>(2);

  // Admin users state
  const [admins, setAdmins] = useState<any[]>([]);
  const [newName, setNewName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("event_admin");
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [assignedEventsInput, setAssignedEventsInput] = useState<string[]>([]);
  const [createEventToAdd, setCreateEventToAdd] = useState("");
  const [sendCredentialsEmailToggle, setSendCredentialsEmailToggle] = useState(true);
  const [eventSearchQuery, setEventSearchQuery] = useState("");
  const [newPermissions, setNewPermissions] = useState<string[]>(["events:view_roster", "attendance:mark"]);

  // Edit Admin states
  const [editingAdmin, setEditingAdmin] = useState<any>(null);
  const [editingName, setEditingName] = useState("");
  const [editingUsername, setEditingUsername] = useState("");
  const [editingEmail, setEditingEmail] = useState("");
  const [editingPhone, setEditingPhone] = useState("");
  const [editingPassword, setEditingPassword] = useState("");
  const [editingRole, setEditingRole] = useState("event_admin");
  const [editingAssignedEvents, setEditingAssignedEvents] = useState<string[]>([]);
  const [editingPermissions, setEditingPermissions] = useState<string[]>([]);
  const [editEventToAdd, setEditEventToAdd] = useState("");
  const [editEventSearchQuery, setEditEventSearchQuery] = useState("");
  const [isRefreshingEvents, setIsRefreshingEvents] = useState(false);
  const [editingIsActive, setEditingIsActive] = useState(true);
  const [resendCredentialsToggle, setResendCredentialsToggle] = useState(false);

  const [myUsername, setMyUsername] = useState("");
  const [myPassword, setMyPassword] = useState("");

  const handleRefreshEvents = async () => {
    setIsRefreshingEvents(true);
    await fetchAllEvents();
    setIsRefreshingEvents(false);
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      const data = await res.json();
      if (data.success && data.settings) {
        const val = data.settings;
        setHeadline(val.headline || "");
        setSubheadline(val.subheadline || "");
        setWhatsappLink(val.whatsappLink || "");
        setEmail(val.email || "");
        setAboutText(val.aboutText || "");
        setDosText(Array.isArray(val.dos) ? val.dos.join("\n") : "");
        setDontsText(Array.isArray(val.donts) ? val.donts.join("\n") : "");
        setReferralRewardAmount(val.referralRewardAmount !== undefined ? val.referralRewardAmount : 25);
        setAutoSelectionEmailsEnabled(val.autoSelectionEmailsEnabled !== undefined ? Boolean(val.autoSelectionEmailsEnabled) : true);
        setDefaultAutoSelectionDelayHours(val.defaultAutoSelectionDelayHours !== undefined ? val.defaultAutoSelectionDelayHours : 2);
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

  const fetchAllEvents = async () => {
    try {
      const res = await fetch("/api/admin/events");
      const data = await res.json();
      if (data.success) {
        setAllEvents(data.events || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchSettings(), fetchAdmins(), fetchAllEvents()]);
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
      whatsappLink,
      email,
      aboutText,
      dos,
      donts,
      referralRewardAmount: Number(referralRewardAmount) >= 20 ? Number(referralRewardAmount) : 25,
      autoSelectionEmailsEnabled,
      defaultAutoSelectionDelayHours: Math.max(0, Number(defaultAutoSelectionDelayHours) || 0),
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

    if (sendCredentialsEmailToggle && !newEmail.trim()) {
      alert("Please provide an email address to send login credentials, or uncheck the email credentials option.");
      return;
    }

    if ((newRole === "event_admin" || newRole === "calling") && assignedEventsInput.length === 0) {
      if (!confirm(`No events are selected for this ${newRole === "event_admin" ? "Event Admin" : "Calling Operator"}. They will not be able to manage any event until you assign them. Continue?`)) {
        return;
      }
    }

    try {
      setCreatingAdmin(true);
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim() || newUsername.trim(),
          username: newUsername.trim(),
          email: newEmail.trim() || undefined,
          phone: newPhone.trim() || undefined,
          password: newPassword,
          role: newRole,
          permissions: newRole === "event_admin" ? newPermissions : [],
          assignedEvents: ["event_admin", "calling"].includes(newRole) ? assignedEventsInput : [],
          sendEmailCredentials: sendCredentialsEmailToggle,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(data.message || "Admin created successfully!");
        setNewName("");
        setNewUsername("");
        setNewEmail("");
        setNewPhone("");
        setNewPassword("");
        setAssignedEventsInput([]);
        setNewPermissions(["events:view_roster", "attendance:mark"]);
        fetchAdmins();
      } else {
        alert(data.message || "Failed to create admin.");
      }
    } catch (err) {
      console.error(err);
      alert("Error creating administrator.");
    } finally {
      setCreatingAdmin(false);
    }
  };

  const handleEditAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;

    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId: editingAdmin._id || editingAdmin.id,
          name: editingName.trim(),
          username: editingUsername.trim(),
          email: editingEmail.trim() || undefined,
          phone: editingPhone.trim() || undefined,
          role: editingRole,
          isActive: editingIsActive,
          permissions: editingRole === "event_admin" ? editingPermissions : [],
          assignedEvents: ["event_admin", "calling"].includes(editingRole) ? editingAssignedEvents : [],
          ...(editingPassword.trim() && { password: editingPassword.trim() }),
          resendCredentials: resendCredentialsToggle,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("Admin updated successfully!");
        setEditingAdmin(null);
        fetchAdmins();
      } else {
        alert(data.message || "Failed to update admin.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAdmin = async (adminId: string, adminUsername: string) => {
    if (!confirm(`Are you sure you want to permanently delete the admin account "${adminUsername}"?`)) return;

    try {
      const res = await fetch(`/api/admin/users?id=${adminId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("Admin deleted successfully.");
        fetchAdmins();
      } else {
        alert(data.message || "Failed to delete admin.");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting admin.");
    }
  };

  const handleUpdateOwnCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myUsername.trim() && !myPassword.trim()) {
      alert("Enter a new username or password to update.");
      return;
    }

    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(myUsername.trim() && { username: myUsername.trim() }),
          ...(myPassword.trim() && { password: myPassword.trim() }),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(data.message || "Credentials updated successfully!");
        setMyUsername("");
        setMyPassword("");
      } else {
        alert(data.message || "Failed to update credentials.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredEventsForPicker = allEvents.filter((ev) =>
    ev.name.toLowerCase().includes(eventSearchQuery.toLowerCase()) ||
    (ev.location && ev.location.toLowerCase().includes(eventSearchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-10 max-w-6xl mx-auto pb-16 text-slate-900">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">System Settings & Role Management</h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage landing page copy, configure administrator permissions, assign Event Admins, and send login credentials.
          </p>
        </div>
        <button
          onClick={async () => {
            setLoading(true);
            await Promise.all([fetchSettings(), fetchAdmins(), fetchAllEvents()]);
            setLoading(false);
          }}
          disabled={loading}
          className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-2.5 rounded-xl text-xs transition border border-slate-300 flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50 shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Website Homepage CMS Settings Form */}
      <form onSubmit={handleSave} className="bg-white p-8 rounded-2xl border border-slate-200 space-y-6 shadow-sm">
        <h2 className="text-lg font-bold border-b border-slate-200 pb-3 uppercase tracking-wide text-red-600 flex items-center gap-2">
          <Save className="w-5 h-5" />
          <span>Website Homepage Copy & Contact Info</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Headline</label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g. Premium Hospitality & Banquet Staffing"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-red-600 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Subheadline</label>
            <input
              type="text"
              value={subheadline}
              onChange={(e) => setSubheadline(e.target.value)}
              placeholder="e.g. Empowering students with verified event opportunities"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-red-600 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">WhatsApp Community Link</label>
            <input
              type="text"
              value={whatsappLink}
              onChange={(e) => setWhatsappLink(e.target.value)}
              placeholder="https://chat.whatsapp.com/..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-red-600 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Support Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="support@toplineodc.co.in"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-red-600 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1">About Company Summary</label>
          <textarea
            value={aboutText}
            onChange={(e) => setAboutText(e.target.value)}
            rows={3}
            placeholder="Topline ODC is the leading student event workforce portal..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-slate-900 focus:outline-none focus:border-red-600 text-sm"
          ></textarea>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-xs font-bold text-slate-700 uppercase mb-1">Do's Guidelines (One per line)</h3>
            <textarea
              value={dosText}
              onChange={(e) => setDosText(e.target.value)}
              placeholder="Arrive 15 minutes before shift&#10;Wear clean black formal uniform"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-red-600 text-xs h-36"
            ></textarea>
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-700 uppercase mb-1">Don'ts Rules (One per line)</h3>
            <textarea
              value={dontsText}
              onChange={(e) => setDontsText(e.target.value)}
              placeholder="Do not leave early&#10;Do not damage hotel property"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-red-600 text-xs h-36"
            ></textarea>
          </div>
        </div>

        {/* Referral Program Reward Setting */}
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50/50 p-5 rounded-2xl border border-purple-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-purple-600" />
              <h3 className="font-extrabold text-sm text-purple-950 uppercase tracking-wider">
                Student Referral Reward Amount (₹)
              </h3>
            </div>
            <span className="text-[11px] font-bold text-purple-700 bg-white px-2.5 py-0.5 rounded-full border border-purple-200">
              Min ₹20 • Up to ₹150+
            </span>
          </div>
          <p className="text-xs text-purple-800/80 leading-relaxed">
            Set the cash bonus in Rupees (minimum ₹20) awarded to a referrer student when their invited friend completes their 1st verified catering event duty. Students are advertised &quot;Earn up to ₹150&quot;.
          </p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-1">
            <div className="relative w-full sm:w-56">
              <span className="absolute left-3.5 top-2.5 text-sm font-black text-purple-700">₹</span>
              <input
                type="number"
                min="20"
                step="1"
                required
                value={referralRewardAmount}
                onChange={(e) => setReferralRewardAmount(e.target.value)}
                placeholder="50"
                className="w-full bg-white border border-purple-300 rounded-xl pl-8 pr-3.5 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20"
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
              <span className="font-bold text-purple-900">Quick presets:</span>
              {[20, 25, 50, 75, 100, 150].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setReferralRewardAmount(amt)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    Number(referralRewardAmount) === amt
                      ? "bg-purple-600 text-white shadow-xs"
                      : "bg-white hover:bg-purple-100 text-purple-800 border border-purple-200"
                  }`}
                >
                  ₹{amt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Automated Candidate Selection & Email Settings (Super Admin) */}
        <div className="bg-gradient-to-br from-emerald-50 via-teal-50/50 to-slate-50 p-5 rounded-2xl border border-emerald-200/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/60 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="font-extrabold text-sm text-emerald-950 uppercase tracking-wider">
                  Automated Candidate Selection & WhatsApp Mails
                </h3>
                <p className="text-[11px] text-emerald-800/80">
                  Automatically approves candidates and immediately dispatches selection email with 2-hour confirmation deadline and 1-click WhatsApp unlock.
                </p>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-emerald-300 shadow-2xs">
              <input
                type="checkbox"
                checked={autoSelectionEmailsEnabled}
                onChange={(e) => setAutoSelectionEmailsEnabled(e.target.checked)}
                className="accent-emerald-600 rounded w-4 h-4 cursor-pointer"
              />
              <span className={`text-xs font-black ${autoSelectionEmailsEnabled ? "text-emerald-700" : "text-slate-400"}`}>
                {autoSelectionEmailsEnabled ? "GLOBAL AUTO-SEND: ACTIVE" : "GLOBAL AUTO-SEND: DISABLED"}
              </span>
            </label>
          </div>

          <div className="bg-white/90 p-3 rounded-xl border border-emerald-200/80 text-[11.5px] text-slate-700 space-y-1">
            <div className="font-extrabold text-emerald-900 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              <span>Automated System Behavior:</span>
            </div>
            <ul className="list-disc list-inside text-slate-600 space-y-0.5 text-[11px]">
              <li><strong>Instant Dispatch:</strong> Dispatches selection email immediately after the candidate submits the event form.</li>
              <li><strong>2-Hour Confirmation Window:</strong> The email features a prominent <em>Within 2 Hours</em> confirmation deadline badge.</li>
              <li><strong>WhatsApp Guard:</strong> Only sends if the event has a valid WhatsApp group link saved.</li>
              <li><strong>Idempotency:</strong> Guaranteed to send strictly <strong>only once</strong> per candidate.</li>
              <li><strong>Granular Control:</strong> Can also be turned off per event in the event dashboard or edit page.</li>
            </ul>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition duration-200 flex items-center justify-center gap-2 shadow-md shadow-red-500/20"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? "Saving Changes..." : "Save Website Settings"}</span>
        </button>
      </form>

      {/* Admin User Management Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Create New Admin Card (Spans 2 cols) */}
        <div className="lg:col-span-2 bg-white p-8 rounded-2xl border border-slate-200 space-y-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-lg font-bold uppercase tracking-wide text-red-600 flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              <span>Create Administrator / Event Admin</span>
            </h2>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
              Scoped Event Access
            </span>
          </div>

          <form onSubmit={handleCreateAdmin} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Admin Full Name *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Aman Verma"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-red-600 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Login Username *</label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. aman_eventadmin"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-red-600 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email Address (For Credentials Dispatch) *</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="aman@example.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-red-600 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Temporary Password *</label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="e.g. Topline@2026"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-red-600 text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Contact Phone (Optional)</label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="9876543210"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-red-600 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Administrative Role *</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-bold focus:outline-none focus:border-red-600 text-xs"
                >
                  <option value="event_admin">Event Admin (Assigned Events Only — Restricted Templates)</option>
                  <option value="calling">Calling Operator (Calling Dashboard)</option>
                  <option value="admin">Operations Captain (Full Admin Access)</option>
                  <option value="superadmin">Super Administrator</option>
                </select>
              </div>
            </div>

            {/* Event Multi-Select & Management for Event Admin / Calling Admin */}
            {["event_admin", "calling"].includes(newRole) && (
              <div className="space-y-3 border border-slate-200 rounded-2xl p-4 bg-slate-50/80">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                      Assign Managed Events ({assignedEventsInput.length} Selected)
                    </label>
                    <span className="text-[11px] text-slate-500">
                      Select which events this administrator is allowed to view and manage.
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={handleRefreshEvents}
                      disabled={isRefreshingEvents}
                      className="text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm transition"
                      title="Refresh latest events from database"
                    >
                      <RefreshCw className={`w-3 h-3 ${isRefreshingEvents ? "animate-spin text-red-600" : ""}`} />
                      Refresh
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssignedEventsInput(allEvents.map((e) => e._id || e.id))}
                      className="text-[11px] font-bold text-red-600 hover:text-red-700 bg-white border border-red-200 px-2 py-1 rounded-lg shadow-sm transition"
                    >
                      + Add All ({allEvents.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssignedEventsInput([])}
                      className="text-[11px] font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 px-2 py-1 rounded-lg shadow-sm transition"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {/* Quick Add Event Dropdown & Button */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-2">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Add Event (Present in system at this time)</span>
                  </label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <select
                      value={createEventToAdd}
                      onChange={(e) => setCreateEventToAdd(e.target.value)}
                      className="w-full sm:flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:border-red-600 truncate"
                    >
                      <option value="">
                        -- Select an available event to add ({allEvents.filter((e) => !assignedEventsInput.includes(e._id || e.id)).length} unassigned) --
                      </option>
                      {allEvents
                        .filter((e) => !assignedEventsInput.includes(e._id || e.id))
                        .map((ev) => {
                          const id = ev._id || ev.id;
                          const evDate = ev.date ? new Date(ev.date).toLocaleDateString("en-GB") : "";
                          return (
                            <option key={id} value={id}>
                              {ev.name} {evDate ? `(${evDate})` : ""} {ev.location ? `— ${ev.location}` : ""}
                            </option>
                          );
                        })}
                    </select>
                    <button
                      type="button"
                      disabled={!createEventToAdd}
                      onClick={() => {
                        if (createEventToAdd && !assignedEventsInput.includes(createEventToAdd)) {
                          setAssignedEventsInput([...assignedEventsInput, createEventToAdd]);
                          setCreateEventToAdd("");
                        }
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold px-3.5 py-2 rounded-lg flex items-center justify-center gap-1 shadow-sm transition shrink-0 whitespace-nowrap cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Event</span>
                    </button>
                  </div>
                </div>

                {/* Assigned Events Chips / List with Delete Button */}
                {assignedEventsInput.length > 0 && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">
                      Assigned Events ({assignedEventsInput.length}):
                    </label>
                    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                      {assignedEventsInput.map((eventId) => {
                        const ev = allEvents.find((e) => (e._id || e.id) === eventId);
                        const evName = ev ? ev.name : `Event (${eventId})`;
                        const evDate = ev && ev.date ? new Date(ev.date).toLocaleDateString("en-GB") : null;
                        const evLocation = ev?.location;
                        const evStatus = ev?.status;

                        return (
                          <div
                            key={eventId}
                            className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200 shadow-xs hover:border-red-200 transition text-xs"
                          >
                            <div className="flex-1 min-w-0 pr-2">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 truncate">{evName}</span>
                                {evStatus && (
                                  <span
                                    className={`px-1.5 py-0.2 rounded-full text-[9px] font-extrabold uppercase shrink-0 ${
                                      evStatus === "OPEN"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : evStatus === "DRAFT"
                                        ? "bg-amber-100 text-amber-800"
                                        : "bg-slate-100 text-slate-600"
                                    }`}
                                  >
                                    {evStatus}
                                  </span>
                                )}
                              </div>
                              {(evDate || evLocation) && (
                                <div className="text-[11px] text-slate-500 truncate mt-0.5">
                                  {evDate && <span>Date: {evDate}</span>}
                                  {evDate && evLocation && <span> • </span>}
                                  {evLocation && <span>Location: {evLocation}</span>}
                                </div>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => setAssignedEventsInput(assignedEventsInput.filter((id) => id !== eventId))}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition shrink-0"
                              title="Delete/remove this event"
                            >
                              <Trash2 className="w-3 h-3 text-rose-600" />
                              Remove
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Filter and Checklist for Quick Multi-Selection */}
                <div className="pt-2 border-t border-slate-200/80">
                  <div className="relative mb-2">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={eventSearchQuery}
                      onChange={(e) => setEventSearchQuery(e.target.value)}
                      placeholder="Search and toggle all present events..."
                      className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-red-600"
                    />
                  </div>

                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                    {filteredEventsForPicker.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2">No matching events found.</p>
                    ) : (
                      filteredEventsForPicker.map((ev) => {
                        const id = ev._id || ev.id;
                        const isChecked = assignedEventsInput.includes(id);
                        return (
                          <label
                            key={id}
                            className={`flex items-start gap-2.5 p-2 rounded-xl border text-xs cursor-pointer transition ${
                              isChecked
                                ? "bg-red-50/60 border-red-200 text-slate-900"
                                : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) setAssignedEventsInput([...assignedEventsInput, id]);
                                else setAssignedEventsInput(assignedEventsInput.filter((x) => x !== id));
                              }}
                              className="rounded border-slate-300 text-red-600 mt-0.5 accent-red-600"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="font-extrabold text-slate-900 truncate">{ev.name}</span>
                                <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                                  ev.status === "OPEN" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                                }`}>
                                  {ev.status}
                                </span>
                              </div>
                              <span className="text-slate-500 text-[11px] block mt-0.5 truncate">
                                {new Date(ev.date).toLocaleDateString("en-GB")} — {ev.location}
                              </span>
                            </div>
                          </label>
                        );
                      })
                    )}
                    </div>
                  </div>
                </div>
            )}

            {/* Feature Access & IAM Permissions for Event Admin */}
            {newRole === "event_admin" && (
              <div className="space-y-3 border border-indigo-200 rounded-2xl p-4 bg-indigo-50/50">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 pb-2.5">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-indigo-600" />
                      <label className="block text-xs font-extrabold text-indigo-950 uppercase tracking-wider">
                        IAM Feature Permissions ({newPermissions.length} Enabled)
                      </label>
                    </div>
                    <span className="text-[11px] text-indigo-700/80">
                      Configure what buttons, lifecycle actions, and master database tools this Event Admin is authorized to use.
                    </span>
                  </div>

                  {/* One-Click Presets */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {PERMISSION_PRESETS.map((preset) => {
                      const isActive =
                        preset.permissions.length === newPermissions.length &&
                        preset.permissions.every((p) => newPermissions.includes(p));

                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setNewPermissions(preset.permissions)}
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition shadow-2xs cursor-pointer ${
                            isActive
                              ? "bg-indigo-600 text-white border-indigo-700 font-extrabold"
                              : "bg-white text-indigo-900 border-indigo-200 hover:bg-indigo-100"
                          }`}
                          title={preset.description}
                        >
                          {preset.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Granular Checkbox Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {EVENT_PERMISSIONS.map((perm) => {
                    const isChecked = newPermissions.includes(perm.key);
                    const isLocked = perm.key === "events:view_roster";

                    return (
                      <label
                        key={perm.key}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition cursor-pointer ${
                          isChecked
                            ? "bg-white border-indigo-300 shadow-2xs"
                            : "bg-white/60 border-slate-200 hover:bg-white text-slate-600"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isLocked}
                          onChange={(e) => {
                            if (isLocked) return;
                            if (e.target.checked) {
                              setNewPermissions([...newPermissions, perm.key]);
                            } else {
                              setNewPermissions(newPermissions.filter((k) => k !== perm.key));
                            }
                          }}
                          className="rounded border-slate-300 text-indigo-600 mt-0.5 accent-indigo-600 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-slate-900">{perm.label}</span>
                            <span className="text-[9px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded uppercase tracking-wider">{perm.category}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-tight mt-0.5">{perm.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Send Credentials Email Toggle */}
            <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-800 cursor-pointer pt-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <input
                type="checkbox"
                checked={sendCredentialsEmailToggle}
                onChange={(e) => setSendCredentialsEmailToggle(e.target.checked)}
                className="accent-red-600 rounded"
              />
              <span className="flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-red-600" />
                Automatically dispatch login credentials and portal access link to the administrator's email address
              </span>
            </label>

            <button
              type="submit"
              disabled={creatingAdmin}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold py-3 rounded-xl transition text-xs shadow-md shadow-red-500/20 flex items-center justify-center gap-2"
            >
              {creatingAdmin ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Creating Account & Sending Email...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Register Administrator Account</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Update Own Credentials Card */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 space-y-4 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold border-b border-slate-200 pb-3 uppercase tracking-wide text-red-600 flex items-center gap-2">
              <Key className="w-5 h-5" />
              <span>Change My Password</span>
            </h2>
            <form onSubmit={handleUpdateOwnCredentials} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">New Username</label>
                <input
                  type="text"
                  value={myUsername}
                  onChange={(e) => setMyUsername(e.target.value)}
                  placeholder="Enter new username..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-red-600 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">New Password</label>
                <input
                  type="password"
                  value={myPassword}
                  onChange={(e) => setMyPassword(e.target.value)}
                  placeholder="Enter new password..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-red-600 text-xs"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-black text-white font-bold py-2.5 rounded-xl transition text-xs shadow-sm"
              >
                Update My Credentials
              </button>
            </form>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-[11px] text-slate-500 space-y-1">
            <span className="font-bold text-slate-700 block">Security Note:</span>
            <p>Super Admins can manage all roles, dispatch credentials, and grant granular event management permissions.</p>
          </div>
        </div>

      </div>

      {/* Admin Users Roster */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h2 className="text-lg font-bold uppercase tracking-wide text-red-600 flex items-center gap-2">
            <Users className="w-5 h-5" />
            <span>Active Administrators ({admins.length})</span>
          </h2>
          <span className="text-xs text-slate-400 font-semibold">Total Accounts</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse whitespace-nowrap">
            <thead>
              <tr className="text-slate-400 border-b border-slate-200 uppercase text-xs font-bold">
                <th className="pb-3 px-3">Administrator</th>
                <th className="pb-3 px-3">Role</th>
                <th className="pb-3 px-3">Contact Email</th>
                <th className="pb-3 px-3">Status</th>
                <th className="pb-3 px-3">Managed Event Scope</th>
                <th className="pb-3 px-3">Joined Date</th>
                <th className="pb-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {admins.map((adm) => (
                <tr key={adm._id || adm.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-4 px-3">
                    <span className="font-extrabold text-slate-900 block">{adm.name || adm.username}</span>
                    <span className="text-xs text-slate-400 font-mono">@{adm.username}</span>
                  </td>
                  <td className="py-4 px-3 uppercase text-xs">
                    <span className={`px-2.5 py-1 rounded-full font-bold border text-[11px] ${
                      adm.role === "superadmin"
                        ? "bg-red-50 text-red-700 border-red-200"
                        : adm.role === "admin"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : adm.role === "event_admin"
                        ? "bg-purple-50 text-purple-700 border-purple-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}>
                      {adm.role === "event_admin"
                        ? "Event Admin"
                        : adm.role === "calling"
                        ? "Calling Operator"
                        : adm.role}
                    </span>
                  </td>
                  <td className="py-4 px-3 text-xs">
                    {adm.email ? (
                      <span className="text-slate-700 font-medium">{adm.email}</span>
                    ) : (
                      <span className="text-slate-400 italic">No email</span>
                    )}
                  </td>
                  <td className="py-4 px-3 text-xs">
                    <span className={`px-2 py-0.5 rounded font-bold border ${
                      adm.isActive !== false
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-rose-50 text-rose-700 border-rose-200"
                    }`}>
                      {adm.isActive !== false ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="py-4 px-3 text-xs max-w-xs">
                    {["event_admin", "calling"].includes(adm.role) ? (
                      <div>
                        {adm.assignedEvents && adm.assignedEvents.length > 0 ? (
                          <div className="flex flex-wrap gap-1 mb-1">
                            {adm.assignedEvents.map((ev: any) => (
                              <span key={ev._id || ev.id} className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md text-[10px] font-semibold text-slate-700" title={ev.name}>
                                {ev.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-rose-500 font-bold text-[11px] inline-flex items-center gap-1 mb-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            No events assigned
                          </span>
                        )}
                        {adm.role === "event_admin" && (
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.2 rounded text-[10px] font-extrabold flex items-center gap-1">
                              <Shield className="w-2.5 h-2.5" />
                              {(adm.customPermissions?.length || adm.assignedEvents?.[0]?.permissions?.length || 2)} Perms
                            </span>
                            {(adm.customPermissions?.includes("students:add_from_master") || adm.assignedEvents?.[0]?.permissions?.includes("students:add_from_master")) && (
                              <span className="bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.2 rounded text-[9px] font-bold">
                                +Master DB
                              </span>
                            )}
                            {(adm.customPermissions?.includes("events:close_resume") || adm.assignedEvents?.[0]?.permissions?.includes("events:close_resume")) && (
                              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded text-[9px] font-bold">
                                Form Control
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-emerald-700 font-semibold text-xs">🌐 Global Access</span>
                    )}
                  </td>
                  <td className="py-4 px-3 text-xs text-slate-400">{new Date(adm.createdAt).toLocaleDateString("en-GB")}</td>
                  <td className="py-4 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => {
                          setEditingAdmin(adm);
                          setEditingName(adm.name || "");
                          setEditingUsername(adm.username);
                          setEditingEmail(adm.email || "");
                          setEditingPhone(adm.phone || "");
                          setEditingRole(adm.role || "event_admin");
                          setEditingIsActive(adm.isActive !== false);
                          setEditingPassword("");
                          setResendCredentialsToggle(false);
                          setEditingAssignedEvents(adm.assignedEvents ? adm.assignedEvents.map((e: any) => e._id || e.id || e) : []);
                          const existingPerms =
                            Array.isArray(adm.customPermissions) && adm.customPermissions.length > 0
                              ? adm.customPermissions
                              : Array.isArray(adm.assignedEvents?.[0]?.permissions) && adm.assignedEvents[0].permissions.length > 0
                              ? adm.assignedEvents[0].permissions
                              : ["events:view_roster", "attendance:mark"];
                          setEditingPermissions(existingPerms);
                        }}
                        className="text-xs bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition font-bold flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteAdmin(adm._id || adm.id, adm.username)}
                        className="text-xs bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 px-2.5 py-1.5 rounded-lg transition font-bold"
                        title="Delete Admin"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Admin Modal */}
      {editingAdmin && (
        <div
          onClick={() => setEditingAdmin(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 shrink-0">
              <div className="min-w-0 pr-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 uppercase truncate">
                  Edit Admin — {editingAdmin.username}
                </h3>
                <p className="text-[11px] text-slate-500 truncate">
                  Configure role, credentials, and assigned event permissions
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingAdmin(null)}
                className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition cursor-pointer shrink-0"
                title="Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditAdminSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-red-600 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={editingUsername}
                    onChange={(e) => setEditingUsername(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-red-600 text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    value={editingEmail}
                    onChange={(e) => setEditingEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-red-600 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Role</label>
                  <select
                    value={editingRole}
                    onChange={(e) => setEditingRole(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-red-600 text-xs"
                  >
                    <option value="event_admin">Event Admin</option>
                    <option value="calling">Calling Operator</option>
                    <option value="admin">Operations Captain (Admin)</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">New Password (Leave blank to keep current)</label>
                <input
                  type="text"
                  value={editingPassword}
                  onChange={(e) => setEditingPassword(e.target.value)}
                  placeholder="Enter new password to reset..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-red-600 text-xs font-mono"
                />
              </div>

              <div className="flex items-center space-x-2 py-1">
                <input
                  type="checkbox"
                  id="editIsActive"
                  checked={editingIsActive}
                  onChange={(e) => setEditingIsActive(e.target.checked)}
                  className="rounded border-slate-300 text-red-600 accent-red-600"
                />
                <label htmlFor="editIsActive" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Account Active / Enabled
                </label>
              </div>

              {/* Event assignment in edit modal */}
              {["event_admin", "calling"].includes(editingRole) && (
                <div className="space-y-3 border border-slate-200 rounded-2xl p-3 sm:p-4 bg-slate-50/90">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                    <div>
                      <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                        🎪 Managed Events ({editingAssignedEvents.length} Assigned)
                      </label>
                      <span className="text-[11px] text-slate-500">
                        Assign or delete event access permissions for this administrator.
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={handleRefreshEvents}
                        disabled={isRefreshingEvents}
                        className="text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-2 py-1 rounded-lg flex items-center gap-1 shadow-xs transition cursor-pointer"
                        title="Refresh latest events from database"
                      >
                        <RefreshCw className={`w-3 h-3 ${isRefreshingEvents ? "animate-spin text-red-600" : ""}`} />
                        Refresh
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingAssignedEvents(allEvents.map((e) => e._id || e.id))}
                        className="text-[11px] font-bold text-red-600 hover:text-red-700 bg-white border border-red-200 px-2 py-1 rounded-lg shadow-xs transition cursor-pointer"
                      >
                        + Add All ({allEvents.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingAssignedEvents([])}
                        className="text-[11px] font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 px-2 py-1 rounded-lg shadow-xs transition cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  {/* Quick Add Event Dropdown & Button */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-2">
                    <label className="text-[11px] font-bold text-slate-700 uppercase flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-emerald-600" /> Add Event (Present in system at this time)
                    </label>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <select
                        value={editEventToAdd}
                        onChange={(e) => setEditEventToAdd(e.target.value)}
                        className="w-full sm:flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:border-red-600 truncate"
                      >
                        <option value="">
                          -- Select an available event to add ({allEvents.filter((e) => !editingAssignedEvents.includes(e._id || e.id)).length} unassigned) --
                        </option>
                        {allEvents
                          .filter((e) => !editingAssignedEvents.includes(e._id || e.id))
                          .map((ev) => {
                            const id = ev._id || ev.id;
                            const evDate = ev.date ? new Date(ev.date).toLocaleDateString("en-GB") : "";
                            return (
                              <option key={id} value={id}>
                                {ev.name} {evDate ? `(${evDate})` : ""} {ev.location ? `— ${ev.location}` : ""}
                              </option>
                            );
                          })}
                      </select>
                      <button
                        type="button"
                        disabled={!editEventToAdd}
                        onClick={() => {
                          if (editEventToAdd && !editingAssignedEvents.includes(editEventToAdd)) {
                            setEditingAssignedEvents([...editingAssignedEvents, editEventToAdd]);
                            setEditEventToAdd("");
                          }
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold px-3.5 py-2 rounded-lg flex items-center justify-center gap-1 shadow-sm transition shrink-0 whitespace-nowrap cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Event</span>
                      </button>
                    </div>
                  </div>

                  {/* List of Currently Assigned Events with Delete/Remove Buttons */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-bold text-slate-700 uppercase">
                        Currently Assigned Events ({editingAssignedEvents.length}):
                      </label>
                      <a
                        href="/admin/events/create"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-red-600 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <ExternalLink className="w-2.5 h-2.5" /> Create new event in system
                      </a>
                    </div>

                    {editingAssignedEvents.length === 0 ? (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                        <p className="text-xs font-bold text-amber-800 flex items-center justify-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> No events currently assigned
                        </p>
                        <p className="text-[11px] text-amber-600 mt-0.5">
                          Select an event above and click &quot;+ Add Event&quot;, or click &quot;+ Add All&quot; to assign events.
                        </p>
                      </div>
                    ) : (
                      <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                        {editingAssignedEvents.map((eventId) => {
                          const ev = allEvents.find((e) => (e._id || e.id) === eventId);
                          const evName = ev ? ev.name : `Event (${eventId})`;
                          const evDate = ev && ev.date ? new Date(ev.date).toLocaleDateString("en-GB") : null;
                          const evLocation = ev?.location;
                          const evStatus = ev?.status;

                          return (
                            <div
                              key={eventId}
                              className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white border border-slate-200 shadow-xs hover:border-red-200 transition text-xs"
                            >
                              <div className="flex-1 min-w-0 pr-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 truncate">{evName}</span>
                                  {evStatus && (
                                    <span
                                      className={`px-1.5 py-0.2 rounded-full text-[9px] font-extrabold uppercase shrink-0 ${
                                        evStatus === "OPEN"
                                          ? "bg-emerald-100 text-emerald-800"
                                          : evStatus === "DRAFT"
                                          ? "bg-amber-100 text-amber-800"
                                          : "bg-slate-100 text-slate-600"
                                      }`}
                                    >
                                      {evStatus}
                                    </span>
                                  )}
                                </div>
                                {(evDate || evLocation) && (
                                  <div className="text-[11px] text-slate-500 truncate mt-0.5">
                                    {evDate && <span>Date: {evDate}</span>}
                                    {evDate && evLocation && <span> • </span>}
                                    {evLocation && <span>Location: {evLocation}</span>}
                                  </div>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => setEditingAssignedEvents(editingAssignedEvents.filter((id) => id !== eventId))}
                                className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition shrink-0 cursor-pointer"
                                title="Delete/remove this event from this admin"
                              >
                                <Trash2 className="w-3 h-3 text-rose-600" />
                                <span className="hidden xs:inline">Remove</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Filter and Checklist for Quick Multi-Selection */}
                  <div className="pt-2 border-t border-slate-200/80">
                    <div className="relative mb-2">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        value={editEventSearchQuery}
                        onChange={(e) => setEditEventSearchQuery(e.target.value)}
                        placeholder="Search and toggle all present events..."
                        className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-red-600"
                      />
                    </div>

                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                      {allEvents
                        .filter(
                          (ev) =>
                            ev.name.toLowerCase().includes(editEventSearchQuery.toLowerCase()) ||
                            (ev.location && ev.location.toLowerCase().includes(editEventSearchQuery.toLowerCase()))
                        )
                        .map((ev) => {
                          const id = ev._id || ev.id;
                          const isChecked = editingAssignedEvents.includes(id);
                          return (
                            <label
                              key={id}
                              className={`flex items-start gap-2 p-1.5 rounded-lg border text-xs cursor-pointer transition ${
                                isChecked
                                  ? "bg-red-50/60 border-red-200 text-slate-900"
                                  : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) setEditingAssignedEvents([...editingAssignedEvents, id]);
                                  else setEditingAssignedEvents(editingAssignedEvents.filter((x) => x !== id));
                                }}
                                className="rounded border-slate-300 text-red-600 mt-0.5 accent-red-600"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-slate-900 truncate">{ev.name}</span>
                                  <span
                                    className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold uppercase shrink-0 ${
                                      ev.status === "OPEN" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                                    }`}
                                  >
                                    {ev.status}
                                  </span>
                                </div>
                                <span className="text-slate-500 text-[10px] block truncate">
                                  {new Date(ev.date).toLocaleDateString("en-GB")} — {ev.location}
                                </span>
                              </div>
                            </label>
                          );
                        })}
                    </div>
                  </div>
                </div>
              )}

              {/* Feature Access & IAM Permissions for Event Admin in Edit Modal */}
              {editingRole === "event_admin" && (
                <div className="space-y-3 border border-indigo-200 rounded-2xl p-3.5 sm:p-4 bg-indigo-50/50">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 pb-2.5">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Shield className="w-4 h-4 text-indigo-600" />
                        <label className="block text-xs font-extrabold text-indigo-950 uppercase tracking-wider">
                          IAM Feature Permissions ({editingPermissions.length} Enabled)
                        </label>
                      </div>
                      <span className="text-[11px] text-indigo-700/80">
                        Configure what buttons, lifecycle actions, and master candidate tools this administrator is authorized to execute.
                      </span>
                    </div>

                    {/* One-Click Presets */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {PERMISSION_PRESETS.map((preset) => {
                        const isActive =
                          preset.permissions.length === editingPermissions.length &&
                          preset.permissions.every((p) => editingPermissions.includes(p));

                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setEditingPermissions(preset.permissions)}
                            className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition shadow-2xs cursor-pointer ${
                              isActive
                                ? "bg-indigo-600 text-white border-indigo-700 font-extrabold"
                                : "bg-white text-indigo-900 border-indigo-200 hover:bg-indigo-100"
                            }`}
                            title={preset.description}
                          >
                            {preset.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Granular Checkbox Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {EVENT_PERMISSIONS.map((perm) => {
                      const isChecked = editingPermissions.includes(perm.key);
                      const isLocked = perm.key === "events:view_roster";

                      return (
                        <label
                          key={perm.key}
                          className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition cursor-pointer ${
                            isChecked
                              ? "bg-white border-indigo-300 shadow-2xs"
                              : "bg-white/60 border-slate-200 hover:bg-white text-slate-600"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isLocked}
                            onChange={(e) => {
                              if (isLocked) return;
                              if (e.target.checked) {
                                setEditingPermissions([...editingPermissions, perm.key]);
                              } else {
                                setEditingPermissions(editingPermissions.filter((k) => k !== perm.key));
                              }
                            }}
                            className="rounded border-slate-300 text-indigo-600 mt-0.5 accent-indigo-600 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-bold text-slate-900">{perm.label}</span>
                              <span className="text-[9px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded uppercase tracking-wider">{perm.category}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-tight mt-0.5">{perm.description}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {editingPassword && editingEmail && (
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer bg-blue-50 p-2.5 rounded-xl border border-blue-200">
                  <input
                    type="checkbox"
                    checked={resendCredentialsToggle}
                    onChange={(e) => setResendCredentialsToggle(e.target.checked)}
                    className="accent-blue-600 rounded"
                  />
                  <span>Email updated password & credentials to {editingEmail}</span>
                </label>
              )}

              <div className="flex gap-2 pt-3 border-t border-slate-200 shrink-0 bg-white sticky bottom-0">
                <button
                  type="button"
                  onClick={() => setEditingAdmin(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition shadow cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
