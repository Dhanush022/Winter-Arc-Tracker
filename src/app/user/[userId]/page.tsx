"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { calculateStreak } from "@/lib/utils";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { UserProfile, Habit, HabitLog, SleepLog, MacroLog, WeeklyCheckin, StreakFreeze } from "@/lib/types";

export default function UserSummaryPage() {
  const params = useParams();
  const userId = params.userId as string;
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [sleeps, setSleeps] = useState<SleepLog[]>([]);
  const [macros, setMacros] = useState<MacroLog[]>([]);
  const [checkins, setCheckins] = useState<WeeklyCheckin[]>([]);
  const [freezes, setFreezes] = useState<StreakFreeze[]>([]);

  useEffect(() => {
    if (!authLoading && !user) router.push("/");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user || !userId) return;
    const fetchAll = async () => {
      const [p, h, l, s, m, c, f] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).single(),
        supabase.from("habits").select("*").eq("user_id", userId),
        supabase.from("habit_logs").select("*").eq("user_id", userId),
        supabase.from("sleep_logs").select("*").eq("user_id", userId).order("date", { ascending: true }),
        supabase.from("macro_logs").select("*").eq("user_id", userId).order("date", { ascending: true }),
        supabase.from("weekly_checkins").select("*").eq("user_id", userId),
        supabase.from("streak_freezes").select("*").eq("user_id", userId),
      ]);
      setProfile(p.data);
      setHabits(h.data || []);
      setLogs(l.data || []);
      setSleeps(s.data || []);
      setMacros(m.data || []);
      setCheckins(c.data || []);
      setFreezes(f.data || []);
      setLoading(false);
    };
    fetchAll();
  }, [user, userId]);

  if (authLoading || loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-accent-orange text-xl">Loading...</div>
      </div>
    );
  }

  const visibleHabits = habits.filter(
    (h) => !(h.custom && (h.name === "Custom Habit 1" || h.name === "Custom Habit 2"))
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
