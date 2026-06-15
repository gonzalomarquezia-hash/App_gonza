'use client';

import { useCallback, useEffect, useState } from 'react';
import { getHabits, getCheckins, computeStats, setReward } from '@/lib/habits';
import type { Habit, Checkin } from '@/lib/types';
import { PageContainer, ErrorBox } from '@/components/ui';

export default function Montana() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [selId, setSelId] = useState('');
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selCampDay, setSelCampDay] = useState<number | null>(null);
  const [rewardDraft, setRewardDraft] = useState('');

  const loadHabits = useCallback(async () => {
    try {
      setError(null);
      const hs = await getHabits();
      setHabits(hs);
      setSelId((prev) => prev || (hs[0]?.id ?? ''));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHabits();
  }, [loadHabits]);

  const selected = habits.find((h) => h.id === selId) ?? null;

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!selected || selected.type !== 'do') {
        setCheckins([]);
        return;
      }
      try {
        const cs = await getCheckins(selected.id);
        if (!cancel) setCheckins(cs);
      } catch {
        /* manejado por loadHabits */
      }
    })();
    return () => {
      cancel = true;
    };
  }, [selected]);

  useEffect(() => {
    if (selCampDay == null || !selected) {
      setRewardDraft('');
      return;
    }
    setRewardDraft(selected.camps.find((c) => c.day === selCampDay)?.reward ?? '');
  }, [selCampDay, selected]);

  async function saveReward() {
    if (!selected || selCampDay == null) return;
    await setReward(selected, selCampDay, rewardDraft);
    await loadHabits();
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

  const stats = selected ? computeStats(selected, checkins) : null;
  const camps = selected ? [...selected.camps].sort((a, b) => a.day - b.day) : [];

  // Geometría del sendero (de base a cumbre)
  const W = 320;
  const H = 280;
  const base = { x: 45, y: 240 };
  const peak = { x: 255, y: 45 };
  const at = (f: number) => ({
    x: base.x + (peak.x - base.x) * Math.min(1, Math.max(0, f)),
    y: base.y + (peak.y - base.y) * Math.min(1, Math.max(0, f)),
  });

  return (
    <PageContainer>
      <h1 className="text-2xl font-semibold">Montaña</h1>

      {habits.length === 0 ? (
        <p className="mt-4 text-slate-400">
          Todavía no tenés hábitos. Creá uno en <b>Hábitos</b>.
        </p>
      ) : (
        <>
          <select
            value={selId}
            onChange={(e) => {
              setSelId(e.target.value);
              setSelCampDay(null);
            }}
            className="mt-4 w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-white/30"
          >
            {habits.map((h) => (
              <option key={h.id} value={h.id}>
                {h.type === 'avoid' ? '🔴 ' : '🟢 '}
                {h.name}
              </option>
            ))}
          </select>

          {selected && stats && (
            <>
              <p className="mt-4 text-sm text-slate-300">
                {selected.type === 'avoid' ? '🚭' : '🔥'} <b>{stats.streak}</b>{' '}
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

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3">
                <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
                  <polygon points={`8,260 ${peak.x},${peak.y} 312,260`} fill="#1e293b" />
                  <polygon
                    points={`${peak.x - 26},${peak.y + 28} ${peak.x},${peak.y} ${peak.x + 26},${peak.y + 28}`}
                    fill="#475569"
                  />
                  <line
                    x1={base.x}
                    y1={base.y}
                    x2={peak.x}
                    y2={peak.y}
                    stroke="#64748b"
                    strokeWidth="2"
                    strokeDasharray="3 6"
                    strokeLinecap="round"
                  />

                  {camps.map((c) => {
                    const p = at(c.day / stats.summitDay);
                    const reached = stats.streak >= c.day;
                    return (
                      <g
                        key={c.day}
                        onClick={() => setSelCampDay(c.day)}
                        style={{ cursor: 'pointer' }}
                      >
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="11"
                          fill={reached ? '#10b981' : '#0b1120'}
                          stroke={selCampDay === c.day ? '#f8fafc' : reached ? '#34d399' : '#64748b'}
                          strokeWidth={selCampDay === c.day ? 3 : 2}
                        />
                        <text
                          x={p.x}
                          y={p.y + 3.5}
                          textAnchor="middle"
                          fontSize="9"
                          fontWeight="bold"
                          fill={reached ? '#03130d' : '#94a3b8'}
                        >
                          {c.day}
                        </text>
                      </g>
                    );
                  })}

                  <text x={peak.x} y={peak.y - 12} textAnchor="middle" fontSize="16">
                    🏁
                  </text>
                  <text
                    x={at(stats.progress).x}
                    y={at(stats.progress).y - 13}
                    textAnchor="middle"
                    fontSize="22"
                    transform={`translate(${2 * at(stats.progress).x} 0) scale(-1 1)`}
                  >
                    🧗
                  </text>
                </svg>
              </div>

              {selCampDay != null && (
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">Campamento · {selCampDay} días</div>
                    {stats.streak >= selCampDay ? (
                      <span className="text-sm text-emerald-400">✅ ¡Conquistado!</span>
                    ) : (
                      <span className="text-sm text-slate-300">
                        Te faltan {selCampDay - stats.streak}{' '}
                        {selCampDay - stats.streak === 1 ? 'día' : 'días'}
                      </span>
                    )}
                  </div>
                  <label className="mt-3 block text-xs text-slate-400">
                    Tu recompensa al llegar
                  </label>
                  <textarea
                    value={rewardDraft}
                    onChange={(e) => setRewardDraft(e.target.value)}
                    placeholder="Ej. me compro algo que me guste"
                    rows={2}
                    className="mt-1 w-full rounded-xl border border-white/15 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-slate-500 focus:border-white/30"
                  />
                  <button
                    onClick={saveReward}
                    className="mt-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-950 hover:bg-slate-200"
                  >
                    Guardar recompensa
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </PageContainer>
  );
}
