"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getToday, getDayNumber, formatDate, getDateFromDay, getMonthFromDay, cn } from "@/lib/utils";
import { MONTHS, MAX_FREEZES } from "@/lib/types";
import type { Habit, HabitLog, StreakFreeze } from "@/lib/types";

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

export default function HabitsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [freezes, setFreezes] = useState<StreakFreeze[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMonth, setActiveMonth] = useState(getMonthFromDay(getDayNumber(getToday())));
  const [showFreezeModal, setShowFreezeModal] = useState(false);

  const today = getToday();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);

      const { data: habitsData } = await supabase
        .from("habits")
        .select("*")
        .eq("user_id", user.id)
        .order("order");

      if (habitsData) setHabits(habitsData);

      const { data: logsData } = await supabase
        .from("habit_logs")
        .select("*")
        .eq("user_id", user.id);

      if (logsData) setLogs(logsData);

      const { data: freezesData } = await supabase
        .from("streak_freezes")
        .select("*")
        .eq("user_id", user.id);

      if (freezesData) setFreezes(freezesData);

      setLoading(false);
    };

    fetchData();
  }, [user]);

  const toggleHabit = async (habitId: string, date: string) => {
    const existing = logs.find((l) => l.habit_id === habitId && l.date === date);

    if (existing) {
      const newCompleted = !existing.completed;
      await supabase
        .from("habit_logs")
        .update({ completed: newCompleted })
        .eq("id", existing.id);

      setLogs((prev) =>
        prev.map((l) => (l.id === existing.id ? { ...l, completed: newCompleted } : l))
      );
      router.refresh();
    } else {
      const { data } = await supabase
        .from("habit_logs")
        .insert({ user_id: user!.id, habit_id: habitId, date, completed: true })
        .select()
        .single();

      if (data) {
        setLogs((prev) => [...prev, data]);
        router.refresh();
      }
    }
  };

  const useFreeze = async () => {
    const { data } = await supabase
      .from("streak_freezes")
      .insert({ user_id: user!.id, date_used: today })
      .select()
      .single();

    if (data) {
      setFreezes((prev) => [...prev, data]);
      setShowFreezeModal(false);
    }
  };

  const isCompleted = (habitId: string, date: string) => {
    return logs.find((l) => l.habit_id === habitId && l.date === date)?.completed || false;
  };

  const getMonthDays = (monthIndex: number) => {
    const days = [];
    const startDay = MONTHS[monthIndex].startDay;
    for (let i = 0; i < MONTHS[monthIndex].days; i++) {
      days.push(startDay + i);
    }
    return days;
  };

  const freezesLeft = MAX_FREEZES - freezes.length;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-accent-teal text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen pt-20 pb-8 px-4">
      <Navbar />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8">
          <div>
            <div className="font-mono text-[11px] tracking-[0.3em] text-accent-orange mb-2">// DAILY OATH</div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tighter text-white uppercase">Habits<span className="text-accent-orange">.</span></h1>
            <p className="text-muted text-sm mt-2">90 days of discipline</p>
          </div>
          <button
            onClick={() => setShowFreezeModal(true)}
            disabled={freezesLeft <= 0}
            className="mt-4 sm:mt-0 px-4 py-2 rounded-lg border border-surface-border text-sm text-muted hover:text-white hover:border-surface-border/80 transition-all"
          >
            ❄ Streak Freeze ({freezesLeft} left)
          </button>
        </div>

        {/* Month Tabs */}
        <div className="flex gap-2 mb-4">
          {MONTHS.map((month, index) => (
            <button
              key={month.name}
              onClick={() => setActiveMonth(index)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                activeMonth === index
                  ? "bg-accent-teal/10 text-accent-teal border border-accent-teal/30"
                  : "text-muted hover:text-white border border-surface-border"
              )}
            >
              {month.name}
            </button>
          ))}
        </div>

        {/* Habit Grid */}
        <div className="card p-4 overflow-x-auto">
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
            {habits.filter((h) => !(h.custom && (h.name === "Custom Habit 1" || h.name === "Custom Habit 2"))).map((habit) => (
              <div key={habit.id} className="grid grid-cols-[200px_repeat(31,1fr)] gap-1 mb-1">
                <div className="text-sm text-muted font-medium truncate pr-2 flex items-center justify-between">
                  <span>{habit.name}</span>
                  <span className="text-[10px] text-muted-dark font-mono">+{HABIT_POINTS[habit.name] || 10}</span>
                </div>
                {getMonthDays(activeMonth).map((day) => {
                  const date = formatDate(getDateFromDay(day));
                  const completed = isCompleted(habit.id, date);
                  const isFuture = date > today;
                  const isToday = date === today;

                  return (
                    <motion.button
                      key={day}
                      whileTap={!isFuture ? { scale: 0.75 } : undefined}
                      onClick={() => !isFuture && toggleHabit(habit.id, date)}
                      disabled={isFuture}
                      className={cn(
                        "w-full h-5 rounded transition-all text-[10px]",
                        completed
                          ? "bg-accent-teal/20 border border-accent-teal/40"
                          : isFuture
                          ? "bg-surface-light/30 cursor-not-allowed"
                          : "bg-surface-light hover:bg-surface-light/80 border border-surface-border/50",
                        isToday && "ring-1 ring-white/60"
                      )}
                    >
                      {completed && (
                        <motion.span
                          initial={{ scale: 0, rotate: -90 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 20 }}
                          className="text-accent-teal inline-block"
                        >
                          ✓
                        </motion.span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
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
