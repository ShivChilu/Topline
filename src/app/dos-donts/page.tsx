import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { prisma } from "@/lib/prisma";
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
    const config = await prisma.setting.findUnique({
      where: { key: "homepage_content" },
    });
    if (config?.value && typeof config.value === "object") {
      const val: any = config.value;
      if (Array.isArray(val.dos)) dos = val.dos;
      if (Array.isArray(val.donts)) donts = val.donts;
    }
  } catch (error) {
    console.error("Failed to load dos/donts from database", error);
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc] text-slate-700 relative grid-bg overflow-hidden">
      <Navbar />

      {/* Decorative Blur Blobs */}
      <div className="absolute top-[10%] left-[-10%] w-[35vw] h-[35vw] bg-red-600/5 rounded-full floating-blob -z-10 pointer-events-none"></div>
      <div className="absolute top-[50%] right-[-10%] w-[35vw] h-[35vw] bg-red-600/5 rounded-full floating-blob -z-10 pointer-events-none"></div>

      <main className="flex-grow max-w-5xl mx-auto px-4 py-16 w-full">
        <h1 className="text-4xl font-extrabold text-red-600 mb-4 uppercase tracking-wider text-center">
          Workforce Do's & Don'ts
        </h1>
        <p className="text-slate-500 text-center max-w-xl mx-auto mb-16">
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
                <li key={idx} className="flex items-start space-x-3 text-slate-600 text-sm md:text-base">
                  <span className="text-emerald-400 font-bold select-none">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* DONT SECTION */}
          <div className="bg-[#0b0c10]/40 p-8 rounded-xl border border-red-900/30 shadow-2xl space-y-6">
            <div className="flex items-center space-x-2 text-red-400">
              <AlertOctagon className="w-6 h-6" />
              <h2 className="text-2xl font-bold tracking-wider uppercase">What You Should Avoid</h2>
            </div>
            <ul className="space-y-4">
              {donts.map((item, idx) => (
                <li key={idx} className="flex items-start space-x-3 text-slate-600 text-sm md:text-base">
                  <span className="text-red-400 font-bold select-none">•</span>
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
