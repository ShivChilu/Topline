"use client";

import { useState, useEffect } from "react";
import { X, Unlock, Users, Plus, Check, RefreshCw, AlertCircle, Sparkles } from "lucide-react";

interface ReopenEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: any;
  onSuccess: (updatedEvent: any) => void;
}

export default function ReopenEventModal({
  isOpen,
  onClose,
  event,
  onSuccess,
}: ReopenEventModalProps) {
  const [additionalSlots, setAdditionalSlots] = useState<number>(5);
  const [alsoIncreaseWorkers, setAlsoIncreaseWorkers] = useState<boolean>(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAdditionalSlots(5);
      setAlsoIncreaseWorkers(true);
      setErrorMsg(null);
    }
  }, [isOpen, event]);

  if (!isOpen || !event) return null;

  const currentApps = event.applicationsCount || 0;
  const currentMax = event.maxApplications || 0;
  const currentWorkers = event.workersRequired || 0;

  const slotsToAdd = Math.max(1, Number(additionalSlots) || 1);
  const newMaxApplications = Math.max(currentMax + slotsToAdd, currentApps + slotsToAdd);
  const newWorkersRequired = alsoIncreaseWorkers ? currentWorkers + slotsToAdd : currentWorkers;
  const newAvailableSlots = Math.max(0, newMaxApplications - currentApps);

  const handleReopenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    try {
      setLoading(true);
      setErrorMsg(null);

      const eventId = event._id || event.id;
      const res = await fetch(`/api/admin/events/${eventId}/reopen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          additionalSlots: slotsToAdd,
          alsoIncreaseWorkers,
          newMaxApplications,
          newWorkersRequired,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onSuccess(data.event || { ...event, status: "OPEN", maxApplications: newMaxApplications, workersRequired: newWorkersRequired });
        onClose();
      } else {
        setErrorMsg(data.message || "Failed to reopen event.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Network error while reopening event.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden relative animate-in zoom-in-95">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 text-white p-6 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white shrink-0 shadow-inner">
              <Unlock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold tracking-wide uppercase">Reopen Event & Add Slots</h2>
              <p className="text-xs text-emerald-100 mt-0.5 line-clamp-1">{event.name}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleReopenSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Current Status Overview Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Capacity</span>
              <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
                Status: {event.status}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Applications</span>
                <span className="text-base font-extrabold text-slate-900">{currentApps}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Max Cap</span>
                <span className="text-base font-extrabold text-slate-900">{currentMax}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Workers Req</span>
                <span className="text-base font-extrabold text-slate-900">{currentWorkers}</span>
              </div>
            </div>
          </div>

          {/* Slot Increment Controls */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
              Additional Slots / Seats to Add:
            </label>

            {/* Quick Preset Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {[3, 5, 10, 15, 20, 30].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setAdditionalSlots(num)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    additionalSlots === num
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                  }`}
                >
                  +{num} slots
                </button>
              ))}
            </div>

            {/* Numeric Input */}
            <div className="relative">
              <input
                type="number"
                min="1"
                max="500"
                value={additionalSlots}
                onChange={(e) => setAdditionalSlots(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                placeholder="Enter number of slots to add"
              />
              <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-semibold">New Slots</span>
            </div>

            {/* Also Increase Workers Option */}
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={alsoIncreaseWorkers}
                onChange={(e) => setAlsoIncreaseWorkers(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
              />
              <span>Also increase Required Workers by <strong className="text-emerald-700">+{slotsToAdd}</strong> (from {currentWorkers} to {newWorkersRequired})</span>
            </label>
          </div>

          {/* Real-Time Impact Summary */}
          <div className="bg-emerald-50/80 border border-emerald-300/80 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Reopening Impact Preview</span>
            </div>

            <div className="text-xs text-emerald-900 space-y-1 font-medium">
              <div className="flex justify-between">
                <span>New Max Applications:</span>
                <span className="font-extrabold text-emerald-950">{currentMax} + {slotsToAdd} = {newMaxApplications}</span>
              </div>
              <div className="flex justify-between">
                <span>Immediate Open Seats for Students:</span>
                <span className="font-extrabold text-emerald-700">🟢 {newAvailableSlots} new slots open</span>
              </div>
              <div className="flex justify-between">
                <span>Event Status:</span>
                <span className="font-extrabold text-emerald-600 uppercase">🚀 OPEN (Live immediately)</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md transition flex items-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Reopening...</span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  <span>Confirm & Reopen (+{slotsToAdd} Slots)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
