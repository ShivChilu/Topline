"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface HeroSlideshowProps {
  headline: string;
  subheadline: string;
  children?: React.ReactNode;
}

export default function HeroSlideshow({ headline, subheadline, children }: HeroSlideshowProps) {
  const images = [
    "/images/hero/hospitality-01.jpg",
    "/images/hero/hospitality-02.jpg",
    "/images/hero/hospitality-03.jpg",
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 6000); // Transition every 6 seconds

    return () => clearInterval(timer);
  }, [images.length]);

  const handlePrev = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
  };

  return (
    <section className="relative min-h-[600px] md:min-h-[700px] w-full flex items-center justify-center overflow-hidden py-24 border-b border-slate-100">
      {/* Background Images with transitions */}
      {images.map((src, idx) => (
        <div
          key={src}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            idx === currentIndex ? "opacity-100 z-0" : "opacity-0 -z-10"
          }`}
        >
          <img
            src={src}
            alt={`TOPLINE Hospitality Service - Slide ${idx + 1}`}
            className="w-full h-full object-cover transform scale-105 transition-transform duration-[6000ms]"
          />
        </div>
      ))}

      {/* Hero Content Layer */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
        <div className="bg-white/95 backdrop-blur-md p-8 sm:p-12 md:p-14 rounded-3xl shadow-xl border border-slate-200/50 text-center">
          <span className="inline-flex items-center text-amber-700 font-extrabold tracking-widest text-xs uppercase bg-amber-500/10 px-4 py-2 rounded-full border border-amber-500/20 mb-2">
            TOPLINE Staffing Solutions
          </span>
          <h1 className="mt-4 text-3xl sm:text-4xl md:text-5xl font-display font-extrabold tracking-tight leading-tight text-slate-900">
            {headline}
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto font-sans font-normal leading-relaxed">
            {subheadline}
          </p>
          <div className="mt-8 relative z-30">
            {children}
          </div>
        </div>
      </div>

      {/* Slider Controls */}
      <button
        onClick={handlePrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-30 bg-white/40 hover:bg-white text-slate-800 p-2 rounded-full border border-slate-200/50 shadow-sm transition hover:scale-105 hidden sm:block"
        aria-label="Previous slide"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>
      <button
        onClick={handleNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-30 bg-white/40 hover:bg-white text-slate-800 p-2 rounded-full border border-slate-200/50 shadow-sm transition hover:scale-105 hidden sm:block"
        aria-label="Next slide"
      >
        <ArrowRight className="w-5 h-5" />
      </button>

      {/* Slide Indicators */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex space-x-2">
        {images.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
              idx === currentIndex ? "bg-amber-600 w-6" : "bg-slate-400/50 hover:bg-slate-500"
            }`}
            aria-label={`Go to slide ${idx + 1}`}
          ></button>
        ))}
      </div>
    </section>
  );
}
