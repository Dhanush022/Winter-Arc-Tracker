"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";
import { getToday, getSleepColor } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Cell } from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import type { SleepLog } from "@/lib/types";

export default function SleepPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [sleepLogs, setSleepLogs] = useState<SleepLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [hours, setHours] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const today = getToday();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const { data } = await supabase
        .from("sleep_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(90);

      if (data) setSleepLogs(data);
      setLoading(false);
    };

    fetchData();
    window.addEventListener("winter-data-changed", fetchData);
    return () => window.removeEventListener("winter-data-changed", fetchData);
  }, [user]);

  useEffect(() => {
    const existing = sleepLogs.find((s) => s.date === selectedDate);
    setHours(existing ? existing.hours.toString() : "");
  }, [selectedDate, sleepLogs]);

  const saveSleep = async () => {
    setSaving(true);
    const existing = sleepLogs.find((s) => s.date === selectedDate);

    if (existing) {
      await supabase
        .from("sleep_logs")
        .update({ hours: Math.max(0, Number(hours) || 0) })
        .eq("id", existing.id);

      setSleepLogs((prev) =>
        prev.map((s) => (s.id === existing.id ? { ...s, hours: Math.max(0, Number(hours) || 0) } : s))
      );
    } else {
      const { data } = await supabase
        .from("sleep_logs")
        .insert({ user_id: user!.id, date: selectedDate, hours: Math.max(0, Number(hours) || 0) })
        .select()
        .single();

      if (data) setSleepLogs((prev) => [data, ...prev]);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
    router.refresh(); window.dispatchEvent(new Event("winter-data-changed"));
  };

  const avgSleep = sleepLogs.length > 0
    ? sleepLogs.reduce((sum, s) => sum + s.hours, 0) / sleepLogs.length
    : 0;

  const chartData = [...sleepLogs].reverse().map((s) => ({
    date: new Date(s.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    hours: s.hours,
  }));

  const sleepDistribution = [
    { label: "10+ hrs", count: sleepLogs.filter((s) => s.hours >= 10).length, color: "#fdba74" },
    { label: "9-10", count: sleepLogs.filter((s) => s.hours >= 9 && s.hours < 10).length, color: "#fb923c" },
    { label: "8-9", count: sleepLogs.filter((s) => s.hours >= 8 && s.hours < 9).length, color: "#ea580c" },
    { label: "7-8", count: sleepLogs.filter((s) => s.hours >= 7 && s.hours < 8).length, color: "#ea580c" },
    { label: "6-7", count: sleepLogs.filter((s) => s.hours >= 6 && s.hours < 7).length, color: "#c2410c" },
    { label: "<6 hrs", count: sleepLogs.filter((s) => s.hours < 6).length, color: "#525252" },
  ];

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
            <div className="font-mono text-[11px] tracking-[0.3em] text-accent-orange mb-2">{"// NIGHTLY REST"}</div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tighter text-white uppercase">Sleep<span className="text-accent-orange">.</span></h1>
          </div>
          <div className="hidden md:block text-right font-mono text-[10px] text-muted-dark font-mono tracking-widest font-mono">
            {sleepLogs.length} NIGHTS LOGGED<br />AVG {avgSleep.toFixed(1)}H
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Input */}
          <motion.div className="card p-5" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <h2 className="text-xl font-bold text-white mb-4">Log Sleep</h2>

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

            <div className="mb-4">
              <label className="block text-sm text-muted-dark mb-1">Hours Slept</label>
              <input
                type="number" min="0"
                step="0.5"
                max="24"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="8"
                className="input-field w-full text-2xl font-bold"
              />
            </div>

            <motion.button whileTap={{ scale: 0.96 }} onClick={saveSleep} disabled={saving} className="w-full bg-accent-teal text-black font-semibold px-6 py-3.5 rounded-lg hover:opacity-90 transition-all text-base">
              {saving ? "Saving..." : "Save Sleep"}
            </motion.button>

            <AnimatePresence>
              {saved && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -6 }}
                  className="mt-3 text-center text-accent-orange font-semibold tracking-wide"
                >
                  ✓ SAVED TO THE LOG
                </motion.div>
              )}
            </AnimatePresence>

            {/* Stats */}
            <div className="mt-6 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted text-base">Average Sleep</span>
                <span className="text-2xl font-bold text-accent-teal">{avgSleep.toFixed(1)}h</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted text-base">Total Nights</span>
                <span className="text-2xl font-bold text-white">{sleepLogs.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted text-base">Best Night</span>
                <span className="text-2xl font-bold text-accent-teal">
                  {sleepLogs.length > 0 ? Math.max(...sleepLogs.map((s) => s.hours)) : 0}h
                </span>
              </div>
            </div>

            {/* Sleep Distribution */}
            <div className="mt-6">
              <h3 className="text-xs font-semibold text-muted-dark mb-3 tracking-widest">DISTRIBUTION</h3>
              <div className="space-y-2">
                {sleepDistribution.map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-dark font-mono w-12">{item.label}</span>
                    <div className="flex-1 h-2.5 bg-surface-light rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${sleepLogs.length > 0 ? (item.count / sleepLogs.length) * 100 : 0}%`, backgroundColor: item.color }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-dark font-mono w-6">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Charts */}
          <div className="lg:col-span-2 space-y-4">
            {/* Daily Sleep Chart */}
            <div className="card p-5">
              <h3 className="text-sm font-bold text-white mb-4">Sleep Trend</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                    <YAxis stroke="#64748b" fontSize={10} domain={[0, 12]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="hours"
                      stroke="#ea580c"
                      strokeWidth={2}
                      dot={{ fill: "#ea580c", r: 3 }}
                      name="Hours"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Sleep Quality Bars */}
            <div className="card p-5">
              <h3 className="text-sm font-bold text-white mb-4">Daily Sleep Hours</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.slice(-14)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                    <YAxis stroke="#64748b" fontSize={10} domain={[0, 12]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}
                    />
                    <Bar dataKey="hours" name="Hours" radius={[4, 4, 0, 0]}>
                      {chartData.slice(-14).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getSleepColor(entry.hours)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
