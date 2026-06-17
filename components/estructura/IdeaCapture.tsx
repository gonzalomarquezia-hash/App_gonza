'use client';

import { useState } from 'react';
import type { Idea } from '@/lib/types';
import { addIdea, toggleIdeaDone, deleteIdea } from '@/lib/estructura';

// Captura rápida de ideas: la escribís, queda guardada, la mente se calma.
export default function IdeaCapture({
  ideas,
  blockId,
  onChange,
  compact = false,
}: {
  ideas: Idea[];
  blockId: string | null;
  onChange: () => void;
  compact?: boolean;
}) {
  const [text, setText] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save() {
    const t = text.trim();
    if (!t) return;
    setBusy(true);
    try {
      await addIdea(t, blockId);
      setText('');
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
      onChange();
    } finally {
      setBusy(false);
    }
  }

  function onKey(e: React.KeyboardEvent) {
    // Enter para guardar (Shift+Enter = salto de línea).
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      save();
    }
  }

  return (
    <div>
      <div className="flex items-start gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKey}
          rows={compact ? 1 : 2}
          placeholder="¿Te vino una idea? Anotala y soltala…"
          className="flex-1 resize-none rounded-xl border border-white/15 bg-orange-400/[0.07] px-3 py-2 text-sm outline-none placeholder:text-slate-500 focus:border-sky-400/50"
        />
        <button
          onClick={save}
          disabled={busy || !text.trim()}
          className="shrink-0 rounded-xl border border-sky-400/40 bg-sky-500/10 px-3 py-2 text-sm font-medium text-sky-200 hover:bg-sky-500/20 disabled:opacity-40"
        >
          Guardar
        </button>
      </div>
      {saved && <p className="mt-1 text-xs text-emerald-400">✓ Ya lo guardé. Seguí tranquilo.</p>}

      {!compact && ideas.length > 0 && (
        <ul className="mt-3 space-y-1">
          {ideas.map((it) => (
            <li
              key={it.id}
              className="group flex items-center gap-2 rounded-lg px-1 py-1 text-sm hover:bg-orange-400/10"
            >
              <input
                type="checkbox"
                checked={it.done}
                onChange={() => toggleIdeaDone(it.id, !it.done).then(onChange)}
                className="h-4 w-4 shrink-0 accent-emerald-500"
              />
              <span className={`min-w-0 flex-1 ${it.done ? 'text-slate-500 line-through' : ''}`}>
                {it.text}
              </span>
              <button
                onClick={() => deleteIdea(it.id).then(onChange)}
                aria-label="Borrar idea"
                className="shrink-0 text-slate-600 opacity-0 hover:text-rose-400 group-hover:opacity-100"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
