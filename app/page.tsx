'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  getHabits,
  getCheckins,
  computeStats,
  setToday,
  clearToday,
} from '@/lib/habits';
import type { Habit, Checkin, CheckinState } from '@/lib/types';
import { PageContainer, ErrorBox } from '@/components/ui';

// Hoy cae en día de descanso si no está entre los días de la semana del hábito.
function restToday(h: Habit): boolean {
  const days = h.week_days?.length ? h.week_days : [0, 1, 2, 3, 4, 5, 6];
  return !days.includes(new Date().getDay());
}

export default function Inicio() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [checkins, setCheckins] = useState<Record<string, Checkin[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const hs = await getHabits();
      const map: Record<string, Checkin[]> = {};
      await Promise.all(
        hs.map(async (h) => {
          map[h.id] = await getCheckins(h.id);
        }),
      );
      setHabits(hs);
      setCheckins(map);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(h: Habit, state: CheckinState) {
    const current = computeStats(h, checkins[h.id] ?? []).todayState;
    if (current === state) await clearToday(h.id);
    else await setToday(h.id, state);
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
      <h1 className="text-2xl font-semibold">Hoy</h1>
      <p className="mb-6 text-sm text-slate-400">Un toque y listo.</p>

      {habits.length === 0 && (
        <p className="text-slate-400">
          Todavía no tenés hábitos. Creá uno en <b>Hábitos</b>.
        </p>
      )}

      <div className="space-y-3">
        {habits.map((h) => {
          const stats = computeStats(h, checkins[h.id] ?? []);
          return (
            <div key={h.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{h.name}</div>
                  <div className="text-sm text-slate-400">
                    {h.type === 'avoid' ? '🚭' : '🔥'} {stats.streak}{' '}
                    {stats.streak === 1 ? 'día' : 'días'}
                    <span className="text-slate-500"> · acumulado {stats.lifetime}</span>
                  </div>
                </div>

                {restToday(h) ? (
                  <span className="rounded-xl border border-sky-400/40 bg-sky-500/10 px-3 py-2 text-sm text-sky-300">
                    Descanso
                  </span>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggle(h, 'done')}
                      className={`rounded-xl border px-3 py-2 text-sm font-medium ${
                        stats.todayState === 'done'
                          ? 'border-emerald-400 bg-emerald-500 text-slate-950'
                          : 'border-white/15 text-slate-200 hover:bg-white/10'
                      }`}
                    >
                      Hecho
                    </button>
                    <button
                      onClick={() => toggle(h, 'miss')}
                      className={`rounded-xl border px-3 py-2 text-sm font-medium ${
                        stats.todayState === 'miss'
                          ? 'border-rose-400 bg-rose-500 text-slate-950'
                          : 'border-white/15 text-slate-200 hover:bg-white/10'
                      }`}
                    >
                      No
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </PageContainer>
  );
}
