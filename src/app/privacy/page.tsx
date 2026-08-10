import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#07080b] text-white">
      <Navbar />
      <main className="flex-grow max-w-4xl mx-auto px-4 py-16 text-left space-y-6">
        <h1 className="text-4xl font-extrabold text-amber-500 mb-6 uppercase tracking-wider text-center">
          Privacy Policy
        </h1>
        <div className="text-gray-300 space-y-4">
          <p>
            At TOPLINE ODC, accessible from TOPLINE platforms, one of our main priorities is the privacy of our visitors and student candidates. This Privacy Policy document contains types of information that is collected and recorded by TOPLINE and how we use it.
          </p>
          <h2 className="text-xl font-bold text-white mt-6">1. Information We Collect</h2>
          <p>
            When students register or apply for active opportunities, we collect personal identity details including full name, email address, phone number, university registration details, college/university ID, and optional profile photos.
          </p>
          <h2 className="text-xl font-bold text-white mt-6">2. How We Use Your Information</h2>
          <p>
            We use the collected information to coordinate event shifts, select and contact students for catering requirements, record attendance, coordinate payments, and communicate event updates via SMS or WhatsApp.
          </p>
          <h2 className="text-xl font-bold text-white mt-6">3. Data Security & Storage</h2>
          <p>
            Student registration documents and ID proofs are stored securely. We do not sell, distribute, or expose student personal information to any third parties except event managers verifying staff lists on site.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
