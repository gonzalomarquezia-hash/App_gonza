'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { getHabits, getCheckins, computeStats } from '@/lib/habits';
import type { Habit, Checkin } from '@/lib/types';
import { PageContainer, ErrorBox } from '@/components/ui';

export default function HabitoDetalle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [habit, setHabit] = useState<Habit | null>(null);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const hs = await getHabits();
      const h = hs.find((x) => x.id === id) ?? null;
      setHabit(h);
      setCheckins(h && h.type === 'do' ? await getCheckins(h.id) : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const back = (
    <Link href="/habitos" className="text-sm text-slate-400 hover:text-slate-200">
      ← Hábitos
    </Link>
  );

  if (loading)
    return (
      <PageContainer>
        {back}
        <p className="mt-4 text-slate-400">Cargando…</p>
      </PageContainer>
    );

  if (error)
    return (
      <PageContainer>
        {back}
        <div className="mt-4">
          <ErrorBox msg={error} />
        </div>
      </PageContainer>
    );

  if (!habit)
    return (
      <PageContainer>
        {back}
        <p className="mt-4 text-slate-400">Ese hábito no existe (quizá lo borraste).</p>
      </PageContainer>
    );

  const stats = computeStats(habit, checkins);
  const camps = [...habit.camps].sort((a, b) => a.day - b.day);

  return (
    <PageContainer>
      {back}

      <h1 className="mt-3 text-2xl font-semibold">
        {habit.type === 'avoid' ? '🔴 ' : '🟢 '}
        {habit.name}
      </h1>
      <p className="text-sm text-slate-400">
        {habit.type === 'avoid' ? 'Hábito de NO hacer' : 'Hábito de hacer'}
      </p>

      <p className="mt-4 text-sm text-slate-300">
        {habit.type === 'avoid' ? '🚭' : '🔥'} <b>{stats.streak}</b>{' '}
        {stats.streak === 1 ? 'día' : 'días'}
        {stats.nextCamp ? (
          <span className="text-slate-400">
            {' '}
            · próximo campamento en {stats.daysToNextCamp} ({stats.nextCamp.day})
          </span>
        ) : (
          <span className="text-emerald-400"> · ¡cumbre alcanzada! 🏁</span>
        )}
        <span className="text-slate-500"> · acumulado de por vida {stats.lifetime}</span>
      </p>

      <h2 className="mt-6 mb-2 text-sm font-medium text-slate-300">Campamentos</h2>
      <div className="space-y-2">
        {camps.map((c) => {
          const reached = stats.streak >= c.day;
          return (
            <div
              key={c.day}
              className="rounded-2xl border border-white/10 bg-white/5 p-4"
            >
              <div className="flex items-center justify-between">
                <div className="font-medium">{c.day} días</div>
                {reached ? (
                  <span className="text-sm text-emerald-400">✅ Conquistado</span>
                ) : (
                  <span className="text-sm text-slate-300">
                    Te faltan {c.day - stats.streak}{' '}
                    {c.day - stats.streak === 1 ? 'día' : 'días'}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-400">
                {c.reward ? (
                  <>🎁 {c.reward}</>
                ) : (
                  <span className="text-slate-500">Sin recompensa todavía</span>
                )}
              </p>
            </div>
          );
        })}
      </div>
    </PageContainer>
  );
}
