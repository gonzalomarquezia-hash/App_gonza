'use client';

import { useState } from 'react';
import type { TimedBlock, BlockItemView } from '@/lib/types';
import { minToClock, setBlockDone } from '@/lib/estructura';
import { setToday, clearToday } from '@/lib/habits';

const KIND_ICON: Record<string, string> = { task: '📌', habit: '🏔️', break: '☕️' };

export default function Timeline({
  blocks,
  currentId,
  itemsByBlock,
  onChange,
  onDelete,
}: {
  blocks: TimedBlock[];
  currentId: string | null;
  itemsByBlock: Record<string, BlockItemView[]>;
  onChange: () => void;
  onDelete: (b: TimedBlock) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  async function toggle(b: TimedBlock) {
    setBusy(b.id);
    try {
      if (b.virtual && b.habit_id) {
        // Bloque proyectado de un hábito: la marca va al hábito (sincronía).
        if (b.done) await clearToday(b.habit_id);
        else await setToday(b.habit_id, 'done');
      } else {
        await setBlockDone(b, !b.done);
      }
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
        const its = itemsByBlock[b.id] ?? [];
        const doneCount = its.filter((it) => it.done).length;
        return (
          <div
            key={b.id}
            className={`group flex items-center gap-3 rounded-2xl border p-3 ${
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

            <div className="shrink-0 text-right text-xs text-slate-500">
              {its.length > 0 && (
                <div className={doneCount === its.length ? 'text-emerald-400' : 'text-slate-400'}>
                  ✓ {doneCount}/{its.length}
                </div>
              )}
              <div>{b.duration_min}m</div>
            </div>

            {b.virtual ? (
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center text-xs text-slate-600"
                title="Bloque de un hábito (se edita en Hábitos)"
              >
                🏔️
              </span>
            ) : (
              <button
                onClick={() => onDelete(b)}
                aria-label="Eliminar bloque"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-rose-500/10 hover:text-rose-400"
              >
                ✕
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
