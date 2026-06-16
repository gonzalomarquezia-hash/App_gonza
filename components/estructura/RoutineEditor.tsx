'use client';

import { useState } from 'react';
import type { Block, BlockKind, Routine, Habit } from '@/lib/types';
import {
  createBlock,
  updateBlock,
  deleteBlock,
  createRoutine,
  renameRoutine,
  deleteRoutine,
} from '@/lib/estructura';

const KINDS: { value: BlockKind; label: string }[] = [
  { value: 'task', label: '📌 Tarea' },
  { value: 'habit', label: '🏔️ Hábito' },
  { value: 'break', label: '☕️ Descanso' },
];

export default function RoutineEditor({
  routine,
  routines,
  blocks,
  habits,
  onChange,
}: {
  routine: Routine;
  routines: Routine[];
  blocks: Block[];
  habits: Habit[];
  onChange: () => void;
}) {
  const [newName, setNewName] = useState('');
  const [newContext, setNewContext] = useState('casa');

  async function addBlock() {
    // Arranca después del último bloque para que caiga ordenado.
    const last = blocks[blocks.length - 1];
    const start = last ? addMinutes(last.start_time, last.duration_min) : '08:00';
    await createBlock(routine.id, {
      name: 'Nuevo bloque',
      start_time: start,
      duration_min: 30,
      pos: blocks.length,
    });
    onChange();
  }

  async function addRoutine() {
    const name = newName.trim();
    if (!name) return;
    await createRoutine(name, newContext);
    setNewName('');
    onChange();
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h2 className="mb-1 text-lg font-semibold">Configurar</h2>
      <p className="mb-4 text-sm text-slate-400">
        Editás los bloques de <b>{routine.name}</b>. Los horarios son fijos; para correr todo un
        día puntual usá <b>Aplazar todo</b>.
      </p>

      {/* Nombre / contexto de la rutina actual */}
      <RoutineHeader routine={routine} canDelete={routines.length > 1} onChange={onChange} />

      {/* Bloques */}
      <div className="mt-4 space-y-3">
        {blocks.map((b) => (
          <BlockRow key={b.id} block={b} habits={habits} onChange={onChange} />
        ))}
      </div>

      <button
        onClick={addBlock}
        className="mt-3 w-full rounded-xl border border-dashed border-white/20 py-2 text-sm text-slate-300 hover:bg-white/5"
      >
        + Agregar bloque
      </button>

      {/* Crear otra rutina (contexto) */}
      <div className="mt-6 border-t border-white/10 pt-4">
        <div className="mb-2 text-sm font-medium text-slate-300">Nueva rutina / contexto</div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addRoutine()}
            placeholder="Ej: Local"
            className="flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none focus:border-sky-400/50"
          />
          <select
            value={newContext}
            onChange={(e) => setNewContext(e.target.value)}
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none"
          >
            <option value="casa">🏠 Casa</option>
            <option value="local">🏪 Local</option>
            <option value="otro">📍 Otro</option>
          </select>
          <button
            onClick={addRoutine}
            disabled={!newName.trim()}
            className="rounded-xl border border-sky-400/40 bg-sky-500/10 px-3 py-2 text-sm font-medium text-sky-200 hover:bg-sky-500/20 disabled:opacity-40"
          >
            Crear
          </button>
        </div>
      </div>
    </div>
  );
}

function RoutineHeader({
  routine,
  canDelete,
  onChange,
}: {
  routine: Routine;
  canDelete: boolean;
  onChange: () => void;
}) {
  const [name, setName] = useState(routine.name);
  const [context, setContext] = useState(routine.context);

  async function save() {
    if (name.trim() && (name !== routine.name || context !== routine.context)) {
      await renameRoutine(routine.id, name.trim(), context);
      onChange();
    }
  }

  async function remove() {
    if (confirm(`¿Borrar la rutina "${routine.name}" y todos sus bloques?`)) {
      await deleteRoutine(routine.id);
      onChange();
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={save}
        className="flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium outline-none focus:border-sky-400/50"
      />
      <select
        value={context}
        onChange={(e) => setContext(e.target.value)}
        onBlur={save}
        className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none"
      >
        <option value="casa">🏠 Casa</option>
        <option value="local">🏪 Local</option>
        <option value="otro">📍 Otro</option>
      </select>
      {canDelete && (
        <button
          onClick={remove}
          className="rounded-xl border border-rose-500/30 px-3 py-2 text-sm text-rose-300 hover:bg-rose-500/10"
        >
          Borrar rutina
        </button>
      )}
    </div>
  );
}

function BlockRow({
  block,
  habits,
  onChange,
}: {
  block: Block;
  habits: Habit[];
  onChange: () => void;
}) {
  const [b, setB] = useState(block);
  const dirty =
    b.name !== block.name ||
    b.description !== block.description ||
    b.start_time !== block.start_time ||
    b.duration_min !== block.duration_min ||
    b.kind !== block.kind ||
    b.habit_id !== block.habit_id;

  async function save() {
    await updateBlock(block.id, {
      name: b.name,
      description: b.description,
      start_time: b.start_time,
      duration_min: b.duration_min,
      kind: b.kind,
      habit_id: b.habit_id,
    });
    onChange();
  }

  async function remove() {
    await deleteBlock(block.id);
    onChange();
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={b.name}
          onChange={(e) => setB({ ...b, name: e.target.value })}
          placeholder="Nombre"
          className="min-w-[8rem] flex-1 rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-sm outline-none focus:border-sky-400/50"
        />
        <input
          type="time"
          value={b.start_time}
          onChange={(e) => setB({ ...b, start_time: e.target.value })}
          className="rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-sm outline-none focus:border-sky-400/50"
        />
        <div className="flex items-center gap-1 text-sm text-slate-400">
          <input
            type="number"
            min={1}
            value={b.duration_min}
            onChange={(e) => setB({ ...b, duration_min: Number(e.target.value) })}
            className="w-16 rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-sm outline-none focus:border-sky-400/50"
          />
          min
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <select
          value={b.kind}
          onChange={(e) => setB({ ...b, kind: e.target.value as BlockKind })}
          className="rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-sm outline-none"
        >
          {KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
        <select
          value={b.habit_id ?? ''}
          onChange={(e) => setB({ ...b, habit_id: e.target.value || null })}
          className="min-w-[10rem] flex-1 rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-sm outline-none"
        >
          <option value="">Sin hábito enlazado</option>
          {habits.map((h) => (
            <option key={h.id} value={h.id}>
              🏔️ {h.name}
            </option>
          ))}
        </select>
      </div>

      <input
        value={b.description ?? ''}
        onChange={(e) => setB({ ...b, description: e.target.value })}
        placeholder="Descripción (qué hago en este bloque)"
        className="mt-2 w-full rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-sm outline-none focus:border-sky-400/50"
      />

      <div className="mt-2 flex items-center justify-end gap-2">
        <button
          onClick={remove}
          className="rounded-lg border border-rose-500/30 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-500/10"
        >
          Borrar
        </button>
        <button
          onClick={save}
          disabled={!dirty}
          className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-40"
        >
          Guardar
        </button>
      </div>
    </div>
  );
}

// "HH:MM" + minutos → "HH:MM" (capado al mismo día).
function addMinutes(t: string, mins: number): string {
  const [h, m] = t.split(':').map(Number);
  const total = Math.min(23 * 60 + 59, (h || 0) * 60 + (m || 0) + mins);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
