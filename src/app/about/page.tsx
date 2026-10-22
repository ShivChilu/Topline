import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { Users, Phone, MapPin, GraduationCap, ShieldCheck, Award, ArrowRight, Mail } from "lucide-react";

export const metadata = {
  title: "About Us - TOPLINE ODC | Founded by LPU Students Chiluveru Shiva Prasad & Balaji",
  description:
    "TOPLINE ODC was founded by Lovely Professional University (LPU) students Chiluveru Shiva Prasad (Founder) and Balaji (Co-Founder) in Phagwara, Punjab. We provide premium catering staff and banquet stewards across Punjab and Northern India. Client enquiries: +91 79869 55634.",
};

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc] text-slate-700 relative grid-bg overflow-hidden">
      <Navbar />

      {/* Decorative Blur Blobs */}
      <div className="absolute top-[10%] left-[-10%] w-[35vw] h-[35vw] bg-red-600/5 rounded-full floating-blob -z-10 pointer-events-none"></div>
      <div className="absolute top-[50%] right-[-10%] w-[35vw] h-[35vw] bg-red-600/5 rounded-full floating-blob -z-10 pointer-events-none"></div>

      <main className="flex-grow max-w-5xl mx-auto px-4 py-12 sm:py-16 w-full space-y-12 sm:space-y-16">
        {/* Header Hero */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-widest bg-red-50 text-red-600 border border-red-200">
            About Our Company
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            TOPLINE <span className="text-red-600">ODC</span>
          </h1>
          <p className="text-slate-600 text-sm sm:text-lg leading-relaxed">
            The premier hospitality and catering event staffing platform in Northern India, connecting luxury resorts, hotels, and wedding caterers with disciplined, pre-screened university student workforces.
          </p>
        </div>

        {/* Origin & Story Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">Our Story & LPU Roots</h2>
              <p className="text-xs text-slate-500">Phagwara, Punjab • Founded by University Students</p>
            </div>
          </div>
          <div className="text-slate-600 space-y-4 text-sm sm:text-base leading-relaxed">
            <p>
              TOPLINE ODC was established in <strong>Phagwara, Punjab</strong> by <strong>Lovely Professional University (LPU) students</strong> who recognized a critical challenge in the event and hospitality ecosystem: banquet halls and catering companies regularly struggle with unreliable, unprofessional temporary workers, while ambitious college students lack structured, safe, and flexible part-time opportunities.
            </p>
            <p>
              To solve this, TOPLINE ODC created a verified technology-driven recruitment model. Every candidate undergoes rigorous document screening (physical university ID verification), strict grooming compliance (formal dress code), and automated QR-code attendance check-ins.
            </p>
            <p>
              Today, TOPLINE ODC actively deploys banquet stewards, food counter handlers, buffet management teams, and hospitality coordinators across <strong>Phagwara, Jalandhar, Amritsar, Ludhiana, throughout Punjab, and across Northern India</strong>.
            </p>
          </div>
        </div>

        {/* Founders & Leadership Section */}
        <div className="space-y-6">
          <div className="text-center">
            <span className="text-red-600 text-xs font-extrabold uppercase tracking-wider">Leadership</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              Meet the Founders
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              Driven by student entrepreneurship from Lovely Professional University (LPU), Phagwara
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Founder 1 */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4 hover:border-red-300 transition group">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 to-rose-600 text-white flex items-center justify-center font-black text-xl shadow-md">
                  SP
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 group-hover:text-red-600 transition">
                    Chiluveru Shiva Prasad
                  </h3>
                  <p className="text-xs font-extrabold text-red-600 uppercase tracking-wider">Founder & Director</p>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                    <span>LPU Student • Phagwara, Punjab</span>
                  </p>
                </div>
              </div>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                Leads operations, strategic client partnerships, event crew deployment, and digital workforce management across Punjab&apos;s leading hospitality providers.
              </p>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                <span className="text-slate-500">Direct Contact:</span>
                <a href="tel:+917986955634" className="text-red-600 hover:text-red-700 font-extrabold">
                  +91 79869 55634
                </a>
              </div>
            </div>

            {/* Founder 2 */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4 hover:border-red-300 transition group">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-white flex items-center justify-center font-black text-xl shadow-md">
                  B
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 group-hover:text-red-600 transition">
                    Balaji
                  </h3>
                  <p className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Co-Founder & Operations</p>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                    <span>LPU Student • Phagwara, Punjab</span>
                  </p>
                </div>
              </div>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                Manages on-ground team leads, student candidate coordination, quality assurance, and venue logistics to guarantee flawless event delivery.
              </p>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                <span className="text-slate-500">Location:</span>
                <span className="text-slate-700 font-extrabold">Phagwara, Punjab</span>
              </div>
            </div>
          </div>
        </div>

        {/* Client Booking Spotlight Box */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 sm:p-10 text-white border border-slate-700 shadow-xl space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-widest bg-red-600 text-white">
                For Hotels, Resorts & Event Caterers
              </span>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                Want to Hire Catering Staff or Banquet Stewards?
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                Planning a high-profile wedding, hotel banquet, corporate dinner, or luxury catering event? Deploy pre-screened, well-groomed, and dependable student workforces with digital attendance.
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-300 pt-1">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> Pre-Screened & Verified
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-red-400" /> Punjab & Northern India
                </span>
                <span className="flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-400" /> Uniform & Grooming Compliant
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
              <a
                href="tel:+917986955634"
                className="bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black px-6 py-3.5 rounded-2xl text-xs sm:text-sm uppercase tracking-wider transition shadow-lg shadow-red-600/30 flex items-center justify-center gap-2"
              >
                <Phone className="w-4 h-4" />
                <span>Call +91 79869 55634</span>
              </a>
              <Link
                href="/contact"
                className="bg-white hover:bg-slate-100 active:scale-95 text-slate-900 font-extrabold px-6 py-3.5 rounded-2xl text-xs sm:text-sm uppercase tracking-wider transition flex items-center justify-center gap-2"
              >
                <span>Contact via Website</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
