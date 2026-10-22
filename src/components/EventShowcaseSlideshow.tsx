"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, Sparkles, ShieldCheck, Award } from "lucide-react";

interface ShowcaseSlide {
  id: string;
  imageUrl: string;
  title: string;
  tag: string;
  desc: string;
  location: string;
}

const showcaseSlides: ShowcaseSlide[] = [
  {
    id: "wedding",
    imageUrl: "/images/showcase/indian-wedding-catering.jpg",
    title: "Grand Indian Wedding Banquet & Dining Service",
    tag: "Wedding Catering",
    desc: "Pre-screened, well-groomed banquet stewards in traditional vests serving dinner tables at high-profile wedding receptions.",
    location: "Punjab Banquet Venues & Luxury Resorts",
  },
  {
    id: "stewards",
    imageUrl: "/images/showcase/banquet-stewards-service.jpg",
    title: "Luxury Banquet Stewards & Wine Service",
    tag: "Banquet Stewards",
    desc: "Uniformed food & beverage service crew carrying wine, cocktail trays, and hot appetizers in five-star hotel ballrooms.",
    location: "Grand Ballrooms & Luxury Hotel Venues",
  },
  {
    id: "finedining",
    imageUrl: "/images/showcase/vip-fine-dining-service.jpg",
    title: "VIP Fine Dining & Silver Cloche Table Service",
    tag: "Fine Dining Etiquette",
    desc: "Impeccably dressed servers delivering silver-platter service with strict etiquette and formal hospitality standards.",
    location: "VIP Gala Dinners & Five-Star Hospitality",
  },
  {
    id: "catering",
    imageUrl: "/images/showcase/catering-banquet-setup.jpg",
    title: "Banquet Hall Table Coordination & Buffet Prep",
    tag: "Catering Setup",
    desc: "Hands-on student crews assisting event managers with table layouts, floral arrangement placement, and buffet coordination.",
    location: "Banquet Halls & Event Setup Lines",
  },
  {
    id: "corporate",
    imageUrl: "/images/showcase/corporate-gala-staff.png",
    title: "Corporate Gala Reception & Pass-Around Staff",
    tag: "Corporate Staffing",
    desc: "Coordinated hospitality teams managing tray-passed appetizers, beverage stations, and guest assistance at large-scale conventions.",
    location: "Corporate Galas & High-Capacity Events",
  },
];

export default function EventShowcaseSlideshow() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const nextSlide = useCallback(() => {
    setCurrentIdx((prev) => (prev + 1) % showcaseSlides.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentIdx((prev) => (prev - 1 + showcaseSlides.length) % showcaseSlides.length);
  }, []);

  // Auto-play timer
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(nextSlide, 5000);
    return () => clearInterval(interval);
  }, [isPaused, nextSlide]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 50) nextSlide();
    if (diff < -50) prevSlide();
    touchStartX.current = null;
  };

  const activeSlide = showcaseSlides[currentIdx];

  return (
    <section className="py-10 sm:py-16 md:py-20 bg-slate-50/70 border-t border-slate-200/80 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-red-50 text-red-600 border border-red-200 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Hospitality In Action</span>
              </span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight mt-2">
              Event Operations &amp; Catering Showcase
            </h2>
            <p className="text-xs sm:text-base text-slate-600 mt-1 max-w-xl">
              A look at our pre-screened university student workforces delivering banquet and catering excellence.
            </p>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <button
              onClick={prevSlide}
              aria-label="Previous Slide"
              className="w-10 h-10 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center transition shadow-2xs active:scale-95 cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextSlide}
              aria-label="Next Slide"
              className="w-10 h-10 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center transition shadow-2xs active:scale-95 cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Slideshow Container */}
        <div
          className="relative rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-xl group aspect-[16/10] sm:aspect-[21/10] max-h-[580px]"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Images */}
          {showcaseSlides.map((slide, idx) => (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                idx === currentIdx ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
              }`}
            >
              <img
                src={slide.imageUrl}
                alt={slide.title}
                className="w-full h-full object-cover object-center transform scale-100 group-hover:scale-105 transition-transform duration-[6000ms]"
              />
              {/* Vignette Gradients */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/60 via-transparent to-transparent hidden sm:block" />
            </div>
          ))}

          {/* Slide Content Overlay */}
          <div className="absolute bottom-0 inset-x-0 p-5 sm:p-8 md:p-10 z-20 flex flex-col justify-end text-white space-y-2 sm:space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-red-600 text-white text-[10px] sm:text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-md">
                {activeSlide.tag}
              </span>
              <span className="bg-black/50 backdrop-blur-md text-slate-200 text-[10px] sm:text-xs font-semibold px-3 py-1 rounded-full border border-white/10 hidden sm:inline-flex items-center gap-1">
                <Award className="w-3 h-3 text-amber-400" />
                <span>{activeSlide.location}</span>
              </span>
            </div>

            <h3 className="text-lg sm:text-2xl md:text-3xl font-black text-white tracking-tight drop-shadow-md">
              {activeSlide.title}
            </h3>

            <p className="text-slate-200 text-xs sm:text-sm md:text-base max-w-2xl leading-relaxed drop-shadow line-clamp-2 sm:line-clamp-none">
              {activeSlide.desc}
            </p>

            {/* Bottom Indicators */}
            <div className="pt-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {showcaseSlides.map((_, dotIdx) => (
                  <button
                    key={dotIdx}
                    onClick={() => setCurrentIdx(dotIdx)}
                    aria-label={`Go to slide ${dotIdx + 1}`}
                    className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                      dotIdx === currentIdx
                        ? "w-8 bg-red-600"
                        : "w-2 bg-white/40 hover:bg-white/70"
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-white/70 font-mono">
                {currentIdx + 1} / {showcaseSlides.length}
              </span>
            </div>
          </div>
        </div>

        {/* Thumbnail Selector Pills (Desktop & Tablet) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
          {showcaseSlides.map((slide, idx) => {
            const isActive = idx === currentIdx;
            return (
              <button
                key={slide.id}
                onClick={() => setCurrentIdx(idx)}
                className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
                  isActive
                    ? "bg-white border-red-500 shadow-md ring-2 ring-red-500/10"
                    : "bg-white/70 hover:bg-white border-slate-200 text-slate-600 hover:border-slate-300 shadow-2xs"
                }`}
              >
                <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-slate-200">
                  <img src={slide.imageUrl} alt={slide.tag} className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-[10px] font-extrabold uppercase tracking-wider truncate ${isActive ? "text-red-600" : "text-slate-400"}`}>
                    {slide.tag}
                  </p>
                  <p className={`text-xs font-bold truncate ${isActive ? "text-slate-900" : "text-slate-700"}`}>
                    {slide.title.split("&")[0]}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
