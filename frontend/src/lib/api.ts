const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatError {
  message: string;
  status?: number;
}

/**
 * Stream chat completions from THE AGENT backend.
 * Yields text chunks as they arrive via Server-Sent Events.
 */
export async function* streamChat(
  messages: ChatMessage[],
  options: { model?: string; temperature?: number; signal?: AbortSignal } = {}
): AsyncGenerator<string, void, unknown> {
  const response = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages,
      model: options.model,
      temperature: options.temperature ?? 0.7,
    }),
    signal: options.signal,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  if (!response.body) {
    throw new Error("No response body — streaming not supported");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";

      for (const event of events) {
        const lines = event.split("\n");
        let eventType = "message";
        let data = "";

        for (const line of lines) {
          if (line.startsWith("event: ")) eventType = line.slice(7).trim();
          else if (line.startsWith("data: ")) data = line.slice(6).trim();
        }

        if (!data) continue;

        try {
          const parsed = JSON.parse(data);
          if (eventType === "token" && parsed.content) {
            yield parsed.content;
          } else if (eventType === "error") {
            throw new Error(parsed.message ?? "Streaming error");
          }
        } catch (err) {
          if (err instanceof SyntaxError) continue;
          throw err;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function checkBackendHealth(): Promise<{
  ok: boolean;
  model?: string;
  error?: string;
}> {
  try {
    const res = await fetch(`${API_URL}/api/health`);
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { ok: true, model: data.model };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}