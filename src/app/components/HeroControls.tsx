"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { ClipboardCopyIcon, DownloadIcon, MixerHorizontalIcon } from "@radix-ui/react-icons";
import { SessionStatus } from "@/app/types";

export interface HeroControlsProps {
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
  renderAdminConsole?: () => React.ReactNode;
  adminConsoleMetadata?: {
    toolCount: number;
    lastUpdated: Date | null;
    source: "live" | "cache" | "none";
  };
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
  renderAdminConsole,
  adminConsoleMetadata,
}: HeroControlsProps) {
  const [justCopied, setJustCopied] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [isAdminConsoleOpen, setIsAdminConsoleOpen] = useState(false);
  const consoleButtonRef = useRef<HTMLButtonElement | null>(null);
  const consolePanelRef = useRef<HTMLDivElement | null>(null);
  const [consolePlacement, setConsolePlacement] = useState<
    | {
        top: number;
        right: number;
        width: number;
        maxHeight: number;
      }
    | null
  >(null);

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

  const updateConsolePlacement = useCallback(() => {
    if (!consoleButtonRef.current) return;

    const rect = consoleButtonRef.current.getBoundingClientRect();
    const horizontalMargin = 16;
    const verticalMargin = 16;
    const desiredTop = rect.bottom + 12;
    const panelMaxHeight = 520;
    const width = Math.min(420, window.innerWidth - horizontalMargin * 2);

    let top = desiredTop;
    if (top + panelMaxHeight + verticalMargin > window.innerHeight) {
      top = Math.max(verticalMargin, window.innerHeight - panelMaxHeight - verticalMargin);
    }

    const availableHeight = Math.max(window.innerHeight - top - verticalMargin, 280);
    const maxHeight = Math.min(panelMaxHeight, availableHeight);
    const right = Math.max(window.innerWidth - rect.right - horizontalMargin, horizontalMargin);

    setConsolePlacement({ top, right, width, maxHeight });
  }, []);

  useEffect(() => {
    if (!isAdminConsoleOpen) {
      return;
    }

    updateConsolePlacement();

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        consolePanelRef.current?.contains(target) ||
        consoleButtonRef.current?.contains(target)
      ) {
        return;
      }
      setIsAdminConsoleOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsAdminConsoleOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", updateConsolePlacement);
    window.addEventListener("scroll", updateConsolePlacement, true);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", updateConsolePlacement);
      window.removeEventListener("scroll", updateConsolePlacement, true);
    };
  }, [isAdminConsoleOpen, updateConsolePlacement]);

  useEffect(() => {
    if (!isAdminConsoleOpen) {
      setConsolePlacement(null);
    }
  }, [isAdminConsoleOpen]);

  const isConnected = sessionStatus === "CONNECTED";
  const adminButtonTone =
    "flex flex-shrink-0 items-center justify-center rounded border border-rose-500/60 bg-rose-500/10 p-1.5 text-rose-200 transition hover:border-rose-400/80 hover:text-rose-50";
  const consoleButtonToneBase = "flex items-center gap-2 rounded-pill border px-3 py-1.5 text-xs uppercase tracking-[0.24em] transition";
  const consoleButtonTone = isAdminConsoleOpen
    ? `${consoleButtonToneBase} border-flux/60 bg-flux/15 text-flux shadow-[0_10px_30px_rgba(0,255,209,0.22)]`
    : `${consoleButtonToneBase} border-neutral-800/60 bg-surface-glass/70 text-neutral-300 hover:border-flux/50 hover:text-flux`;

  const rootClassName = [
    "flex flex-wrap items-start gap-3",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const adminConsoleStatus = useMemo(() => {
    if (!adminConsoleMetadata) return null;
    if (adminConsoleMetadata.lastUpdated) {
      return `Updated ${adminConsoleMetadata.lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }
    if (adminConsoleMetadata.source === "cache") {
      return "Showing cached data";
    }
    if (adminConsoleMetadata.source === "live") {
      return "Live feed";
    }
    return null;
  }, [adminConsoleMetadata]);

  const adminConsole = isAdminConsoleOpen && renderAdminConsole
    ? renderAdminConsole()
    : null;

  const adminConsolePortal =
    typeof window !== "undefined" && isAdminConsoleOpen && adminConsole ? (
      createPortal(
        <div className="fixed inset-0 z-50 pointer-events-none">
          <div
            className="pointer-events-auto"
            style={{
              position: "fixed",
              top: consolePlacement?.top ?? 96,
              right: consolePlacement?.right ?? 24,
              width: consolePlacement?.width ?? Math.min(420, window.innerWidth - 32),
            }}
          >
            <div
              ref={consolePanelRef}
              className="rounded-2xl border border-neutral-800/70 bg-surface-raised/95 shadow-elevated backdrop-blur-xl"
              style={{
                maxHeight: consolePlacement?.maxHeight ?? 520,
              }}
            >
              <div className="flex items-center justify-between gap-3 border-b border-neutral-800/60 px-5 py-4">
                <div>
                  <div className="font-display text-sm uppercase tracking-[0.28em] text-neutral-300">
                    Admin Console
                  </div>
                  {adminConsoleStatus && (
                    <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                      {adminConsoleStatus}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setIsAdminConsoleOpen(false)}
                  className="rounded-md border border-neutral-800/60 px-2 py-1 text-[11px] uppercase tracking-[0.16em] text-neutral-300 transition hover:border-flux/50 hover:text-flux"
                >
                  Close
                </button>
              </div>
              <div
                className="max-h-[520px] overflow-y-auto px-5 pb-5 pt-4"
                style={{ maxHeight: consolePlacement?.maxHeight ?? 520 }}
              >
                {adminConsole}
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )
    ) : null;

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

          {renderAdminConsole && (
            <button
              type="button"
              ref={consoleButtonRef}
              onClick={() => {
                setIsAdminConsoleOpen((prev) => !prev);
              }}
              className={consoleButtonTone}
              title="Open admin console"
              aria-haspopup="dialog"
              aria-expanded={isAdminConsoleOpen}
            >
              <MixerHorizontalIcon className="h-3.5 w-3.5" />
              <span>Console</span>
              {typeof adminConsoleMetadata?.toolCount === "number" && (
                <span className="rounded-full border border-neutral-700/60 bg-neutral-900/70 px-2 py-0.5 text-[10px] tracking-[0.16em] text-neutral-400">
                  {adminConsoleMetadata.toolCount}
                </span>
              )}
            </button>
          )}
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

      {canUseAdminTools && (
        <button
          type="button"
          onClick={onOpenSignals}
          className="ml-auto inline-flex items-center gap-2 rounded-pill border border-neutral-800/60 bg-surface-glass/70 px-4 py-1 text-xs uppercase tracking-[0.28em] text-neutral-300 transition hover:border-flux/50 hover:text-flux lg:hidden"
        >
          <span className="h-2 w-2 rounded-full bg-flux shadow-glow-flux" />
          Signals
        </button>
      )}

      {adminConsolePortal}
    </div>
  );
}

export default HeroControls;
