import { supabase } from './supabaseClient';
import { asError, todayStr, setCheckin, clearCheckin, ALL_WEEK_DAYS } from './habits';
import type {
  Routine,
  Block,
  BlockItem,
  Habit,
  HabitSchedule,
  CheckinState,
  DayState,
  BlockDayEdit,
  Idea,
  TimedBlock,
  ActiveBlockInfo,
} from './types';

// Clave de un edit del día (bloque real o hábito proyectado).
export type EditMap = Map<string, BlockDayEdit>;
const editKey = (type: 'block' | 'habit', id: string) => `${type}:${id}`;

// ── Matemática de horarios (pura, sin React) ────────────────

// "HH:MM" o "HH:MM:SS" → minutos desde medianoche.
export function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

// minutos desde medianoche → "HH:MM" (con cero a la izquierda).
export function minToTime(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

// minutos desde medianoche → "8:05" (hora sin cero a la izquierda, para mostrar).
export function minToClock(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
}

// minutos → "5 h 20 min" / "45 min" / "2 h".
export function fmtHuman(totalMin: number): string {
  const m = Math.max(0, Math.round(totalMin));
  const h = Math.floor(m / 60);
  const min = m % 60;
  if (h && min) return `${h} h ${min} min`;
  if (h) return `${h} h`;
  return `${min} min`;
}

// "YYYY-MM-DD" + n días.
export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return todayStr(new Date(y, m - 1, d + n));
}

// Etiqueta amigable de un día: Hoy / Mañana / Ayer / "mar 16 jun".
export function dayLabel(day: string): string {
  const t = todayStr();
  if (day === t) return 'Hoy';
  if (day === addDays(t, 1)) return 'Mañana';
  if (day === addDays(t, -1)) return 'Ayer';
  const [y, m, d] = day.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const dow = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'][dt.getDay()];
  const mon = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][
    m - 1
  ];
  return `${dow} ${d} ${mon}`;
}

