"use client";

import React from "react";
import { MixerHorizontalIcon } from "@radix-ui/react-icons";

import type { SessionStatus } from "@/app/types";

interface FloatingSessionControlsProps {
  sessionStatus: SessionStatus;
  isVoiceDockExpanded: boolean;
  onToggleVoiceDock: () => void;
  onOpenSignals: () => void;
  canUseAdminTools: boolean;
}

const buttonBase =
  'pointer-events-auto flex h-9 w-9 items-center justify-center rounded-md border border-neutral-800/80 bg-surface-glass/80 text-neutral-200 transition hover:border-flux/60 hover:text-flux shadow-sm backdrop-blur';

const voiceButtonClass = (
  isConnected: boolean,
  isVoiceDockExpanded: boolean,
) =>
  `${buttonBase} ${
    isConnected && isVoiceDockExpanded
      ? 'border-flux/60 bg-flux/10 text-flux'
      : isConnected
      ? 'hover:border-flux/80 hover:text-flux'
      : 'opacity-40 pointer-events-none'
  }`;

const signalsButtonClass = buttonBase;

export default function FloatingSessionControls({
  sessionStatus,
  isVoiceDockExpanded,
  onToggleVoiceDock,
  onOpenSignals,
  canUseAdminTools,
}: FloatingSessionControlsProps) {
  const isConnected = sessionStatus === 'CONNECTED';

  if (!isConnected) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed bottom-5 left-4 z-40 sm:left-6 md:left-8">
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onToggleVoiceDock}
          disabled={!isConnected}
          className={`${voiceButtonClass(isConnected, isVoiceDockExpanded)} pointer-events-auto`}
          title={isVoiceDockExpanded ? 'Hide voice control' : 'Show voice control'}
        >
          <svg
            className="h-4.5 w-4.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" x2="12" y1="19" y2="22" />
          </svg>
        </button>

        {!canUseAdminTools && (
          <button
            type="button"
            onClick={onOpenSignals}
            className={`${signalsButtonClass} pointer-events-auto`}
            aria-label="Open signals"
            title="Open signals"
          >
            <MixerHorizontalIcon className="h-4.5 w-4.5" />
          </button>
        )}
      </div>
    </div>
  );
}
