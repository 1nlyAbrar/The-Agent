
import { AIEmblem } from "@/components/layout/AIEmblem";

export default function Home() {
  return (
    <main className="agent-grid flex min-h-screen flex-col items-center justify-center px-6">
      <AIEmblem />

      <h1 className="agent-gradient-text mt-8 text-center text-4xl font-bold tracking-widest md:text-6xl">
        THE AGENT
      </h1>

      <p className="mt-4 text-center text-lg text-slate-400">
        One Agent. Infinite Possibilities.
      </p>

      <div className="agent-glass mt-10 rounded-2xl px-8 py-5 text-center">
        <p className="text-cyan-400">
          Neural Interface Initialized
        </p>
        <p className="mt-2 text-sm text-slate-400">
          Your AI workspace is coming online.
        </p>
      </div>
    </main>
  );
}