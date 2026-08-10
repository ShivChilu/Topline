import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { connectToDatabase } from "@/lib/db";
import { Event } from "@/models";
import EventApplicationForm from "@/components/EventApplicationForm";
import { Calendar, MapPin, Clock, ShieldCheck, Users, Banknote } from "lucide-react";
import { notFound } from "next/navigation";

export const revalidate = 0; // Live check for status changes

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
    <div className="flex flex-col min-h-screen bg-[#f8fafc] text-slate-700 relative grid-bg overflow-hidden">
      {/* Decorative Blur Blobs */}
      <div className="absolute top-[10%] left-[-10%] w-[35vw] h-[35vw] bg-red-600/5 rounded-full floating-blob -z-10 pointer-events-none"></div>
      <div className="absolute top-[50%] right-[-10%] w-[35vw] h-[35vw] bg-red-600/5 rounded-full floating-blob -z-10 pointer-events-none"></div>

      <Navbar />
      <main className="flex-grow max-w-6xl mx-auto px-4 py-16 w-full grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        
        {/* Left Column: Event details */}
        <div className="lg:col-span-2 space-y-8">
          <div>
            <span className="bg-red-600/10 text-red-600 text-xs font-bold px-3 py-1.5 rounded-full border border-red-600/20 uppercase tracking-widest">
              {event.workType}
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-4 uppercase tracking-wider">
              {event.name}
            </h1>
            <p className="text-slate-600 mt-4 text-base leading-relaxed">{event.description}</p>
          </div>

          {/* Quick Metrics */}
          <div className="light-panel rounded-2xl p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-slate-500 uppercase font-semibold">Payment Rate</p>
              <div className="flex items-center space-x-1 mt-1">
                <Banknote className="w-4 h-4 text-red-600" />
                <span className="font-bold text-red-600">₹{event.paymentPerStudent}</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-semibold">Reporting Time</p>
              <div className="flex items-center space-x-1 mt-1">
                <Clock className="w-4 h-4 text-red-600" />
                <span className="font-bold text-slate-800">{formatTime12(event.reportingTime)}</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-semibold">Availability</p>
              <div className="flex items-center mt-1">
                {(() => {
                  const remainingSlots = event.workersRequired - event.applicationsCount;
                  if (remainingSlots <= 0 || event.status === "FULL" || event.status === "CLOSED" || event.status === "COMPLETED") {
                    return <span className="font-extrabold text-[#ED0000] uppercase text-xs tracking-wider">FULL</span>;
                  }
                  if (remainingSlots >= 1 && remainingSlots <= 4) {
                    return (
                      <span className="font-extrabold text-[#ED0000] text-xs uppercase tracking-wider flex items-center space-x-1">
                        <span>🔥 {remainingSlots} {remainingSlots === 1 ? "Slot" : "Slots"} Left — Hurry!</span>
                      </span>
                    );
                  }
                  return <span className="font-bold text-emerald-400 text-xs uppercase tracking-wider">Slots Available</span>;
                })()}
              </div>
            </div>
          </div>

          {/* Location & Times Details */}
          <div className="space-y-4 light-panel p-6 rounded-2xl">
            <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wide">Venue & Schedule</h3>
            <div className="space-y-3 text-slate-600 text-sm">
              <div className="flex items-start space-x-3">
                <Calendar className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-800">Event Date:</span>{" "}
                  {new Date(event.date).toLocaleDateString("en-GB", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-800">Location Address:</span> {event.location}
                  {event.googleMapsUrl && (
                    <a
                      href={event.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-red-650 hover:underline mt-1 text-xs"
                    >
                      Open Google Maps Location Link
                    </a>
                  )}
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Clock className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-800">Duty Hours:</span> {formatTime12(event.startTime)} to {formatTime12(event.endTime)}
                </div>
              </div>
            </div>
          </div>

          {/* Uniform and Dress code */}
          {event.dressCode && (
            <div className="light-panel p-6 rounded-2xl">
              <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wide mb-2 flex items-center space-x-2">
                <ShieldCheck className="text-red-600 w-5 h-5" />
                <span>Required Dress Code & Uniform</span>
              </h3>
              <p className="text-slate-650 text-sm leading-relaxed">{event.dressCode}</p>
            </div>
          )}

          {/* Do's & Don'ts */}
          {event.dosAndDonts && event.dosAndDonts.length > 0 && (
            <div className="light-panel p-6 rounded-2xl">
              <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wide mb-4">Event Rules & Instructions</h3>
              <ul className="space-y-2 text-sm text-slate-650">
                {event.dosAndDonts.map((instruction: string, idx: number) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <span className="text-red-600">•</span>
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
            {(() => {
              const remainingSlots = event.workersRequired - event.applicationsCount;
              const formStatus = (remainingSlots <= 0 || event.status === "FULL" || event.status === "CLOSED" || event.status === "COMPLETED")
                ? "FULL"
                : event.status;
              return (
                <EventApplicationForm
                  eventId={event._id.toString()}
                  customFields={JSON.parse(JSON.stringify(event.customFormFields))}
                  status={formStatus}
                />
              );
            })()}
          </div>
        </div>

      </main>
      <Footer />
    </div>
  );
}
