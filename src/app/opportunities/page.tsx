import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { getStudentProfileCompletion } from "@/lib/profile-completion";
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Lock,
  Sparkles,
  Search,
  SlidersHorizontal
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
      status: searchParams.status ? searchParams.status : { not: "ARCHIVED" },
    };

    if (searchParams.search) {
      const search = searchParams.search.trim();
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { location: { contains: search, mode: "insensitive" } },
        { workType: { contains: search, mode: "insensitive" } },
      ];
    }

    events = await prisma.event.findMany({
      where: whereClause,
      orderBy: { date: "asc" },
    });
  } catch (error) {
    console.error("Failed to load events", error);
  }

  const allMissing = [...profileCompletion.missingFields, ...profileCompletion.missingPhotos];

  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc] text-slate-700 relative grid-bg overflow-hidden">
      {/* Decorative Blur Blobs */}
      <div className="absolute top-[10%] right-[-10%] w-[35vw] h-[35vw] bg-red-600/5 rounded-full floating-blob -z-10 pointer-events-none"></div>
      <div className="absolute top-[50%] left-[-10%] w-[35vw] h-[35vw] bg-red-600/5 rounded-full floating-blob -z-10 pointer-events-none"></div>

      <Navbar />
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full space-y-8">
        {/* Page Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-red-600" />
            Topline Catering Assignments
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 uppercase tracking-wider">
            Available Gigs & Events
          </h1>
          <p className="text-sm text-slate-500 max-w-2xl mx-auto">
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

          <div className="flex gap-2">
            <Link
              href="/opportunities"
              className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
                !searchParams.status
                  ? "bg-red-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Events
            </Link>
            <Link
              href="/opportunities?status=OPEN"
              className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
                searchParams.status === "OPEN"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Open Only
            </Link>
            <Link
              href="/opportunities?status=FULL"
              className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
                searchParams.status === "FULL"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Full
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

              let statusBadgeColor = "bg-slate-100 text-slate-700 border-slate-200";
              if (isOpen) statusBadgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
              if (isFull) statusBadgeColor = "bg-amber-50 text-amber-700 border-amber-200";
              if (isScheduled) statusBadgeColor = "bg-purple-50 text-purple-700 border-purple-200";

              return (
                <div
                  key={event.id}
                  className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[11px] font-extrabold px-3 py-1 rounded-full border uppercase tracking-wider ${statusBadgeColor}`}>
                          {isScheduled ? "⏰ Scheduled" : event.status}
                        </span>
                        {event.allowedGender === "FEMALE_ONLY" && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 border border-pink-200 uppercase">
                            👩 Female Only
                          </span>
                        )}
                        {event.allowedGender === "MALE_ONLY" && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                            👨 Male Only
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
                          if (isScheduled && event.scheduledPublishAt) {
                            return (
                              <span className="font-bold text-purple-700">
                                ⏰ Opens: {new Date(event.scheduledPublishAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} at {new Date(event.scheduledPublishAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true })}
                              </span>
                            );
                          }
                          const remainingSlots = Math.max(0, (event.workersRequired || event.maxApplications) - event.applicationsCount);
                          if (remainingSlots <= 0 || event.status === "FULL" || event.status === "CLOSED" || event.status === "COMPLETED") {
                            return <span className="font-extrabold text-red-600 uppercase">Applications Full</span>;
                          }
                          if (remainingSlots <= 5) {
                            return (
                              <span className="font-extrabold text-amber-600 flex items-center gap-1">
                                🔥 Hurry! Only {remainingSlots} {remainingSlots === 1 ? "slot" : "slots"} left
                              </span>
                            );
                          }
                          return <span className="font-semibold text-emerald-600">🟢 Hiring Active • Slots Open</span>;
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
                          <span>{isOpen ? "Apply Now" : "View Details"}</span>
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
      <Footer />
    </div>
  );
}
