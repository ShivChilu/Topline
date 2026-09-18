import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Mail, Phone, MapPin } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc] text-slate-700 relative grid-bg overflow-hidden">
      <Navbar />

      {/* Decorative Blur Blobs */}
      <div className="absolute top-[10%] left-[-10%] w-[35vw] h-[35vw] bg-red-600/5 rounded-full floating-blob -z-10 pointer-events-none"></div>
      <div className="absolute top-[50%] right-[-10%] w-[35vw] h-[35vw] bg-red-600/5 rounded-full floating-blob -z-10 pointer-events-none"></div>

      <main className="flex-grow max-w-5xl mx-auto px-4 py-16 w-full">
        <h1 className="text-4xl font-extrabold text-red-600 mb-4 uppercase tracking-wider text-center">
          Contact Us
        </h1>
        <p className="text-slate-500 text-center max-w-xl mx-auto mb-12">
          Are you a hotel manager looking for staff, or a university student looking for upcoming events? Get in touch with TOPLINE.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12">
          {/* Contact Details */}
          <div className="space-y-6 sm:space-y-8 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
            <h2 className="text-2xl font-black text-slate-900 mb-6">TOPLINE ODC</h2>
            <div className="flex items-start space-x-4">
              <div className="p-2.5 bg-red-50 text-red-600 rounded-xl border border-red-100 shrink-0">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Phone Support</h4>
                <p className="text-slate-600 text-sm mt-0.5">+91 79869 55634, +91 93810 39799</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="p-2.5 bg-red-50 text-red-600 rounded-xl border border-red-100 shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Email Address</h4>
                <p className="text-slate-600 text-sm mt-0.5">contact@toplineodc.co.in</p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <a
                href="https://wa.me/917986955634?text=I%20would%20like%20to%20contact%20TOPLINE%20ODC"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl transition shadow-sm active:scale-95 text-sm"
              >
                <span>WhatsApp Us</span>
              </a>
            </div>
          </div>

          {/* Quick Form */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
            <h2 className="text-2xl font-black text-slate-900 mb-6">Send us a Message</h2>
            <form className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Your Name</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20 text-base sm:text-sm"
                  placeholder="Rahul Kumar / Rajesh Sharma"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email / Phone</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20 text-base sm:text-sm"
                  placeholder="yourname@gmail.com or 9876543210"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Message</label>
                <textarea
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20 text-base sm:text-sm h-28"
                  placeholder="How can we help you?"
                ></textarea>
              </div>
              <button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition shadow-md active:scale-95 text-sm uppercase tracking-wider"
              >
                Send Message
              </button>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
