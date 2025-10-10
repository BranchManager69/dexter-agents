import React from "react";

import type { ToolNoteRenderer } from "./types";
import { BASE_CARD_CLASS, normalizeOutput, unwrapStructured, HashBadge, formatTimestampDisplay } from "./helpers";
import { LinkPill, TokenIcon } from "./solanaVisuals";

type WalletResolvePayload = {
  wallet_address?: string;
  address?: string;
  public_key?: string;
  active_wallet_address?: string;
  source?: string;
  user_id?: string;
};

type WalletResolveArgs = {
  wallet_address?: string;
};

function extractAddress(value: unknown, depth = 0): string | null {
  if (value === null || value === undefined) return null;
  if (depth > 4) return null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^[1-9A-HJ-NP-Za-km-z]{32,64}$/.test(trimmed)) return trimmed;
    return null;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = extractAddress(entry, depth + 1);
      if (found) return found;
    }
    return null;
  }

  if (typeof value === "object") {
    const candidates = [
      (value as any)?.wallet_address,
      (value as any)?.address,
      (value as any)?.public_key,
      (value as any)?.active_wallet_address,
      (value as any)?.text,
      (value as any)?.value,
    ];
    for (const candidate of candidates) {
      const found = extractAddress(candidate, depth + 1);
      if (found) return found;
    }
    for (const key of Object.keys(value as Record<string, unknown>)) {
      if (candidates.some((candidate) => candidate === (value as any)[key])) continue;
      const found = extractAddress((value as any)[key], depth + 1);
      if (found) return found;
    }
  }
  return null;
}

const walletResolveRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const normalized = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(normalized) as WalletResolvePayload | Record<string, unknown>;
  const args = ((item.data as any)?.arguments ?? {}) as WalletResolveArgs;

  const resolvedAddress =
    extractAddress(payload) ??
    extractAddress(normalized) ??
    extractAddress((item.data as any)?.output);
  const requestedAddress = typeof args.wallet_address === "string" ? args.wallet_address : null;
  const source = typeof (payload as any)?.source === "string" ? (payload as any).source : resolvedAddress ? "resolver" : "unknown";
  const showRequested = requestedAddress && requestedAddress !== resolvedAddress;
  const sourceLabel = source ? source.replace(/_/g, " ") : null;
  const iconLabel = resolvedAddress ? resolvedAddress.slice(0, 2).toUpperCase() : "??";

  const timestamp = formatTimestampDisplay(item.timestamp);

  return (
    <div className={BASE_CARD_CLASS}>
      <section className="flex flex-col gap-6">
        <header className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-[0.32em] text-slate-400">Session wallet</span>
          {timestamp && <span className="text-xs text-slate-400">{timestamp}</span>}
        </header>

        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-4">
            <TokenIcon label={iconLabel} size={56} />
            <div className="flex flex-col">
              <span className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Active wallet</span>
              {resolvedAddress ? (
                <HashBadge value={resolvedAddress} href={`https://solscan.io/account/${resolvedAddress}`} ariaLabel="Resolved wallet" />
              ) : (
                <span className="text-sm text-slate-500">Resolver did not return a wallet.</span>
              )}
            </div>
            {sourceLabel && (
              <span className="ml-auto rounded-full border border-slate-200 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-slate-500">
                {sourceLabel}
              </span>
            )}
          </div>

          {showRequested && (
            <div className="flex flex-col gap-2 text-sm text-slate-600">
              <span className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Last requested</span>
              <HashBadge value={requestedAddress!} ariaLabel="Requested wallet" />
            </div>
          )}

          {resolvedAddress && (
            <div className="flex flex-wrap gap-3">
              <LinkPill value="Open in Solscan" href={`https://solscan.io/account/${resolvedAddress}`} />
            </div>
          )}
        </div>
      </section>

      {debug && (
        <details className="mt-4 max-w-2xl text-sm text-slate-700" open>
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Raw resolver payload
          </summary>
          <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-slate-200/70 bg-white/80 p-3 text-xs">
            {JSON.stringify(normalized, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
};

export default walletResolveRenderer;
