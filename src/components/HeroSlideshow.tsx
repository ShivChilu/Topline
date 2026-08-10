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
  const slides = [
    {
      desktop: "/images/hero/hospitality-02.jpg",
      mobile: "/images/hero/hospitality-02-mobile.jpg",
    },
    {
      desktop: "/images/hero/hospitality-03.jpg",
      mobile: "/images/hero/hospitality-03-mobile.jpg",
    },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length);
    }, 6000); // Transition every 6 seconds

    return () => clearInterval(timer);
  }, [slides.length]);

  const handlePrev = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + slides.length) % slides.length);
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length);
  };

  return (
    <section className="relative min-h-[calc(100svh-64px)] md:min-h-[700px] w-full flex items-center justify-center overflow-hidden py-10 md:py-24 border-b border-slate-100">
      {/* Background Images with transitions */}
      {slides.map((slide, idx) => (
        <div
          key={slide.desktop}
          className={`absolute inset-0 bg-[#0c0d12] transition-opacity duration-1000 ease-in-out ${
            idx === currentIndex ? "opacity-100 z-0" : "opacity-0 -z-10"
          }`}
        >
          <picture>
            <source
              media="(max-width: 767px)"
              srcSet={slide.mobile}
            />
            <img
              src={slide.desktop}
              alt={`TOPLINE Hospitality Service - Slide ${idx + 1}`}
              className="w-full h-full object-cover transform scale-105 transition-transform duration-[6000ms]"
            />
          </picture>
        </div>
      ))}

      {/* Hero Content Layer */}
      <div className="w-full max-w-4xl mx-auto px-3.5 sm:px-6 lg:px-8 relative z-20 box-border">
        <div className="bg-white/40 backdrop-blur-md p-6 sm:p-12 md:p-14 rounded-3xl shadow-xl border border-slate-200/50 text-center w-full max-w-[calc(100%-28px)] mx-auto box-border">
          <span className="inline-flex items-center text-red-805 font-extrabold tracking-widest text-[11px] sm:text-xs uppercase bg-red-600/10 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full border border-red-600/20 mb-2">
            TOPLINE Staffing Solutions
          </span>
          <h1 className="mt-4 text-[clamp(28px,8vw,38px)] sm:text-4xl md:text-5xl font-display font-extrabold tracking-tight leading-tight text-slate-900">
            {headline}
          </h1>
          <p className="mt-4 text-[15px] sm:text-base md:text-lg text-slate-650 max-w-2xl mx-auto font-sans font-normal leading-relaxed">
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
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
              idx === currentIndex ? "bg-red-700 w-6" : "bg-slate-400/50 hover:bg-slate-500"
            }`}
            aria-label={`Go to slide ${idx + 1}`}
          ></button>
        ))}
      </div>
    </section>
  );
}
