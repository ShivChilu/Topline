import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { connectToDatabase } from "@/lib/db";
import { Setting } from "@/models";
import { CheckCircle2, AlertOctagon } from "lucide-react";

export const revalidate = 0; // Disable static caching so modifications in admin panel show immediately

export default async function DosDontsPage() {
  let dos = [
    "Arrive 15 minutes before the reporting time.",
    "Wear the designated dress code (White shirt, black trousers, black formal shoes).",
    "Carry your college ID card or university physical ID.",
    "Follow captain/supervisor instructions promptly and respectfully.",
    "Maintain high grooming standards (clean-shaven, hair neatly set)."
  ];

  let donts = [
    "Do not arrive late or leave the resort without supervisor permission.",
    "Do not use mobile phones while active in service zones.",
    "Do not engage in arguments or misbehave with guests or hotel staff.",
    "Do not damage hotel property or service equipment.",
    "Do not consume guest food, beverage, or alcohol at service counters."
  ];

  try {
    await connectToDatabase();
    const config = await Setting.findOne({ key: "homepage_content" });
    if (config?.value?.dos) dos = config.value.dos;
    if (config?.value?.donts) donts = config.value.donts;
  } catch (error) {
    console.error("Failed to load dos/donts from database", error);
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#07080b] text-white">
      <Navbar />
      <main className="flex-grow max-w-5xl mx-auto px-4 py-16 w-full">
        <h1 className="text-4xl font-extrabold text-rose-600 mb-4 uppercase tracking-wider text-center">
          Workforce Do's & Don'ts
        </h1>
        <p className="text-gray-400 text-center max-w-xl mx-auto mb-16">
          Compliance with these guidelines is mandatory for all students on shift duty. Violations may result in suspension.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* DO SECTION */}
          <div className="bg-[#0b0c10]/40 p-8 rounded-xl border border-emerald-900/30 shadow-2xl space-y-6">
            <div className="flex items-center space-x-2 text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
              <h2 className="text-2xl font-bold tracking-wider uppercase">What You Should Do</h2>
            </div>
            <ul className="space-y-4">
              {dos.map((item, idx) => (
                <li key={idx} className="flex items-start space-x-3 text-gray-300 text-sm md:text-base">
                  <span className="text-emerald-400 font-bold select-none">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* DONT SECTION */}
          <div className="bg-[#0b0c10]/40 p-8 rounded-xl border border-rose-900/30 shadow-2xl space-y-6">
            <div className="flex items-center space-x-2 text-rose-400">
              <AlertOctagon className="w-6 h-6" />
              <h2 className="text-2xl font-bold tracking-wider uppercase">What You Should Avoid</h2>
            </div>
            <ul className="space-y-4">
              {donts.map((item, idx) => (
                <li key={idx} className="flex items-start space-x-3 text-gray-300 text-sm md:text-base">
                  <span className="text-rose-400 font-bold select-none">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
