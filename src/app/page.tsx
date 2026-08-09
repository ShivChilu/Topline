import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { connectToDatabase } from "@/lib/db";
import { Event, Setting, Gallery } from "@/models";
import {
  Calendar,
  MapPin,
  Clock,
  ArrowRight,
  Shield,
  Briefcase,
  Users,
  Utensils,
  Gem,
  Award
} from "lucide-react";

export const revalidate = 0; // Dynamic rendering for latest opportunities

export default async function HomePage() {
  let activeEvents: any[] = [];
  let galleryImages: any[] = [];
  let homeContent = {
    headline: "Reliable Hospitality Workforce for Events, Hotels & Resorts",
    subheadline: "Top Line Catering connects premium hotels, resorts, and hospitality managers with a dependable, pre-screened student workforce.",
    whatsappNumber: "919876543210",
    email: "contact@toplinecatering.com",
    aboutText: "",
  };

  try {
    await connectToDatabase();
    // Fetch active open events
    activeEvents = await Event.find({ status: "OPEN", visibility: "VISIBLE" })
      .sort({ date: 1 })
      .limit(3)
      .lean();

    // Fetch published gallery images
    galleryImages = await Gallery.find({ published: true })
      .sort({ createdAt: -1 })
      .limit(4)
      .lean();

    // Fetch site configurations
    const config = await Setting.findOne({ key: "homepage_content" });
    if (config?.value) {
      homeContent = { ...homeContent, ...config.value };
    }
  } catch (error) {
    console.error("Error loading home page content:", error);
  }

  const defaultServices = [
    { name: "Catering Staff", desc: "Expert food handlers and buffet counter management." },
    { name: "Hospitality Staff", desc: "Front-desk, guest hospitality coordinators, and hostesses." },
    { name: "Service Staff", desc: "Professional food and beverage server crews." },
    { name: "Banquet Staff", desc: "Table operation specialists for weddings and corporate galas." },
    { name: "Event Staff", desc: "Setup crews, coordinators, and logistics support teams." },
    { name: "Temporary Workforce", desc: "On-demand teams for high-capacity hospitality demands." },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#07080b] text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-28 md:pt-28 md:pb-36 bg-gradient-to-b from-[#0f111a] to-[#07080b]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(245,158,11,0.15),rgba(255,255,255,0))]"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <span className="text-amber-500 font-extrabold tracking-widest text-xs uppercase bg-amber-500/10 px-4 py-1.5 rounded-full border border-amber-500/20">
            Top Line Staffing Solutions
          </span>
          <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight">
            {homeContent.headline}
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto font-medium">
            {homeContent.subheadline}
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/opportunities"
              className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-black px-8 py-3 rounded-lg text-lg font-bold transition duration-200 flex items-center justify-center space-x-2"
            >
              <span>View Opportunities</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/contact"
              className="w-full sm:w-auto bg-transparent hover:bg-gray-800 text-white px-8 py-3 rounded-lg text-lg font-bold border border-gray-800 hover:border-gray-700 transition duration-200"
            >
              Contact Top Line
            </Link>
          </div>
        </div>
      </section>

      {/* What We Provide Section */}
      <section className="py-20 border-t border-gray-900 bg-[#07080b]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-wider text-amber-500 uppercase">
              What We Provide
            </h2>
            <p className="mt-4 text-gray-400 max-w-2xl mx-auto text-lg">
              Tailored event crew staffing solutions built on professional standard criteria.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {defaultServices.map((service, idx) => (
              <div
                key={idx}
                className="bg-[#0c0d12] p-6 rounded-xl border border-gray-800 hover:border-amber-500/50 transition duration-300 flex flex-col"
              >
                <div className="w-12 h-12 bg-amber-500/10 rounded-lg flex items-center justify-center border border-amber-500/20 mb-6">
                  <Utensils className="text-amber-500 w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{service.name}</h3>
                <p className="text-gray-400 text-sm flex-grow">{service.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Latest Opportunities Section */}
      <section className="py-20 bg-[#0c0d12]/40 border-t border-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16">
            <div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-wider text-amber-500 uppercase">
                Active Opportunities
              </h2>
              <p className="mt-2 text-gray-400 text-lg">
                High-paying catering and hospitality slots currently recruiting students.
              </p>
            </div>
            <Link
              href="/opportunities"
              className="mt-4 md:mt-0 flex items-center space-x-2 text-amber-500 hover:text-amber-400 font-bold transition"
            >
              <span>See All Opportunities</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {activeEvents.length === 0 ? (
            <div className="text-center py-12 bg-[#0c0d12] rounded-xl border border-gray-800">
              <p className="text-gray-400 text-lg">No active student recruitment forms open at this time.</p>
              <p className="text-gray-500 text-sm mt-1">Check back later or join the WhatsApp group.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {activeEvents.map((event: any) => (
                <div
                  key={event._id.toString()}
                  className="bg-[#0c0d12] rounded-xl border border-gray-800 hover:border-amber-500/50 transition duration-300 overflow-hidden flex flex-col justify-between"
                >
                  <div className="p-6">
                    <span className="bg-emerald-500/10 text-emerald-400 text-xs font-semibold px-2.5 py-1 rounded-full border border-emerald-500/20 uppercase tracking-widest">
                      {event.status}
                    </span>
                    <h3 className="mt-4 text-xl font-bold text-white hover:text-amber-500 transition">
                      <Link href={`/events/${event._id}`}>{event.name}</Link>
                    </h3>
                    <p className="mt-2 text-sm text-gray-400 line-clamp-2">{event.description}</p>
                    <div className="mt-6 space-y-3 text-sm text-gray-300">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-amber-500" />
                        <span>{new Date(event.date).toLocaleDateString("en-GB")}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-amber-500" />
                        <span>{event.location}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-amber-500" />
                        <span>Reporting: {event.reportingTime}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-[#12141f] px-6 py-4 flex items-center justify-between border-t border-gray-800">
                    <div>
                      <p className="text-xs text-gray-400 uppercase">Payout</p>
                      <p className="text-lg font-bold text-amber-500">₹{event.paymentPerStudent}</p>
                    </div>
                    <Link
                      href={`/events/${event._id}`}
                      className="bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold px-4 py-2 rounded transition"
                    >
                      Apply Now
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* How it Works Summary */}
      <section className="py-20 border-t border-gray-950 bg-[#07080b]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-wider text-amber-500 uppercase mb-16">
            Process For Students
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { title: "1. Browse Slots", desc: "Find open hospitality events matching your free dates." },
              { title: "2. Submit Form", desc: "Apply in under 2 minutes through the dynamic custom questionnaire." },
              { title: "3. Check-In & Work", desc: "Confirm selection, wear uniforms, scan attendance QR code." },
              { title: "4. Fast Payout", desc: "Complete work shifts, verify checkout, and get paid." },
            ].map((step, idx) => (
              <div key={idx} className="bg-[#0c0d12] p-6 rounded-xl border border-gray-800">
                <h3 className="text-amber-500 font-extrabold text-lg mb-2">{step.title}</h3>
                <p className="text-gray-400 text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Top Line Section */}
      <section className="py-20 border-t border-gray-950 bg-[#0c0d12]/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-amber-500 text-sm font-bold tracking-widest uppercase">
              Partnership & Quality
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-wider text-white uppercase">
              Why Hotels & Resorts Choose Top Line
            </h2>
            <p className="mt-4 text-gray-400 leading-relaxed">
              We eliminate the stress of manual hiring coordination. Our system provides automated registration tracking, real-time application limit configurations, duplicate checks, digital verification records, and automated check-ins.
            </p>
            <div className="mt-8 space-y-4">
              {[
                { title: "Pre-Screened Students", desc: "We only verify students with clean history records and valid college ID cards." },
                { title: "Strict Grooming & Conduct", desc: "Strictly enforced dress codes and professional behavior guidelines." },
                { title: "Automated Attendance & Payments", desc: "Digital check-in tracking prevents payroll errors and time theft." },
              ].map((item, idx) => (
                <div key={idx} className="flex items-start space-x-3">
                  <Shield className="text-amber-500 w-5 h-5 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-white">{item.title}</h4>
                    <p className="text-sm text-gray-400">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {galleryImages.length > 0 ? (
              galleryImages.map((img: any) => (
                <div key={img._id.toString()} className="h-48 relative rounded-xl overflow-hidden border border-gray-800">
                  <img src={img.imageUrl} alt={img.caption} className="object-cover w-full h-full" />
                </div>
              ))
            ) : (
              <>
                <div className="h-48 relative rounded-xl overflow-hidden border border-gray-800 bg-[#0c0d12] flex items-center justify-center">
                  <Utensils className="text-gray-700 w-8 h-8" />
                </div>
                <div className="h-48 relative rounded-xl overflow-hidden border border-gray-800 bg-[#0c0d12] flex items-center justify-center">
                  <Gem className="text-gray-700 w-8 h-8" />
                </div>
                <div className="h-48 relative rounded-xl overflow-hidden border border-gray-800 bg-[#0c0d12] flex items-center justify-center">
                  <Users className="text-gray-700 w-8 h-8" />
                </div>
                <div className="h-48 relative rounded-xl overflow-hidden border border-gray-800 bg-[#0c0d12] flex items-center justify-center">
                  <Award className="text-gray-700 w-8 h-8" />
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Contact CTA Section */}
      <section className="py-20 border-t border-gray-950 bg-gradient-to-t from-[#090a0f] to-[#07080b]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-amber-500 uppercase tracking-wider">
            Ready to partner with Top Line?
          </h2>
          <p className="mt-4 text-gray-400 max-w-xl mx-auto">
            Get in touch to deploy reliable student crews at your luxury hotel, catering event, or resort. Or view our active opportunities to apply.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/contact"
              className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-black px-8 py-3 rounded-lg text-lg font-bold transition"
            >
              Get in Touch
            </Link>
            <a
              href={`https://wa.me/${homeContent.whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto bg-transparent hover:bg-emerald-500/10 text-emerald-400 px-8 py-3 rounded-lg text-lg font-bold border border-emerald-500/20 hover:border-emerald-500/40 transition"
            >
              Join WhatsApp Group
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
