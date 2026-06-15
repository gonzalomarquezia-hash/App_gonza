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
}
