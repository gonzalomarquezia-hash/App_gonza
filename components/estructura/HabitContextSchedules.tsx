'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Routine, HabitSchedule } from '@/lib/types';
import {
  getRoutines,
  getHabitSchedulesForHabit,
  setHabitSchedule,
  clearHabitSchedule,
} from '@/lib/estructura';

const CTX_ICON: Record<string, string> = { casa: '🏠', local: '🏪', otro: '📍' };

// Horario de este hábito por contexto (rutina). Lo que cargues acá hace que el
// hábito aparezca como bloque en esa rutina, a esa hora. Vacío = no aparece ahí.
export default function HabitContextSchedules({ habitId }: { habitId: string }) {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [byRoutine, setByRoutine] = useState<Record<string, HabitSchedule>>({});
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [rs, scheds] = await Promise.all([
        getRoutines(),
        getHabitSchedulesForHabit(habitId),
      ]);
      setRoutines(rs);
      const map: Record<string, HabitSchedule> = {};
      for (const s of scheds) map[s.routine_id] = s;
      setByRoutine(map);
      setMissing(false);
    } catch {
      setMissing(true);
    } finally {
      setLoading(false);
    }
  }, [habitId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return null;

  if (missing)
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
        Falta activar los horarios por contexto: corré <code>supabase/schema.sql</code> en el SQL
        Editor de Supabase (crea la tabla <code>habit_schedules</code>) y recargá.
      </div>
    );

  if (routines.length === 0)
    return (
      <p className="text-sm text-slate-500">
        Primero creá una rutina (Casa, Local…) en <b>Estructura</b> y volvé.
      </p>
    );

  return (
    <div className="space-y-2">
      {routines.map((r) => (
        <RoutineRow
          key={r.id}
          habitId={habitId}
          routine={r}
          sched={byRoutine[r.id] ?? null}
          onChange={load}
        />
      ))}
      <p className="text-xs text-slate-500">
        Cargá la hora en el contexto donde lo hacés. Si lo dejás sin horario, ese día/contexto no
        aparece. Igual sirve el “Horario” de arriba como valor por defecto.
      </p>
    </div>
  );
}

function RoutineRow({
  habitId,
  routine,
  sched,
  onChange,
}: {
  habitId: string;
  routine: Routine;
  sched: HabitSchedule | null;
  onChange: () => void;
}) {
  const [start, setStart] = useState(sched?.start_time ?? '');
  const [dur, setDur] = useState(sched ? String(sched.duration_min) : '30');
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!start) return;
    setBusy(true);
    try {
      await setHabitSchedule(habitId, routine.id, start, Number(dur) || 30);
      onChange();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await clearHabitSchedule(habitId, routine.id);
      setStart('');
      setDur('30');
      onChange();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="min-w-[5rem] text-sm font-medium">
        {CTX_ICON[routine.context] ?? '📍'} {routine.name}
      </div>
      <label className="flex items-center gap-1 text-sm text-slate-400">
        a las
        <input
          type="time"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="rounded-lg border border-white/15 bg-transparent px-2 py-1.5 text-slate-100 outline-none focus:border-white/30"
        />
      </label>
      <label className="flex items-center gap-1 text-sm text-slate-400">
        <input
          type="number"
          min={1}
          value={dur}
          onChange={(e) => setDur(e.target.value)}
          className="w-16 rounded-lg border border-white/15 bg-transparent px-2 py-1.5 text-slate-100 outline-none focus:border-white/30"
        />
        min
      </label>
      <div className="ml-auto flex gap-2">
        {sched && (
          <button
            onClick={remove}
            disabled={busy}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10 disabled:opacity-40"
          >
            Quitar
          </button>
        )}
        <button
          onClick={save}
          disabled={busy || !start}
          className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-40"
        >
          Guardar
        </button>
      </div>
    </div>
  );
}
