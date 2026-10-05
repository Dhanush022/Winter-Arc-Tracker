"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";
import LeaderboardList from "@/components/LeaderboardList";
import MetricSlider from "@/components/MetricSlider";
import { GalleryHeading } from "@/shaders/neuform-isolated/NeuformIsolatedEffects";
import "@/shaders/threeui.css";
import { useRouter } from "next/navigation";
import { getToday, getDayNumber, calculateStreak, cn, sleepPoints, stepPoints, waterPoints } from "@/lib/utils";
import { MAX_FREEZES, isHiddenHabit } from "@/lib/types";
import { getCached, setCached } from "@/lib/cache";
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
  const [habits, setHabits] = useState<Habit[]>(() => getCached<{ habits: Habit[] }>("dashboard")?.habits ?? []);
  const [allLogs, setAllLogs] = useState<HabitLog[]>(() => getCached<{ allLogs: HabitLog[] }>("dashboard")?.allLogs ?? []);
  const [sleepLogs, setSleepLogs] = useState<SleepLog[]>(() => getCached<{ sleepLogs: SleepLog[] }>("dashboard")?.sleepLogs ?? []);
  const [freezes, setFreezes] = useState<StreakFreeze[]>(() => getCached<{ freezes: StreakFreeze[] }>("dashboard")?.freezes ?? []);
  const [streak, setStreak] = useState(0);
  const [, setLoading] = useState(() => getCached("dashboard") === undefined);
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [todayWorkout, setTodayWorkout] = useState("");


  // Sleep field
  const [sleepHours, setSleepHours] = useState("");
  const [checkingIn, setCheckingIn] = useState(false);
  const [sleepSaved, setSleepSaved] = useState(false);
  const [sleepError, setSleepError] = useState("");

  // Steps / water sliders
  const [todaySteps, setTodaySteps] = useState(0);
  const [todayWater, setTodayWater] = useState(0);
  const [importing, setImporting] = useState(false);
  const [lastImport, setLastImport] = useState<string>("");

  // Macro fields
  const [macroProtein, setMacroProtein] = useState("");
  const [macroCarbs, setMacroCarbs] = useState("");
  const [macroFat, setMacroFat] = useState("");
  const [macroCalories, setMacroCalories] = useState("");
  const [savingMacros, setSavingMacros] = useState(false);
  const [macroLogs, setMacroLogs] = useState<MacroLog[]>(() => getCached<{ macroLogs: MacroLog[] }>("dashboard")?.macroLogs ?? []);

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
      const [habitsRes, logsRes, sleepRes, freezesRes, macrosRes, workoutRes] = await Promise.all([
        supabase.from("habits").select("*").eq("user_id", user.id).order("order"),
        supabase.from("habit_logs").select("*").eq("user_id", user.id),
        supabase.from("sleep_logs").select("*").eq("user_id", user.id).order("date", { ascending: false }).limit(90),
        supabase.from("streak_freezes").select("*").eq("user_id", user.id),
        supabase.from("macro_logs").select("*").eq("user_id", user.id).eq("date", today),
        supabase.from("workout_logs").select("*").eq("user_id", user.id).eq("date", today).limit(1),
      ]);

      if (habitsRes.data) setHabits(habitsRes.data);
      if (logsRes.data) {
        setAllLogs(logsRes.data);
        const count = (habitsRes.data ?? []).filter((h) => !isHiddenHabit(h)).length;
        setStreak(calculateStreak(logsRes.data, count));
      }
      if (sleepRes.data) {
        setSleepLogs(sleepRes.data);
        const todaySleep = sleepRes.data.find((s) => s.date === today);
        if (todaySleep) setSleepHours(todaySleep.hours.toString());
      }
      if (freezesRes.data) setFreezes(freezesRes.data);
      if (workoutRes.data && workoutRes.data.length > 0) {
        setTodayWorkout(workoutRes.data[0].split);
      }

      // Pre-fill steps / water for today
      if (logsRes.data && habitsRes.data) {
        const stepsId = habitsRes.data.find((h) => h.name === "10,000 Steps")?.id;
        const waterId = habitsRes.data.find((h) => h.name === "Drink 3L Water")?.id;
        if (stepsId) {
          const row = logsRes.data.find((l) => l.habit_id === stepsId && l.date === today)
          setTodaySteps(row?.steps ?? 0);
        }
        if (waterId) {
          const row = logsRes.data.find((l) => l.habit_id === waterId && l.date === today)
          setTodayWater(row?.water ?? 0);
        }
      }

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
      setCached("dashboard", { habits: habitsRes.data ?? [], allLogs: logsRes.data ?? [], sleepLogs: sleepRes.data ?? [], freezes: freezesRes.data ?? [], macroLogs: macrosRes.data ?? [] });
    };

    fetchData();
    window.addEventListener("winter-data-changed", fetchData);
    return () => window.removeEventListener("winter-data-changed", fetchData);
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
        router.refresh(); window.dispatchEvent(new Event("winter-data-changed"));
      }
    } else {
      const { data, error } = await supabase
        .from("habit_logs")
        .insert({ user_id: user!.id, habit_id: habitId, date: today, completed: true })
        .select()
        .single();

      if (data && !error) {
        setAllLogs((prev) => [...prev, data]);
        router.refresh(); window.dispatchEvent(new Event("winter-data-changed"));
      }
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
    router.refresh(); window.dispatchEvent(new Event("winter-data-changed"));
  };

  const persistMetric = async (habitName: string, patch: Partial<Pick<HabitLog, "steps" | "water">>, val: number) => {
    const habit = habits.find((h) => h.name === habitName);
    if (!habit) return;
    const existing = allLogs.find((l) => l.habit_id === habit.id && l.date === today);
    if (existing) {
      await supabase.from("habit_logs").update(patch).eq("id", existing.id);
      setAllLogs((prev) => prev.map((l) => (l.id === existing.id ? { ...l, ...patch } : l)));
    } else {
      const { data } = await supabase
        .from("habit_logs")
        .insert({ user_id: user!.id, habit_id: habit.id, date: today, completed: val > 0, ...patch })
        .select()
        .single();
      if (data) setAllLogs((prev) => [...prev, data]);
    }
  };

  const setWorkoutSplit = async (value: string) => {
    setTodayWorkout(value);

    // Persist selected split for today so it survives refreshes
    const { data: existingWorkout } = await supabase
      .from("workout_logs")
      .select("*")
      .eq("user_id", user!.id)
      .eq("date", today)
      .maybeSingle();

    if (existingWorkout) {
      await supabase.from("workout_logs").update({ split: value }).eq("id", existingWorkout.id);
    } else if (value) {
      await supabase.from("workout_logs").insert({ user_id: user!.id, date: today, split: value });
    }

    if (!value || value === "Rest") {
      router.refresh();
      window.dispatchEvent(new Event("winter-data-changed"));
      return;
    }

    const habit = habits.find((h) => h.name === "Workout / Exercise");
    if (!habit) return;

    const existing = allLogs.find((l) => l.habit_id === habit.id && l.date === today);
    if (existing) {
      if (!existing.completed) {
        await supabase.from("habit_logs").update({ completed: true }).eq("id", existing.id);
        setAllLogs((prev) => prev.map((l) => (l.id === existing.id ? { ...l, completed: true } : l)));
      }
    } else {
      const { data } = await supabase
        .from("habit_logs")
        .insert({ user_id: user!.id, habit_id: habit.id, date: today, completed: true })
        .select()
        .single();
      if (data) setAllLogs((prev) => [...prev, data]);
    }

    router.refresh();
    window.dispatchEvent(new Event("winter-data-changed"));
  };

  const upsertSleepForDate = async (date: string, hours: number) => {
    const existing = sleepLogs.find((s) => s.date === date);
    if (existing) {
      await supabase.from("sleep_logs").update({ hours }).eq("id", existing.id);
      setSleepLogs((prev) => prev.map((s) => (s.id === existing.id ? { ...s, hours } : s)));
    } else {
      const { data } = await supabase.from("sleep_logs").insert({ user_id: user!.id, date, hours }).select().single();
      if (data) setSleepLogs((prev) => [data, ...prev]);
    }
  };

  const upsertHabitMetricForDate = async (habitName: string, date: string, patch: Partial<Pick<HabitLog, "steps" | "water">>, completed: boolean) => {
    const habit = habits.find((h) => h.name === habitName);
    if (!habit) return;
    const existing = allLogs.find((l) => l.habit_id === habit.id && l.date === date);
    if (existing) {
      await supabase.from("habit_logs").update(patch).eq("id", existing.id);
      setAllLogs((prev) => prev.map((l) => (l.id === existing.id ? { ...l, ...patch } : l)));
    } else {
      const { data } = await supabase
        .from("habit_logs")
        .insert({ user_id: user!.id, habit_id: habit.id, date, completed, ...patch })
        .select()
        .single();
      if (data) setAllLogs((prev) => [...prev, data]);
    }
  };

  const handleImportFile = async (file: File) => {
    setImporting(true);
    try {
      const safeParseNumber = (v: unknown) => Math.max(0, Number(v) || 0);
      const filesText: string[] = [];
      if (file.name.toLowerCase().endsWith(".zip")) {
        const JSZip = (await import("jszip")).default;
        const zip = await JSZip.loadAsync(file);
        for (const name of Object.keys(zip.files)) {
          if (zip.files[name].dir) continue;
          filesText.push(await zip.files[name].async("string"));
        }
      } else {
        filesText.push(await file.text());
      }

      for (const text of filesText) {
        const trimmed = text.trim();
        if (!trimmed) continue;

        // Apple Health export.xml
        if (trimmed.includes("<HealthData") || trimmed.includes("export.xml")) {
          try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(trimmed, "text/xml");
            const records = doc.getElementsByTagName("Record");
            const byDateSteps = new Map<string, number>();
            const byDateSleep = new Map<string, number>();

            for (let i = 0; i < records.length; i++) {
              const r = records[i];
              const type = r.getAttribute("type") || "";
              const start = r.getAttribute("startDate") || "";
              const end = r.getAttribute("endDate") || "";
              if (!start || !end) continue;
              const dateStr = new Date(start).toISOString().split("T")[0];
              if (type.includes("StepCount")) {
                const v = safeParseNumber(r.getAttribute("value"));
                byDateSteps.set(dateStr, (byDateSteps.get(dateStr) || 0) + v);
              } else if (type.includes("SleepAnalysis")) {
                const v = r.getAttribute("value") || "";
                if (v.includes("Asleep") || v.includes("asleep")) {
                  const hours = Math.max(0, (new Date(end).getTime() - new Date(start).getTime()) / 3600000);
                  byDateSleep.set(dateStr, (byDateSleep.get(dateStr) || 0) + hours);
                }
              }
            }

            for (const [dateStr, steps] of Array.from(byDateSteps.entries())) {
              await upsertHabitMetricForDate("10,000 Steps", dateStr, { steps: Math.round(steps) }, steps > 0);
            }
            for (const [dateStr, hours] of Array.from(byDateSleep.entries())) {
              await upsertSleepForDate(dateStr, Math.round(hours * 10) / 10);
            }
          } catch {
            // ignore malformed XML
          }
          continue;
        }

        // CSV-ish exports (Samsung Health / Google Takeout)
        const lower = trimmed.toLowerCase();
        const lines = trimmed.split(/\r?\n/);
        if (!lines.length) continue;
        const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/[^a-z0-9]/g, "_"));
        const stepIdx = headers.findIndex((h) => h.includes("step") || h.includes("count"));
        const dateIdx = headers.findIndex((h) => h.includes("date") || h.includes("time") || h.includes("start"));
        const sleepStartIdx = headers.findIndex((h) => h.includes("start") && h.includes("time"));
        const sleepEndIdx = headers.findIndex((h) => h.includes("end") && h.includes("time"));

        if (lower.includes("sleep") && sleepStartIdx >= 0 && sleepEndIdx >= 0) {
          const byDate = new Map<string, number>();
          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(",");
            const start = cols[sleepStartIdx];
            const end = cols[sleepEndIdx];
            if (!start || !end) continue;
            const startDate = new Date(start);
            const endDate = new Date(end);
            if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) continue;
            const dateStr = startDate.toISOString().split("T")[0];
            const hours = Math.max(0, (endDate.getTime() - startDate.getTime()) / 3600000);
            byDate.set(dateStr, (byDate.get(dateStr) || 0) + hours);
          }
          for (const [dateStr, hours] of Array.from(byDate.entries())) {
            await upsertSleepForDate(dateStr, Math.round(hours * 10) / 10);
          }
          continue;
        }

        if (stepIdx >= 0 && dateIdx >= 0) {
          const byDate = new Map<string, number>();
          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(",");
            const p = safeParseNumber(cols[stepIdx]);
            const d = cols[dateIdx];
            if (!d) continue;
            const dateStr = new Date(d).toISOString().split("T")[0];
            byDate.set(dateStr, (byDate.get(dateStr) || 0) + p);
          }
          for (const [dateStr, steps] of Array.from(byDate.entries())) {
            await upsertHabitMetricForDate("10,000 Steps", dateStr, { steps: Math.round(steps) }, steps > 0);
          }
        }
      }

      setLastImport(new Date().toLocaleString());
      router.refresh();
      window.dispatchEvent(new Event("winter-data-changed"));
    } catch (err) {
      console.error("Import failed", err);
      alert("Could not import that file. Use a Samsung Health ZIP, Apple Health export ZIP, or Google Takeout ZIP/CSV.");
    } finally {
      setImporting(false);
    }
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
    router.refresh(); window.dispatchEvent(new Event("winter-data-changed"));
  };


  if (!user) return null;

  const todayLogs = allLogs.filter((l) => l.date === today);
  const completedToday = todayLogs.filter((l) => l.completed);

  // Hide placeholder custom habits until the user names them in Profile
  const visibleHabits = habits.filter(
    (h) => !isHiddenHabit(h)
  );
  const sleepPts = sleepPoints(Math.max(0, Number(sleepHours) || 0));