// segundos → "MM:SS" o "H:MM:SS".
export function fmtDuration(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// Resuelve los bloques a horario real: aplica el offset del día, las ediciones
// del día (sacar/mover/duración) y marca los hechos.
export function layoutBlocks(
  blocks: Block[],
  offsetMin: number,
  doneIds: string[],
  edits?: EditMap,
): TimedBlock[] {
  const done = new Set(doneIds);
  const out: TimedBlock[] = [];
  for (const b of blocks) {
    const e = edits?.get(editKey('block', b.id));
    if (e?.skipped) continue;
    const start = e?.start_override ?? b.start_time;
    const dur = e?.duration_override ?? b.duration_min;
    const startMin = timeToMin(start) + offsetMin;
    out.push({
      ...b,
      start_time: start,
      duration_min: dur,
      startMin,
      endMin: startMin + dur,
      done: done.has(b.id),
      edited: !!(e && (e.start_override || e.duration_override != null)),
    });
  }
  return out.sort((a, b) => a.startMin - b.startMin || a.pos - b.pos);
}

// Proyecta los hábitos con horario como bloques virtuales del día.
// Para cada hábito "do" que aplica hoy: usa el horario de la rutina activa si
// existe (override por contexto), si no, el horario global del hábito (fallback).
export function projectHabitBlocks(
  habits: Habit[],
  scheduleByHabit: Map<string, HabitSchedule>,
  todayStates: Record<string, CheckinState>,
  offsetMin: number,
  todayWeekday: number,
  edits?: EditMap,
): TimedBlock[] {
  const out: TimedBlock[] = [];
  for (const h of habits) {
    if (h.type !== 'do') continue;
    const days = h.week_days?.length ? h.week_days : ALL_WEEK_DAYS;
    if (!days.includes(todayWeekday)) continue;

    const e = edits?.get(editKey('habit', h.id));
    if (e?.skipped) continue;

    let startTime: string | null = null;
    let duration = 30;
    const ov = scheduleByHabit.get(h.id);
    if (ov) {
      startTime = ov.start_time;
      duration = ov.duration_min;
    } else if (h.start_time) {
      startTime = h.start_time.slice(0, 5);
      if (h.duration_min) duration = h.duration_min;
      else if (h.end_time)
        duration = Math.max(1, timeToMin(h.end_time) - timeToMin(h.start_time));
    }
    if (e?.start_override) startTime = e.start_override;
    if (e?.duration_override) duration = e.duration_override;
    if (!startTime) continue; // hábito sin horario → no se proyecta

    const startMin = timeToMin(startTime) + offsetMin;
    out.push({
      id: `h:${h.id}`,
      routine_id: '',
      name: h.name,
      description: null,
      start_time: startTime,
      duration_min: duration,
      pos: 0,
      habit_id: h.id,
      kind: 'habit',
      created_at: '',
      startMin,
      endMin: startMin + duration,
      done: todayStates[h.id] === 'done',
      virtual: true,
      edited: !!(e && (e.start_override || e.duration_override != null)),
    });
  }
  return out;
}

// Dado el layout y el "ahora", calcula bloque actual/siguiente y los contadores.
export function computeActive(timed: TimedBlock[], nowDate: Date): ActiveBlockInfo {
  const nowMin = nowDate.getHours() * 60 + nowDate.getMinutes() + nowDate.getSeconds() / 60;
  const current = timed.find((b) => nowMin >= b.startMin && nowMin < b.endMin) ?? null;
  const next = timed.find((b) => b.startMin > nowMin) ?? null;

  let elapsedSec = 0;
  let remainingSec = 0;
  let progress = 0;
  if (current) {
    elapsedSec = Math.max(0, Math.round((nowMin - current.startMin) * 60));
    remainingSec = Math.max(0, Math.round((current.endMin - nowMin) * 60));
    const durSec = (current.endMin - current.startMin) * 60;
    progress = durSec > 0 ? Math.min(1, Math.max(0, elapsedSec / durSec)) : 0;
  } else if (next) {
    remainingSec = Math.max(0, Math.round((next.startMin - nowMin) * 60));
  }
  return { current, next, elapsedSec, remainingSec, progress };
}

// Ventana del día (en minutos desde medianoche). Usa el override del día si existe,
// si no, el default de la rutina. Si el fin es <= inicio (incluido 00:00) se
// interpreta como que el día termina pasada la medianoche.
export function dayWindow(routine: Routine, state?: DayState): { startMin: number; endMin: number } {
  const startStr = state?.day_start_override ?? routine.day_start_time ?? '08:00';
  const endStr = state?.day_end_override ?? routine.day_end_time ?? '00:00';
  const startMin = timeToMin(startStr);
  let endMin = timeToMin(endStr);
  if (endMin <= startMin) endMin += 1440;
  return { startMin, endMin };
}

// Huecos (tiempo sin programar) dentro de la ventana del día.
export function computeGaps(
  timed: TimedBlock[],
  startMin: number,
  endMin: number,
  minGap = 10,
): { startMin: number; endMin: number }[] {
  const gaps: { startMin: number; endMin: number }[] = [];
  let cursor = startMin;
  for (const b of timed) {
    if (b.endMin <= startMin) continue;
    const bs = Math.max(b.startMin, startMin);
    if (bs > cursor) gaps.push({ startMin: cursor, endMin: Math.min(bs, endMin) });
    cursor = Math.max(cursor, b.endMin);
    if (cursor >= endMin) break;
  }
  if (cursor < endMin) gaps.push({ startMin: cursor, endMin });
  return gaps.filter((g) => g.endMin - g.startMin >= minGap);
}

// ── Lectura ─────────────────────────────────────────────────

// Supabase devuelve `time` como "HH:MM:SS"; lo recortamos a "HH:MM".
function hhmm(t: string): string {
  const [h, m] = t.split(':');
  return `${(h ?? '00').padStart(2, '0')}:${(m ?? '00').padStart(2, '0')}`;
}

export async function getRoutines(): Promise<Routine[]> {
  const { data, error } = await supabase
    .from('routines')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw asError(error);
  return (data as Routine[]).map((r) => ({
    ...r,
    day_start_time: hhmm(r.day_start_time ?? '08:00'),
    day_end_time: hhmm(r.day_end_time ?? '00:00'),
  }));
}

export async function getActiveRoutine(): Promise<Routine | null> {
  const routines = await getRoutines();
  return routines.find((r) => r.is_active) ?? routines[0] ?? null;
}

export async function getBlocks(routineId: string): Promise<Block[]> {
  const { data, error } = await supabase
    .from('blocks')
    .select('*')
    .eq('routine_id', routineId)
    .order('start_time', { ascending: true })
    .order('pos', { ascending: true });
  if (error) throw asError(error);
  return (data as Block[]).map((b) => ({ ...b, start_time: hhmm(b.start_time) }));
}

export async function getDayOffset(routineId: string, day = todayStr()): Promise<number> {
  const { data, error } = await supabase
    .from('routine_day_state')
    .select('offset_min')
    .eq('routine_id', routineId)
    .eq('day', day)
    .maybeSingle();
  if (error) throw asError(error);
  return data?.offset_min ?? 0;
}

// Estado del día completo: corrimiento + override de la ventana (despertar/dormir).
export async function getDayState(routineId: string, day = todayStr()): Promise<DayState> {
  const { data, error } = await supabase
    .from('routine_day_state')
    .select('offset_min, day_start_override, day_end_override')
    .eq('routine_id', routineId)
    .eq('day', day)
    .maybeSingle();
  if (error) throw asError(error);
  return {
    offset_min: data?.offset_min ?? 0,
    day_start_override: data?.day_start_override ? hhmm(data.day_start_override) : null,
    day_end_override: data?.day_end_override ? hhmm(data.day_end_override) : null,
  };
}

// Override de la ventana del día (solo ese día). null = vuelve al default de la rutina.
export async function setDayWindowOverride(
  routineId: string,
  day: string,
  start: string | null,
  end: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('routine_day_state')
    .upsert(
      { routine_id: routineId, day, day_start_override: start, day_end_override: end },
      { onConflict: 'routine_id,day' },
    );
  if (error) throw asError(error);
}

// Ventana del día por defecto de la rutina.
export async function setRoutineDayWindow(
  routineId: string,
  start: string,
  end: string,
): Promise<void> {
  const { error } = await supabase
    .from('routines')
    .update({ day_start_time: start, day_end_time: end })
    .eq('id', routineId);
  if (error) throw asError(error);
}

// ── Ediciones de un bloque/hábito por día ───────────────────

export async function getBlockDayEdits(routineId: string, day = todayStr()): Promise<EditMap> {
  try {
    const { data, error } = await supabase
      .from('block_day_edits')
      .select('ref_type, ref_id, skipped, start_override, duration_override')
      .eq('routine_id', routineId)
      .eq('day', day);
    if (error) throw asError(error);
    const map: EditMap = new Map();
    for (const e of data as BlockDayEdit[]) {
      map.set(editKey(e.ref_type, e.ref_id), {
        ...e,
        start_override: e.start_override ? hhmm(e.start_override) : null,
      });
    }
    return map;
  } catch {
    return new Map(); // la tabla todavía no existe → sin ediciones
  }
}

export async function setBlockDayEdit(
  routineId: string,
  day: string,
  refType: 'block' | 'habit',
  refId: string,
  patch: Partial<Pick<BlockDayEdit, 'skipped' | 'start_override' | 'duration_override'>>,
): Promise<void> {
  const { error } = await supabase.from('block_day_edits').upsert(
    { routine_id: routineId, day, ref_type: refType, ref_id: refId, ...patch },
    { onConflict: 'day,ref_type,ref_id' },
  );
  if (error) throw asError(error);
}

// Borra todas las ediciones del día para ese bloque/hábito (lo devuelve al original).
export async function clearBlockDayEdit(
  day: string,
  refType: 'block' | 'habit',
  refId: string,
): Promise<void> {
  const { error } = await supabase
    .from('block_day_edits')
    .delete()
    .eq('day', day)
    .eq('ref_type', refType)
    .eq('ref_id', refId);
  if (error) throw asError(error);
}

export async function getDoneBlockIds(day = todayStr()): Promise<string[]> {
  const { data, error } = await supabase
    .from('block_log')
    .select('block_id')
    .eq('day', day)
    .eq('done', true);
  if (error) throw asError(error);
  return (data as { block_id: string }[]).map((r) => r.block_id);
}

export async function getIdeas(day = todayStr()): Promise<Idea[]> {
  const { data, error } = await supabase
    .from('ideas')
    .select('*')
    .eq('day', day)
    .order('created_at', { ascending: false });
  if (error) throw asError(error);
  return data as Idea[];
}

// ── Rutinas / contexto ──────────────────────────────────────

export async function createRoutine(name: string, context: string): Promise<string> {
  const { data, error } = await supabase
    .from('routines')
    .insert({ name, context })
    .select('id')
    .single();
  if (error) throw asError(error);
  return (data as { id: string }).id;
}

export async function renameRoutine(id: string, name: string, context: string): Promise<void> {
  const { error } = await supabase.from('routines').update({ name, context }).eq('id', id);
  if (error) throw asError(error);
}

export async function setActiveRoutine(routineId: string): Promise<void> {
  const off = await supabase.from('routines').update({ is_active: false }).neq('id', routineId);
  if (off.error) throw asError(off.error);
  const on = await supabase.from('routines').update({ is_active: true }).eq('id', routineId);
  if (on.error) throw asError(on.error);
}

export async function deleteRoutine(id: string): Promise<void> {
  const { error } = await supabase.from('routines').delete().eq('id', id);
  if (error) throw asError(error);
}

// ── Bloques ─────────────────────────────────────────────────

export async function createBlock(routineId: string, b: Partial<Block>): Promise<void> {
  const { error } = await supabase.from('blocks').insert({
    routine_id: routineId,
    name: b.name?.trim() || 'Bloque',
    description: b.description?.trim() || null,
    start_time: b.start_time || '08:00',
    duration_min: b.duration_min && b.duration_min > 0 ? Math.round(b.duration_min) : 30,
    pos: b.pos ?? 0,
    habit_id: b.habit_id ?? null,
    kind: b.kind ?? 'task',
  });
  if (error) throw asError(error);
}

export async function updateBlock(id: string, patch: Partial<Block>): Promise<void> {
  const clean: Record<string, unknown> = {};
  if (patch.name !== undefined) clean.name = patch.name.trim() || 'Bloque';
  if (patch.description !== undefined) clean.description = patch.description?.trim() || null;
  if (patch.start_time !== undefined) clean.start_time = patch.start_time;
  if (patch.duration_min !== undefined)
    clean.duration_min = patch.duration_min > 0 ? Math.round(patch.duration_min) : 1;
  if (patch.pos !== undefined) clean.pos = patch.pos;
  if (patch.habit_id !== undefined) clean.habit_id = patch.habit_id;
  if (patch.kind !== undefined) clean.kind = patch.kind;
  const { error } = await supabase.from('blocks').update(clean).eq('id', id);
  if (error) throw asError(error);
}

export async function deleteBlock(id: string): Promise<void> {
  const { error } = await supabase.from('blocks').delete().eq('id', id);
  if (error) throw asError(error);
}

// Marcar/desmarcar un bloque como hecho en un día. Si está enlazado a un hábito,
// lo marca/desmarca también en la montaña (ese mismo día).
export async function setBlockDone(
  block: Block,
  done: boolean,
  day = todayStr(),
): Promise<void> {
  if (done) {
    const { error } = await supabase
      .from('block_log')
      .upsert({ block_id: block.id, day, done: true }, { onConflict: 'block_id,day' });
    if (error) throw asError(error);
    if (block.habit_id) await setCheckin(block.habit_id, day, 'done');
  } else {
    const { error } = await supabase
      .from('block_log')
      .delete()
      .eq('block_id', block.id)
      .eq('day', day);
    if (error) throw asError(error);
    if (block.habit_id) await clearCheckin(block.habit_id, day);
  }
}

// ── Aplazar todo ────────────────────────────────────────────

export async function postponeAll(
  routineId: string,
  minutes: number,
  day = todayStr(),
): Promise<void> {
  const current = await getDayOffset(routineId, day);
  const { error } = await supabase
    .from('routine_day_state')
    .upsert(
      { routine_id: routineId, day, offset_min: current + minutes },
      { onConflict: 'routine_id,day' },
    );
  if (error) throw asError(error);
}

export async function resetDayOffset(routineId: string, day = todayStr()): Promise<void> {
  const { error } = await supabase
    .from('routine_day_state')
    .upsert({ routine_id: routineId, day, offset_min: 0 }, { onConflict: 'routine_id,day' });
  if (error) throw asError(error);
}

// ── Horarios de hábito por contexto/rutina ──────────────────

export async function getHabitSchedules(routineId: string): Promise<HabitSchedule[]> {
  const { data, error } = await supabase
    .from('habit_schedules')
    .select('*')
    .eq('routine_id', routineId);
  if (error) throw asError(error);
  return (data as HabitSchedule[]).map((s) => ({ ...s, start_time: hhmm(s.start_time) }));
}

export async function getHabitSchedulesForHabit(habitId: string): Promise<HabitSchedule[]> {
  const { data, error } = await supabase
    .from('habit_schedules')
    .select('*')
    .eq('habit_id', habitId);
  if (error) throw asError(error);
  return (data as HabitSchedule[]).map((s) => ({ ...s, start_time: hhmm(s.start_time) }));
}

export async function setHabitSchedule(
  habitId: string,
  routineId: string,
  startTime: string,
  durationMin: number,
): Promise<void> {
  const { error } = await supabase.from('habit_schedules').upsert(
    {
      habit_id: habitId,
      routine_id: routineId,
      start_time: startTime,
      duration_min: durationMin > 0 ? Math.round(durationMin) : 30,
    },
    { onConflict: 'habit_id,routine_id' },
  );
  if (error) throw asError(error);
}

export async function clearHabitSchedule(habitId: string, routineId: string): Promise<void> {
  const { error } = await supabase
    .from('habit_schedules')
    .delete()
    .eq('habit_id', habitId)
    .eq('routine_id', routineId);
  if (error) throw asError(error);
}

// Estado de cada hábito en un día (para saber si el bloque proyectado va tildado).
export async function getHabitStatesForDay(
  day = todayStr(),
): Promise<Record<string, CheckinState>> {
  const { data, error } = await supabase
    .from('checkins')
    .select('habit_id,state')
    .eq('day', day);
  if (error) throw asError(error);
  const map: Record<string, CheckinState> = {};
  for (const c of data as { habit_id: string; state: CheckinState }[]) map[c.habit_id] = c.state;
  return map;
}

// ── Checklist (mini-tareas del bloque) ──────────────────────

// Ítems de varios bloques de una. Devuelve la plantilla (sin estado de tildado).
export async function getBlockItems(blockIds: string[]): Promise<BlockItem[]> {
  if (blockIds.length === 0) return [];
  const { data, error } = await supabase
    .from('block_items')
    .select('*')
    .in('block_id', blockIds)
    .order('pos', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw asError(error);
  return data as BlockItem[];
}

export async function getDoneItemIds(day = todayStr()): Promise<string[]> {
  const { data, error } = await supabase
    .from('block_item_log')
    .select('item_id')
    .eq('day', day)
    .eq('done', true);
  if (error) throw asError(error);
  return (data as { item_id: string }[]).map((r) => r.item_id);
}

export async function createBlockItem(blockId: string, text: string, pos = 0): Promise<void> {
  const t = text.trim();
  if (!t) return;
  const { error } = await supabase.from('block_items').insert({ block_id: blockId, text: t, pos });
  if (error) throw asError(error);
}

export async function updateBlockItem(id: string, text: string): Promise<void> {
  const { error } = await supabase
    .from('block_items')
    .update({ text: text.trim() || '—' })
    .eq('id', id);
  if (error) throw asError(error);
}

export async function deleteBlockItem(id: string): Promise<void> {
  const { error } = await supabase.from('block_items').delete().eq('id', id);
  if (error) throw asError(error);
}

// Tildar/destildar una mini-tarea para hoy.
export async function setItemDone(itemId: string, done: boolean): Promise<void> {
  if (done) {
    const { error } = await supabase
      .from('block_item_log')
      .upsert({ item_id: itemId, day: todayStr(), done: true }, { onConflict: 'item_id,day' });
    if (error) throw asError(error);
  } else {
    const { error } = await supabase
      .from('block_item_log')
      .delete()
      .eq('item_id', itemId)
      .eq('day', todayStr());
    if (error) throw asError(error);
  }
}

// ── Ideas ───────────────────────────────────────────────────

export async function addIdea(text: string, blockId?: string | null): Promise<void> {
  const t = text.trim();
  if (!t) return;
  const { error } = await supabase.from('ideas').insert({ text: t, block_id: blockId ?? null });
  if (error) throw asError(error);
}

export async function toggleIdeaDone(id: string, done: boolean): Promise<void> {
  const { error } = await supabase.from('ideas').update({ done }).eq('id', id);
  if (error) throw asError(error);
}

export async function deleteIdea(id: string): Promise<void> {
  const { error } = await supabase.from('ideas').delete().eq('id', id);
  if (error) throw asError(error);
}
