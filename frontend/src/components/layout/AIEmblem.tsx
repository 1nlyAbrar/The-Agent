
"use client";

import { motion } from "framer-motion";

export function AIEmblem() {
  return (
    <div className="relative flex h-48 w-48 items-center justify-center">
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.3, 0.7, 0.3],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
        }}
        className="absolute h-36 w-36 rounded-full bg-cyan-400/20 blur-3xl"
      />

      <motion.div
        animate={{ rotate: 360 }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute inset-0 rounded-full border border-cyan-400/40"
        style={{
          borderTopColor: "#00DFFF",
          borderRightColor: "transparent",
        }}
      />

      <motion.div
        animate={{ rotate: -360 }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute inset-5 rounded-full border border-blue-500/40"
        style={{
          borderBottomColor: "#008CFF",
          borderLeftColor: "transparent",
        }}
      />

      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          boxShadow: [
            "0 0 15px #00DFFF",
            "0 0 40px #00DFFF",
            "0 0 15px #00DFFF",
          ],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
        }}
        className="h-4 w-4 rounded-full bg-cyan-400"
      />
    </div>
  );
}