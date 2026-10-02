import { ARC_START_DATE } from "./types";

export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function getToday(): string {
  return formatDate(new Date());
}

export function getDayNumber(dateStr: string): number {
  const date = new Date(dateStr);
  const diffTime = date.getTime() - ARC_START_DATE.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

export function getDateFromDay(day: number): Date {
  const date = new Date(ARC_START_DATE);
  date.setDate(date.getDate() + day - 1);
  return date;
}

export function getWeekNumber(dateStr: string): number {
  const day = getDayNumber(dateStr);
  return Math.ceil(day / 7);
}

export function getMonthFromDay(day: number): number {
  if (day <= 31) return 0; // October
  if (day <= 61) return 1; // November
  return 2; // December
}

export function getMonthName(monthIndex: number): string {
  const names = ["October", "November", "December"];
  return names[monthIndex];
}

// A day counts towards the streak when the user completes at least
// half of their habits that day.
export function calculateStreak(
  logs: { date: string; completed: boolean; habit_id?: string }[],
  habitCount: number
): number {
  if (habitCount <= 0) return 0;
  const requiredToday = Math.ceil(habitCount / 2);

  const completedPerDate = new Map<string, Set<string>>();
  for (const log of logs) {
    if (!log.completed) continue;
    if (!completedPerDate.has(log.date)) completedPerDate.set(log.date, new Set());
    completedPerDate.get(log.date)!.add(log.habit_id ?? `__${log.date}`);
  }

  let streak = 0;
  const today = new Date();

  for (let i = 0; ; i++) {
    const expectedDate = new Date(today);
    expectedDate.setDate(expectedDate.getDate() - i);
    const expectedStr = formatDate(expectedDate);

    const dayCompleted = completedPerDate.get(expectedStr);
    if (dayCompleted && dayCompleted.size >= requiredToday) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export function calculateArcScore(
  habitCompletion: number,
  sleepAvg: number,
  macroAdherence: number,
  checkinCompletion: number
): number {
  const habitScore = habitCompletion * 0.4;
  const sleepScore = (sleepAvg / 10) * 20;
  const macroScore = macroAdherence * 0.2;
  const checkinScore = checkinCompletion * 0.2;
  return Math.round(habitScore + sleepScore + macroScore + checkinScore);
}

export function getStreakColor(streak: number): string {
  if (streak >= 30) return "text-white";
  if (streak >= 14) return "text-orange-300";
  if (streak >= 7) return "text-orange-400";
  if (streak >= 3) return "text-accent-orange";
  return "text-muted";
}

export function getStreakEmoji(streak: number): string {
  if (streak >= 60) return "🏆";
  if (streak >= 30) return "🔥";
  if (streak >= 21) return "⚡";
  if (streak >= 14) return "❄️";
  if (streak >= 7) return "🌟";
  if (streak >= 3) return "✨";
  return "💨";
}

export function getSleepColor(hours: number): string {
  if (hours >= 9) return "#fb923c";
  if (hours >= 8) return "#ea580c";
  if (hours >= 7) return "#ea580c";
  if (hours >= 6) return "#c2410c";
  return "#525252";
}

export function getSleepLabel(hours: number): string {
  if (hours >= 10) return "10+ hrs";
  if (hours >= 9) return "9 hrs";
  if (hours >= 8) return "8 hrs";
  if (hours >= 7) return "7 hrs";
  if (hours >= 6) return "6 hrs";
  if (hours >= 5) return "5 hrs";
  return "<5 hrs";
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

export function getDayProgress(): number {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = now.getTime() - startOfDay.getTime();
  return Math.round((diff / (1000 * 60 * 60 * 24)) * 100);
}
