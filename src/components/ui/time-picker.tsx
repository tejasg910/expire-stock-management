"use client";

import { useState, useRef, useEffect } from "react";
import { Clock, ChevronDown } from "lucide-react";

interface TimePickerProps {
  value: string; // "HH:MM" 24h
  onChange: (time: string) => void;
  required?: boolean;
  id?: string;
}

function generateSlots(): { label: string; value: string }[] {
  const slots = [];
  for (let h = 6; h <= 23; h++) {
    for (const m of [0, 30]) {
      const value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      const hour12 = h % 12 === 0 ? 12 : h % 12;
      const ampm = h < 12 ? "AM" : "PM";
      const label = `${hour12}:${String(m).padStart(2, "0")} ${ampm}`;
      slots.push({ label, value });
    }
  }
  return slots;
}

const SLOTS = generateSlots();

export function TimePicker({ value, onChange, required, id }: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = SLOTS.find((s) => s.value === value);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (open && value && listRef.current) {
      const idx = SLOTS.findIndex((s) => s.value === value);
      if (idx !== -1) {
        const item = listRef.current.children[idx] as HTMLElement;
        item?.scrollIntoView({ block: "nearest" });
      }
    }
  }, [open, value]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        id={id}
        onClick={() => setOpen((o) => !o)}
        className={`
          w-full flex items-center justify-between gap-2 h-11 px-3
          bg-white border rounded-lg text-sm transition-all duration-150
          ${open
            ? "border-orange-400 ring-2 ring-orange-100 text-gray-900"
            : "border-gray-200 text-gray-700 hover:border-gray-300"
          }
          ${!selected ? "text-gray-400" : ""}
        `}
        aria-required={required}
      >
        <span className="flex items-center gap-2">
          <Clock size={15} className={selected ? "text-orange-500" : "text-gray-300"} />
          {selected ? selected.label : "Select time"}
        </span>
        <ChevronDown
          size={15}
          className={`text-gray-400 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          ref={listRef}
          className="absolute z-50 top-full mt-1.5 w-full bg-white border border-gray-100 rounded-xl shadow-lg overflow-y-auto"
          style={{ maxHeight: "240px" }}
        >
          {SLOTS.map((slot) => {
            const isSelected = slot.value === value;
            const isPast = (() => {
              const [h, m] = slot.value.split(":").map(Number);
              const d = new Date();
              d.setHours(h, m, 0, 0);
              return d <= new Date();
            })();
            return (
              <button
                key={slot.value}
                type="button"
                disabled={isPast}
                onClick={() => {
                  onChange(slot.value);
                  setOpen(false);
                }}
                className={`
                  w-full text-left px-4 py-2.5 text-sm transition-colors
                  ${isSelected
                    ? "bg-orange-50 text-orange-600 font-semibold"
                    : isPast
                    ? "text-gray-300 cursor-not-allowed"
                    : "text-gray-700 hover:bg-gray-50"
                  }
                `}
              >
                {slot.label}
                {isPast && (
                  <span className="ml-2 text-xs text-gray-300">passed</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
