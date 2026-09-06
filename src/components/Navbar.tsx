"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X, User, LogIn } from "lucide-react";
import BrandLogo from "./BrandLogo";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<any>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && data?.user) {
          setLoggedInUser(data.user);
        }
      })
      .catch(() => {});
  }, []);

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Upcoming Events", href: "/opportunities" },
    { name: "How It Works", href: "/how-it-works" },
    { name: "Do's & Don'ts", href: "/dos-donts" },
    { name: "Gallery", href: "/gallery" },
    { name: "About", href: "/about" },
    { name: "Contact", href: "/contact" },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/80 text-slate-850">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3 group">
              <BrandLogo width={40} height={40} className="overflow-hidden rounded-lg border border-slate-200/80 group-hover:border-red-600/50 transition duration-300 bg-white" />
              <span className="text-xl font-display font-extrabold tracking-widest text-red-700 uppercase hidden sm:inline transition-colors duration-300">
                TOPLINE
              </span>
            </Link>
          </div>
          <div className="hidden md:block">
            <div className="ml-10 flex items-center space-x-6">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="text-slate-600 hover:text-red-700 text-sm font-medium tracking-wide transition duration-300 relative py-1 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:bg-red-600 after:transition-all after:duration-300 hover:after:w-full"
                >
                  {link.name}
                </Link>
              ))}

              {loggedInUser ? (
                <Link
                  href="/profile"
                  className="flex items-center space-x-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>My Profile</span>
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center space-x-1.5 bg-slate-900 hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition shadow-sm"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Student Login</span>
                </Link>
              )}
            </div>
          </div>
          <div className="md:hidden flex items-center space-x-2">
            {loggedInUser ? (
              <Link
                href="/profile"
                className="bg-red-50 text-red-700 border border-red-200 px-3 py-1 rounded-full text-xs font-bold uppercase"
              >
                Profile
              </Link>
            ) : (
              <Link
                href="/login"
                className="bg-slate-900 text-white px-3 py-1 rounded-lg text-xs font-bold uppercase"
              >
                Login
              </Link>
            )}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 focus:outline-none"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-md border-b border-slate-200/80">
          <div className="px-4 pt-3 pb-6 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="text-slate-600 hover:text-red-700 block px-3 py-2 rounded-lg text-base font-semibold tracking-wide transition duration-300"
              >
                {link.name}
              </Link>
            ))}

            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              {loggedInUser ? (
                <Link
                  href="/profile"
                  onClick={() => setIsOpen(false)}
                  className="bg-red-600 text-white block text-center py-2.5 rounded-xl font-bold uppercase text-xs tracking-wider"
                >
                  My Profile ({loggedInUser.name})
                </Link>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setIsOpen(false)}
                  className="bg-slate-900 text-white block text-center py-2.5 rounded-xl font-bold uppercase text-xs tracking-wider"
                >
                  Student Login / Register
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
