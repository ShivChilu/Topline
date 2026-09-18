import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroSlideshow from "@/components/HeroSlideshow";
import { prisma } from "@/lib/prisma";
import { isEventPast, getEffectiveEventStatus } from "@/lib/event-utils";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
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
  Award,
  Flame,
  Sparkles,
  CheckCircle,
  Gift,
} from "lucide-react";

export const revalidate = 0; // Dynamic rendering for latest opportunities

function formatTime12(timeStr: string) {
  if (!timeStr) return "";
  const parts = timeStr.split(":");
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  if (isNaN(hours)) return timeStr;
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strHours = hours < 10 ? "0" + hours : hours;
  return `${strHours}:${minutes} ${ampm}`;
}

export default async function HomePage() {
  let activeEvents: any[] = [];
  let heroFeaturedEvent: any = null;
  let galleryImages: any[] = [];
  let homeContent: any = {
    headline: "Reliable Hospitality Workforce for Events, Hotels & Resorts",
    subheadline: "TOPLINE ODC connects premium hotels, resorts, and hospitality managers with a dependable, pre-screened student workforce.",
    whatsappNumber: "919876543210",
    whatsappLink: "https://chat.whatsapp.com/Fo4S0lA5xYULLJCm9p0oPh",
    email: "contact@toplinecatering.com",
    aboutText: "",
  };

  try {
    // Fetch all published events and sort with marketing priority (OPEN first)
    const rawVisibleEvents = await prisma.event.findMany({
      where: { visibility: "VISIBLE", status: { not: "ARCHIVED" } },
      orderBy: { date: "asc" },
    });

    const allVisibleEvents = rawVisibleEvents.map((e) => ({
      ...e,
      status: getEffectiveEventStatus(e),
      isPast: isEventPast(e.date),
    }));

    const statusPriority: Record<string, number> = {
      OPEN: 1,
      SCHEDULED: 2,
      FULL: 3,
      DRAFT: 4,
      CLOSED: 5,
      COMPLETED: 6,
    };

    allVisibleEvents.sort((a, b) => {
      const pA = statusPriority[a.status] || 99;
      const pB = statusPriority[b.status] || 99;
      if (pA !== pB) return pA - pB;
      const dA = a.date ? new Date(a.date).getTime() : 0;
      const dB = b.date ? new Date(b.date).getTime() : 0;
      return dA - dB;
    });

    activeEvents = allVisibleEvents.slice(0, 3);
    heroFeaturedEvent = allVisibleEvents.find((e) => e.status === "OPEN") || null;

    // Fetch published gallery images
    galleryImages = await prisma.gallery.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
      take: 4,
    });

    // Fetch site configurations
    const config = await prisma.setting.findUnique({
      where: { key: "homepage_content" },
    });
    if (config?.value && typeof config.value === "object") {
      homeContent = { ...homeContent, ...config.value };
    }
  } catch (error) {
    console.error("Error loading home page content:", error);
  }

  // Check if a signed-in student has NOT created a referral code yet
  let unactivatedReferralUser: { id: string; name: string } | null = null;
  try {
    const cookieStore = await cookies();
    const userToken = cookieStore.get("user_token")?.value;
    if (userToken) {
      const decoded = verifyToken(userToken);
      if (decoded?.id) {
        const u = await prisma.user.findUnique({
          where: { id: decoded.id },
          select: { id: true, name: true, referralCode: true, role: true },
        });
        // Only show if user is signed in, is a student, and has NOT created a referral code yet
        if (u && !u.referralCode && ["STUDENT", "USER"].includes(u.role)) {
          unactivatedReferralUser = { id: u.id, name: u.name || "Student" };
        }
      }
    }
  } catch (err) {
    console.error("Home page referral auth check error:", err);
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

      {/* Top Urgent Recruitment Announcement Bar */}
      {heroFeaturedEvent && (
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-600 text-white py-2.5 px-4 text-xs sm:text-sm font-extrabold shadow-md relative z-40 border-b border-red-700">
          <div className="max-w-7xl mx-auto flex items-center justify-center text-center gap-2 sm:gap-3 flex-wrap">
            <span className="bg-white text-red-700 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-xs flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-red-600" />
              <span>Urgent Hiring</span>
            </span>
            <span className="text-white/95">
              <strong>{heroFeaturedEvent.name}</strong> • {heroFeaturedEvent.workType} • ₹{heroFeaturedEvent.paymentPerStudent}/shift
            </span>
            <Link
              href={`/events/${heroFeaturedEvent.id}`}
              className="bg-white hover:bg-slate-100 text-red-700 font-extrabold px-3 py-1 rounded-lg text-xs transition inline-flex items-center gap-1 shadow-xs ml-1"
            >
              <span>Apply Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      <Navbar />

      {/* Hero Slideshow Section */}
      <HeroSlideshow headline={homeContent.headline} subheadline={homeContent.subheadline}>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-[420px] sm:max-w-none mx-auto">
          {heroFeaturedEvent ? (
            <Link
              href={`/events/${heroFeaturedEvent.id}`}
              className="w-full sm:w-auto bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white px-6 py-3.5 sm:px-8 sm:py-4 rounded-xl text-[15px] sm:text-lg font-black shadow-lg shadow-red-600/30 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-center space-x-2 box-border"
            >
              <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
              <span>Apply for {heroFeaturedEvent.name} (₹{heroFeaturedEvent.paymentPerStudent})</span>
              <ArrowRight className="w-5 h-5 shrink-0" />
            </Link>
          ) : (
            <Link
              href="/opportunities"
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white px-6 py-3.5 sm:px-8 sm:py-4 rounded-xl text-[15px] sm:text-lg font-bold shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-center space-x-2 box-border"
            >
              <span>Upcoming Events</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          )}
          <Link
            href="/opportunities"
            className="w-full sm:w-auto bg-white hover:bg-slate-50 text-slate-700 px-6 py-3.5 sm:px-8 sm:py-4 rounded-xl text-[15px] sm:text-lg font-bold border border-slate-200 shadow-sm transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-center box-border"
          >
            Browse All Events
          </Link>
        </div>
      </HeroSlideshow>

      {/* Dynamic Referral Program Spotlight for Signed-In Students Without Referral Code */}
      {unactivatedReferralUser && (
        <section className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 -mt-6 sm:-mt-8 mb-8 relative z-20 w-full box-border">
          <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 border border-purple-500/40 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-5 w-full box-border">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-purple-500/20 via-indigo-500/10 to-transparent rounded-bl-full pointer-events-none"></div>

            <div className="space-y-2 max-w-2xl relative z-10 w-full min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                  <Gift className="w-3.5 h-3.5 shrink-0" />
                  Up to ₹150 Cash Reward
                </span>
                <span className="text-[11px] sm:text-xs font-bold text-purple-200">Topline Student Referral Program</span>
              </div>
              <h3 className="text-base sm:text-2xl font-black text-white leading-snug break-words">
                Hey {unactivatedReferralUser.name}, Earn Up to ₹150 for Every Friend You Refer!
              </h3>
              <p className="text-xs sm:text-sm text-purple-200/90 leading-relaxed break-words">
                You haven&apos;t created your referral code yet. Activate your code in your profile to start inviting college batchmates and get up to ₹150 deposited directly to your UPI ID when they complete their first event work.
              </p>
            </div>

            <Link
              href="/profile"
              className="w-full md:w-auto bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black px-5 py-3 rounded-xl sm:rounded-2xl text-xs uppercase tracking-wider transition shadow-lg shrink-0 flex items-center justify-center gap-2 active:scale-95 text-center relative z-10 box-border"
            >
              <span>Activate Referral Code (Earn Up to ₹150)</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </Link>
          </div>
        </section>
      )}

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
                <span className="gradient-text">Upcoming Events</span>
              </h2>
              <p className="mt-2 text-slate-500 text-lg">
                High-paying catering and hospitality slots currently recruiting students.
              </p>
            </div>
            <Link
              href="/opportunities"
              className="mt-4 md:mt-0 flex items-center space-x-2 text-red-600 hover:text-red-700 font-bold transition duration-300"
            >
              <span>See All Upcoming Events</span>
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
              {activeEvents.map((event: any) => {
                const isOpen = event.status === "OPEN";
                return (
                  <div
                    key={event.id}
                    className={`rounded-2xl overflow-hidden flex flex-col justify-between relative group transition-all duration-300 ${
                      isOpen
                        ? "bg-white border-2 border-red-500/80 shadow-md ring-4 ring-red-500/10 hover:shadow-xl transform hover:-translate-y-1"
                        : "light-panel shadow-sm hover:shadow-md"
                    }`}
                  >
                    {/* Left accent bar on hover */}
                    <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-red-600 scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-top"></div>
                    <div className="absolute -top-10 -right-10 w-24 h-24 bg-red-600/5 rounded-full blur-2xl group-hover:bg-red-600/10 transition-colors duration-300"></div>

                    <div className="p-6 relative z-10">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span
                          className={`text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider ${
                            isOpen
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-300 flex items-center gap-1.5"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {isOpen && <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                          {isOpen ? "Hiring Active" : event.status}
                        </span>
                        {event.workType && (
                          <span className="text-[11px] font-bold text-slate-500 uppercase">
                            {event.workType}
                          </span>
                        )}
                      </div>
                      <h3 className="mt-4 text-xl font-bold text-slate-900 hover:text-red-700 transition duration-300">
                        <Link href={`/events/${event.id}`}>{event.name}</Link>
                      </h3>
                      <p className="mt-2 text-sm text-slate-500 line-clamp-2">{event.description}</p>
                      <div className="mt-6 space-y-3.5 text-sm text-slate-600 font-medium">
                        <div className="flex items-center space-x-2.5">
                          <Calendar className="w-4 h-4 text-red-600" />
                          <span>{new Date(event.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
                        </div>
                        <div className="flex items-center space-x-2.5">
                          <MapPin className="w-4 h-4 text-red-600" />
                          <span>{event.location}</span>
                        </div>
                        <div className="flex items-center space-x-2.5">
                          <Clock className="w-4 h-4 text-red-600" />
                          <span>Reporting: {formatTime12(event.reportingTime)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-50/75 px-6 py-5 flex items-center justify-between border-t border-slate-100 relative z-10">
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Per Student Pay</p>
                        <p className="text-xl font-extrabold text-red-600 font-mono">₹{event.paymentPerStudent}</p>
                      </div>
                      <Link
                        href={`/events/${event.id}`}
                        className={`text-xs font-extrabold px-5 py-2.5 rounded-xl shadow-sm transition duration-300 flex items-center gap-1 ${
                          isOpen
                            ? "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-red-600/20"
                            : "bg-slate-200 hover:bg-slate-300 text-slate-700"
                        }`}
                      >
                        <span>{isOpen ? "Apply Now" : "View Details"}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
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
              { title: "2. Submit Form", desc: "Fill out the registration details to submit your application." },
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
                <div key={img.id} className="h-48 relative rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                  <img src={img.imageUrl} alt={img.caption || ""} className="object-cover w-full h-full" />
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
            Get in touch to deploy reliable student crews at your luxury hotel, catering event, or resort. Or view our upcoming events to apply.
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
