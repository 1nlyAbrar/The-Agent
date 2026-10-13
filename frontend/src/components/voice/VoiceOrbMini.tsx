"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Mic } from "lucide-react";

interface VoiceOrbMiniProps {
  isStreaming?: boolean;
}

export function VoiceOrbMini({ isStreaming = false }: VoiceOrbMiniProps) {
  return (
    <Link
      href="/voice"
      className="group flex items-center gap-3 rounded-xl border border-cyan-400/20 bg-[#0a1423]/70 p-3 backdrop-blur-md transition-all hover:border-cyan-400/50 hover:bg-cyan-400/5"
    >
      {/* Mini orb */}
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
        {/* Outer glow */}
        <motion.div
          animate={{
            scale: isStreaming ? [1, 1.25, 1] : [1, 1.12, 1],
            opacity: [0.5, 0.9, 0.5],
          }}
          transition={{
            duration: isStreaming ? 1 : 2.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute inset-0 rounded-full blur-md"
          style={{
            background:
              "radial-gradient(circle at center, rgba(0,223,255,0.7) 0%, transparent 70%)",
          }}
        />

        {/* Rotating ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            duration: isStreaming ? 3 : 8,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute inset-0 rounded-full border-2"
          style={{
            borderColor: "rgba(0,223,255,0.3)",
            borderTopColor: "#00DFFF",
          }}
        />

        {/* Inner pulsing ring */}
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute inset-2 rounded-full border"
          style={{
            borderColor: "rgba(0,223,255,0.5)",
            boxShadow: "0 0 12px rgba(0,223,255,0.5)",
          }}
        />

        {/* Mic icon */}
        <Mic
          size={14}
          className="relative z-10 text-cyan-400 transition-colors group-hover:text-white"
        />
      </div>

      {/* Label */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-200 transition-colors group-hover:text-cyan-300">
          Voice Assistant
        </p>
        <p className="text-[10px] text-slate-500">Tap to speak</p>
      </div>

      {/* Chevron */}
      <span className="text-cyan-400/60 transition-transform group-hover:translate-x-0.5 group-hover:text-cyan-400">
        →
      </span>
    </Link>
  );
}