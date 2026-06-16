'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Square, Trash2 } from 'lucide-react';
import type { Thought } from '@/lib/types';
import {
  getThoughts,
  updateThought,
  deleteThought,
  emotionMeta,
  weekSummary,
  dueLabel,
} from '@/lib/thoughts';
import { PageContainer, ErrorBox } from '@/components/ui';
import ThoughtCapture from '@/components/estructura/ThoughtCapture';
import ThoughtProcess from '@/components/estructura/ThoughtProcess';

export default function Pensamientos() {
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<Thought | null>(null);

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

  // Tareas pendientes: las tareas que todavía no están hechas.
  const tasks = useMemo(
    () =>
      thoughts.filter(
        (t) => t.kind === 'task' && (t.status === 'inbox' || t.status === 'action'),
      ),
    [thoughts],
  );

  // Bandeja: pensamientos/emociones (o sin clasificar) capturados en el momento.
  const inbox = useMemo(
    () => thoughts.filter((t) => t.status === 'inbox' && t.kind !== 'task'),
    [thoughts],
  );

  // Registro: lo ya procesado (emociones soltadas, acciones, notas).
  const registro = useMemo(
    () => thoughts.filter((t) => t.kind !== 'task' && t.status !== 'inbox'),
    [thoughts],
  );

  const summary = useMemo(() => weekSummary(thoughts), [thoughts]);

  async function completeTask(t: Thought) {
    await updateThought(t.id, { status: t.status === 'done' ? 'inbox' : 'done' });
    await load();
  }
  async function remove(t: Thought) {
    await deleteThought(t.id);
    await load();
  }

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
      <h1 className="text-2xl font-semibold">Pensamientos y tareas</h1>
      <p className="mb-5 text-sm text-slate-400">
        Sacalo de la cabeza ahora. Después, tranquilo, lo procesás.
      </p>

      {/* Captura */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <ThoughtCapture onSaved={load} />
      </div>

      {/* Tareas pendientes */}
      <Section title="Tareas pendientes" count={tasks.length}>
        {tasks.length === 0 ? (
          <Empty>Sin tareas pendientes.</Empty>
        ) : (
          <ul className="space-y-1">
            {tasks.map((t) => (
              <li
                key={t.id}
                className="group flex items-center gap-2 rounded-lg px-1 py-1.5 text-sm hover:bg-white/5"
              >
                <button onClick={() => completeTask(t)} aria-label="Completar" className="shrink-0 text-slate-400 hover:text-emerald-400">
                  <Square className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setProcessing(t)}
                  className="min-w-0 flex-1 truncate text-left text-slate-200 hover:text-white"
                >
                  {t.text}
                </button>
                {t.due_date && (
                  <span className="shrink-0 rounded-md border border-white/10 px-1.5 py-0.5 text-[11px] text-slate-400">
                    {dueLabel(t.due_date)}
                  </span>
                )}
                <RemoveBtn onClick={() => remove(t)} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Bandeja para procesar */}
      <Section title="Para procesar" count={inbox.length} accent>
        {inbox.length === 0 ? (
          <Empty>Bandeja vacía = mente en calma. ✓</Empty>
        ) : (
          <ul className="space-y-1">
            {inbox.map((t) => {
              const em = emotionMeta(t.emotion);
              return (
                <li
                  key={t.id}
                  className="group flex items-center gap-2 rounded-lg px-1 py-1.5 text-sm hover:bg-white/5"
                >
                  {em && <span className={`h-2 w-2 shrink-0 rounded-full ${em.dot}`} />}
                  <button
                    onClick={() => setProcessing(t)}
                    className="min-w-0 flex-1 truncate text-left text-slate-200 hover:text-white"
                  >
                    {t.text}
                  </button>
                  {em && (
                    <span className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[11px] ${em.chip}`}>
                      {em.label}
                    </span>
                  )}
                  <button
                    onClick={() => setProcessing(t)}
                    className="shrink-0 rounded-md border border-white/15 px-2 py-0.5 text-[11px] text-slate-300 hover:bg-white/10"
                  >
                    procesar
                  </button>
                  <RemoveBtn onClick={() => remove(t)} />
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {/* Resumen de la semana */}
      <Section title="Esta semana">
        <div className="space-y-2 text-sm">
          <SummaryBar label="Resueltas con acción" value={summary.withAction} color="bg-emerald-500" />
          <SummaryBar label="Soltadas (no control)" value={summary.released} color="bg-sky-500" />
          <div className="text-slate-400">
            Emoción más repetida:{' '}
            {summary.topEmotion ? (
              <span className="text-slate-200">
                {emotionMeta(summary.topEmotion.emotion)?.label} · {summary.topEmotion.count}
              </span>
            ) : (
              <span className="text-slate-500">—</span>
            )}
          </div>
        </div>
      </Section>

      {/* Registro */}
      <Section title="Registro" count={registro.length}>
        {registro.length === 0 ? (
          <Empty>Todavía no procesaste nada.</Empty>
        ) : (
          <ul className="space-y-1.5">
            {registro.slice(0, 30).map((t) => {
              const em = emotionMeta(t.emotion);
              const outcome =
                t.status === 'released'
                  ? 'soltado'
                  : t.status === 'done'
                    ? 'hecho'
                    : t.status === 'archived'
                      ? 'descartado'
                      : 'acción';
              return (
                <li key={t.id} className="group flex items-center gap-2 px-1 text-sm">
                  {em && <span className={`h-2 w-2 shrink-0 rounded-full ${em.dot}`} />}
                  <span className="min-w-0 flex-1 truncate text-slate-300">
                    {t.text}
                    {t.action_text && <span className="text-slate-500"> → {t.action_text}</span>}
                  </span>
                  {em && t.intensity && (
                    <span className="shrink-0 text-[11px] text-slate-500">
                      {em.label} ({t.intensity})
                    </span>
                  )}
                  <span className="shrink-0 text-[11px] text-slate-500">· {outcome}</span>
                  <RemoveBtn onClick={() => remove(t)} />
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {processing && (
        <ThoughtProcess
          thought={processing}
          onDone={() => {
            setProcessing(null);
            load();
          }}
          onClose={() => setProcessing(null)}
        />
      )}
    </PageContainer>
  );
}

function Section({
  title,
  count,
  accent,
  children,
}: {
  title: string;
  count?: number;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center gap-2">
        <span className={`text-sm font-medium ${accent ? 'text-sky-300' : 'text-slate-400'}`}>
          {title}
        </span>
        {count != null && count > 0 && (
          <span className="rounded-full border border-white/10 px-1.5 text-[11px] text-slate-400">
            {count}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-1 text-sm text-slate-500">{children}</p>;
}

function RemoveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Borrar"
      className="shrink-0 text-slate-600 opacity-0 hover:text-rose-400 group-hover:opacity-100"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}

function SummaryBar({ label, value, color }: { label: string; value: number; color: string }) {
  const width = Math.min(100, value * 12.5); // 8 = lleno
  return (
    <div className="flex items-center gap-3">
      <span className="w-44 shrink-0 text-slate-400">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
      </div>
      <span className="w-6 shrink-0 text-right tabular-nums text-slate-300">{value}</span>
    </div>
  );
}
