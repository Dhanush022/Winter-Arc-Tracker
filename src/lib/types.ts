export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  avatar_color: string;
  goal_mode: "bulk" | "cut" | "maintain";
  macro_targets: {
    protein: number;
    carbs: number;
    fat: number;
    calories: number;
  };
  created_at: string;
}

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  custom: boolean;
  order: number;
}

export interface HabitLog {
  id: string;
  user_id: string;
  habit_id: string;
  date: string;
  completed: boolean;
  steps?: number;
  water?: number;
}

export interface SleepLog {
  id: string;
  user_id: string;
  date: string;
  hours: number;
}

export interface MacroLog {
  id: string;
  user_id: string;
  date: string;
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
}

export interface MoodLog {
  id: string;
  user_id: string;
  date: string;
  energy: number;
  mood: number;
}

export interface WeeklyCheckin {
  id: string;
  user_id: string;
  week: number;
  weight: number | null;
  wins: string;
  focus: string;
}

export interface MonthlyReflection {
  id: string;
  user_id: string;
  month: "october" | "november" | "december";
  win: string;
  lesson: string;
  improve: string;
  next_goal: string;
}

export interface StreakFreeze {
  id: string;
  user_id: string;
  date_used: string;
}

export interface Badge {
  id: string;
  user_id: string;
  type: string;
  earned_at: string;
}

export interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  avatar_color: string;
  avatar_url: string | null;
  arc_score: number;
  habit_completion: number;
  sleep_avg: number;
  macro_adherence: number;
  current_streak: number;
  total_freezes: number;
}

export const DEFAULT_HABITS = [
  "Workout / Exercise",
  "10,000 Steps",
  "Drink 3L Water",
  "No Junk Food",
  "Healthy Meals",
  "Read / Learn",
  "Meditate / Journal",
  "Wake Up Early",
  "Sleep On Time",
  "Be Productive",
];

// habits we no longer track (removed from both the UI and the DB)
export const REMOVED_HABITS = [
  "Healthy Meals",
  "Meditate / Journal",
  "Wake Up Early",
  "Sleep On Time",
];

export const isHiddenHabit = (habit: { name: string; custom: boolean }) =>
  (habit.custom && (habit.name === "Custom Habit 1" || habit.name === "Custom Habit 2")) ||
  REMOVED_HABITS.includes(habit.name);

export const ARC_START_DATE = new Date("2026-10-01");
export const ARC_END_DATE = new Date("2026-12-31");
export const TOTAL_DAYS = 90;
export const TOTAL_WEEKS = 13;
export const MAX_FREEZES = 3;

export const MONTHS = [
  { name: "October", short: "Oct", days: 31, startDay: 1 },
  { name: "November", short: "Nov", days: 30, startDay: 32 },
  { name: "December", short: "Dec", days: 31, startDay: 62 },
];

export const BADGE_TYPES = {
  STREAK_3: "streak_3",
  STREAK_7: "streak_7",
  STREAK_14: "streak_14",
  STREAK_21: "streak_21",
  STREAK_30: "streak_30",
  STREAK_60: "streak_60",
  STREAK_90: "streak_90",
  PERFECT_DAY: "perfect_day",
  PERFECT_WEEK: "perfect_week",
  EARLY_BIRD: "early_bird",
  HYDRATION_HERO: "hydration_hero",
  MACRO_MASTER: "macro_master",
};
