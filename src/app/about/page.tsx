import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc] text-slate-700 relative grid-bg overflow-hidden">
      <Navbar />

      {/* Decorative Blur Blobs */}
      <div className="absolute top-[10%] left-[-10%] w-[35vw] h-[35vw] bg-red-600/5 rounded-full floating-blob -z-10 pointer-events-none"></div>
      <div className="absolute top-[50%] right-[-10%] w-[35vw] h-[35vw] bg-red-600/5 rounded-full floating-blob -z-10 pointer-events-none"></div>

      <main className="flex-grow max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl font-extrabold text-red-600 mb-6 uppercase tracking-wider">
          About TOPLINE ODC
        </h1>
        <div className="text-slate-600 space-y-6 text-lg leading-relaxed text-left max-w-2xl mx-auto">
          <p>
            TOPLINE ODC is a premier hospitality recruitment and staffing platform designed to bridge the gap between luxury hotels, resorts, and events with energetic, trained, and reliable university student workforces.
          </p>
          <p>
            Founded on the values of trust, professionalism, and speed, we support hotel supervisors and banquet managers by deploying pre-screened students for catering operations, food service, buffet coordination, and VIP banquet settings.
          </p>
          <p>
            At the same time, we empower university students by providing them with part-time, well-paid upcoming events that fit their study schedules and help them build real-world hospitality experience.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
