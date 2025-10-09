import React from "react";

import type { ToolNoteRenderer } from "./types";
import { BASE_CARD_CLASS, normalizeOutput, unwrapStructured, formatSolAmount, formatSolDisplay, HashBadge } from "./helpers";
import { MetricPill, TokenFlow } from "./solanaVisuals";
import type { TokenSide } from "./solanaVisuals";

type PreviewPayload = {
  expectedSol?: number | string;
  expected_sol?: number | string;
  warnings?: unknown[];
};

type PreviewArgs = Record<string, unknown>;

const WELL_KNOWN_MINTS: Record<string, string> = {
  USDC11111111111111111111111111111111111111: "USDC",
  So11111111111111111111111111111111111111112: "SOL",
};

function symbolFromMint(mint?: string) {
  if (!mint) return undefined;
  return WELL_KNOWN_MINTS[mint] ?? mint.slice(0, 3).toUpperCase();
}

function formatTimestamp(value?: string) {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildTokenSide(kind: "from" | "to", opts: { heading?: string; amount?: string | null; symbol?: string | null; mint?: string | null }): TokenSide {
  return {
    heading: opts.heading ?? (kind === "from" ? "You sell" : "You receive"),
    amount: opts.amount ?? undefined,
    asset: opts.symbol ?? undefined,
    mintAddress: opts.mint ?? undefined,
    explorerUrl: opts.mint ? `https://solscan.io/token/${opts.mint}` : undefined,
    accent: kind,
  };
}

const solanaPreviewSellRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput) as PreviewPayload;
  const args = ((item.data as any)?.arguments ?? {}) as PreviewArgs;

  const mint = typeof args.mint === "string" ? args.mint : undefined;
  const amountRaw = typeof args.amount_raw === "string" ? args.amount_raw : undefined;

  const expectedRaw = payload.expectedSol ?? payload.expected_sol ?? args.expected_sol;
  const expectedDisplay = expectedRaw !== undefined
    ? formatSolAmount(expectedRaw, { fromLamports: true }) ?? formatSolAmount(expectedRaw)
    : undefined;
  const expectedVerbose = expectedRaw !== undefined
    ? formatSolDisplay(expectedRaw, { fromLamports: true }) ?? formatSolDisplay(expectedRaw)
    : undefined;

  const fromSide = buildTokenSide("from", {
    amount: amountRaw ?? undefined,
    symbol: symbolFromMint(mint) ?? "TOKEN",
    mint,
  });

  const toSide = buildTokenSide("to", {
    amount: expectedDisplay ?? undefined,
    symbol: "SOL",
  });

  const warnings = Array.isArray(payload?.warnings)
    ? payload.warnings.filter((warn): warn is string => typeof warn === "string" && warn.length > 0)
    : [];

  const timestamp = formatTimestamp(item.timestamp);

  return (
    <div className={BASE_CARD_CLASS}>
      <section className="flex flex-col gap-7">
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-[0.26em] text-indigo-500">Sell Preview</span>
            {timestamp && <span className="text-xs text-slate-400">{timestamp}</span>}
          </div>
          {expectedVerbose && <MetricPill label="Expected" value={expectedVerbose} tone="positive" />}
        </header>

        <TokenFlow from={fromSide} to={toSide} />

        {mint && (
          <div className="flex flex-col gap-2 text-sm text-slate-600">
            <span className="text-[11px] uppercase tracking-[0.24em] text-slate-300">Token mint</span>
            <HashBadge value={mint} href={`https://solscan.io/token/${mint}`} ariaLabel="Token mint address" />
          </div>
        )}

        {warnings.length > 0 && (
          <section className="flex flex-col gap-2 text-sm text-amber-900">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-amber-600">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-700">!</span>
              Pay attention
            </div>
            <ul className="space-y-2">
              {warnings.map((warn, idx) => (
                <li key={`${warn}-${idx}`} className="leading-relaxed">
                  {warn}
                </li>
              ))}
            </ul>
          </section>
        )}
      </section>

      {debug && (
        <details className="mt-4 max-w-2xl text-sm text-slate-700" open>
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Raw preview payload
          </summary>
          <pre className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-slate-200/70 bg-white/80 p-3 text-xs">
            {JSON.stringify(rawOutput, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
};

export default solanaPreviewSellRenderer;
