"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { calculateStreak, getToday } from "@/lib/utils";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { isHiddenHabit } from "@/lib/types";
import type { UserProfile, Habit, HabitLog, SleepLog, MacroLog, WeeklyCheckin, StreakFreeze, WorkoutLog } from "@/lib/types";
import { getCached, setCached } from "@/lib/cache";

interface PageCache {
  profile: UserProfile | null;
  habits: Habit[];
  logs: HabitLog[];
  sleeps: SleepLog[];
  macros: MacroLog[];
  checkins: WeeklyCheckin[];
  freezes: StreakFreeze[];
  workouts: WorkoutLog[];
}

export default function UserSummaryPage() {
  const params = useParams();
  const userId = params.userId as string;
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();


  const cacheKey = `user_${userId}`;
  const cached = getCached<PageCache>(cacheKey);
  const [loading, setLoading] = useState(!cached);
  const [profile, setProfile] = useState<UserProfile | null>(cached?.profile ?? null);
  const [habits, setHabits] = useState<Habit[]>(cached?.habits ?? []);
  const [logs, setLogs] = useState<HabitLog[]>(cached?.logs ?? []);
  const [sleeps, setSleeps] = useState<SleepLog[]>(cached?.sleeps ?? []);
  const [macros, setMacros] = useState<MacroLog[]>(cached?.macros ?? []);
  const [checkins, setCheckins] = useState<WeeklyCheckin[]>(cached?.checkins ?? []);
  const [freezes, setFreezes] = useState<StreakFreeze[]>(cached?.freezes ?? []);
  const [workouts, setWorkouts] = useState<WorkoutLog[]>(cached?.workouts ?? []);

  useEffect(() => {
    if (!authLoading && !user) router.push("/");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user || !userId) return;
    const fetchAll = async () => {
      const [p, h, l, s, m, c, f, w] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).single(),
        supabase.from("habits").select("*").eq("user_id", userId),
        supabase.from("habit_logs").select("*").eq("user_id", userId),
        supabase.from("sleep_logs").select("*").eq("user_id", userId).order("date", { ascending: true }),
        supabase.from("macro_logs").select("*").eq("user_id", userId).order("date", { ascending: true }),
        supabase.from("weekly_checkins").select("*").eq("user_id", userId),
        supabase.from("streak_freezes").select("*").eq("user_id", userId),
        supabase.from("workout_logs").select("*").eq("user_id", userId).order("date", { ascending: true }),
      ]);
      setProfile(p.data);
      setHabits(h.data || []);
      setLogs(l.data || []);
      setSleeps(s.data || []);
      setMacros(m.data || []);
      setCheckins(c.data || []);
      setFreezes(f.data || []);
      setWorkouts(w.data || []);
      setLoading(false);
      setCached(cacheKey, {
        profile: p.data ?? null,
        habits: h.data || [],
        logs: l.data || [],
        sleeps: s.data || [],
        macros: m.data || [],
        checkins: c.data || [],
        freezes: f.data || [],
        workouts: w.data || [],
      });
    };
    fetchAll();
  }, [user, userId]);

  if (authLoading || loading || !profile) {
    return (
      <div className="min-h-screen pt-16 sm:pt-20 pb-24 sm:pb-8 px-4 max-w-5xl mx-auto animate-pulse">
        <div className="card p-5 h-24 mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card p-5 h-28" />
          <div className="card p-5 h-28" />
          <div className="card p-5 h-28" />
          <div className="card p-5 h-28" />
        </div>
        <div className="card p-5 h-48" />
      </div>
    );
  }

  const visibleHabits = habits.filter(
    (h) => !isHiddenHabit(h)
  );
  const streak = calculateStreak(logs, visibleHabits.length);
  const habitCompletionPct = visibleHabits.length && logs.length
    ? Math.round((logs.filter((l) => l.completed).length / (90 * visibleHabits.length)) * 100)
    : 0;
  const avgSleep = sleeps.length
    ? sleeps.reduce((s, x) => s + x.hours, 0) / sleeps.length
    : 0;
  const avgMacros = macros.length
    ? {
        protein: Math.round(macros.reduce((s, x) => s + x.protein, 0) / macros.length),
        carbs: Math.round(macros.reduce((s, x) => s + x.carbs, 0) / macros.length),
        fat: Math.round(macros.reduce((s, x) => s + x.fat, 0) / macros.length),
        calories: Math.round(macros.reduce((s, x) => s + x.calories, 0) / macros.length),
      }
    : { protein: 0, carbs: 0, fat: 0, calories: 0 };

  const todayStr = getToday();
  const todayWorkout = workouts.find((w) => w.date === todayStr);
  const latestWorkout = workouts.length > 0 ? workouts[workouts.length - 1] : null;

  const workoutData = Object.entries(
    workouts.reduce<Record<string, number>>((acc, w) => {
      acc[w.split] = (acc[w.split] || 0) + 1;
      return acc;
    }, {})
  ).map(([split, count]) => ({ split, count }));

  const sleepData = sleeps.slice(-21).map((s) => ({
    date: new Date(s.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    hours: s.hours,
  }));
  const macroData = macros.slice(-14).map((m) => ({
    date: new Date(m.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    protein: m.protein,
    carbs: m.carbs,
    fat: m.fat,
  }));

  const arcScore = Math.round(
    habitCompletionPct * 0.4 +
    (avgSleep / 10) * 20 +
    Math.round((macros.length / 90) * 100) * 0.2 +
    Math.round((checkins.length / 13) * 100) * 0.2
  );

  return (
    <div className="min-h-screen pt-16 sm:pt-20 pb-24 sm:pb-8 px-4">
      <Navbar />
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <div className="font-mono text-[11px] tracking-[0.3em] text-accent-orange mb-2">{"// FRIEND PROFILE"}</div>
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-2xl"
              style={{ backgroundColor: profile.avatar_color }}
            >
              {profile.full_name.charAt(0)}
            </div>
            <div>
              <h1 className="text-3xl md:text-5xl font-bold tracking-tighter text-white truncate">
                {profile.full_name}<span className="text-accent-orange">.</span>
              </h1>
              <p className="text-muted text-sm font-mono uppercase tracking-wider">
                Goal: {profile.goal_mode} · Day-one habits: {visibleHabits.length}
              </p>
              <p className="text-muted text-sm mt-1">
                {todayWorkout
                  ? `Today (${new Date(todayWorkout.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}): ${todayWorkout.split}`
                  : latestWorkout
                    ? `Last workout: ${latestWorkout.split} on ${new Date(latestWorkout.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                    : "No workout logs yet"}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "ARC SCORE", value: `${arcScore}`, sub: "points" },
            { label: "STREAK", value: `${streak}d`, sub: `${freezes.length} freezes used` },
            { label: "HABIT DONE", value: `${habitCompletionPct}%`, sub: `${visibleHabits.length} habits` },
            { label: "AVG SLEEP", value: `${avgSleep.toFixed(1)}h`, sub: `${sleeps.length} nights` },
          ].map((s) => (
            <div key={s.label} className="card p-5">
              <div className="text-[10px] text-muted-dark font-mono tracking-widest mb-2">{s.label}</div>
              <div className="text-3xl font-black text-white">{s.value}</div>
              <div className="text-[10px] text-muted-dark font-mono mt-1">{s.sub}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          <div className="card p-5">
            <h3 className="text-sm font-bold text-white mb-4">Sleep — last 3 weeks</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sleepData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis dataKey="date" stroke="#525252" fontSize={10} />
                  <YAxis domain={[0, 12]} stroke="#525252" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "8px" }} />
                  <Line type="monotone" dataKey="hours" stroke="#ea580c" strokeWidth={2} dot={{ fill: "#ea580c", r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-bold text-white mb-4">Macros — last 2 weeks</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={macroData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis dataKey="date" stroke="#525252" fontSize={10} />
                  <YAxis stroke="#525252" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "8px" }} />
                  <Bar dataKey="protein" fill="#ea580c" name="Protein" />
                  <Bar dataKey="carbs" fill="#6b7280" name="Carbs" />
                  <Bar dataKey="fat" fill="#fafafa" name="Fat" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card p-5">
            <h3 className="text-sm font-bold text-white mb-4">Workout Splits</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workoutData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis dataKey="split" stroke="#525252" fontSize={10} />
                  <YAxis allowDecimals={false} stroke="#525252" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "8px" }} />
                  <Bar dataKey="count" fill="#ea580c" name="Days" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-bold text-white mb-4">Daily Averages</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "PROTEIN", value: `${avgMacros.protein}g` },
              { label: "CARBS", value: `${avgMacros.carbs}g` },
              { label: "FAT", value: `${avgMacros.fat}g` },
              { label: "CALORIES", value: `${avgMacros.calories}` },
            ].map((m) => (
              <div key={m.label}>
                <div className="text-[10px] text-muted-dark font-mono tracking-widest mb-1">{m.label}</div>
                <div className="text-2xl font-bold text-white">{m.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
