import { supabase } from './supabaseClient';
import { asError, todayStr, setToday, clearToday } from './habits';
import type { Routine, Block, BlockItem, Idea, TimedBlock, ActiveBlockInfo } from './types';

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

// segundos → "MM:SS" o "H:MM:SS".
export function fmtDuration(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// Resuelve los bloques a horario real: aplica el offset del día y marca los hechos.
export function layoutBlocks(blocks: Block[], offsetMin: number, doneIds: string[]): TimedBlock[] {
  const done = new Set(doneIds);
  return blocks
    .map((b) => {
      const startMin = timeToMin(b.start_time) + offsetMin;
      return { ...b, startMin, endMin: startMin + b.duration_min, done: done.has(b.id) };
    })
    .sort((a, b) => a.startMin - b.startMin || a.pos - b.pos);
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
  return data as Routine[];
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

// Marcar/desmarcar un bloque como hecho hoy. Si está enlazado a un hábito, lo
// marca/desmarca también en la montaña (reusa setToday/clearToday).
export async function setBlockDone(block: Block, done: boolean): Promise<void> {
  if (done) {
    const { error } = await supabase
      .from('block_log')
      .upsert({ block_id: block.id, day: todayStr(), done: true }, { onConflict: 'block_id,day' });
    if (error) throw asError(error);
    if (block.habit_id) await setToday(block.habit_id, 'done');
  } else {
    const { error } = await supabase
      .from('block_log')
      .delete()
      .eq('block_id', block.id)
      .eq('day', todayStr());
    if (error) throw asError(error);
    if (block.habit_id) await clearToday(block.habit_id);
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
