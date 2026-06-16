'use client';

import { useEffect, useRef, useState } from 'react';
import type { ActiveBlockInfo, BlockItemView, Idea } from '@/lib/types';
import { fmtDuration, minToClock } from '@/lib/estructura';
import IdeaCapture from './IdeaCapture';
import Checklist from './Checklist';

// Pantalla completa de foco: fondo negro, reloj enorme, círculo que se vacía con
// el tiempo del bloque, y captura de idea siempre a mano.
export default function FocusMode({
  info,
  mode,
  onToggleMode,
  items,
  ideas,
  onChange,
  onClose,
}: {
  info: ActiveBlockInfo;
  mode: 'up' | 'down';
  onToggleMode: () => void;
  items: BlockItemView[];
  ideas: Idea[];
  onChange: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [showNote, setShowNote] = useState(false);

  // Pide pantalla completa real al abrir (si el navegador deja). Si falla, igual
  // sirve como overlay fijo. Sale del fullscreen al cerrar.
  useEffect(() => {
    const el = ref.current;
    el?.requestFullscreen?.().catch(() => {});
    return () => {
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, []);

  // Esc cierra (además del botón).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !document.fullscreenElement) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const { current, next } = info;
  const secs = mode === 'up' ? info.elapsedSec : info.remainingSec;

  // Círculo de progreso.
  const R = 140;
  const C = 2 * Math.PI * R;
  const dash = C * (1 - info.progress);

  return (
    <div
      ref={ref}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black px-6 text-slate-100"
    >
      <button
        onClick={onClose}
        className="absolute right-5 top-5 rounded-xl border border-white/15 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/10"
      >
        Salir ✕
      </button>

      <div className="relative flex items-center justify-center">
        <svg viewBox="0 0 320 320" className="h-[min(70vw,420px)] w-[min(70vw,420px)]">
          <circle cx="160" cy="160" r={R} fill="none" stroke="#1e293b" strokeWidth="12" />
          {current && (
            <circle
              cx="160"
              cy="160"
              r={R}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={dash}
              transform="rotate(-90 160 160)"
              style={{ transition: 'stroke-dashoffset 0.9s linear' }}
            />
          )}
        </svg>

        <div className="absolute flex flex-col items-center">
          <button onClick={onToggleMode} className="font-mono text-6xl font-semibold tabular-nums md:text-7xl">
            {fmtDuration(secs)}
          </button>
          <span className="mt-1 text-xs uppercase tracking-widest text-slate-500">
            {mode === 'up' ? 'transcurrido' : current ? 'restante' : 'para el próximo'} · tocá para cambiar
          </span>
        </div>
      </div>

      <div className="mt-8 text-center">
        {current ? (
          <>
            <div className="text-2xl font-semibold">{current.name}</div>
            {current.description && (
              <div className="mt-1 text-sm text-slate-400">{current.description}</div>
            )}
          </>
        ) : (
          <div className="text-2xl font-semibold text-slate-400">Sin bloque ahora</div>
        )}
        {next && (
          <div className="mt-2 text-sm text-slate-500">
            Después: {next.name} · {minToClock(next.startMin)}
          </div>
        )}
      </div>

      {current && items.length > 0 && (
        <div className="mt-6 w-full max-w-md text-left">
          <Checklist items={items} blockId={current.id} onChange={onChange} />
        </div>
      )}

      <div className="mt-8 w-full max-w-md">
        {showNote ? (
          <IdeaCapture
            ideas={ideas}
            blockId={current?.id ?? null}
            onChange={onChange}
            compact
          />
        ) : (
          <button
            onClick={() => setShowNote(true)}
            className="mx-auto block rounded-xl border border-white/15 px-4 py-2 text-sm text-slate-300 hover:bg-white/10"
          >
            💭 Anotar una idea
          </button>
        )}
      </div>
    </div>
  );
}
