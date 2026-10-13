"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addMessage as apiAddMessage,
  createConversation as apiCreateConversation,
  deleteConversation as apiDeleteConversation,
  getConversation as apiGetConversation,
  listConversations,
  renameConversation as apiRenameConversation,
  searchConversations as apiSearch,
  type ConversationSummary,
  type Source,
} from "@/lib/api";

export interface LocalMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

export interface LocalConversation {
  id: string;
  title: string;
  messages: LocalMessage[];
  updated_at?: string;
}

export interface UseConversationsReturn {
  conversations: LocalConversation[];
  activeId: string | null;
  loading: boolean;
  error: string | null;

  // Actions
  refreshList: () => Promise<void>;
  selectConversation: (id: string) => Promise<void>;
  newConversation: () => Promise<string | null>;
  deleteConversation: (id: string) => Promise<void>;
  renameConversation: (id: string, title: string) => Promise<void>;
  searchConversations: (query: string) => Promise<ConversationSummary[]>;

  // Message operations
  addUserMessage: (conversationId: string, content: string) => Promise<void>;
  addAssistantMessage: (
    conversationId: string,
    content: string,
    sources?: Source[]
  ) => Promise<void>;
  updateLocalMessage: (conversationId: string, message: LocalMessage) => void;

  // Local-only (for streaming display)
  setLocalActive: (id: string | null) => void;
}

export function useConversations(): UseConversationsReturn {
  const [conversations, setConversations] = useState<LocalConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ============================================
     Load conversation list on mount
     ============================================ */
  const refreshList = useCallback(async () => {
    try {
      const summaries = await listConversations();
      setConversations((prev) => {
        // Preserve already-loaded messages
        const map = new Map(prev.map((c) => [c.id, c]));
        return summaries.map((s) => ({
          id: s.id,
          title: s.title,
          messages: map.get(s.id)?.messages ?? [],
          updated_at: s.updated_at,
        }));
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  /* ============================================
     Load a specific conversation's full messages
     ============================================ */
  const selectConversation = useCallback(async (id: string) => {
    setActiveId(id);
    try {
      const full = await apiGetConversation(id);
      setConversations((prev) => {
        const exists = prev.find((c) => c.id === id);
        const mapped: LocalConversation = {
          id: full.id,
          title: full.title,
          messages: full.messages.map((m) => ({
            id: m.id,
            role: m.role === "system" ? "assistant" : m.role,
            content: m.content,
            sources: m.sources ?? undefined,
          })),
          updated_at: full.updated_at,
        };
        return exists
          ? prev.map((c) => (c.id === id ? mapped : c))
          : [mapped, ...prev];
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load conversation";
      setError(msg);
    }
  }, []);

  /* ============================================
     Create a new conversation
     ============================================ */
  const newConversation = useCallback(async () => {
    try {
      const created = await apiCreateConversation();
      setConversations((prev) => [
        { id: created.id, title: created.title, messages: [] },
        ...prev,
      ]);
      setActiveId(created.id);
      return created.id;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create";
      setError(msg);
      return null;
    }
  }, []);

  /* ============================================
     Delete a conversation
     ============================================ */
  const deleteConversation = useCallback(
    async (id: string) => {
      try {
        await apiDeleteConversation(id);
        setConversations((prev) => {
          const remaining = prev.filter((c) => c.id !== id);
          if (activeId === id) setActiveId(remaining[0]?.id ?? null);
          return remaining;
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to delete";
        setError(msg);
      }
    },
    [activeId]
  );

  /* ============================================
     Rename a conversation
     ============================================ */
  const renameConversation = useCallback(async (id: string, title: string) => {
    try {
      await apiRenameConversation(id, title);
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title } : c))
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Rename failed";
      setError(msg);
    }
  }, []);

  /* ============================================
     Search conversations
     ============================================ */
  const searchConversations = useCallback(async (query: string) => {
    try {
      return await apiSearch(query);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Search failed";
      setError(msg);
      return [];
    }
  }, []);

  /* ============================================
     Add user message (save to DB)
     ============================================ */
  const addUserMessage = useCallback(
    async (conversationId: string, content: string) => {
      try {
        const saved = await apiAddMessage(conversationId, "user", content);
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  title:
                    c.messages.length === 0
                      ? content.slice(0, 60)
                      : c.title,
                  messages: [
                    ...c.messages,
                    {
                      id: saved.id,
                      role: "user",
                      content: saved.content,
                    },
                  ],
                }
              : c
          )
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Save failed";
        setError(msg);
      }
    },
    []
  );

  /* ============================================
     Add assistant message (save to DB)
     ============================================ */
  const addAssistantMessage = useCallback(
    async (conversationId: string, content: string, sources?: Source[]) => {
      try {
        const saved = await apiAddMessage(
          conversationId,
          "assistant",
          content,
          sources ?? null
        );
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  messages: [
                    ...c.messages,
                    {
                      id: saved.id,
                      role: "assistant",
                      content: saved.content,
                      sources: saved.sources ?? undefined,
                    },
                  ],
                }
              : c
          )
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Save failed";
        setError(msg);
      }
    },
    []
  );

  /* ============================================
     Local-only updates (for live streaming display)
     ============================================ */
  const updateLocalMessage = useCallback(
    (conversationId: string, message: LocalMessage) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? { ...c, messages: [...c.messages, message] }
            : c
        )
      );
    },
    []
  );

  return {
    conversations,
    activeId,
    loading,
    error,
    refreshList,
    selectConversation,
    newConversation,
    deleteConversation,
    renameConversation,
    searchConversations,
    addUserMessage,
    addAssistantMessage,
    updateLocalMessage,
    setLocalActive: setActiveId,
  };
}
