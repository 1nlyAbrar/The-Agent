"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquarePlus,
  FileText,
  Mic,
  Settings,
  Search,
  Trash2,
  Sparkles,
  Code2,
  Sun,
  Copy,
} from "lucide-react";

interface CommandPaletteProps {
  onNewChat?: () => void;
  onToggleDocs?: () => void;
  onOpenSettings?: () => void;
}

export function CommandPalette({
  onNewChat,
  onToggleDocs,
  onOpenSettings,
}: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const run = (fn: () => void) => {
    setOpen(false);
    setTimeout(fn, 100);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15 }}
            className="fixed left-1/2 top-32 z-50 w-full max-w-xl -translate-x-1/2"
          >
            <Command
              className="overflow-hidden rounded-2xl border border-cyan-400/30 shadow-2xl"
              style={{
                backgroundColor: "rgba(5, 8, 13, 0.96)",
                backdropFilter: "blur(24px)",
                boxShadow:
                  "0 20px 60px rgba(0,0,0,0.8), 0 0 60px rgba(0,223,255,0.2)",
              }}
            >
              <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
                <Search size={16} className="text-cyan-400" />
                <Command.Input
                  placeholder="Type a command or search..."
                  className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
                />
                <kbd className="rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                  ESC
                </kbd>
              </div>

              <Command.List className="max-h-80 overflow-y-auto p-2">
                <Command.Empty className="p-6 text-center text-sm text-slate-500">
                  No results found.
                </Command.Empty>

                <Command.Group
                  heading="Actions"
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-slate-500"
                >
                  <Item
                    icon={<MessageSquarePlus size={15} />}
                    label="New Chat"
                    shortcut="⌘N"
                    onSelect={() => run(() => onNewChat?.())}
                  />
                  <Item
                    icon={<FileText size={15} />}
                    label="Toggle Documents Mode"
                    onSelect={() => run(() => onToggleDocs?.())}
                  />
                  <Item
                    icon={<Mic size={15} />}
                    label="Open Voice Assistant"
                    onSelect={() => run(() => router.push("/voice"))}
                  />
                  <Item
                    icon={<Settings size={15} />}
                    label="Open Settings"
                    shortcut="⌘,"
                    onSelect={() => run(() => onOpenSettings?.())}
                  />
                </Command.Group>

                <Command.Group
                  heading="Navigate"
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-slate-500"
                >
                  <Item
                    icon={<Sparkles size={15} />}
                    label="Home"
                    onSelect={() => run(() => router.push("/"))}
                  />
                  <Item
                    icon={<Code2 size={15} />}
                    label="Chat Workspace"
                    onSelect={() => run(() => router.push("/chat"))}
                  />
                </Command.Group>
              </Command.List>

              <div className="flex items-center justify-between border-t border-white/10 px-4 py-2 text-[10px] text-slate-500">
                <span>THE AGENT · Command Palette</span>
                <span className="font-mono">↑↓ to navigate · ⏎ to select</span>
              </div>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Item({
  icon,
  label,
  shortcut,
  onSelect,
}: {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 transition aria-selected:bg-cyan-400/10 aria-selected:text-cyan-300"
    >
      <span className="text-cyan-400/70">{icon}</span>
      <span className="flex-1">{label}</span>
      {shortcut && (
        <kbd className="rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
          {shortcut}
        </kbd>
      )}
    </Command.Item>
  );
}