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
    <div className="flex flex-col min-h-screen bg-[#f8fafc] text-slate-700 relative grid-bg overflow-hidden">
      {/* Decorative Blur Blobs */}
      <div className="absolute top-[10%] right-[-10%] w-[35vw] h-[35vw] bg-red-600/5 rounded-full floating-blob -z-10 pointer-events-none"></div>
      <div className="absolute top-[50%] left-[-10%] w-[35vw] h-[35vw] bg-red-600/5 rounded-full floating-blob -z-10 pointer-events-none"></div>

      <Navbar />
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-slate-900 uppercase tracking-wider">
            Upcoming Events
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
              className="bg-[#161822] border border-gray-800 rounded px-4 py-2 text-white focus:outline-none focus:border-red-600 text-sm md:w-64"
            />
            <button
              type="submit"
              className="bg-red-600 hover:bg-red-700 text-black px-4 py-2 rounded text-sm font-bold transition"
            >
              Filter
            </button>
          </form>
          <div className="flex gap-2">
            <Link
              href="/opportunities"
              className={`px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition ${
                !searchParams.status
                  ? "bg-red-600 text-black"
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
                  ? "bg-red-700 text-white"
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

              let statusBadgeColor = "bg-slate-100 text-slate-500 border-slate-200";
              if (isOpen) statusBadgeColor = "bg-emerald-50 text-emerald-700 border-emerald-250";
              if (isFull) statusBadgeColor = "bg-red-50 text-red-800 border-red-200";
              if (isClosed) statusBadgeColor = "bg-red-50 text-red-700 border-red-250";

              return (
                <div
                  key={event._id.toString()}
                  className="light-panel rounded-2xl overflow-hidden flex flex-col justify-between"
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-extrabold px-3 py-1 rounded-full border uppercase tracking-widest ${statusBadgeColor}`}>
                        {event.status}
                      </span>
                      <span className="text-xs text-slate-500 uppercase font-semibold">
                        {event.workType}
                      </span>
                    </div>

                    <h3 className="mt-4 text-xl font-bold text-slate-900 hover:text-red-700 transition duration-300">
                      <Link href={`/events/${event._id}`}>{event.name}</Link>
                    </h3>

                    <div className="mt-6 space-y-3.5 text-sm text-slate-600">
                      <div className="flex items-center space-x-2.5">
                        <Calendar className="w-4 h-4 text-red-700" />
                        <span>Date: {new Date(event.date).toLocaleDateString("en-GB")}</span>
                      </div>
                      <div className="flex items-center space-x-2.5">
                        <MapPin className="w-4 h-4 text-red-700" />
                        <span className="truncate">Location: {event.location}</span>
                      </div>
                      <div className="flex items-center space-x-2.5">
                        <Clock className="w-4 h-4 text-red-700" />
                        <span>Reporting: {event.reportingTime}</span>
                      </div>
                      <div className="flex items-center space-x-2.5">
                        <Users className="w-4 h-4 text-red-700" />
                        <span>Required: {event.workersRequired} candidates</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50/50 px-6 py-5 flex items-center justify-between border-t border-slate-100">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">Payment</p>
                      <p className="text-xl font-extrabold text-red-700">₹{event.paymentPerStudent}</p>
                    </div>

                    <Link
                      href={`/events/${event._id}`}
                      className={`text-xs font-bold px-4 py-2.5 rounded-lg transition duration-300 flex items-center space-x-1.5 ${
                        isOpen
                          ? "bg-red-600 hover:bg-red-700 text-black shadow-sm"
                          : "bg-slate-100 border border-slate-200 text-slate-400 hover:bg-slate-200"
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
