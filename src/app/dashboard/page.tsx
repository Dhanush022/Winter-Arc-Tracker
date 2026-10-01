"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";
import { getToday, getDayNumber, calculateStreak, cn } from "@/lib/utils";
import { formatDate, getDateFromDay, getMonthFromDay } from "@/lib/utils";
import { MONTHS, MAX_FREEZES } from "@/lib/types";
import type { Habit, HabitLog, SleepLog, StreakFreeze, MacroLog, WeeklyCheckin, MonthlyReflection } from "@/lib/types";

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

  // Check-in fields
  const [sleepHours, setSleepHours] = useState("");
  const [weight, setWeight] = useState("");
  const [todayWin, setTodayWin] = useState("");
  const [tomorrowFocus, setTomorrowFocus] = useState("");
  const [checkingIn, setCheckingIn] = useState(false);

  // Macro fields
  const [macroProtein, setMacroProtein] = useState("");
  const [macroCarbs, setMacroCarbs] = useState("");
  const [macroFat, setMacroFat] = useState("");
  const [macroCalories, setMacroCalories] = useState("");
  const [savingMacros, setSavingMacros] = useState(false);
  const [macroLogs, setMacroLogs] = useState<MacroLog[]>([]);

  // Weekly check-in fields
  const [weeklyWeight, setWeeklyWeight] = useState("");
  const [weeklyWins, setWeeklyWins] = useState("");
  const [weeklyFocus, setWeeklyFocus] = useState("");
  const [savingWeekly, setSavingWeekly] = useState(false);
  const [weeklyCheckins, setWeeklyCheckins] = useState<WeeklyCheckin[]>([]);

  // Monthly reflection fields
  const [monthlyWin, setMonthlyWin] = useState("");
  const [monthlyLesson, setMonthlyLesson] = useState("");
  const [monthlyImprove, setMonthlyImprove] = useState("");
  const [monthlyGoal, setMonthlyGoal] = useState("");
  const [savingMonthly, setSavingMonthly] = useState(false);
  const [monthlyReflections, setMonthlyReflections] = useState<MonthlyReflection[]>([]);

  const today = getToday();
  const dayNumber = getDayNumber(today);
  const currentWeek = Math.ceil(dayNumber / 7);
  const currentMonthName = dayNumber <= 31 ? "october" : dayNumber <= 61 ? "november" : "december";

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);

      const [habitsRes, logsRes, sleepRes, freezesRes, macrosRes, checkinsRes, reflectionsRes] = await Promise.all([
        supabase.from("habits").select("*").eq("user_id", user.id).order("order"),
        supabase.from("habit_logs").select("*").eq("user_id", user.id),
        supabase.from("sleep_logs").select("*").eq("user_id", user.id).order("date", { ascending: false }).limit(90),
        supabase.from("streak_freezes").select("*").eq("user_id", user.id),
        supabase.from("macro_logs").select("*").eq("user_id", user.id).eq("date", today),
        supabase.from("weekly_checkins").select("*").eq("user_id", user.id).eq("week", currentWeek).maybeSingle(),
        supabase.from("monthly_reflections").select("*").eq("user_id", user.id).eq("month", currentMonthName).maybeSingle(),
      ]);

      if (habitsRes.data) setHabits(habitsRes.data);
      if (logsRes.data) {
        setAllLogs(logsRes.data);
        setStreak(calculateStreak(logsRes.data, habitsRes.data?.length ?? 0));
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

      // Pre-fill weekly check-in
      if (checkinsRes.data) {
        setWeeklyCheckins([checkinsRes.data]);
        setWeeklyWeight(checkinsRes.data.weight?.toString() || "");
        setWeeklyWins(checkinsRes.data.wins || "");
        setWeeklyFocus(checkinsRes.data.focus || "");
      }

      // Pre-fill monthly reflection
      if (reflectionsRes.data) {
        setMonthlyReflections([reflectionsRes.data]);
        setMonthlyWin(reflectionsRes.data.win || "");
        setMonthlyLesson(reflectionsRes.data.lesson || "");
        setMonthlyImprove(reflectionsRes.data.improve || "");
        setMonthlyGoal(reflectionsRes.data.next_goal || "");
      }

      setLoading(false);
    };

    fetchData();
  }, [user, today, currentWeek, currentMonthName]);

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

    if (sleepHours) {
      const existing = sleepLogs.find((s) => s.date === today);
      if (existing) {
        await supabase.from("sleep_logs").update({ hours: Number(sleepHours) }).eq("id", existing.id);
        setSleepLogs((prev) => prev.map((s) => s.id === existing.id ? { ...s, hours: Number(sleepHours) } : s));
      } else {
        const { data } = await supabase.from("sleep_logs").insert({ user_id: user!.id, date: today, hours: Number(sleepHours) }).select().single();
        if (data) setSleepLogs((prev) => [data, ...prev]);
      }
    }

    if (weight || todayWin || tomorrowFocus) {
      const week = Math.ceil(dayNumber / 7);
      const { data: existingCheckin } = await supabase
        .from("weekly_checkins")
        .select("*")
        .eq("user_id", user!.id)
        .eq("week", week)
        .maybeSingle();

      if (existingCheckin) {
        await supabase
          .from("weekly_checkins")
          .update({
            weight: weight ? Number(weight) : existingCheckin.weight,
            wins: todayWin || existingCheckin.wins,
            focus: tomorrowFocus || existingCheckin.focus,
          })
          .eq("id", existingCheckin.id);
      } else {
        await supabase.from("weekly_checkins").insert({
          user_id: user!.id,
          week,
          weight: weight ? Number(weight) : null,
          wins: todayWin,
          focus: tomorrowFocus,
        });
      }
    }

    setCheckingIn(false);
  };

  const saveMacros = async () => {
    setSavingMacros(true);
    const existing = macroLogs.find((m) => m.date === today);

    if (existing) {
      const { error } = await supabase.from("macro_logs").update({
        protein: Number(macroProtein) || 0,
        carbs: Number(macroCarbs) || 0,
        fat: Number(macroFat) || 0,
        calories: Number(macroCalories) || 0,
      }).eq("id", existing.id);

      if (!error) {
        setMacroLogs((prev) => prev.map((m) => m.id === existing.id ? {
          ...m,
          protein: Number(macroProtein) || 0,
          carbs: Number(macroCarbs) || 0,
          fat: Number(macroFat) || 0,
          calories: Number(macroCalories) || 0,
        } : m));
      }
    } else {
      const { data, error } = await supabase.from("macro_logs").insert({
        user_id: user!.id,
        date: today,
        protein: Number(macroProtein) || 0,
        carbs: Number(macroCarbs) || 0,
        fat: Number(macroFat) || 0,
        calories: Number(macroCalories) || 0,
      }).select().single();

      if (data && !error) setMacroLogs((prev) => [...prev, data]);
    }
    setSavingMacros(false);
  };

  const saveWeeklyCheckin = async () => {
    setSavingWeekly(true);
    const existing = weeklyCheckins.find((c) => c.week === currentWeek);

    if (existing) {
      await supabase.from("weekly_checkins").update({
        weight: weeklyWeight ? Number(weeklyWeight) : null,
        wins: weeklyWins,
        focus: weeklyFocus,
      }).eq("id", existing.id);
    } else {
      const { data } = await supabase.from("weekly_checkins").insert({
        user_id: user!.id,
        week: currentWeek,
        weight: weeklyWeight ? Number(weeklyWeight) : null,
        wins: weeklyWins,
        focus: weeklyFocus,
      }).select().single();

      if (data) setWeeklyCheckins((prev) => [...prev, data]);
    }
    setSavingWeekly(false);
  };

  const saveMonthlyReflection = async () => {
    setSavingMonthly(true);
    const existing = monthlyReflections.find((r) => r.month === currentMonthName);

    if (existing) {
      await supabase.from("monthly_reflections").update({
        win: monthlyWin,
        lesson: monthlyLesson,
        improve: monthlyImprove,
        next_goal: monthlyGoal,
      }).eq("id", existing.id);
    } else {
      const { data } = await supabase.from("monthly_reflections").insert({
        user_id: user!.id,
        month: currentMonthName,
        win: monthlyWin,
        lesson: monthlyLesson,
        improve: monthlyImprove,
        next_goal: monthlyGoal,
      }).select().single();

      if (data) setMonthlyReflections((prev) => [...prev, data]);
    }
    setSavingMonthly(false);
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
  const todayScore = completedToday.reduce((sum, l) => {
    const habit = habits.find((h) => h.id === l.habit_id);
    return sum + (habit ? HABIT_POINTS[habit.name] || 10 : 10);
  }, 0);

  const completionPct = habits.length > 0 ? (completedToday.length / habits.length) * 100 : 0;

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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent-orange/30 text-accent-orange text-xs font-medium tracking-widest mb-4">
                <span>❄</span>
                THE SEASON OF DISCIPLINE
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-[0.9] mb-4">
                <span className="text-white">DISCIPLINE</span>
                <br />
                <span className="teal-gradient">IN THE DARK.</span>
              </h1>
              <p className="text-muted text-sm mb-6 max-w-md">
                Keep every promise you make to yourself. Build streaks, protect them with limited freezes, and climb with your crew.
              </p>
              <div className="flex gap-8">
                <div>
                  <div className="text-2xl font-bold text-white">{dayNumber}</div>
                  <div className="text-[10px] text-muted-dark tracking-widest">DAY OF ARC</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{streak}d</div>
                  <div className="text-[10px] text-muted-dark tracking-widest">STREAK</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{todayScore}</div>
                  <div className="text-[10px] text-muted-dark tracking-widest">TODAY&apos;S PTS</div>
                </div>
              </div>
            </div>
            <div className="hidden lg:flex items-center justify-center">
              <div className="w-48 h-48 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-accent-teal/10 to-transparent rounded-full blur-3xl" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 bg-gradient-to-br from-surface-light to-surface border border-surface-border rounded-2xl transform rotate-12 flex items-center justify-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-accent-teal/20 to-accent-teal/5 rounded-xl transform -rotate-6 flex items-center justify-center">
                      <span className="text-4xl opacity-50">❄</span>
                    </div>
                  </div>
                </div>
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
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
              HOLD THE LINE, {profile?.full_name?.split(" ")[0]?.toUpperCase() || "WARRIOR"}
            </h1>
          </div>
          <div className="flex gap-3 mt-4 sm:mt-0">
            <div className="card px-4 py-2 flex items-center gap-2">
              <span className="text-accent-orange">🔥</span>
              <div>
                <div className="text-white font-bold">{streak}</div>
                <div className="text-[10px] text-muted-dark tracking-widest">DAY STREAK</div>
              </div>
            </div>
            <div className="card px-4 py-2 flex items-center gap-2">
              <span className="text-accent-teal">❄</span>
              <div>
                <div className="text-white font-bold">{freezesLeft}</div>
                <div className="text-[10px] text-muted-dark tracking-widest">FREEZES</div>
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
              {habits.map((habit) => {
                const log = todayLogs.find((l) => l.habit_id === habit.id);
                const completed = log?.completed || false;
                const points = HABIT_POINTS[habit.name] || 10;

                return (
                  <button
                    key={habit.id}
                    onClick={() => toggleHabit(habit.id)}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all text-left ${
                      completed
                        ? "border-accent-teal/30 bg-accent-teal/5"
                        : "border-surface-border hover:border-surface-border/80"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`habit-checkbox ${completed ? "checked" : ""}`} />
                      <span className={`text-sm ${completed ? "text-white" : "text-muted"}`}>
                        {habit.name}
                      </span>
                    </div>
                    <span className="text-xs text-muted-dark">+{points}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            {/* Today's Score */}
            <div className="card p-5">
              <div className="text-[10px] text-muted-dark tracking-widest mb-2">TODAY&apos;S SCORE</div>
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
              <div className="text-[10px] text-muted-dark tracking-widest mb-4">LAST 7 DAYS</div>
              <div className="flex items-end justify-between h-24 gap-1">
                {last7Days.map((day, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-surface-light rounded-sm overflow-hidden" style={{ height: "60px" }}>
                      <div
                        className="w-full bg-accent-teal/60 rounded-sm transition-all"
                        style={{ height: `${habits.length > 0 ? (day.completed / habits.length) * 100 : 0}%`, marginTop: `${100 - (habits.length > 0 ? (day.completed / habits.length) * 100 : 0)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-dark">{day.day}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Streak Freeze */}
            <div className="card p-5">
              <div className="text-[10px] text-muted-dark tracking-widest mb-2">STREAK FREEZE</div>
              <p className="text-muted text-xs mb-3">Protect your streak for one day. Limited uses.</p>
              <button
                onClick={() => setShowFreezeModal(true)}
                disabled={freezesLeft <= 0}
                className={cn(
                  "w-full px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  freezesLeft > 0
                    ? "border border-accent-teal/30 text-accent-teal hover:bg-accent-teal/5"
                    : "border border-surface-border text-muted-dark cursor-not-allowed"
                )}
              >
                ❄ Use Freeze ({freezesLeft} left)
              </button>
            </div>
          </div>
        </div>

        {/* Daily Check-in */}
        <div className="card p-5 mb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-muted">🌙</span>
                <span className="text-[10px] text-muted-dark tracking-widest">SLEEP</span>
              </div>
              <input
                type="number"
                placeholder="Hours"
                value={sleepHours}
                onChange={(e) => setSleepHours(e.target.value)}
                className="input-field w-full"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-muted">⚖️</span>
                <span className="text-[10px] text-muted-dark tracking-widest">WEIGHT</span>
              </div>
              <input
                type="number"
                placeholder="kg"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="input-field w-full"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-muted">🛡️</span>
                <span className="text-[10px] text-muted-dark tracking-widest">TODAY&apos;S WIN</span>
              </div>
              <input
                type="text"
                placeholder="What moved forward?"
                value={todayWin}
                onChange={(e) => setTodayWin(e.target.value)}
                className="input-field w-full"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-muted">🎯</span>
                <span className="text-[10px] text-muted-dark tracking-widest">TOMORROW&apos;S FOCUS</span>
              </div>
              <input
                type="text"
                placeholder="One clear priority"
                value={tomorrowFocus}
                onChange={(e) => setTomorrowFocus(e.target.value)}
                className="input-field w-full"
              />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={handleCheckin}
              disabled={checkingIn}
              className="btn-checkin flex items-center gap-2"
            >
              <span>+</span>
              {checkingIn ? "Checking in..." : "Check in"}
            </button>
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
                <div className="text-[10px] text-muted-dark tracking-widest font-medium">HABIT</div>
                {getMonthDays(activeMonth).map((day) => (
                  <div key={day} className="text-[10px] text-muted-dark text-center">
                    {day}
                  </div>
                ))}
              </div>

              {/* Habit Rows */}
              {habits.map((habit) => (
                <div key={habit.id} className="grid grid-cols-[200px_repeat(31,1fr)] gap-1 mb-1">
                  <div className="text-sm text-muted font-medium truncate pr-2 flex items-center justify-between">
                    <span>{habit.name}</span>
                    <span className="text-[10px] text-muted-dark">+{HABIT_POINTS[habit.name] || 10}</span>
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
                          "w-full aspect-square rounded transition-all text-xs",
                          completed
                            ? "bg-accent-teal/20 border border-accent-teal/40"
                            : isFuture
                            ? "bg-surface-light/30 cursor-not-allowed"
                            : "bg-surface-light hover:bg-surface-light/80 border border-surface-border/50",
                          isToday && "ring-1 ring-accent-teal/50"
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
              <label className="block text-[10px] text-muted-dark mb-1 tracking-widest">DATE</label>
              <input
                type="date"
                value={today}
                readOnly
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-[10px] text-muted-dark mb-1 tracking-widest">HOURS SLEPT</label>
              <input
                type="number"
                step="0.5"
                min="0"
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
                className="w-full bg-accent-teal text-black font-semibold px-4 py-2.5 rounded-lg hover:opacity-90 transition-all"
              >
                Save Sleep
              </button>
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
              <label className="block text-[10px] text-muted-dark mb-1 tracking-widest">PROTEIN (g)</label>
              <input
                type="number"
                placeholder={macroTargets.protein.toString()}
                value={macroProtein}
                onChange={(e) => setMacroProtein(e.target.value)}
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-[10px] text-muted-dark mb-1 tracking-widest">CARBS (g)</label>
              <input
                type="number"
                placeholder={macroTargets.carbs.toString()}
                value={macroCarbs}
                onChange={(e) => setMacroCarbs(e.target.value)}
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-[10px] text-muted-dark mb-1 tracking-widest">FAT (g)</label>
              <input
                type="number"
                placeholder={macroTargets.fat.toString()}
                value={macroFat}
                onChange={(e) => setMacroFat(e.target.value)}
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-[10px] text-muted-dark mb-1 tracking-widest">CALORIES</label>
              <input
                type="number"
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

        {/* Weekly Check-in */}
        <div className="card p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white tracking-tight">WEEKLY CHECK-IN</h2>
            <span className="text-xs text-muted-dark tracking-widest">WEEK {currentWeek}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] text-muted-dark mb-1 tracking-widest">WEIGHT (kg)</label>
              <input
                type="number"
                step="0.1"
                placeholder="70"
                value={weeklyWeight}
                onChange={(e) => setWeeklyWeight(e.target.value)}
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-[10px] text-muted-dark mb-1 tracking-widest">WINS</label>
              <textarea
                placeholder="What went well this week?"
                value={weeklyWins}
                onChange={(e) => setWeeklyWins(e.target.value)}
                className="input-field w-full"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-[10px] text-muted-dark mb-1 tracking-widest">FOCUS FOR NEXT WEEK</label>
              <textarea
                placeholder="What to focus on?"
                value={weeklyFocus}
                onChange={(e) => setWeeklyFocus(e.target.value)}
                className="input-field w-full"
                rows={2}
              />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={saveWeeklyCheckin}
              disabled={savingWeekly}
              className="bg-accent-teal text-black font-semibold px-6 py-2.5 rounded-lg hover:opacity-90 transition-all"
            >
              {savingWeekly ? "Saving..." : "Save Check-in"}
            </button>
          </div>
        </div>

        {/* Monthly Reflection */}
        <div className="card p-5 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white tracking-tight">MONTHLY REFLECTION</h2>
            <span className="text-xs text-muted-dark tracking-widest uppercase">{currentMonthName}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-muted-dark mb-1 tracking-widest">BIGGEST WIN</label>
              <textarea
                placeholder="What was your biggest win?"
                value={monthlyWin}
                onChange={(e) => setMonthlyWin(e.target.value)}
                className="input-field w-full"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-[10px] text-muted-dark mb-1 tracking-widest">BIGGEST LESSON</label>
              <textarea
                placeholder="What did you learn?"
                value={monthlyLesson}
                onChange={(e) => setMonthlyLesson(e.target.value)}
                className="input-field w-full"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-[10px] text-muted-dark mb-1 tracking-widest">WHAT TO IMPROVE</label>
              <textarea
                placeholder="What needs work?"
                value={monthlyImprove}
                onChange={(e) => setMonthlyImprove(e.target.value)}
                className="input-field w-full"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-[10px] text-muted-dark mb-1 tracking-widest">NEXT MONTH&apos;S GOAL</label>
              <textarea
                placeholder="What&apos;s your goal?"
                value={monthlyGoal}
                onChange={(e) => setMonthlyGoal(e.target.value)}
                className="input-field w-full"
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={saveMonthlyReflection}
              disabled={savingMonthly}
              className="bg-accent-teal text-black font-semibold px-6 py-2.5 rounded-lg hover:opacity-90 transition-all"
            >
              {savingMonthly ? "Saving..." : "Save Reflection"}
            </button>
          </div>
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
