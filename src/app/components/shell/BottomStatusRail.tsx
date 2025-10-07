import React from "react";

interface BottomStatusRailProps {
  onOpenDebugModal: () => void;
  onOpenSignals: () => void;
  voiceControl: {
    isLive: boolean;
    isMuted: boolean;
    onToggleMuted: () => void;
  } | null;
}

export function BottomStatusRail({
  onOpenDebugModal,
  onOpenSignals,
  voiceControl,
}: BottomStatusRailProps) {
  return (
    <div className="flex items-center justify-between gap-6 px-9 py-3 text-sm text-neutral-200">
      {/* Left: Branch.bet link with icon */}
      <a
        href="https://branch.bet"
        className="flex items-center gap-2 text-xs text-neutral-500 transition hover:text-flux"
      >
        <svg width="16" height="16" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="branchStroke" x1="18" y1="10" x2="50" y2="54" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="rgb(var(--color-primary-bright))" />
              <stop offset="1" stopColor="rgb(var(--color-primary))" />
            </linearGradient>
            <linearGradient id="branchFill" x1="16" y1="16" x2="46" y2="48" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="rgb(var(--color-primary-muted))" stopOpacity="0.85" />
              <stop offset="1" stopColor="rgb(var(--color-foreground))" stopOpacity="0.65" />
            </linearGradient>
          </defs>
          <path d="M20 12h12c10 0 16 5 16 13 0 5.6-3.2 9.7-8.6 11.5C43.4 38 48 42.6 48 49c0 7.8-6.2 13-15.8 13H20" stroke="url(#branchStroke)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M20 12h10c8.4 0 13 3.7 13 10.5 0 5.3-3 8.8-7.8 10.2" fill="none" stroke="url(#branchFill)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span>branch.bet</span>
      </a>

      {/* Center: Voice controls & signals */}
      <div className="flex flex-1 items-center justify-center gap-4">
        {voiceControl ? (
          <button
            type="button"
            onClick={voiceControl.onToggleMuted}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-display text-[11px] tracking-[0.08em] transition whitespace-nowrap sm:text-[12px] ${
              voiceControl.isMuted
                ? 'border-rose-400/40 bg-rose-500/10 text-rose-100'
                : 'border-flux/40 bg-flux/10 text-flux'
            } ${!voiceControl.isLive ? 'cursor-not-allowed opacity-50' : ''}`}
            disabled={!voiceControl.isLive}
            title={voiceControl.isLive
              ? voiceControl.isMuted
                ? 'Unmute Dexter'
                : 'Mute Dexter'
              : 'Voice control available once connected'}
            aria-pressed={voiceControl.isMuted}
          >
            <span>{voiceControl.isMuted ? 'Muted' : 'Auto Voice'}</span>
          </button>
        ) : null}

        <button
          type="button"
          onClick={onOpenSignals}
          className="inline-flex items-center gap-2 rounded-full border border-neutral-800/60 bg-neutral-900/40 px-3 py-1 font-display text-[11px] tracking-[0.08em] text-neutral-300 transition hover:border-flux/40 hover:text-flux"
          title="Open signals"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="6" x2="6" y1="4" y2="20" />
            <line x1="12" x2="12" y1="9" y2="20" />
            <line x1="18" x2="18" y1="14" y2="20" />
          </svg>
          Signals
        </button>
      </div>

      {/* Right: Debug info icon */}
      <button
        onClick={onOpenDebugModal}
        className="flex items-center justify-center text-neutral-500 transition hover:text-flux"
        title="Debug Info"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
      </button>
    </div>
  );
}

export default BottomStatusRail;
