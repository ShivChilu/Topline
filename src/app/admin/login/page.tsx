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
    <div className="flex min-h-screen items-center justify-center bg-[#07080b] px-4 text-white">
      <div className="w-full max-w-md bg-[#0c0d12] border border-gray-800 rounded-2xl p-8 shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <BrandLogo width={90} height={90} className="mx-auto mb-4 overflow-hidden rounded border border-gray-800 bg-[#07080b] p-1.5" />
          <h2 className="text-2xl font-bold uppercase tracking-wider text-white">TOPLINE Admin</h2>
          <p className="text-gray-400 text-sm">Please sign in to access control management</p>
        </div>

        {error && (
          <div className="flex items-center space-x-2 bg-red-950/20 border border-red-900/30 text-red-400 p-3 rounded-lg text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full bg-[#161822] border border-gray-800 rounded-lg pl-10 pr-3 py-2 text-white focus:outline-none focus:border-red-600 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#161822] border border-gray-800 rounded-lg pl-10 pr-3 py-2 text-white focus:outline-none focus:border-red-600 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-black font-bold py-2.5 rounded-lg transition duration-200 text-sm"
          >
            {loading ? "Authenticating..." : "Login to Dashboard"}
          </button>
        </form>

        <div className="text-center">
          <a href="/" className="text-xs text-gray-500 hover:text-red-600 transition">
            &larr; Back to public site
          </a>
        </div>

      </div>
    </div>
  );
}
