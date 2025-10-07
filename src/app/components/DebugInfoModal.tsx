"use client";

import { useEffect, useMemo, useState } from "react";
import type { RealtimeAgent } from "@openai/agents/realtime";
import { createPortal } from "react-dom";
import { UserBadge } from "@/app/components/UserBadge";
import type { UserBadgeVariant } from "@/app/components/UserBadge";

type WalletSummaryEntry = {
  symbol: string | null;
  label: string | null;
  amountUi: number | null;
  usdValue: number | null;
};

type WalletSummary = {
  solBalanceFormatted: string | null;
  totalUsdFormatted: string | null;
  tokenCount: number | null;
  balances: WalletSummaryEntry[];
  lastUpdatedIso: string | null;
  lastUpdatedLabel: string | null;
};

interface DebugInfoModalProps {
  open: boolean;
  onClose: () => void;
  connectionStatus: string;
  identityLabel: string;
  mcpStatus: string;
  mcpDetail: string | null;
  roleLabel: string;
  roleVariant: UserBadgeVariant;
  authEmail: string | null;
  walletStatus: string;
  walletInfo: {
    address: string | null;
    formattedLabel: string | null;
    secondaryText: string | null;
    status: "idle" | "loading" | "ready" | "error";
    pending: boolean;
    error: string | null;
    summary: WalletSummary | null;
  };
  isAudioPlaybackEnabled: boolean;
  setIsAudioPlaybackEnabled: (value: boolean) => void;
  isEventsPaneExpanded: boolean;
  setIsEventsPaneExpanded: (value: boolean) => void;
  codec: string;
  onCodecChange: (codec: string) => void;
  buildTag: string;
  agents: RealtimeAgent[];
  selectedAgentName: string;
  onAgentChange: (agentName: string) => void;
  canManageAgents: boolean;
}

const formatNumber = (value: number | null, options?: Intl.NumberFormatOptions): string | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return new Intl.NumberFormat("en-US", options).format(value);
};

