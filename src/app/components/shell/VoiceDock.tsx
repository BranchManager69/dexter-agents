import React from "react";
import { SessionStatus } from "@/app/types";

interface VoiceDockProps {
  sessionStatus: SessionStatus;
  isPTTActive: boolean;
  isPTTUserSpeaking: boolean;
  onTogglePTT: (value: boolean) => void;
  onTalkStart: () => void;
  onTalkEnd: () => void;
}

const statusCopy: Record<SessionStatus, string> = {
  CONNECTING: "Linking audio", 
  CONNECTED: "Live link active",
  DISCONNECTED: "Voice idle",
  ERROR: "Error",
};

export function VoiceDock({
  sessionStatus,
  isPTTActive,
  isPTTUserSpeaking,
  onTogglePTT,
  onTalkStart,
  onTalkEnd,
}: VoiceDockProps) {
  const isLive = sessionStatus === "CONNECTED";

  return (
    <div className="rounded-lg border border-neutral-800/60 bg-surface-raised/90 p-4 shadow-elevated backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-neutral-500">
            Voice Link
          </div>
          <div className="font-display text-sm text-neutral-200">
            {statusCopy[sessionStatus] ?? "Idle"}
          </div>
        </div>
        <div className={`h-2 w-2 rounded-full ${isLive ? "bg-flux shadow-glow-flux" : "bg-neutral-700"}`} />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className={`voice-wave ${isLive ? "opacity-100" : "opacity-40"}`}>
          {[0, 1, 2, 3].map((index) => (
            <span key={index} className="voice-wave-bar" style={{ animationDelay: `${index * 0.1}s` }} />
          ))}
        </div>
        <div className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
          {isLive ? (isPTTActive ? "Ready" : "Passive") : "Offline"}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => onTogglePTT(!isPTTActive)}
          className={`rounded-pill px-3 py-1 text-xs uppercase tracking-[0.2em] transition ${
            isPTTActive
              ? "bg-flux/20 text-flux"
              : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
          }`}
        >
          Push-To-Talk
        </button>
        <button
          type="button"
          onMouseDown={onTalkStart}
          onMouseUp={onTalkEnd}
          onTouchStart={onTalkStart}
          onTouchEnd={onTalkEnd}
          disabled={!isPTTActive}
          className={`flex-1 rounded-md border border-neutral-800/70 px-4 py-2 text-sm transition ${
            isPTTActive
              ? isPTTUserSpeaking
                ? "bg-flux/20 text-flux"
                : "bg-surface-base text-neutral-200 hover:border-flux/40"
              : "bg-neutral-900/60 text-neutral-600"
          }`}
        >
          {isPTTActive ? (isPTTUserSpeaking ? "Listening" : "Hold to talk") : "Enable PTT"}
        </button>
      </div>
    </div>
  );
}

export default VoiceDock;
