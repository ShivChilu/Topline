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
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-600 text-white py-1.5 px-3 sm:py-2.5 sm:px-4 text-xs font-bold shadow-md relative z-40 border-b border-red-700">
          <div className="max-w-7xl mx-auto flex items-center justify-between sm:justify-center text-left sm:text-center gap-2 sm:gap-3 flex-nowrap w-full">
            <div className="flex items-center gap-1.5 min-w-0 flex-1 sm:flex-initial overflow-hidden">
              <span className="bg-white text-red-700 px-2 py-0.5 rounded-full text-[9.5px] sm:text-[10px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1 shadow-2xs">
                <Flame className="w-3 h-3 text-red-600 animate-pulse shrink-0" />
                <span>Urgent</span>
              </span>
              <span className="text-white text-[11.5px] sm:text-xs truncate font-medium min-w-0">
                <strong className="font-extrabold">{heroFeaturedEvent.name}</strong> • ₹{heroFeaturedEvent.paymentPerStudent}/shift
              </span>
            </div>
            <Link
              href={`/events/${heroFeaturedEvent.id}`}
              className="bg-white hover:bg-slate-100 text-red-700 font-black px-2.5 py-1 rounded-lg text-[10.5px] sm:text-[11px] transition inline-flex items-center gap-1 shadow-xs shrink-0 whitespace-nowrap active:scale-95"
            >
              <span>Apply</span>
              <ArrowRight className="w-3 h-3 shrink-0" />
            </Link>
          </div>
        </div>
      )}

      <Navbar />

      {/* Hero Slideshow Section */}
      <HeroSlideshow headline={homeContent.headline} subheadline={homeContent.subheadline}>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3 w-full max-w-[420px] sm:max-w-none mx-auto">
          {heroFeaturedEvent ? (
            <Link
              href={`/events/${heroFeaturedEvent.id}`}
              className="w-full sm:w-auto bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white px-5 py-3 sm:px-8 sm:py-3.5 rounded-xl text-xs sm:text-base font-extrabold shadow-md shadow-red-600/30 hover:shadow-lg transition-all duration-300 flex items-center justify-center space-x-2 box-border active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
              <span>Apply for {heroFeaturedEvent.name} (₹{heroFeaturedEvent.paymentPerStudent})</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </Link>
          ) : (
            <Link
              href="/opportunities"
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white px-5 py-3 sm:px-8 sm:py-3.5 rounded-xl text-xs sm:text-base font-extrabold shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center space-x-2 box-border active:scale-95"
            >
              <span>Upcoming Events</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
          <Link
            href="/opportunities"
            className="w-full sm:w-auto bg-white hover:bg-slate-50 text-slate-800 px-5 py-3 sm:px-8 sm:py-3.5 rounded-xl text-xs sm:text-base font-bold border border-slate-200 shadow-xs transition-all duration-300 flex items-center justify-center box-border active:scale-95"
          >
            Browse All Events
          </Link>
        </div>
      </HeroSlideshow>

      {/* Dynamic Referral Program Spotlight for Signed-In Students Without Referral Code */}
      {unactivatedReferralUser && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 sm:-mt-6 mb-6 sm:mb-10 relative z-20 w-full box-border">
          <div className="bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 text-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-purple-500/40 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-3.5 sm:gap-5 w-full box-border">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-purple-500/20 via-indigo-500/10 to-transparent rounded-bl-full pointer-events-none"></div>

            <div className="space-y-1.5 sm:space-y-2 max-w-2xl relative z-10 w-full min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                  <Gift className="w-3 h-3 shrink-0" />
                  Up to ₹150 Cash Reward
                </span>
                <span className="text-[11px] sm:text-xs font-bold text-purple-200">Student Referral Program</span>
              </div>
              <h3 className="text-sm sm:text-xl md:text-2xl font-black text-white leading-snug break-words">
                Hey {unactivatedReferralUser.name}, Earn Up to ₹150 for Every Friend You Refer!
              </h3>
              <p className="text-xs sm:text-sm text-purple-100/90 leading-relaxed break-words">
                Activate your custom code to invite batchmates. Get up to ₹150 deposited directly to your UPI when they complete their first event shift.
              </p>
            </div>

            <Link
              href="/profile"
              className="w-full md:w-auto bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl sm:rounded-2xl text-xs uppercase tracking-wider transition shadow-lg shrink-0 flex items-center justify-center gap-1.5 active:scale-95 text-center relative z-10 box-border"
            >
              <span>Activate Referral Code</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </Link>
          </div>
        </section>
      )}

      {/* What We Provide Section (App-Like 2-Col Mobile Grid, Rich Desktop Grid) */}
      <section className="py-10 sm:py-16 md:py-20 border-t border-slate-100 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <span className="text-red-600 text-xs font-extrabold uppercase tracking-wider">Topline Services</span>
            <h2 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              What We Provide
            </h2>
            <p className="mt-1.5 sm:mt-2 text-slate-500 max-w-xl mx-auto text-xs sm:text-base font-sans">
              Tailored event crew staffing solutions built on professional hospitality criteria.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-6">
            {defaultServices.map((service, idx) => (
              <div
                key={idx}
                className="bg-slate-50/60 hover:bg-white p-3.5 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col relative overflow-hidden group"
              >
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-red-600/10 rounded-lg sm:rounded-xl flex items-center justify-center border border-red-600/20 mb-2.5 sm:mb-4 shrink-0">
                  <div className="scale-75 sm:scale-100">{service.icon}</div>
                </div>
                <h3 className="text-xs sm:text-lg font-bold text-slate-900 mb-1 leading-snug">{service.name}</h3>
                <p className="text-slate-500 text-[11px] sm:text-sm leading-relaxed flex-grow font-sans line-clamp-2 sm:line-clamp-none">
                  {service.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Latest Opportunities Section */}
      <section className="py-10 sm:py-16 md:py-20 bg-slate-50/80 border-t border-slate-200/80 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6 sm:mb-10">
            <div>
              <span className="text-red-600 text-xs font-extrabold uppercase tracking-wider">Student Recruitment</span>
              <h2 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                Upcoming Events
              </h2>
            </div>
            <Link
              href="/opportunities"
              className="text-red-600 hover:text-red-700 font-bold text-xs sm:text-sm flex items-center gap-1 transition"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {activeEvents.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-slate-500 text-sm sm:text-base font-bold">No active recruitment forms open right now.</p>
              <p className="text-slate-400 text-xs mt-1">Check back soon or join our student WhatsApp group.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {activeEvents.map((event: any) => {
                const isOpen = event.status === "OPEN";
                return (
                  <div
                    key={event.id}
                    className={`rounded-2xl overflow-hidden flex flex-col justify-between relative bg-white border transition-all duration-300 ${
                      isOpen
                        ? "border-red-400/80 shadow-md ring-2 ring-red-500/10 hover:shadow-lg"
                        : "border-slate-200 shadow-xs hover:shadow-md"
                    }`}
                  >
                    <div className="p-4 sm:p-6 relative z-10">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span
                          className={`text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                            isOpen
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-300 flex items-center gap-1"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {isOpen && <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />}
                          {isOpen ? "Hiring Active" : event.status}
                        </span>
                        {event.workType && (
                          <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase">
                            {event.workType}
                          </span>
                        )}
                      </div>
                      <h3 className="mt-3 text-base sm:text-xl font-bold text-slate-900 hover:text-red-700 transition leading-snug">
                        <Link href={`/events/${event.id}`}>{event.name}</Link>
                      </h3>
                      <p className="mt-1.5 text-xs text-slate-500 line-clamp-2">{event.description}</p>
                      <div className="mt-4 space-y-2 text-xs sm:text-sm text-slate-600 font-medium">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-3.5 h-3.5 text-red-600 shrink-0" />
                          <span>{new Date(event.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-3.5 h-3.5 text-red-600 shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="w-3.5 h-3.5 text-red-600 shrink-0" />
                          <span>Reporting: {formatTime12(event.reportingTime)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-50/80 px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between border-t border-slate-100 relative z-10">
                      <div>
                        <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider">Per Student Pay</p>
                        <p className="text-lg sm:text-xl font-black text-red-600 font-mono">₹{event.paymentPerStudent}</p>
                      </div>
                      <Link
                        href={`/events/${event.id}`}
                        className={`text-xs font-extrabold px-3.5 py-2 sm:px-5 sm:py-2.5 rounded-xl shadow-xs transition flex items-center gap-1 active:scale-95 ${
                          isOpen
                            ? "bg-red-600 hover:bg-red-700 text-white shadow-red-600/20"
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

      {/* How it Works Summary (Compact 2x2 on Mobile, 4-Col on Desktop) */}
      <section className="py-10 sm:py-16 md:py-20 border-t border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-red-600 text-xs font-extrabold uppercase tracking-wider">How It Works</span>
          <h2 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1 mb-6 sm:mb-10">
            Simple 4-Step Process for Students
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-6">
            {[
              { step: "01", title: "Browse Slots", desc: "Find open catering & hospitality shifts matching your schedule." },
              { step: "02", title: "Submit Form", desc: "Fill basic details & college ID to register your application." },
              { step: "03", title: "Confirm via Email", desc: "Open selection email & click 1-Click RSVP (Confirm) to secure your spot." },
              { step: "04", title: "Attend & Get Paid", desc: "Arrive in uniform, scan QR attendance, and get paid directly to bank/UPI." },
            ].map((item, idx) => (
              <div key={idx} className="bg-slate-50/60 p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/80 flex flex-col items-center text-center">
                <span className="w-7 h-7 sm:w-8 sm:h-8 bg-red-600 text-white rounded-full flex items-center justify-center font-mono font-black text-xs sm:text-sm mb-2 sm:mb-3 shadow-xs">
                  {item.step}
                </span>
                <h3 className="text-slate-900 font-bold text-xs sm:text-base mb-1">{item.title}</h3>
                <p className="text-slate-500 text-[11px] sm:text-xs leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why TOPLINE Section */}
      <section className="py-10 sm:py-16 md:py-20 border-t border-slate-100 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-center">
          <div>
            <span className="text-red-600 text-xs font-extrabold tracking-wider uppercase">
              Partnership & Quality
            </span>
            <h2 className="mt-1 text-xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Why Hotels & Resorts Choose TOPLINE
            </h2>
            <p className="mt-2.5 text-slate-500 leading-relaxed text-xs sm:text-base font-sans">
              We eliminate the stress of manual hiring coordination. Our system provides automated registration tracking, pre-screened student staff, and instant attendance check-ins.
            </p>
            <div className="mt-5 sm:mt-8 space-y-3 sm:space-y-4">
              {[
                { title: "Pre-Screened Students", desc: "We verify students with clean history records and valid college ID cards." },
                { title: "Strict Grooming & Conduct", desc: "Strictly enforced dress codes and professional behavior guidelines." },
                { title: "Automated Attendance & QR Check-Ins", desc: "Digital check-in tracking prevents payroll errors and time theft." },
              ].map((item, idx) => (
                <div key={idx} className="flex items-start space-x-2.5 sm:space-x-3">
                  <Shield className="text-red-600 w-4 h-4 sm:w-5 sm:h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900">{item.title}</h4>
                    <p className="text-[11px] sm:text-xs text-slate-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
            {galleryImages.length > 0 ? (
              galleryImages.map((img: any) => (
                <div key={img.id} className="h-32 sm:h-44 relative rounded-xl overflow-hidden border border-slate-200 shadow-xs">
                  <img src={img.imageUrl} alt={img.caption || ""} className="object-cover w-full h-full" />
                </div>
              ))
            ) : (
              <>
                <div className="h-32 sm:h-44 relative rounded-xl overflow-hidden border border-slate-200 bg-white flex items-center justify-center shadow-xs">
                  <Utensils className="text-slate-300 w-6 h-6 sm:w-8 sm:h-8" />
                </div>
                <div className="h-32 sm:h-44 relative rounded-xl overflow-hidden border border-slate-200 bg-white flex items-center justify-center shadow-xs">
                  <Gem className="text-slate-300 w-6 h-6 sm:w-8 sm:h-8" />
                </div>
                <div className="h-32 sm:h-44 relative rounded-xl overflow-hidden border border-slate-200 bg-white flex items-center justify-center shadow-xs">
                  <Users className="text-slate-300 w-6 h-6 sm:w-8 sm:h-8" />
                </div>
                <div className="h-32 sm:h-44 relative rounded-xl overflow-hidden border border-slate-200 bg-white flex items-center justify-center shadow-xs">
                  <Award className="text-slate-300 w-6 h-6 sm:w-8 sm:h-8" />
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Contact CTA Section */}
      <section className="py-10 sm:py-16 md:py-20 border-t border-slate-100 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Ready to Partner with TOPLINE?
          </h2>
          <p className="mt-2 text-slate-500 max-w-xl mx-auto text-xs sm:text-base">
            Deploy dependable student event teams at your hotel, catering event, or resort. Or apply for upcoming shifts today.
          </p>
          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/contact"
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl text-xs sm:text-sm font-bold shadow-xs transition active:scale-95"
            >
              Get in Touch
            </Link>
            <a
              href={homeContent.whatsappLink || "https://chat.whatsapp.com/Fo4S0lA5xYULLJCm9p0oPh"}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-800 px-6 py-3 rounded-xl text-xs sm:text-sm font-bold border border-slate-200 transition flex items-center justify-center active:scale-95"
            >
              Join WhatsApp Community
            </a>
          </div>
        </div>
      </section>


      <Footer />
    </div>
  );
}
