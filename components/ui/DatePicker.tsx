"use client";

import { useState, useRef, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import { format, parseISO } from "date-fns";
import { Calendar, X } from "lucide-react";

interface DatePickerProps {
  value?: string | Date; // "yyyy-MM-dd", Date object, or empty
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  minDate?: Date;
}

// Inline styles for DayPicker since we can't import its CSS
const dayPickerStyles = `
  .rdp { --rdp-cell-size: 36px; --rdp-accent-color: #f59e0b; --rdp-background-color: #fffbeb; margin: 0; }
  .rdp-months { display: flex; }
  .rdp-month { margin: 0; }
  .rdp-table { border-collapse: collapse; }
  .rdp-with_weeknumber .rdp-table { border-collapse: collapse; }
  .rdp-caption { display: flex; align-items: center; justify-content: space-between; padding: 0 4px 8px; }
  .rdp-caption_label { font-weight: 600; font-size: 0.875rem; color: #111827; }
  .rdp-nav { display: flex; gap: 2px; }
  .rdp-nav_button { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 8px; border: none; background: transparent; cursor: pointer; color: #6b7280; }
  .rdp-nav_button:hover { background: #f3f4f6; }
  .rdp-head_row { display: flex; }
  .rdp-head_cell { font-size: 0.6875rem; font-weight: 600; color: #9ca3af; text-transform: uppercase; width: 36px; text-align: center; padding: 2px 0 6px; }
  .rdp-row { display: flex; }
  .rdp-cell { width: 36px; height: 36px; text-align: center; padding: 0; }
  .rdp-day { width: 36px; height: 36px; border-radius: 8px; border: none; background: transparent; cursor: pointer; font-size: 0.8125rem; color: #374151; display: flex; align-items: center; justify-content: center; }
  .rdp-day:hover:not(.rdp-day_selected):not(.rdp-day_outside) { background: #f3f4f6; }
  .rdp-day_selected { background: #f59e0b !important; color: #111827 !important; font-weight: 700; }
  .rdp-day_today:not(.rdp-day_selected) { background: #fffbeb; color: #f59e0b; font-weight: 700; }
  .rdp-day_outside { color: #d1d5db; }
  .rdp-day_disabled { color: #e5e7eb; cursor: default; }
`;

export default function DatePicker({ value, onChange, placeholder = "Pick a date", label, minDate }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = value 
    ? (value instanceof Date ? value : parseISO(value)) 
    : undefined;

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelect = (day: Date | undefined) => {
    if (day) {
      onChange(format(day, "yyyy-MM-dd"));
      setOpen(false);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <style>{dayPickerStyles}</style>

      {label && (
        <label className="block mb-1.5" style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>{label}</label>
      )}

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border outline-none transition-all text-left"
        style={{
          borderColor: open ? "#f59e0b" : "#e5e7eb",
          background: "white",
          fontSize: "0.875rem",
          color: selected ? "#111827" : "#9ca3af",
        }}>
        <Calendar className="w-4 h-4 flex-shrink-0" style={{ color: "#f59e0b" }} />
        <span className="flex-1">{selected ? format(selected, "MMM d, yyyy") : placeholder}</span>
        {selected && (
          <span onClick={handleClear} className="flex-shrink-0 hover:text-red-400" style={{ color: "#9ca3af" }}>
            <X className="w-3.5 h-3.5" />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 z-50 bg-white rounded-2xl border shadow-xl p-3"
          style={{ borderColor: "#f0f0ea", minWidth: 280 }}>
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            defaultMonth={selected}
            disabled={minDate ? { before: minDate } : undefined}
            showOutsideDays
          />
        </div>
      )}
    </div>
  );
}
