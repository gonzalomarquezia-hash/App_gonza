'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Trash2, Calendar } from 'lucide-react';
import type { Thought, Emotion } from '@/lib/types';
import {
  getThoughts,
  addThought,
  updateThought,
  deleteThought,
  assignTaskToEmotion,
  releaseEmotion,
  emotionMeta,
  EMOTIONS,
  dueLabel,
} from '@/lib/thoughts';
import { todayStr } from '@/lib/habits';
import { PageContainer, ErrorBox } from '@/components/ui';

type Tab = 'tasks' | 'emotions';

export default function Pensamientos() {
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('tasks');

  const load = useCallback(async () => {
    try {
      setError(null);
      setThoughts(await getThoughts());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const tasks = useMemo(() => thoughts.filter((t) => t.kind === 'task'), [thoughts]);
  const emotions = useMemo(() => thoughts.filter((t) => t.kind === 'emotion'), [thoughts]);

  if (loading)
    return (
      <PageContainer>
        <p className="text-slate-400">Cargando…</p>
      </PageContainer>
    );
  if (error)
    return (
      <PageContainer>
        <ErrorBox msg={error} />
      </PageContainer>
    );

  return (
    <PageContainer>
      <h1 className="text-2xl font-bold">
        <span className="bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">
          Pensamientos
        </span>{' '}
        <span className="font-semibold text-white">y tareas</span>
      </h1>
      <p className="mb-5 text-sm text-slate-400">
        Sacalo de la cabeza ahora. Después, tranquilo, lo procesás.
      </p>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-2xl border border-white/10 bg-white/5 p-1">
        <TabPill active={tab === 'tasks'} onClick={() => setTab('tasks')} activeClass="bg-emerald-500/20 text-emerald-200 border-emerald-500/30">
          Tareas
        </TabPill>
        <TabPill active={tab === 'emotions'} onClick={() => setTab('emotions')} activeClass="bg-indigo-500/20 text-indigo-200 border-indigo-500/30">
          Pensamientos
        </TabPill>
      </div>

      {tab === 'tasks' && <TasksTab thoughts={tasks} onRefresh={load} />}
      {tab === 'emotions' && <EmotionsTab thoughts={emotions} onRefresh={load} />}
    </PageContainer>
  );
}

// ── Tab Tareas ───────────────────────────────────────────────

function TasksTab({ thoughts, onRefresh }: { thoughts: Thought[]; onRefresh: () => void }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const pending = thoughts.filter((t) => t.status !== 'done' && t.status !== 'archived');
  const done = thoughts.filter((t) => t.status === 'done');
  const withDate = pending.filter((t) => t.due_date).sort((a, b) => (a.due_date! > b.due_date! ? 1 : -1));
  const noDate = pending.filter((t) => !t.due_date);

  async function add() {
    const t = text.trim();
    if (!t) return;
    setBusy(true);
    setErr(null);
    try {
      await addThought({ text: t, kind: 'task' });
      setText('');
      onRefresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {/* Captura */}
      <div className="mb-6 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="¿Qué tenés pendiente?"
          className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm outline-none placeholder:text-slate-500 focus:border-emerald-400/50"
        />
        <button
          onClick={add}
          disabled={busy || !text.trim()}
          className="shrink-0 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-40"
        >
          + Agregar
        </button>
      </div>
      {err && <p className="mb-3 text-xs text-rose-400">{err}</p>}

      {/* Sin fecha */}
      {noDate.length > 0 && (
        <div className="mb-5">
          <div className="mb-2 text-xs font-medium uppercase tracking-widest text-slate-500">
            Sin fecha programada · {noDate.length}
          </div>
          <ul className="space-y-1.5">
            {noDate.map((t) => (
              <TaskRow key={t.id} thought={t} onRefresh={onRefresh} />
            ))}
          </ul>
        </div>
      )}

      {/* Con fecha */}
      {withDate.length > 0 && (
        <div className="mb-5">
          <div className="mb-2 text-xs font-medium uppercase tracking-widest text-slate-500">
            Programadas
          </div>
          <ul className="space-y-1.5">
            {withDate.map((t) => (
              <TaskRow key={t.id} thought={t} onRefresh={onRefresh} />
            ))}
          </ul>
        </div>
      )}

      {pending.length === 0 && (
        <p className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-300">
          Sin tareas pendientes. ✓ La mente en calma.
        </p>
      )}

      {/* Hechas */}
      {done.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs text-slate-600 hover:text-slate-400">
            Completadas ({done.length})
          </summary>
          <ul className="mt-2 space-y-1 opacity-50">
            {done.map((t) => (
              <TaskRow key={t.id} thought={t} onRefresh={onRefresh} />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function TaskRow({ thought, onRefresh }: { thought: Thought; onRefresh: () => void }) {
  const [showDate, setShowDate] = useState(false);
  const [busy, setBusy] = useState(false);
  const isDone = thought.status === 'done';

  async function toggleDone() {
    setBusy(true);
    try {
      await updateThought(thought.id, { status: isDone ? 'inbox' : 'done' });
      onRefresh();
    } finally {
      setBusy(false);
    }
  }

  async function setDate(date: string) {
    setBusy(true);
    try {
      await updateThought(thought.id, { due_date: date || null });
      setShowDate(false);
      onRefresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm('¿Borrar tarea?')) return;
    await deleteThought(thought.id);
    onRefresh();
  }

  return (
    <li className="group flex items-center gap-2 rounded-xl border border-white/8 bg-white/4 px-3 py-2.5 text-sm hover:border-white/15 hover:bg-white/8">
      {/* Checkbox */}
      <button
        onClick={toggleDone}
        disabled={busy}
        aria-label="Completar"
        className="shrink-0 text-slate-500 hover:text-emerald-400 disabled:opacity-40"
      >
        <span className={`flex h-5 w-5 items-center justify-center rounded-md border text-xs ${isDone ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300' : 'border-white/20'}`}>
          {isDone && '✓'}
        </span>
      </button>

      {/* Texto */}
      <span className={`min-w-0 flex-1 ${isDone ? 'text-slate-500 line-through' : 'text-slate-100'}`}>
        {thought.text}
        {thought.action_text && thought.text !== thought.action_text && (
          <span className="ml-1 text-xs text-slate-500">← {thought.action_text}</span>
        )}
      </span>

      {/* Fecha */}
      {thought.due_date && !showDate && (
        <button
          onClick={() => setShowDate(true)}
          className="shrink-0 rounded-lg border border-white/10 px-1.5 py-0.5 text-[11px] text-slate-400 hover:border-white/20 hover:text-slate-200"
        >
          {dueLabel(thought.due_date)}
        </button>
      )}
      {!thought.due_date && !showDate && (
        <button
          onClick={() => setShowDate(true)}
          aria-label="Agregar fecha"
          className="shrink-0 text-slate-600 opacity-0 hover:text-slate-300 group-hover:opacity-100"
        >
          <Calendar className="h-3.5 w-3.5" />
        </button>
      )}
      {showDate && (
        <input
          type="date"
          defaultValue={thought.due_date ?? ''}
          min={todayStr()}
          autoFocus
          onChange={(e) => setDate(e.target.value)}
          onBlur={() => setShowDate(false)}
          className="rounded-lg border border-white/15 bg-slate-900 px-2 py-0.5 text-xs text-slate-100 outline-none"
        />
      )}

      {/* Borrar */}
      <button
        onClick={remove}
        aria-label="Borrar"
        className="shrink-0 text-slate-700 opacity-0 hover:text-rose-400 group-hover:opacity-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}

// ── Tab Pensamientos / Emociones ─────────────────────────────

function EmotionsTab({ thoughts, onRefresh }: { thoughts: Thought[]; onRefresh: () => void }) {
  const [text, setText] = useState('');
  const [emotion, setEmotion] = useState<Emotion>('ansiedad');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const inbox = thoughts.filter((t) => t.status === 'inbox');
  const actioned = thoughts.filter((t) => t.status === 'action');
  const released = thoughts.filter((t) => t.status === 'released');

  async function add() {
    const t = text.trim();
    if (!t) return;
    setBusy(true);
    setErr(null);
    try {
      await addThought({ text: t, kind: 'emotion', emotion });
      setText('');
      onRefresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {/* Captura */}
      <div className="mb-6 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4">
        <div className="flex flex-wrap gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="¿Qué se te cruzó por la cabeza?"
            className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-slate-500 focus:border-indigo-400/50"
          />
          <EmotionSelect value={emotion} onChange={setEmotion} />
          <button
            onClick={add}
            disabled={busy || !text.trim()}
            className="shrink-0 rounded-xl border border-indigo-400/40 bg-indigo-500/15 px-4 py-2 text-sm font-medium text-indigo-200 hover:bg-indigo-500/25 disabled:opacity-40"
          >
            Soltar
          </button>
        </div>
        {err && <p className="mt-2 text-xs text-rose-400">{err}</p>}
      </div>

      {/* Sin revisar */}
      {inbox.length > 0 && (
        <EmotionGroup
          title="Sin revisar"
          count={inbox.length}
          titleColor="text-white"
          thoughts={inbox}
          onRefresh={onRefresh}
        />
      )}

      {/* Tomé acción */}
      {actioned.length > 0 && (
        <EmotionGroup
          title="Tomé acción"
          count={actioned.length}
          titleColor="text-emerald-400"
          thoughts={actioned}
          onRefresh={onRefresh}
        />
      )}

      {/* Lo solté */}
      {released.length > 0 && (
        <EmotionGroup
          title="Lo solté"
          count={released.length}
          titleColor="text-sky-400"
          thoughts={released}
          onRefresh={onRefresh}
        />
      )}

      {thoughts.length === 0 && (
        <p className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 text-sm text-indigo-300">
          Bandeja vacía. La mente en calma. ✓
        </p>
      )}
    </div>
  );
}

function EmotionGroup({
  title,
  count,
  titleColor,
  thoughts,
  onRefresh,
}: {
  title: string;
  count: number;
  titleColor: string;
  thoughts: Thought[];
  onRefresh: () => void;
}) {
  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center gap-2">
        <span className={`text-sm font-medium ${titleColor}`}>{title}</span>
        <span className="rounded-full border border-white/10 px-1.5 text-[11px] text-slate-500">
          {count}
        </span>
      </div>
      <div className="space-y-2">
        {thoughts.map((t) => (
          <EmotionCard key={t.id} thought={t} onRefresh={onRefresh} />
        ))}
      </div>
    </div>
  );
}

function EmotionCard({ thought, onRefresh }: { thought: Thought; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [taskText, setTaskText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const em = emotionMeta(thought.emotion);
  const isInbox = thought.status === 'inbox';
  const isAction = thought.status === 'action';
  const isReleased = thought.status === 'released';

  async function createTask() {
    if (!taskText.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      await assignTaskToEmotion(thought.id, taskText);
      setTaskText('');
      setExpanded(false);
      onRefresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  async function release() {
    setBusy(true);
    setErr(null);
    try {
      await releaseEmotion(thought.id);
      setExpanded(false);
      onRefresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    await deleteThought(thought.id);
    onRefresh();
  }

  return (
    <div
      className={`group rounded-xl border border-l-4 ${em?.cardBorder ?? 'border-l-slate-500'} border-white/8 ${em?.cardBg ?? 'bg-white/5'} overflow-hidden transition-opacity ${isAction || isReleased ? 'opacity-60' : ''}`}
    >
      {/* Cabecera */}
      <div
        className={`flex items-start gap-3 px-4 py-3 ${isInbox ? 'cursor-pointer hover:bg-white/5' : ''}`}
        onClick={() => isInbox && setExpanded((v) => !v)}
      >
        <span className="mt-0.5 text-2xl leading-none">{em?.emoji ?? '💭'}</span>
        <div className="min-w-0 flex-1">
          <p className={`text-sm leading-snug ${isAction || isReleased ? 'text-slate-400 line-through' : 'text-slate-100'}`}>
            {thought.text}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {em && (
              <span className={`rounded-md border px-1.5 py-0.5 text-[11px] ${em.chip}`}>
                {em.label}
              </span>
            )}
            {thought.intensity && (
              <span className="text-[11px] text-slate-500">{thought.intensity}/5</span>
            )}
            {isAction && thought.action_text && (
              <span className="text-[11px] text-emerald-400">
                → {thought.action_text}
              </span>
            )}
            {isReleased && (
              <span className="text-[11px] text-sky-400">soltado</span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {isInbox && (
            <ChevronDown
              className={`h-4 w-4 text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              remove();
            }}
            aria-label="Borrar"
            className="text-slate-700 opacity-0 hover:text-rose-400 group-hover:opacity-100"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Expansión inline */}
      {expanded && isInbox && (
        <div className="border-t border-white/8 px-4 pb-3 pt-3">
          <p className="mb-2 text-xs text-slate-400">¿Está en tus manos?</p>
          <div className="flex gap-2">
            <input
              value={taskText}
              onChange={(e) => setTaskText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createTask()}
              placeholder="Crear tarea a partir de esto…"
              autoFocus
              className="min-w-0 flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm outline-none placeholder:text-slate-500 focus:border-emerald-400/50"
            />
            <button
              onClick={createTask}
              disabled={busy || !taskText.trim()}
              className="shrink-0 rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-40"
            >
              Tomé acción
            </button>
          </div>
          <button
            onClick={release}
            disabled={busy}
            className="mt-2 w-full rounded-lg border border-sky-400/30 bg-sky-500/5 px-3 py-1.5 text-xs text-sky-300 hover:bg-sky-500/10 disabled:opacity-40"
          >
            No depende de mí · soltar
          </button>
          {err && <p className="mt-1 text-xs text-rose-400">{err}</p>}
        </div>
      )}
    </div>
  );
}

// ── UI helpers ───────────────────────────────────────────────

function TabPill({
  active,
  onClick,
  activeClass,
  children,
}: {
  active: boolean;
  onClick: () => void;
  activeClass: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
        active ? activeClass : 'border-transparent text-slate-500 hover:text-slate-300'
      }`}
    >
      {children}
    </button>
  );
}

function EmotionSelect({ value, onChange }: { value: Emotion; onChange: (v: Emotion) => void }) {
  return (
    <div className="relative inline-flex shrink-0 items-center">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Emotion)}
        className="appearance-none rounded-xl border border-white/15 bg-white/5 py-2 pl-3 pr-8 text-sm text-slate-100 outline-none focus:border-indigo-400/50"
      >
        {EMOTIONS.map((e) => (
          <option key={e.value} value={e.value} className="bg-slate-900 text-slate-100">
            {e.emoji} {e.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 h-4 w-4 text-slate-400" />
    </div>
  );
}
