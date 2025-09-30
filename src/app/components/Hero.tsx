"use client";

import React from "react";
import { SessionStatus } from "@/app/types";

interface HeroProps {
  sessionStatus: SessionStatus;
  hasActivatedSession: boolean;
  onStartConversation: () => void;
  onOpenSignals: () => void;
}

export function Hero({
  sessionStatus,
  hasActivatedSession,
  onStartConversation,
  onOpenSignals,
}: HeroProps) {
  return (
    <div className="border-b border-neutral-800/60 px-7 py-7">
      <div className="font-display text-3xl tracking-tight text-neutral-100">
        You say, I do.
      </div>
      <p className="mt-2 max-w-2xl text-sm text-neutral-400">
        Dexter synchronises research, trade execution, wallet management, and Solana-specific feeds through a single multimodal agent. Speak or type—every insight rolls in with receipts.
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {["Manage wallets and swap tokens", "Monitor pump.fun live streams", "Formulate and deploy agentic trading strategies"].map((chip) => (
          <span
            key={chip}
            className="rounded-pill border border-neutral-800/60 bg-surface-glass/60 px-4 py-1 text-xs uppercase tracking-[0.28em] text-neutral-400"
          >
            {chip}
          </span>
        ))}

        {sessionStatus === "CONNECTED" && !hasActivatedSession && (
          <button
            type="button"
            onClick={onStartConversation}
            className="rounded-pill border border-flux/50 bg-flux/20 px-4 py-1 text-xs uppercase tracking-[0.28em] text-flux transition hover:bg-flux/30"
          >
            Start Conversation
          </button>
        )}

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
