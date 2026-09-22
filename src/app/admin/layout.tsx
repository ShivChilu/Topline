"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  FileSpreadsheet,
  Users2,
  Building2,
  Image,
  Settings,
  LogOut,
  Menu,
  X,
  Gift,
  Banknote,
} from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import AdminCopilot from "@/components/admin/AdminCopilot";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [adminRole, setAdminRole] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname === "/admin/login") {
      setCheckingAuth(false);
      return;
    }

    const verifySession = async () => {
      try {
        const res = await fetch("/api/admin/users/me");
        const data = await res.json();
        if (data.success) {
          setAdminRole(data.role);
          // Block calling admin from viewing other pages
          if (data.role === "calling" && !pathname.startsWith("/admin/calling")) {
            router.push("/admin/calling");
          }
          // Block captain / super admins from calling page
          if (data.role !== "calling" && pathname.startsWith("/admin/calling")) {
            router.push("/admin/dashboard");
          }
          // Block event admin from accessing non-event pages, create page, and edit pages
          if (data.role === "event_admin") {
            if (
              !pathname.startsWith("/admin/events") ||
              pathname === "/admin/events/create" ||
              pathname.includes("/edit")
            ) {
              router.push("/admin/events");
            }
          }
          // Strictly block any non-superadmin from accessing confidential Financial & P&L pages
          if (data.role !== "superadmin" && pathname.startsWith("/admin/payments")) {
            router.push("/admin/dashboard");
          }
        } else {
          router.push("/login");
        }
      } catch (err) {
        console.error("Session check error:", err);
        router.push("/login");
      } finally {
        setCheckingAuth(false);
      }
    };

    verifySession();
  }, [pathname, router]);

  // Skip sidebar on the login screen
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  if (checkingAuth) {
    return (
      <div className="flex h-screen bg-slate-50 items-center justify-center text-slate-500 font-bold text-sm">
        Verifying admin session credentials...
      </div>
    );
  }

  const menuItems =
    adminRole === "calling"
      ? [
          { name: "Calling Dashboard", href: "/admin/calling", icon: <Users2 className="w-5 h-5" /> },
        ]
      : adminRole === "event_admin"
      ? [
          { name: "Assigned Events", href: "/admin/events", icon: <CalendarDays className="w-5 h-5" /> },
        ]
      : [
          { name: "Dashboard", href: "/admin/dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
          { name: "Events", href: "/admin/events", icon: <CalendarDays className="w-5 h-5" /> },
          { name: "Applications", href: "/admin/applications", icon: <FileSpreadsheet className="w-5 h-5" /> },
          { name: "Students", href: "/admin/students", icon: <Users2 className="w-5 h-5" /> },
          { name: "Referrals & Payouts", href: "/admin/referrals", icon: <Gift className="w-5 h-5" /> },
          ...(adminRole === "superadmin"
            ? [{ name: "Payments & Event P&L", href: "/admin/payments", icon: <Banknote className="w-5 h-5" /> }]
            : []),
          { name: "Clients", href: "/admin/clients", icon: <Building2 className="w-5 h-5" /> },
          { name: "Gallery", href: "/admin/gallery", icon: <Image className="w-5 h-5" /> },
          { name: "Website settings", href: "/admin/settings", icon: <Settings className="w-5 h-5" /> },
        ];

  const handleLogout = async () => {
    if (confirm("Are you sure you want to log out?")) {
      try {
        await fetch("/api/admin/logout", { method: "POST" });
        router.push("/login");
      } catch (err) {
        console.error("Logout failed", err);
      }
    }
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-900 overflow-hidden">
      {/* Sidebar for Desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-white border-r border-slate-200">
        <div className="p-6 flex items-center space-x-3 border-b border-slate-200">
          <BrandLogo width={32} height={32} className="overflow-hidden rounded border border-slate-200" />
          <span className="text-lg font-bold tracking-wider uppercase text-slate-900 font-sans">TOPLINE Control</span>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-semibold transition ${
                  isActive
                    ? "bg-red-600 text-white"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/40"
                }`}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-200">
          <button
            onClick={handleLogout}
            className="flex w-full items-center space-x-3 px-4 py-3 rounded-lg text-sm font-semibold text-red-400 hover:text-slate-800 hover:bg-red-950/20 transition"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white/95 backdrop-blur border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
          <div className="flex items-center space-x-3">
            <BrandLogo width={28} height={28} className="overflow-hidden rounded border border-slate-200" />
            <span className="text-md font-bold uppercase tracking-wider font-sans">TOPLINE</span>
          </div>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none transition"
            aria-label="Toggle Navigation Menu"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </header>

        {/* Mobile drawer menu */}
        {isOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex animate-in fade-in duration-200">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setIsOpen(false)}></div>
            <aside className="relative flex flex-col w-64 max-w-xs bg-white border-r border-slate-200 h-full p-6 space-y-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <span className="text-lg font-bold text-slate-900 uppercase">Menu</span>
                <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-slate-800 p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex-grow space-y-2">
                {menuItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${
                        isActive
                          ? "bg-red-600 text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      }`}
                    >
                      {item.icon}
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
              <button
                onClick={() => {
                  setIsOpen(false);
                  handleLogout();
                }}
                className="flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 transition w-full"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </aside>
          </div>
        )}

        {/* Page Inner Container */}
        <main className="flex-grow overflow-auto p-3.5 sm:p-5 md:p-8 lg:p-10 pb-28 sm:pb-24 relative">
          {children}
        </main>

        {/* AI Operations Copilot (Super Admin & Event Admin) */}
        {(["superadmin", "admin", "event_admin"].includes(adminRole?.toLowerCase() || "") || !adminRole) && (
          <AdminCopilot />
        )}
      </div>
    </div>
  );
}
