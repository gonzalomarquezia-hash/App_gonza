'use client';

import { useState } from 'react';
import type { BlockItemView } from '@/lib/types';
import { createBlockItem, updateBlockItem, deleteBlockItem, setItemDone } from '@/lib/estructura';

// Checklist de mini-tareas de un bloque. Tildar = por día. Agregar/editar/borrar = plantilla.
export default function Checklist({
  items,
  blockId,
  onChange,
  showChecks = true,
}: {
  items: BlockItemView[];
  blockId: string;
  onChange: () => void;
  showChecks?: boolean;
}) {
  const [text, setText] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  async function add() {
    const t = text.trim();
    if (!t) return;
    await createBlockItem(blockId, t, items.length);
    setText('');
    onChange();
  }

  async function saveEdit(id: string) {
    if (editText.trim()) await updateBlockItem(id, editText);
    setEditId(null);
    onChange();
  }

  return (
    <div className="space-y-1.5">
      {items.map((it) => (
        <div key={it.id} className="group flex items-center gap-2 text-sm">
          {showChecks && (
            <button
              onClick={() => setItemDone(it.id, !it.done).then(onChange)}
              aria-label={it.done ? 'Destildar' : 'Tildar'}
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[11px] ${
                it.done
                  ? 'border-emerald-400 bg-emerald-500 text-slate-950'
                  : 'border-white/25 text-transparent hover:border-emerald-400/60'
              }`}
            >
              ✓
            </button>
          )}

          {editId === it.id ? (
            <input
              autoFocus
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={() => saveEdit(it.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveEdit(it.id);
                if (e.key === 'Escape') setEditId(null);
              }}
              className="min-w-0 flex-1 rounded border border-white/20 bg-white/5 px-2 py-1 outline-none focus:border-sky-400/50"
            />
          ) : (
            <span
              onClick={() => {
                setEditId(it.id);
                setEditText(it.text);
              }}
              className={`min-w-0 flex-1 cursor-text truncate ${
                it.done && showChecks ? 'text-slate-500 line-through' : ''
              }`}
            >
              {it.text}
            </span>
          )}

          <button
            onClick={() => deleteBlockItem(it.id).then(onChange)}
            aria-label="Borrar tarea"
            className="shrink-0 text-slate-600 opacity-0 hover:text-rose-400 group-hover:opacity-100"
          >
            ✕
          </button>
        </div>
      ))}

      <div className="flex items-center gap-2 pt-0.5">
        <span className="w-5 shrink-0 text-center text-slate-600">＋</span>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Agregar tarea…"
          className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-2 py-1 text-sm outline-none placeholder:text-slate-600 hover:border-white/15 focus:border-sky-400/50 focus:bg-white/5"
        />
      </div>
    </div>
  );
}
