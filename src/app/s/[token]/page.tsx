"use client";

import React, { use, useEffect, useState, useMemo } from "react";
import {
  Users,
  Calendar,
  MapPin,
  Clock,
  Search,
  Filter,
  User,
  ShieldCheck,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  Info,
  Sparkles,
  Phone,
  GraduationCap,
  Building,
} from "lucide-react";

interface CandidatePhoto {
  id: string;
  url: string;
  type: string;
  isPrimary: boolean;
}

interface Candidate {
  id: string;
  serialNumber: number;
  name?: string;
  height?: string;
  gender?: string;
  age?: number;
  university?: string;
  city?: string;
  course?: string;
  year?: string;
  phone?: string;
  primaryPhotoUrl?: string;
  photos?: CandidatePhoto[];
}

interface ShowcaseEvent {
  title: string;
  date: string;
  location: string;
  reportingTime: string;
  workType?: string;
  dressCode?: string;
  customNotes?: string;
  visibleFields: string[];
  totalCrew: number;
}

export default function ClientShowcasePage(props: { params: Promise<{ token: string }> }) {
  const params = use(props.params);
  const token = params.token;

  const [event, setEvent] = useState<ShowcaseEvent | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState<"ALL" | "MALE" | "FEMALE">("ALL");
  const [sortBy, setSortBy] = useState<"name" | "height_desc" | "height_asc">("name");

  // Lightbox Modal
  const [activeCandidateForPhotos, setActiveCandidateForPhotos] = useState<Candidate | null>(null);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  useEffect(() => {
    async function loadShowcase() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/client-showcase/${token}`);
        const data = await res.json();

        if (data.success) {
          setEvent(data.event);
          setCandidates(data.candidates || []);
        } else {
          setError(data.message || "This showcase link is invalid or has expired.");
        }
      } catch (err: any) {
        console.error("Failed to load showcase:", err);
        setError("Unable to load candidate showcase. Please check your internet connection.");
      } finally {
        setLoading(false);
      }
    }
    loadShowcase();
  }, [token]);

  // Parse height to numeric cm for proper numerical sorting
  const parseHeightToCm = (hStr?: string | null): number => {
    if (!hStr) return 0;
    const clean = hStr.toLowerCase().trim();
    // Case 1: cm (e.g. "178 cm" or "178cm" or "178")
    const cmMatch = clean.match(/(\d+)\s*cm/);
    if (cmMatch) return parseInt(cmMatch[1], 10);

    // Case 2: Feet & Inches (e.g. 5'11", 5ft 11in, 5.11)
    const ftInMatch = clean.match(/(\d+)\s*['ft\.]+\s*(\d+)?/);
    if (ftInMatch) {
      const feet = parseInt(ftInMatch[1], 10);
      const inches = ftInMatch[2] ? parseInt(ftInMatch[2], 10) : 0;
      return Math.round(feet * 30.48 + inches * 2.54);
    }

    // Direct number
    const num = parseFloat(clean);
    if (!isNaN(num)) {
      if (num < 10) {
        // Assume e.g. 5.9 or 6.0 feet
        const feet = Math.floor(num);
        const inches = Math.round((num - feet) * 10);
        return Math.round(feet * 30.48 + inches * 2.54);
      }
      return num;
    }
    return 0;
  };

  // Filtered & Sorted Candidates
  const filteredCandidates = useMemo(() => {
    let list = candidates.filter((c) => {
      // Search by name
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatches = c.name?.toLowerCase().includes(q);
        const uniMatches = c.university?.toLowerCase().includes(q);
        const cityMatches = c.city?.toLowerCase().includes(q);
        if (!nameMatches && !uniMatches && !cityMatches) return false;
      }

      // Gender filter
      if (genderFilter !== "ALL") {
        const g = (c.gender || "").toUpperCase();
        if (genderFilter === "MALE" && !g.startsWith("M")) return false;
        if (genderFilter === "FEMALE" && !g.startsWith("F")) return false;
      }

      return true;
    });

    return list.sort((a, b) => {
      if (sortBy === "height_desc") {
        return parseHeightToCm(b.height) - parseHeightToCm(a.height);
      }
      if (sortBy === "height_asc") {
        return parseHeightToCm(a.height) - parseHeightToCm(b.height);
      }
      // Default: Name A-Z
      const nameA = (a.name || "").toLowerCase();
      const nameB = (b.name || "").toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [candidates, searchQuery, genderFilter, sortBy]);

  const openPhotoModal = (candidate: Candidate) => {
    setActiveCandidateForPhotos(candidate);
    setActivePhotoIdx(0);
  };

  const closePhotoModal = () => {
    setActiveCandidateForPhotos(null);
    setActivePhotoIdx(0);
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-lg font-bold tracking-wide">Loading Crew Showcase...</h2>
        <p className="text-xs text-slate-400 mt-1">Fetching candidate profiles and verified photos</p>
      </div>
    );
  }

  // Error / Expired State
  if (error || !event) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mx-auto">
            <X className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-white">Showcase Link Expired</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            {error || "This showcase link is no longer active or access has been reset by the event coordinator."}
          </p>
          <div className="pt-2">
            <span className="text-[11px] font-mono text-slate-500 bg-slate-800/80 px-3 py-1.5 rounded-full inline-block">
              Please contact your event manager for an updated link.
            </span>
          </div>
        </div>
      </div>
    );
  }

  const formattedDate = new Date(event.date).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const visibleFieldsSet = new Set(event.visibleFields);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500 selection:text-black">
      {/* ------------------------------------------------------------- */}
      {/* LUXURY TOP HEADER                                             */}
      {/* ------------------------------------------------------------- */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Verified Crew Showcase
              </span>
              <span className="text-xs text-slate-400">&bull;</span>
              <span className="text-xs font-semibold text-slate-400 font-mono">
                {candidates.length} Staff Selected
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase mt-1">
              {event.title}
            </h1>
          </div>

          {/* Event Quick Specs */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-slate-300">
            <div className="flex items-center gap-1.5 bg-slate-800/60 border border-slate-700/60 px-3 py-1.5 rounded-xl">
              <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{formattedDate}</span>
            </div>
            {event.location && (
              <div className="flex items-center gap-1.5 bg-slate-800/60 border border-slate-700/60 px-3 py-1.5 rounded-xl">
                <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate max-w-[180px]">{event.location}</span>
              </div>
            )}
          </div>
        </div>

        {/* Custom Coordinator Notes Banner (If set) */}
        {event.customNotes && (
          <div className="bg-amber-500/5 border-t border-b border-amber-500/20 px-4 sm:px-6 py-2">
            <div className="max-w-7xl mx-auto flex items-center gap-2 text-xs text-amber-300/90">
              <Info className="w-4 h-4 shrink-0 text-amber-400" />
              <p className="truncate font-medium">{event.customNotes}</p>
            </div>
          </div>
        )}
      </header>

      {/* ------------------------------------------------------------- */}
      {/* FILTER & SEARCH TOOLBAR                                       */}
      {/* ------------------------------------------------------------- */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-2">
        <div className="bg-slate-900/80 border border-slate-800 p-3 sm:p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xl">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate by name..."
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
            />
          </div>

          {/* Controls: Gender Filter & Sorting */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Gender Toggle */}
            {visibleFieldsSet.has("gender") && (
              <div className="bg-slate-950/80 p-0.5 rounded-xl border border-slate-800 flex items-center text-xs">
                <button
                  type="button"
                  onClick={() => setGenderFilter("ALL")}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    genderFilter === "ALL" ? "bg-amber-500 text-black shadow" : "text-slate-400 hover:text-white"
                  }`}
                >
                  All ({candidates.length})
                </button>
                <button
                  type="button"
                  onClick={() => setGenderFilter("MALE")}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    genderFilter === "MALE" ? "bg-amber-500 text-black shadow" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Male ({candidates.filter((c) => (c.gender || "").toUpperCase().startsWith("M")).length})
                </button>
                <button
                  type="button"
                  onClick={() => setGenderFilter("FEMALE")}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    genderFilter === "FEMALE" ? "bg-amber-500 text-black shadow" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Female ({candidates.filter((c) => (c.gender || "").toUpperCase().startsWith("F")).length})
                </button>
              </div>
            )}

            {/* Sort Selector */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-950/80 border border-slate-800 text-slate-200 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
            >
              <option value="name">Sort: Name (A-Z)</option>
              {visibleFieldsSet.has("height") && (
                <>
                  <option value="height_desc">Sort: Tallest First</option>
                  <option value="height_asc">Sort: Shortest First</option>
                </>
              )}
            </select>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* CANDIDATES GRID SHOWCASE                                      */}
      {/* ------------------------------------------------------------- */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {filteredCandidates.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-12 text-center text-slate-400">
            <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-base font-bold text-slate-300">No candidates match your search filter</p>
            <p className="text-xs text-slate-500 mt-1">Try clearing search text or switching gender filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5">
            {filteredCandidates.map((candidate, idx) => {
              const photo = candidate.primaryPhotoUrl;
              const hasMultiplePhotos = (candidate.photos?.length || 0) > 1;

              return (
                <div
                  key={candidate.id}
                  className="group bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/10 flex flex-col justify-between"
                >
                  {/* Photo Container */}
                  <div
                    onClick={() => openPhotoModal(candidate)}
                    className="relative aspect-[3/4] w-full bg-slate-950 overflow-hidden cursor-pointer flex items-center justify-center"
                    title="Click to view full-resolution photo"
                  >
                    {photo ? (
                      <img
                        src={photo}
                        alt={candidate.name || "Candidate"}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-600 p-4">
                        <User className="w-10 h-10" />
                        <span className="text-[10px] font-bold uppercase mt-1">No Photo</span>
                      </div>
                    )}

                    {/* S.No Badge */}
                    <span className="absolute top-2 left-2 bg-black/70 backdrop-blur-md text-white font-mono text-[10px] font-black px-2 py-0.5 rounded-md border border-white/10">
                      #{idx + 1}
                    </span>

                    {/* Expand icon on hover */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 backdrop-blur-md p-1.5 rounded-lg text-white border border-white/10">
                      <Maximize2 className="w-3.5 h-3.5" />
                    </div>

                    {/* Multi-Photo Count Tag */}
                    {hasMultiplePhotos && (
                      <span className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md text-amber-400 text-[10px] font-black px-2 py-0.5 rounded-md border border-amber-500/30">
                        {candidate.photos?.length} Photos
                      </span>
                    )}
                  </div>

                  {/* Candidate Details */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                    <div>
                      {/* Name */}
                      <h3 className="font-extrabold text-sm text-white uppercase tracking-tight leading-tight group-hover:text-amber-400 transition truncate">
                        {candidate.name || "Candidate"}
                      </h3>

                      {/* Primary Attributes: Height & Gender */}
                      <div className="flex items-center gap-1.5 flex-wrap mt-2">
                        {visibleFieldsSet.has("height") && candidate.height && (
                          <span className="inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-black px-2 py-0.5 rounded-md">
                            <span>📏</span>
                            <span>{candidate.height}</span>
                          </span>
                        )}

                        {visibleFieldsSet.has("gender") && candidate.gender && (
                          <span className="inline-flex items-center gap-1 bg-slate-800 text-slate-300 text-[10.5px] font-bold px-2 py-0.5 rounded-md">
                            {candidate.gender}
                          </span>
                        )}

                        {visibleFieldsSet.has("age") && candidate.age && (
                          <span className="inline-flex items-center gap-1 bg-slate-800 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-md">
                            Age: {candidate.age}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Secondary Attributes (College, City, Phone) */}
                    <div className="pt-2 border-t border-slate-800/80 text-[10.5px] text-slate-400 space-y-1">
                      {visibleFieldsSet.has("university") && candidate.university && (
                        <div className="flex items-center gap-1.5 truncate text-slate-400">
                          <GraduationCap className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate">{candidate.university}</span>
                        </div>
                      )}

                      {visibleFieldsSet.has("city") && candidate.city && (
                        <div className="flex items-center gap-1.5 truncate text-slate-400">
                          <Building className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate">{candidate.city}</span>
                        </div>
                      )}

                      {visibleFieldsSet.has("phone") && candidate.phone && (
                        <div className="flex items-center gap-1.5 truncate text-slate-300 font-mono font-medium">
                          <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>{candidate.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ------------------------------------------------------------- */}
      {/* FULL-RESOLUTION PHOTO LIGHTBOX MODAL                         */}
      {/* ------------------------------------------------------------- */}
      {activeCandidateForPhotos && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
          onClick={closePhotoModal}
        >
          <div
            className="relative max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Lightbox Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div>
                <h3 className="font-extrabold text-base text-white uppercase">
                  {activeCandidateForPhotos.name}
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                  {activeCandidateForPhotos.height && (
                    <span>Height: <strong>{activeCandidateForPhotos.height}</strong></span>
                  )}
                  {activeCandidateForPhotos.gender && (
                    <span>&bull; {activeCandidateForPhotos.gender}</span>
                  )}
                  {activeCandidateForPhotos.university && (
                    <span>&bull; {activeCandidateForPhotos.university}</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={closePhotoModal}
                className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Photo Body */}
            <div className="relative flex-1 bg-black flex items-center justify-center p-2 min-h-[350px] max-h-[60vh] overflow-hidden">
              {activeCandidateForPhotos.photos && activeCandidateForPhotos.photos.length > 0 ? (
                <img
                  src={activeCandidateForPhotos.photos[activePhotoIdx]?.url}
                  alt={activeCandidateForPhotos.name || "Photo"}
                  className="max-w-full max-h-[58vh] object-contain rounded-lg"
                />
              ) : activeCandidateForPhotos.primaryPhotoUrl ? (
                <img
                  src={activeCandidateForPhotos.primaryPhotoUrl}
                  alt={activeCandidateForPhotos.name || "Photo"}
                  className="max-w-full max-h-[58vh] object-contain rounded-lg"
                />
              ) : (
                <div className="text-slate-500 text-xs">No image available</div>
              )}

              {/* Prev / Next buttons for multiple photos */}
              {activeCandidateForPhotos.photos && activeCandidateForPhotos.photos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setActivePhotoIdx((prev) =>
                        prev > 0 ? prev - 1 : (activeCandidateForPhotos.photos?.length || 1) - 1
                      )
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/70 hover:bg-black text-white border border-white/20 transition cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setActivePhotoIdx((prev) =>
                        prev < (activeCandidateForPhotos.photos?.length || 1) - 1 ? prev + 1 : 0
                      )
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/70 hover:bg-black text-white border border-white/20 transition cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {/* Photo Thumbnails bar if multiple photos */}
            {activeCandidateForPhotos.photos && activeCandidateForPhotos.photos.length > 1 && (
              <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-center gap-2 overflow-x-auto">
                {activeCandidateForPhotos.photos.map((p, pIdx) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setActivePhotoIdx(pIdx)}
                    className={`w-12 h-14 rounded-lg overflow-hidden border-2 transition cursor-pointer ${
                      activePhotoIdx === pIdx ? "border-amber-400 scale-105" : "border-slate-700 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={p.url} alt="thumb" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 py-8 text-center text-xs text-slate-600 font-mono">
        <p>Verified Hospitality &amp; Event Staff Showcase &bull; Confidential</p>
      </footer>
    </div>
  );
}
