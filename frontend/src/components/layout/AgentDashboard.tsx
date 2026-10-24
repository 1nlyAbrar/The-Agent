"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowUp,
  Bot,
  Copy,
  FileText,
  Loader2,
  Menu,
  MessageSquare,
  Mic,
  Paperclip,
  PanelLeftClose,
  Plus,
  Sparkles,
  Square,
  Trash2,
  User,
  Volume2,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";
import { AIEmblem } from "@/components/layout/AIEmblem";
import { useChatStream } from "@/hooks/useChatStream";
import { useConversations } from "@/hooks/useConversations";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { MarkdownMessage } from "@/components/chat/MarkdownMessage";
import { DocumentPanel } from "@/components/upload/DocumentPanel";
import { HudClock } from "@/components/layout/HudClock";
import { VoiceOrbMini } from "@/components/voice/VoiceOrbMini";
import { uploadDocument, type Source } from "@/lib/api";

export function AgentDashboard() {
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [useDocuments, setUseDocuments] = useState(false);
  const [speakResponses, setSpeakResponses] = useState(false);
  const [pendingSources, setPendingSources] = useState<Source[]>([]);
  const [uploading, setUploading] = useState(false);
  const [documentsRefreshKey, setDocumentsRefreshKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    conversations,
    activeId,
    selectConversation,
    newConversation,
    deleteConversation,
    addUserMessage,
    addAssistantMessage,
    setLocalActive,
  } = useConversations();

  const { isStreaming, streamingContent, error, startStream, stopStream, reset } =
    useChatStream();
    
  const { speak } = useSpeechSynthesis();

  const activeConversation = conversations.find((c) => c.id === activeId) ?? null;

  useEffect(() => {
    if (!activeId && conversations.length > 0) {
      setLocalActive(conversations[0].id);
    }
  }, [activeId, conversations, setLocalActive]);

  const handleSources = useCallback((sources: Source[]) => {
    setPendingSources(sources);
  }, []);

  const handleAttach = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        setUploading(true);
        toast.loading(`Uploading ${file.name}...`, { id: "upload" });
        const result = await uploadDocument(file);

        const visionResponse = (result as any).visionResponse as string | undefined;
        if (visionResponse) {
          toast.success(`Analyzed ${result.document.name}`, {
            id: "upload",
            description: visionResponse.slice(0, 200),
            duration: 10000,
          });
          const visionMessage = {
            id: crypto.randomUUID(),
            role: "assistant" as const,
            content: `**Image Analysis — ${result.document.name}**\n\n${visionResponse}`,
          };
          let convId = activeId;
          if (!convId) convId = await newConversation();
          if (convId) {
            setConversations((prev) =>
              prev.map((c) =>
                c.id === convId
                  ? { ...c, messages: [...c.messages, visionMessage] }
                  : c
              )
            );
          }
        } else {
          toast.success(`Uploaded ${result.document.name}`, {
            id: "upload",
            description: `${result.document.pages_parsed} pages · ${result.document.chunks_added} chunks`,
          });
        }
        setDocumentsRefreshKey((k) => k + 1);
        if (!useDocuments) setUseDocuments(true);
      } catch (err) {
        toast.error("Upload failed", {
          id: "upload",
          description: err instanceof Error ? err.message : "Unknown error",
        });
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [useDocuments, activeId, newConversation]
  );

  async function handleNewChat() {
    reset();
    setPendingSources([]);
    setInput("");
    await newConversation();
  }

  async function handleSelectChat(id: string) {
    if (isStreaming) return;
    reset();
    setPendingSources([]);
    setInput("");
    await selectConversation(id);
  }

  async function handleDeleteChat(id: string) {
    reset();
    await deleteConversation(id);
  }

  async function sendMessage() {
    const content = input.trim();
    if (!content || isStreaming) return;

    let convId = activeId;
    if (!convId) {
      convId = await newConversation();
      if (!convId) return;
    }

    await addUserMessage(convId, content);
    setInput("");
    setPendingSources([]);

    const conv = conversations.find((c) => c.id === convId);
    const prior = conv?.messages ?? [];
    const apiMessages = [
      ...prior.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content },
    ];

    await startStream(
      apiMessages,
      async (finalContent) => {
        await addAssistantMessage(
          convId!,
          finalContent,
          pendingSources.length > 0 ? pendingSources : undefined
        );
        
        if (speakResponses) {
          speak(finalContent);
        }

        setTimeout(() => setMemoryRefreshKey((k) => k + 1), 3000);
      },
      { useDocuments, onSources: handleSources }
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden text-slate-100">
      {sidebarOpen && (
        <aside className="flex w-72 shrink-0 flex-col border-r border-cyan-400/10 bg-[#0a1423]/85 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 p-5">
            <div className="flex items-center gap-2">
              <Bot className="h-6 w-6 text-cyan-400" />
              <span className="font-bold tracking-widest">THE AGENT</span>
            </div>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
              className="rounded-lg p-2 text-slate-400 hover:bg-white/10"
            >
              <PanelLeftClose size={18} />
            </button>
          </div>

          <div className="px-4 pt-4">
            <HudClock variant="sidebar" />
          </div>

          <div className="p-4">
            <button
              type="button"
              onClick={handleNewChat}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-sm font-medium text-cyan-300 transition hover:bg-cyan-400/20"
            >
              <Plus size={18} />
              New Chat
            </button>
          </div>

          <div className="border-t border-white/10">
            <div className="px-5 pb-2 pt-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
              Documents
            </div>
            <div className="px-3 pb-3">
              <DocumentPanel key={documentsRefreshKey} />
            </div>
          </div>

          <div className="border-t border-white/10">
            <div className="px-5 pb-2 pt-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
              Voice
            </div>
            <div className="px-3 pb-3">
              <VoiceOrbMini isStreaming={isStreaming} />
            </div>
          </div>

          <div className="px-5 pb-2 pt-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Conversations
          </div>

          <div className="flex-1 space-y-1 overflow-y-auto px-3">
            {conversations.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-center opacity-60">
                <MessageSquare className="mb-2 h-8 w-8 text-cyan-400/50" />
                <p className="text-xs text-slate-400">No chats yet</p>
                <p className="mt-1 text-[10px] text-slate-500">Start a new conversation above</p>
              </div>
            )}
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`group flex items-center gap-2 rounded-xl ${
                  activeId === conversation.id
                    ? "bg-cyan-400/10 text-cyan-200"
                    : "text-slate-400 hover:bg-white/5"
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleSelectChat(conversation.id)}
                  className="flex min-w-0 flex-1 items-center gap-2 px-3 py-3 text-left text-sm"
                >
                  <MessageSquare size={16} className="shrink-0" />
                  <span className="truncate">{conversation.title}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteChat(conversation.id)}
                  aria-label={`Delete ${conversation.title}`}
                  className="mr-2 rounded-md p-1 text-slate-500 hover:text-red-400"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 p-4 text-xs text-slate-500">
            THE AGENT · Development Preview
          </div>
        </aside>
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-[#05080d]/40 px-4 backdrop-blur-md md:px-8">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
                className="rounded-lg p-2 text-cyan-400 hover:bg-white/10"
              >
                <Menu size={21} />
              </button>
            )}
            <span className="font-semibold">AI Workspace</span>

            <Link
              href="/voice"
              className="ml-2 flex items-center gap-1 rounded-lg border border-cyan-400/20 px-2 py-1 text-xs text-cyan-400 transition hover:border-cyan-400/60 hover:bg-cyan-400/10"
            >
              <Mic size={12} />
              Voice
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <HudClock variant="hud" isActive={isStreaming} />
            
            <button
              type="button"
              onClick={() => setSpeakResponses((v) => !v)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                speakResponses
                  ? "border-cyan-400/50 bg-cyan-400/15 text-cyan-300"
                  : "border-white/10 text-slate-400 hover:border-cyan-400/30 hover:text-cyan-400"
              }`}
              title="Speak AI responses aloud"
            >
              {speakResponses ? <Volume2 size={13} /> : <VolumeX size={13} />}
              Voice {speakResponses ? "ON" : "OFF"}
            </button>

            <button
              type="button"
              onClick={() => setUseDocuments((v) => !v)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                useDocuments
                  ? "border-cyan-400/50 bg-cyan-400/15 text-cyan-300"
                  : "border-white/10 text-slate-400 hover:border-cyan-400/30 hover:text-cyan-400"
              }`}
              title="Augment responses with your uploaded documents"
            >
              <FileText size={13} />
              Docs {useDocuments ? "ON" : "OFF"}
            </button>

            <span className="flex items-center gap-2 text-xs text-slate-400">
              <span
                className={`h-2 w-2 rounded-full ${
                  error ? "bg-red-400" : "bg-emerald-400 animate-pulse"
                }`}
              />
              {error ? "Backend error" : "Live · DeepSeek"}
            </span>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-4 py-6">
            <div className="mx-auto flex min-h-full max-w-3xl flex-col">
              {(!activeConversation ||
                activeConversation.messages.length === 0) &&
              !streamingContent ? (
                <div className="flex flex-1 flex-col items-center justify-center text-center">
                  <AIEmblem size={320} isActive={isStreaming} />
                  <h1 className="agent-gradient-text mt-4 text-3xl font-bold md:text-5xl">
                    THE AGENT
                  </h1>
                  <p className="mt-4 text-slate-400">
                    One Agent. Infinite Possibilities.
                  </p>
                  <div className="mt-8 flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-4 py-2 text-xs text-cyan-300">
                    <Sparkles size={15} />
                    Your intelligent AI workspace
                  </div>
                  {useDocuments && (
                    <div className="mt-4 flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-xs text-cyan-300">
                      <FileText size={15} />
                      Documents mode active — ask about your files
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6 pb-6">
                  {activeConversation?.messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{
                        opacity: 0,
                        x: message.role === "user" ? 20 : -20,
                      }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className={`flex gap-3 ${
                        message.role === "user"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      {message.role === "assistant" && (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                          <Bot size={18} />
                        </div>
                      )}

                      <div
                        className={`group relative max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                          message.role === "user"
                            ? "whitespace-pre-wrap border border-cyan-400/20 bg-cyan-400/10 text-slate-100"
                            : "border border-white/10 bg-white/5 text-slate-200"
                        }`}
                      >
                        <MarkdownMessage
                          content={message.content}
                          role={message.role}
                        />

                        {message.sources && message.sources.length > 0 && (
                          <div className="mt-3 border-t border-white/10 pt-2">
                            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-400/80">
                              Sources
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {message.sources.map((s, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center gap-1 rounded-md border border-cyan-400/20 bg-cyan-400/5 px-2 py-0.5 text-[10px] text-cyan-300"
                                  title={s.preview}
                                >
                                  <FileText size={10} />
                                  {s.document} · p.{s.page} · {s.score}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {message.role === "assistant" && (
                          <div className="mt-2 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              onClick={() =>
                                navigator.clipboard.writeText(message.content)
                              }
                              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-500 transition hover:bg-white/5 hover:text-cyan-400"
                              aria-label="Copy message"
                            >
                              <Copy size={12} />
                              Copy
                            </button>
                          </div>
                        )}
                      </div>

                      {message.role === "user" && (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-slate-300">
                          <User size={18} />
                        </div>
                      )}
                    </motion.div>
                  ))}

                  {isStreaming && streamingContent && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="flex justify-start gap-3"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                        <Bot size={18} />
                      </div>
                      <div className="max-w-[85%] rounded-2xl border border-cyan-400/30 bg-cyan-400/5 px-4 py-3 text-sm text-slate-100">
                        <MarkdownMessage
                          content={streamingContent}
                          role="assistant"
                        />
                        <span className="ml-1 inline-block h-4 w-1 animate-pulse bg-cyan-400 align-middle" />
                      </div>
                    </motion.div>
                  )}

                  {isStreaming && !streamingContent && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="flex justify-start gap-3"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                        <Bot size={18} />
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400">
                        <span className="inline-flex gap-1">
                          <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-400 [animation-delay:-0.3s]" />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-400 [animation-delay:-0.15s]" />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-400" />
                        </span>
                      </div>
                    </motion.div>
                  )}

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300"
                    >
                      ⚠ {error}
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0 px-4 pb-5 pt-2 md:px-8">
            <div
              className="mx-auto max-w-3xl rounded-2xl border border-cyan-400/40 p-3 backdrop-blur-2xl transition-all duration-300 focus-within:border-cyan-400 focus-within:shadow-[0_0_30px_rgba(0,223,255,0.4)]"
              style={{
                backgroundColor: "#F5FAFF",
                boxShadow:
                  "0 0 0 1px rgba(0, 223, 255, 0.2), 0 20px 60px rgba(0, 0, 0, 0.7), 0 0 60px rgba(0, 223, 255, 0.25)",
              }}
            >
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder={
                  useDocuments
                    ? "Ask about your documents..."
                    : "Message THE AGENT..."
                }
                rows={2}
                disabled={isStreaming}
                className="w-full resize-none bg-transparent px-3 py-2 text-sm text-[#05080D] outline-none placeholder:text-slate-400 disabled:opacity-50"
              />

              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.txt,.md,.csv,.xlsx,.xls,.json,.png,.jpg,.jpeg,.webp"
                    onChange={handleAttach}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    aria-label="Attach file"
                    title="Attach document or image"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-500 transition hover:border-cyan-500 hover:bg-cyan-50 hover:text-cyan-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {uploading ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Paperclip size={15} />
                    )}
                  </button>

                  <span className="hidden text-xs text-slate-500 sm:inline">
                    {isStreaming
                      ? "Streaming response..."
                      : uploading
                      ? "Uploading..."
                      : useDocuments
                      ? "Documents mode ON"
                      : "Shift + Enter for a new line"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href="/voice"
                    aria-label="Voice assistant"
                    title="Open voice assistant"
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 text-slate-500 transition hover:border-cyan-500 hover:bg-cyan-50 hover:text-cyan-600"
                  >
                    <Mic size={17} />
                  </Link>

                  {isStreaming ? (
                    <button
                      type="button"
                      onClick={stopStream}
                      aria-label="Stop generation"
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/20 text-red-500 transition hover:bg-red-500/30"
                    >
                      <Square size={16} fill="currentColor" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={sendMessage}
                      disabled={!input.trim()}
                      aria-label="Send message"
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#05080D] text-cyan-400 transition hover:bg-[#0a1423] disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ArrowUp size={19} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <p className="mt-3 text-center text-xs text-slate-500">
              {isStreaming
                ? "Receiving response..."
                : "Connected to DeepSeek via THE AGENT backend"}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
