"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, ShieldAlert } from "lucide-react";

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
    <nav className="sticky top-0 z-50 bg-[#0c0d12]/90 backdrop-blur-md border-b border-gray-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-xl font-bold tracking-wider text-amber-500 uppercase">
                Top Line Catering
              </span>
            </Link>
          </div>
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-6">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="text-gray-300 hover:text-amber-500 px-3 py-2 rounded-md text-sm font-medium transition duration-200"
                >
                  {link.name}
                </Link>
              ))}
              <Link
                href="/admin/dashboard"
                className="bg-amber-500 hover:bg-amber-600 text-black px-4 py-2 rounded-md text-sm font-semibold transition duration-200 flex items-center space-x-1"
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
        <div className="md:hidden bg-[#0c0d12] border-b border-gray-800">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="text-gray-300 hover:text-amber-500 block px-3 py-2 rounded-md text-base font-medium transition"
              >
                {link.name}
              </Link>
            ))}
            <Link
              href="/admin/dashboard"
              onClick={() => setIsOpen(false)}
              className="bg-amber-500 hover:bg-amber-600 text-black block px-4 py-2 rounded-md text-base font-semibold transition text-center"
            >
              Admin Panel
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
