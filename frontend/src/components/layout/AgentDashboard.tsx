"use client";

import { useState } from "react";
import {
  ArrowUp,
  Bot,
  Menu,
  MessageSquare,
  PanelLeftClose,
  Plus,
  Sparkles,
  Square,
  Trash2,
  User,
} from "lucide-react";
import { AIEmblem } from "@/components/layout/AIEmblem";
import { useChatStream } from "@/hooks/useChatStream";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type Conversation = {
  id: string;
  title: string;
  messages: Message[];
};

export function AgentDashboard() {
  const [conversations, setConversations] = useState<Conversation[]>([
    { id: "welcome", title: "New conversation", messages: [] },
  ]);
  const [activeId, setActiveId] = useState("welcome");
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const { isStreaming, streamingContent, error, startStream, stopStream } =
    useChatStream();

  const activeConversation = conversations.find((c) => c.id === activeId);

  function newChat() {
    stopStream();
    const id = crypto.randomUUID();
    setConversations((current) => [
      { id, title: "New conversation", messages: [] },
      ...current,
    ]);
    setActiveId(id);
    setInput("");
  }

  function deleteChat(id: string) {
    const remaining = conversations.filter((c) => c.id !== id);
    if (remaining.length === 0) {
      const newId = crypto.randomUUID();
      setConversations([{ id: newId, title: "New conversation", messages: [] }]);
      setActiveId(newId);
      return;
    }
    setConversations(remaining);
    if (activeId === id) setActiveId(remaining[0].id);
  }

  async function sendMessage() {
    const content = input.trim();
    if (!content || isStreaming) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
    };

    // Append user message
    const updatedMessages = [...(activeConversation?.messages ?? []), userMessage];

    setConversations((current) =>
      current.map((c) =>
        c.id === activeId
          ? {
              ...c,
              title:
                c.messages.length === 0 ? content.slice(0, 32) : c.title,
              messages: updatedMessages,
            }
          : c
      )
    );

    setInput("");

    // Call backend
    const apiMessages = updatedMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    await startStream(apiMessages);
  }

  function saveAssistantMessage(finalContent: string) {
    if (!finalContent.trim()) return;
    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: finalContent,
    };
    setConversations((current) =>
      current.map((c) =>
        c.id === activeId
          ? { ...c, messages: [...c.messages, assistantMessage] }
          : c
      )
    );
  }

  // Save assistant response when streaming completes
  if (!isStreaming && streamingContent && activeConversation) {
    const lastMsg = activeConversation.messages[activeConversation.messages.length - 1];
    if (lastMsg?.role !== "assistant" || lastMsg.content !== streamingContent) {
      saveAssistantMessage(streamingContent);
    }
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-[#05080d] text-slate-100">
      {/* Sidebar */}
      {sidebarOpen && (
        <aside className="flex w-72 shrink-0 flex-col border-r border-cyan-400/10 bg-[#0a1423]">
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

          <div className="p-4">
            <button
              type="button"
              onClick={newChat}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-sm font-medium text-cyan-300 transition hover:bg-cyan-400/20"
            >
              <Plus size={18} />
              New Chat
            </button>
          </div>

          <div className="px-5 pb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Conversations
          </div>

          <div className="flex-1 space-y-1 overflow-y-auto px-3">
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
                  onClick={() => setActiveId(conversation.id)}
                  className="flex min-w-0 flex-1 items-center gap-2 px-3 py-3 text-left text-sm"
                >
                  <MessageSquare size={16} className="shrink-0" />
                  <span className="truncate">{conversation.title}</span>
                </button>
                <button
                  type="button"
                  onClick={() => deleteChat(conversation.id)}
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

      {/* Main workspace */}
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-4 md:px-8">
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
          </div>

          <span className="flex items-center gap-2 text-xs text-slate-400">
            <span
              className={`h-2 w-2 rounded-full ${
                error ? "bg-red-400" : "bg-emerald-400 animate-pulse"
              }`}
            />
            {error ? "Backend error" : "Live · DeepSeek"}
          </span>
        </header>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-4 py-6">
            <div className="mx-auto flex min-h-full max-w-3xl flex-col">
              {(!activeConversation || activeConversation.messages.length === 0) &&
              !streamingContent ? (
                <div className="flex flex-1 flex-col items-center justify-center text-center">
                  <AIEmblem />
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
                </div>
              ) : (
                <div className="space-y-6 pb-6">
                  {activeConversation?.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${
                        message.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {message.role === "assistant" && (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                          <Bot size={18} />
                        </div>
                      )}
                      <div
                        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-7 ${
                          message.role === "user"
                            ? "border border-cyan-400/20 bg-cyan-400/10 text-slate-100"
                            : "border border-white/10 bg-white/5 text-slate-200"
                        }`}
                      >
                        {message.content}
                      </div>
                      {message.role === "user" && (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-slate-300">
                          <User size={18} />
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Streaming assistant message */}
                  {isStreaming && streamingContent && (
                    <div className="flex gap-3 justify-start">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                        <Bot size={18} />
                      </div>
                      <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl border border-cyan-400/30 bg-cyan-400/5 px-4 py-3 text-sm leading-7 text-slate-100">
                        {streamingContent}
                        <span className="ml-1 inline-block h-4 w-1 animate-pulse bg-cyan-400 align-middle" />
                      </div>
                    </div>
                  )}

                  {/* Thinking indicator */}
                  {isStreaming && !streamingContent && (
                    <div className="flex gap-3 justify-start">
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
                    </div>
                  )}

                  {/* Error */}
                  {error && (
                    <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
                      ⚠ {error}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Chat composer */}
          <div className="shrink-0 px-4 pb-5 pt-2 md:px-8">
            <div className="agent-glass mx-auto max-w-3xl rounded-2xl p-3">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Message THE AGENT..."
                rows={2}
                disabled={isStreaming}
                className="w-full resize-none bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 disabled:opacity-50"
              />
              <div className="flex items-center justify-between px-2">
                <span className="text-xs text-slate-500">
                  {isStreaming ? "Streaming response..." : "Shift + Enter for a new line"}
                </span>

                {isStreaming ? (
                  <button
                    type="button"
                    onClick={stopStream}
                    aria-label="Stop generation"
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/20 text-red-400 transition hover:bg-red-500/30"
                  >
                    <Square size={16} fill="currentColor" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={sendMessage}
                    disabled={!input.trim()}
                    aria-label="Send message"
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400 text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ArrowUp size={19} />
                  </button>
                )}
              </div>
            </div>

            <p className="mt-3 text-center text-xs text-slate-600">
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