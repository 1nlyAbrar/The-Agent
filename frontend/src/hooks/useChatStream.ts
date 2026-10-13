"use client";

import { useCallback, useRef, useState } from "react";
import {
  streamChatWithRag,
  type ChatMessage,
  type Source,
} from "@/lib/api";

export interface StreamOptions {
  useDocuments?: boolean;
  onSources?: (sources: Source[]) => void;
}

export interface UseChatStreamReturn {
  isStreaming: boolean;
  streamingContent: string;
  error: string | null;
  startStream: (
    messages: ChatMessage[],
    onComplete?: (finalContent: string) => void,
    options?: StreamOptions
  ) => Promise<void>;
  stopStream: () => void;
  reset: () => void;
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

  const reset = useCallback(() => {
    stopStream();
    setStreamingContent("");
    setError(null);
  }, [stopStream]);

  const startStream = useCallback(
    async (
      messages: ChatMessage[],
      onComplete?: (finalContent: string) => void,
      options?: StreamOptions
    ) => {
      stopStream();
      setError(null);
      setStreamingContent("");
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      let accumulated = "";

      try {
        for await (const chunk of streamChatWithRag(messages, {
          signal: controller.signal,
          useDocuments: options?.useDocuments,
          onSources: options?.onSources,
        })) {
          accumulated += chunk;
          setStreamingContent(accumulated);
        }

        if (onComplete && accumulated.trim()) {
          onComplete(accumulated);
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          // user stopped
        } else {
          const msg = err instanceof Error ? err.message : "Unknown error";
          setError(msg);
        }
      } finally {
        setIsStreaming(false);
        setStreamingContent("");
        abortRef.current = null;
      }
    },
    [stopStream]
  );

  return { isStreaming, streamingContent, error, startStream, stopStream, reset };
}