'use client';

import { useState } from 'react';
import { postponeAll, resetDayOffset } from '@/lib/estructura';

// Aplazar TODA la cadena de bloques de una. Offset solo de hoy; mañana arranca en cero.
export default function PostponeBar({
  routineId,
  offset,
  onChange,
}: {
  routineId: string;
  offset: number;
  onChange: () => void;
}) {
  const [custom, setCustom] = useState('');
  const [busy, setBusy] = useState(false);

  async function shift(minutes: number) {
    setBusy(true);
    try {
      await postponeAll(routineId, minutes);
      onChange();
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    setBusy(true);
    try {
      await resetDayOffset(routineId);
      onChange();
    } finally {
      setBusy(false);
    }
  }

  function applyCustom() {
    const n = parseInt(custom, 10);
    if (Number.isFinite(n) && n !== 0) {
      shift(n);
      setCustom('');
    }
  }

  const sign = offset > 0 ? '+' : '';

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400">Aplazar todo</span>
        <span className={`text-xs ${offset === 0 ? 'text-slate-500' : 'text-amber-300'}`}>
          {offset === 0 ? 'En horario' : `corrido ${sign}${offset} min`}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {[15, 30, 60].map((m) => (
          <button
            key={m}
            onClick={() => shift(m)}
            disabled={busy}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-40"
          >
            +{m}m
          </button>
        ))}
        <div className="flex items-center gap-1">
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyCustom()}
            inputMode="numeric"
            placeholder="±min"
            className="w-16 rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-sm outline-none focus:border-sky-400/50"
          />
          <button
            onClick={applyCustom}
            disabled={busy || !custom.trim()}
            className="rounded-lg border border-white/15 px-2 py-1.5 text-sm hover:bg-white/10 disabled:opacity-40"
          >
            Aplicar
          </button>
        </div>
        {offset !== 0 && (
          <button
            onClick={reset}
            disabled={busy}
            className="ml-auto rounded-lg border border-white/15 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/10 disabled:opacity-40"
          >
            Volver al horario
          </button>
        )}
      </div>
    </div>
  );
}
