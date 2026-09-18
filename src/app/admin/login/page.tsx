"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, User, AlertCircle } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        router.push("/admin/dashboard");
      } else {
        setError(data.message || "Failed to log in.");
      }
    } catch (err) {
      setError("Network or server connection failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-4 text-slate-900">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <BrandLogo width={90} height={90} className="mx-auto mb-4 overflow-hidden rounded border border-slate-200 bg-[#f8fafc] p-1.5" />
          <h2 className="text-2xl font-bold uppercase tracking-wider text-slate-900">TOPLINE Admin</h2>
          <p className="text-slate-500 text-sm">Please sign in to access control management</p>
        </div>

        {error && (
          <div className="flex items-center space-x-2 bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs sm:text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-slate-900 focus:outline-none focus:border-red-600 text-base sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-slate-900 focus:outline-none focus:border-red-600 text-base sm:text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition duration-200 text-xs uppercase tracking-wider shadow-md cursor-pointer"
          >
            {loading ? "Authenticating..." : "Login to Dashboard"}
          </button>
        </form>

        <div className="text-center">
          <a href="/" className="text-xs text-slate-450 hover:text-red-600 transition">
            &larr; Back to public site
          </a>
        </div>

      </div>
    </div>
  );
}
