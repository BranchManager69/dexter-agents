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

  const talkButton = (
    <button
      type="button"
      onMouseDown={onTalkStart}
      onMouseUp={onTalkEnd}
      onTouchStart={onTalkStart}
      onTouchEnd={onTalkEnd}
      disabled={!isPTTActive || !isLive}
      className={`flex h-9 items-center justify-center rounded-md border border-neutral-800/70 px-3 text-sm transition ${
        isPTTActive && isLive
          ? isPTTUserSpeaking
            ? "bg-flux/20 text-flux border-flux"
            : "bg-surface-base text-neutral-200 hover:border-flux/40"
          : "bg-neutral-900/60 text-neutral-600"
      } ${!isPTTActive || !isLive ? "cursor-not-allowed" : ""}`}
    >
      {isPTTActive && isLive
        ? isPTTUserSpeaking
          ? "Talking..."
          : "Hold to Talk"
        : "Hold to Talk"}
    </button>
  );

  const baseModeButtonClass =
    "flex-1 px-3 py-1 text-[10px] uppercase tracking-[0.24em] transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-flux";

  return (
    <div className="flex flex-col gap-2 rounded-md border border-neutral-800/60 bg-surface-glass/80 px-3 py-2 text-sm md:flex-row md:items-center md:gap-4">
      <div className="flex items-center gap-3">
        <div className={`h-2.5 w-2.5 rounded-full ${isLive ? "bg-flux shadow-glow-flux" : "bg-neutral-700"}`} />
        <div className="leading-tight">
          <div className="text-[10px] uppercase tracking-[0.3em] text-neutral-500">Voice Control</div>
          <div className="font-display text-xs text-neutral-200 md:text-sm">
            {statusCopy[sessionStatus] ?? "Disconnected"}
          </div>
        </div>
      </div>

      <div className="hidden flex-1 items-center justify-center md:flex">
        <div className={`voice-wave ${isLive ? "opacity-100" : "opacity-40"}`}>
          {[0, 1, 2, 3].map((index) => (
            <span key={index} className="voice-wave-bar" style={{ animationDelay: `${index * 0.1}s` }} />
          ))}
        </div>
      </div>

      <div className="flex flex-1 items-center gap-2 md:justify-end">
        <div className="flex h-9 items-center gap-px overflow-hidden rounded-md border border-neutral-800/70 bg-neutral-900/40">
          <button
            type="button"
            onClick={() => onTogglePTT(false)}
            disabled={!isLive}
            className={`${baseModeButtonClass} ${
              !isPTTActive && isLive
                ? "bg-flux/20 text-flux"
                : "bg-transparent text-neutral-400"
            } ${!isLive ? "opacity-50" : ""}`}
          >
            Auto
          </button>
          <button
            type="button"
            onClick={() => onTogglePTT(true)}
            disabled={!isLive}
            className={`${baseModeButtonClass} ${
              isPTTActive && isLive
                ? "bg-flux/20 text-flux"
                : "bg-transparent text-neutral-400"
            } ${!isLive ? "opacity-50" : ""}`}
          >
            Manual
          </button>
        </div>

        <div className="hidden md:block">{talkButton}</div>
      </div>

      <div className="md:hidden">{talkButton}</div>
    </div>
  );
}

export default VoiceDock;
