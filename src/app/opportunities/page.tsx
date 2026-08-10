import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { connectToDatabase } from "@/lib/db";
import { Event } from "@/models";
import { Calendar, MapPin, Clock, Users, ArrowRight } from "lucide-react";

export const revalidate = 0; // Disable static cache for live availability updates

export default async function OpportunitiesPage(props: {
  searchParams: Promise<{ status?: string; search?: string }>;
}) {
  const searchParams = await props.searchParams;
  let events: any[] = [];

  try {
    await connectToDatabase();
    const query: any = { visibility: "VISIBLE", status: { $ne: "ARCHIVED" } };

    if (searchParams.status) {
      query.status = searchParams.status;
    }
    if (searchParams.search) {
      query.$or = [
        { name: { $regex: searchParams.search, $options: "i" } },
        { location: { $regex: searchParams.search, $options: "i" } },
        { workType: { $regex: searchParams.search, $options: "i" } },
      ];
    }

    events = await Event.find(query).sort({ date: 1 }).lean();
  } catch (error) {
    console.error("Failed to load events", error);
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#07080b] text-white">
      <Navbar />
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-amber-500 uppercase tracking-wider">
            Hospitality Opportunities
          </h1>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-[#0c0d12] p-4 rounded-xl border border-gray-800 mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
          <form className="w-full md:w-auto flex flex-col md:flex-row gap-3">
            <input
              type="text"
              name="search"
              defaultValue={searchParams.search || ""}
              placeholder="Search by name/location..."
              className="bg-[#161822] border border-gray-800 rounded px-4 py-2 text-white focus:outline-none focus:border-amber-500 text-sm md:w-64"
            />
            <button
              type="submit"
              className="bg-amber-500 hover:bg-amber-600 text-black px-4 py-2 rounded text-sm font-bold transition"
            >
              Filter
            </button>
          </form>
          <div className="flex gap-2">
            <Link
              href="/opportunities"
              className={`px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition ${
                !searchParams.status
                  ? "bg-amber-500 text-black"
                  : "bg-gray-800 text-gray-400 hover:text-white"
              }`}
            >
              All
            </Link>
            <Link
              href="/opportunities?status=OPEN"
              className={`px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition ${
                searchParams.status === "OPEN"
                  ? "bg-emerald-500 text-black"
                  : "bg-gray-800 text-gray-400 hover:text-white"
              }`}
            >
              Open
            </Link>
            <Link
              href="/opportunities?status=FULL"
              className={`px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition ${
                searchParams.status === "FULL"
                  ? "bg-amber-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-white"
              }`}
            >
              Full
            </Link>
          </div>
        </div>

        {/* Event List */}
        {events.length === 0 ? (
          <div className="text-center py-16 bg-[#0c0d12] rounded-xl border border-gray-800">
            <p className="text-gray-400 text-lg">No matches found for your filter criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map((event: any) => {
              const isOpen = event.status === "OPEN";
              const isFull = event.status === "FULL";
              const isClosed = event.status === "CLOSED" || event.status === "COMPLETED";

              let statusBadgeColor = "bg-gray-800 text-gray-400 border-gray-700";
              if (isOpen) statusBadgeColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
              if (isFull) statusBadgeColor = "bg-amber-500/10 text-amber-500 border-amber-500/20";
              if (isClosed) statusBadgeColor = "bg-rose-500/10 text-rose-400 border-rose-500/20";

              return (
                <div
                  key={event._id.toString()}
                  className="glass-panel rounded-2xl hover-glow overflow-hidden flex flex-col justify-between"
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-extrabold px-3 py-1 rounded-full border uppercase tracking-widest ${statusBadgeColor}`}>
                        {event.status}
                      </span>
                      <span className="text-xs text-gray-500 uppercase font-semibold">
                        {event.workType}
                      </span>
                    </div>

                    <h3 className="mt-4 text-xl font-bold text-white hover:text-amber-500 transition duration-300">
                      <Link href={`/events/${event._id}`}>{event.name}</Link>
                    </h3>

                    <div className="mt-6 space-y-3.5 text-sm text-gray-300">
                      <div className="flex items-center space-x-2.5">
                        <Calendar className="w-4 h-4 text-amber-500/80" />
                        <span>Date: {new Date(event.date).toLocaleDateString("en-GB")}</span>
                      </div>
                      <div className="flex items-center space-x-2.5">
                        <MapPin className="w-4 h-4 text-amber-500/80" />
                        <span className="truncate">Location: {event.location}</span>
                      </div>
                      <div className="flex items-center space-x-2.5">
                        <Clock className="w-4 h-4 text-amber-500/80" />
                        <span>Reporting: {event.reportingTime}</span>
                      </div>
                      <div className="flex items-center space-x-2.5">
                        <Users className="w-4 h-4 text-amber-500/80" />
                        <span>Required: {event.workersRequired} candidates</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/[0.01] px-6 py-5 flex items-center justify-between border-t border-white/[0.04]">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider">Payment</p>
                      <p className="text-xl font-extrabold text-amber-500">₹{event.paymentPerStudent}</p>
                    </div>

                    <Link
                      href={`/events/${event._id}`}
                      className={`text-xs font-bold px-4 py-2.5 rounded-lg transition duration-300 flex items-center space-x-1.5 ${
                        isOpen
                          ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-lg shadow-amber-500/5 hover:shadow-amber-500/15"
                          : "bg-white/[0.02] border border-white/[0.04] text-gray-400 hover:bg-white/[0.04] hover:text-white"
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
      </main>
      <Footer />
    </div>
  );
}
