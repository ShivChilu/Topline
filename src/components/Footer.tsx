import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-[#090a0f] text-gray-400 border-t border-gray-800 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <h3 className="text-white text-lg font-bold tracking-wider uppercase mb-4">
            TOPLINE ODC
          </h3>
          <p className="text-sm">
            Connecting hospitality providers with pre-screened, dependable university student workforces for events, resorts, and premium catering.
          </p>
        </div>
        <div>
          <h4 className="text-white text-sm font-semibold tracking-wider uppercase mb-4">
            Quick Links
          </h4>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/opportunities" className="hover:text-amber-500 transition">
                View Opportunities
              </Link>
            </li>
            <li>
              <Link href="/how-it-works" className="hover:text-amber-500 transition">
                How It Works
              </Link>
            </li>
            <li>
              <Link href="/dos-donts" className="hover:text-amber-500 transition">
                Do's & Don'ts
              </Link>
            </li>
            <li>
              <Link href="/gallery" className="hover:text-amber-500 transition">
                Event Gallery
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-white text-sm font-semibold tracking-wider uppercase mb-4">
            Support & Privacy
          </h4>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/about" className="hover:text-amber-500 transition">
                About Us
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-amber-500 transition">
                Contact
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-amber-500 transition">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-amber-500 transition">
                Terms & Conditions
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-white text-sm font-semibold tracking-wider uppercase mb-4">
            Contact
          </h4>
          <p className="text-sm space-y-1">
            <span>Email: contact@toplineodc.co.in</span>
            <br />
            <span>Phone: +91 79869 55634, +91 93810 39799</span>
          </p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-gray-800 text-center text-xs">
        <p>
          &copy; {new Date().getFullYear()} TOPLINE ODC. All rights reserved. Professional Workforce Solutions.
        </p>
      </div>
    </footer>
  );
}
