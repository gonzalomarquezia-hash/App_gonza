'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getHabits,
  getCheckins,
  computeStats,
  setCamps,
  setCheckin,
  clearCheckin,
  setWeekDays,
  setSchedule,
  todayStr,
  getNotes,
  addNote,
  deleteNote,
} from '@/lib/habits';
import type { Habit, Camp, Checkin, CheckinState, Note } from '@/lib/types';
import { PageContainer, ErrorBox } from '@/components/ui';
import HabitCalendar from '@/components/HabitCalendar';
import HabitContextSchedules from '@/components/estructura/HabitContextSchedules';

const DOW_LABELS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

export default function HabitoDetalle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [habit, setHabit] = useState<Habit | null>(null);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Camp[]>([]);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteDraft, setNoteDraft] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [notesReady, setNotesReady] = useState(true);
  const [schedMode, setSchedMode] = useState<'none' | 'window' | 'timer'>('none');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [durationMin, setDurationMin] = useState('');
  const [savingSched, setSavingSched] = useState(false);

  const refreshNotes = useCallback(async (habitId: string) => {
    try {
      setNotes(await getNotes(habitId));
      setNotesReady(true);
    } catch {
      // La tabla `notes` todavía no existe en Supabase: degradamos sin romper la pantalla.
      setNotes([]);
      setNotesReady(false);
    }
  }, []);

  const load = useCallback(async () => {
    try {
      setError(null);
      const hs = await getHabits();
      const h = hs.find((x) => x.id === id) ?? null;
      setHabit(h);
      setCheckins(h ? await getCheckins(h.id) : []);
      if (h) {
        setStartTime(h.start_time?.slice(0, 5) ?? '');
        setEndTime(h.end_time?.slice(0, 5) ?? '');
        setDurationMin(h.duration_min != null ? String(h.duration_min) : '');
        setSchedMode(h.duration_min != null ? 'timer' : h.start_time || h.end_time ? 'window' : 'none');
        await refreshNotes(h.id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, [id, refreshNotes]);

  async function submitNote() {
    if (!habit || !noteDraft.trim()) return;
    setAddingNote(true);
    try {
      await addNote(habit.id, noteDraft.trim());
      setNoteDraft('');
      await refreshNotes(habit.id);
    } catch {
      setNotesReady(false);
    } finally {
      setAddingNote(false);
    }
  }

  async function removeNote(noteId: string) {
    if (!habit) return;
    await deleteNote(noteId);
    await refreshNotes(habit.id);
  }

  // Calendario: cicla hecho → no realizado → vacío para ese día.
  async function toggleDay(day: string) {
    if (!habit) return;
    const current = checkins.find((c) => c.day === day)?.state ?? null;
    const next: CheckinState | null =
      current === null ? 'done' : current === 'done' ? 'miss' : null;
    if (next === null) await clearCheckin(habit.id, day);
    else await setCheckin(habit.id, day, next);
    setCheckins(await getCheckins(habit.id));
  }

  async function saveSchedule() {
    if (!habit) return;
    setSavingSched(true);
    try {
      await setSchedule(habit.id, {
        start_time: schedMode === 'none' ? null : startTime,
        end_time: schedMode === 'window' ? endTime : null,
        duration_min: schedMode === 'timer' ? Number(durationMin) : null,
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar el horario');
    } finally {
      setSavingSched(false);
    }
  }

  async function toggleWeekDay(d: number) {
    if (!habit) return;
    const has = habit.week_days.includes(d);
    const next = has ? habit.week_days.filter((x) => x !== d) : [...habit.week_days, d];
    try {
      await setWeekDays(habit.id, next);
      await load();
    } catch {
      setError(
        'Falta activar los días de la semana: corré supabase/schema.sql en Supabase (agrega la columna week_days) y recargá.',
      );
    }
  }

  function startEdit() {
    if (!habit) return;
    setDraft([...habit.camps].sort((a, b) => a.day - b.day));
    setEditing(true);
  }

  function updateRow(i: number, patch: Partial<Camp>) {
    setDraft((d) => d.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  }

  function addRow() {
    setDraft((d) => [...d, { day: 0, reward: '' }]);
  }

  function removeRow(i: number) {
    setDraft((d) => d.filter((_, j) => j !== i));
  }

  async function saveCamps() {
    if (!habit) return;
    setSaving(true);
    try {
      await setCamps(habit.id, draft);
      setEditing(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    load();
  }, [load]);

  const back = (
    <Link href="/habitos" className="text-sm text-slate-400 hover:text-slate-200">
      ← Hábitos
    </Link>
  );

  if (loading)
    return (
      <PageContainer>
        {back}
        <p className="mt-4 text-slate-400">Cargando…</p>
      </PageContainer>
    );

  if (error)
    return (
      <PageContainer>
        {back}
        <div className="mt-4">
          <ErrorBox msg={error} />
        </div>
      </PageContainer>
    );

  if (!habit)
    return (
      <PageContainer>
        {back}
        <p className="mt-4 text-slate-400">Ese hábito no existe (quizá lo borraste).</p>
      </PageContainer>
    );

  const stats = computeStats(habit, checkins);
  const camps = [...habit.camps].sort((a, b) => a.day - b.day);

  return (
    <PageContainer>
      {back}

      <h1 className="mt-3 text-2xl font-semibold">
        {habit.type === 'avoid' ? '🔴 ' : '🟢 '}
        {habit.name}
      </h1>
      <p className="text-sm text-slate-400">
        {habit.type === 'avoid' ? 'Hábito de NO hacer' : 'Hábito de hacer'}
      </p>

      <p className="mt-4 text-sm text-slate-300">
        {habit.type === 'avoid' ? '🚭' : '🔥'} <b>{stats.streak}</b>{' '}
        {stats.streak === 1 ? 'día' : 'días'}
        {stats.nextCamp ? (
          <span className="text-slate-400">
            {' '}
            · próximo campamento en {stats.daysToNextCamp} ({stats.nextCamp.day})
          </span>
        ) : (
          <span className="text-emerald-400"> · ¡cumbre alcanzada! 🏁</span>
        )}
        <span className="text-slate-500"> · acumulado de por vida {stats.lifetime}</span>
      </p>

      {/* Métricas */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric label="% total" value={`${stats.pctTotal}%`} hint="hacia la cumbre" />
        <Metric label={stats.campLabel} value={`${stats.pctCamp}%`} hint="del campamento actual" />
        <Metric label="Acumulado" value={`${stats.lifetime}`} hint="días de por vida" />
        <Metric
          label="Hechos / No"
          value={`${stats.doneCount} / ${stats.missCount}`}
          hint="hecho vs no realizado"
        />
      </div>

      <h2 className="mt-6 mb-2 text-sm font-medium text-slate-300">
        Días de la semana <span className="text-slate-500">(los demás son descanso)</span>
      </h2>
      <div className="flex gap-1">
        {DOW_LABELS.map((lbl, d) => {
          const on = habit.week_days.includes(d);
          return (
            <button
              key={d}
              onClick={() => toggleWeekDay(d)}
              className={`h-9 w-9 rounded-lg text-sm ${
                on
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                  : 'border border-white/15 text-slate-500 hover:bg-orange-400/10'
              }`}
            >
              {lbl}
            </button>
          );
        })}
      </div>

      <h2 className="mt-6 mb-2 text-sm font-medium text-slate-300">Horario</h2>
      <div className="rounded-2xl border border-white/10 bg-orange-400/[0.07] p-3">
        <div className="flex gap-2">
          {(['none', 'window', 'timer'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setSchedMode(m)}
              className={`rounded-xl border px-3 py-2 text-sm ${
                schedMode === m
                  ? 'border-emerald-400 bg-emerald-500/15 text-emerald-300'
                  : 'border-white/15 text-slate-300 hover:bg-orange-400/10'
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
          onClick={saveSchedule}
          disabled={savingSched}
          className="mt-3 rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-950 hover:bg-slate-200 disabled:opacity-50"
        >
          {savingSched ? 'Guardando…' : 'Guardar horario'}
        </button>
        <p className="mt-2 text-xs text-slate-500">
          Se usará para el recordatorio (notificación) en una próxima etapa.
        </p>
      </div>

      <h2 className="mt-6 mb-2 text-sm font-medium text-slate-300">
        🧭 En tu estructura <span className="text-slate-500">(horario por contexto)</span>
      </h2>
      <HabitContextSchedules habitId={habit.id} />

      <h2 className="mt-6 mb-2 text-sm font-medium text-slate-300">Calendario</h2>
      <HabitCalendar
        states={new Map(checkins.map((c) => [c.day, c.state]))}
        weekDays={habit.week_days}
        today={todayStr()}
        onToggle={toggleDay}
      />

      <div className="mt-6 mb-2 flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-300">Campamentos</h2>
        {!editing && (
          <button
            onClick={startEdit}
            className="text-sm text-slate-400 hover:text-slate-200"
          >
            Editar
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          {draft.map((c, i) => (
            <div
              key={i}
              className="rounded-2xl border border-white/10 bg-orange-400/[0.07] p-3"
            >
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={c.day || ''}
                  onChange={(e) => updateRow(i, { day: Number(e.target.value) })}
                  placeholder="días"
                  className="w-20 rounded-xl border border-white/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-white/30"
                />
                <span className="text-sm text-slate-400">días</span>
                <button
                  onClick={() => removeRow(i)}
                  className="ml-auto text-xs text-slate-500 hover:text-rose-300"
                >
                  Quitar
                </button>
              </div>
              <input
                value={c.reward}
                onChange={(e) => updateRow(i, { reward: e.target.value })}
                placeholder="Recompensa al llegar (opcional)"
                className="mt-2 w-full rounded-xl border border-white/15 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-slate-500 focus:border-white/30"
              />
            </div>
          ))}

          <button
            onClick={addRow}
            className="w-full rounded-xl border border-dashed border-white/20 px-3 py-2 text-sm text-slate-400 hover:bg-orange-400/10"
          >
            + Agregar campamento
          </button>

          <div className="flex gap-2 pt-1">
            <button
              onClick={saveCamps}
              disabled={saving}
              className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-950 hover:bg-slate-200 disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
            <button
              onClick={() => setEditing(false)}
              disabled={saving}
              className="rounded-xl border border-white/15 px-4 py-2 text-sm text-slate-300 hover:bg-orange-400/[0.16] disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Los días se ordenan solos y se ignoran los repetidos o vacíos.
          </p>
        </div>
      ) : camps.length === 0 ? (
        <p className="text-sm text-slate-500">
          Sin campamentos. Tocá <b>Editar</b> para agregar metas.
        </p>
      ) : (
        <div className="space-y-2">
          {camps.map((c) => {
            const reached = stats.streak >= c.day;
            return (
              <div
                key={c.day}
                className="rounded-2xl border border-white/10 bg-orange-400/[0.07] p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium">{c.day} días</div>
                  {reached ? (
                    <span className="text-sm text-emerald-400">✅ Conquistado</span>
                  ) : (
                    <span className="text-sm text-slate-300">
                      Te faltan {c.day - stats.streak}{' '}
                      {c.day - stats.streak === 1 ? 'día' : 'días'}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-400">
                  {c.reward ? (
                    <>🎁 {c.reward}</>
                  ) : (
                    <span className="text-slate-500">Sin recompensa todavía</span>
                  )}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <h2 className="mt-8 mb-2 text-sm font-medium text-slate-300">Notas</h2>
      {!notesReady && (
        <div className="mb-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
          Falta activar las notas: corré <code>supabase/schema.sql</code> en el SQL Editor de
          Supabase (crea la tabla <code>notes</code>) y recargá.
        </div>
      )}
      <div className="rounded-2xl border border-white/10 bg-orange-400/[0.07] p-3">
        <textarea
          value={noteDraft}
          onChange={(e) => setNoteDraft(e.target.value)}
          placeholder="¿Cómo te fue hoy con esto?"
          rows={2}
          className="w-full rounded-xl border border-white/15 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-slate-500 focus:border-white/30"
        />
        <button
          onClick={submitNote}
          disabled={addingNote || !noteDraft.trim()}
          className="mt-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-950 hover:bg-slate-200 disabled:opacity-50"
        >
          {addingNote ? 'Guardando…' : 'Agregar nota'}
        </button>
      </div>

      {notes.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">Todavía no escribiste ninguna nota.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {notes.map((n) => (
            <div key={n.id} className="rounded-2xl border border-white/10 bg-orange-400/[0.07] p-3">
              <div className="flex items-start justify-between gap-3">
                <p className="whitespace-pre-wrap text-sm text-slate-200">{n.text}</p>
                <button
                  onClick={() => removeNote(n.id)}
                  className="shrink-0 text-xs text-slate-500 hover:text-rose-300"
                >
                  Borrar
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-500">{n.day}</p>
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-orange-400/[0.07] p-3">
      <div className="text-lg font-semibold text-slate-100">{value}</div>
      <div className="truncate text-xs text-slate-300" title={label}>
        {label}
      </div>
      <div className="truncate text-xs text-slate-500">{hint}</div>
    </div>
  );
}
