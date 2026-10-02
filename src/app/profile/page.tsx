"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { WeeklyCheckin, MonthlyReflection } from "@/lib/types";

const AVATAR_COLORS = [
  "#f97316", "#fb923c", "#ea580c", "#c2410c", "#9ca3af",
  "#6b7280", "#d4d4d4", "#737373", "#262626", "#fafafa",
];

export default function ProfilePage() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "checkins" | "reflections">("profile");

  const [fullName, setFullName] = useState("");
  const [avatarColor, setAvatarColor] = useState("");
  const [goalMode, setGoalMode] = useState<"bulk" | "cut" | "maintain">("maintain");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [calories, setCalories] = useState("");

  const [checkins, setCheckins] = useState<WeeklyCheckin[]>([]);
  const [reflections, setReflections] = useState<MonthlyReflection[]>([]);
  const [customHabit1, setCustomHabit1] = useState("");
  const [customHabit2, setCustomHabit2] = useState("");
  const [customHabitIds, setCustomHabitIds] = useState<{ id: string }[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);

      if (profile) {
        setFullName(profile.full_name);
        setAvatarColor(profile.avatar_color);
        setGoalMode(profile.goal_mode);
        setProtein(profile.macro_targets.protein.toString());
        setCarbs(profile.macro_targets.carbs.toString());
        setFat(profile.macro_targets.fat.toString());
        setCalories(profile.macro_targets.calories.toString());
      }

      const { data: customHabits } = await supabase
        .from("habits")
        .select("id, name, \"order\"")
        .eq("user_id", user.id)
        .eq("custom", true)
        .order("order");

      if (customHabits && customHabits.length > 0) {
        setCustomHabitIds(customHabits);
        setCustomHabit1(customHabits[0]?.name || "");
        setCustomHabit2(customHabits[1]?.name || "");
      }

      const { data: checkinsData } = await supabase
        .from("weekly_checkins")
        .select("*")
        .eq("user_id", user.id)
        .order("week", { ascending: true });

      if (checkinsData) setCheckins(checkinsData);

      const { data: reflectionsData } = await supabase
        .from("monthly_reflections")
        .select("*")
        .eq("user_id", user.id)
        .order("month", { ascending: true });

      if (reflectionsData) setReflections(reflectionsData);

      setLoading(false);
    };

    fetchData();
  }, [user, profile]);

  const saveProfile = async () => {
    setSaving(true);
    await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        avatar_color: avatarColor,
        goal_mode: goalMode,
        macro_targets: {
          protein: Math.max(0, Number(protein) || 0),
          carbs: Math.max(0, Number(carbs) || 0),
          fat: Math.max(0, Number(fat) || 0),
          calories: Math.max(0, Number(calories) || 0),
        },
      })
      .eq("id", user!.id);

    await refreshProfile();

    // Save custom habit names
    const updates = [customHabit1.trim(), customHabit2.trim()];
    for (let i = 0; i < customHabitIds.length && i < 2; i++) {
      if (updates[i]) {
        await supabase
          .from("habits")
          .update({ name: updates[i] })
          .eq("id", customHabitIds[i].id);
      }
    }

    setSaving(false);
  };

  const saveCheckin = async (week: number, field: string, value: string) => {
    const safeValue = field === "weight" && value !== "" ? String(Math.max(0, Number(value) || 0)) : value;
    const existing = checkins.find((c) => c.week === week);

    if (existing) {
      await supabase
        .from("weekly_checkins")
        .update({ [field]: field === "weight" && safeValue !== "" ? Number(safeValue) : safeValue })
        .eq("id", existing.id);

      setCheckins((prev) =>
        prev.map((c) => (c.id === existing.id ? { ...c, [field]: field === "weight" && safeValue !== "" ? Number(safeValue) : safeValue } : c))
      );
    } else {
      const { data } = await supabase
        .from("weekly_checkins")
        .insert({ user_id: user!.id, week, [field]: field === "weight" && safeValue !== "" ? Number(safeValue) : safeValue })
        .select()
        .single();

      if (data) setCheckins((prev) => [...prev, data]);
    }
  };

  const saveReflection = async (month: string, field: string, value: string) => {
    const existing = reflections.find((r) => r.month === month);

    if (existing) {
      await supabase
        .from("monthly_reflections")
        .update({ [field]: value })
        .eq("id", existing.id);

      setReflections((prev) =>
        prev.map((r) => (r.id === existing.id ? { ...r, [field]: value } : r))
      );
    } else {
      const { data } = await supabase
        .from("monthly_reflections")
        .insert({ user_id: user!.id, month, [field]: value })
        .select()
        .single();

      if (data) setReflections((prev) => [...prev, data]);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-accent-teal text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  const tabs = [
    { id: "profile" as const, label: "Profile" },
    { id: "checkins" as const, label: "Weekly Check-ins" },
    { id: "reflections" as const, label: "Monthly Reflections" },
  ];

  return (
    <div className="min-h-screen pt-20 pb-8 px-4">
      <Navbar />

      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="font-mono text-[11px] tracking-[0.3em] text-accent-orange mb-2">// ACCOUNT</div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tighter text-white uppercase">Profile<span className="text-accent-orange">.</span></h1>
          <p className="text-muted text-sm mt-2">Manage your settings</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                activeTab === tab.id
                  ? "bg-accent-teal/10 text-accent-teal border border-accent-teal/30"
                  : "text-muted hover:text-white border border-surface-border"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="card p-6">
            <h2 className="text-lg font-bold text-white mb-6">Settings</h2>

            <div className="space-y-6">
              {/* Avatar */}
              <div>
                <label className="block text-xs text-muted-dark mb-2 tracking-widest">AVATAR COLOR</label>
                <div className="flex gap-2 flex-wrap">
                  {AVATAR_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setAvatarColor(color)}
                      className={cn(
                        "w-8 h-8 rounded-full transition-all",
                        avatarColor === color && "ring-2 ring-white ring-offset-2 ring-offset-background"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs text-muted-dark mb-1 tracking-widest">FULL NAME</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input-field w-full max-w-md"
                />
              </div>

              {/* Goal Mode */}
              <div>
                <label className="block text-xs text-muted-dark mb-2 tracking-widest">GOAL MODE</label>
                <div className="flex gap-2">
                  {(["bulk", "cut", "maintain"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setGoalMode(mode)}
                      className={cn(
                        "px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize",
                        goalMode === mode
                          ? "bg-accent-teal/10 text-accent-teal border border-accent-teal/30"
                          : "text-muted border border-surface-border hover:text-white"
                      )}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Macro Targets */}
              <div>
                <label className="block text-xs text-muted-dark mb-2 tracking-widest">DAILY MACRO TARGETS</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] text-muted-dark mb-1">Protein (g)</label>
                    <input
                      type="number" min="0"
                      value={protein}
                      onChange={(e) => setProtein(e.target.value)}
                      className="input-field w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-muted-dark mb-1">Carbs (g)</label>
                    <input
                      type="number" min="0"
                      value={carbs}
                      onChange={(e) => setCarbs(e.target.value)}
                      className="input-field w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-muted-dark mb-1">Fat (g)</label>
                    <input
                      type="number" min="0"
                      value={fat}
                      onChange={(e) => setFat(e.target.value)}
                      className="input-field w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-muted-dark mb-1">Calories</label>
                    <input
                      type="number" min="0"
                      value={calories}
                      onChange={(e) => setCalories(e.target.value)}
                      className="input-field w-full"
                    />
                  </div>
                </div>
              </div>

            {/* Custom Habits */}
            <div>
              <label className="block text-xs text-muted-dark mb-2 tracking-widest">CUSTOM HABITS</label>
              <p className="text-muted-dark text-[11px] mb-2">Name your two custom habits to show them on your dashboard.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-muted-dark mb-1">Custom Habit 1</label>
                  <input
                    type="text"
                    value={customHabit1}
                    onChange={(e) => setCustomHabit1(e.target.value)}
                    placeholder="e.g. No Sugar"
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-muted-dark mb-1">Custom Habit 2</label>
                  <input
                    type="text"
                    value={customHabit2}
                    onChange={(e) => setCustomHabit2(e.target.value)}
                    placeholder="e.g. Cold Shower"
                    className="input-field w-full"
                  />
                </div>
              </div>
            </div>

              <button onClick={saveProfile} disabled={saving} className="bg-accent-teal text-black font-semibold px-6 py-2.5 rounded-lg hover:opacity-90 transition-all">
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </div>
        )}

        {/* Check-ins Tab */}
        {activeTab === "checkins" && (
          <div className="space-y-3">
            {Array.from({ length: 13 }, (_, i) => i + 1).map((week) => {
              const checkin = checkins.find((c) => c.week === week);
              return (
                <div key={week} className="card p-4">
                  <h3 className="text-sm font-bold text-white mb-3">WEEK {week}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] text-muted-dark mb-1">Weight (kg)</label>
                      <input
                        type="number" min="0"
                        step="0.1"
                        defaultValue={checkin?.weight || ""}
                        onBlur={(e) => saveCheckin(week, "weight", e.target.value)}
                        placeholder="70"
                        className="input-field w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-muted-dark mb-1">Wins</label>
                      <textarea
                        defaultValue={checkin?.wins || ""}
                        onBlur={(e) => saveCheckin(week, "wins", e.target.value)}
                        placeholder="What went well?"
                        className="input-field w-full"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-muted-dark mb-1">Focus for Next Week</label>
                      <textarea
                        defaultValue={checkin?.focus || ""}
                        onBlur={(e) => saveCheckin(week, "focus", e.target.value)}
                        placeholder="What to focus on?"
                        className="input-field w-full"
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Reflections Tab */}
        {activeTab === "reflections" && (
          <div className="space-y-3">
            {(["october", "november", "december"] as const).map((month) => {
              const reflection = reflections.find((r) => r.month === month);
              return (
                <div key={month} className="card p-4">
                  <h3 className="text-sm font-bold text-white mb-3 uppercase">{month}</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] text-muted-dark mb-1">Biggest Win</label>
                      <textarea
                        defaultValue={reflection?.win || ""}
                        onBlur={(e) => saveReflection(month, "win", e.target.value)}
                        placeholder="What was your biggest win?"
                        className="input-field w-full"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-muted-dark mb-1">Biggest Lesson</label>
                      <textarea
                        defaultValue={reflection?.lesson || ""}
                        onBlur={(e) => saveReflection(month, "lesson", e.target.value)}
                        placeholder="What did you learn?"
                        className="input-field w-full"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-muted-dark mb-1">What to Improve</label>
                      <textarea
                        defaultValue={reflection?.improve || ""}
                        onBlur={(e) => saveReflection(month, "improve", e.target.value)}
                        placeholder="What needs work?"
                        className="input-field w-full"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-muted-dark mb-1">Next Month&apos;s Goal</label>
                      <textarea
                        defaultValue={reflection?.next_goal || ""}
                        onBlur={(e) => saveReflection(month, "next_goal", e.target.value)}
                        placeholder="What's your goal?"
                        className="input-field w-full"
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
