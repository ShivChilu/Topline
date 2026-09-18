import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Search, UserCheck, CalendarCheck, Clock, Award } from "lucide-react";

export default function HowItWorksPage() {
  const steps = [
    {
      icon: <Search className="w-10 h-10 text-red-600" />,
      title: "1. Find Upcoming Events",
      desc: "Browse our active upcoming events. Check details such as date, location, payout, and required dress code."
    },
    {
      icon: <UserCheck className="w-10 h-10 text-red-600" />,
      title: "2. Fill Application",
      desc: "Click apply, fill out the custom questionnaire with your university registration details, and submit."
    },
    {
      icon: <CalendarCheck className="w-10 h-10 text-red-600" />,
      title: "3. Selection & Confirmation",
      desc: "TOPLINE captains will review applications and confirm selected students via WhatsApp/SMS notifications."
    },
    {
      icon: <Clock className="w-10 h-10 text-red-600" />,
      title: "4. Report & Work",
      desc: "Arrive on time, wear the designated uniform, and execute your hospitality role under supervisor instructions."
    },
    {
      icon: <Award className="w-10 h-10 text-red-600" />,
      title: "5. Fast Payment",
      desc: "Once attendance is validated at checkout, receive payments directly based on the event's standard rate."
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc] text-slate-700 relative grid-bg overflow-hidden">
      <Navbar />

      {/* Decorative Blur Blobs */}
      <div className="absolute top-[10%] left-[-10%] w-[35vw] h-[35vw] bg-red-600/5 rounded-full floating-blob -z-10 pointer-events-none"></div>
      <div className="absolute top-[50%] right-[-10%] w-[35vw] h-[35vw] bg-red-600/5 rounded-full floating-blob -z-10 pointer-events-none"></div>

      <main className="flex-grow max-w-5xl mx-auto px-4 py-16 w-full">
        <h1 className="text-4xl font-extrabold text-red-600 mb-4 uppercase tracking-wider text-center">
          How It Works
        </h1>
        <p className="text-slate-500 text-center max-w-xl mx-auto mb-16">
          A transparent, simple, and digitized process designed for students to find hospitality assignments and hotels to secure reliable staff.
        </p>

        <div className="space-y-4 sm:space-y-6">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm hover:border-red-500/40 hover:shadow-md transition duration-300"
            >
              <div className="p-3.5 bg-red-50 text-red-600 rounded-2xl border border-red-100 shrink-0">
                {step.icon}
              </div>
              <div className="text-center sm:text-left">
                <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-1.5">{step.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed max-w-2xl">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
