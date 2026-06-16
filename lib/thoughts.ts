import { supabase } from './supabaseClient';
import { asError, todayStr } from './habits';
import type { Thought, ThoughtKind, Emotion, ThoughtStatus } from './types';

// ── Catálogo de emociones ────────────────────────────────────
export const EMOTIONS: {
  value: Emotion;
  label: string;
  emoji: string;
  dot: string;
  chip: string;
  cardBorder: string;
  cardBg: string;
  activePill: string;
}[] = [
  {
    value: 'ansiedad',
    label: 'Ansiedad',
    emoji: '😰',
    dot: 'bg-amber-400',
    chip: 'border-amber-400/40 text-amber-300',
    cardBorder: 'border-l-amber-500',
    cardBg: 'bg-amber-500/10',
    activePill: 'bg-amber-500/20 border-amber-400/60 text-amber-200',
  },
  {
    value: 'culpa',
    label: 'Culpa',
    emoji: '😔',
    dot: 'bg-violet-400',
    chip: 'border-violet-400/40 text-violet-300',
    cardBorder: 'border-l-violet-500',
    cardBg: 'bg-violet-500/10',
    activePill: 'bg-violet-500/20 border-violet-400/60 text-violet-200',
  },
  {
    value: 'bronca',
    label: 'Bronca',
    emoji: '😤',
    dot: 'bg-rose-400',
    chip: 'border-rose-400/40 text-rose-300',
    cardBorder: 'border-l-rose-500',
    cardBg: 'bg-rose-500/10',
    activePill: 'bg-rose-500/20 border-rose-400/60 text-rose-200',
  },
  {
    value: 'miedo',
    label: 'Miedo',
    emoji: '😨',
    dot: 'bg-indigo-400',
    chip: 'border-indigo-400/40 text-indigo-300',
    cardBorder: 'border-l-indigo-500',
    cardBg: 'bg-indigo-500/10',
    activePill: 'bg-indigo-500/20 border-indigo-400/60 text-indigo-200',
  },
  {
    value: 'tristeza',
    label: 'Tristeza',
    emoji: '😢',
    dot: 'bg-sky-400',
    chip: 'border-sky-400/40 text-sky-300',
    cardBorder: 'border-l-sky-500',
    cardBg: 'bg-sky-500/10',
    activePill: 'bg-sky-500/20 border-sky-400/60 text-sky-200',
  },
  {
    value: 'otra',
    label: 'Otra',
    emoji: '💭',
    dot: 'bg-slate-400',
    chip: 'border-slate-400/40 text-slate-300',
    cardBorder: 'border-l-slate-500',
    cardBg: 'bg-slate-500/10',
    activePill: 'bg-slate-500/20 border-slate-400/60 text-slate-200',
  },
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
    Pick<Thought, 'text' | 'kind' | 'emotion' | 'intensity' | 'controllable' | 'status' | 'action_text' | 'due_date'>
  >,
): Promise<void> {
  const clean: Record<string, unknown> = { ...patch };
  if (typeof clean.text === 'string') clean.text = (clean.text as string).trim() || '—';
  if (typeof clean.action_text === 'string')
    clean.action_text = (clean.action_text as string).trim() || null;
  const { error } = await supabase.from('thoughts').update(clean).eq('id', id);
  if (error) throw asError(error);
}

export async function processThought(
  id: string,
  patch: Partial<Pick<Thought, 'kind' | 'emotion' | 'intensity' | 'controllable' | 'action_text' | 'due_date'>> & {
    status: ThoughtStatus;
  },
): Promise<void> {
  const { error } = await supabase
    .from('thoughts')
    .update({ ...patch, processed_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw asError(error);
}

// Crea la tarea en thoughts y marca la emoción como "tomé acción".
export async function assignTaskToEmotion(emotionId: string, taskText: string): Promise<void> {
  const t = taskText.trim();
  if (!t) return;
  const { error: e1 } = await supabase.from('thoughts').insert({
    text: t,
    kind: 'task',
    status: 'inbox',
  });
  if (e1) throw asError(e1);
  const { error: e2 } = await supabase
    .from('thoughts')
    .update({
      status: 'action',
      action_text: t,
      controllable: true,
      processed_at: new Date().toISOString(),
    })
    .eq('id', emotionId);
  if (e2) throw asError(e2);
}

// Marca un pensamiento como "no depende de mí / soltado".
export async function releaseEmotion(id: string): Promise<void> {
  const { error } = await supabase
    .from('thoughts')
    .update({ status: 'released', controllable: false, processed_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw asError(error);
}

export async function deleteThought(id: string): Promise<void> {
  const { error } = await supabase.from('thoughts').delete().eq('id', id);
  if (error) throw asError(error);
}

// ── Fecha amigable ───────────────────────────────────────────

export function dueLabel(due: string | null): string | null {
  if (!due) return null;
  const t = todayStr();
  const [y, m, d] = due.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const tomorrow = todayStr(new Date(Date.now() + 86400000));
  if (due === t) return 'Hoy';
  if (due === tomorrow) return 'Mañana';
  const dow = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'][dt.getDay()];
  const mon = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][m - 1];
  return `${dow} ${d} ${mon}`;
}
