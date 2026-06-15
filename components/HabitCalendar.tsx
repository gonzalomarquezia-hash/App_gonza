'use client';

import { useState } from 'react';
import type { CheckinState } from '@/lib/types';

const DOW = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export default function HabitCalendar({
  states,
  weekDays,
  today,
  onToggle,
}: {
  states: Map<string, CheckinState>;
  weekDays: number[];
  today: string;
  onToggle: (day: string) => void;
}) {
  const [ty, tm] = today.split('-').map(Number);
  const [view, setView] = useState({ y: ty, m: tm - 1 }); // m: 0-based

  const first = new Date(view.y, view.m, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const scheduled = new Set(weekDays);

  const cells: (string | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(`${view.y}-${pad(view.m + 1)}-${pad(d)}`);

  function shiftMonth(delta: number) {
    const m = view.m + delta;
    setView({ y: view.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 });
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => shiftMonth(-1)}
          className="rounded-lg px-2 py-1 text-sm text-slate-400 hover:bg-white/10"
        >
          ‹
        </button>
        <div className="text-sm font-medium capitalize">
          {MESES[view.m]} {view.y}
        </div>
        <button
          onClick={() => shiftMonth(1)}
          className="rounded-lg px-2 py-1 text-sm text-slate-400 hover:bg-white/10"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {DOW.map((d, i) => (
          <div key={i} className="text-xs text-slate-500">
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const dnum = Number(day.slice(-2));
          const dow = new Date(view.y, view.m, dnum).getDay();
          const isScheduled = scheduled.has(dow);
          const isFuture = day > today;
          const isToday = day === today;
          const state = states.get(day);

          const base =
            'aspect-square rounded-lg text-xs flex items-center justify-center transition-colors';
          let look = 'text-slate-600';
          if (state === 'done') look = 'bg-emerald-500 text-slate-950 font-semibold';
          else if (state === 'rest') look = 'bg-sky-500 text-slate-950 font-semibold';
          else if (!isScheduled) look = 'text-slate-700';
          else if (isFuture) look = 'text-slate-600';
          else look = 'border border-white/10 text-slate-300';

          const disabled = isFuture || !isScheduled;

          return (
            <button
              key={i}
              disabled={disabled}
              onClick={() => onToggle(day)}
              className={`${base} ${look} ${disabled ? 'cursor-default' : 'hover:opacity-80'} ${
                isToday ? 'ring-1 ring-white/50' : ''
              }`}
            >
              {dnum}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
        <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-emerald-500" />Hecho</span>
        <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-sky-500" />Descanso</span>
        <span className="text-slate-500">Tocá un día para marcarlo (hecho → descanso → vacío).</span>
      </div>
    </div>
  );
}
