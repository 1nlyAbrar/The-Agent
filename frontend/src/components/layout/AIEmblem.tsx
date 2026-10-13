"use client";

import { motion } from "framer-motion";

interface AIEmblemProps {
  size?: number;
  isActive?: boolean;
}

export function AIEmblem({ size = 320, isActive = false }: AIEmblemProps) {
  const s = size;
  const ring = (inset: number) => ({
    width: s - inset,
    height: s - inset,
  });

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: s, height: s }}
    >
      {/* Outer glow aura */}
      <motion.div
        animate={{
          scale: isActive ? [1, 1.15, 1] : [1, 1.08, 1],
          opacity: isActive ? [0.5, 0.85, 0.5] : [0.35, 0.6, 0.35],
        }}
        transition={{
          duration: isActive ? 1.8 : 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute inset-0 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle at center, rgba(0,223,255,0.45) 0%, rgba(0,140,255,0.15) 40%, transparent 70%)",
        }}
      />

      {/* Rotating conic gradient — holographic shimmer */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{
          duration: isActive ? 8 : 24,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute rounded-full opacity-40"
        style={{
          width: s * 0.9,
          height: s * 0.9,
          background:
            "conic-gradient(from 0deg, transparent 0deg, rgba(0,223,255,0.4) 60deg, transparent 120deg, transparent 240deg, rgba(0,140,255,0.4) 300deg, transparent 360deg)",
          filter: "blur(2px)",
        }}
      />

      {/* Ring 1 — outermost, slow */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        className="absolute rounded-full border"
        style={{
          ...ring(0),
          borderColor: "rgba(0,223,255,0.25)",
          borderTopColor: "#00DFFF",
          borderRightColor: "transparent",
          boxShadow: "0 0 30px rgba(0,223,255,0.35)",
        }}
      />

      {/* Ring 2 — reverse direction */}
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        className="absolute rounded-full border"
        style={{
          ...ring(s * 0.12),
          borderColor: "rgba(0,140,255,0.2)",
          borderBottomColor: "#008CFF",
          borderLeftColor: "transparent",
          boxShadow: "0 0 20px rgba(0,140,255,0.3)",
        }}
      />

      {/* Ring 3 — dashed, medium speed */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
        className="absolute rounded-full border-2 border-dashed"
        style={{
          ...ring(s * 0.24),
          borderColor: "rgba(0,223,255,0.35)",
        }}
      />

      {/* Ring 4 — thin solid */}
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
        className="absolute rounded-full border"
        style={{
          ...ring(s * 0.34),
          borderColor: "rgba(0,223,255,0.5)",
          borderTopColor: "transparent",
          borderRightColor: "transparent",
        }}
      />

      {/* Ring 5 — pulsing halo */}
      <motion.div
        animate={{
          scale: [1, 1.06, 1],
          opacity: [0.6, 1, 0.6],
        }}
        transition={{
          duration: isActive ? 1.2 : 2.4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute rounded-full border-2"
        style={{
          ...ring(s * 0.44),
          borderColor: "rgba(0,223,255,0.7)",
          boxShadow:
            "0 0 20px rgba(0,223,255,0.6), inset 0 0 20px rgba(0,223,255,0.3)",
        }}
      />

      {/* Expanding ripples — 2 offset */}
      <motion.div
        animate={{ scale: [0.5, 1.2], opacity: [0.6, 0] }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeOut",
        }}
        className="absolute rounded-full border"
        style={{
          width: s * 0.5,
          height: s * 0.5,
          borderColor: "rgba(0,223,255,0.5)",
        }}
      />
      <motion.div
        animate={{ scale: [0.5, 1.2], opacity: [0.6, 0] }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeOut",
          delay: 1.5,
        }}
        className="absolute rounded-full border"
        style={{
          width: s * 0.5,
          height: s * 0.5,
          borderColor: "rgba(0,223,255,0.5)",
        }}
      />

      {/* Orbiting particles — 8 dots */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * 360;
        const radius = s * 0.42;
        return (
          <motion.div
            key={i}
            animate={{ rotate: 360 }}
            transition={{
              duration: 18 + i * 2,
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
                backgroundColor: i % 2 === 0 ? "#00DFFF" : "#008CFF",
                boxShadow:
                  i % 2 === 0
                    ? "0 0 10px rgba(0,223,255,0.9)"
                    : "0 0 10px rgba(0,140,255,0.9)",
              }}
            />
          </motion.div>
        );
      })}

      {/* Inner glow disk */}
      <motion.div
        animate={{
          scale: isActive ? [1, 1.1, 1] : [1, 1.05, 1],
        }}
        transition={{
          duration: isActive ? 1.5 : 2.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute rounded-full"
        style={{
          width: s * 0.35,
          height: s * 0.35,
          background:
            "radial-gradient(circle at center, rgba(0,223,255,0.4) 0%, rgba(0,140,255,0.15) 50%, transparent 80%)",
          filter: "blur(8px)",
        }}
      />

      {/* Center core — bright */}
      <motion.div
        animate={{
          scale: isActive ? [1, 1.4, 1] : [1, 1.15, 1],
          boxShadow: isActive
            ? [
                "0 0 25px rgba(0,223,255,0.9)",
                "0 0 60px rgba(0,223,255,1)",
                "0 0 25px rgba(0,223,255,0.9)",
              ]
            : [
                "0 0 20px rgba(0,223,255,0.7)",
                "0 0 40px rgba(0,223,255,1)",
                "0 0 20px rgba(0,223,255,0.7)",
              ],
        }}
        transition={{
          duration: isActive ? 1 : 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="relative h-5 w-5 rounded-full"
        style={{
          backgroundColor: "#00DFFF",
        }}
      />

      {/* Tiny white core — very center */}
      <div
        className="absolute h-2 w-2 rounded-full"
        style={{
          backgroundColor: "#F5FAFF",
          boxShadow: "0 0 15px rgba(245,250,255,0.9)",
        }}
      />
    </div>
  );
}
