'use client';

import { useState } from 'react';
import type { TimedBlock } from '@/lib/types';
import { minToClock, setBlockDone } from '@/lib/estructura';

const KIND_ICON: Record<string, string> = { task: '📌', habit: '🏔️', break: '☕️' };

export default function Timeline({
  blocks,
  currentId,
  onChange,
}: {
  blocks: TimedBlock[];
  currentId: string | null;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  async function toggle(b: TimedBlock) {
    setBusy(b.id);
    try {
      await setBlockDone(b, !b.done);
      onChange();
    } finally {
      setBusy(null);
    }
  }

  if (blocks.length === 0)
    return (
      <p className="text-sm text-slate-400">
        Esta rutina todavía no tiene bloques. Agregalos en <b>Configurar</b>.
      </p>
    );

  return (
    <div className="space-y-2">
      {blocks.map((b) => {
        const active = b.id === currentId;
        return (
          <div
            key={b.id}
            className={`flex items-center gap-3 rounded-2xl border p-3 ${
              active
                ? 'border-sky-400/50 bg-sky-500/10'
                : b.done
                  ? 'border-white/10 bg-white/[0.02] opacity-60'
                  : 'border-white/10 bg-white/5'
            }`}
          >
            <button
              onClick={() => toggle(b)}
              disabled={busy === b.id}
              aria-label={b.done ? 'Marcar como pendiente' : 'Marcar como hecho'}
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-sm ${
                b.done
                  ? 'border-emerald-400 bg-emerald-500 text-slate-950'
                  : 'border-white/20 text-transparent hover:border-emerald-400/60'
              }`}
            >
              ✓
            </button>

            <div className="w-14 shrink-0 font-mono text-sm tabular-nums text-slate-400">
              {minToClock(b.startMin)}
            </div>

            <div className="min-w-0 flex-1">
              <div className={`truncate font-medium ${b.done ? 'line-through' : ''}`}>
                <span className="mr-1 opacity-70">{KIND_ICON[b.kind] ?? '📌'}</span>
                {b.name}
                {active && <span className="ml-2 text-xs text-sky-300">● ahora</span>}
              </div>
              {b.description && (
                <div className="truncate text-xs text-slate-500">{b.description}</div>
              )}
            </div>

            <div className="shrink-0 text-xs text-slate-500">{b.duration_min}m</div>
          </div>
        );
      })}
    </div>
  );
}
