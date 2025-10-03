"use client";

import React, { useState } from "react";
import { ClipboardCopyIcon, DownloadIcon } from "@radix-ui/react-icons";
import { SessionStatus } from "@/app/types";

interface HeroControlsProps {
  sessionStatus: SessionStatus;
  onOpenSignals: () => void;
  onCopyTranscript: () => Promise<void>;
  onDownloadAudio: () => void;
  onSaveLog: () => void;
  isVoiceDockExpanded: boolean;
  onToggleVoiceDock: () => void;
  canUseAdminTools: boolean;
  showSuperAdminTools: boolean;
  onOpenSuperAdmin?: () => void;
  className?: string;
}

export function HeroControls({
  sessionStatus,
  onOpenSignals,
  onCopyTranscript,
  onDownloadAudio,
  onSaveLog,
  isVoiceDockExpanded,
  onToggleVoiceDock,
  canUseAdminTools,
  showSuperAdminTools,
  onOpenSuperAdmin,
  className,
}: HeroControlsProps) {
  const [justCopied, setJustCopied] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const handleCopy = async () => {
    await onCopyTranscript();
    setJustCopied(true);
    setTimeout(() => setJustCopied(false), 1500);
  };

  const handleSave = () => {
    onSaveLog();
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1500);
  };

  const isConnected = sessionStatus === "CONNECTED";
  const adminButtonTone =
    "flex flex-shrink-0 items-center justify-center rounded border border-rose-500/60 bg-rose-500/10 p-1.5 text-rose-200 transition hover:border-rose-400/80 hover:text-rose-50";

  const rootClassName = [
    "flex flex-wrap items-start gap-3",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClassName}>
      {canUseAdminTools && (
        <>
          <button
            onClick={handleCopy}
            className={`${adminButtonTone} ${justCopied ? "ring-2 ring-rose-500/30" : ""}`}
            title={justCopied ? "Copied!" : "Copy transcript"}
          >
            <ClipboardCopyIcon className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={onDownloadAudio}
            className={adminButtonTone}
            title="Download audio recording"
          >
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </button>

          <button
            onClick={handleSave}
            className={`${adminButtonTone} ${justSaved ? "ring-2 ring-rose-500/30" : ""}`}
            title={justSaved ? "Saved!" : "Save conversation log"}
          >
            <DownloadIcon className="h-3.5 w-3.5" />
          </button>
        </>
      )}

      {showSuperAdminTools && (
        <button
          type="button"
          onClick={onOpenSuperAdmin}
          className="flex flex-shrink-0 items-center justify-center rounded border border-amber-400/70 bg-amber-400/10 p-1.5 text-amber-100 shadow-[0_0_12px_rgba(255,200,92,0.25)] transition hover:border-amber-300 hover:text-amber-50"
          title="Open superadmin panel"
        >
          <svg
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 7l2 11h10l2-11" />
            <path d="M8 7l4-4 4 4" />
            <path d="M9 13h6" />
            <path d="M10 16h4" />
          </svg>
        </button>
      )}

      <button
        type="button"
        onClick={onToggleVoiceDock}
        disabled={!isConnected}
        className={`flex flex-shrink-0 items-center justify-center rounded border p-1.5 transition ${
          isConnected && isVoiceDockExpanded
            ? "border-flux/50 bg-flux/20 text-flux"
            : isConnected
            ? "border-neutral-800/60 bg-surface-glass/60 text-neutral-300 hover:border-flux/50 hover:text-flux"
            : "border-neutral-800/60 bg-surface-glass/60 text-neutral-600 opacity-50"
        }`}
        title={isVoiceDockExpanded ? "Hide voice control" : "Show voice control"}
      >
        <svg
          className="h-3.5 w-3.5"
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

      <button
        type="button"
        onClick={onOpenSignals}
        className="ml-auto inline-flex items-center gap-2 rounded-pill border border-neutral-800/60 bg-surface-glass/70 px-4 py-1 text-xs uppercase tracking-[0.28em] text-neutral-300 transition hover:border-flux/50 hover:text-flux lg:hidden"
      >
        <span className="h-2 w-2 rounded-full bg-flux shadow-glow-flux" />
        Signals
      </button>
    </div>
  );
}

export default HeroControls;
