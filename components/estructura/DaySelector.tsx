'use client';

import { useRef } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { addDays, dayLabel } from '@/lib/estructura';

// Navegar entre días (ayer/hoy/mañana) y abrir el calendario para saltar a uno.
export default function DaySelector({
  day,
  onChange,
}: {
  day: string;
  onChange: (d: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  function openPicker() {
    const el = ref.current as (HTMLInputElement & { showPicker?: () => void }) | null;
    if (!el) return;
    if (el.showPicker) el.showPicker();
    else el.focus();
  }

  return (
    <div className="flex items-center justify-center gap-2">
      <button
        onClick={() => onChange(addDays(day, -1))}
        aria-label="Día anterior"
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-slate-300 hover:bg-white/10"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <div className="relative">
        <button
          onClick={openPicker}
          className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-white/10"
        >
          <CalendarDays className="h-4 w-4 text-slate-400" />
          {dayLabel(day)}
        </button>
        <input
          ref={ref}
          type="date"
          value={day}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
        />
      </div>

      <button
        onClick={() => onChange(addDays(day, 1))}
        aria-label="Día siguiente"
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-slate-300 hover:bg-white/10"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
