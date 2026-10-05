"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { signOut } from "@/lib/supabase";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { WeeklyCheckin, MonthlyReflection } from "@/lib/types";

const AVATAR_COLORS = [
  "#ea580c", "#fb923c", "#ea580c", "#c2410c", "#9ca3af",
  "#6b7280", "#d4d4d4", "#737373", "#262626", "#fafafa",
];

export default function ProfilePage() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const router = useRouter();
  const [, setLoading] = useState(true);
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
  const [publicProfile, setPublicProfile] = useState(true);
  const [accentColor, setAccentColor] = useState("#ea580c");
  const [seasonTheme, setSeasonTheme] = useState("winter");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      if (profile) {
        setFullName(profile.full_name);
        setAvatarColor(profile.avatar_color);
        setGoalMode(profile.goal_mode);
        setProtein(profile.macro_targets.protein.toString());
        setCarbs(profile.macro_targets.carbs.toString());
        setFat(profile.macro_targets.fat.toString());
        setCalories(profile.macro_targets.calories.toString());
        setPublicProfile(profile.public_profile ?? true);
        setAccentColor(profile.accent_color || "#ea580c");
        setSeasonTheme(profile.season_theme || "winter");
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
        public_profile: publicProfile,
        accent_color: accentColor,
        season_theme: seasonTheme,
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


  if (!user) return null;

  const tabs = [
    { id: "profile" as const, label: "Profile" },
    { id: "checkins" as const, label: "Weekly Check-ins" },
    { id: "reflections" as const, label: "Monthly Reflections" },
  ];

  return (
    <div className="min-h-screen pt-16 sm:pt-20 pb-24 sm:pb-8 px-4">
      <Navbar />

      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="font-mono text-[11px] tracking-[0.3em] text-accent-orange mb-2">{"// ACCOUNT"}</div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tighter text-white uppercase">Profile<span className="text-accent-orange">.</span></h1>
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
                <label className="block text-xs text-muted-dark font-mono uppercase tracking-wider mb-2 tracking-widest">AVATAR COLOR</label>
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

              {/* Public profile */}
              <div>
                <label className="block text-xs text-muted-dark font-mono uppercase tracking-wider mb-2 tracking-widest">PUBLIC PROFILE</label>
                <button
                  type="button"
                  onClick={() => setPublicProfile(!publicProfile)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all border",
                    publicProfile
                      ? "bg-accent-teal/10 text-accent-teal border-accent-teal/30"
                      : "text-muted border-surface-border hover:text-white"
                  )}
                >
                  {publicProfile ? "Visible on leaderboard" : "Hidden from leaderboard"}
                </button>
              </div>

              {/* Appearance */}
              <div>
                <label className="block text-xs text-muted-dark font-mono uppercase tracking-wider mb-2 tracking-widest">APPEARANCE</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-muted-dark font-mono mb-1">ACCENT COLOR</label>
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-full h-10 rounded-lg border border-surface-border bg-surface-light"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-muted-dark font-mono mb-1">SEASON THEME</label>
                    <select
                      value={seasonTheme}
                      onChange={(e) => setSeasonTheme(e.target.value)}
                      className="input-field w-full"
                    >
                      <option value="winter">Winter</option>
                      <option value="midnight">Midnight</option>
                      <option value="gold">Gold</option>
                      <option value="obsidian">Obsidian</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs text-muted-dark font-mono uppercase tracking-wider mb-1 tracking-widest">FULL NAME</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input-field w-full max-w-md"
                />
              </div>

              {/* Goal Mode */}
              <div>
                <label className="block text-xs text-muted-dark font-mono uppercase tracking-wider mb-2 tracking-widest">GOAL MODE</label>
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
                <label className="block text-xs text-muted-dark font-mono uppercase tracking-wider mb-2 tracking-widest">DAILY MACRO TARGETS</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] text-muted-dark font-mono mb-1">Protein (g)</label>
                    <input
                      type="number" min="0"
                      value={protein}
                      onChange={(e) => setProtein(e.target.value)}
                      className="input-field w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-muted-dark font-mono mb-1">Carbs (g)</label>
                    <input
                      type="number" min="0"
                      value={carbs}
                      onChange={(e) => setCarbs(e.target.value)}
                      className="input-field w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-muted-dark font-mono mb-1">Fat (g)</label>
                    <input
                      type="number" min="0"
                      value={fat}
                      onChange={(e) => setFat(e.target.value)}
                      className="input-field w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-muted-dark font-mono mb-1">Calories</label>
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
              <label className="block text-xs text-muted-dark font-mono uppercase tracking-wider mb-2 tracking-widest">CUSTOM HABITS</label>
              <p className="text-muted-dark text-[11px] mb-2">Name your two custom habits to show them on your dashboard.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-muted-dark font-mono mb-1">Custom Habit 1</label>
                  <input
                    type="text"
                    value={customHabit1}
                    onChange={(e) => setCustomHabit1(e.target.value)}
                    placeholder="e.g. No Sugar"
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-muted-dark font-mono mb-1">Custom Habit 2</label>
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

              <div className="border-t border-surface-border pt-6 mt-6">
                <h3 className="text-sm font-bold text-white mb-2">Account</h3>
                <p className="text-muted-dark text-xs mb-4 font-mono uppercase tracking-wider">
                  Signed in as {user?.email}
                </p>
                <button
                  onClick={async () => {
                    await signOut();
                    window.location.href = "/";
                  }}
                  className="px-6 py-2.5 rounded-lg border border-red-500/40 text-red-400 font-semibold hover:bg-red-500/10 transition-all"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Check-ins Tab */}
        {activeTab === "checkins" && (
          <div className="space-y-3">
            {(() => {
              const logged = checkins.filter((c) => c.weight != null && c.weight > 0);
              const latest = logged.length > 0 ? logged[logged.length - 1] : null;
              const first = logged.length > 0 ? logged[0] : null;
              const avgWeight = logged.length > 0
                ? logged.reduce((sum, c) => sum + Number(c.weight || 0), 0) / logged.length
                : 0;
              return (
                <div className="card p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <div className="text-[10px] text-muted-dark font-mono tracking-widest uppercase mb-1">Latest Weight</div>
                    <div className="text-2xl font-bold text-white">{latest ? `${latest.weight} kg` : "—"}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-dark font-mono tracking-widest uppercase mb-1">Weight Change</div>
                    <div className="text-2xl font-bold text-white">
                      {latest && first ? `${((latest.weight ?? 0) - (first.weight ?? 0)).toFixed(1)} kg` : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-dark font-mono tracking-widest uppercase mb-1">Average Weight</div>
                    <div className="text-2xl font-bold text-white">{avgWeight > 0 ? `${avgWeight.toFixed(1)} kg` : "—"}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-dark font-mono tracking-widest uppercase mb-1">Check-ins</div>
                    <div className="text-2xl font-bold text-white">{checkins.length}/13</div>
                  </div>
                </div>
              );
            })()}

            {Array.from({ length: 13 }, (_, i) => i + 1).map((week) => {
              const checkin = checkins.find((c) => c.week === week);
              return (
                <div key={week} className="card p-4">
                  <h3 className="text-sm font-bold text-white mb-3">WEEK {week}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] text-muted-dark font-mono mb-1">Weight (kg)</label>
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
                      <label className="block text-[10px] text-muted-dark font-mono mb-1">Wins</label>
                      <textarea
                        defaultValue={checkin?.wins || ""}
                        onBlur={(e) => saveCheckin(week, "wins", e.target.value)}
                        placeholder="What went well?"
                        className="input-field w-full"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-muted-dark font-mono mb-1">Focus for Next Week</label>
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
                      <label className="block text-[10px] text-muted-dark font-mono mb-1">Biggest Win</label>
                      <textarea
                        defaultValue={reflection?.win || ""}
                        onBlur={(e) => saveReflection(month, "win", e.target.value)}
                        placeholder="What was your biggest win?"
                        className="input-field w-full"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-muted-dark font-mono mb-1">Biggest Lesson</label>
                      <textarea
                        defaultValue={reflection?.lesson || ""}
                        onBlur={(e) => saveReflection(month, "lesson", e.target.value)}
                        placeholder="What did you learn?"
                        className="input-field w-full"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-muted-dark font-mono mb-1">What to Improve</label>
                      <textarea
                        defaultValue={reflection?.improve || ""}
                        onBlur={(e) => saveReflection(month, "improve", e.target.value)}
                        placeholder="What needs work?"
                        className="input-field w-full"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-muted-dark font-mono mb-1">Next Month&apos;s Goal</label>
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
