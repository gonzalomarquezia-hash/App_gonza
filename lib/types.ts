export type HabitType = 'do' | 'avoid';

export interface Camp {
  day: number;
  reward: string;
}

export interface Habit {
  id: string;
  name: string;
  type: HabitType;
  camps: Camp[];
  week_days: number[]; // 0=Dom … 6=Sáb. Días en que aplica el hábito (el resto son descanso).
  start_time: string | null; // "HH:MM" hora de inicio (dispara el recordatorio a futuro).
  end_time: string | null; // "HH:MM" fin de la ventana (modo "de tal hora a tal hora").
  duration_min: number | null; // minutos del temporizador (modo "con temporizador").
  base_reset_at: string;
  lifetime_days: number;
  created_at: string;
}

export interface Note {
  id: string;
  habit_id: string;
  day: string; // YYYY-MM-DD
  text: string;
  created_at: string;
}

export type CheckinState = 'done' | 'miss'; // hecho / no realizado

export interface Checkin {
  id: string;
  habit_id: string;
  day: string; // YYYY-MM-DD
  state: CheckinState;
}

// ── Estructura ──────────────────────────────────────────────

export type BlockKind = 'task' | 'habit' | 'break';

export interface Routine {
  id: string;
  name: string;
  context: string; // 'casa' | 'local'
  is_active: boolean;
  created_at: string;
}

export interface Block {
  id: string;
  routine_id: string;
  name: string;
  description: string | null;
  start_time: string; // "HH:MM"
  duration_min: number;
  pos: number;
  habit_id: string | null;
  kind: BlockKind;
  created_at: string;
}

export interface Idea {
  id: string;
  text: string;
  day: string; // YYYY-MM-DD
  block_id: string | null;
  done: boolean;
  created_at: string;
}

// Mini-tarea (checklist) de un bloque. Plantilla recurrente; el tildado es por día.
export interface BlockItem {
  id: string;
  block_id: string;
  text: string;
  pos: number;
  created_at: string;
}

// Ítem resuelto con su estado del día (no persistido en la fila del ítem).
export interface BlockItemView extends BlockItem {
  done: boolean;
}

// Bloque resuelto a horario real (calculado con el offset del día, no persistido).
export interface TimedBlock extends Block {
  startMin: number; // minutos desde medianoche (inicio, con offset)
  endMin: number; // minutos desde medianoche (fin)
  done: boolean;
}

export interface ActiveBlockInfo {
  current: TimedBlock | null;
  next: TimedBlock | null;
  elapsedSec: number; // transcurrido del bloque actual
  remainingSec: number; // restante del actual; si no hay actual, hasta el próximo
  progress: number; // 0..1 consumido del bloque actual
}

export interface HabitStats {
  streak: number;
  lifetime: number;
  summitDay: number;
  nextCamp: Camp | null;
  daysToNextCamp: number | null;
  progress: number; // 0..1 hacia la cumbre
  todayState: CheckinState | null;

  // Métricas extra (Fase 3+4)
  doneCount: number; // días marcados "hecho"
  missCount: number; // días marcados "no realizado"
  pctTotal: number; // 0..100 hacia la cumbre (= progress*100)
  pctCamp: number; // 0..100 dentro del campamento actual
  campLabel: string; // ej. "Campamento 1 (7 días)" o "Cumbre"
}
