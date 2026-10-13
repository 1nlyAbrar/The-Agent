"use client";

import { motion } from "framer-motion";

interface VoiceOrbProps {
  size?: number;
  state: "idle" | "listening" | "thinking" | "speaking";
}

export function VoiceOrb({ size = 280, state }: VoiceOrbProps) {
  const s = size;

  const config = {
    idle: {
      color: "#00DFFF",
      glow: "rgba(0,223,255,0.5)",
      scale: [1, 1.05, 1],
      duration: 3,
    },
    listening: {
      color: "#00FFC6",
      glow: "rgba(0,255,198,0.85)",
      scale: [1, 1.18, 1],
      duration: 1,
    },
    thinking: {
      color: "#B44DFF",
      glow: "rgba(180,77,255,0.75)",
      scale: [1, 1.1, 1],
      duration: 1.5,
    },
    speaking: {
      color: "#00DFFF",
      glow: "rgba(0,223,255,0.9)",
      scale: [1, 1.15, 1],
      duration: 0.6,
    },
  }[state];

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: s, height: s }}
    >
      {/* Outer aura */}
      <motion.div
        animate={{
          scale: config.scale,
          opacity: [0.4, 0.8, 0.4],
        }}
        transition={{
          duration: config.duration,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute inset-0 rounded-full blur-3xl"
        style={{
          background: `radial-gradient(circle at center, ${config.glow} 0%, transparent 70%)`,
        }}
      />

      {/* Rotating ring 1 */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{
          duration: state === "speaking" ? 4 : 20,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute rounded-full border"
        style={{
          width: s * 0.9,
          height: s * 0.9,
          borderColor: "rgba(0,223,255,0.25)",
          borderTopColor: config.color,
          borderRightColor: "transparent",
          boxShadow: `0 0 30px ${config.glow}`,
        }}
      />

      {/* Rotating ring 2 (opposite) */}
      <motion.div
        animate={{ rotate: -360 }}
        transition={{
          duration: state === "speaking" ? 6 : 30,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute rounded-full border-2 border-dashed"
        style={{
          width: s * 0.7,
          height: s * 0.7,
          borderColor: "rgba(0,223,255,0.35)",
        }}
      />

      {/* Pulsing ring */}
      <motion.div
        animate={{
          scale: [1, 1.08, 1],
          opacity: [0.6, 1, 0.6],
        }}
        transition={{
          duration: config.duration * 0.8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute rounded-full border-2"
        style={{
          width: s * 0.5,
          height: s * 0.5,
          borderColor: config.color,
          boxShadow: `0 0 40px ${config.glow}, inset 0 0 30px ${config.glow}`,
        }}
      />

      {/* Expanding ripples */}
      {state !== "idle" && (
        <>
          <motion.div
            animate={{ scale: [0.6, 1.4], opacity: [0.7, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
            className="absolute rounded-full border"
            style={{
              width: s * 0.5,
              height: s * 0.5,
              borderColor: config.color,
            }}
          />
          <motion.div
            animate={{ scale: [0.6, 1.4], opacity: [0.7, 0] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeOut",
              delay: 1,
            }}
            className="absolute rounded-full border"
            style={{
              width: s * 0.5,
              height: s * 0.5,
              borderColor: config.color,
            }}
          />
        </>
      )}

      {/* Orbiting particles */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * 360;
        const radius = s * 0.38;
        return (
          <motion.div
            key={i}
            animate={{ rotate: 360 }}
            transition={{
              duration: (state === "speaking" ? 6 : 18) + i,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute"
            style={{
              width: s,
              height: s,
              transform: `rotate(${angle}deg)`,
            }}
          >
            <div
              className="absolute h-1.5 w-1.5 rounded-full"
              style={{
                top: s * 0.5 - radius,
                left: s * 0.5 - 3,
                backgroundColor: config.color,
                boxShadow: `0 0 12px ${config.glow}`,
              }}
            />
          </motion.div>
        );
      })}

      {/* Core */}
      <motion.div
        animate={{
          scale:
            state === "listening"
              ? [1, 1.4, 1]
              : state === "speaking"
              ? [1, 1.25, 1]
              : [1, 1.1, 1],
          boxShadow: [
            `0 0 30px ${config.glow}`,
            `0 0 60px ${config.glow}`,
            `0 0 30px ${config.glow}`,
          ],
        }}
        transition={{
          duration: config.duration,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="relative rounded-full"
        style={{
          width: s * 0.15,
          height: s * 0.15,
          backgroundColor: config.color,
        }}
      />

      {/* White inner core */}
      <div
        className="absolute h-3 w-3 rounded-full bg-white"
        style={{
          boxShadow: "0 0 20px rgba(255,255,255,0.9)",
        }}
      />
    </div>
  );
}