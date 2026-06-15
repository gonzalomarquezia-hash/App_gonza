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
