import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { getStudentProfileCompletion } from "@/lib/profile-completion";
import { isEventPast, getEffectiveEventStatus } from "@/lib/event-utils";
import EventAssistantChatbot from "@/components/events/EventAssistantChatbot";
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  CheckCircle,
  Lock,
  Sparkles,
  Search,
  SlidersHorizontal,
  Flame,
  Utensils,
  User,
  Gift,
  AlertTriangle,
  MessageCircle,
} from "lucide-react";

export const revalidate = 0; // Disable static cache for live availability updates

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

export default async function OpportunitiesPage(props: {
  searchParams: Promise<{ status?: string; search?: string }>;
}) {
  const searchParams = await props.searchParams;
  let events: any[] = [];
  let user: any = null;
  let profileCompletion = { percentage: 0, isComplete: false, missingFields: [] as string[], missingPhotos: [] as string[] };

  // Check student authentication session
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("user_token")?.value;
    if (token) {
      const decoded = verifyToken(token);
      if (decoded && decoded.id) {
        user = await prisma.user.findUnique({
          where: { id: decoded.id },
          select: {
            id: true,
            name: true,
            role: true,
            registrationNumber: true,
            referralCode: true,
            applications: {
              select: {
                eventId: true,
                status: true,
              },
            },
          },
        });
        if (user) {
          profileCompletion = await getStudentProfileCompletion(user.id);
        }
      }
    }
  } catch (err) {
    console.error("Auth session check error on opportunities page:", err);
  }

  try {
    const now = new Date();
    await prisma.event.updateMany({
      where: {
        status: "SCHEDULED",
        scheduledPublishAt: { lte: now },
      },
      data: {
        status: "OPEN",
      },
    });

    const whereClause: any = {
      visibility: "VISIBLE",
      status: { not: "ARCHIVED" },
    };

    if (searchParams.search) {
      const search = searchParams.search.trim();
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { location: { contains: search, mode: "insensitive" } },
        { workType: { contains: search, mode: "insensitive" } },
      ];
    }

    const rawEvents = await prisma.event.findMany({
      where: whereClause,
      orderBy: { date: "asc" },
    });

    // Dynamically calculate effective status for each event based on event date
    const processedEvents = rawEvents.map((e) => ({
      ...e,
      status: getEffectiveEventStatus(e),
      isPast: isEventPast(e.date),
    }));

    // Filter by requested status if provided
    let filteredEvents = processedEvents;
    if (searchParams.status) {
      filteredEvents = filteredEvents.filter((e) => e.status === searchParams.status);
    }

    // Smart Marketing-First Priority Sorting:
    // 1. OPEN events (Hiring active)
    // 2. SCHEDULED events
    // 3. FULL events
    // 4. CLOSED / COMPLETED / ARCHIVED events
    const statusPriority: Record<string, number> = {
      OPEN: 1,
      SCHEDULED: 2,
      FULL: 3,
      DRAFT: 4,
      CLOSED: 5,
      COMPLETED: 6,
      CANCELLED: 7,
      ARCHIVED: 8,
    };

    events = [...filteredEvents].sort((a, b) => {
      const pA = statusPriority[a.status] || 99;
      const pB = statusPriority[b.status] || 99;
      if (pA !== pB) return pA - pB;
      const dA = a.date ? new Date(a.date).getTime() : 0;
      const dB = b.date ? new Date(b.date).getTime() : 0;
      return dA - dB;
    });
  } catch (error) {
    console.error("Failed to load events", error);
  }

  const allMissing = [...profileCompletion.missingFields, ...profileCompletion.missingPhotos];
  const openEvents = events.filter((e: any) => e.status === "OPEN");
  const fullEvents = events.filter((e: any) => e.status === "FULL");
  const featuredOpenEvent = openEvents[0] || null;

  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc] text-slate-700 relative grid-bg overflow-hidden">
      {/* Decorative Blur Blobs */}
      <div className="absolute top-[10%] right-[-10%] w-[35vw] h-[35vw] bg-red-600/5 rounded-full floating-blob -z-10 pointer-events-none"></div>
      <div className="absolute top-[50%] left-[-10%] w-[35vw] h-[35vw] bg-red-600/5 rounded-full floating-blob -z-10 pointer-events-none"></div>

      <Navbar />
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 w-full space-y-6 sm:space-y-8">
        {/* Page Header */}
        <div className="text-center space-y-1.5 sm:space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-red-600" />
            Topline Catering Assignments
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Available Events &amp; Opportunities
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl mx-auto">
            Explore verified five-star hotel catering, banquet steward shifts, and luxury hospitality opportunities across the region.
          </p>
        </div>

        {/* PROFILE COMPLETION ELIGIBILITY BANNER */}
        {!user ? (
          <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-600/20 rounded-2xl border border-red-600/30 flex items-center justify-center text-red-500 shrink-0">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">Student Account Required to Apply</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Sign in or create your permanent Topline student profile to apply for these catering events.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Link
                href="/login?redirect=/opportunities"
                className="flex-1 sm:flex-initial bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition shadow text-center"
              >
                Log In
              </Link>
              <Link
                href="/register?redirect=/opportunities"
                className="flex-1 sm:flex-initial bg-slate-800 hover:bg-slate-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition border border-slate-700 text-center"
              >
                Register
              </Link>
            </div>
          </div>
        ) : !profileCompletion.isComplete ? (
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 text-amber-900 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <h3 className="text-sm sm:text-base font-extrabold text-amber-950">
                  Profile {profileCompletion.percentage}% Complete — Action Required Before Applying
                </h3>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                To guarantee event eligibility and high-standard grooming review, complete remaining required items:{" "}
                <strong className="font-bold">{allMissing.join(", ")}</strong>.
              </p>
            </div>
            <Link
              href="/profile"
              className="bg-red-600 hover:bg-red-700 text-white font-extrabold px-6 py-3 rounded-2xl text-xs uppercase tracking-wider transition shadow-md whitespace-nowrap self-start sm:self-auto"
            >
              Complete Profile ({profileCompletion.percentage}%) →
            </Link>
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-4 text-emerald-900 shadow-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="text-xs sm:text-sm font-bold">
                ✓ Your profile is 100% complete and verified! You are fully eligible to apply for all open events.
              </span>
            </div>
            <Link
              href="/profile"
              className="text-xs font-extrabold text-emerald-800 hover:underline shrink-0"
            >
              My Profile
            </Link>
          </div>
        )}

        {/* Account On Hold Warning Banner */}
        {user && user.selectionStatus === "ON_HOLD" && (
          <div className="bg-gradient-to-r from-rose-50 to-amber-50 border-2 border-rose-300 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-slate-800 shadow-md animate-in fade-in flex flex-col md:flex-row items-start md:items-center justify-between gap-4 w-full box-border">
            <div className="flex items-start gap-3.5 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-black text-rose-950">Student Account On Hold</h3>
                  <span className="bg-rose-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                    Registration Restricted
                  </span>
                </div>
                <p className="text-xs text-rose-900 mt-1 leading-relaxed">
                  {user.adminRemarks || "Your student account is temporarily placed on hold due to an event absence. New event applications are locked."}
                </p>
                <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                  Had an unavoidable emergency? Send your reason directly to admin on WhatsApp to reactivate your account.
                </p>
              </div>
            </div>
            <a
              href={`https://wa.me/917986955634?text=${encodeURIComponent(
                `Hi Admin, my name is ${user.name} (Reg No: ${user.registrationNumber || "N/A"}). My Topline profile is currently ON HOLD. Here is my reason/emergency for absence:\n\n[Explain reason here]`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="w-full md:w-auto bg-[#25D366] hover:bg-[#20bd5a] text-white font-black px-5 py-3 rounded-xl sm:rounded-2xl text-xs uppercase tracking-wider transition shadow-md shrink-0 flex items-center justify-center gap-2 active:scale-95 text-center cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              <span>Appeal on WhatsApp (7986955634)</span>
            </a>
          </div>
        )}

        {/* Dynamic Referral Promotion (Only shown to signed-in students who have NOT created a referral code yet) */}
        {user && !user.referralCode && ["STUDENT", "USER"].includes(user.role) && (
          <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-purple-500/40 shadow-lg relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4 w-full box-border">
            <div className="space-y-1.5 max-w-2xl relative z-10 w-full min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                  <Gift className="w-3.5 h-3.5 shrink-0" />
                  Refer &amp; Earn Up to ₹150
                </span>
                <span className="text-[11px] sm:text-xs font-bold text-purple-200">Invite College Batchmates</span>
              </div>
              <h3 className="text-base sm:text-xl font-black text-white break-words leading-snug">
                Earn Up to ₹150 Cash by Referring Friends to Topline!
              </h3>
              <p className="text-xs text-purple-200/90 leading-relaxed break-words">
                Want to work catering events with your friends? Activate your referral code in your profile to earn up to ₹150 direct to UPI for every friend who joins and completes their first event shift.
              </p>
            </div>

            <Link
              href="/profile"
              className="w-full md:w-auto bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black px-5 py-3 rounded-xl sm:rounded-2xl text-xs uppercase tracking-wider transition shadow-md shrink-0 flex items-center justify-center gap-1.5 active:scale-95 text-center relative z-10 box-border"
            >
              <span>Get My Referral Code</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </Link>
          </div>
        )}

        {/* URGENT OPEN EVENT HIRING SPOTLIGHT BANNER */}
        {featuredOpenEvent && !searchParams.status && !searchParams.search && (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-[#1e1b2e] to-slate-900 border-2 border-red-500/60 shadow-xl text-white p-6 sm:p-8">
            <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
              <div className="space-y-3 max-w-2xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600 text-white text-xs font-black uppercase tracking-wider shadow-sm animate-pulse">
                    <Flame className="w-3.5 h-3.5 text-white" />
                    <span>Urgent Hiring Now</span>
                  </span>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                    <span>Slots Open</span>
                  </span>
                  {featuredOpenEvent.workType && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                      <Utensils className="w-3 h-3 text-slate-400" />
                      <span>{featuredOpenEvent.workType}</span>
                    </span>
                  )}
                </div>

                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  {featuredOpenEvent.name}
                </h2>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:text-sm text-slate-300 font-medium">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-red-400" />
                    <span>{new Date(featuredOpenEvent.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-red-400" />
                    <span>Reporting: {formatTime12(featuredOpenEvent.reportingTime)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-red-400" />
                    <span>{featuredOpenEvent.location}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-3 w-full lg:w-auto shrink-0 pt-2 lg:pt-0">
                <div className="text-left lg:text-right">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Per Student Pay</p>
                  <p className="text-3xl font-black text-red-400 font-mono">₹{featuredOpenEvent.paymentPerStudent}</p>
                </div>
                <Link
                  href={`/events/${featuredOpenEvent.id}`}
                  className="w-full sm:w-auto bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold px-8 py-3.5 rounded-2xl text-sm uppercase tracking-wider transition shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 text-center"
                >
                  <span>Apply For This Event</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Filter Toolbar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          <form className="w-full md:w-auto flex flex-col sm:flex-row gap-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                name="search"
                defaultValue={searchParams.search || ""}
                placeholder="Search event name, location..."
                className="bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-red-600 w-full sm:w-72"
              />
            </div>
            <button
              type="submit"
              className="bg-slate-900 hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm"
            >
              Search
            </button>
          </form>

          <div className="flex gap-2 flex-wrap">
            <Link
              href="/opportunities"
              className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
                !searchParams.status
                  ? "bg-red-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Events ({events.length})
            </Link>
            <Link
              href="/opportunities?status=OPEN"
              className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5 ${
                searchParams.status === "OPEN"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              <span>Open Only ({openEvents.length})</span>
            </Link>
            <Link
              href="/opportunities?status=FULL"
              className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
                searchParams.status === "FULL"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Full ({fullEvents.length})
            </Link>
          </div>
        </div>

        {/* Event List Cards */}
        {events.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-800">No events found matching your criteria</h3>
            <p className="text-xs text-slate-500 mt-1">Please check back soon or try clear filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event: any) => {
              const isOpen = event.status === "OPEN";
              const isFull = event.status === "FULL";
              const isScheduled = event.status === "SCHEDULED";
              const isCompleted = event.status === "COMPLETED";
              const isClosed = event.status === "CLOSED";

              let statusBadgeColor = "bg-slate-100 text-slate-700 border-slate-200";
              if (isOpen) statusBadgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200 font-extrabold";
              if (isFull) statusBadgeColor = "bg-amber-50 text-amber-700 border-amber-200";
              if (isScheduled) statusBadgeColor = "bg-blue-50 text-blue-700 border-blue-200";
              if (isCompleted) statusBadgeColor = "bg-purple-50 text-purple-700 border-purple-200";
              if (isClosed) statusBadgeColor = "bg-rose-50 text-rose-700 border-rose-200";

              return (
                <div
                  key={event.id}
                  className={`bg-white rounded-3xl overflow-hidden transition-all flex flex-col justify-between ${
                    isOpen
                      ? "border-2 border-red-500/80 shadow-md ring-4 ring-red-500/5 hover:shadow-lg"
                      : "border border-slate-200 shadow-sm hover:shadow-md"
                  }`}
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[11px] font-extrabold px-3 py-1 rounded-full border uppercase tracking-wider flex items-center gap-1 ${statusBadgeColor}`}>
                          {isScheduled ? (
                            <>
                              <Clock className="w-3 h-3" />
                              <span>Scheduled</span>
                            </>
                          ) : (
                            <span>{event.status}</span>
                          )}
                        </span>
                        {event.allowedGender === "FEMALE_ONLY" && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 border border-pink-200 uppercase flex items-center gap-1">
                            <User className="w-3 h-3 text-pink-600" />
                            <span>Female Only</span>
                          </span>
                        )}
                        {event.allowedGender === "MALE_ONLY" && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 uppercase flex items-center gap-1">
                            <User className="w-3 h-3 text-blue-600" />
                            <span>Male Only</span>
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 uppercase font-bold">
                        {event.workType}
                      </span>
                    </div>

                    <h3 className="mt-4 text-xl font-extrabold text-slate-900 hover:text-red-600 transition">
                      <Link href={`/events/${event.id}`}>{event.name}</Link>
                    </h3>

                    <div className="mt-6 space-y-3 text-xs text-slate-600 font-medium">
                      <div className="flex items-center space-x-2.5">
                        <Calendar className="w-4 h-4 text-red-600 shrink-0" />
                        <span>Date: {new Date(event.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
                      </div>
                      <div className="flex items-center space-x-2.5">
                        <MapPin className="w-4 h-4 text-red-600 shrink-0" />
                        <span className="truncate">Location: {event.location}</span>
                      </div>
                      <div className="flex items-center space-x-2.5">
                        <Clock className="w-4 h-4 text-red-600 shrink-0" />
                        <span>Reporting: {formatTime12(event.reportingTime)}</span>
                      </div>
                      <div className="flex items-center space-x-2.5">
                        <Users className="w-4 h-4 text-red-600 shrink-0" />
                        {(() => {
                          if (isCompleted || isClosed) {
                            return <span className="font-extrabold text-slate-500 uppercase">Event Concluded</span>;
                          }
                          if (isScheduled && event.scheduledPublishAt) {
                            return (
                              <span className="font-bold text-purple-700 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-purple-600" />
                                <span>Opens: {new Date(event.scheduledPublishAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} at {new Date(event.scheduledPublishAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true })}</span>
                              </span>
                            );
                          }
                          const remainingSlots = Math.max(0, (event.workersRequired || event.maxApplications) - event.applicationsCount);
                          if (remainingSlots <= 0 || event.status === "FULL") {
                            return <span className="font-extrabold text-red-600 uppercase">Applications Full</span>;
                          }
                          if (remainingSlots <= 5) {
                            return (
                              <span className="font-extrabold text-amber-600 flex items-center gap-1">
                                <Flame className="w-3.5 h-3.5 text-amber-600" />
                                <span>Only {remainingSlots} {remainingSlots === 1 ? "slot" : "slots"} left</span>
                              </span>
                            );
                          }
                          return (
                            <span className="font-semibold text-emerald-600 flex items-center gap-1.5">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Hiring Active • Slots Open</span>
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom / Action */}
                  <div className="bg-slate-50/75 px-6 py-4.5 flex items-center justify-between border-t border-slate-100">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Per Student Pay</p>
                      <p className="text-xl font-extrabold text-red-600 font-mono">₹{event.paymentPerStudent}</p>
                    </div>

                    {/* Action Button */}
                    {(() => {
                      const existingApp = user?.applications?.find((app: any) => app.eventId === event.id);

                      if (existingApp) {
                        const appStatus = (existingApp.status || "APPLIED").toUpperCase();
                        let badgeBg = "bg-emerald-600 hover:bg-emerald-700 text-white";
                        let label = "Applied";
                        if (appStatus === "CONFIRMED") {
                          badgeBg = "bg-teal-600 hover:bg-teal-700 text-white";
                          label = "Confirmed";
                        } else if (appStatus === "SELECTED") {
                          badgeBg = "bg-emerald-600 hover:bg-emerald-700 text-white";
                          label = "Selected";
                        } else if (appStatus === "ATTENDED") {
                          badgeBg = "bg-blue-600 hover:bg-blue-700 text-white";
                          label = "Attended";
                        } else if (appStatus === "UNDER_REVIEW") {
                          badgeBg = "bg-amber-600 hover:bg-amber-700 text-white";
                          label = "Under Review";
                        } else if (appStatus === "ON_HOLD") {
                          badgeBg = "bg-amber-600 hover:bg-amber-700 text-white";
                          label = "On Hold";
                        } else if (appStatus === "REJECTED" || appStatus === "NOT_SELECTED") {
                          badgeBg = "bg-rose-600 hover:bg-rose-700 text-white";
                          label = "Not Selected";
                        }

                        return (
                          <Link
                            href={`/events/${event.id}`}
                            className={`text-xs font-extrabold px-4 py-2.5 rounded-xl ${badgeBg} transition shadow-sm flex items-center space-x-1.5`}
                            title={`Your current status: ${appStatus}`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>✓ {label}</span>
                          </Link>
                        );
                      }

                      return (
                        <Link
                          href={`/events/${event.id}`}
                          className={`text-xs font-extrabold px-4 py-2.5 rounded-xl transition flex items-center space-x-1.5 ${
                            isOpen
                              ? "bg-red-600 hover:bg-red-700 text-white shadow-sm"
                              : "bg-slate-200 text-slate-500 hover:bg-slate-300"
                          }`}
                        >
                          <span>{isOpen ? "Apply Now" : isCompleted ? "Event Concluded" : "View Details"}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <EventAssistantChatbot eventName="Upcoming Topline Events" />
      <Footer />
    </div>
  );
}
