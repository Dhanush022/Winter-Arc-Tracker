"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";
import LeaderboardList from "@/components/LeaderboardList";
import { GalleryHeading } from "@/shaders/neuform-isolated/NeuformIsolatedEffects";
import "@/shaders/threeui.css";
import { useRouter } from "next/navigation";
import { getToday, getDayNumber, calculateStreak, cn } from "@/lib/utils";
import { formatDate, getDateFromDay, getMonthFromDay } from "@/lib/utils";
import { MONTHS, MAX_FREEZES } from "@/lib/types";
import { motion } from "framer-motion";
import type { Habit, HabitLog, SleepLog, StreakFreeze, MacroLog } from "@/lib/types";

const HABIT_POINTS: Record<string, number> = {
  "Workout / Exercise": 15,
  "10,000 Steps": 10,
  "Drink 3L Water": 10,
  "No Junk Food": 10,
  "Healthy Meals": 10,
  "Read / Learn": 10,
  "Meditate / Journal": 10,
  "Wake Up Early": 10,
  "Sleep On Time": 10,
  "Be Productive": 15,
};

const MAX_DAILY_SCORE = 110;

export default function DashboardPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [allLogs, setAllLogs] = useState<HabitLog[]>([]);
  const [sleepLogs, setSleepLogs] = useState<SleepLog[]>([]);
  const [freezes, setFreezes] = useState<StreakFreeze[]>([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeMonth, setActiveMonth] = useState(getMonthFromDay(getDayNumber(getToday())));
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [todayWorkout, setTodayWorkout] = useState("");

  // Sleep field
  const [sleepHours, setSleepHours] = useState("");
  const [checkingIn, setCheckingIn] = useState(false);
  const [sleepSaved, setSleepSaved] = useState(false);
  const [sleepError, setSleepError] = useState("");

  // Macro fields
  const [macroProtein, setMacroProtein] = useState("");
  const [macroCarbs, setMacroCarbs] = useState("");
  const [macroFat, setMacroFat] = useState("");
  const [macroCalories, setMacroCalories] = useState("");
  const [savingMacros, setSavingMacros] = useState(false);
  const [macroLogs, setMacroLogs] = useState<MacroLog[]>([]);

  const today = getToday();
  const dayNumber = getDayNumber(today);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);

      const [habitsRes, logsRes, sleepRes, freezesRes, macrosRes] = await Promise.all([
        supabase.from("habits").select("*").eq("user_id", user.id).order("order"),
        supabase.from("habit_logs").select("*").eq("user_id", user.id),
        supabase.from("sleep_logs").select("*").eq("user_id", user.id).order("date", { ascending: false }).limit(90),
        supabase.from("streak_freezes").select("*").eq("user_id", user.id),
        supabase.from("macro_logs").select("*").eq("user_id", user.id).eq("date", today),
      ]);

      if (habitsRes.data) setHabits(habitsRes.data);
      if (logsRes.data) {
        setAllLogs(logsRes.data);
        const count = (habitsRes.data ?? []).filter((h) => !(h.custom && (h.name === "Custom Habit 1" || h.name === "Custom Habit 2"))).length;
        setStreak(calculateStreak(logsRes.data, count));
      }
      if (sleepRes.data) setSleepLogs(sleepRes.data);
      if (freezesRes.data) setFreezes(freezesRes.data);

      // Pre-fill macro fields for today
      if (macrosRes.data && macrosRes.data.length > 0) {
        const todayMacro = macrosRes.data[0];
        setMacroLogs(macrosRes.data);
        setMacroProtein(todayMacro.protein.toString());
        setMacroCarbs(todayMacro.carbs.toString());
        setMacroFat(todayMacro.fat.toString());
        setMacroCalories(todayMacro.calories.toString());
      }

      setLoading(false);
    };

    fetchData();
  }, [user, today]);

  const toggleHabit = async (habitId: string) => {
    const existing = allLogs.find((l) => l.habit_id === habitId && l.date === today);

    if (existing) {
      const newCompleted = !existing.completed;
      const { error } = await supabase
        .from("habit_logs")
        .update({ completed: newCompleted })
        .eq("id", existing.id);

      if (!error) {
        setAllLogs((prev) =>
          prev.map((l) => (l.id === existing.id ? { ...l, completed: newCompleted } : l))
        );
      }
    } else {
      const { data, error } = await supabase
        .from("habit_logs")
        .insert({ user_id: user!.id, habit_id: habitId, date: today, completed: true })
        .select()
        .single();

      if (data && !error) setAllLogs((prev) => [...prev, data]);
    }
  };

  const toggleHabitDate = async (habitId: string, date: string) => {
    const existing = allLogs.find((l) => l.habit_id === habitId && l.date === date);

    if (existing) {
      const newCompleted = !existing.completed;
      const { error } = await supabase
        .from("habit_logs")
        .update({ completed: newCompleted })
        .eq("id", existing.id);

      if (!error) {
        setAllLogs((prev) =>
          prev.map((l) => (l.id === existing.id ? { ...l, completed: newCompleted } : l))
        );
      }
    } else {
      const { data, error } = await supabase
        .from("habit_logs")
        .insert({ user_id: user!.id, habit_id: habitId, date, completed: true })
        .select()
        .single();

      if (data && !error) setAllLogs((prev) => [...prev, data]);
    }
  };

  const useFreeze = async () => {
    const { data, error } = await supabase
      .from("streak_freezes")
      .insert({ user_id: user!.id, date_used: today })
      .select()
      .single();

    if (data && !error) {
      setFreezes((prev) => [...prev, data]);
      setShowFreezeModal(false);
    }
  };

  const handleCheckin = async () => {
    setCheckingIn(true);
    setSleepError("");

    if (sleepHours) {
      const hours = Math.max(0, Number(sleepHours) || 0);
      const existing = sleepLogs.find((s) => s.date === today);
      if (existing) {
        const { error } = await supabase.from("sleep_logs").update({ hours }).eq("id", existing.id);
        if (error) {
          setSleepError(error.message);
        } else {
          setSleepLogs((prev) => prev.map((s) => s.id === existing.id ? { ...s, hours } : s));
          setSleepSaved(true);
          setTimeout(() => setSleepSaved(false), 1800);
        }
      } else {
        const { data, error } = await supabase.from("sleep_logs").insert({ user_id: user!.id, date: today, hours }).select().single();
        if (error) {
          setSleepError(error.message);
        } else if (data) {
          setSleepLogs((prev) => [data, ...prev]);
          setSleepSaved(true);
          setTimeout(() => setSleepSaved(false), 1800);
        }
      }
    } else {
      setSleepError("Enter the number of hours first.");
    }

    setCheckingIn(false);
    router.refresh();
  };

  const saveMacros = async () => {
    setSavingMacros(true);
    const existing = macroLogs.find((m) => m.date === today);

    if (existing) {
      const { error } = await supabase.from("macro_logs").update({
        protein: Math.max(0, Number(macroProtein) || 0),
        carbs: Math.max(0, Number(macroCarbs) || 0),
        fat: Math.max(0, Number(macroFat) || 0),
        calories: Math.max(0, Number(macroCalories) || 0),
      }).eq("id", existing.id);

      if (!error) {
        setMacroLogs((prev) => prev.map((m) => m.id === existing.id ? {
          ...m,
          protein: Math.max(0, Number(macroProtein) || 0),
          carbs: Math.max(0, Number(macroCarbs) || 0),
          fat: Math.max(0, Number(macroFat) || 0),
          calories: Math.max(0, Number(macroCalories) || 0),
        } : m));
      }
    } else {
      const { data, error } = await supabase.from("macro_logs").insert({
        user_id: user!.id,
        date: today,
        protein: Math.max(0, Number(macroProtein) || 0),
        carbs: Math.max(0, Number(macroCarbs) || 0),
        fat: Math.max(0, Number(macroFat) || 0),
        calories: Math.max(0, Number(macroCalories) || 0),
      }).select().single();

      if (data && !error) setMacroLogs((prev) => [...prev, data]);
    }
    setSavingMacros(false);
    router.refresh();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-accent-teal text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  const todayLogs = allLogs.filter((l) => l.date === today);
  const completedToday = todayLogs.filter((l) => l.completed);

  // Hide placeholder custom habits until the user names them in Profile
  const visibleHabits = habits.filter(
    (h) => !(h.custom && (h.name === "Custom Habit 1" || h.name === "Custom Habit 2"))
  );
  const todayScore = completedToday.reduce((sum, l) => {
    const habit = habits.find((h) => h.id === l.habit_id);
    return sum + (habit ? HABIT_POINTS[habit.name] || 10 : 10);
  }, 0);

  const completionPct = visibleHabits.length > 0 ? (completedToday.length / visibleHabits.length) * 100 : 0;

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dateStr = date.toISOString().split("T")[0];
    const dayLogs = allLogs.filter((l) => l.date === dateStr && l.completed);
    return {
      day: date.toLocaleDateString("en-US", { weekday: "narrow" }),
      completed: dayLogs.length,
    };
  });

  const freezesLeft = MAX_FREEZES - freezes.length;

  const getMonthDays = (monthIndex: number) => {
    const days = [];
    const startDay = MONTHS[monthIndex].startDay;
    for (let i = 0; i < MONTHS[monthIndex].days; i++) {
      days.push(startDay + i);
    }
    return days;
  };

  const isCompleted = (habitId: string, date: string) => {
    return allLogs.find((l) => l.habit_id === habitId && l.date === date)?.completed || false;
  };

  const macroTargets = profile?.macro_targets || { protein: 150, carbs: 250, fat: 70, calories: 2500 };

  return (
    <div className="min-h-screen pt-16 pb-8 px-4">
      <Navbar />

      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="card p-8 mb-6 grid-bg">
          <div className="flex flex-col items-center text-center">
            <div className="shader-frame w-full max-w-3xl h-[360px] md:h-[440px] rounded-xl overflow-hidden">
              <GalleryHeading
                variant="rising-diagonal"
                mode="dark"
                font="sans"
                weight="400"
                headlineSize={1.55}
                hue={0}
                saturation={1.0}
                brightness={1.0}
              />
            </div>
            <p className="text-muted text-base md:text-lg mt-1 max-w-xl">
              Keep every promise you make to yourself. Build streaks, protect them with limited freezes, and climb with your crew.
            </p>
            <div className="flex gap-8 mt-4 justify-center">
              <div>
                <div className="text-2xl font-bold text-white">{dayNumber}</div>
                <div className="text-[10px] text-muted-dark font-mono tracking-widest font-mono">DAY OF ARC</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{streak}d</div>
                <div className="text-[10px] text-muted-dark font-mono tracking-widest font-mono">STREAK</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{todayScore}</div>
                <div className="text-[10px] text-muted-dark font-mono tracking-widest font-mono">TODAY&apos;S PTS</div>
              </div>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
          <div>
            <div className="text-accent-teal text-xs tracking-widest mb-1">
              TODAY · {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" }).toUpperCase()}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tighter text-white">
              HOLD THE LINE, <span className="italic font-serif font-normal text-white/70">{profile?.full_name?.split(" ")[0]?.toUpperCase() || "WARRIOR"}</span>
            </h1>
          </div>
          <div className="flex gap-3 mt-4 sm:mt-0">
            <div className="card px-4 py-2 flex items-center gap-2">
              <span className="text-accent-orange">🔥</span>
              <div>
                <div className="text-white font-bold">{streak}</div>
                <div className="text-[10px] text-muted-dark font-mono tracking-widest font-mono">DAY STREAK</div>
              </div>
            </div>
            <div className="card px-4 py-2 flex items-center gap-2">
              <span className="text-accent-teal">❄</span>
              <div>
                <div className="text-white font-bold">{freezesLeft}</div>
                <div className="text-[10px] text-muted-dark font-mono tracking-widest font-mono">FREEZES</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {/* Daily Commitments */}
          <div className="lg:col-span-2 card p-5">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-bold text-white tracking-tight">DAILY COMMITMENTS</h2>
              <span className="text-2xl font-black text-white">{Math.round(completionPct)}%</span>
            </div>
            <p className="text-muted text-xs mb-4">Honor system · tap only what you completed</p>

            <div className="progress-bar mb-4">
              <div className="progress-bar-fill" style={{ width: `${completionPct}%` }} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {visibleHabits.map((habit) => {
                const log = todayLogs.find((l) => l.habit_id === habit.id);
                const completed = log?.completed || false;
                const points = HABIT_POINTS[habit.name] || 10;

                return (
                  <motion.button
                    key={habit.id}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => toggleHabit(habit.id)}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all text-left group ${
                      completed
                        ? "border-accent-teal/30 bg-accent-teal/5"
                        : "border-surface-border bg-surface-light/50 hover:border-accent-orange/40 hover:bg-surface-light"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <motion.div
                        initial={false}
                        animate={completed ? { scale: [1, 1.35, 1] } : { scale: 1 }}
                        transition={{ duration: 0.25 }}
                        className={`habit-checkbox ${completed ? "checked" : ""}`}
                      />
                      <span className={`text-base ${completed ? "text-white" : "text-muted group-hover:text-foreground"}`}>
                        {habit.name}
                      </span>
                    </div>
                    <span className={`text-xs font-mono uppercase tracking-wider transition-colors ${completed ? "text-accent-orange" : "text-muted-dark"}`}>+{points}</span>
                  </motion.button>
                );
              })}
            </div>

            {/* Card footer status */}
            <div className="mt-4 pt-4 border-t border-surface-border flex items-center justify-between">
              <span className="text-[10px] text-muted-dark font-mono tracking-widest uppercase">
                {completedToday.length} / {visibleHabits.length} DONE TODAY
              </span>
              <span className="text-[10px] text-accent-orange font-mono tracking-widest uppercase">
                {todayScore}/{MAX_DAILY_SCORE} PTS AVAILABLE
              </span>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            {/* Streak Freeze squeeze */}
            <div className="card px-4 py-3 flex items-center justify-between">
              <span className="text-[10px] text-muted-dark font-mono tracking-widest uppercase">❄ Freezes Left: <span className="text-white font-bold">{freezesLeft}</span></span>
              <button
                onClick={() => setShowFreezeModal(true)}
                disabled={freezesLeft <= 0}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                  freezesLeft > 0
                    ? "bg-accent-teal text-black hover:opacity-90"
                    : "border border-surface-border text-muted-dark cursor-not-allowed"
                )}
              >
                Use Freeze
              </button>
            </div>

            {/* Today's Score */}
            <div className="card p-5">
              <div className="text-[10px] text-muted-dark font-mono tracking-widest font-mono mb-2">TODAY&apos;S SCORE</div>
              <div className="flex items-center justify-between mb-3">
                <div className="text-3xl font-black text-white">
                  {todayScore}<span className="text-lg text-muted-dark">/{MAX_DAILY_SCORE}</span>
                </div>
                <span className="text-accent-orange text-2xl">🏅</span>
              </div>
              <p className="text-muted text-xs">Complete every commitment to earn a perfect day.</p>
            </div>

            {/* Last 7 Days */}
            <div className="card p-5">
              <div className="text-[10px] text-muted-dark font-mono tracking-widest font-mono mb-4">LAST 7 DAYS</div>
              <div className="flex items-end justify-between h-24 gap-1">
                {last7Days.map((day, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-surface-light rounded-sm overflow-hidden" style={{ height: "60px" }}>
                      <div
                        className="w-full bg-neutral-500/60 rounded-sm transition-all"
                        style={{ height: `${visibleHabits.length > 0 ? (day.completed / visibleHabits.length) * 100 : 0}%`, marginTop: `${100 - (visibleHabits.length > 0 ? (day.completed / visibleHabits.length) * 100 : 0)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-dark font-mono">{day.day}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Today's Workout */}
            <div className="card p-5">
              <div className="text-[10px] text-muted-dark font-mono tracking-widest font-mono mb-2">TODAY&apos;S WORKOUT</div>
              <select
                value={todayWorkout}
                onChange={(e) => setTodayWorkout(e.target.value)}
                className="input-field w-full text-base font-semibold appearance-none cursor-pointer"
              >
                <option value="">Select split…</option>
                <option value="Push">Push</option>
                <option value="Pull">Pull</option>
                <option value="Legs">Legs</option>
                <option value="Upper">Upper</option>
                <option value="Lower">Lower</option>
                <option value="Back & Triceps">Back &amp; Triceps</option>
                <option value="Chest & Biceps">Chest &amp; Biceps</option>
                <option value="Shoulders">Shoulders</option>
                <option value="Arms">Arms</option>
              </select>
              {todayWorkout && (
                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 text-sm text-accent-orange font-mono"
                >
                  ▸ {todayWorkout} day — go earn it.
                </motion.p>
              )}
            </div>
          </div>
        </div>

        {/* Habit Grid */}
        <div className="card p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white tracking-tight">HABIT GRID</h2>
            <div className="flex gap-2">
              {MONTHS.map((month, index) => (
                <button
                  key={month.name}
                  onClick={() => setActiveMonth(index)}
                  className={cn(
                    "px-3 py-1 rounded text-xs font-medium transition-all",
                    activeMonth === index
                      ? "bg-accent-teal/10 text-accent-teal border border-accent-teal/30"
                      : "text-muted border border-surface-border hover:text-white"
                  )}
                >
                  {month.short}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Header Row */}
              <div className="grid grid-cols-[200px_repeat(31,1fr)] gap-1 mb-2">
                <div className="text-[10px] text-muted-dark font-mono tracking-widest font-mono font-medium">HABIT</div>
                {getMonthDays(activeMonth).map((day) => (
                  <div key={day} className="text-[10px] text-muted-dark font-mono text-center">
                    {day}
                  </div>
                ))}
              </div>

              {/* Habit Rows */}
              {visibleHabits.map((habit) => (
                <div key={habit.id} className="grid grid-cols-[200px_repeat(31,1fr)] gap-1 mb-1">
                  <div className="text-base text-muted font-medium truncate pr-2 flex items-center justify-between">
                    <span>{habit.name}</span>
                    <span className="text-[10px] text-muted-dark font-mono">+{HABIT_POINTS[habit.name] || 10}</span>
                  </div>
                  {getMonthDays(activeMonth).map((day) => {
                    const date = formatDate(getDateFromDay(day));
                    const completed = isCompleted(habit.id, date);
                    const isFuture = date > today;
                    const isToday = date === today;

                    return (
                      <button
                        key={day}
                        onClick={() => !isFuture && toggleHabitDate(habit.id, date)}
                        disabled={isFuture}
                        className={cn(
                          "w-full h-4 rounded transition-all text-[10px]",
                          completed
                            ? "bg-accent-teal/20 border border-accent-teal/40"
                            : isFuture
                            ? "bg-surface-light/30 cursor-not-allowed"
                            : "bg-surface-light hover:bg-surface-light/80 border border-surface-border/50",
                          isToday && "ring-1 ring-white/60"
                        )}
                      >
                        {completed && <span className="text-accent-teal">✓</span>}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sleep Section */}
        <div className="card p-5 mb-4">
          <h2 className="text-lg font-bold text-white tracking-tight mb-4">SLEEP</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-[10px] text-muted-dark font-mono mb-1 tracking-widest">DATE</label>
              <input
                type="date"
                value={today}
                readOnly
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-[10px] text-muted-dark font-mono mb-1 tracking-widest">HOURS SLEPT</label>
              <input
                type="number" min="0"
                step="0.5"
                max="24"
                value={sleepHours}
                onChange={(e) => setSleepHours(e.target.value)}
                placeholder="8"
                className="input-field w-full"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleCheckin}
                disabled={checkingIn}
                className="w-full bg-accent-teal text-black font-semibold px-4 py-2.5 rounded-lg hover:opacity-90 transition-all disabled:opacity-60"
              >
                {checkingIn ? "Saving..." : "Save Sleep"}
              </button>
              {(sleepSaved || sleepError) && (
                <p className={`mt-2 text-xs font-mono uppercase tracking-wider ${sleepError ? "text-red-400" : "text-accent-orange"}`}>
                  {sleepError ? `Error: ${sleepError}` : "✓ Saved to the log"}
                </p>
              )}
            </div>
          </div>
          {sleepLogs.length > 0 && (
            <div className="text-sm text-muted">
              Average: {(sleepLogs.reduce((sum, s) => sum + s.hours, 0) / sleepLogs.length).toFixed(1)}h · Best: {Math.max(...sleepLogs.map((s) => s.hours))}h
            </div>
          )}
        </div>

        {/* Macros Section */}
        <div className="card p-5 mb-4">
          <h2 className="text-lg font-bold text-white tracking-tight mb-4">MACROS</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[10px] text-muted-dark font-mono mb-1 tracking-widest">PROTEIN (g)</label>
              <input
                type="number" min="0"
                placeholder={macroTargets.protein.toString()}
                value={macroProtein}
                onChange={(e) => setMacroProtein(e.target.value)}
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-[10px] text-muted-dark font-mono mb-1 tracking-widest">CARBS (g)</label>
              <input
                type="number" min="0"
                placeholder={macroTargets.carbs.toString()}
                value={macroCarbs}
                onChange={(e) => setMacroCarbs(e.target.value)}
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-[10px] text-muted-dark font-mono mb-1 tracking-widest">FAT (g)</label>
              <input
                type="number" min="0"
                placeholder={macroTargets.fat.toString()}
                value={macroFat}
                onChange={(e) => setMacroFat(e.target.value)}
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-[10px] text-muted-dark font-mono mb-1 tracking-widest">CALORIES</label>
              <input
                type="number" min="0"
                placeholder={macroTargets.calories.toString()}
                value={macroCalories}
                onChange={(e) => setMacroCalories(e.target.value)}
                className="input-field w-full"
              />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={saveMacros}
              disabled={savingMacros}
              className="bg-accent-teal text-black font-semibold px-6 py-2.5 rounded-lg hover:opacity-90 transition-all"
            >
              {savingMacros ? "Saving..." : "Save Macros"}
            </button>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="mb-8">
          <div className="text-accent-orange text-xs tracking-widest mb-2">THE PUBLIC RANKS</div>
          <h2 className="text-2xl font-bold tracking-tighter text-white mb-4">WHO KEPT <span className="italic font-serif font-normal text-white/70">THEIR WORD?</span></h2>
          <LeaderboardList />
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-center gap-2 text-muted-dark text-xs tracking-widest py-4">
          <span>❄</span>
          WINTER ARC · BUILT FOR THE SEASON NOBODY SEES
        </footer>
      </div>

      {/* Freeze Modal */}
      {showFreezeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="card p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-white mb-2">Use Streak Freeze?</h3>
            <p className="text-muted text-sm mb-4">
              This will protect your streak for one day. You have {freezesLeft} freeze{freezesLeft !== 1 ? "s" : ""} remaining.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowFreezeModal(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-surface-border text-muted hover:text-white transition-all"
              >
                Cancel
              </button>
              <button onClick={useFreeze} className="flex-1 px-4 py-2 rounded-lg bg-accent-teal text-black font-semibold hover:opacity-90 transition-all">
                Use Freeze
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
