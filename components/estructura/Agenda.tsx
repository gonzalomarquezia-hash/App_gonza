'use client';

import { useState } from 'react';
import {
  Mountain,
  Coffee,
  Check,
  Plus,
  MoreHorizontal,
  Trash2,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  Play,
} from 'lucide-react';
import type { TimedBlock, BlockItemView } from '@/lib/types';
import { minToClock, minToTime, fmtHuman } from '@/lib/estructura';

type Row = { kind: 'block'; block: TimedBlock } | { kind: 'gap'; startMin: number; endMin: number };

export default function Agenda({
  blocks,
  gaps,
  currentId,
  itemsByBlock,
  onToggleDone,
  onPostpone,
  onSetTime,
  onSetDuration,
  onStartNow,
  onSkip,
  onRestore,
  onDelete,
  onFillGap,
}: {
  blocks: TimedBlock[];
  gaps: { startMin: number; endMin: number }[];
  currentId: string | null;
  itemsByBlock: Record<string, BlockItemView[]>;
  onToggleDone: (b: TimedBlock) => void;
  onPostpone: (b: TimedBlock, minutes: number) => void;
  onSetTime: (b: TimedBlock, hhmm: string) => void;
  onSetDuration: (b: TimedBlock, minutes: number) => void;
  onStartNow: (b: TimedBlock) => void;
  onSkip: (b: TimedBlock) => void;
  onRestore: (b: TimedBlock) => void;
  onDelete: (b: TimedBlock) => void;
  onFillGap: (startMin: number) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  const rows: Row[] = [
    ...blocks.map((b): Row => ({ kind: 'block', block: b })),
    ...gaps.map((g): Row => ({ kind: 'gap', startMin: g.startMin, endMin: g.endMin })),
  ].sort((a, b) => (a.kind === 'block' ? a.block.startMin : a.startMin) - (b.kind === 'block' ? b.block.startMin : b.startMin));

  if (rows.length === 0)
    return (
      <p className="text-sm text-slate-400">
        Tu día está vacío. Agregá un bloque o cargá horarios en tus hábitos.
      </p>
    );

  return (
    <div className="space-y-2">
      {rows.map((row, i) =>
        row.kind === 'gap' ? (
          <GapRow key={`gap-${i}`} startMin={row.startMin} endMin={row.endMin} onFill={onFillGap} />
        ) : (
          <BlockRow
            key={row.block.id}
            b={row.block}
            active={row.block.id === currentId}
            items={itemsByBlock[row.block.id] ?? []}
            open={openId === row.block.id}
            onOpen={() => setOpenId((id) => (id === row.block.id ? null : row.block.id))}
            onToggleDone={onToggleDone}
            onPostpone={onPostpone}
            onSetTime={onSetTime}
            onSetDuration={onSetDuration}
            onStartNow={onStartNow}
            onSkip={onSkip}
            onRestore={onRestore}
            onDelete={onDelete}
          />
        ),
      )}
    </div>
  );
}

function GapRow({
  startMin,
  endMin,
  onFill,
}: {
  startMin: number;
  endMin: number;
  onFill: (startMin: number) => void;
}) {
  return (
    <button
      onClick={() => onFill(startMin)}
      className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-white/10 p-3 text-left hover:bg-white/[0.03]"
    >
      <span className="w-14 shrink-0 font-mono text-sm tabular-nums text-slate-600">
        {minToClock(startMin)}
      </span>
      <span className="flex-1 text-sm text-slate-500">
        sin programar · {fmtHuman(endMin - startMin)}
      </span>
      <span className="flex items-center gap-1 text-xs text-slate-400">
        <Plus className="h-3.5 w-3.5" /> llenar
      </span>
    </button>
  );
}

function BlockRow({
  b,
  active,
  items,
  open,
  onOpen,
  onToggleDone,
  onPostpone,
  onSetTime,
  onSetDuration,
  onStartNow,
  onSkip,
  onRestore,
  onDelete,
}: {
  b: TimedBlock;
  active: boolean;
  items: BlockItemView[];
  open: boolean;
  onOpen: () => void;
  onToggleDone: (b: TimedBlock) => void;
  onPostpone: (b: TimedBlock, minutes: number) => void;
  onSetTime: (b: TimedBlock, hhmm: string) => void;
  onSetDuration: (b: TimedBlock, minutes: number) => void;
  onStartNow: (b: TimedBlock) => void;
  onSkip: (b: TimedBlock) => void;
  onRestore: (b: TimedBlock) => void;
  onDelete: (b: TimedBlock) => void;
}) {
  const [dur, setDur] = useState(String(b.duration_min));
  const timeVal = minToTime(b.startMin % 1440);
  const doneItems = items.filter((it) => it.done).length;

  return (
    <div
      className={`rounded-2xl border ${
        active
          ? 'border-sky-400/50 bg-sky-500/10'
          : b.done
            ? 'border-white/10 bg-white/[0.02] opacity-60'
            : 'border-white/10 bg-white/5'
      }`}
    >
      <div className="flex items-center gap-3 p-3">
        <button
          onClick={() => onToggleDone(b)}
          aria-label={b.done ? 'Marcar pendiente' : 'Marcar hecho'}
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${
            b.done
              ? 'border-emerald-400 bg-emerald-500 text-slate-950'
              : 'border-white/20 text-transparent hover:border-emerald-400/60'
          }`}
        >
          <Check className="h-4 w-4" />
        </button>

        <span className="w-12 shrink-0 font-mono text-sm tabular-nums text-slate-400">
          {minToClock(b.startMin)}
        </span>

        <button onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          {b.virtual ? (
            <Mountain className="h-4 w-4 shrink-0 text-slate-400" />
          ) : b.kind === 'break' ? (
            <Coffee className="h-4 w-4 shrink-0 text-slate-400" />
          ) : null}
          <span className="min-w-0">
            <span className={`block truncate font-medium ${b.done ? 'line-through' : ''}`}>
              {b.name}
              {active && <span className="ml-2 text-xs text-sky-300">ahora</span>}
              {b.edited && <span className="ml-2 text-xs text-amber-300">editado hoy</span>}
            </span>
            {b.description && (
              <span className="block truncate text-xs text-slate-500">{b.description}</span>
            )}
          </span>
        </button>

        <span className="shrink-0 text-right text-xs text-slate-500">
          {items.length > 0 && (
            <span className={`mr-2 ${doneItems === items.length ? 'text-emerald-400' : ''}`}>
              {doneItems}/{items.length}
            </span>
          )}
          {b.duration_min}m
        </span>

        <button
          onClick={onOpen}
          aria-label="Acciones"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-white/10 hover:text-slate-200"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      {open && (
        <div className="border-t border-white/10 px-3 py-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* mover ±10 min con flechas */}
            <div className="flex overflow-hidden rounded-lg border border-white/15">
              <button
                onClick={() => onPostpone(b, -10)}
                aria-label="Más temprano (10 min)"
                className="px-2 py-1 text-slate-200 hover:bg-white/10"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                onClick={() => onPostpone(b, 10)}
                aria-label="Más tarde (10 min)"
                className="border-l border-white/15 px-2 py-1 text-slate-200 hover:bg-white/10"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>

            {/* editar hora (no-controlado: se refresca cuando cambia la hora del bloque) */}
            <input
              key={timeVal}
              type="time"
              defaultValue={timeVal}
              onBlur={(e) => e.target.value && e.target.value !== timeVal && onSetTime(b, e.target.value)}
              className="rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-slate-100 outline-none focus:border-sky-400/50"
            />

            {/* duración */}
            <span className="flex items-center gap-1">
              <input
                value={dur}
                onChange={(e) => setDur(e.target.value)}
                inputMode="numeric"
                className="w-12 rounded-lg border border-white/15 bg-white/5 px-2 py-1 outline-none focus:border-sky-400/50"
              />
              <span className="text-slate-500">min</span>
              <button
                onClick={() => onSetDuration(b, Number(dur) || b.duration_min)}
                className="rounded-lg border border-white/15 px-2 py-1 text-slate-200 hover:bg-white/10"
              >
                ok
              </button>
            </span>

            <button
              onClick={() => onStartNow(b)}
              className="flex items-center gap-1 rounded-lg border border-sky-400/40 bg-sky-500/10 px-2 py-1 font-medium text-sky-200 hover:bg-sky-500/20"
            >
              <Play className="h-3.5 w-3.5" /> empezar ahora
            </button>
          </div>

          <div className="mt-2 flex items-center gap-2">
            {b.edited && (
              <button
                onClick={() => onRestore(b)}
                className="flex items-center gap-1 rounded-lg border border-white/15 px-2 py-1 text-slate-300 hover:bg-white/10"
              >
                <RotateCcw className="h-3.5 w-3.5" /> restaurar
              </button>
            )}
            <button
              onClick={() => onSkip(b)}
              className="rounded-lg border border-white/15 px-2 py-1 text-slate-300 hover:bg-white/10"
            >
              sacar de hoy
            </button>
            {!b.virtual && (
              <button
                onClick={() => onDelete(b)}
                aria-label="Borrar bloque"
                className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-500/10 hover:text-rose-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
