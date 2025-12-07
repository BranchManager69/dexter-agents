"use client";

import React from "react";
import type { ToolNoteRenderer } from "./types";
import { normalizeOutput, unwrapStructured, formatTimestampDisplay } from "./helpers";
import { 
  SleekCard, 
  SleekLabel, 
  TokenIconSleek, 
  SleekHash, 
  MetricItem,
  SleekLoadingCard,
  SleekErrorCard,
  formatUsdCompact, 
  formatUsdPrecise,
  formatPercent 
} from "./sleekVisuals";

// --- Types (Preserved) ---

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

// --- Helpers (Preserved & Adapted) ---

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

function formatUsdHelper(value?: number | string | null, opts: { precise?: boolean; compact?: boolean } = {}) {
  const numeric = pickNumber(value);
  if (numeric === undefined) return undefined;
  if (opts.compact) return formatUsdCompact(numeric);
  return formatUsdPrecise(numeric);
}

function formatPercentHelper(value?: number | string | null) {
  const numeric = pickNumber(value);
  if (numeric === undefined) return undefined;
  return formatPercent(numeric);
}

// --- Main Renderer ---

const solanaBalancesRenderer: ToolNoteRenderer = ({ item, isExpanded, onToggle, debug = false }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput) as BalancesPayload | BalanceEntry[];
  const balances: BalanceEntry[] = Array.isArray((payload as BalancesPayload)?.balances)
    ? ((payload as BalancesPayload).balances as BalanceEntry[])
    : Array.isArray(payload)
      ? (payload as BalanceEntry[])
      : [];
  const timestamp = formatTimestampDisplay(item.timestamp);

  // Loading State
  if (item.status === "IN_PROGRESS" && balances.length === 0) {
    return <SleekLoadingCard />;
  }

  // No Balances
  if (balances.length === 0) {
    return <SleekErrorCard message="No balances detected for this wallet." />;
  }

  const visibleBalances = isExpanded ? balances : balances.slice(0, 6);
  const hasMore = balances.length > visibleBalances.length;

  return (
    <div className="w-full max-w-3xl space-y-4">
      <header className="flex items-center justify-between px-1">
         <SleekLabel>Wallet Assets</SleekLabel>
         {timestamp && <span className="text-[10px] text-neutral-600 font-mono">{timestamp}</span>}
      </header>

      {/* Grid Layout: Compact cards side-by-side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {visibleBalances.map((entry, index) => {
          const mint = pickString(entry.mint);
          const ata = pickString(entry.ata);
          const tokenMeta = entry.token && typeof entry.token === "object" ? entry.token : undefined;
          const symbol =
            pickString((tokenMeta as any)?.symbol) ??
            symbolFromMint(mint ?? undefined) ??
            (mint ? `${mint.slice(0, 4)}…` : `Token ${index + 1}`);
          const name = pickString((tokenMeta as any)?.name) ?? symbol;
          const iconUrl = pickString(
            (tokenMeta as any)?.imageUrl,
            (tokenMeta as any)?.openGraphImageUrl,
            (tokenMeta as any)?.headerImageUrl,
            entry.icon,
            entry.logo,
          );

          const amountUi = pickNumber(entry.amountUi, entry.amount_ui);
          const amountDisplay = formatAmount(amountUi, entry.decimals);
          
          const marketCapRaw = pickNumber(
              (tokenMeta as any)?.marketCap,
              (tokenMeta as any)?.market_cap,
              (tokenMeta as any)?.marketCapUsd,
              (tokenMeta as any)?.market_cap_usd,
          );
          const marketCap = formatUsdHelper(marketCapRaw, { compact: true });

          const priceChangeRaw = pickNumber(
            (tokenMeta as any)?.priceChange24h,
            (tokenMeta as any)?.price_change_24h,
          );
          const priceChange = formatPercentHelper(priceChangeRaw);
          const isPositive = priceChangeRaw !== undefined && priceChangeRaw >= 0;

          const priceUsdRaw = pickNumber((tokenMeta as any)?.priceUsd, (tokenMeta as any)?.price_usd);
          const priceUsd = formatUsdHelper(priceUsdRaw, { precise: true });

          const holdingUsdRaw =
            pickNumber((tokenMeta as any)?.holdingUsd, (tokenMeta as any)?.balanceUsd, (tokenMeta as any)?.balance_usd) ??
            (priceUsdRaw !== undefined && amountUi !== undefined ? priceUsdRaw * amountUi : undefined);
          
          const holdingUsd = formatUsdHelper(holdingUsdRaw, { precise: false });

          return (
            <SleekCard key={mint ?? ata ?? `balance-${index}`} className="relative group overflow-hidden flex flex-col p-4 gap-3">
               {/* Glow Effect */}
               <div 
                  className={`absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-20 blur-3xl transition-colors duration-700 pointer-events-none ${
                      isPositive ? 'bg-emerald-500' : 'bg-rose-500'
                  }`} 
               />

               <div className="relative z-10 flex flex-col gap-3">
                  {/* Top Row: Identity & Value */}
                  <div className="flex justify-between items-start">
                     <div className="flex items-center gap-3">
                        <TokenIconSleek symbol={symbol} imageUrl={iconUrl} size={42} />
                        <div>
                           <div className="font-bold text-white tracking-tight">{symbol}</div>
                           <div className="text-[10px] text-neutral-400 font-medium truncate max-w-[80px]">{name}</div>
                        </div>
                     </div>
                     <div className="text-right">
                        <div className="font-bold text-white tracking-tight tabular-nums">{holdingUsd ?? "—"}</div>
                        <div className="text-[10px] text-neutral-400 font-medium tabular-nums">{amountDisplay}</div>
                     </div>
                  </div>

                  {/* Divider */}
                  <div className="h-px w-full bg-white/5" />

                  {/* Bottom Row: Market Context (Price | Change) */}
                  <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col">
                          <SleekLabel>PRICE</SleekLabel>
                          <span className="text-xs font-semibold text-neutral-200 tracking-wide mt-0.5">{priceUsd ?? "—"}</span>
                      </div>
                      <div className="flex flex-col items-end">
                          <SleekLabel>24H</SleekLabel>
                          <span className={`text-xs font-bold tracking-wide mt-0.5 ${isPositive ? 'text-emerald-400' : priceChange ? 'text-rose-400' : 'text-neutral-200'}`}>
                              {priceChange ?? "—"}
                          </span>
                      </div>
                  </div>
               </div>
            </SleekCard>
          );
        })}
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={onToggle}
          className="w-full py-3 rounded-2xl border border-white/5 bg-white/5 text-[10px] uppercase font-bold tracking-[0.2em] text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          {isExpanded ? "Collapse List" : `Show ${balances.length - visibleBalances.length} more assets`}
        </button>
      )}

      {debug && (
        <details className="mt-4 border border-white/5 bg-black/50 p-4 rounded-xl text-xs text-neutral-500 font-mono">
          <summary className="cursor-pointer hover:text-white transition-colors">Raw Payload</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(rawOutput, null, 2)}</pre>
        </details>
      )}
    </div>
  );
};

export default solanaBalancesRenderer;
