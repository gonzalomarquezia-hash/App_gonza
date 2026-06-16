'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Settings, Maximize2, Plus, Home, Store, MapPin } from 'lucide-react';
import type {
  Routine,
  Block,
  BlockItem,
  BlockItemView,
  Idea,
  Habit,
  HabitSchedule,
  CheckinState,
  DayState,
  TimedBlock,
} from '@/lib/types';
import {
  getRoutines,
  getBlocks,
  getDayState,
  getDoneBlockIds,
  getBlockItems,
  getDoneItemIds,
  getIdeas,
  getHabitSchedules,
  getHabitStatesForDay,
  getBlockDayEdits,
  setActiveRoutine,
  createBlock,
  deleteBlock,
  setBlockDone,
  setBlockDayEdit,
  clearBlockDayEdit,
  setDayWindowOverride,
  postponeAll,
  layoutBlocks,
  projectHabitBlocks,
  computeActive,
  computeGaps,
  dayWindow,
  dayLabel,
  fmtHuman,
  minToClock,
  minToTime,
  timeToMin,
  type EditMap,
} from '@/lib/estructura';
import { getHabits, setCheckin, clearCheckin, todayStr, weekdayOf } from '@/lib/habits';
import { useNow } from '@/lib/useNow';
import { PageContainer, ErrorBox } from '@/components/ui';
import BigTimer from '@/components/estructura/BigTimer';
import Agenda from '@/components/estructura/Agenda';
import Checklist from '@/components/estructura/Checklist';
import IdeaCapture from '@/components/estructura/IdeaCapture';
import PostponeBar from '@/components/estructura/PostponeBar';
import DaySelector from '@/components/estructura/DaySelector';
import DayProgress from '@/components/estructura/DayProgress';
import RoutineEditor from '@/components/estructura/RoutineEditor';
import FocusMode from '@/components/estructura/FocusMode';

function ContextIcon({ context }: { context: string }) {
  const cls = 'h-4 w-4';
  if (context === 'casa') return <Home className={cls} />;
  if (context === 'local') return <Store className={cls} />;
  return <MapPin className={cls} />;
}

