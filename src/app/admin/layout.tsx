"use client";

import React, { useState } from "react";
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
  X
} from "lucide-react";
import BrandLogo from "@/components/BrandLogo";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Skip sidebar on the login screen
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const menuItems = [
    { name: "Dashboard", href: "/admin/dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
    { name: "Events", href: "/admin/events", icon: <CalendarDays className="w-5 h-5" /> },
    { name: "Applications", href: "/admin/applications", icon: <FileSpreadsheet className="w-5 h-5" /> },
    { name: "Students", href: "/admin/students", icon: <Users2 className="w-5 h-5" /> },
    { name: "Clients", href: "/admin/clients", icon: <Building2 className="w-5 h-5" /> },
    { name: "Gallery", href: "/admin/gallery", icon: <Image className="w-5 h-5" /> },
    { name: "Website settings", href: "/admin/settings", icon: <Settings className="w-5 h-5" /> },
  ];

  const handleLogout = async () => {
    if (confirm("Are you sure you want to log out?")) {
      try {
        await fetch("/api/admin/logout", { method: "POST" });
        router.push("/admin/login");
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
                    ? "bg-red-600 text-black"
                    : "text-slate-500 hover:text-slate-900 hover:bg-gray-800/40"
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
            className="flex w-full items-center space-x-3 px-4 py-3 rounded-lg text-sm font-semibold text-red-400 hover:text-slate-900 hover:bg-red-950/20 transition"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <BrandLogo width={28} height={28} className="overflow-hidden rounded border border-slate-200" />
            <span className="text-md font-bold uppercase tracking-wider font-sans">TOPLINE</span>
          </div>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 rounded text-slate-500 hover:text-slate-900 focus:outline-none"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </header>

        {/* Mobile drawer menu */}
        {isOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="fixed inset-0 bg-black/60" onClick={() => setIsOpen(false)}></div>
            <aside className="relative flex flex-col w-64 max-w-xs bg-white border-r border-slate-200 h-full p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <span className="text-lg font-bold text-slate-900 uppercase">Menu</span>
                <button onClick={() => setIsOpen(false)} className="text-slate-500">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex-grow space-y-2">
                {menuItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${
                        isActive
                          ? "bg-red-600 text-black"
                          : "text-slate-500 hover:text-slate-900 hover:bg-gray-800/40"
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
                className="flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-semibold text-red-400 hover:text-slate-900 hover:bg-red-950/20 transition w-full"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </aside>
          </div>
        )}

        {/* Page Inner Container */}
        <main className="flex-grow overflow-auto p-6 md:p-10 relative">
          {children}
        </main>
      </div>
    </div>
  );
}
