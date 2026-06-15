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

  // Geometría del sendero: zigzag CALCULADO sobre la cara de la montaña.
  const W = 320;
  const H = 270;
  const peak = { x: 188, y: 46 };

  // "Cara" de la montaña (triángulo que apoya sobre la roca, con margen):
  // a cada altura t (0=base, 1=cumbre) el sendero vive entre su borde izq/der.
  const nCamps = camps.length;
  const apexX = peak.x;
  const apexY = 60; // un poco bajo la punta real, para que la cima respire
  const baseY = 252;
  const baseL = 90;
  const baseR = 252;
  const edge = (t: number, ex: number) => ex + (apexX - ex) * t;
  const centerAt = (t: number) => (edge(t, baseL) + edge(t, baseR)) / 2;
  const halfAt = (t: number) => (edge(t, baseR) - edge(t, baseL)) / 2;
  const yAt = (t: number) => baseY + (apexY - baseY) * t;
  const SWING = 0.78; // cuánto del ancho disponible barre el zigzag

  // Nodos del sendero: arranque en la base + un nodo por campamento,
  // alternando lados → switchbacks. El último (cumbre) queda centrado.
  const trailhead = { x: centerAt(0), y: yAt(0) };
  const campPt = (i: number) => {
    const t = (i + 1) / Math.max(1, nCamps);
    const side = i % 2 === 0 ? 1 : -1; // primer campamento hacia la derecha
    return { x: centerAt(t) + side * halfAt(t) * SWING, y: yAt(t) };
  };
  const nodes = [trailhead, ...camps.map((_, i) => campPt(i))];
  const trail = `M ${nodes.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')}`;

  // Día → punto sobre el sendero (lineal a trozos entre nodos, por días).
  const dayDays = [0, ...camps.map((c) => c.day)];
  const posForDay = (day: number) => {
    const maxD = dayDays[dayDays.length - 1] || 1;
    const v = Math.min(Math.max(0, day), maxD);
    for (let i = 1; i < dayDays.length; i++) {
      if (v <= dayDays[i]) {
        const d0 = dayDays[i - 1];
        const d1 = dayDays[i];
        const u = d1 === d0 ? 0 : (v - d0) / (d1 - d0);
        const a = nodes[i - 1];
        const b = nodes[i];
        return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
      }
    }
    return nodes[nodes.length - 1];
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

                  {/* punto de partida (campamento base) */}
                  <circle cx={trailhead.x} cy={trailhead.y} r="3.5" fill="#f8fafc" />
                  <text x={trailhead.x} y={trailhead.y - 7} textAnchor="middle" fontSize="15">
                    🏕️
                  </text>

                  {/* campamentos: 🚩 pendiente · 🏅 logro alcanzado */}
                  {camps.map((c, i) => {
                    const p = campPt(i);
                    const reached = stats.streak >= c.day;
                    const sel = selCampDay === c.day;
                    // El número va al lado contrario del barrido para no chocar con la línea.
                    const badgeX = p.x <= centerAt((i + 1) / Math.max(1, nCamps)) ? -13 : 13;
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
                    const me = posForDay(stats.streak);
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
