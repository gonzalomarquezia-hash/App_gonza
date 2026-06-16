'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Routine, Block, Idea, Habit } from '@/lib/types';
import {
  getRoutines,
  getBlocks,
  getDayOffset,
  getDoneBlockIds,
  getIdeas,
  setActiveRoutine,
  layoutBlocks,
  computeActive,
  minToClock,
} from '@/lib/estructura';
import { getHabits } from '@/lib/habits';
import { useNow } from '@/lib/useNow';
import { PageContainer, ErrorBox } from '@/components/ui';
import BigTimer from '@/components/estructura/BigTimer';
import Timeline from '@/components/estructura/Timeline';
import IdeaCapture from '@/components/estructura/IdeaCapture';
import PostponeBar from '@/components/estructura/PostponeBar';
import RoutineEditor from '@/components/estructura/RoutineEditor';
import FocusMode from '@/components/estructura/FocusMode';

const CONTEXT_ICON: Record<string, string> = { casa: '🏠', local: '🏪', otro: '📍' };

export default function Estructura() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [offset, setOffset] = useState(0);
  const [doneIds, setDoneIds] = useState<string[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<'up' | 'down'>('down');
  const [showEditor, setShowEditor] = useState(false);
  const [showFocus, setShowFocus] = useState(false);

  const now = useNow(1000);

  const load = useCallback(async () => {
    try {
      setError(null);
      const rs = await getRoutines();
      setRoutines(rs);
      const active = rs.find((r) => r.is_active) ?? rs[0] ?? null;
      if (active) {
        const [bs, off, done, ids, hs] = await Promise.all([
          getBlocks(active.id),
          getDayOffset(active.id),
          getDoneBlockIds(),
          getIdeas(),
          getHabits(),
        ]);
        setBlocks(bs);
        setOffset(off);
        setDoneIds(done);
        setIdeas(ids);
        setHabits(hs);
      } else {
        setBlocks([]);
        setIdeas(await getIdeas());
        setHabits(await getHabits());
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const active = routines.find((r) => r.is_active) ?? routines[0] ?? null;

  const timed = useMemo(
    () => layoutBlocks(blocks, offset, doneIds),
    [blocks, offset, doneIds],
  );
  const info = useMemo(() => computeActive(timed, new Date(now)), [timed, now]);

  async function switchRoutine(id: string) {
    if (id === active?.id) return;
    await setActiveRoutine(id);
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

  const { current, next } = info;

  return (
    <PageContainer>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Estructura</h1>
          <p className="text-sm text-slate-400">Un bloque a la vez. El reloj corre por vos.</p>
        </div>
        <button
          onClick={() => setShowEditor((v) => !v)}
          className="rounded-xl border border-white/15 px-3 py-2 text-sm text-slate-200 hover:bg-white/10"
        >
          {showEditor ? 'Listo' : '⚙️ Configurar'}
        </button>
      </div>

      {/* Selector de contexto (casa / local / …) */}
      {routines.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {routines.map((r) => (
            <button
              key={r.id}
              onClick={() => switchRoutine(r.id)}
              className={`rounded-xl border px-3 py-1.5 text-sm ${
                r.id === active?.id
                  ? 'border-sky-400/50 bg-sky-500/10 text-sky-200'
                  : 'border-white/15 text-slate-400 hover:bg-white/5'
              }`}
            >
              {CONTEXT_ICON[r.context] ?? '📍'} {r.name}
            </button>
          ))}
        </div>
      )}

      {!active ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
          <p className="mb-3 text-slate-300">Todavía no tenés ninguna rutina.</p>
          <button
            onClick={() => setShowEditor(true)}
            className="rounded-xl border border-sky-400/40 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-200 hover:bg-sky-500/20"
          >
            Crear mi primera rutina
          </button>
        </div>
      ) : (
        <>
          {/* Bloque actual + reloj */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {current ? (
                  <>
                    <div className="text-xs uppercase tracking-widest text-sky-300">Ahora</div>
                    <div className="truncate text-xl font-semibold">{current.name}</div>
                    {current.description && (
                      <div className="mt-0.5 text-sm text-slate-400">{current.description}</div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="text-xs uppercase tracking-widest text-slate-500">
                      Sin bloque ahora
                    </div>
                    <div className="text-xl font-semibold text-slate-300">
                      {next ? `Próximo a las ${minToClock(next.startMin)}` : 'Día libre'}
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={() => setShowFocus(true)}
                title="Pantalla completa"
                className="shrink-0 rounded-xl border border-white/15 px-3 py-2 text-sm hover:bg-white/10"
              >
                ⛶ Foco
              </button>
            </div>

            <div className="mt-4 flex flex-col items-center">
              <BigTimer info={info} mode={mode} />
              <div className="mt-3 inline-flex rounded-xl border border-white/15 p-0.5 text-sm">
                <button
                  onClick={() => setMode('up')}
                  className={`rounded-lg px-3 py-1 ${
                    mode === 'up' ? 'bg-white/10 text-white' : 'text-slate-400'
                  }`}
                >
                  Transcurrido
                </button>
                <button
                  onClick={() => setMode('down')}
                  className={`rounded-lg px-3 py-1 ${
                    mode === 'down' ? 'bg-white/10 text-white' : 'text-slate-400'
                  }`}
                >
                  Restante
                </button>
              </div>
              {next && (
                <div className="mt-2 text-xs text-slate-500">
                  Después: {next.name} · {minToClock(next.startMin)}
                </div>
              )}
            </div>
          </div>

          {/* Aplazar todo */}
          <div className="mt-4">
            <PostponeBar routineId={active.id} offset={offset} onChange={load} />
          </div>

          {/* Idea rápida */}
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-2 text-sm font-medium text-slate-300">💭 Sacate la idea de la cabeza</div>
            <IdeaCapture ideas={ideas} blockId={current?.id ?? null} onChange={load} />
          </div>

          {/* Timeline del día */}
          <div className="mt-6">
            <div className="mb-2 text-sm font-medium text-slate-400">Bloques de hoy</div>
            <Timeline blocks={timed} currentId={current?.id ?? null} onChange={load} />
          </div>

          {/* Editor */}
          {showEditor && (
            <div className="mt-6">
              <RoutineEditor
                routine={active}
                routines={routines}
                blocks={blocks}
                habits={habits}
                onChange={load}
              />
            </div>
          )}
        </>
      )}

      {showFocus && (
        <FocusMode
          info={info}
          mode={mode}
          onToggleMode={() => setMode((m) => (m === 'up' ? 'down' : 'up'))}
          ideas={ideas}
          onChange={load}
          onClose={() => setShowFocus(false)}
        />
      )}
    </PageContainer>
  );
}
