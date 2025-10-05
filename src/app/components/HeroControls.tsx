"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { ClipboardCopyIcon, DownloadIcon, MixerHorizontalIcon, ReaderIcon, ChevronDownIcon } from "@radix-ui/react-icons";
import { SessionStatus } from "@/app/types";
import type { DexterUserBadge } from "@/app/types";
import { MEMORY_LIMITS } from "@/app/config/memory";
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
  userBadge?: DexterUserBadge | null;
}

type MemoryEntry = {
  id: string;
  summary: string;
  facts: string[];
  followUps: string[];
  createdAt: string | null;
  sessionId: string | null;
  startedAt: string | null;
  endedAt: string | null;
  status: 'summarized' | 'skipped';
};

const ADMIN_MEMORIES_LIMIT = MEMORY_LIMITS.adminPanel.recentCount ?? 50;

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

  const [isMemoriesOpen, setIsMemoriesOpen] = useState(false);
  const memoriesButtonRef = useRef<HTMLButtonElement | null>(null);
  const memoriesPanelRef = useRef<HTMLDivElement | null>(null);
const [memoriesPlacement, setMemoriesPlacement] = useState<
  | {
      top: number;
      width: number;
      maxHeight: number;
      right?: number;
      left?: number;
    }
  | null
>(null);
  const [isLoadingMemories, setIsLoadingMemories] = useState(false);
  const [memoriesError, setMemoriesError] = useState<string | null>(null);
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [totalMemories, setTotalMemories] = useState<number | null>(null);
  const [totalSkipped, setTotalSkipped] = useState<number | null>(null);
  const [expandedMemoryId, setExpandedMemoryId] = useState<string | null>(null);

  const badgeCount = totalMemories ?? memories.filter((entry) => entry.status === 'summarized').length;
  const badgeLabel = badgeCount > ADMIN_MEMORIES_LIMIT ? `${ADMIN_MEMORIES_LIMIT}+` : `${badgeCount}`;
  const savedCountDisplay = badgeCount;
  const skippedCountDisplay = totalSkipped ?? memories.filter((entry) => entry.status === 'skipped').length;
  const savedDisplayed = memories.filter((entry) => entry.status === 'summarized').length;
  const skippedDisplayed = memories.filter((entry) => entry.status === 'skipped').length;

  const headerText = useMemo(() => {
    if (isLoadingMemories) return 'Loading…';
    if (memoriesError) return 'Failed to load';
    if (savedCountDisplay === 0 && skippedCountDisplay === 0) return 'No memories yet';

    const parts: string[] = [];
    if (savedCountDisplay > 0) {
      const segment = totalMemories && totalMemories > savedDisplayed
        ? `${savedDisplayed} of ${savedCountDisplay} saved`
        : `${savedCountDisplay} saved`;
      parts.push(segment);
    }
    if (skippedCountDisplay > 0) {
      const segment = totalSkipped && totalSkipped > skippedDisplayed
        ? `${skippedDisplayed} of ${skippedCountDisplay} skipped`
        : `${skippedCountDisplay} skipped`;
      parts.push(segment);
    }
    return parts.join(' • ');
  }, [isLoadingMemories, memoriesError, savedCountDisplay, skippedCountDisplay, savedDisplayed, skippedDisplayed, totalMemories, totalSkipped]);

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

  const updateMemoriesPlacement = useCallback(() => {
    if (!memoriesButtonRef.current) return;

    const rect = memoriesButtonRef.current.getBoundingClientRect();
    const horizontalMargin = 16;
    const verticalMargin = 16;
    const desiredTop = rect.bottom + 12;
    const panelMaxHeight = 520;

    let width = Math.min(420, window.innerWidth - horizontalMargin * 2);

    let top = desiredTop;
    if (top + panelMaxHeight + verticalMargin > window.innerHeight) {
      top = Math.max(verticalMargin, window.innerHeight - panelMaxHeight - verticalMargin);
    }

    const availableHeight = Math.max(window.innerHeight - top - verticalMargin, 280);
    const maxHeight = Math.min(panelMaxHeight, availableHeight);

    const spaceOnRight = window.innerWidth - rect.left - horizontalMargin;
    const spaceOnLeft = rect.right - horizontalMargin;
    const preferFullWidth = window.innerWidth <= 640;

    let left: number | undefined;

    if (preferFullWidth) {
      width = window.innerWidth - horizontalMargin * 2;
      left = horizontalMargin;
    } else if (spaceOnRight >= width) {
      const candidateLeft = Math.min(rect.left, window.innerWidth - width - horizontalMargin);
      left = Math.max(candidateLeft, horizontalMargin);
    } else if (spaceOnLeft >= width) {
      left = Math.max(rect.right - width, horizontalMargin);
    } else {
      width = window.innerWidth - horizontalMargin * 2;
      left = horizontalMargin;
    }

    setMemoriesPlacement({ top, width, maxHeight, left });
  }, []);

  const loadMemories = useCallback(async () => {
    try {
      setIsLoadingMemories(true);
      setMemoriesError(null);
      const response = await fetch('/api/realtime/memories', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
      }
      const payload = await response.json();
      const timestamp = Date.now();
      const savedItems: MemoryEntry[] = Array.isArray(payload?.memories)
        ? payload.memories.map((entry: any, index: number) => ({
            id: entry?.id ? String(entry.id) : `memory-${index}-${timestamp}`,
            summary: typeof entry?.summary === 'string' && entry.summary.trim().length
              ? entry.summary.trim()
              : 'No summary recorded.',
            facts: Array.isArray(entry?.facts)
              ? entry.facts
                  .filter((item: unknown) => typeof item === 'string' && item.trim().length)
                  .map((item: string) => item.trim())
              : [],
            followUps: Array.isArray(entry?.followUps)
              ? entry.followUps
                  .filter((item: unknown) => typeof item === 'string' && item.trim().length)
                  .map((item: string) => item.trim())
              : [],
            createdAt: typeof entry?.createdAt === 'string' ? entry.createdAt : null,
            sessionId: typeof entry?.sessionId === 'string' && entry.sessionId.trim().length
              ? entry.sessionId.trim()
              : null,
            startedAt: typeof entry?.startedAt === 'string' && entry.startedAt.trim().length
              ? entry.startedAt.trim()
              : null,
            endedAt: typeof entry?.endedAt === 'string' && entry.endedAt.trim().length
              ? entry.endedAt.trim()
              : null,
            status: 'summarized',
          }))
        : [];
      const skippedItems: MemoryEntry[] = Array.isArray(payload?.skipped)
        ? payload.skipped.map((entry: any, index: number) => ({
            id: entry?.id ? String(entry.id) : `skipped-${index}-${timestamp}`,
            summary: typeof entry?.summary === 'string' && entry.summary.trim().length
              ? entry.summary.trim()
              : 'Session skipped (no retained content)',
            facts: [],
            followUps: [],
            createdAt: typeof entry?.createdAt === 'string' ? entry.createdAt : null,
            sessionId: typeof entry?.sessionId === 'string' && entry.sessionId.trim().length
              ? entry.sessionId.trim()
              : null,
            startedAt: typeof entry?.startedAt === 'string' && entry.startedAt.trim().length
              ? entry.startedAt.trim()
              : null,
            endedAt: typeof entry?.endedAt === 'string' && entry.endedAt.trim().length
              ? entry.endedAt.trim()
              : null,
            status: 'skipped',
          }))
        : [];

      const combined = [...savedItems, ...skippedItems].sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });

      setMemories(combined);
      setExpandedMemoryId(combined.length ? combined[0].id : null);
      const total = typeof payload?.total === 'number' ? payload.total : savedItems.length;
      setTotalMemories(total);
      const skippedTotal = typeof payload?.totalSkipped === 'number' ? payload.totalSkipped : skippedItems.length;
      setTotalSkipped(skippedTotal);
    } catch (error: any) {
      console.error('[memories] load failed', error);
      setMemoriesError(error?.message || 'Failed to load memories');
      setMemories([]);
      setTotalSkipped(null);
      setTotalMemories(null);
    } finally {
      setIsLoadingMemories(false);
    }
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

  useEffect(() => {
    if (!isMemoriesOpen) {
      setMemoriesPlacement(null);
      return;
    }

    updateMemoriesPlacement();
    void loadMemories();
  }, [isMemoriesOpen, updateMemoriesPlacement, loadMemories]);

  useEffect(() => {
    if (!isMemoriesOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        memoriesPanelRef.current?.contains(target) ||
        memoriesButtonRef.current?.contains(target)
      ) {
        return;
      }
      setIsMemoriesOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMemoriesOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('resize', updateMemoriesPlacement);
    window.addEventListener('scroll', updateMemoriesPlacement, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('resize', updateMemoriesPlacement);
      window.removeEventListener('scroll', updateMemoriesPlacement, true);
    };
  }, [isMemoriesOpen, updateMemoriesPlacement]);

  const isConnected = sessionStatus === "CONNECTED";
  const adminButtonTone =
    "flex flex-shrink-0 items-center justify-center rounded border border-rose-500/60 bg-rose-500/10 p-1.5 text-rose-200 transition hover:border-rose-400/80 hover:text-rose-50";
  const consoleButtonTone = [
    adminButtonTone,
    "relative hidden lg:flex",
    isAdminConsoleOpen ? "ring-2 ring-rose-400/40" : null,
  ]
    .filter(Boolean)
    .join(" ");
  const memoriesButtonTone = [
    adminButtonTone,
    "relative",
    isMemoriesOpen ? "ring-2 ring-rose-400/40" : null,
  ]
    .filter(Boolean)
    .join(" ");
  const mobileConsoleButtonTone = [
    adminButtonTone,
    "relative ml-auto flex lg:hidden",
  ]
    .filter(Boolean)
    .join(" ");

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

  const formatTimestamp = useCallback((iso: string | null) => {
    if (!iso) return 'Recently';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return 'Recently';
    return date.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }, []);

  const handleMobileSignals = useCallback(() => {
    if (isAdminConsoleOpen) {
      setIsAdminConsoleOpen(false);
    }
    if (isMemoriesOpen) {
      setIsMemoriesOpen(false);
    }
    onOpenSignals();
  }, [isAdminConsoleOpen, isMemoriesOpen, onOpenSignals]);

  const handleMemoriesToggle = useCallback(() => {
    setIsMemoriesOpen((prev) => {
      const next = !prev;
      if (next) {
        setIsAdminConsoleOpen(false);
      }
      return next;
    });
  }, []);

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

  const memoriesPortal =
    typeof window !== 'undefined' && isMemoriesOpen ? (
      createPortal(
        <div className="fixed inset-0 z-50 pointer-events-none">
          <div
            className="pointer-events-auto"
            style={{
              position: 'fixed',
              top: memoriesPlacement?.top ?? 96,
              width: memoriesPlacement?.width ?? Math.min(420, window.innerWidth - 32),
              maxHeight: memoriesPlacement?.maxHeight ?? 520,
              ...(typeof memoriesPlacement?.left === 'number'
                ? { left: memoriesPlacement.left }
                : { right: memoriesPlacement?.right ?? 24 }),
            }}
          >
            <div
              ref={memoriesPanelRef}
              className="rounded-2xl border border-neutral-800/70 bg-surface-raised/95 shadow-elevated backdrop-blur-xl"
              style={{ maxHeight: memoriesPlacement?.maxHeight ?? 520 }}
            >
              <div className="flex items-center justify-between gap-3 border-b border-neutral-800/60 px-5 py-4">
                <div>
                  <div className="font-display text-sm uppercase tracking-[0.28em] text-neutral-300">
                    Memories
                  </div>
                  <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                    {headerText}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMemoriesOpen(false)}
                  className="rounded-md border border-neutral-800/60 px-2 py-1 text-[11px] uppercase tracking-[0.16em] text-neutral-300 transition hover:border-flux/50 hover:text-flux"
                >
                  Close
                </button>
              </div>
              <div
                className="max-h-[520px] overflow-y-auto px-5 pb-5 pt-4"
                style={{ maxHeight: memoriesPlacement?.maxHeight ?? 520 }}
              >
                {isLoadingMemories ? (
                  <div className="text-sm text-neutral-400">Loading memories…</div>
                ) : memoriesError ? (
                  <div className="text-sm text-accent-critical">{memoriesError}</div>
                ) : memories.length === 0 ? (
                  <div className="text-sm text-neutral-400">No memories stored yet.</div>
                ) : (
                  <ul className="space-y-3">
                    {memories.map((entry) => {
                      const isExpanded = expandedMemoryId === entry.id;
                      const isSkipped = entry.status === 'skipped';
                      const cardClassNames = [
                        'rounded-2xl border bg-surface-base/70',
                        isSkipped ? 'border-rose-500/50 bg-rose-500/10' : 'border-neutral-800/60',
                      ].join(' ');
                      const buttonHoverClass = isSkipped
                        ? 'hover:bg-rose-500/10'
                        : 'hover:bg-surface-glass/50';
                      return (
                        <li
                          key={entry.id}
                          className={cardClassNames}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedMemoryId((prev) => (prev === entry.id ? null : entry.id))
                            }
                            className={`flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition ${buttonHoverClass}`}
                          >
                            <div className="flex-1">
                              <div className="text-sm font-medium text-neutral-100 line-clamp-2">
                                {entry.summary || 'No summary recorded.'}
                              </div>
                              <div className="mt-2 text-[11px] uppercase tracking-[0.16em] text-neutral-500">
                                {formatTimestamp(entry.createdAt)}
                              </div>
                            </div>
                            <ChevronDownIcon
                              className={`mt-1 h-3.5 w-3.5 shrink-0 text-neutral-400 transition-transform ${
                                isExpanded ? 'rotate-180' : ''
                              }`}
                            />
                          </button>
                          {isExpanded && (
                            <div className="space-y-4 border-t border-neutral-800/60 px-4 py-4 text-sm text-neutral-200">
                              {isSkipped && (
                                <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-[13px] leading-relaxed text-rose-100">
                                  This session ended before anything memorable was captured, so it was skipped automatically.
                                </div>
                              )}
                              {(entry.sessionId || entry.startedAt || entry.endedAt) && (
                                <div>
                                  <div className="text-[11px] uppercase tracking-[0.16em] text-neutral-500">
                                    Session details
                                  </div>
                                  <dl className="mt-2 space-y-1.5 text-[13px] leading-relaxed">
                                    {entry.sessionId && (
                                      <div className="flex items-start gap-2">
                                        <dt className="mt-0.5 w-24 text-[11px] uppercase tracking-[0.12em] text-neutral-500">
                                          Session ID
                                        </dt>
                                        <dd className="flex-1 break-all text-neutral-200">{entry.sessionId}</dd>
                                      </div>
                                    )}
                                    {entry.startedAt && (
                                      <div className="flex items-start gap-2">
                                        <dt className="mt-0.5 w-24 text-[11px] uppercase tracking-[0.12em] text-neutral-500">
                                          Started
                                        </dt>
                                        <dd className="flex-1 text-neutral-200">{formatTimestamp(entry.startedAt)}</dd>
                                      </div>
                                    )}
                                    {entry.endedAt && (
                                      <div className="flex items-start gap-2">
                                        <dt className="mt-0.5 w-24 text-[11px] uppercase tracking-[0.12em] text-neutral-500">
                                          Ended
                                        </dt>
                                        <dd className="flex-1 text-neutral-200">{formatTimestamp(entry.endedAt)}</dd>
                                      </div>
                                    )}
                                  </dl>
                                </div>
                              )}
                              {entry.facts.length > 0 && (
                                <div>
                                  <div className="text-[11px] uppercase tracking-[0.16em] text-neutral-500">
                                    Facts
                                  </div>
                                  <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed">
                                    {entry.facts.map((fact, index) => (
                                      <li key={`${entry.id}-fact-${index}`} className="flex items-start gap-2">
                                        <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-neutral-500" />
                                        <span>{fact}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {entry.followUps.length > 0 && (
                                <div>
                                  <div className="text-[11px] uppercase tracking-[0.16em] text-neutral-500">
                                    Follow-ups
                                  </div>
                                  <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed">
                                    {entry.followUps.map((followUp, index) => (
                                      <li key={`${entry.id}-follow-${index}`} className="flex items-start gap-2">
                                        <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-neutral-500" />
                                        <span>{followUp}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
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
            type="button"
            ref={memoriesButtonRef}
            onClick={handleMemoriesToggle}
            className={memoriesButtonTone}
            title="View stored memories"
            aria-haspopup="dialog"
            aria-expanded={isMemoriesOpen}
            aria-label="Open memories panel"
          >
            <ReaderIcon className="h-3.5 w-3.5" />
            {!isLoadingMemories && badgeCount > 0 && (
              <span className="absolute -top-1 -right-1 flex min-h-[16px] min-w-[16px] items-center justify-center rounded-full border border-rose-500/50 bg-rose-500/40 px-1 text-[10px] font-medium leading-none tracking-[0.08em] text-rose-50">
                {badgeLabel}
              </span>
            )}
            <span className="sr-only">Open memories panel</span>
          </button>

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
              aria-label="Open admin console"
            >
              <MixerHorizontalIcon className="h-3.5 w-3.5" />
              {typeof adminConsoleMetadata?.toolCount === "number" && (
                <span className="absolute -top-1 -right-1 flex min-h-[16px] min-w-[16px] items-center justify-center rounded-full border border-rose-500/50 bg-rose-500/40 px-1 text-[10px] font-medium leading-none tracking-[0.08em] text-rose-50">
                  {adminConsoleMetadata.toolCount}
                </span>
              )}
              <span className="sr-only">Open admin console</span>
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
          onClick={handleMobileSignals}
          className={mobileConsoleButtonTone}
          aria-label="Open signals"
        >
          <MixerHorizontalIcon className="h-3.5 w-3.5" />
          {typeof adminConsoleMetadata?.toolCount === "number" && (
            <span className="absolute -top-1 -right-1 flex min-h-[16px] min-w-[16px] items-center justify-center rounded-full border border-rose-500/50 bg-rose-500/40 px-1 text-[10px] font-medium leading-none tracking-[0.08em] text-rose-50">
              {adminConsoleMetadata.toolCount}
            </span>
          )}
          <span className="sr-only">Open signals</span>
        </button>
      )}

      {adminConsolePortal}
      {memoriesPortal}
    </div>
  );
}

export default HeroControls;
