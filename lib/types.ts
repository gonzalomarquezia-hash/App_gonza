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
  week_days: number[]; // 0=Dom … 6=Sáb. Días en que aplica el hábito.
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

export type CheckinState = 'done' | 'rest';

export interface Checkin {
  id: string;
  habit_id: string;
  day: string; // YYYY-MM-DD
  state: CheckinState;
}

export interface HabitStats {
  streak: number;
  lifetime: number;
  summitDay: number;
  nextCamp: Camp | null;
  daysToNextCamp: number | null;
  progress: number; // 0..1 hacia la cumbre
  todayState: CheckinState | null; // solo para hábitos 'do'

  // Métricas extra (Fase 3)
  doneCount: number; // días marcados "hecho"
  restCount: number; // días marcados "descanso"
  missCount: number; // días programados sin marcar (entre el inicio y hoy)
  pctTotal: number; // 0..100 hacia la cumbre (= progress*100)
  pctCamp: number; // 0..100 dentro del campamento actual
  campLabel: string; // ej. "Campamento 1 (7 días)" o "Cumbre"
}