export default function Estructura() {
  const [day, setDay] = useState(() => todayStr());
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [dayState, setDayState] = useState<DayState>({
    offset_min: 0,
    day_start_override: null,
    day_end_override: null,
  });
  const [doneIds, setDoneIds] = useState<string[]>([]);
  const [items, setItems] = useState<BlockItem[]>([]);
  const [doneItemIds, setDoneItemIds] = useState<string[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [schedules, setSchedules] = useState<HabitSchedule[]>([]);
  const [habitStates, setHabitStates] = useState<Record<string, CheckinState>>({});
  const [edits, setEdits] = useState<EditMap>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<'up' | 'down'>('down');
  const [showEditor, setShowEditor] = useState(false);
  const [showFocus, setShowFocus] = useState(false);

  const now = useNow(1000);
  const isToday = day === todayStr();

  const load = useCallback(async () => {
    try {
      setError(null);
      const rs = await getRoutines();
      setRoutines(rs);
      const act = rs.find((r) => r.is_active) ?? rs[0] ?? null;
      setHabits(await getHabits());
      setIdeas(await getIdeas(day));
      if (act) {
        const bs = await getBlocks(act.id);
        const [ds, done, its, doneIts, scheds, states, ed] = await Promise.all([
          getDayState(act.id, day),
          getDoneBlockIds(day),
          getBlockItems(bs.map((b) => b.id)),
          getDoneItemIds(day),
          getHabitSchedules(act.id),
          getHabitStatesForDay(day),
          getBlockDayEdits(act.id, day),
        ]);
        setBlocks(bs);
        setDayState(ds);
        setDoneIds(done);
        setItems(its);
        setDoneItemIds(doneIts);
        setSchedules(scheds);
        setHabitStates(states);
        setEdits(ed);
      } else {
        setBlocks([]);
        setItems([]);
        setEdits(new Map());
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, [day]);

  useEffect(() => {
    load();
  }, [load]);

  const active = routines.find((r) => r.is_active) ?? routines[0] ?? null;

  const timed = useMemo(() => {
    const real = layoutBlocks(blocks, dayState.offset_min, doneIds, edits);
    const scheduleByHabit = new Map(schedules.map((s) => [s.habit_id, s]));
    const virtuals = projectHabitBlocks(
      habits,
      scheduleByHabit,
      habitStates,
      dayState.offset_min,
      weekdayOf(day),
      edits,
    );
    return [...real, ...virtuals].sort((a, b) => a.startMin - b.startMin || a.pos - b.pos);
  }, [blocks, dayState, doneIds, edits, schedules, habits, habitStates, day]);

  const win = useMemo(
    () => (active ? dayWindow(active, dayState) : { startMin: 480, endMin: 1440 }),
    [active, dayState],
  );
  const gaps = useMemo(() => computeGaps(timed, win.startMin, win.endMin), [timed, win]);

  const info = useMemo(
    () =>
      isToday
        ? computeActive(timed, new Date(now))
        : { current: null, next: null as TimedBlock | null, elapsedSec: 0, remainingSec: 0, progress: 0 },
    [timed, now, isToday],
  );

  const itemsByBlock = useMemo(() => {
    const doneSet = new Set(doneItemIds);
    const map: Record<string, BlockItemView[]> = {};
    for (const it of items) (map[it.block_id] ??= []).push({ ...it, done: doneSet.has(it.id) });
    return map;
  }, [items, doneItemIds]);

  const skipped = useMemo(() => {
    const out: { name: string; refType: 'block' | 'habit'; refId: string }[] = [];
    for (const e of edits.values()) {
      if (!e.skipped) continue;
      if (e.ref_type === 'block') {
        const b = blocks.find((x) => x.id === e.ref_id);
        if (b) out.push({ name: b.name, refType: 'block', refId: b.id });
      } else {
        const h = habits.find((x) => x.id === e.ref_id);
        if (h) out.push({ name: h.name, refType: 'habit', refId: h.id });
      }
    }
    return out;
  }, [edits, blocks, habits]);

  const d = new Date(now);
  const nowMin = d.getHours() * 60 + d.getMinutes();
  const nowClockHM = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  const nowClockHMS = `${nowClockHM}:${String(d.getSeconds()).padStart(2, '0')}`;

  const refOf = (b: TimedBlock) =>
    b.virtual
      ? { type: 'habit' as const, id: b.habit_id as string }
      : { type: 'block' as const, id: b.id };

  // ── Acciones ──
  async function switchRoutine(id: string) {
    if (id === active?.id) return;
    await setActiveRoutine(id);
    await load();
  }
  async function toggleDone(b: TimedBlock) {
    if (b.virtual && b.habit_id) {
      if (b.done) await clearCheckin(b.habit_id, day);
      else await setCheckin(b.habit_id, day, 'done');
    } else {
      await setBlockDone(b, !b.done, day);
    }
    await load();
  }
  async function postponeBlock(b: TimedBlock, minutes: number) {
    if (!active) return;
    const r = refOf(b);
    const newStart = minToTime(Math.max(0, timeToMin(b.start_time) + minutes));
    await setBlockDayEdit(active.id, day, r.type, r.id, { start_override: newStart });
    await load();
  }
  async function setBlockDuration(b: TimedBlock, minutes: number) {
    if (!active) return;
    const r = refOf(b);
    await setBlockDayEdit(active.id, day, r.type, r.id, {
      duration_override: Math.max(5, Math.round(minutes)),
    });
    await load();
  }
  async function skipBlock(b: TimedBlock) {
    if (!active) return;
    const r = refOf(b);
    await setBlockDayEdit(active.id, day, r.type, r.id, { skipped: true });
    await load();
  }
  async function restoreRef(refType: 'block' | 'habit', refId: string) {
    await clearBlockDayEdit(day, refType, refId);
    await load();
  }
  async function removeBlock(b: TimedBlock) {
    if (!confirm(`¿Eliminar "${b.name}" de forma permanente (todos los días)?`)) return;
    await deleteBlock(b.id);
    await load();
  }
  async function fillGap(startMin: number) {
    if (!active) return;
    const base = minToTime(Math.max(0, startMin - dayState.offset_min));
    await createBlock(active.id, {
      name: 'Nuevo bloque',
      start_time: base,
      duration_min: 30,
      pos: blocks.length,
    });
    setShowEditor(true);
    await load();
  }
  async function quickAddBlock() {
    if (!active) return;
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
  async function setDayWindowToday(startHHMM: string, endHHMM: string) {
    if (!active) return;
    await setDayWindowOverride(active.id, day, startHHMM, endHHMM);
    await load();
  }
  async function postponeAllDay(minutes: number) {
    if (!active) return;
    await postponeAll(active.id, minutes, day);
    await load();
  }
  async function pushNext(minutes: number) {
    if (!active || !info.next) return;
    const n = info.next;
    const r = refOf(n);
    await setBlockDayEdit(active.id, day, r.type, r.id, {
      start_override: minToTime(timeToMin(n.start_time) + minutes),
      duration_override: Math.max(5, n.duration_min - minutes),
    });
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
  const minsToNext = next ? Math.max(0, next.startMin - nowMin) : null;

  return (
    <PageContainer>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Estructura</h1>
        {active && (
          <button
            onClick={() => setShowEditor((v) => !v)}
            className="flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-sm text-slate-200 hover:bg-white/10"
          >
            <Settings className="h-4 w-4" />
            {showEditor ? 'Listo' : 'Configurar'}
          </button>
        )}
      </div>

      {/* Selector de día */}
      <div className="mb-3">
        <DaySelector day={day} onChange={setDay} />
      </div>

      {/* Contextos */}
      {routines.length > 0 && (
        <div className="mb-3 flex flex-wrap justify-center gap-2">
          {routines.map((r) => (
            <button
              key={r.id}
              onClick={() => switchRoutine(r.id)}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm ${
                r.id === active?.id
                  ? 'border-sky-400/50 bg-sky-500/10 text-sky-200'
                  : 'border-white/15 text-slate-400 hover:bg-white/5'
              }`}
            >
              <ContextIcon context={r.context} /> {r.name}
            </button>
          ))}
        </div>
      )}

      {!active ? (
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
          {/* Tiempo restante del día */}
          <div className="mb-4">
            <DayProgress
              startMin={win.startMin}
              endMin={win.endMin}
              nowMin={nowMin}
              isToday={isToday}
              onEditWindow={setDayWindowToday}
            />
          </div>

          {/* AHORA */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {!isToday ? (
                  <>
                    <div className="text-xs uppercase tracking-widest text-slate-500">
                      Planificando
                    </div>
                    <div className="text-xl font-semibold">{dayLabel(day)}</div>
                  </>
                ) : current ? (
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
                      Sin bloque · tiempo no programado
                    </div>
                    <div className="text-xl font-semibold text-slate-300">
                      {next ? `Próximo: ${next.name}` : 'Nada más programado'}
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={() => setShowFocus(true)}
                title="Pantalla completa"
                className="flex shrink-0 items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-sm hover:bg-white/10"
              >
                <Maximize2 className="h-4 w-4" /> Foco
              </button>
            </div>

            {isToday && (
              <div className="mt-4 flex flex-col items-center">
                {current ? (
                  <>
                    <BigTimer info={info} mode={mode} />
                    <div className="mt-3 inline-flex rounded-xl border border-white/15 p-0.5 text-sm">
                      <button
                        onClick={() => setMode('up')}
                        className={`rounded-lg px-3 py-1 ${mode === 'up' ? 'bg-white/10 text-white' : 'text-slate-400'}`}
                      >
                        Transcurrido
                      </button>
                      <button
                        onClick={() => setMode('down')}
                        className={`rounded-lg px-3 py-1 ${mode === 'down' ? 'bg-white/10 text-white' : 'text-slate-400'}`}
                      >
                        Restante
                      </button>
                    </div>
                  </>
                ) : (
                  <span className="font-mono text-6xl font-semibold tabular-nums tracking-tight md:text-7xl">
                    {nowClockHM}
                  </span>
                )}
                {next && minsToNext != null && (
                  <div className="mt-2 text-xs text-slate-500">
                    {current ? 'Después' : 'Próximo'}: {next.name} ·{' '}
                    {minsToNext === 0 ? 'ahora' : `en ${fmtHuman(minsToNext)}`} ({minToClock(next.startMin)})
                  </div>
                )}
              </div>
            )}

            {current && (
              <div className="mt-4 border-t border-white/10 pt-4">
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Tareas de este bloque
                </div>
                <Checklist items={currentItems} blockId={current.id} onChange={load} />
              </div>
            )}
          </div>

          {/* Idea rápida */}
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-2 text-sm font-medium text-slate-300">Sacate la idea de la cabeza</div>
            <IdeaCapture ideas={ideas} blockId={current?.id ?? null} onChange={load} />
          </div>

          {/* Aplazar todo */}
          <div className="mt-4">
            <PostponeBar routineId={active.id} day={day} offset={dayState.offset_min} onChange={load} />
          </div>

          {/* Agenda */}
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-400">Agenda · {dayLabel(day)}</span>
              <button
                onClick={quickAddBlock}
                className="flex items-center gap-1 rounded-lg border border-white/15 px-2.5 py-1 text-xs text-slate-200 hover:bg-white/10"
              >
                <Plus className="h-3.5 w-3.5" /> Bloque
              </button>
            </div>
            <Agenda
              blocks={timed}
              gaps={gaps}
              currentId={current?.id ?? null}
              itemsByBlock={itemsByBlock}
              onToggleDone={toggleDone}
              onPostpone={postponeBlock}
              onSetDuration={setBlockDuration}
              onSkip={skipBlock}
              onRestore={(b) => restoreRef(refOf(b).type, refOf(b).id)}
              onDelete={removeBlock}
              onFillGap={fillGap}
            />
            <p className="mt-2 text-xs text-slate-500">
              Todo suma: marcá lo que hiciste aunque sea parte. Editás un bloque solo para este día;
              para cambios fijos, andá a Hábitos.
            </p>

            {skipped.length > 0 && (
              <div className="mt-3 text-xs text-slate-500">
                Sacados de {dayLabel(day).toLowerCase()}:{' '}
                {skipped.map((s, i) => (
                  <span key={`${s.refType}:${s.refId}`}>
                    {i > 0 && ' · '}
                    {s.name}{' '}
                    <button
                      onClick={() => restoreRef(s.refType, s.refId)}
                      className="text-sky-300 hover:underline"
                    >
                      restaurar
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

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
          nowClock={nowClockHMS}
          items={currentItems}
          ideas={ideas}
          hasNext={!!next}
          onPostponeAll={postponeAllDay}
          onPushNext={pushNext}
          onChange={load}
          onClose={() => setShowFocus(false)}
        />
      )}
    </PageContainer>
  );
}
