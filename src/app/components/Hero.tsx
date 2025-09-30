"use client";

import React, { useState } from "react";
import { ClipboardCopyIcon, DownloadIcon } from "@radix-ui/react-icons";
import { SessionStatus } from "@/app/types";

interface HeroProps {
  sessionStatus: SessionStatus;
  onOpenSignals: () => void;
  onCopyTranscript: () => Promise<void>;
  onDownloadAudio: () => void;
  onSaveLog: () => void;
  isVoiceDockExpanded: boolean;
  onToggleVoiceDock: () => void;
}

export function Hero({
  sessionStatus,
  onOpenSignals,
  onCopyTranscript,
  onDownloadAudio,
  onSaveLog,
  isVoiceDockExpanded,
  onToggleVoiceDock,
}: HeroProps) {
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

  return (
    <div className="border-b border-neutral-800/60 px-7 py-7">
      <div className="font-display text-3xl tracking-tight text-neutral-100">
        You say, I do.
      </div>
      <p className="mt-2 max-w-2xl text-sm text-neutral-400">
        Dexter synchronises research, trade execution, wallet management, and Solana-specific feeds through a single multimodal agent. Speak or type—every insight rolls in with receipts.
      </p>
      <div className="mt-5 flex flex-wrap items-start gap-3">
        <button
          onClick={handleCopy}
          className="flex flex-shrink-0 items-center justify-center rounded border border-neutral-800/60 bg-surface-glass/60 p-1.5 text-neutral-300 transition hover:border-flux/50 hover:text-flux"
          title={justCopied ? "Copied!" : "Copy transcript"}
        >
          <ClipboardCopyIcon className="h-3.5 w-3.5" />
        </button>

        <button
          onClick={onDownloadAudio}
          className="flex flex-shrink-0 items-center justify-center rounded border border-neutral-800/60 bg-surface-glass/60 p-1.5 text-neutral-300 transition hover:border-iris/50 hover:text-iris"
          title="Download audio recording"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        </button>

        <button
          onClick={handleSave}
          className="flex flex-shrink-0 items-center justify-center rounded border border-neutral-800/60 bg-surface-glass/60 p-1.5 text-neutral-300 transition hover:border-amber-400/60 hover:text-amber-300"
          title={justSaved ? "Saved!" : "Save conversation log"}
        >
          <DownloadIcon className="h-3.5 w-3.5" />
        </button>

        {/* Voice Control Button - icon only, matches other buttons */}
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
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    </div>
  );
}

export default Hero;
