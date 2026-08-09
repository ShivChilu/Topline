import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function TermsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#07080b] text-white">
      <Navbar />
      <main className="flex-grow max-w-4xl mx-auto px-4 py-16 text-left space-y-6">
        <h1 className="text-4xl font-extrabold text-amber-500 mb-6 uppercase tracking-wider text-center">
          Terms & Conditions
        </h1>
        <div className="text-gray-300 space-y-4">
          <p>
            Welcome to Top Line Catering. These terms and conditions outline the rules and regulations for the use of Top Line Catering's recruitment systems.
          </p>
          <h2 className="text-xl font-bold text-white mt-6">1. Student Conduct</h2>
          <p>
            Students applying for shifts must review and adhere strictly to our Do's and Don'ts policy, including dress code requirements, shift arrival schedules, and behavioral expectations during resort and wedding assignments.
          </p>
          <h2 className="text-xl font-bold text-white mt-6">2. Cancellations & Reliability</h2>
          <p>
            Last-minute cancellations without a valid reason within 24 hours of an event will lead to a reliability score penalty and potential suspension from future opportunities.
          </p>
          <h2 className="text-xl font-bold text-white mt-6">3. Payment Terms</h2>
          <p>
            Payments are processed after attendance verification by the event captain, typically within 24-48 hours of completing the assignment.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
