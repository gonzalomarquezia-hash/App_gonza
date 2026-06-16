'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';

// Agregar un bloque rápido por nombre (sin abrir el editor). El horario lo decide
// la página (arranca en el momento presente).
export default function QuickAdd({
  onAdd,
  placeholder = 'Nueva tarea o bloque…',
  autoFocus = false,
}: {
  onAdd: (name: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [name, setName] = useState('');

  function submit() {
    const t = name.trim();
    if (!t) return;
    onAdd(t);
    setName('');
  }

  return (
    <div className="flex items-center gap-2">
      <input
        autoFocus={autoFocus}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder={placeholder}
        className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-slate-500 focus:border-sky-400/50"
      />
      <button
        onClick={submit}
        disabled={!name.trim()}
        className="flex shrink-0 items-center gap-1 rounded-xl border border-sky-400/40 bg-sky-500/10 px-3 py-2 text-sm font-medium text-sky-200 hover:bg-sky-500/20 disabled:opacity-40"
      >
        <Plus className="h-4 w-4" /> Agregar
      </button>
    </div>
  );
}
