'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Clock, ListChecks } from 'lucide-react';
import type { ActiveBlockInfo, BlockItemView } from '@/lib/types';
import { fmtDuration, minToClock } from '@/lib/estructura';
import ThoughtCapture from './ThoughtCapture';
import Checklist from './Checklist';
import FlipClock from './FlipClock';

// Pantalla completa de foco. Si no hay bloque, el reloj muestra la hora actual.
export default function FocusMode({
  info,
  mode,
  onToggleMode,
  nowClock,
  items,
  hasNext,
  onPostponeAll,
  onPushNext,
  onChange,
  onClose,
}: {
  info: ActiveBlockInfo;
  mode: 'up' | 'down';
  onToggleMode: () => void;
  nowClock: string;
  items: BlockItemView[];
  hasNext: boolean;
  onPostponeAll: (min: number) => void;
  onPushNext: (min: number) => void;
  onChange: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [showExtras, setShowExtras] = useState(false);
  const [askDelay, setAskDelay] = useState(false);

  useEffect(() => {
    const el = ref.current;
    el?.requestFullscreen?.().catch(() => {});
    return () => {
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !document.fullscreenElement) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const { current, next } = info;
  const secs = mode === 'up' ? info.elapsedSec : info.remainingSec;
  const clockValue = current ? fmtDuration(secs) : nowClock;
  const label = current
    ? mode === 'up'
      ? 'transcurrido · tocá para cambiar'
      : 'restante · tocá para cambiar'
    : 'hora actual';

  return (
    <div
      ref={ref}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black px-4 text-slate-100"
    >
      <button
        onClick={onClose}
        aria-label="Salir"
        className="absolute left-5 top-5 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-slate-300 hover:bg-orange-400/[0.16]"
      >
        <X className="h-5 w-5" />
      </button>

      <button onClick={current ? onToggleMode : undefined} className="block" aria-label="Reloj">
        <FlipClock value={clockValue} />
      </button>

      {current && (
        <div className="h-1.5 w-[min(90vw,1640px)] overflow-hidden rounded-full bg-orange-400/[0.12]">
          <div
            className="h-full rounded-full bg-sky-400 transition-[width] duration-1000 ease-linear"
            style={{ width: `${Math.round(info.progress * 100)}%` }}
          />
        </div>
      )}

      <div className="text-center">
        <div className={`text-xl font-semibold md:text-2xl ${current ? '' : 'text-slate-400'}`}>
          {current ? current.name : 'Sin bloque · tiempo no programado'}
        </div>
        <div className="mt-1 text-xs uppercase tracking-widest text-slate-500">{label}</div>
        {next && (
          <div className="mt-1 text-sm text-slate-500">
            Después: {next.name} · {minToClock(next.startMin)}
          </div>
        )}
      </div>

      {/* Aplazar */}
      <div className="flex flex-col items-center gap-2">
        {!askDelay ? (
          <button
            onClick={() => setAskDelay(true)}
            className="flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm text-slate-200 hover:bg-orange-400/[0.16]"
          >
            <Clock className="h-4 w-4" /> +30 min
          </button>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
            <span className="text-slate-400">+30 min:</span>
            <button
              onClick={() => {
                onPostponeAll(30);
                setAskDelay(false);
              }}
              className="rounded-xl border border-white/15 px-3 py-2 text-slate-100 hover:bg-orange-400/[0.16]"
            >
              Correr todo el día
            </button>
            <button
              disabled={!hasNext}
              onClick={() => {
                onPushNext(30);
                setAskDelay(false);
              }}
              className="rounded-xl border border-white/15 px-3 py-2 text-slate-100 hover:bg-orange-400/[0.16] disabled:opacity-40"
            >
              Sacárselo al próximo
            </button>
            <button
              onClick={() => setAskDelay(false)}
              className="text-xs text-slate-500 hover:text-slate-300"
            >
              cancelar
            </button>
          </div>
        )}
      </div>

      {/* Tareas + idea (plegable) */}
      <div className="w-full max-w-md">
        {showExtras ? (
          <div className="space-y-4">
            {current && items.length > 0 && (
              <div className="text-left">
                <Checklist items={items} blockId={current.id} onChange={onChange} />
              </div>
            )}
            <ThoughtCapture onSaved={onChange} compact />
            <button
              onClick={() => setShowExtras(false)}
              className="mx-auto block text-xs text-slate-500 hover:text-slate-300"
            >
              ocultar
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowExtras(true)}
            className="mx-auto flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm text-slate-300 hover:bg-orange-400/[0.16]"
          >
            <ListChecks className="h-4 w-4" /> Tareas y soltar
          </button>
        )}
      </div>
    </div>
  );
}
