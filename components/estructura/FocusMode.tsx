'use client';

import { useEffect, useRef, useState } from 'react';
import type { ActiveBlockInfo, BlockItemView, Idea } from '@/lib/types';
import { fmtDuration, minToClock } from '@/lib/estructura';
import IdeaCapture from './IdeaCapture';
import Checklist from './Checklist';
import FlipClock from './FlipClock';

// Pantalla completa de foco: fondo negro, reloj flip enorme, barra de progreso
// fina, y el bloque + tareas + captura de idea a mano. Se abre con el botón,
// nunca de golpe.
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
  const [showExtras, setShowExtras] = useState(false);

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
  const label = mode === 'up' ? 'transcurrido' : current ? 'restante' : 'para el próximo';

  return (
    <div
      ref={ref}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-black px-6 text-slate-100"
    >
      <button
        onClick={onClose}
        aria-label="Salir"
        className="absolute left-5 top-5 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-lg text-slate-300 hover:bg-white/10"
      >
        ✕
      </button>

      {/* Reloj flip — tocá para cambiar transcurrido/restante */}
      <button onClick={onToggleMode} className="block" aria-label="Cambiar modo del reloj">
        <FlipClock value={fmtDuration(secs)} />
      </button>

      {/* Barra de progreso fina del bloque */}
      {current && (
        <div className="h-1.5 w-[min(82vw,640px)] overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-sky-400 transition-[width] duration-1000 ease-linear"
            style={{ width: `${Math.round(info.progress * 100)}%` }}
          />
        </div>
      )}

      {/* Bloque actual */}
      <div className="text-center">
        {current ? (
          <div className="text-xl font-semibold md:text-2xl">{current.name}</div>
        ) : (
          <div className="text-xl font-semibold text-slate-400 md:text-2xl">Sin bloque ahora</div>
        )}
        <div className="mt-1 text-xs uppercase tracking-widest text-slate-500">
          {label} · tocá el reloj para cambiar
        </div>
        {next && (
          <div className="mt-1 text-sm text-slate-500">
            Después: {next.name} · {minToClock(next.startMin)}
          </div>
        )}
      </div>

      {/* Tareas + idea (plegable, para no romper el minimalismo) */}
      <div className="w-full max-w-md">
        {showExtras ? (
          <div className="space-y-4">
            {current && items.length > 0 && (
              <div className="text-left">
                <Checklist items={items} blockId={current.id} onChange={onChange} />
              </div>
            )}
            <IdeaCapture ideas={ideas} blockId={current?.id ?? null} onChange={onChange} compact />
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
            className="mx-auto block rounded-xl border border-white/15 px-4 py-2 text-sm text-slate-300 hover:bg-white/10"
          >
            ✓ Tareas y 💭 idea
          </button>
        )}
      </div>
    </div>
  );
}
