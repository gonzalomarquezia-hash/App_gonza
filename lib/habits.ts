import { supabase } from './supabaseClient';
import type { Habit, Camp, Checkin, CheckinState, HabitType, HabitStats, Note } from './types';

export const DAY_MS = 86_400_000;

export function todayStr(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function shiftDay(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return todayStr(new Date(y, m - 1, d + n));
}

export function weekdayOf(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

// ---- Lectura ----

export const ALL_WEEK_DAYS = [0, 1, 2, 3, 4, 5, 6];

export async function getHabits(): Promise<Habit[]> {
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as Habit[]).map((h) => ({
    ...h,
    // Hábitos viejos (antes de la columna) o vacíos → aplican todos los días.
    week_days: Array.isArray(h.week_days) && h.week_days.length ? h.week_days : ALL_WEEK_DAYS,
  }));
}

export async function getCheckins(habitId: string): Promise<Checkin[]> {
  const { data, error } = await supabase
    .from('checkins')
    .select('*')
    .eq('habit_id', habitId);
  if (error) throw error;
  return data as Checkin[];
}

// ---- Escritura ----

export async function setToday(habitId: string, state: CheckinState): Promise<void> {
  const { error } = await supabase
    .from('checkins')
    .upsert({ habit_id: habitId, day: todayStr(), state }, { onConflict: 'habit_id,day' });
  if (error) throw error;
}

export async function clearToday(habitId: string): Promise<void> {
  const { error } = await supabase
    .from('checkins')
    .delete()
    .eq('habit_id', habitId)
    .eq('day', todayStr());
  if (error) throw error;
}

// Marcar/borrar un día cualquiera (para el calendario / backfill de días pasados).
export async function setCheckin(habitId: string, day: string, state: CheckinState): Promise<void> {
  const { error } = await supabase
    .from('checkins')
    .upsert({ habit_id: habitId, day, state }, { onConflict: 'habit_id,day' });
  if (error) throw error;
}

export async function clearCheckin(habitId: string, day: string): Promise<void> {
  const { error } = await supabase
    .from('checkins')
    .delete()
    .eq('habit_id', habitId)
    .eq('day', day);
  if (error) throw error;
}

export async function setWeekDays(habitId: string, days: number[]): Promise<void> {
  const clean = [...new Set(days)].filter((d) => d >= 0 && d <= 6).sort((a, b) => a - b);
  const { error } = await supabase
    .from('habits')
    .update({ week_days: clean.length ? clean : ALL_WEEK_DAYS })
    .eq('id', habitId);
  if (error) throw error;
}

export async function relapse(habit: Habit): Promise<void> {
  const { streak } = computeStats(habit, []);
  const { error } = await supabase
    .from('habits')
    .update({ lifetime_days: habit.lifetime_days + streak, base_reset_at: new Date().toISOString() })
    .eq('id', habit.id);
  if (error) throw error;
}

export async function createHabit(name: string, type: HabitType): Promise<void> {
  const { error } = await supabase.from('habits').insert({ name, type });
  if (error) throw error;
}

export async function deleteHabit(id: string): Promise<void> {
  const { error } = await supabase.from('habits').delete().eq('id', id);
  if (error) throw error;
}

export async function setReward(habit: Habit, campDay: number, reward: string): Promise<void> {
  const camps = habit.camps.map((c) => (c.day === campDay ? { ...c, reward } : c));
  const { error } = await supabase.from('habits').update({ camps }).eq('id', habit.id);
  if (error) throw error;
}

// Reemplaza TODOS los campamentos del hábito. Sanea: días enteros >= 1, sin
// duplicados (gana el último), ordenados de menor a mayor.
export async function setCamps(habitId: string, camps: Camp[]): Promise<void> {
  const byDay = new Map<number, Camp>();
  for (const c of camps) {
    const day = Math.round(Number(c.day));
    if (Number.isFinite(day) && day >= 1) byDay.set(day, { day, reward: c.reward ?? '' });
  }
  const clean = [...byDay.values()].sort((a, b) => a.day - b.day);
  const { error } = await supabase.from('habits').update({ camps: clean }).eq('id', habitId);
  if (error) throw error;
}

// ---- Notas ----

export async function getNotes(habitId: string): Promise<Note[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('habit_id', habitId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Note[];
}

export async function addNote(habitId: string, text: string): Promise<void> {
  const { error } = await supabase.from('notes').insert({ habit_id: habitId, text });
  if (error) throw error;
}

export async function deleteNote(id: string): Promise<void> {
  const { error } = await supabase.from('notes').delete().eq('id', id);
  if (error) throw error;
}

// ---- Cálculo ----

export function computeStats(habit: Habit, checkins: Checkin[]): HabitStats {
  const camps = [...habit.camps].sort((a, b) => a.day - b.day);
  const summitDay = camps.length ? camps[camps.length - 1].day : 90;
  const scheduled = new Set(
    habit.week_days && habit.week_days.length ? habit.week_days : ALL_WEEK_DAYS,
  );

  let streak = 0;
  let lifetime = 0;
  let todayState: CheckinState | null = null;
  let doneCount = 0;
  let restCount = 0;
  let missCount = 0;

  if (habit.type === 'avoid') {
    const base = new Date(habit.base_reset_at).getTime();
    streak = Math.max(0, Math.floor((Date.now() - base) / DAY_MS));
    lifetime = habit.lifetime_days + streak;
  } else {
    const states = new Map<string, CheckinState>();
    for (const c of checkins) {
      states.set(c.day, c.state);
      if (c.state === 'done') doneCount++;
      else restCount++;
    }
    lifetime = checkins.length;

    const today = todayStr();
    todayState = states.get(today) ?? null;

    // Racha hacia atrás, respetando los días de la semana del hábito.
    // Un día no programado se saltea (no cuenta ni rompe). Hoy sin marcar no rompe.
    let cursor = today;
    for (let guard = 0; guard < 4000; guard++) {
      if (!scheduled.has(weekdayOf(cursor))) {
        cursor = shiftDay(cursor, -1);
        continue;
      }
      if (states.has(cursor)) {
        streak++;
        cursor = shiftDay(cursor, -1);
        continue;
      }
      if (cursor === today) {
        cursor = shiftDay(cursor, -1);
        continue;
      }
      break;
    }

    // Días no hechos: días programados anteriores a hoy, dentro del historial, sin marcar.
    const days = checkins.map((c) => c.day).sort();
    if (days.length) {
      let d = days[0];
      for (let guard = 0; guard < 4000 && d < today; guard++) {
        if (scheduled.has(weekdayOf(d)) && !states.has(d)) missCount++;
        d = shiftDay(d, 1);
      }
    }
  }

  const nextCamp = camps.find((c) => c.day > streak) ?? null;
  const daysToNextCamp = nextCamp ? nextCamp.day - streak : null;
  const progress = summitDay ? Math.min(1, streak / summitDay) : 0;

  // Progreso dentro del campamento actual (entre el último conquistado y el próximo).
  const prevReached = camps.filter((c) => c.day <= streak).reduce((m, c) => Math.max(m, c.day), 0);
  let pctCamp = 100;
  let campLabel = 'Cumbre 🏁';
  if (nextCamp) {
    const span = nextCamp.day - prevReached;
    pctCamp = span > 0 ? Math.min(100, Math.max(0, ((streak - prevReached) / span) * 100)) : 0;
    campLabel = `Campamento ${camps.indexOf(nextCamp) + 1} (${nextCamp.day} días)`;
  }

  return {
    streak,
    lifetime,
    summitDay,
    nextCamp,
    daysToNextCamp,
    progress,
    todayState,
    doneCount,
    restCount,
    missCount,
    pctTotal: Math.round(progress * 100),
    pctCamp: Math.round(pctCamp),
    campLabel,
  };
}