export function DebugInfoModal({
  open,
  onClose,
  connectionStatus,
  identityLabel,
  mcpStatus,
  mcpDetail,
  roleLabel,
  roleVariant,
  authEmail,
  walletStatus,
  walletInfo,
  isAudioPlaybackEnabled,
  setIsAudioPlaybackEnabled,
  isEventsPaneExpanded,
  setIsEventsPaneExpanded,
  codec,
  onCodecChange,
  buildTag,
  agents,
  selectedAgentName,
  onAgentChange,
  canManageAgents,
}: DebugInfoModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  const [copiedAddress, setCopiedAddress] = useState(false);

  const shouldShowAgentSelector = canManageAgents && agents.length > 0;
  const walletBalances = walletInfo.summary?.balances ?? [];
  const hasWalletSummary = Boolean(walletInfo.summary);

  const walletStatusLabel = useMemo(() => {
    if (walletInfo.error) return walletInfo.error;
    if (walletInfo.pending || walletInfo.status === "loading") return "Syncing…";
    if (walletInfo.status === "error") return "Balance error";
    return walletInfo.secondaryText || walletStatus;
  }, [walletInfo.error, walletInfo.pending, walletInfo.secondaryText, walletInfo.status, walletStatus]);

  const handleCopyAddress = async () => {
    if (!walletInfo.address) return;
    try {
      await navigator.clipboard.writeText(walletInfo.address);
      setCopiedAddress(true);
      window.setTimeout(() => setCopiedAddress(false), 1600);
    } catch {
      setCopiedAddress(false);
    }
  };

  const getAgentDisplayName = (agentName: string) => {
    const displayNames: Record<string, string> = {
      dexterVoice: "Dexter Voice",
    };
    return displayNames[agentName] || agentName;
  };

  if (!open) return null;

  const modal = (
    <>
      <div
        className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div
          className="w-full max-w-lg rounded-lg border border-neutral-800/60 bg-surface-glass/95 p-6 shadow-elevated backdrop-blur-xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-sm font-semibold tracking-[0.08em] text-neutral-200">
                Debug Control Room
              </h2>
              <p className="text-xs text-neutral-500">Inspect live session state, wallet telemetry, and audio controls.</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-1 text-neutral-500 transition hover:text-neutral-200"
              aria-label="Close"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            <section className="space-y-3 rounded-lg border border-neutral-800/60 bg-neutral-900/30 px-4 py-4">
              <header className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-display text-xs font-semibold tracking-[0.12em] text-neutral-400 uppercase">
                  Session
                </span>
                <div className="inline-flex items-center gap-2 text-sm text-neutral-200">
                  <UserBadge variant={roleVariant} size="sm" />
                  <span>{roleLabel}</span>
                </div>
              </header>
              <dl className="space-y-2 text-sm text-neutral-300">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-neutral-400">Identity</dt>
                  <dd className="font-medium text-neutral-100">{identityLabel}</dd>
                </div>
                {authEmail ? (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-neutral-400">Email</dt>
                    <dd className="truncate text-neutral-200" title={authEmail}>
                      {authEmail}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </section>

            <section className="space-y-3 rounded-lg border border-neutral-800/60 bg-neutral-900/30 px-4 py-4">
              <header className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-display text-xs font-semibold tracking-[0.12em] text-neutral-400 uppercase">
                  Connection
                </span>
                <span className="rounded-full bg-neutral-800/70 px-3 py-0.5 text-xs font-semibold text-neutral-100">
                  {connectionStatus}
                </span>
              </header>
              <dl className="space-y-2 text-sm text-neutral-300">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-neutral-400">MCP</dt>
                  <dd className="text-neutral-100">{mcpStatus}</dd>
                </div>
                {mcpDetail ? (
                  <div className="rounded-md border border-neutral-800/60 bg-neutral-900/40 px-3 py-2 text-xs text-neutral-400">
                    {mcpDetail}
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-neutral-400">Build</dt>
                  <dd className="text-neutral-100">{buildTag}</dd>
                </div>
              </dl>
            </section>

            <section className="space-y-3 rounded-lg border border-neutral-800/60 bg-neutral-900/30 px-4 py-4">
              <header className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-display text-xs font-semibold tracking-[0.12em] text-neutral-400 uppercase">
                  Wallet
                </span>
                <span className="rounded-full bg-neutral-800/70 px-3 py-0.5 text-xs font-semibold text-neutral-100">
                  {walletInfo.formattedLabel ?? walletStatus}
                </span>
              </header>
              <div className="space-y-3 text-sm text-neutral-300">
                {walletInfo.address ? (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-neutral-400">Address</span>
                    <button
                      type="button"
                      onClick={handleCopyAddress}
                      className="inline-flex items-center gap-1 rounded-full border border-neutral-700/60 px-3 py-1 text-xs text-neutral-200 transition hover:border-flux/60 hover:text-flux"
                    >
                      {copiedAddress ? "Copied" : "Copy"}
                    </button>
                  </div>
                ) : null}
                {walletStatusLabel ? (
                  <p className="rounded-md border border-neutral-800/60 bg-neutral-900/40 px-3 py-2 text-xs text-neutral-400">
                    {walletStatusLabel}
                  </p>
                ) : null}
                {hasWalletSummary ? (
                  <dl className="space-y-2 text-xs text-neutral-300">
                    {walletInfo.summary?.solBalanceFormatted || walletInfo.summary?.totalUsdFormatted ? (
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-neutral-400">SOL / USD</dt>
                        <dd className="text-neutral-100">
                          {[walletInfo.summary?.solBalanceFormatted, walletInfo.summary?.totalUsdFormatted]
                            .filter(Boolean)
                            .join(" • ")}
                        </dd>
                      </div>
                    ) : null}
                    {walletInfo.summary?.tokenCount ? (
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-neutral-400">Tokens tracked</dt>
                        <dd className="text-neutral-100">{walletInfo.summary.tokenCount}</dd>
                      </div>
                    ) : null}
                    {walletInfo.summary?.lastUpdatedLabel ? (
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-neutral-400">Updated</dt>
                        <dd className="text-neutral-100">{walletInfo.summary.lastUpdatedLabel}</dd>
                      </div>
                    ) : null}
                  </dl>
                ) : null}
                {walletBalances.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">Top balances</p>
                    <ul className="space-y-2">
                      {walletBalances.slice(0, 5).map((token, index) => (
                        <li
                          key={`${token.symbol ?? token.label ?? index}`}
                          className="flex items-center justify-between gap-3 rounded-md border border-neutral-800/50 bg-neutral-900/30 px-3 py-2"
                        >
                          <span className="text-neutral-200">{token.symbol || token.label || "Token"}</span>
                          <span className="text-right text-neutral-100">
                            {formatNumber(token.amountUi) ?? "—"}
                            {formatNumber(token.usdValue, { style: "currency", currency: "USD", maximumFractionDigits: 2 }) ? (
                              <span className="ml-2 text-neutral-500">
                                {formatNumber(token.usdValue, { style: "currency", currency: "USD", maximumFractionDigits: 2 })}
                              </span>
                            ) : null}
                          </span>
                        </li>
                      ))}
                      {walletBalances.length > 5 ? (
                        <li className="text-xs text-neutral-500">+ {walletBalances.length - 5} more</li>
                      ) : null}
                    </ul>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="space-y-4 rounded-lg border border-neutral-800/60 bg-neutral-900/30 px-4 py-4">
              <header className="font-display text-xs font-semibold tracking-[0.12em] text-neutral-400 uppercase">
                Controls
              </header>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-neutral-400">Audio Playback</span>
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-flux cursor-pointer"
                  checked={isAudioPlaybackEnabled}
                  onChange={(event) => setIsAudioPlaybackEnabled(event.target.checked)}
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-neutral-400">Event Logs</span>
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-iris cursor-pointer"
                  checked={isEventsPaneExpanded}
                  onChange={(event) => setIsEventsPaneExpanded(event.target.checked)}
                />
              </label>

              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-neutral-400">Audio Codec</span>
                <select
                  value={codec}
                  onChange={(event) => onCodecChange(event.target.value)}
                  className="rounded-md border border-neutral-800/80 bg-surface-glass/60 px-3 py-1.5 text-xs text-neutral-200 outline-none transition focus:border-flux/60 focus:ring-2 focus:ring-flux/30"
                >
                  <option value="opus">Opus (48k)</option>
                  <option value="pcmu">PCMU (8k)</option>
                  <option value="pcma">PCMA (8k)</option>
                </select>
              </div>

              {shouldShowAgentSelector ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-neutral-400">Agent</span>
                  <select
                    value={selectedAgentName}
                    onChange={(event) => onAgentChange(event.target.value)}
                    className="rounded-md border border-neutral-800/80 bg-surface-glass/60 px-3 py-1.5 text-xs text-neutral-200 outline-none transition focus:border-rose-400/60 focus:ring-2 focus:ring-rose-300/30"
                  >
                    {agents.map((agent) => (
                      <option key={agent.name} value={agent.name} className="bg-neutral-900 text-rose-100">
                        {getAgentDisplayName(agent.name)}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </section>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modal, document.body);
}
