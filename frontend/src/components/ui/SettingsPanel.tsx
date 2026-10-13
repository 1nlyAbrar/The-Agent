"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Volume2, Zap, Palette, Cpu, Database } from "lucide-react";

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [speechRate, setSpeechRate] = useState(1);
  const [autoScroll, setAutoScroll] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);

  // Persist settings to localStorage
  useEffect(() => {
    const saved = localStorage.getItem("agent-settings");
    if (saved) {
      try {
        const s = JSON.parse(saved);
        setAnimationsEnabled(s.animationsEnabled ?? true);
        setSpeechRate(s.speechRate ?? 1);
        setAutoScroll(s.autoScroll ?? true);
        setReduceMotion(s.reduceMotion ?? false);
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "agent-settings",
      JSON.stringify({ animationsEnabled, speechRate, autoScroll, reduceMotion })
    );
  }, [animationsEnabled, speechRate, autoScroll, reduceMotion]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-cyan-400/20"
            style={{
              backgroundColor: "rgba(5, 8, 13, 0.98)",
              backdropFilter: "blur(24px)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <h2 className="font-display text-lg tracking-wider text-pure">
                Settings
              </h2>
              <button
                onClick={onClose}
                aria-label="Close settings"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-cyan-400"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
              {/* Appearance */}
              <Section icon={<Palette size={14} />} title="Appearance">
                <Row label="Theme" description="Currently: Obsidian (dark)">
                  <span className="text-xs text-slate-500">Dark only</span>
                </Row>

                <Toggle
                  label="Animations"
                  description="Enable motion effects"
                  checked={animationsEnabled}
                  onChange={setAnimationsEnabled}
                />

                <Toggle
                  label="Reduce motion"
                  description="Minimize animations for accessibility"
                  checked={reduceMotion}
                  onChange={setReduceMotion}
                />
              </Section>

              {/* Voice */}
              <Section icon={<Volume2 size={14} />} title="Voice">
                <div className="space-y-2 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-200">Speech Rate</span>
                    <span className="font-mono text-xs text-cyan-400">
                      {speechRate.toFixed(1)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={speechRate}
                    onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                  <p className="text-xs text-slate-500">
                    How fast AI speaks responses
                  </p>
                </div>
              </Section>

              {/* Chat behavior */}
              <Section icon={<Zap size={14} />} title="Chat">
                <Toggle
                  label="Auto-scroll"
                  description="Jump to newest message automatically"
                  checked={autoScroll}
                  onChange={setAutoScroll}
                />
              </Section>

              {/* Model */}
              <Section icon={<Cpu size={14} />} title="Model">
                <Row label="Provider" description="Via Token Harbor">
                  <span className="font-mono text-xs text-cyan-400">
                    deepseek-v4-flash:free
                  </span>
                </Row>
                <Row label="Status" description="Backend health">
                  <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                    Connected
                  </span>
                </Row>
              </Section>

              {/* Data */}
              <Section icon={<Database size={14} />} title="Data">
                <button
                  onClick={() => {
                    if (confirm("Clear all local settings?")) {
                      localStorage.removeItem("agent-settings");
                      location.reload();
                    }
                  }}
                  className="w-full rounded-lg border border-red-400/30 bg-red-400/5 px-3 py-2 text-sm text-red-400 transition hover:bg-red-400/10"
                >
                  Reset Local Settings
                </button>
              </Section>
            </div>

            {/* Footer */}
            <div className="border-t border-white/10 px-6 py-3 text-center text-[10px] text-slate-500">
              THE AGENT v0.1.0 · Development Preview
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-cyan-400">{icon}</span>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          {title}
        </h3>
      </div>
      <div className="space-y-1 rounded-xl border border-white/10 bg-white/5 p-1">
        {children}
      </div>
    </div>
  );
}

function Row({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5">
      <div>
        <div className="text-sm text-slate-200">{label}</div>
        {description && (
          <div className="text-xs text-slate-500">{description}</div>
        )}
      </div>
      {children}
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between px-3 py-2.5 text-left transition hover:bg-white/5"
    >
      <div>
        <div className="text-sm text-slate-200">{label}</div>
        {description && (
          <div className="text-xs text-slate-500">{description}</div>
        )}
      </div>
      <span
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked ? "bg-cyan-400" : "bg-slate-600"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}