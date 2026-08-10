"use client";

import { useEffect, useState } from "react";

interface TimePicker12HourProps {
  value: string; // expects 24h format "HH:MM"
  onChange: (val: string) => void;
}

export function format24To12(timeStr: string): { hour: string; minute: string; period: string } {
  if (!timeStr) return { hour: "12", minute: "00", period: "PM" };
  const parts = timeStr.split(":");
  if (parts.length < 2) return { hour: "12", minute: "00", period: "PM" };
  let h = parseInt(parts[0], 10);
  const m = parts[1];
  const p = h >= 12 ? "PM" : "AM";
  h = h % 12;
  h = h ? h : 12; // 0 becomes 12
  const hStr = h < 10 ? "0" + h : String(h);
  return { hour: hStr, minute: m, period: p };
}

export function format12To24(hour: string, minute: string, period: string): string {
  let h = parseInt(hour, 10);
  if (isNaN(h)) h = 12;
  if (period === "PM" && h < 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  const hStr = h < 10 ? "0" + h : String(h);
  return `${hStr}:${minute}`;
}

export default function TimePicker12Hour({ value, onChange }: TimePicker12HourProps) {
  // Default to 12:00 PM if empty
  const initial = format24To12(value || "12:00");
  
  const [selectedHour, setSelectedHour] = useState(initial.hour);
  const [selectedMinute, setSelectedMinute] = useState(initial.minute);
  const [selectedPeriod, setSelectedPeriod] = useState(initial.period);

  useEffect(() => {
    if (value) {
      const parsed = format24To12(value);
      setSelectedHour(parsed.hour);
      setSelectedMinute(parsed.minute);
      setSelectedPeriod(parsed.period);
    }
  }, [value]);

  const handleHourChange = (h: string) => {
    setSelectedHour(h);
    onChange(format12To24(h, selectedMinute, selectedPeriod));
  };

  const handleMinuteChange = (m: string) => {
    setSelectedMinute(m);
    onChange(format12To24(selectedHour, m, selectedPeriod));
  };

  const handlePeriodChange = (p: string) => {
    setSelectedPeriod(p);
    onChange(format12To24(selectedHour, selectedMinute, p));
  };

  const hours = Array.from({ length: 12 }, (_, i) => {
    const h = i + 1;
    return h < 10 ? "0" + h : String(h);
  });

  const minutes = Array.from({ length: 60 }, (_, i) => {
    return i < 10 ? "0" + i : String(i);
  });

  return (
    <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-lg p-2 w-full max-w-[280px]">
      {/* Hour select */}
      <select
        value={selectedHour}
        onChange={(e) => handleHourChange(e.target.value)}
        className="bg-transparent text-slate-900 focus:outline-none text-sm font-semibold cursor-pointer w-14 py-0.5"
      >
        {hours.map((h) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>
      
      <span className="text-slate-400 font-bold">:</span>
      
      {/* Minute select */}
      <select
        value={selectedMinute}
        onChange={(e) => handleMinuteChange(e.target.value)}
        className="bg-transparent text-slate-900 focus:outline-none text-sm font-semibold cursor-pointer w-14 py-0.5"
      >
        {minutes.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
      
      {/* AM/PM select */}
      <select
        value={selectedPeriod}
        onChange={(e) => handlePeriodChange(e.target.value)}
        className="bg-red-50 text-red-700 font-bold border border-red-100 rounded px-2 py-0.5 text-xs focus:outline-none cursor-pointer"
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}
