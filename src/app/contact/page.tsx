import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Mail, Phone, MapPin, GraduationCap, ShieldCheck, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Contact Us - TOPLINE ODC | Hire Catering Staff & Banquet Stewards",
  description:
    "Hotels, caterers, and event hosts can hire verified student catering staff and banquet crews by contacting TOPLINE ODC or calling +91 79869 55634. Founded by LPU students in Phagwara, Punjab.",
};

export default function ContactPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc] text-slate-700 relative grid-bg overflow-hidden">
      <Navbar />

      {/* Decorative Blur Blobs */}
      <div className="absolute top-[10%] left-[-10%] w-[35vw] h-[35vw] bg-red-600/5 rounded-full floating-blob -z-10 pointer-events-none"></div>
      <div className="absolute top-[50%] right-[-10%] w-[35vw] h-[35vw] bg-red-600/5 rounded-full floating-blob -z-10 pointer-events-none"></div>

      <main className="flex-grow max-w-5xl mx-auto px-4 py-12 sm:py-16 w-full space-y-10">
        <div className="text-center max-w-2xl mx-auto">
          <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-widest bg-red-50 text-red-600 border border-red-200">
            Get In Touch
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight mt-2">
            Contact <span className="text-red-600">TOPLINE ODC</span>
          </h1>
          <p className="text-slate-600 text-sm sm:text-base mt-2">
            Looking to hire professional catering staff or banquet stewards for your event, or an LPU student applying for shifts? Contact us below.
          </p>
        </div>

        {/* Priority Client Booking Highlight Card */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-600 text-white rounded-3xl p-6 sm:p-8 shadow-lg space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="bg-white/20 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                For Clients &amp; Event Organizers
              </span>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                Hire Catering Staff, Food Handlers &amp; Banquet Stewards
              </h2>
              <p className="text-white/90 text-xs sm:text-sm">
                Direct booking line with Founder Chiluveru Shiva Prasad. We deploy verified university student workforces across Punjab &amp; Northern India.
              </p>
            </div>
            <a
              href="tel:+917986955634"
              className="bg-white hover:bg-slate-100 active:scale-95 text-red-700 font-black px-6 py-3.5 rounded-2xl text-xs sm:text-sm uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2 shrink-0"
            >
              <Phone className="w-4 h-4 text-red-600" />
              <span>Call +91 79869 55634</span>
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12">
          {/* Contact Details */}
          <div className="space-y-6 sm:space-y-8 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
            <div>
              <h3 className="text-xl font-black text-slate-900">Official Office &amp; Operations</h3>
              <p className="text-xs text-slate-500 mt-1">TOPLINE On Duty Crew (ODC) Hospitality Staffing</p>
            </div>

            <div className="flex items-start space-x-4">
              <div className="p-2.5 bg-red-50 text-red-600 rounded-xl border border-red-100 shrink-0">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Direct Client &amp; Support Calls</h4>
                <a href="tel:+917986955634" className="text-red-600 hover:underline font-extrabold text-sm block mt-0.5">
                  +91 79869 55634
                </a>
                <p className="text-slate-500 text-xs mt-0.5">+91 93810 39799 (Alternate / Operations)</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="p-2.5 bg-red-50 text-red-600 rounded-xl border border-red-100 shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Email Inquiries</h4>
                <a href="mailto:contact@toplineodc.co.in" className="text-slate-600 hover:text-red-600 text-sm block mt-0.5">
                  contact@toplineodc.co.in
                </a>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="p-2.5 bg-red-50 text-red-600 rounded-xl border border-red-100 shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Headquarters &amp; Origins</h4>
                <p className="text-slate-600 text-xs sm:text-sm mt-0.5">
                  Phagwara, Punjab, India (Founded by LPU Students Chiluveru Shiva Prasad &amp; Balaji)
                </p>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Active in Amritsar, Jalandhar, Ludhiana, Phagwara &amp; Northern India.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <a
                href="https://wa.me/917986955634?text=Hello%20TOPLINE%20ODC,%20I%20want%20to%20hire%20catering%20staff%20for%20an%20event."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold px-6 py-3 rounded-xl transition shadow-sm text-sm"
              >
                <span>WhatsApp Us Directly</span>
              </a>
            </div>
          </div>

          {/* Quick Form */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
            <h3 className="text-xl font-black text-slate-900 mb-2">Send us a Message</h3>
            <p className="text-xs text-slate-500 mb-6">
              Inquire about hiring catering staff, banquet stewards, or student shift opportunities.
            </p>
            <form className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Your Name / Hotel / Company</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20 text-sm"
                  placeholder="e.g. Radisson Blu / Grand Banquet / Shiva"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Phone Number</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20 text-sm"
                  placeholder="+91 98765 43210"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Requirement / Message</label>
                <textarea
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20 text-sm h-28"
                  placeholder="Tell us about your event date, required number of catering stewards, or questions..."
                ></textarea>
              </div>
              <button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition shadow-md active:scale-95 text-xs sm:text-sm uppercase tracking-wider"
              >
                Send Request
              </button>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
