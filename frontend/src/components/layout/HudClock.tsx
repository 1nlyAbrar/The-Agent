"use client";

import { useEffect, useState } from "react";

interface HudClockProps {
  variant?: "hud" | "sidebar";
  isActive?: boolean;
}

export function HudClock({ variant = "hud", isActive = false }: HudClockProps) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) {
    return variant === "sidebar" ? (
      <div className="rounded-xl border border-cyan-400/20 bg-[#0a1423]/70 p-3 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <span className="font-mono text-lg text-cyan-400/60">--:--:--</span>
          <span className="text-[10px] text-slate-500">---</span>
        </div>
      </div>
    ) : (
      <div className="flex items-center gap-3 rounded-lg border border-cyan-400/20 bg-[#0a1423]/60 px-3 py-1.5 backdrop-blur-md">
        <span className="font-mono text-xs text-cyan-400/60">--:--:--</span>
      </div>
    );
  }

  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");

  const weekday = now.toLocaleDateString("en-US", { weekday: "short" });
  const day = now.getDate();
  const month = now.toLocaleDateString("en-US", { month: "short" });

  /* ============================================
     SIDEBAR VARIANT — Multi-color glow clock
     ============================================ */
  if (variant === "sidebar") {
    const progressPct = ((now.getSeconds() + now.getMilliseconds() / 1000) / 60) * 100;

    return (
      <div className="hud-clock-glow relative overflow-hidden rounded-xl border p-3 backdrop-blur-md">
        {/* Animated background sheen */}
        <div className="hud-clock-sheen pointer-events-none absolute inset-0 opacity-30" />

        <div className="relative flex items-end justify-between">
          <div className="flex items-baseline gap-1">
            <span className="hud-clock-text font-mono text-lg font-semibold tracking-wider">
              {hh}:{mm}
            </span>
            <span className="hud-clock-text-muted font-mono text-xs">:{ss}</span>
          </div>
          <div className="text-right">
            <div className="hud-clock-date text-[10px] font-medium uppercase tracking-widest">
              {weekday}
            </div>
            <div className="hud-clock-date-muted text-[10px]">
              {day} {month}
            </div>
          </div>
        </div>

        {/* Progress bar with animated gradient */}
        <div className="relative mt-2 h-[2px] w-full overflow-hidden rounded-full bg-cyan-400/10">
          <div
            className="hud-clock-bar h-full"
            style={{
              width: `${progressPct}%`,
              transition: "width 1s linear",
            }}
          />
        </div>
      </div>
    );
  }

  /* ============================================
     HUD VARIANT — compact pill for header
     ============================================ */
  return (
    <div className="hud-clock-glow flex items-center gap-3 rounded-lg border px-3 py-1.5 backdrop-blur-md">
      <span className="hud-clock-text font-mono text-xs tracking-wider">
        {hh}:{mm}
        <span className="hud-clock-text-muted">:{ss}</span>
      </span>

      <Waveform isActive={isActive} />

      <span className="hud-clock-date hidden font-mono text-xs tracking-wider md:inline">
        {weekday}, {day} {month}
      </span>
    </div>
  );
}

/* ============================================
   Animated waveform — 7 bars pulsing
   ============================================ */
function Waveform({ isActive = false }: { isActive?: boolean }) {
  const bars = 7;
  return (
    <div className="flex h-4 items-end gap-[2px]">
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className="hud-clock-bar w-[2px] animate-wave rounded-full"
          style={{
            animationDelay: `${i * 0.12}s`,
            height: "100%",
            animationDuration: isActive ? "0.6s" : "1.2s",
          }}
        />
      ))}
    </div>
  );
}
