'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import type { Thought, ThoughtKind, Emotion } from '@/lib/types';
import { processThought, deleteThought, EMOTIONS, KIND_LABEL } from '@/lib/thoughts';
import { todayStr } from '@/lib/habits';

// Flujo guiado para procesar un pensamiento de la bandeja, tranquilo.
// 1) Nombrar (qué es / qué emoción / intensidad)
// 2) ¿Lo controlás?  → Sí: paso más chico + fecha   → No: soltar
// Una tarea salta directo al paso "acción + fecha".
export default function ThoughtProcess({
  thought,
  onDone,
  onClose,
}: {
  thought: Thought;
  onDone: () => void;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<ThoughtKind | null>(thought.kind);
  const [emotion, setEmotion] = useState<Emotion | null>(thought.emotion);
  const [intensity, setIntensity] = useState<number | null>(thought.intensity);
  const [controllable, setControllable] = useState<boolean | null>(thought.controllable);
  const [actionText, setActionText] = useState(thought.action_text ?? '');
  const [dueDate, setDueDate] = useState(thought.due_date ?? '');
  const [busy, setBusy] = useState(false);

  async function finish(
    status: 'action' | 'released' | 'archived' | 'done',
    extra: Partial<Thought> = {},
  ) {
    setBusy(true);
    try {
      await processThought(thought.id, {
        kind: kind ?? 'note',
        emotion,
        intensity,
        controllable,
        action_text: actionText.trim() || null,
        due_date: dueDate || null,
        status,
        ...extra,
      });
      onDone();
    } finally {
      setBusy(false);
    }
  }

  async function discard() {
    setBusy(true);
    try {
      await deleteThought(thought.id);
      onDone();
    } finally {
      setBusy(false);
    }
  }

  const isEmotion = kind === 'emotion';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-widest text-slate-500">Procesar</div>
            <div className="text-lg font-semibold">{thought.text}</div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="shrink-0 rounded-full border border-white/15 p-1.5 text-slate-300 hover:bg-orange-400/[0.16]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Paso 1 — ¿Qué es? */}
        {!kind && (
          <div className="space-y-2">
            <p className="text-sm text-slate-400">¿Qué es esto?</p>
            <div className="grid grid-cols-2 gap-2">
              {(['task', 'emotion', 'note'] as ThoughtKind[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setKind(k)}
                  className="rounded-xl border border-white/15 px-3 py-2 text-sm text-slate-200 hover:bg-orange-400/[0.16]"
                >
                  {KIND_LABEL[k]}
                </button>
              ))}
              <button
                onClick={discard}
                disabled={busy}
                className="rounded-xl border border-white/15 px-3 py-2 text-sm text-slate-500 hover:bg-orange-400/[0.16]"
              >
                Descartar
              </button>
            </div>
          </div>
        )}

        {/* Paso emoción — nombrar + intensidad + ¿lo controlo? */}
        {isEmotion && (
          <div className="space-y-4">
            <div>
              <p className="mb-1.5 text-sm text-slate-400">¿Qué sentís?</p>
              <div className="flex flex-wrap gap-1.5">
                {EMOTIONS.map((e) => (
                  <button
                    key={e.value}
                    onClick={() => setEmotion(e.value)}
                    className={`rounded-lg border px-2.5 py-1 text-xs ${
                      emotion === e.value ? e.chip + ' bg-orange-400/[0.07]' : 'border-white/10 text-slate-400'
                    }`}
                  >
                    {e.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-sm text-slate-400">¿Qué tan fuerte? (1–5)</p>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setIntensity(n)}
                    className={`h-9 w-9 rounded-lg border text-sm ${
                      intensity === n
                        ? 'border-sky-400 bg-sky-500/20 text-sky-100'
                        : 'border-white/10 text-slate-400 hover:bg-orange-400/10'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-sm text-slate-400">¿Está en tus manos hoy?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setControllable(true)}
                  className={`flex-1 rounded-xl border px-3 py-2 text-sm ${
                    controllable === true
                      ? 'border-emerald-400 bg-emerald-500/15 text-emerald-100'
                      : 'border-white/15 text-slate-200 hover:bg-orange-400/[0.16]'
                  }`}
                >
                  Sí, puedo hacer algo
                </button>
                <button
                  onClick={() => setControllable(false)}
                  className={`flex-1 rounded-xl border px-3 py-2 text-sm ${
                    controllable === false
                      ? 'border-sky-400 bg-sky-500/15 text-sky-100'
                      : 'border-white/15 text-slate-200 hover:bg-orange-400/[0.16]'
                  }`}
                >
                  No depende de mí
                </button>
              </div>
            </div>

            {/* No lo controlo → soltar */}
            {controllable === false && (
              <div className="rounded-xl border border-white/10 bg-orange-400/[0.07] p-3">
                <p className="text-sm text-slate-300">
                  Esto no está en tus manos hoy. Reconocerlo ya baja. ¿Lo soltás?
                </p>
                <button
                  onClick={() => finish('released')}
                  disabled={busy}
                  className="mt-3 w-full rounded-xl border border-sky-400/40 bg-sky-500/10 px-3 py-2 text-sm font-medium text-sky-200 hover:bg-sky-500/20 disabled:opacity-40"
                >
                  Soltar y volver a lo mío
                </button>
              </div>
            )}

            {/* Lo controlo → acción + fecha */}
            {controllable === true && <ActionForm
              actionText={actionText}
              setActionText={setActionText}
              dueDate={dueDate}
              setDueDate={setDueDate}
              busy={busy}
              onSave={() => finish('action')}
            />}
          </div>
        )}

        {/* Tarea o nota → directo a acción + fecha */}
        {(kind === 'task' || kind === 'note') && (
          <div className="space-y-3">
            <ActionForm
              actionText={actionText}
              setActionText={setActionText}
              dueDate={dueDate}
              setDueDate={setDueDate}
              busy={busy}
              onSave={() => finish('action')}
              label={kind === 'task' ? '¿Cuál es el paso más chico?' : 'Detalle (opcional)'}
            />
            {kind === 'task' && (
              <button
                onClick={() => finish('done')}
                disabled={busy}
                className="w-full rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-40"
              >
                Ya está hecha
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ActionForm({
  actionText,
  setActionText,
  dueDate,
  setDueDate,
  busy,
  onSave,
  label = '¿Cuál es el paso más chico?',
}: {
  actionText: string;
  setActionText: (v: string) => void;
  dueDate: string;
  setDueDate: (v: string) => void;
  busy: boolean;
  onSave: () => void;
  label?: string;
}) {
  return (
    <div className="space-y-2">
      <div>
        <p className="mb-1.5 text-sm text-slate-400">{label}</p>
        <input
          value={actionText}
          onChange={(e) => setActionText(e.target.value)}
          placeholder="Ej: listar gastos fijos"
          className="w-full rounded-xl border border-white/15 bg-orange-400/[0.07] px-3 py-2 text-sm outline-none placeholder:text-slate-500 focus:border-sky-400/50"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={dueDate}
          min={todayStr()}
          onChange={(e) => setDueDate(e.target.value)}
          className="rounded-xl border border-white/15 bg-orange-400/[0.07] px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400/50"
        />
        {dueDate && (
          <button onClick={() => setDueDate('')} className="text-xs text-slate-500 hover:text-slate-300">
            sin fecha
          </button>
        )}
      </div>
      <button
        onClick={onSave}
        disabled={busy}
        className="w-full rounded-xl border border-sky-400/40 bg-sky-500/10 px-3 py-2 text-sm font-medium text-sky-200 hover:bg-sky-500/20 disabled:opacity-40"
      >
        Guardar acción
      </button>
    </div>
  );
}
