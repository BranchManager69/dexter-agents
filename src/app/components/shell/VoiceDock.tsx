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
  CONNECTING: "Connecting...",
  CONNECTED: "Connected",
  DISCONNECTED: "Disconnected",
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-neutral-500">
            Voice Control
          </div>
          <div className="font-display text-sm text-neutral-200">
            {statusCopy[sessionStatus] ?? "Disconnected"}
          </div>
        </div>
        <div className={`h-2 w-2 rounded-full ${isLive ? "bg-flux shadow-glow-flux" : "bg-neutral-700"}`} />
      </div>

      {/* Voice wave - hidden on mobile */}
      <div className="mt-3 hidden items-center justify-between md:flex">
        <div className={`voice-wave ${isLive ? "opacity-100" : "opacity-40"}`}>
          {[0, 1, 2, 3].map((index) => (
            <span key={index} className="voice-wave-bar" style={{ animationDelay: `${index * 0.1}s` }} />
          ))}
        </div>
      </div>

      {/* Desktop: Side-by-side buttons */}
      <div className="mt-4 hidden items-center gap-3 md:flex">
        <button
          type="button"
          onClick={() => onTogglePTT(false)}
          disabled={!isLive}
          className={`rounded-pill px-4 py-2 text-xs uppercase tracking-[0.2em] transition ${
            !isPTTActive && isLive
              ? "bg-flux/20 text-flux"
              : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
          } ${!isLive ? "opacity-50" : ""}`}
        >
          Auto Listen
        </button>
        <button
          type="button"
          onMouseDown={onTalkStart}
          onMouseUp={onTalkEnd}
          disabled={!isPTTActive || !isLive}
          className={`flex-1 rounded-md border border-neutral-800/70 px-4 py-2 text-sm transition ${
            isPTTActive && isLive
              ? isPTTUserSpeaking
                ? "bg-flux/20 text-flux border-flux"
                : "bg-surface-base text-neutral-200 hover:border-flux/40"
              : "bg-neutral-900/60 text-neutral-600"
          }`}
        >
          {isPTTActive && isLive ? (isPTTUserSpeaking ? "Talking..." : "Hold to Talk") : "Hold to Talk"}
        </button>
      </div>

      {/* Mobile: Mode selector + big button */}
      <div className="mt-4 flex flex-col gap-3 md:hidden">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onTogglePTT(false)}
            disabled={!isLive}
            className={`flex-1 rounded-md px-3 py-2 text-xs uppercase tracking-wider transition ${
              !isPTTActive && isLive
                ? "bg-flux/20 text-flux"
                : "bg-neutral-800 text-neutral-400"
            } ${!isLive ? "opacity-50" : ""}`}
          >
            Auto
          </button>
          <button
            type="button"
            onClick={() => onTogglePTT(true)}
            disabled={!isLive}
            className={`flex-1 rounded-md px-3 py-2 text-xs uppercase tracking-wider transition ${
              isPTTActive && isLive
                ? "bg-flux/20 text-flux"
                : "bg-neutral-800 text-neutral-400"
            } ${!isLive ? "opacity-50" : ""}`}
          >
            Manual
          </button>
        </div>
        <button
          type="button"
          onTouchStart={onTalkStart}
          onTouchEnd={onTalkEnd}
          disabled={!isPTTActive || !isLive}
          className={`select-none rounded-md border border-neutral-800/70 px-4 py-4 text-base font-medium transition ${
            isPTTActive && isLive
              ? isPTTUserSpeaking
                ? "bg-flux/20 text-flux border-flux"
                : "bg-surface-base text-neutral-200 hover:border-flux/40"
              : "bg-neutral-900/60 text-neutral-600"
          }`}
        >
          {isPTTActive && isLive ? (isPTTUserSpeaking ? "● Talking..." : "Hold to Speak") : "Hold to Speak"}
        </button>
      </div>
    </div>
  );
}

export default VoiceDock;
