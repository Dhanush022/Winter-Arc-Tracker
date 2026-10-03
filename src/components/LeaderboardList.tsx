"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { supabase } from "@/lib/supabase";
import { calculateStreak, cn } from "@/lib/utils";
import { isHiddenHabit } from "@/lib/types";
import type { LeaderboardEntry } from "@/lib/types";

export default function LeaderboardList() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchLeaderboard = async () => {
      setLoading(true);

      const { data: profiles } = await supabase.from("profiles").select("*");
      const { data: habitLogs } = await supabase.from("habit_logs").select("*").eq("completed", true);
      const { data: habits } = await supabase.from("habits").select("*");
      const { data: sleepLogs } = await supabase.from("sleep_logs").select("*");
      const { data: macroLogs } = await supabase.from("macro_logs").select("*");
      const { data: checkins } = await supabase.from("weekly_checkins").select("*");
      const { data: freezes } = await supabase.from("streak_freezes").select("*");

      if (!profiles) {
        setLoading(false);
        return;
      }

      const leaderboard: LeaderboardEntry[] = profiles.map((p) => {
        const userHabitLogs = habitLogs?.filter((l) => l.user_id === p.id) || [];
        const userHabits = (habits?.filter((h) => h.user_id === p.id) || []).filter(
          (h) => !isHiddenHabit(h)
        );
        const currentStreak = calculateStreak(userHabitLogs, userHabits.length);
        const userSleepLogs = sleepLogs?.filter((l) => l.user_id === p.id) || [];
        const userMacroLogs = macroLogs?.filter((l) => l.user_id === p.id) || [];
        const userCheckins = checkins?.filter((c) => c.user_id === p.id) || [];
        const userFreezes = freezes?.filter((f) => f.user_id === p.id) || [];

        const totalPossible = userHabits.length > 0 ? 90 * userHabits.length : 90 * 12;
        const habitCompletion = Math.round((userHabitLogs.length / totalPossible) * 100);

        const sleepAvg = userSleepLogs.length > 0
          ? userSleepLogs.reduce((sum, s) => sum + s.hours, 0) / userSleepLogs.length
          : 0;

        const macroAdherence = Math.round((userMacroLogs.length / 90) * 100);
        const checkinCompletion = Math.round((userCheckins.length / 13) * 100);

        const arcScore = Math.round(
          habitCompletion * 0.4 +
          (sleepAvg / 10) * 20 +
          macroAdherence * 0.2 +
          checkinCompletion * 0.2
        );

        return {
          user_id: p.id,
          full_name: p.full_name,
          avatar_color: p.avatar_color,
          avatar_url: p.avatar_url,
          arc_score: arcScore,
          habit_completion: habitCompletion,
          sleep_avg: Math.round(sleepAvg * 10) / 10,
          macro_adherence: macroAdherence,
          current_streak: currentStreak,
          total_freezes: userFreezes.length,
        };
      });

      leaderboard.sort((a, b) => b.arc_score - a.arc_score);
      setEntries(leaderboard);
      setLoading(false);
    };

    fetchLeaderboard();
  }, [user]);

  if (loading) {
    return <div className="card p-5 text-muted text-sm">Loading leaderboard...</div>;
  }

  if (entries.length === 0) {
    return <div className="card p-5 text-muted text-sm">No entries yet.</div>;
  }

  return (
    <div className="space-y-2">
      {entries.map((entry, index) => (
        <Link
          key={entry.user_id}
          href={`/user/${entry.user_id}`}
          className={cn(
            "card p-4 flex items-center gap-4 card-hover",
            entry.user_id === user?.id && "border-accent-teal/30"
          )}
        >
          <div className={cn(
            "text-lg font-black w-8 text-center",
            index === 0 ? "text-accent-orange" : "text-muted-dark"
          )}>
            #{index + 1}
          </div>
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: entry.avatar_color }}
          >
            {entry.full_name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-white truncate">{entry.full_name}</div>
            <div className="text-xs text-muted capitalize truncate">{entry.total_freezes > 0 ? `${entry.total_freezes} freezes used` : "No freezes used"}</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 whitespace-nowrap">
              <span className="text-accent-orange">🔥</span>
              <span className="text-white font-semibold text-sm">{entry.current_streak}d</span>
            </div>
            <div className="text-right">
              <span className="text-white font-bold">{entry.arc_score}</span>
              <span className="text-muted-dark text-sm"> pts</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
