'use client';

import { useState } from 'react';
import { ChevronDown, Home, Store, MapPin, Plus, Check } from 'lucide-react';
import type { Routine } from '@/lib/types';

function Icon({ context }: { context: string }) {
  const cls = 'h-4 w-4';
  if (context === 'casa') return <Home className={cls} />;
  if (context === 'local') return <Store className={cls} />;
  return <MapPin className={cls} />;
}

// Desplegable de contexto/rutina: cambiar entre Casa/Local/… o crear una nueva.
export default function ContextSelector({
  routines,
  activeId,
  onSwitch,
  onCreate,
}: {
  routines: Routine[];
  activeId: string | null;
  onSwitch: (id: string) => void;
  onCreate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const active = routines.find((r) => r.id === activeId) ?? null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl border border-sky-400/50 bg-sky-500/10 px-3 py-1.5 text-sm text-sky-200 hover:bg-sky-500/20"
      >
        {active ? <Icon context={active.context} /> : <MapPin className="h-4 w-4" />}
        {active?.name ?? 'Contexto'}
        <ChevronDown className="h-4 w-4 opacity-70" />
      </button>

      {open && (
        <>
          <button
            aria-label="Cerrar"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div className="absolute left-1/2 z-20 mt-1 w-48 -translate-x-1/2 overflow-hidden rounded-xl border border-white/15 bg-slate-900 shadow-xl">
            {routines.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  onSwitch(r.id);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/10"
              >
                <Icon context={r.context} />
                <span className="flex-1">{r.name}</span>
                {r.id === activeId && <Check className="h-4 w-4 text-sky-300" />}
              </button>
            ))}
            <button
              onClick={() => {
                onCreate();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 border-t border-white/10 px-3 py-2 text-left text-sm text-slate-300 hover:bg-white/10"
            >
              <Plus className="h-4 w-4" /> Nueva rutina
            </button>
          </div>
        </>
      )}
    </div>
  );
}
