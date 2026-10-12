"use client";

import { useCallback, useRef, useState } from "react";
import { streamChat, type ChatMessage } from "@/lib/api";

export interface UseChatStreamReturn {
  isStreaming: boolean;
  streamingContent: string;
  error: string | null;
  startStream: (messages: ChatMessage[]) => Promise<void>;
  stopStream: () => void;
}

export function useChatStream(): UseChatStreamReturn {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stopStream = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const startStream = useCallback(
    async (messages: ChatMessage[]) => {
      stopStream();
      setError(null);
      setStreamingContent("");
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        let accumulated = "";
        for await (const chunk of streamChat(messages, { signal: controller.signal })) {
          accumulated += chunk;
          setStreamingContent(accumulated);
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          // user stopped; not an error
        } else {
          const msg = err instanceof Error ? err.message : "Unknown error";
          setError(msg);
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [stopStream]
  );

  return { isStreaming, streamingContent, error, startStream, stopStream };
}