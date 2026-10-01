"use client";

import { getStreakColor, getStreakEmoji } from "@/lib/utils";

interface StreakCounterProps {
  streak: number;
  label?: string;
  size?: "sm" | "md" | "lg";
}

export default function StreakCounter({ streak, label = "Day Streak", size = "md" }: StreakCounterProps) {
  const sizeClasses = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-4xl",
  };

  return (
    <div className="flex flex-col items-center">
      <div className={`${sizeClasses[size]} ${getStreakColor(streak)} font-bold`}>
        {getStreakEmoji(streak)} {streak}
      </div>
      <span className="text-xs text-slate-400 mt-1">{label}</span>
    </div>
  );
}
