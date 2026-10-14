const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/* ============================================
   Device ID — unique per browser
   ============================================ */

function getDeviceId(): string {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem("agent-device-id");
  if (!id) {
    id =
      crypto.randomUUID?.() ??
      `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem("agent-device-id", id);
  }
  return id;
}

export function deviceHeaders(): HeadersInit {
  return { "X-Device-ID": getDeviceId() };
}

/* ============================================
   Base types
   ============================================ */

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/* ============================================
   Plain streaming chat
   ============================================ */

export async function* streamChat(
  messages: ChatMessage[],
  options: { model?: string; temperature?: number; signal?: AbortSignal } = {}
): AsyncGenerator<string, void, unknown> {
  const response = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...deviceHeaders() },
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

  if (!response.body) throw new Error("No response body");

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
          if (eventType === "token" && parsed.content) yield parsed.content;
          else if (eventType === "error")
            throw new Error(parsed.message ?? "Streaming error");
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

/* ============================================
   Health check
   ============================================ */

export async function checkBackendHealth(): Promise<{
  ok: boolean;
  model?: string;
  error?: string;
}> {
  try {
    const res = await fetch(`${API_URL}/api/health`, {
      headers: { ...deviceHeaders() },
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { ok: true, model: data.model };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/* ============================================
   Document Intelligence types
   ============================================ */

export interface Document {
  document_id: string;
  name: string;
  chunks: number;
}

export interface UploadResponse {
  status: string;
  document: {
    document_id: string;
    name: string;
    pages_parsed: number;
    chunks_added: number;
  };
}

export interface Source {
  document: string;
  page: number;
  score: number;
  preview: string;
}

/* ============================================
   Document API
   ============================================ */

export async function listDocuments(): Promise<Document[]> {
  const res = await fetch(`${API_URL}/api/documents`, {
    headers: { ...deviceHeaders() },
  });
  if (!res.ok) throw new Error(`Failed to list documents: HTTP ${res.status}`);
  const data = await res.json();
  return data.documents ?? [];
}

export async function uploadDocument(file: File): Promise<UploadResponse> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_URL}/api/documents/upload`, {
    method: "POST",
    headers: { ...deviceHeaders() },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload failed (HTTP ${res.status}): ${text}`);
  }
  return res.json();
}

export async function deleteDocument(documentId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/documents/${documentId}`, {
    method: "DELETE",
    headers: { ...deviceHeaders() },
  });
  if (!res.ok) throw new Error(`Delete failed: HTTP ${res.status}`);
}

/* ============================================
   RAG chat (with document context)
   ============================================ */

export interface StreamChatOptions {
  model?: string;
  temperature?: number;
  signal?: AbortSignal;
  useDocuments?: boolean;
  onSources?: (sources: Source[]) => void;
}

export async function* streamChatWithRag(
  messages: ChatMessage[],
  options: StreamChatOptions = {}
): AsyncGenerator<string, void, unknown> {
  const response = await fetch(`${API_URL}/api/chat/rag`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...deviceHeaders() },
    body: JSON.stringify({
      messages,
      model: options.model,
      temperature: options.temperature ?? 0.7,
      use_documents: options.useDocuments ?? false,
    }),
    signal: options.signal,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  if (!response.body) throw new Error("No response body");

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
          if (eventType === "token" && parsed.content) yield parsed.content;
          else if (eventType === "sources" && parsed.sources)
            options.onSources?.(parsed.sources);
          else if (eventType === "error")
            throw new Error(parsed.message ?? "Streaming error");
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

/* ============================================
   Conversations API (Phase 3 — Persistence)
   ============================================ */

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  sources?: Source[] | null;
  created_at: string;
}

export interface ConversationRecord {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: ConversationMessage[];
}

export interface ConversationSummary {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  preview?: string | null;
}

export async function listConversations(): Promise<ConversationSummary[]> {
  const res = await fetch(`${API_URL}/api/conversations`, {
    headers: { ...deviceHeaders() },
  });
  if (!res.ok) throw new Error(`Failed to list conversations: HTTP ${res.status}`);
  return res.json();
}

export async function createConversation(title?: string): Promise<ConversationRecord> {
  const res = await fetch(`${API_URL}/api/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...deviceHeaders() },
    body: JSON.stringify({ title: title ?? "New conversation" }),
  });
  if (!res.ok) throw new Error(`Failed to create conversation: HTTP ${res.status}`);
  return res.json();
}

export async function getConversation(id: string): Promise<ConversationRecord> {
  const res = await fetch(`${API_URL}/api/conversations/${id}`, {
    headers: { ...deviceHeaders() },
  });
  if (!res.ok) throw new Error(`Failed to load conversation: HTTP ${res.status}`);
  return res.json();
}

export async function renameConversation(id: string, title: string): Promise<ConversationRecord> {
  const res = await fetch(`${API_URL}/api/conversations/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...deviceHeaders() },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error(`Rename failed: HTTP ${res.status}`);
  return res.json();
}

export async function deleteConversation(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/conversations/${id}`, {
    method: "DELETE",
    headers: { ...deviceHeaders() },
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(`Delete failed: HTTP ${res.status}`);
  }
}

export async function addMessage(
  conversationId: string,
  role: "user" | "assistant" | "system",
  content: string,
  sources?: Source[] | null
): Promise<ConversationMessage> {
  const res = await fetch(`${API_URL}/api/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...deviceHeaders() },
    body: JSON.stringify({ role, content, sources: sources ?? null }),
  });
  if (!res.ok) throw new Error(`Failed to save message: HTTP ${res.status}`);
  return res.json();
}

export async function searchConversations(query: string): Promise<ConversationSummary[]> {
  const res = await fetch(
    `${API_URL}/api/conversations/search?q=${encodeURIComponent(query)}`,
    { headers: { ...deviceHeaders() } }
  );
  if (!res.ok) throw new Error(`Search failed: HTTP ${res.status}`);
  return res.json();
}

/* ============================================
   Memory API
   ============================================ */

export interface UserFact {
  id: string;
  key: string;
  value: string;
  confidence: number;
  updated_at: string | null;
}

export async function listFacts(): Promise<UserFact[]> {
  const res = await fetch(`${API_URL}/api/memory`, {
    headers: { ...deviceHeaders() },
  });
  if (!res.ok) throw new Error(`Failed to list facts: HTTP ${res.status}`);
  return res.json();
}

export async function deleteFact(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/memory/${id}`, {
    method: "DELETE",
    headers: { ...deviceHeaders() },
  });
  if (!res.ok && res.status !== 204) throw new Error(`Delete failed: HTTP ${res.status}`);
}

export async function clearAllFacts(): Promise<{ removed: number }> {
  const res = await fetch(`${API_URL}/api/memory`, {
    method: "DELETE",
    headers: { ...deviceHeaders() },
  });
  if (!res.ok) throw new Error(`Clear failed: HTTP ${res.status}`);
  return res.json();
}

/* ============================================
   Vision API — images
   ============================================ */

export interface VisionResponse {
  status: string;
  filename: string;
  question: string;
  response: string;
}

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif"];

function isImage(file: File): boolean {
  const name = file.name.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export async function analyzeImage(
  file: File,
  question?: string
): Promise<VisionResponse> {
  const form = new FormData();
  form.append("file", file);
  if (question) form.append("question", question);

  const res = await fetch(`${API_URL}/api/vision/analyze`, {
    method: "POST",
    headers: { ...deviceHeaders() },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Vision failed (HTTP ${res.status}): ${text}`);
  }

  return res.json();
}