const stepPts = stepPoints(todaySteps);
const waterPts = waterPoints(todayWater);

const todayScore = completedToday.reduce((sum, l) => {
    const habit = habits.find((h) => h.id === l.habit_id);
    if (!habit) return sum + 10;
    if (habit.name === "10,000 Steps") return sum + stepPts;
    if (habit.name === "Drink 3L Water") return sum + waterPts;
    return sum + (HABIT_POINTS[habit.name] || 10);
  }, sleepPts);

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



  const macroTargets = profile?.macro_targets || { protein: 150, carbs: 250, fat: 70, calories: 2500 };

  return (
    <div className="min-h-screen pt-4 sm:pt-16 pb-24 sm:pb-8 px-4">
      <Navbar />

      <div className="max-w-7xl mx-auto">
        {/* Profile card */}
        <div className="card p-4 mb-4 flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
            style={{ backgroundColor: profile?.avatar_color || "#ea580c" }}
          >
            {profile?.full_name?.charAt(0) || "W"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-muted-dark font-mono tracking-widest uppercase">WELCOME BACK</div>
            <div className="text-white font-bold truncate">{profile?.full_name || "Warrior"}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-muted-dark font-mono uppercase tracking-widest">Goal</div>
            <div className="text-accent-orange font-semibold capitalize">{profile?.goal_mode || "maintain"}</div>
          </div>
        </div>

        {/* Hero Section */}
        <div className="card p-3 sm:p-6 mb-6 grid-bg">
          <div className="flex flex-col items-center text-center">
            <div className="shader-frame w-full max-w-2xl h-[250px] md:h-[300px] rounded-xl overflow-hidden">
              <GalleryHeading
                variant="rising-diagonal"
                mode="dark"
                font="sans"
                weight="400"
                headlineSize={1.25}
                hue={0}
                saturation={1.0}
                brightness={1.0}
              />
            </div>
            <p className="text-muted text-base md:text-lg mt-2 max-w-xl">
              Keep every promise you make to yourself. Build streaks, protect them with limited freezes, and climb with your crew.
            </p>
            <div className="flex gap-4 sm:gap-8 mt-2 justify-center">
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
          <div className="flex flex-wrap gap-3 mt-4 sm:mt-0 items-stretch">
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
            <div className="card px-4 py-2 flex items-center gap-3 min-w-0 w-full sm:w-auto">
              <div className="min-w-0">
                <div className="text-[10px] text-muted-dark font-mono tracking-widest uppercase whitespace-nowrap">Import Data</div>
                <div className="text-xs text-muted mt-0.5 whitespace-nowrap">{lastImport ? `Last import: ${lastImport}` : "Samsung · Apple · Google Takeout"}</div>
              </div>
              <label className="cursor-pointer shrink-0">
                <input
                  type="file"
                  accept=".zip,.csv,.xml,.json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImportFile(file);
                    e.target.value = "";
                  }}
                />
                <span className="px-3 py-1.5 rounded-lg bg-accent-orange text-black text-xs font-semibold hover:opacity-90 transition-all">
                  {importing ? "Importing…" : "Upload"}
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Daily Summary */}
        <div className="card p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-white tracking-tight">TODAY&apos;S SUMMARY</h2>
            <span className="text-xs text-muted-dark font-mono">{todayScore} pts</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-center">
            {[
              { label: "Workout", value: todayWorkout || "—" },
              { label: "Sleep", value: `${(Number(sleepHours) || 0).toFixed(1)}h` },
              { label: "Steps", value: todaySteps.toLocaleString() },
              { label: "Water", value: `${(todayWater / 1000).toFixed(1)}L` },
              { label: "Protein", value: `${Number(macroProtein) || 0}g` },
              { label: "Calories", value: `${Number(macroCalories) || 0}` },
            ].map((item) => (
              <div key={item.label} className="p-2 rounded-lg border border-surface-border bg-surface-light/50">
                <div className="text-[10px] text-muted-dark font-mono uppercase tracking-widest">{item.label}</div>
                <div className="text-sm text-white font-semibold truncate">{item.value}</div>
              </div>
            ))}
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

                if (habit.name === "10,000 Steps") {
                  return (
                    <motion.div
                      key={habit.id}
                      className="flex flex-col p-3.5 rounded-xl border border-surface-border bg-surface-light/50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-base text-muted">👟 Steps</span>
                        <span className="text-xs font-mono uppercase tracking-wider text-accent-orange">+{stepPts}</span>
                      </div>
                      <MetricSlider
                        value={todaySteps}
                        min={0}
                        max={10000}
                        step={500}
                        onChange={(v) => setTodaySteps(v)}
                        onCommit={(v) => persistMetric("10,000 Steps", { steps: v }, v)}
                      />
                      <div className="text-xs text-muted-dark font-mono mt-1">{todaySteps.toLocaleString()} / 10,000</div>
                    </motion.div>
                  );
                }

                if (habit.name === "Drink 3L Water") {
                  return (
                    <motion.div
                      key={habit.id}
                      className="flex flex-col p-3.5 rounded-xl border border-surface-border bg-surface-light/50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-base text-muted">💧 Water</span>
                        <span className="text-xs font-mono uppercase tracking-wider text-accent-orange">+{waterPts}</span>
                      </div>
                      <MetricSlider
                        value={todayWater}
                        min={0}
                        max={4000}
                        step={100}
                        onChange={(v) => setTodayWater(v)}
                        onCommit={(v) => persistMetric("Drink 3L Water", { water: v }, v)}
                      />
                      <div className="text-xs text-muted-dark font-mono mt-1">{(todayWater / 1000).toFixed(1)}L / 4.0L</div>
                    </motion.div>
                  );
                }

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

            <div className="mt-4 p-3.5 rounded-xl border border-surface-border bg-surface-light/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-base text-muted">😴 Sleep</span>
                <span className="text-xs font-mono uppercase tracking-wider text-accent-orange">+{sleepPts}</span>
              </div>
              <MetricSlider
                value={Number(sleepHours) || 0}
                min={0}
                max={12}
                step={0.5}
                onChange={(v) => setSleepHours(String(v))}
                onCommit={(v) => upsertSleepForDate(today, v)}
              />
              <div className="text-xs text-muted-dark font-mono mt-1">{(Number(sleepHours) || 0).toFixed(1)} h</div>
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
                onChange={(e) => setWorkoutSplit(e.target.value)}
                className="input-field w-full text-base font-semibold appearance-none cursor-pointer"
              >
                <option value="">Select split…</option>
                <option value="Rest">Rest</option>
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
                  {todayWorkout === "Rest"
                    ? `✓ Rest day logged on ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}.`
                    : `✓ ${todayWorkout} day logged on ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}.`}
                </motion.p>
              )}
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
          <div className="flex mt-4">
            <button
              onClick={saveMacros}
              disabled={savingMacros}
              className="w-full bg-accent-teal text-black font-semibold px-6 py-2.5 rounded-lg hover:opacity-90 transition-all disabled:opacity-60"
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

        {/* Consistency Heatmap */}
        <div className="card p-5 mb-8">
          <h2 className="text-sm font-bold text-white mb-4">CONSISTENCY HEATMAP</h2>
          <div className="flex gap-1 overflow-x-auto pb-2">
            {Array.from({ length: 90 }, (_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - (89 - i));
              const dateStr = d.toISOString().split("T")[0];
              const completedForDay = allLogs.filter((l) => l.date === dateStr && l.completed).length;
              const totalForDay = visibleHabits.length;
              const pct = totalForDay > 0 ? completedForDay / totalForDay : 0;
              const color = pct >= 1 ? "#ea580c" : pct >= 0.66 ? "#c2410c" : pct >= 0.33 ? "#7c2d12" : pct > 0 ? "#431407" : "#1a1a1a";
              return (
                <div
                  key={dateStr}
                  title={`${dateStr}: ${completedForDay}/${totalForDay}`}
                  className="w-4 h-4 rounded-sm shrink-0"
                  style={{ backgroundColor: color }}
                />
              );
            })}
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
