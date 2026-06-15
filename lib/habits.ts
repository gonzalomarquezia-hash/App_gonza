import { supabase } from './supabaseClient';
import type { Habit, Camp, Checkin, CheckinState, HabitType, HabitStats } from './types';

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

// ---- Lectura ----

export async function getHabits(): Promise<Habit[]> {
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as Habit[];
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

// ---- Cálculo ----

export function computeStats(habit: Habit, checkins: Checkin[]): HabitStats {
  const camps = [...habit.camps].sort((a, b) => a.day - b.day);
  const summitDay = camps.length ? camps[camps.length - 1].day : 90;

  let streak = 0;
  let lifetime = 0;
  let todayState: CheckinState | null = null;

  if (habit.type === 'avoid') {
    const base = new Date(habit.base_reset_at).getTime();
    streak = Math.max(0, Math.floor((Date.now() - base) / DAY_MS));
    lifetime = habit.lifetime_days + streak;
  } else {
    const states = new Map<string, CheckinState>();
    for (const c of checkins) states.set(c.day, c.state);
    lifetime = checkins.length;

    const today = todayStr();
    todayState = states.get(today) ?? null;
    let cursor = states.has(today) ? today : shiftDay(today, -1);
    while (states.has(cursor)) {
      streak++;
      cursor = shiftDay(cursor, -1);
    }
  }

  const nextCamp = camps.find((c) => c.day > streak) ?? null;
  const daysToNextCamp = nextCamp ? nextCamp.day - streak : null;
  const progress = summitDay ? Math.min(1, streak / summitDay) : 0;

  return { streak, lifetime, summitDay, nextCamp, daysToNextCamp, progress, todayState };
}
