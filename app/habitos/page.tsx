'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { getHabits, createHabit, deleteHabit } from '@/lib/habits';
import type { Habit, HabitType } from '@/lib/types';
import { PageContainer, ErrorBox } from '@/components/ui';

const DOW_LABELS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

export default function Habitos() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<HabitType>('do');
  const [weekDays, setWeekDays] = useState<number[]>(ALL_DAYS);
  const [schedMode, setSchedMode] = useState<'none' | 'window' | 'timer'>('none');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [durationMin, setDurationMin] = useState('');

  const load = useCallback(async () => {
    try {
      setError(null);
      setHabits(await getHabits());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function toggleDay(d: number) {
    setWeekDays((days) =>
      days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort((a, b) => a - b),
    );
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await createHabit(name.trim(), type, {
      week_days: weekDays,
      start_time: schedMode === 'none' ? null : startTime,
      end_time: schedMode === 'window' ? endTime : null,
      duration_min: schedMode === 'timer' ? Number(durationMin) : null,
    });
    setName('');
    setType('do');
    setWeekDays(ALL_DAYS);
    setSchedMode('none');
    setStartTime('');
    setEndTime('');
    setDurationMin('');
    await load();
  }

  async function del(h: Habit) {
    if (!confirm(`¿Borrar "${h.name}"? Se pierde su progreso.`)) return;
    await deleteHabit(h.id);
    await load();
  }

  return (
    <PageContainer>
      <h1 className="text-2xl font-semibold">Hábitos</h1>
      <p className="mb-6 text-sm text-slate-400">Agregá o sacá lo que querés seguir.</p>

      {error && <ErrorBox msg={error} />}

      <form onSubmit={add} className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del hábito (ej. Ejercicio diario)"
          className="w-full rounded-xl border border-white/15 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-slate-500 focus:border-white/30"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setType('do')}
            className={`rounded-xl border px-3 py-2 text-sm ${
              type === 'do'
                ? 'border-emerald-400 bg-emerald-500/15 text-emerald-300'
                : 'border-white/15 text-slate-300 hover:bg-white/5'
            }`}
          >
            🟢 Hacer
          </button>
          <button
            type="button"
            onClick={() => setType('avoid')}
            className={`rounded-xl border px-3 py-2 text-sm ${
              type === 'avoid'
                ? 'border-rose-400 bg-rose-500/15 text-rose-300'
                : 'border-white/15 text-slate-300 hover:bg-white/5'
            }`}
          >
            🔴 No hacer
          </button>
        </div>

        <p className="mt-4 mb-2 text-xs text-slate-400">
          Días de la semana <span className="text-slate-500">(los demás son descanso)</span>
        </p>
        <div className="flex gap-1">
          {DOW_LABELS.map((lbl, d) => {
            const on = weekDays.includes(d);
            return (
              <button
                key={d}
                type="button"
                onClick={() => toggleDay(d)}
                className={`h-9 w-9 rounded-lg text-sm ${
                  on
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                    : 'border border-white/15 text-slate-500 hover:bg-white/5'
                }`}
              >
                {lbl}
              </button>
            );
          })}
        </div>

        <p className="mt-4 mb-2 text-xs text-slate-400">Horario (opcional)</p>
        <div className="flex flex-wrap gap-2">
          {(['none', 'window', 'timer'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setSchedMode(m)}
              className={`rounded-xl border px-3 py-2 text-sm ${
                schedMode === m
                  ? 'border-emerald-400 bg-emerald-500/15 text-emerald-300'
                  : 'border-white/15 text-slate-300 hover:bg-white/5'
              }`}
            >
              {m === 'none' ? 'Sin horario' : m === 'window' ? 'Ventana' : 'Temporizador'}
            </button>
          ))}
        </div>

        {schedMode !== 'none' && (
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-2 text-slate-400">
              Empieza
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="rounded-xl border border-white/15 bg-transparent px-3 py-2 text-slate-100 outline-none focus:border-white/30"
              />
            </label>
            {schedMode === 'window' ? (
              <label className="flex items-center gap-2 text-slate-400">
                Termina
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="rounded-xl border border-white/15 bg-transparent px-3 py-2 text-slate-100 outline-none focus:border-white/30"
                />
              </label>
            ) : (
              <label className="flex items-center gap-2 text-slate-400">
                Duración
                <input
                  type="number"
                  min={1}
                  value={durationMin}
                  onChange={(e) => setDurationMin(e.target.value)}
                  placeholder="min"
                  className="w-24 rounded-xl border border-white/15 bg-transparent px-3 py-2 text-slate-100 outline-none placeholder:text-slate-500 focus:border-white/30"
                />
                min
              </label>
            )}
          </div>
        )}

        <button
          type="submit"
          className="mt-4 w-full rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-950 hover:bg-slate-200"
        >
          Crear
        </button>
      </form>

      {loading ? (
        <p className="text-slate-400">Cargando…</p>
      ) : (
        <div className="space-y-2">
          {habits.map((h) => (
            <div
              key={h.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
            >
              <Link
                href={`/habitos/${h.id}`}
                className="flex flex-1 items-center text-sm hover:text-slate-300"
              >
                <span className="mr-2">{h.type === 'avoid' ? '🔴' : '🟢'}</span>
                {h.name}
                <span className="ml-2 text-slate-500">›</span>
              </Link>
              <button
                onClick={() => del(h)}
                className="text-xs text-slate-500 hover:text-rose-300"
              >
                Borrar
              </button>
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
