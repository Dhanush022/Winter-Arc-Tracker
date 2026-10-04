"use client";

import React, { useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface MetricSliderProps {
  value: number;
  min?: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  onCommit?: (value: number) => void;
  className?: string;
}

export default function MetricSlider({
  value,
  min = 0,
  max,
  step = 1,
  onChange,
  onCommit,
  className,
}: MetricSliderProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

  const valueFromClientX = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return value;
    const rect = el.getBoundingClientRect();
    let raw = ((clientX - rect.left) / rect.width) * (max - min) + min;
    raw = Math.min(max, Math.max(min, raw));
    const stepped = Math.round(raw / step) * step;
    return Math.min(max, Math.max(min, Number(stepped.toFixed(1))));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragging) return;
    e.preventDefault();
    const next = valueFromClientX(e.clientX);
    onChange(next);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragging) return;
    setDragging(false);
    const next = valueFromClientX(e.clientX);
    onChange(next);
    onCommit?.(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    let next = value;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = Math.max(min, value - step);
    if (e.key === "ArrowRight" || e.key === "ArrowUp") next = Math.min(max, value + step);
    if (e.key === "Home") next = min;
    if (e.key === "End") next = max;
    if (next !== value) {
      e.preventDefault();
      onChange(next);
      onCommit?.(next);
    }
  };

  return (
    <div ref={trackRef} className={cn("relative h-6 w-full select-none", className)}>
      {/* Track taps intentionally do nothing; only the thumb moves. */}
      <div className="absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-surface-light" />
      <div
        className="absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-accent-orange"
        style={{ width: `${pct}%` }}
      />
      <button
        type="button"
        aria-label="slider"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent-orange bg-white shadow"
        style={{ left: `${pct}%`, touchAction: "none" }}
      />
    </div>
  );
}
