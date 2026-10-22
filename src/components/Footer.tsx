import Link from "next/link";
import { Phone, Mail, MapPin, GraduationCap } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#090a0f] text-gray-400 border-t border-gray-800 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Company Info */}
        <div className="space-y-3">
          <h3 className="text-white text-lg font-bold tracking-wider uppercase">
            TOPLINE ODC
          </h3>
          <p className="text-xs sm:text-sm leading-relaxed text-gray-400">
            Connecting hospitality providers with pre-screened, dependable university student workforces for catering events, luxury resorts, and banquet operations.
          </p>
          <div className="pt-2 text-xs text-gray-500 space-y-1">
            <p className="flex items-center gap-1.5 text-gray-400 font-semibold">
              <GraduationCap className="w-4 h-4 text-red-500 shrink-0" />
              <span>Founded by LPU Students</span>
            </p>
            <p className="text-gray-400 text-[11.5px]">
              Chiluveru Shiva Prasad (Founder) & Balaji (Co-Founder)
            </p>
            <p className="flex items-center gap-1 text-gray-500 text-[11px]">
              <MapPin className="w-3 h-3 text-red-500 shrink-0" />
              <span>Phagwara, Punjab, India</span>
            </p>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="text-white text-sm font-semibold tracking-wider uppercase mb-4">
            Quick Links
          </h4>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/opportunities" className="hover:text-red-500 transition">
                Upcoming Events
              </Link>
            </li>
            <li>
              <Link href="/how-it-works" className="hover:text-red-500 transition">
                How It Works
              </Link>
            </li>
            <li>
              <Link href="/dos-donts" className="hover:text-red-500 transition">
                Do&apos;s &amp; Don&apos;ts
              </Link>
            </li>
            <li>
              <Link href="/gallery" className="hover:text-red-500 transition">
                Event Gallery
              </Link>
            </li>
          </ul>
        </div>

        {/* Support & Company */}
        <div>
          <h4 className="text-white text-sm font-semibold tracking-wider uppercase mb-4">
            Company &amp; Legal
          </h4>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/about" className="hover:text-red-500 transition">
                About Us (Founders &amp; Team)
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-red-500 transition">
                Contact &amp; Book Staff
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-red-500 transition">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-red-500 transition">
                Terms &amp; Conditions
              </Link>
            </li>
          </ul>
        </div>

        {/* Contact & Client Booking */}
        <div>
          <h4 className="text-white text-sm font-semibold tracking-wider uppercase mb-4">
            Client Bookings &amp; Contact
          </h4>
          <div className="space-y-2.5 text-xs sm:text-sm">
            <div>
              <span className="text-[10px] uppercase font-bold text-red-500 tracking-wider block">
                Hire Catering Staff
              </span>
              <a
                href="tel:+917986955634"
                className="text-white hover:text-red-400 font-extrabold text-sm flex items-center gap-1.5 mt-0.5"
              >
                <Phone className="w-3.5 h-3.5 text-red-500" />
                <span>+91 79869 55634</span>
              </a>
              <p className="text-gray-500 text-[11px] mt-0.5">+91 93810 39799</p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block">
                Official Email
              </span>
              <a
                href="mailto:contact@toplineodc.co.in"
                className="text-gray-300 hover:text-white transition text-xs flex items-center gap-1 mt-0.5"
              >
                <Mail className="w-3 h-3 text-gray-500" />
                <span>contact@toplineodc.co.in</span>
              </a>
            </div>
            <p className="text-gray-500 text-[11px] pt-1">
              Serving Phagwara, Jalandhar, Amritsar, Ludhiana, Punjab &amp; Northern India.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-gray-800 text-center text-xs text-gray-500">
        <p>
          &copy; {new Date().getFullYear()} TOPLINE ODC. All rights reserved. Founded by LPU Students Chiluveru Shiva Prasad &amp; Balaji • Phagwara, Punjab.
        </p>
      </div>
    </footer>
  );
}
