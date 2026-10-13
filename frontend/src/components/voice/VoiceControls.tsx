"use client";

import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";

interface VoiceControlsProps {
  isListening: boolean;
  isSpeaking: boolean;
  isSupportedSTT: boolean;
  isSupportedTTS: boolean;
  onToggleListening: () => void;
  onStopSpeaking: () => void;
  error?: string | null;
}

export function VoiceControls({
  isListening,
  isSpeaking,
  isSupportedSTT,
  isSupportedTTS,
  onToggleListening,
  onStopSpeaking,
  error,
}: VoiceControlsProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-4">
        {/* Mic button */}
        <button
          type="button"
          onClick={onToggleListening}
          disabled={!isSupportedSTT}
          className={`flex h-16 w-16 items-center justify-center rounded-full border-2 transition-all ${
            isListening
              ? "border-[#00FFC6] bg-[#00FFC6]/20 text-[#00FFC6] shadow-[0_0_40px_rgba(0,255,198,0.6)]"
              : "border-cyan-400/40 bg-cyan-400/10 text-cyan-400 hover:border-cyan-400 hover:bg-cyan-400/20"
          } disabled:cursor-not-allowed disabled:opacity-40`}
          title={
            !isSupportedSTT
              ? "Speech recognition not supported in this browser"
              : isListening
              ? "Stop listening"
              : "Start voice input"
          }
        >
          {isListening ? <MicOff size={24} /> : <Mic size={24} />}
        </button>

        {/* Stop speaking button */}
        <button
          type="button"
          onClick={onStopSpeaking}
          disabled={!isSupportedTTS || !isSpeaking}
          className={`flex h-16 w-16 items-center justify-center rounded-full border-2 transition-all ${
            isSpeaking
              ? "border-cyan-400 bg-cyan-400/20 text-cyan-400 shadow-[0_0_40px_rgba(0,223,255,0.6)]"
              : "border-white/10 bg-white/5 text-slate-500"
          } disabled:cursor-not-allowed disabled:opacity-40`}
          title={
            !isSupportedTTS
              ? "Text-to-speech not supported"
              : isSpeaking
              ? "Stop speaking"
              : "Not speaking"
          }
        >
          {isSpeaking ? <Volume2 size={24} /> : <VolumeX size={24} />}
        </button>
      </div>

      {/* Status text */}
      <div className="text-center">
        {error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : isListening ? (
          <p className="text-sm text-[#00FFC6]">Listening... speak now</p>
        ) : isSpeaking ? (
          <p className="text-sm text-cyan-400">Speaking...</p>
        ) : (
          <p className="text-sm text-slate-500">
            {isSupportedSTT ? "Tap the mic to speak" : "Voice not supported in this browser"}
          </p>
        )}
      </div>
    </div>
  );
}