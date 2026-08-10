"use client";

import { useEffect, useState } from "react";
import { Save, UserPlus, Key, Users } from "lucide-react";

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Homepage / Website settings States
  const [headline, setHeadline] = useState("");
  const [subheadline, setSubheadline] = useState("");
  const [whatsappLink, setWhatsappLink] = useState("");
  const [email, setEmail] = useState("");
  const [aboutText, setAboutText] = useState("");
  const [dosText, setDosText] = useState("");
  const [dontsText, setDontsText] = useState("");

  // Admin users state
  const [admins, setAdmins] = useState<any[]>([]);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("calling");
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [assignedEventsInput, setAssignedEventsInput] = useState<string[]>([]);

  // Edit Admin states
  const [editingAdmin, setEditingAdmin] = useState<any>(null);
  const [editingUsername, setEditingUsername] = useState("");
  const [editingPassword, setEditingPassword] = useState("");
  const [editingRole, setEditingRole] = useState("calling");
  const [editingAssignedEvents, setEditingAssignedEvents] = useState<string[]>([]);
  const [editingIsActive, setEditingIsActive] = useState(true);

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
        setWhatsappLink(val.whatsappLink || "");
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

  const fetchRecentEvents = async () => {
    try {
      const res = await fetch("/api/admin/events?recent=true");
      const data = await res.json();
      if (data.success) {
        setRecentEvents(data.events);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchSettings(), fetchAdmins(), fetchRecentEvents()]);
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
          assignedEvents: newRole === "calling" ? assignedEventsInput : []
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(data.message);
        setNewUsername("");
        setNewPassword("");
        setAssignedEventsInput([]);
        fetchAdmins();
      } else {
        alert(data.message || "Failed to create admin.");
      }
    } catch (err) {
      console.error(err);
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
          adminId: editingAdmin._id,
          username: editingUsername,
          role: editingRole,
          isActive: editingIsActive,
          assignedEvents: editingRole === "calling" ? editingAssignedEvents : [],
          ...(editingPassword.trim() && { password: editingPassword })
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

  if (loading) return <div className="text-slate-900 text-center py-12">Loading settings module...</div>;

  return (
    <div className="space-y-12 text-slate-900 max-w-4xl mx-auto pb-12">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-wider text-red-600 uppercase">
          Website Settings
        </h1>
        <p className="text-slate-500 text-sm mt-1">Configure banner copywriting, social networks, and student conduct guidelines</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6 bg-white p-8 rounded-xl border border-slate-200">
        
        <div className="space-y-4">
          <h2 className="text-lg font-bold border-b border-slate-200 pb-2 uppercase tracking-wide text-red-600">Homepage Banner Copy</h2>
          
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Headline</label>
            <input
              type="text"
              required
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-red-600 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Subheadline / Supporting Text</label>
            <textarea
              required
              value={subheadline}
              onChange={(e) => setSubheadline(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-red-600 text-sm h-24"
            ></textarea>
          </div>
        </div>

        <div className="space-y-4 pt-6 border-t border-slate-200">
          <h2 className="text-lg font-bold border-b border-slate-200 pb-2 uppercase tracking-wide text-red-600">Contact Details</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">WhatsApp Group Invite Link</label>
              <input
                type="url"
                required
                value={whatsappLink}
                onChange={(e) => setWhatsappLink(e.target.value)}
                placeholder="https://chat.whatsapp.com/..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-red-600 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Contact Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-red-600 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">About Section Text</label>
            <textarea
              value={aboutText}
              onChange={(e) => setAboutText(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-red-600 text-sm h-24"
            ></textarea>
          </div>
        </div>

        <div className="space-y-4 pt-6 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-bold border-b border-slate-200 pb-2 uppercase tracking-wide text-emerald-450">Do's Rules (One per line)</h2>
            <textarea
              value={dosText}
              onChange={(e) => setDosText(e.target.value)}
              placeholder="Arrive on time&#10;Wear correct uniform"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-red-600 text-sm h-48 mt-2"
            ></textarea>
          </div>
          <div>
            <h2 className="text-lg font-bold border-b border-slate-200 pb-2 uppercase tracking-wide text-red-450">Don'ts Rules (One per line)</h2>
            <textarea
              value={dontsText}
              onChange={(e) => setDontsText(e.target.value)}
              placeholder="Do not leave early&#10;Do not damage hotel property"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-red-600 text-sm h-48 mt-2"
            ></textarea>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold py-3 rounded-lg transition duration-200 flex items-center justify-center space-x-2"
        >
          <Save className="w-5 h-5" />
          <span>{saving ? "Saving Changes..." : "Save Website Settings"}</span>
        </button>
      </form>

      {/* Admin User Management Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Update Own Credentials Card */}
        <div className="bg-white p-8 rounded-xl border border-slate-200 space-y-4">
          <h2 className="text-lg font-bold border-b border-slate-200 pb-2 uppercase tracking-wide text-red-600 flex items-center space-x-2">
            <Key className="w-5 h-5" />
            <span>Change My Credentials</span>
          </h2>
          <form onSubmit={handleUpdateOwnCredentials} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">New Username</label>
              <input
                type="text"
                value={myUsername}
                onChange={(e) => setMyUsername(e.target.value)}
                placeholder="Enter new username..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-red-600 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">New Password</label>
              <input
                type="password"
                value={myPassword}
                onChange={(e) => setMyPassword(e.target.value)}
                placeholder="Enter new password..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-red-600 text-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-transparent hover:bg-red-600 hover:text-white border border-red-600/30 text-red-600 font-bold py-2 rounded-lg transition text-sm"
            >
              Update Credentials
            </button>
          </form>
        </div>

        {/* Create New Admin Card */}
        <div className="bg-white p-8 rounded-xl border border-slate-200 space-y-4">
          <h2 className="text-lg font-bold border-b border-slate-200 pb-2 uppercase tracking-wide text-red-600 flex items-center space-x-2">
            <UserPlus className="w-5 h-5" />
            <span>Create New Admin</span>
          </h2>
          <form onSubmit={handleCreateAdmin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Username *</label>
              <input
                type="text"
                required
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="e.g. captain_aman"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-red-600 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Password *</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-red-600 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Role</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-red-650 text-sm"
              >
                <option value="calling">Calling Operator (Calling Admin)</option>
                <option value="admin">Captain (Admin)</option>
                <option value="superadmin">Super Admin</option>
              </select>
            </div>

            {newRole === "calling" && (
              <div className="space-y-2 border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Assign Events (Recent 3)</label>
                {recentEvents.length === 0 ? (
                  <p className="text-xs text-slate-450 italic">No recent events available for assignment.</p>
                ) : (
                  recentEvents.map((ev) => (
                    <label key={ev._id} className="flex items-start space-x-2 text-xs text-slate-700 cursor-pointer hover:text-slate-900">
                      <input
                        type="checkbox"
                        checked={assignedEventsInput.includes(ev._id)}
                        onChange={(e) => {
                          if (e.target.checked) setAssignedEventsInput([...assignedEventsInput, ev._id]);
                          else setAssignedEventsInput(assignedEventsInput.filter((id) => id !== ev._id));
                        }}
                        className="rounded border-slate-200 text-red-655 mt-0.5"
                      />
                      <div>
                        <span className="font-bold block">{ev.name}</span>
                        <span className="text-slate-450 text-[10px]">{new Date(ev.date).toLocaleDateString("en-GB")} — {ev.location}</span>
                      </div>
                    </label>
                  ))
                )}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-lg transition text-sm shadow-sm"
            >
              Register New Admin
            </button>
          </form>
        </div>

      </div>

      {/* Admin Users Roster */}
      <div className="bg-white p-8 rounded-xl border border-slate-200 space-y-4 shadow-sm">
        <h2 className="text-lg font-bold border-b border-slate-200 pb-2 uppercase tracking-wide text-red-600 flex items-center space-x-2">
          <Users className="w-5 h-5" />
          <span>Active Administrators ({admins.length})</span>
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse whitespace-nowrap">
            <thead>
              <tr className="text-slate-450 border-b border-slate-200 uppercase text-xs font-bold">
                <th className="pb-3 px-2">Username</th>
                <th className="pb-3 px-2">Role</th>
                <th className="pb-3 px-2">Status</th>
                <th className="pb-3 px-2">Assigned Events</th>
                <th className="pb-3 px-2">Registered Date</th>
                <th className="pb-3 px-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-650">
              {admins.map((adm) => (
                <tr key={adm._id} className="hover:bg-slate-50/50 transition">
                  <td className="py-4 px-2 font-semibold text-slate-900">{adm.username}</td>
                  <td className="py-4 px-2 uppercase text-xs">
                    <span className={`px-2 py-0.5 rounded font-bold border ${
                      adm.role === "superadmin"
                        ? "bg-red-50 text-red-600 border-red-200"
                        : adm.role === "admin"
                        ? "bg-blue-50 text-blue-600 border-blue-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}>
                      {adm.role === "calling" ? "Calling Operator" : adm.role}
                    </span>
                  </td>
                  <td className="py-4 px-2 text-xs">
                    <span className={`px-2 py-0.5 rounded font-bold border ${
                      adm.isActive !== false
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-rose-50 text-rose-700 border-rose-200"
                    }`}>
                      {adm.isActive !== false ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="py-4 px-2 text-xs max-w-xs truncate">
                    {adm.role === "calling" ? (
                      adm.assignedEvents && adm.assignedEvents.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {adm.assignedEvents.map((ev: any) => (
                            <span key={ev._id} className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[10px] text-slate-600" title={ev.name}>
                              {ev.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">No assigned events</span>
                      )
                    ) : (
                      <span className="text-slate-400">All access (Global)</span>
                    )}
                  </td>
                  <td className="py-4 px-2 text-xs text-slate-450">{new Date(adm.createdAt).toLocaleDateString("en-GB")}</td>
                  <td className="py-4 px-2 text-right">
                    <button
                      onClick={() => {
                        setEditingAdmin(adm);
                        setEditingUsername(adm.username);
                        setEditingRole(adm.role || "calling");
                        setEditingIsActive(adm.isActive !== false);
                        setEditingPassword("");
                        setEditingAssignedEvents(adm.assignedEvents ? adm.assignedEvents.map((e: any) => e._id || e) : []);
                      }}
                      className="text-xs bg-slate-900 text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition font-bold"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Admin Modal */}
      {editingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 relative animate-scale-in">
            <h3 className="text-lg font-bold border-b border-slate-250 pb-2 text-slate-900 uppercase">
              Edit Admin Settings
            </h3>
            
            <form onSubmit={handleEditAdminSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={editingUsername}
                  onChange={(e) => setEditingUsername(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-red-650 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">New Password (Optional)</label>
                <input
                  type="password"
                  value={editingPassword}
                  onChange={(e) => setEditingPassword(e.target.value)}
                  placeholder="Leave blank to keep current password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-red-650 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Role</label>
                <select
                  value={editingRole}
                  onChange={(e) => setEditingRole(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-red-650 text-xs"
                >
                  <option value="calling">Calling Operator (Calling Admin)</option>
                  <option value="admin">Captain (Admin)</option>
                  <option value="superadmin">Super Admin</option>
                </select>
              </div>

              <div className="flex items-center space-x-2 py-1">
                <input
                  type="checkbox"
                  id="editIsActive"
                  checked={editingIsActive}
                  onChange={(e) => setEditingIsActive(e.target.checked)}
                  className="rounded border-slate-200 text-red-655"
                />
                <label htmlFor="editIsActive" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Is Account Active / Enabled
                </label>
              </div>

              {editingRole === "calling" && (
                <div className="space-y-2 border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Assign Events (Recent 3)</label>
                  {/* Merge recent events with any currently assigned events */}
                  {(() => {
                    const uniqueOptions = [...recentEvents];
                    editingAdmin.assignedEvents?.forEach((assignedEv: any) => {
                      const exists = uniqueOptions.some((x) => x._id === (assignedEv._id || assignedEv));
                      if (!exists) {
                        uniqueOptions.push(assignedEv);
                      }
                    });

                    if (uniqueOptions.length === 0) {
                      return <p className="text-xs text-slate-450 italic">No events available.</p>;
                    }

                    return uniqueOptions.map((ev) => (
                      <label key={ev._id} className="flex items-start space-x-2 text-xs text-slate-700 cursor-pointer hover:text-slate-900">
                        <input
                          type="checkbox"
                          checked={editingAssignedEvents.includes(ev._id)}
                          onChange={(e) => {
                            if (e.target.checked) setEditingAssignedEvents([...editingAssignedEvents, ev._id]);
                            else setEditingAssignedEvents(editingAssignedEvents.filter((id) => id !== ev._id));
                          }}
                          className="rounded border-slate-200 text-red-655 mt-0.5"
                        />
                        <div>
                          <span className="font-bold block">{ev.name}</span>
                          <span className="text-slate-450 text-[10px]">{new Date(ev.date).toLocaleDateString("en-GB")} — {ev.location}</span>
                        </div>
                      </label>
                    ));
                  })()}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingAdmin(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition"
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
