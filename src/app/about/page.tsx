import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#07080b] text-white">
      <Navbar />
      <main className="flex-grow max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl font-extrabold text-amber-500 mb-6 uppercase tracking-wider">
          About Top Line Catering
        </h1>
        <div className="text-gray-300 space-y-6 text-lg leading-relaxed text-left max-w-2xl mx-auto">
          <p>
            Top Line Catering is a premier hospitality recruitment and staffing platform designed to bridge the gap between luxury hotels, resorts, and events with energetic, trained, and reliable university student workforces.
          </p>
          <p>
            Founded on the values of trust, professionalism, and speed, we support hotel supervisors and banquet managers by deploying pre-screened students for catering operations, food service, buffet coordination, and VIP banquet settings.
          </p>
          <p>
            At the same time, we empower university students by providing them with part-time, well-paid event opportunities that fit their study schedules and help them build real-world hospitality experience.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
