import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Search, UserCheck, CalendarCheck, Clock, Award } from "lucide-react";

export default function HowItWorksPage() {
  const steps = [
    {
      icon: <Search className="w-10 h-10 text-amber-500" />,
      title: "1. Find Opportunities",
      desc: "Browse our active hospitality opportunities. Check details such as date, location, payout, and required dress code."
    },
    {
      icon: <UserCheck className="w-10 h-10 text-amber-500" />,
      title: "2. Fill Application",
      desc: "Click apply, fill out the custom questionnaire with your university registration details, and submit."
    },
    {
      icon: <CalendarCheck className="w-10 h-10 text-amber-500" />,
      title: "3. Selection & Confirmation",
      desc: "Top Line captains will review applications and confirm selected students via WhatsApp/SMS notifications."
    },
    {
      icon: <Clock className="w-10 h-10 text-amber-500" />,
      title: "4. Report & Work",
      desc: "Arrive on time, wear the designated uniform, and execute your hospitality role under supervisor instructions."
    },
    {
      icon: <Award className="w-10 h-10 text-amber-500" />,
      title: "5. Fast Payment",
      desc: "Once attendance is validated at checkout, receive payments directly based on the event's standard rate."
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#07080b] text-white">
      <Navbar />
      <main className="flex-grow max-w-5xl mx-auto px-4 py-16 w-full">
        <h1 className="text-4xl font-extrabold text-amber-500 mb-4 uppercase tracking-wider text-center">
          How It Works
        </h1>
        <p className="text-gray-400 text-center max-w-xl mx-auto mb-16">
          A transparent, simple, and digitized process designed for students to find hospitality assignments and hotels to secure reliable staff.
        </p>

        <div className="space-y-12">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="flex flex-col md:flex-row items-center gap-6 bg-[#0c0d12] p-8 rounded-xl border border-gray-800 hover:border-amber-500/50 transition duration-300"
            >
              <div className="p-4 bg-[#161822] rounded-lg border border-gray-800">
                {step.icon}
              </div>
              <div className="text-center md:text-left">
                <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
                <p className="text-gray-400 max-w-2xl">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
