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

export function VoiceDock({
  sessionStatus,
  isPTTActive,
  isPTTUserSpeaking,
  onTogglePTT,
  onTalkStart,
  onTalkEnd,
}: VoiceDockProps) {
  const isLive = sessionStatus === "CONNECTED";

  let indicatorTone = "bg-neutral-700";
  let indicatorLabel = "Microphone idle";

  if (!isLive) {
    indicatorTone = "bg-accent-critical shadow-[0_0_10px_rgba(255,82,82,0.35)]";
    indicatorLabel = "Microphone offline";
  } else if (!isPTTActive) {
    indicatorTone = "bg-flux shadow-glow-flux";
    indicatorLabel = "Microphone live (auto mode)";
  } else if (isPTTUserSpeaking) {
    indicatorTone = "bg-flux shadow-glow-flux";
    indicatorLabel = "Microphone live";
  } else {
    indicatorTone = "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.35)]";
    indicatorLabel = "Microphone muted (manual mode)";
  }

  const talkButton = (
    <button
      type="button"
      onMouseDown={onTalkStart}
      onMouseUp={onTalkEnd}
      onTouchStart={onTalkStart}
      onTouchEnd={onTalkEnd}
      disabled={!isPTTActive || !isLive}
      className={`inline-flex h-6 items-center justify-center rounded-sm border border-neutral-800/60 px-2 text-[10px] font-medium transition ${
        isPTTActive && isLive
          ? isPTTUserSpeaking
            ? "bg-flux/20 text-flux border-flux"
            : "bg-surface-base text-neutral-100 hover:border-flux/40"
          : "bg-neutral-900/40 text-neutral-500"
      } ${!isPTTActive || !isLive ? "cursor-not-allowed" : ""}`}
    >
      {isPTTActive && isLive
        ? isPTTUserSpeaking
          ? "Talking"
          : "Talk"
        : "Talk"}
    </button>
  );

  return (
    <div className="flex h-8 w-full items-center gap-3 px-1 text-[11px] sm:text-xs">
      <div className="flex items-center gap-1.5 whitespace-nowrap text-neutral-300">
        <span
          className={`inline-flex h-2 w-2 rounded-full transition-all duration-200 ${indicatorTone}`}
          role="img"
          aria-label={indicatorLabel}
        />
        <span className="sr-only">{indicatorLabel}</span>
        <span className="uppercase tracking-[0.32em] text-[9px] text-neutral-500">
          Voice
        </span>
        <div className="ml-1 flex items-center gap-1.5 text-[9px] uppercase tracking-[0.24em] text-neutral-400">
          <button
            type="button"
            onClick={() => onTogglePTT(false)}
            disabled={!isLive}
            className={`${
              !isPTTActive && isLive ? "text-flux" : "text-neutral-500"
            } ${!isLive ? "opacity-40" : ""}`}
          >
            Auto
          </button>
          <span className="text-neutral-700">/</span>
          <button
            type="button"
            onClick={() => onTogglePTT(true)}
            disabled={!isLive}
            className={`${
              isPTTActive && isLive ? "text-flux" : "text-neutral-500"
            } ${!isLive ? "opacity-40" : ""}`}
          >
            Manual
          </button>
        </div>
      </div>

      <div className="hidden flex-1 items-center justify-center lg:flex">
        <div className={`voice-wave ${isLive ? "opacity-100" : "opacity-40"}`}>
          {[0, 1, 2, 3].map((index) => (
            <span key={index} className="voice-wave-bar" style={{ animationDelay: `${index * 0.1}s` }} />
          ))}
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2 text-[9px] uppercase tracking-[0.24em] text-neutral-400">
        {isPTTActive ? talkButton : null}
      </div>
    </div>
  );
}

export default VoiceDock;
