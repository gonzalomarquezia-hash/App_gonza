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
      if (!selected) {
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

  // Geometría del sendero: polilínea en zigzag de la base a la cumbre.
  const W = 320;
  const H = 270;
  const peak = { x: 188, y: 46 };
  // Waypoints del camino (de base a cumbre), zigzagueando por la ladera.
  const PATH: [number, number][] = [
    [108, 248],
    [176, 224],
    [118, 196],
    [182, 168],
    [136, 140],
    [190, 110],
    [150, 84],
    [peak.x, peak.y + 8],
  ];
  const segs = PATH.slice(1).map((b, i) => {
    const a = PATH[i];
    return { a, b, len: Math.hypot(b[0] - a[0], b[1] - a[1]) };
  });
  const pathLen = segs.reduce((s, g) => s + g.len, 0);
  const trail = `M ${PATH.map((p) => p.join(',')).join(' L ')}`;
  // Punto a la fracción f (0=base, 1=cumbre) a lo largo de la polilínea.
  const at = (f: number) => {
    let t = Math.min(1, Math.max(0, f)) * pathLen;
    for (const g of segs) {
      if (t <= g.len) {
        const u = g.len === 0 ? 0 : t / g.len;
        return { x: g.a[0] + (g.b[0] - g.a[0]) * u, y: g.a[1] + (g.b[1] - g.a[1]) * u };
      }
      t -= g.len;
    }
    const last = segs[segs.length - 1];
    return { x: last.b[0], y: last.b[1] };
  };

  // Reparto VISUAL de campamentos: parejos de base a cumbre por su ORDEN,
  // no por el día. Así no se amontonan aunque los días estén juntos (7,14,21…).
  const nCamps = camps.length;
  const campFrac = (i: number) => (i + 1) / Math.max(1, nCamps);
  // Día → fracción visual: lineal a trozos entre campamentos, para que el
  // escalador avance acompañando los marcadores repartidos.
  const dayToFrac = (day: number) => {
    const summit = nCamps ? camps[nCamps - 1].day : stats?.summitDay ?? 90;
    const v = Math.min(Math.max(0, day), summit);
    let prevDay = 0;
    let prevFrac = 0;
    for (let i = 0; i < nCamps; i++) {
      const d = camps[i].day;
      const f = campFrac(i);
      if (v <= d) {
        const u = d === prevDay ? 0 : (v - prevDay) / (d - prevDay);
        return prevFrac + (f - prevFrac) * u;
      }
      prevDay = d;
      prevFrac = f;
    }
    return summit > 0 ? Math.min(1, v / summit) : 0;
  };

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

              <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
                <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
                  <defs>
                    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#bae6fd" />
                    </linearGradient>
                    <linearGradient id="rock" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1e3a5f" />
                      <stop offset="100%" stopColor="#0f2740" />
                    </linearGradient>
                  </defs>

                  {/* cielo */}
                  <rect x="0" y="0" width={W} height={H} fill="url(#sky)" />

                  {/* nubes */}
                  <g fill="#ffffff" opacity="0.9">
                    <ellipse cx="62" cy="70" rx="26" ry="11" />
                    <ellipse cx="44" cy="78" rx="18" ry="9" />
                    <ellipse cx="250" cy="54" rx="30" ry="12" />
                    <ellipse cx="276" cy="62" rx="18" ry="9" />
                  </g>

                  {/* cordillera de fondo */}
                  <path d="M -10,262 L 70,150 L 140,210 L 210,150 L 330,262 Z" fill="#2a4a6b" opacity="0.7" />

                  {/* montaña principal */}
                  <path
                    d={`M -10,264 L 60,176 L 110,214 L ${peak.x},${peak.y} L 244,150 L 330,264 Z`}
                    fill="url(#rock)"
                  />

                  {/* nieve en la cumbre */}
                  <path
                    d={`M ${peak.x},${peak.y} L 158,118 L 168,112 L 178,122 L 188,114 L 198,124 L 210,114 L 226,120 Z`}
                    fill="#f1f5f9"
                  />

                  {/* sendero en zigzag */}
                  <path
                    d={trail}
                    fill="none"
                    stroke="#f8fafc"
                    strokeWidth="2.5"
                    strokeDasharray="2 7"
                    strokeLinecap="round"
                    opacity="0.95"
                  />

                  {/* campamentos: 🚩 pendiente · 🏅 logro alcanzado */}
                  {camps.map((c, i) => {
                    const p = at(campFrac(i));
                    const reached = stats.streak >= c.day;
                    const sel = selCampDay === c.day;
                    // El número va al lado contrario del escalador para no chocar.
                    const badgeX = p.x < W / 2 ? 13 : -13;
                    return (
                      <g
                        key={c.day}
                        onClick={() => setSelCampDay(c.day)}
                        style={{ cursor: 'pointer' }}
                      >
                        {sel && (
                          <circle cx={p.x} cy={p.y} r="15" fill="none" stroke="#f8fafc" strokeWidth="2" />
                        )}
                        <text
                          x={p.x}
                          y={p.y + 6}
                          textAnchor="middle"
                          fontSize="18"
                          opacity={reached ? 1 : 0.9}
                        >
                          {reached ? '🏅' : '🚩'}
                        </text>
                        <g transform={`translate(${p.x + badgeX}, ${p.y - 7})`}>
                          <rect x="-10" y="0" width="20" height="13" rx="6.5" fill="#0f172a" opacity="0.85" />
                          <text x="0" y="10" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#e2e8f0">
                            {c.day}
                          </text>
                        </g>
                      </g>
                    );
                  })}

                  {/* bandera de cumbre */}
                  <text x={peak.x} y={peak.y - 6} textAnchor="middle" fontSize="18">
                    🏁
                  </text>

                  {/* personaje (vos) — caminando ladera arriba */}
                  {(() => {
                    const me = at(dayToFrac(stats.streak));
                    return (
                      <text
                        x={me.x}
                        y={me.y - 9}
                        textAnchor="middle"
                        fontSize="20"
                        transform={`translate(${2 * me.x} 0) scale(-1 1)`}
                      >
                        🚶
                      </text>
                    );
                  })()}
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
