import { supabase } from './supabaseClient';
import { asError, todayStr } from './habits';
import type { Thought, ThoughtKind, Emotion, ThoughtStatus } from './types';

// ── Catálogo de emociones (etiqueta + color del badge) ──────
export const EMOTIONS: { value: Emotion; label: string; dot: string; chip: string }[] = [
  { value: 'ansiedad', label: 'Ansiedad', dot: 'bg-amber-400', chip: 'border-amber-400/40 text-amber-200' },
  { value: 'culpa', label: 'Culpa', dot: 'bg-violet-400', chip: 'border-violet-400/40 text-violet-200' },
  { value: 'bronca', label: 'Bronca', dot: 'bg-rose-400', chip: 'border-rose-400/40 text-rose-200' },
  { value: 'miedo', label: 'Miedo', dot: 'bg-indigo-400', chip: 'border-indigo-400/40 text-indigo-200' },
  { value: 'tristeza', label: 'Tristeza', dot: 'bg-sky-400', chip: 'border-sky-400/40 text-sky-200' },
  { value: 'otra', label: 'Otra', dot: 'bg-slate-400', chip: 'border-slate-400/40 text-slate-300' },
];

export function emotionMeta(e: Emotion | null) {
  return EMOTIONS.find((x) => x.value === e) ?? null;
}

export const KIND_LABEL: Record<ThoughtKind, string> = {
  task: 'Tarea pendiente',
  emotion: 'Pensamiento / emoción',
  note: 'Nota',
};

// ── Lectura ─────────────────────────────────────────────────

export async function getThoughts(): Promise<Thought[]> {
  const { data, error } = await supabase
    .from('thoughts')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw asError(error);
  return data as Thought[];
}

// ── Escritura ───────────────────────────────────────────────

// Captura rápida. Una tarea entra lista para agendar; un pensamiento entra a la
// bandeja para procesar tranquilo más tarde.
export async function addThought(input: {
  text: string;
  kind: ThoughtKind;
  emotion?: Emotion | null;
  intensity?: number | null;
}): Promise<void> {
  const t = input.text.trim();
  if (!t) return;
  const { error } = await supabase.from('thoughts').insert({
    text: t,
    kind: input.kind,
    emotion: input.kind === 'emotion' ? (input.emotion ?? null) : null,
    intensity: input.kind === 'emotion' ? (input.intensity ?? null) : null,
    status: 'inbox',
  });
  if (error) throw asError(error);
}

export async function updateThought(
  id: string,
  patch: Partial<
    Pick<
      Thought,
      | 'text'
      | 'kind'
      | 'emotion'
      | 'intensity'
      | 'controllable'
      | 'status'
      | 'action_text'
      | 'due_date'
    >
  >,
): Promise<void> {
  const clean: Record<string, unknown> = { ...patch };
  if (typeof clean.text === 'string') clean.text = (clean.text as string).trim() || '—';
  if (typeof clean.action_text === 'string')
    clean.action_text = (clean.action_text as string).trim() || null;
  const { error } = await supabase.from('thoughts').update(clean).eq('id', id);
  if (error) throw asError(error);
}

// Marca un pensamiento/tarea como procesado y le fija el estado final.
export async function processThought(
  id: string,
  patch: Partial<
    Pick<Thought, 'kind' | 'emotion' | 'intensity' | 'controllable' | 'action_text' | 'due_date'>
  > & { status: ThoughtStatus },
): Promise<void> {
  const { error } = await supabase
    .from('thoughts')
    .update({ ...patch, processed_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw asError(error);
}

export async function deleteThought(id: string): Promise<void> {
  const { error } = await supabase.from('thoughts').delete().eq('id', id);
  if (error) throw asError(error);
}

// ── Resumen semanal (calculado en cliente) ──────────────────

export interface WeekSummary {
  withAction: number; // resueltas con acción esta semana
  released: number; // soltadas (no control) esta semana
  topEmotion: { emotion: Emotion; count: number } | null;
}

export function weekSummary(thoughts: Thought[], ref = new Date()): WeekSummary {
  // Lunes de esta semana a las 00:00.
  const monday = new Date(ref);
  const dow = (monday.getDay() + 6) % 7; // 0 = lunes
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - dow);
  const from = monday.getTime();

  const inWeek = (t: Thought) => new Date(t.processed_at ?? t.created_at).getTime() >= from;

  let withAction = 0;
  let released = 0;
  const emoCount = new Map<Emotion, number>();
  for (const t of thoughts) {
    if (!inWeek(t)) continue;
    if (t.status === 'action' || t.status === 'done') withAction++;
    if (t.status === 'released') released++;
    if (t.emotion) emoCount.set(t.emotion, (emoCount.get(t.emotion) ?? 0) + 1);
  }

  let topEmotion: WeekSummary['topEmotion'] = null;
  for (const [emotion, count] of emoCount) {
    if (!topEmotion || count > topEmotion.count) topEmotion = { emotion, count };
  }
  return { withAction, released, topEmotion };
}

// Fecha amigable para mostrar (Hoy / Mañana / "mar 16 jun").
export function dueLabel(due: string | null): string | null {
  if (!due) return null;
  const t = todayStr();
  const [y, m, d] = due.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const tomorrow = todayStr(new Date(Date.now() + 86400000));
  if (due === t) return 'Hoy';
  if (due === tomorrow) return 'Mañana';
  const dow = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'][dt.getDay()];
  const mon = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][
    m - 1
  ];
  return `${dow} ${d} ${mon}`;
}
