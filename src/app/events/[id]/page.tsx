import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { connectToDatabase } from "@/lib/db";
import { Event } from "@/models";
import EventApplicationForm from "@/components/EventApplicationForm";
import { Calendar, MapPin, Clock, ShieldCheck, Users, Banknote } from "lucide-react";
import { notFound } from "next/navigation";

export const revalidate = 0; // Live check for status changes

export default async function EventDetailsPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  let event = null;

  try {
    await connectToDatabase();
    event = await Event.findById(params.id).lean();
  } catch (error) {
    console.error("Error loading event details:", error);
  }

  if (!event || event.visibility === "HIDDEN") {
    notFound();
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#07080b] text-white">
      <Navbar />
      <main className="flex-grow max-w-6xl mx-auto px-4 py-16 w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Event details */}
        <div className="lg:col-span-2 space-y-8">
          <div>
            <span className="bg-amber-500/10 text-amber-500 text-xs font-bold px-3 py-1.5 rounded border border-amber-500/20 uppercase tracking-widest">
              {event.workType}
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white mt-4 uppercase tracking-wider">
              {event.name}
            </h1>
            <p className="text-gray-400 mt-4 text-base leading-relaxed">{event.description}</p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-[#0c0d12] p-4 rounded-xl border border-gray-800">
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold">Payment Rate</p>
              <div className="flex items-center space-x-1 mt-1">
                <Banknote className="w-4 h-4 text-amber-500" />
                <span className="font-bold text-amber-500">₹{event.paymentPerStudent}</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold">Required Staff</p>
              <div className="flex items-center space-x-1 mt-1">
                <Users className="w-4 h-4 text-amber-500" />
                <span className="font-bold">{event.workersRequired} Slots</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold">Reporting Time</p>
              <div className="flex items-center space-x-1 mt-1">
                <Clock className="w-4 h-4 text-amber-500" />
                <span className="font-bold">{event.reportingTime}</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold">Availability</p>
              <div className="flex items-center mt-1">
                {(() => {
                  const remaining = event.maxApplications - event.applicationsCount;
                  if (remaining <= 0) {
                    return <span className="font-bold text-rose-500 uppercase text-xs tracking-wider">Full</span>;
                  }
                  if (remaining <= 2) {
                    return <span className="font-bold text-rose-500">{remaining} slots left</span>;
                  }
                  if (remaining <= 4) {
                    return <span className="font-bold text-amber-500">{remaining} slots left</span>;
                  }
                  if (remaining === 5) {
                    return <span className="font-bold text-emerald-400">5 slots left</span>;
                  }
                  return <span className="font-bold text-emerald-400">Slots Available</span>;
                })()}
              </div>
            </div>
          </div>

          {/* Location & Times Details */}
          <div className="space-y-4 bg-[#0c0d12]/40 p-6 rounded-xl border border-gray-800">
            <h3 className="text-lg font-bold text-white uppercase tracking-wide">Venue & Schedule</h3>
            <div className="space-y-3 text-gray-300 text-sm">
              <div className="flex items-start space-x-3">
                <Calendar className="w-5 h-5 text-amber-500 mt-0.5" />
                <div>
                  <span className="font-semibold text-white">Event Date:</span>{" "}
                  {new Date(event.date).toLocaleDateString("en-GB", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-amber-500 mt-0.5" />
                <div>
                  <span className="font-semibold text-white">Location Address:</span> {event.location}
                  {event.googleMapsUrl && (
                    <a
                      href={event.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-amber-500 hover:underline mt-1 text-xs"
                    >
                      Open Google Maps Location Link
                    </a>
                  )}
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Clock className="w-5 h-5 text-amber-500 mt-0.5" />
                <div>
                  <span className="font-semibold text-white">Duty Hours:</span> {event.startTime} to {event.endTime}
                </div>
              </div>
            </div>
          </div>

          {/* Uniform and Dress code */}
          {event.dressCode && (
            <div className="bg-[#0c0d12]/40 p-6 rounded-xl border border-gray-800">
              <h3 className="text-lg font-bold text-white uppercase tracking-wide mb-2 flex items-center space-x-2">
                <ShieldCheck className="text-amber-500 w-5 h-5" />
                <span>Required Dress Code & Uniform</span>
              </h3>
              <p className="text-gray-300 text-sm">{event.dressCode}</p>
            </div>
          )}

          {/* Do's & Don'ts */}
          {event.dosAndDonts && event.dosAndDonts.length > 0 && (
            <div className="bg-[#0c0d12]/40 p-6 rounded-xl border border-gray-800">
              <h3 className="text-lg font-bold text-white uppercase tracking-wide mb-4">Event Rules & Instructions</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                {event.dosAndDonts.map((instruction: string, idx: number) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <span className="text-amber-500">•</span>
                    <span>{instruction}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right Column: Application form */}
        <div className="space-y-6">
          <div className="sticky top-24">
            <EventApplicationForm
              eventId={event._id.toString()}
              customFields={JSON.parse(JSON.stringify(event.customFormFields))}
              status={event.status}
            />
          </div>
        </div>

      </main>
      <Footer />
    </div>
  );
}
