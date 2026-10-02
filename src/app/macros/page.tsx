"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";
import { getToday } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import type { MacroLog } from "@/lib/types";

export default function MacrosPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [macroLogs, setMacroLogs] = useState<MacroLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [calories, setCalories] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const today = getToday();
  const macroTargets = profile?.macro_targets || { protein: 150, carbs: 250, fat: 70, calories: 2500 };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const { data } = await supabase
        .from("macro_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(90);

      if (data) setMacroLogs(data);
      setLoading(false);
    };

    fetchData();
    window.addEventListener("winter-data-changed", fetchData);
    return () => window.removeEventListener("winter-data-changed", fetchData);
  }, [user]);

  useEffect(() => {
    const existing = macroLogs.find((m) => m.date === selectedDate);
    if (existing) {
      setProtein(existing.protein.toString());
      setCarbs(existing.carbs.toString());
      setFat(existing.fat.toString());
      setCalories(existing.calories.toString());
    } else {
      setProtein("");
      setCarbs("");
      setFat("");
      setCalories("");
    }
  }, [selectedDate, macroLogs]);

  const saveMacros = async () => {
    setSaving(true);
    const existing = macroLogs.find((m) => m.date === selectedDate);

    if (existing) {
      await supabase
        .from("macro_logs")
        .update({
          protein: Math.max(0, Number(protein) || 0),
          carbs: Math.max(0, Number(carbs) || 0),
          fat: Math.max(0, Number(fat) || 0),
          calories: Math.max(0, Number(calories) || 0),
        })
        .eq("id", existing.id);

      setMacroLogs((prev) =>
        prev.map((m) =>
          m.id === existing.id
            ? { ...m, protein: Math.max(0, Number(protein) || 0), carbs: Math.max(0, Number(carbs) || 0), fat: Math.max(0, Number(fat) || 0), calories: Math.max(0, Number(calories) || 0) }
            : m
        )
      );
    } else {
      const { data } = await supabase
        .from("macro_logs")
        .insert({
          user_id: user!.id,
          date: selectedDate,
          protein: Math.max(0, Number(protein) || 0),
          carbs: Math.max(0, Number(carbs) || 0),
          fat: Math.max(0, Number(fat) || 0),
          calories: Math.max(0, Number(calories) || 0),
        })
        .select()
        .single();

      if (data) setMacroLogs((prev) => [data, ...prev]);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
    router.refresh(); window.dispatchEvent(new Event("winter-data-changed"));
  };

  const currentMacros = macroLogs.find((m) => m.date === selectedDate);
  const weeklyLogs = macroLogs.slice(0, 7);

  const pieData = currentMacros
    ? [
        { name: "Protein", value: currentMacros.protein * 4, color: "#ea580c" },
        { name: "Carbs", value: currentMacros.carbs * 4, color: "#6b7280" },
        { name: "Fat", value: currentMacros.fat * 9, color: "#fafafa" },
      ]
    : [];

  const chartData = weeklyLogs.reverse().map((m) => ({
    date: new Date(m.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    protein: m.protein,
    carbs: m.carbs,
    fat: m.fat,
  }));

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-accent-teal text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen pt-16 sm:pt-20 pb-24 sm:pb-8 px-4">
      <Navbar />

      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <div className="font-mono text-[11px] tracking-[0.3em] text-accent-orange mb-2">// FUEL INTAKE</div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tighter text-white uppercase">Macros<span className="text-accent-orange">.</span></h1>
          </div>
          <div className="hidden md:block text-right font-mono text-[10px] text-muted-dark font-mono tracking-widest font-mono">
            TARGET {macroTargets.protein}P · {macroTargets.carbs}C · {macroTargets.fat}F<br />{macroTargets.calories} KCAL
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Input Form */}
          <motion.div className="card p-5" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <h2 className="text-xl font-bold text-white mb-4">Log Macros</h2>

            <div className="mb-4">
              <label className="block text-sm text-muted-dark mb-1">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={today}
                className="input-field w-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-sm text-muted-dark mb-1">Protein (g)</label>
                <input
                  type="number" min="0"
                  value={protein}
                  onChange={(e) => setProtein(e.target.value)}
                  placeholder={macroTargets.protein.toString()}
                  className="input-field w-full text-xl font-bold"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-dark mb-1">Carbs (g)</label>
                <input
                  type="number" min="0"
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value)}
                  placeholder={macroTargets.carbs.toString()}
                  className="input-field w-full text-xl font-bold"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-dark mb-1">Fat (g)</label>
                <input
                  type="number" min="0"
                  value={fat}
                  onChange={(e) => setFat(e.target.value)}
                  placeholder={macroTargets.fat.toString()}
                  className="input-field w-full text-xl font-bold"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-dark mb-1">Calories</label>
                <input
                  type="number" min="0"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  placeholder={macroTargets.calories.toString()}
                  className="input-field w-full text-xl font-bold"
                />
              </div>
            </div>

            <motion.button whileTap={{ scale: 0.96 }} onClick={saveMacros} disabled={saving} className="w-full bg-accent-teal text-black font-semibold px-6 py-3.5 rounded-lg hover:opacity-90 transition-all text-base">
              {saving ? "Saving..." : "Save Macros"}
            </motion.button>

            <AnimatePresence>
              {saved && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -6 }}
                  className="mt-3 text-center text-accent-orange font-semibold tracking-wide"
                >
                  ✓ LOGGED TO THE LEDGER
                </motion.div>
              )}
            </AnimatePresence>

            {/* Progress Bars */}
            {currentMacros && (
              <div className="mt-6 space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted">Protein</span>
                    <span className="text-accent-teal">{currentMacros.protein}g / {macroTargets.protein}g</span>
                  </div>
                  <div className="h-1.5 bg-surface-light rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent-teal rounded-full transition-all"
                      style={{ width: `${Math.min((currentMacros.protein / macroTargets.protein) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted">Carbs</span>
                    <span className="text-accent-teal">{currentMacros.carbs}g / {macroTargets.carbs}g</span>
                  </div>
                  <div className="h-1.5 bg-surface-light rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent-teal rounded-full transition-all"
                      style={{ width: `${Math.min((currentMacros.carbs / macroTargets.carbs) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted">Fat</span>
                    <span className="text-accent-teal">{currentMacros.fat}g / {macroTargets.fat}g</span>
                  </div>
                  <div className="h-1.5 bg-surface-light rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent-teal rounded-full transition-all"
                      style={{ width: `${Math.min((currentMacros.fat / macroTargets.fat) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted">Calories</span>
                    <span className="text-accent-teal">{currentMacros.calories} / {macroTargets.calories}</span>
                  </div>
                  <div className="h-1.5 bg-surface-light rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent-teal rounded-full transition-all"
                      style={{ width: `${Math.min((currentMacros.calories / macroTargets.calories) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {/* Charts */}
          <div className="space-y-4">
            {/* Macro Split Pie */}
            <div className="card p-5">
              <h3 className="text-sm font-bold text-white mb-4">Today&apos;s Split</h3>
              {pieData.length > 0 ? (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "8px" }}
                        formatter={(value, name) => {
                          const grams = name === "Fat" ? currentMacros!.fat : name === "Carbs" ? currentMacros!.carbs : currentMacros!.protein;
                          return [`${grams}g · ${value} kcal`, name] as [string, string];
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-56 flex items-center justify-center text-muted-dark">
                  No data for selected date
                </div>
              )}
            </div>

            {/* Weekly Trend */}
            <div className="card p-5">
              <h3 className="text-sm font-bold text-white mb-4">7-Day Trend</h3>
              {chartData.length > 0 ? (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                      <YAxis stroke="#64748b" fontSize={10} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}
                      />
                      <Legend />
                      <Bar dataKey="protein" fill="#ea580c" name="Protein" />
                      <Bar dataKey="carbs" fill="#6b7280" name="Carbs" />
                      <Bar dataKey="fat" fill="#fafafa" name="Fat" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-56 flex items-center justify-center text-muted-dark">
                  No data yet
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
