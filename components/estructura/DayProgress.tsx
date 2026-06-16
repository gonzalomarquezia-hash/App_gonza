'use client';

import { useState } from 'react';
import { fmtHuman, minToClock, minToTime } from '@/lib/estructura';

const clockEnd = (m: number) => (m === 1440 ? '24:00' : minToClock(m));

// Tiempo restante del día: barra + texto. En rojo cuando queda poco, para
// cortar la sensación de "todavía falta un montón". Tocás las horas para
// ajustar tu despertar/dormir solo de este día.
export default function DayProgress({
  startMin,
  endMin,
  nowMin,
  isToday,
  onEditWindow,
}: {
  startMin: number;
  endMin: number;
  nowMin: number;
  isToday: boolean;
  onEditWindow: (startHHMM: string, endHHMM: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [start, setStart] = useState(minToTime(startMin));
  const [end, setEnd] = useState(minToTime(endMin % 1440));

  const total = Math.max(1, endMin - startMin);
  const remaining = Math.max(0, endMin - nowMin);
  const frac = Math.min(1, Math.max(0, (nowMin - startMin) / total));
  const beforeStart = isToday && nowMin < startMin;
  const ended = isToday && nowMin >= endMin;
  const low = isToday && !ended && !beforeStart && remaining <= 120;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-baseline justify-between gap-2">
        {!isToday ? (
          <span className="text-sm text-slate-400">
            Tu día: {clockEnd(startMin)}–{clockEnd(endMin)} · {fmtHuman(total)}
          </span>
        ) : ended ? (
          <span className="text-sm text-slate-400">El día terminó</span>
        ) : beforeStart ? (
          <span className="text-sm text-slate-400">Tu día arranca a las {minToClock(startMin)}</span>
        ) : (
          <span className={`text-sm ${low ? 'font-semibold text-rose-400' : 'text-slate-200'}`}>
            Te quedan {fmtHuman(remaining)} de tu día
          </span>
        )}
        <button
          onClick={() => setEditing((v) => !v)}
          className="text-xs text-slate-500 hover:text-slate-300"
        >
          {clockEnd(startMin)} → {clockEnd(endMin)}
        </button>
      </div>

      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${
            low ? 'bg-rose-500' : 'bg-sky-400'
          }`}
          style={{ width: `${Math.round((isToday ? frac : 0) * 100)}%` }}
        />
      </div>

      {editing && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-400">
          Despierto
          <input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="rounded-lg border border-white/15 bg-transparent px-2 py-1.5 text-slate-100 outline-none focus:border-white/30"
          />
          duermo
          <input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="rounded-lg border border-white/15 bg-transparent px-2 py-1.5 text-slate-100 outline-none focus:border-white/30"
          />
          <button
            onClick={() => {
              onEditWindow(start, end);
              setEditing(false);
            }}
            className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-200 hover:bg-emerald-500/20"
          >
            Aplicar a este día
          </button>
        </div>
      )}
    </div>
  );
}
