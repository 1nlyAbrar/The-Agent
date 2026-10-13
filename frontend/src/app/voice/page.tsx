"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";
import { VoiceOrb } from "@/components/voice/VoiceOrb";
import { VoiceControls } from "@/components/voice/VoiceControls";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { streamChatWithRag } from "@/lib/api";

type VoiceState = "idle" | "listening" | "thinking" | "speaking";

export default function VoicePage() {
  const router = useRouter();
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [language, setLanguage] = useState<"en-US" | "bn-BD">("en-US");

  const speech = useSpeechRecognition((finalText) => {
    setTranscript(finalText);
  });

  const tts = useSpeechSynthesis(language);

  const handleVoiceQuery = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      setVoiceState("thinking");
      setResponse("");

      try {
        let accumulated = "";
        const messages = [{ role: "user" as const, content: text }];

        for await (const chunk of streamChatWithRag(messages, {
          useDocuments: false,
        })) {
          accumulated += chunk;
          setResponse(accumulated);
        }

        setVoiceState("speaking");
        tts.speak(accumulated);

        // Wait for TTS to finish, then return to idle
        const checkInterval = setInterval(() => {
          if (!window.speechSynthesis.speaking) {
            clearInterval(checkInterval);
            setVoiceState("idle");
          }
        }, 500);
      } catch (err) {
        toast.error("Voice query failed", {
          description: err instanceof Error ? err.message : "Unknown error",
        });
        setVoiceState("idle");
      }
    },
    [tts]
  );

  const toggleListening = useCallback(() => {
    if (speech.isListening) {
      speech.stop();
      setVoiceState("idle");
      return;
    }
    if (tts.isSpeaking) tts.stop();

    setTranscript("");
    setResponse("");
    setVoiceState("listening");
    speech.start(language);
  }, [speech, tts, language]);

  const stopSpeaking = useCallback(() => {
    tts.stop();
    setVoiceState("idle");
  }, [tts]);

  const submitTranscript = useCallback(() => {
    if (!transcript.trim()) return;
    speech.stop();
    handleVoiceQuery(transcript);
  }, [transcript, speech, handleVoiceQuery]);

  const orbState: VoiceState = speech.isListening
    ? "listening"
    : tts.isSpeaking
    ? "speaking"
    : voiceState;

  return (
    <div className="flex h-dvh flex-col bg-[#05080d] text-slate-100">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-white/10 bg-[#05080d]/60 px-6 py-4 backdrop-blur-md">
        <button
          onClick={() => router.push("/chat")}
          className="flex items-center gap-2 text-slate-400 hover:text-cyan-400"
        >
          <ArrowLeft size={18} />
          Back to Chat
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Language:</span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as "en-US" | "bn-BD")}
            className="rounded-lg border border-cyan-400/20 bg-[#0a1423] px-3 py-1 text-xs text-cyan-400 outline-none"
          >
            <option value="en-US">English (US)</option>
            <option value="bn-BD">বাংলা (Bangla)</option>
          </select>
        </div>
      </header>

      {/* Main content */}
      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6">
        <VoiceOrb size={320} state={orbState} />

        <div className="w-full max-w-2xl space-y-3">
          <VoiceControls
            isListening={speech.isListening}
            isSpeaking={tts.isSpeaking}
            isSupportedSTT={speech.isSupported}
            isSupportedTTS={tts.isSupported}
            onToggleListening={toggleListening}
            onStopSpeaking={stopSpeaking}
            error={speech.error}
          />
        </div>

        {/* Live transcript */}
        {(speech.transcript || speech.interimTranscript) && (
          <div className="w-full max-w-2xl rounded-xl border border-[#00FFC6]/30 bg-[#00FFC6]/5 p-4">
            <p className="mb-1 text-xs uppercase tracking-widest text-[#00FFC6]/70">
              You said
            </p>
            <p className="text-sm text-slate-100">
              {speech.transcript}
              {speech.interimTranscript && (
                <span className="text-slate-500"> {speech.interimTranscript}</span>
              )}
            </p>

            {speech.transcript && !speech.isListening && (
              <button
                onClick={submitTranscript}
                className="mt-3 flex items-center gap-2 rounded-lg bg-[#00FFC6] px-4 py-2 text-sm font-medium text-slate-900 hover:bg-[#00FFC6]/80"
              >
                <Send size={14} />
                Send to Agent
              </button>
            )}
          </div>
        )}

        {/* AI response */}
        {response && (
          <div className="w-full max-w-2xl rounded-xl border border-cyan-400/30 bg-cyan-400/5 p-4">
            <p className="mb-1 text-xs uppercase tracking-widest text-cyan-400/70">
              Agent Response
            </p>
            <p className="text-sm text-slate-100">{response}</p>
          </div>
        )}
      </main>
    </div>
  );
}