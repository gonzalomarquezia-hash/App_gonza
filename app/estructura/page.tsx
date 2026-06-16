'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  Routine,
  Block,
  BlockItem,
  BlockItemView,
  Idea,
  Habit,
  TimedBlock,
} from '@/lib/types';
import {
  getRoutines,
  getBlocks,
  getDayOffset,
  getDoneBlockIds,
  getBlockItems,
  getDoneItemIds,
  getIdeas,
  setActiveRoutine,
  createBlock,
  deleteBlock,
  layoutBlocks,
  computeActive,
  minToClock,
  minToTime,
  timeToMin,
} from '@/lib/estructura';
import { getHabits } from '@/lib/habits';
import { useNow } from '@/lib/useNow';
import { PageContainer, ErrorBox } from '@/components/ui';
import BigTimer from '@/components/estructura/BigTimer';
import Timeline from '@/components/estructura/Timeline';
import Checklist from '@/components/estructura/Checklist';
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
  const [items, setItems] = useState<BlockItem[]>([]);
  const [doneItemIds, setDoneItemIds] = useState<string[]>([]);
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
      const hs = await getHabits();
      setHabits(hs);
      setIdeas(await getIdeas());
      if (active) {
        const bs = await getBlocks(active.id);
        const [off, done, its, doneIts] = await Promise.all([
          getDayOffset(active.id),
          getDoneBlockIds(),
          getBlockItems(bs.map((b) => b.id)),
          getDoneItemIds(),
        ]);
        setBlocks(bs);
        setOffset(off);
        setDoneIds(done);
        setItems(its);
        setDoneItemIds(doneIts);
      } else {
        setBlocks([]);
        setItems([]);
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

  const timed = useMemo(() => layoutBlocks(blocks, offset, doneIds), [blocks, offset, doneIds]);
  const info = useMemo(() => computeActive(timed, new Date(now)), [timed, now]);

  // Ítems agrupados por bloque, con su estado de tildado del día.
  const itemsByBlock = useMemo(() => {
    const doneSet = new Set(doneItemIds);
    const map: Record<string, BlockItemView[]> = {};
    for (const it of items) {
      (map[it.block_id] ??= []).push({ ...it, done: doneSet.has(it.id) });
    }
    return map;
  }, [items, doneItemIds]);

  async function switchRoutine(id: string) {
    if (id === active?.id) return;
    await setActiveRoutine(id);
    await load();
  }

  async function quickAddBlock() {
    if (!active) return;
    // Arranca después del último bloque, así cae ordenado.
    const last = blocks[blocks.length - 1];
    const start = last ? minToTime(timeToMin(last.start_time) + last.duration_min) : '08:00';
    await createBlock(active.id, {
      name: 'Nuevo bloque',
      start_time: start,
      duration_min: 30,
      pos: blocks.length,
    });
    setShowEditor(true);
    await load();
  }

  async function removeBlock(b: TimedBlock) {
    if (!confirm(`¿Eliminar el bloque "${b.name}"?`)) return;
    await deleteBlock(b.id);
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
  const currentItems = current ? (itemsByBlock[current.id] ?? []) : [];

  return (
    <PageContainer>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Estructura</h1>
          <p className="text-sm text-slate-400">Un bloque a la vez. El reloj corre por vos.</p>
        </div>
        {active && (
          <button
            onClick={() => setShowEditor((v) => !v)}
            className="rounded-xl border border-white/15 px-3 py-2 text-sm text-slate-200 hover:bg-white/10"
          >
            {showEditor ? 'Listo' : '⚙️ Configurar'}
          </button>
        )}
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
        // Sin rutina: el editor permite crear la primera (antes quedaba colgado).
        <RoutineEditor
          routine={null}
          routines={routines}
          blocks={[]}
          itemsByBlock={{}}
          habits={habits}
          onChange={load}
        />
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

            {/* Checklist del bloque actual */}
            {current && (
              <div className="mt-4 border-t border-white/10 pt-4">
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Tareas de este bloque
                </div>
                <Checklist items={currentItems} blockId={current.id} onChange={load} />
              </div>
            )}
          </div>

          {/* Aplazar todo */}
          <div className="mt-4">
            <PostponeBar routineId={active.id} offset={offset} onChange={load} />
          </div>

          {/* Idea rápida */}
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-2 text-sm font-medium text-slate-300">
              💭 Sacate la idea de la cabeza
            </div>
            <IdeaCapture ideas={ideas} blockId={current?.id ?? null} onChange={load} />
          </div>

          {/* Timeline del día */}
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-400">Bloques de hoy</span>
              <button
                onClick={quickAddBlock}
                className="rounded-lg border border-white/15 px-2.5 py-1 text-xs text-slate-200 hover:bg-white/10"
              >
                + Agregar bloque
              </button>
            </div>
            <Timeline
              blocks={timed}
              currentId={current?.id ?? null}
              itemsByBlock={itemsByBlock}
              onChange={load}
              onDelete={removeBlock}
            />
          </div>

          {/* Editor */}
          {showEditor && (
            <div className="mt-6">
              <RoutineEditor
                routine={active}
                routines={routines}
                blocks={blocks}
                itemsByBlock={itemsByBlock}
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
          items={currentItems}
          ideas={ideas}
          onChange={load}
          onClose={() => setShowFocus(false)}
        />
      )}
    </PageContainer>
  );
}
