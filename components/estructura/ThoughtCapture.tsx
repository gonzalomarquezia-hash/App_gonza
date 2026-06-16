'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { ThoughtKind, Emotion } from '@/lib/types';
import { addThought, EMOTIONS } from '@/lib/thoughts';

// Captura unificada: elegís de un desplegable si es una TAREA pendiente o un
// PENSAMIENTO/EMOCIÓN. Si es pensamiento, al costado elegís la emoción que lo
// acompañó. Se guarda en la pestaña Pensamientos. Se usa en Estructura (casilla
// del reloj), en pantalla completa (Foco) y en la propia pestaña Pensamientos.
export default function ThoughtCapture({
  onSaved,
  compact = false,
}: {
  onSaved?: () => void;
  compact?: boolean;
}) {
  const [kind, setKind] = useState<ThoughtKind>('task');
  const [text, setText] = useState('');
  const [emotion, setEmotion] = useState<Emotion>('ansiedad');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const isThought = kind === 'emotion';

  async function save() {
    const t = text.trim();
    if (!t) return;
    setBusy(true);
    try {
      await addThought({ text: t, kind, emotion: isThought ? emotion : null });
      setText('');
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
      onSaved?.();
    } finally {
      setBusy(false);
    }
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      save();
    }
  }

  return (
    <div>
      {/* Fila de desplegables: categoría + (si es pensamiento) emoción */}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Select
          value={kind}
          onChange={(v) => setKind(v as ThoughtKind)}
          options={[
            { value: 'task', label: 'Tarea pendiente' },
            { value: 'emotion', label: 'Pensamiento / emoción' },
          ]}
        />
        {isThought && (
          <Select
            value={emotion}
            onChange={(v) => setEmotion(v as Emotion)}
            options={EMOTIONS.map((e) => ({ value: e.value, label: e.label }))}
            hint="emoción"
          />
        )}
      </div>

      <div className="flex items-start gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKey}
          rows={compact ? 1 : 2}
          placeholder={
            isThought
              ? '¿Qué se te cruzó por la cabeza? Anotalo y soltalo…'
              : '¿Qué tenés pendiente? Anotá la tarea…'
          }
          className="flex-1 resize-none rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-slate-500 focus:border-sky-400/50"
        />
        <button
          onClick={save}
          disabled={busy || !text.trim()}
          className="shrink-0 rounded-xl border border-sky-400/40 bg-sky-500/10 px-3 py-2 text-sm font-medium text-sky-200 hover:bg-sky-500/20 disabled:opacity-40"
        >
          Guardar
        </button>
      </div>
      {saved && (
        <p className="mt-1 text-xs text-emerald-400">
          ✓ Guardado en Pensamientos. {isThought ? 'Después lo procesás tranquilo.' : 'Seguí tranquilo.'}
        </p>
      )}
    </div>
  );
}

// Desplegable nativo estilizado (dos o más opciones).
function Select({
  value,
  onChange,
  options,
  hint,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  hint?: string;
}) {
  return (
    <div className="relative inline-flex items-center">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={hint ?? 'categoría'}
        className="appearance-none rounded-xl border border-white/15 bg-white/5 py-2 pl-3 pr-8 text-sm text-slate-100 outline-none focus:border-sky-400/50"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-slate-900 text-slate-100">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 h-4 w-4 text-slate-400" />
    </div>
  );
}
