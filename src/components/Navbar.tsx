"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, ShieldAlert } from "lucide-react";
import BrandLogo from "./BrandLogo";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Opportunities", href: "/opportunities" },
    { name: "How It Works", href: "/how-it-works" },
    { name: "Do's & Don'ts", href: "/dos-donts" },
    { name: "Gallery", href: "/gallery" },
    { name: "About", href: "/about" },
    { name: "Contact", href: "/contact" },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-[#06070a]/70 backdrop-blur-xl border-b border-white/[0.04] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3 group">
              <BrandLogo width={40} height={40} className="overflow-hidden rounded-lg border border-white/10 group-hover:border-amber-500/50 transition duration-300 bg-[#090a0f]" />
              <span className="text-xl font-display font-extrabold tracking-widest text-amber-500 uppercase hidden sm:inline transition-colors duration-300">
                TOPLINE
              </span>
            </Link>
          </div>
          <div className="hidden md:block">
            <div className="ml-10 flex items-center space-x-8">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="text-gray-300 hover:text-amber-500 text-sm font-medium tracking-wide transition duration-300 relative py-1 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:bg-amber-500 after:transition-all after:duration-300 hover:after:w-full"
                >
                  {link.name}
                </Link>
              ))}
              <Link
                href="/admin/dashboard"
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black px-5 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 transition-all duration-300 flex items-center space-x-1.5"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Admin Panel</span>
              </Link>
            </div>
          </div>
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 focus:outline-none"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-[#06070a]/95 backdrop-blur-xl border-b border-white/[0.04]">
          <div className="px-4 pt-3 pb-6 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="text-gray-300 hover:text-amber-500 block px-3 py-2 rounded-lg text-base font-semibold tracking-wide transition duration-300"
              >
                {link.name}
              </Link>
            ))}
            <div className="pt-4 border-t border-white/[0.04]">
              <Link
                href="/admin/dashboard"
                onClick={() => setIsOpen(false)}
                className="bg-gradient-to-r from-amber-500 to-amber-600 text-black block px-4 py-3 rounded-lg text-base font-bold text-center shadow-lg shadow-amber-500/10"
              >
                Admin Panel
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
