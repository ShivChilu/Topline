import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroSlideshow from "@/components/HeroSlideshow";
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
    subheadline: "TOPLINE ODC connects premium hotels, resorts, and hospitality managers with a dependable, pre-screened student workforce.",
    whatsappNumber: "919876543210",
    whatsappLink: "https://chat.whatsapp.com/Fo4S0lA5xYULLJCm9p0oPh",
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
    { name: "Catering Staff", desc: "Expert food handlers and buffet counter management.", icon: <Utensils className="text-red-600 w-6 h-6" /> },
    { name: "Hospitality Staff", desc: "Front-desk, guest hospitality coordinators, and hostesses.", icon: <Gem className="text-red-600 w-6 h-6" /> },
    { name: "Service Staff", desc: "Professional food and beverage server crews.", icon: <Users className="text-red-600 w-6 h-6" /> },
    { name: "Banquet Staff", desc: "Table operation specialists for weddings and corporate galas.", icon: <Briefcase className="text-red-600 w-6 h-6" /> },
    { name: "Event Staff", desc: "Setup crews, coordinators, and logistics support teams.", icon: <Award className="text-red-600 w-6 h-6" /> },
    { name: "Temporary Workforce", desc: "On-demand teams for high-capacity hospitality demands.", icon: <Clock className="text-red-600 w-6 h-6" /> },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc] text-slate-700 relative grid-bg overflow-hidden">
      {/* Decorative Blur Blobs */}
      <div className="absolute top-[20%] left-[-10%] w-[40vw] h-[40vw] bg-red-650/5 rounded-full floating-blob -z-10 pointer-events-none"></div>
      <div className="absolute top-[60%] right-[-10%] w-[40vw] h-[40vw] bg-red-650/5 rounded-full floating-blob -z-10 pointer-events-none"></div>

      <Navbar />

      {/* Hero Slideshow Section */}
      <HeroSlideshow headline={homeContent.headline} subheadline={homeContent.subheadline}>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/opportunities"
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-black px-8 py-4 rounded-xl text-lg font-bold shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-center space-x-2"
          >
            <span>View Opportunities</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/contact"
            className="w-full sm:w-auto bg-white hover:bg-slate-50 text-slate-700 px-8 py-4 rounded-xl text-lg font-bold border border-slate-200 shadow-sm transition-all duration-300 transform hover:-translate-y-0.5"
          >
            Contact TOPLINE
          </Link>
        </div>
      </HeroSlideshow>

      {/* What We Provide Section */}
      <section className="py-24 border-t border-slate-100 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-wider uppercase">
              <span className="gradient-text">What We Provide</span>
            </h2>
            <p className="mt-4 text-slate-500 max-w-2xl mx-auto text-lg font-sans">
              Tailored event crew staffing solutions built on professional standard criteria.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {defaultServices.map((service, idx) => (
              <div
                key={idx}
                className="light-panel p-8 rounded-2xl flex flex-col relative overflow-hidden group"
              >
                {/* Accent line & soft glow */}
                <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-red-600 scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-top"></div>
                <div className="absolute -top-10 -right-10 w-24 h-24 bg-red-600/5 rounded-full blur-2xl group-hover:bg-red-600/10 transition-colors duration-300"></div>

                <div className="w-12 h-12 bg-red-650/10 rounded-xl flex items-center justify-center border border-red-600/20 mb-6 relative z-10">
                  {service.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3 relative z-10">{service.name}</h3>
                <p className="text-slate-500 text-sm leading-relaxed flex-grow font-sans relative z-10">{service.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Latest Opportunities Section */}
      <section className="py-24 bg-slate-50 border-t border-slate-150 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16">
            <div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-wider uppercase">
                <span className="gradient-text">Active Opportunities</span>
              </h2>
              <p className="mt-2 text-slate-500 text-lg">
                High-paying catering and hospitality slots currently recruiting students.
              </p>
            </div>
            <Link
              href="/opportunities"
              className="mt-4 md:mt-0 flex items-center space-x-2 text-red-600 hover:text-red-700 font-bold transition duration-300"
            >
              <span>See All Opportunities</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {activeEvents.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-slate-500 text-lg">No active student recruitment forms open at this time.</p>
              <p className="text-slate-400 text-sm mt-1">Check back later or join the WhatsApp group.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {activeEvents.map((event: any) => (
                <div
                  key={event._id.toString()}
                  className="light-panel rounded-2xl overflow-hidden flex flex-col justify-between relative group"
                >
                  {/* Left accent bar on hover */}
                  <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-red-600 scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-top"></div>
                  <div className="absolute -top-10 -right-10 w-24 h-24 bg-red-600/5 rounded-full blur-2xl group-hover:bg-red-600/10 transition-colors duration-300"></div>

                  <div className="p-6 relative z-10">
                    <span className="bg-emerald-50 text-emerald-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-emerald-250 uppercase tracking-widest">
                      {event.status}
                    </span>
                    <h3 className="mt-4 text-xl font-bold text-slate-900 hover:text-red-700 transition duration-300">
                      <Link href={`/events/${event._id}`}>{event.name}</Link>
                    </h3>
                    <p className="mt-2 text-sm text-slate-500 line-clamp-2">{event.description}</p>
                    <div className="mt-6 space-y-3.5 text-sm text-slate-600">
                      <div className="flex items-center space-x-2.5">
                        <Calendar className="w-4 h-4 text-red-700" />
                        <span>{new Date(event.date).toLocaleDateString("en-GB")}</span>
                      </div>
                      <div className="flex items-center space-x-2.5">
                        <MapPin className="w-4 h-4 text-red-700" />
                        <span>{event.location}</span>
                      </div>
                      <div className="flex items-center space-x-2.5">
                        <Clock className="w-4 h-4 text-red-700" />
                        <span>Reporting: {event.reportingTime}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-slate-50/50 px-6 py-5 flex items-center justify-between border-t border-slate-100 relative z-10">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">Payout</p>
                      <p className="text-xl font-extrabold text-red-700">₹{event.paymentPerStudent}</p>
                    </div>
                    <Link
                      href={`/events/${event._id}`}
                      className="bg-red-600 hover:bg-red-700 text-black text-xs font-bold px-4 py-2.5 rounded-lg shadow-sm transition duration-300"
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
      <section className="py-24 border-t border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-wider text-red-700 uppercase mb-16">
            Process For Students
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { title: "1. Browse Slots", desc: "Find open hospitality events matching your free dates." },
              { title: "2. Submit Form", desc: "Apply in under 2 minutes through the dynamic custom questionnaire." },
              { title: "3. Check-In & Work", desc: "Confirm selection, wear uniforms, scan attendance QR code." },
              { title: "4. Fast Payout", desc: "Complete work shifts, verify checkout, and get paid." },
            ].map((step, idx) => (
              <div key={idx} className="light-panel p-6 rounded-2xl flex flex-col items-center text-center">
                <h3 className="text-red-700 font-extrabold text-lg mb-2">{step.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why TOPLINE Section */}
      <section className="py-24 border-t border-slate-100 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-red-800 text-sm font-extrabold tracking-widest uppercase">
              Partnership & Quality
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-display font-extrabold tracking-wider text-slate-900 uppercase">
              Why Hotels & Resorts Choose TOPLINE
            </h2>
            <p className="mt-4 text-slate-500 leading-relaxed font-sans">
              We eliminate the stress of manual hiring coordination. Our system provides automated registration tracking, real-time application limit configurations, duplicate checks, digital verification records, and automated check-ins.
            </p>
            <div className="mt-8 space-y-4">
              {[
                { title: "Pre-Screened Students", desc: "We only verify students with clean history records and valid college ID cards." },
                { title: "Strict Grooming & Conduct", desc: "Strictly enforced dress codes and professional behavior guidelines." },
                { title: "Automated Attendance & Payments", desc: "Digital check-in tracking prevents payroll errors and time theft." },
              ].map((item, idx) => (
                <div key={idx} className="flex items-start space-x-3">
                  <Shield className="text-red-700 w-5 h-5 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-slate-900">{item.title}</h4>
                    <p className="text-sm text-slate-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {galleryImages.length > 0 ? (
              galleryImages.map((img: any) => (
                <div key={img._id.toString()} className="h-48 relative rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                  <img src={img.imageUrl} alt={img.caption} className="object-cover w-full h-full" />
                </div>
              ))
            ) : (
              <>
                <div className="h-48 relative rounded-xl overflow-hidden border border-slate-200 bg-white flex items-center justify-center shadow-sm">
                  <Utensils className="text-slate-300 w-8 h-8" />
                </div>
                <div className="h-48 relative rounded-xl overflow-hidden border border-slate-200 bg-white flex items-center justify-center shadow-sm">
                  <Gem className="text-slate-300 w-8 h-8" />
                </div>
                <div className="h-48 relative rounded-xl overflow-hidden border border-slate-200 bg-white flex items-center justify-center shadow-sm">
                  <Users className="text-slate-300 w-8 h-8" />
                </div>
                <div className="h-48 relative rounded-xl overflow-hidden border border-slate-200 bg-white flex items-center justify-center shadow-sm">
                  <Award className="text-slate-300 w-8 h-8" />
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Contact CTA Section */}
      <section className="py-24 border-t border-slate-100 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 uppercase tracking-wider">
            Ready to partner with TOPLINE?
          </h2>
          <p className="mt-4 text-slate-500 max-w-xl mx-auto text-lg">
            Get in touch to deploy reliable student crews at your luxury hotel, catering event, or resort. Or view our active opportunities to apply.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/contact"
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-black px-8 py-3.5 rounded-lg text-lg font-bold shadow-sm transition"
            >
              Get in Touch
            </Link>
            <a
              href={homeContent.whatsappLink || "https://chat.whatsapp.com/Fo4S0lA5xYULLJCm9p0oPh"}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto bg-white hover:bg-emerald-50 text-emerald-700 hover:text-white px-8 py-3.5 rounded-lg text-lg font-bold border border-emerald-500/20 hover:border-emerald-500 transition duration-300 flex items-center justify-center"
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
