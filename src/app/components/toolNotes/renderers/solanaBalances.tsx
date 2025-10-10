import React from "react";

import type { ToolNoteRenderer } from "./types";
import { BASE_CARD_CLASS, normalizeOutput, unwrapStructured, HashBadge, formatTimestampDisplay } from "./helpers";
import { MetricPill, TokenIcon, TokenResearchLinks } from "./solanaVisuals";

type BalanceEntry = {
  mint?: string;
  ata?: string;
  amountUi?: number;
  amount_ui?: number;
  decimals?: number;
  token?: Record<string, unknown>;
  icon?: string;
  logo?: string;
};

type BalancesPayload = {
  balances?: BalanceEntry[];
};

const WELL_KNOWN_MINTS: Record<string, string> = {
  USDC11111111111111111111111111111111111111: "USDC",
  So11111111111111111111111111111111111111112: "SOL",
};

function pick<T>(...values: Array<T | null | undefined>): T | undefined {
  for (const value of values) {
    if (value !== null && value !== undefined) return value;
  }
  return undefined;
}

function pickString(...values: Array<string | null | undefined>) {
  return pick(...values.map((value) => {
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
    return undefined;
  }));
}

function pickNumber(...values: Array<number | string | null | undefined>) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

function symbolFromMint(mint?: string) {
  if (!mint) return undefined;
  return WELL_KNOWN_MINTS[mint] ?? mint.slice(0, 3).toUpperCase();
}

function formatAmount(amount?: number, decimals?: number) {
  if (amount === undefined) return undefined;
  const maxDigits = decimals && decimals > 4 ? 4 : decimals ?? 6;
  return amount.toLocaleString("en-US", { maximumFractionDigits: maxDigits });
}

function formatUsd(value?: number | string | null, precise = false) {
  const numeric = pickNumber(value);
  if (numeric === undefined) return undefined;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: precise ? 4 : 0,
  }).format(numeric);
}

const solanaBalancesRenderer: ToolNoteRenderer = ({ item, isExpanded, onToggle, debug = false }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput) as BalancesPayload | BalanceEntry[];
  const balances: BalanceEntry[] = Array.isArray((payload as BalancesPayload)?.balances)
    ? ((payload as BalancesPayload).balances as BalanceEntry[])
    : Array.isArray(payload)
      ? (payload as BalanceEntry[])
      : [];
  const timestamp = formatTimestampDisplay(item.timestamp);

  if (item.status === "IN_PROGRESS" && balances.length === 0) {
    return (
      <div className={BASE_CARD_CLASS}>
        <section className="flex flex-col gap-4">
          <header className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-[0.26em] text-indigo-500">Token Balances</span>
            {timestamp && <span className="text-xs text-slate-400">{timestamp}</span>}
          </header>
          <p className="text-sm text-slate-500">Fetching balances…</p>
        </section>
      </div>
    );
  }

  const visibleBalances = isExpanded ? balances : balances.slice(0, 6);
  const hasMore = balances.length > visibleBalances.length;

  return (
    <div className={BASE_CARD_CLASS}>
      <section className="flex flex-col gap-7">
        <header className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-[0.26em] text-indigo-500">Token Balances</span>
          {timestamp && <span className="text-xs text-slate-400">{timestamp}</span>}
        </header>

        <div className="flex flex-col gap-4">
          {visibleBalances.map((entry, index) => {
            const mint = pickString(entry.mint);
            const ata = pickString(entry.ata);
            const tokenMeta = entry.token && typeof entry.token === "object" ? entry.token : undefined;
            const symbol =
              pickString((tokenMeta as any)?.symbol) ??
              symbolFromMint(mint ?? undefined) ??
              (mint ? `${mint.slice(0, 4)}…` : `Token ${index + 1}`);
            const name = pickString((tokenMeta as any)?.name);
            const iconUrl = pickString(
              (tokenMeta as any)?.imageUrl,
              (tokenMeta as any)?.openGraphImageUrl,
              (tokenMeta as any)?.headerImageUrl,
              entry.icon,
              entry.logo,
            );

            const amountUi = pickNumber(entry.amountUi, entry.amount_ui);
            const amountDisplay = formatAmount(amountUi, entry.decimals);
            const marketCap = formatUsd(
              pickNumber(
                (tokenMeta as any)?.marketCap,
                (tokenMeta as any)?.market_cap,
                (tokenMeta as any)?.marketCapUsd,
                (tokenMeta as any)?.market_cap_usd,
              ),
              false,
            );
            const priceChangeRaw = pickNumber(
              (tokenMeta as any)?.priceChange24h,
              (tokenMeta as any)?.price_change_24h,
            );
            const priceChange =
              priceChangeRaw !== undefined
                ? `${priceChangeRaw >= 0 ? "+" : ""}${priceChangeRaw.toFixed(2)}%`
                : undefined;
            const priceUsd = pickNumber((tokenMeta as any)?.priceUsd, (tokenMeta as any)?.price_usd);
            const holdingUsdRaw =
              pickNumber((tokenMeta as any)?.holdingUsd, (tokenMeta as any)?.balanceUsd, (tokenMeta as any)?.balance_usd) ??
              (priceUsd !== undefined && amountUi !== undefined ? priceUsd * amountUi : undefined);
            const holdingUsd = formatUsd(holdingUsdRaw);

            return (
              <article key={mint ?? ata ?? `balance-${index}`} className="flex flex-col gap-3 border-b border-slate-200/60 pb-4 last:border-0 last:pb-0">
                <div className="flex items-start gap-3">
                  <TokenIcon label={symbol} imageUrl={iconUrl} size={48} />
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="text-base font-semibold text-slate-900">{symbol}</span>
                        {name && <span className="text-xs text-slate-500">{name}</span>}
                      </div>
                      {amountDisplay && (
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-semibold text-slate-900">{amountDisplay}</span>
                          {holdingUsd && <span className="text-xs text-slate-500">{holdingUsd}</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      {mint && <HashBadge value={mint} href={`https://solscan.io/token/${mint}`} ariaLabel={`${symbol} mint`} />}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  {marketCap && <MetricPill label="MCAP" value={marketCap} />}
                  {priceChange && (
                    <MetricPill
                      value={priceChange}
                      tone={priceChangeRaw !== undefined && priceChangeRaw < 0 ? "negative" : "positive"}
                    />
                  )}
                  {mint && <TokenResearchLinks mint={mint} />}
                </div>
              </article>
            );
          })}
        </div>

        {visibleBalances.length === 0 && (
          <p className="text-sm text-slate-500">No balances detected for this wallet.</p>
        )}

        {hasMore && (
          <button
            type="button"
            onClick={onToggle}
            className="self-start rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
          >
            {isExpanded ? "Collapse" : `Show all ${balances.length}`}
          </button>
        )}
      </section>

      {debug && (
        <details className="mt-4 max-w-2xl text-sm text-slate-700" open>
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Raw balances payload
          </summary>
          <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-slate-200/70 bg-white/80 p-3 text-xs">
            {JSON.stringify(rawOutput, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
};

export default solanaBalancesRenderer;
