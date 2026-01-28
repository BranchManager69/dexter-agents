"use client";

import React, { useState, Component, type ErrorInfo, type ReactNode } from "react";
import { LayoutGroup } from "framer-motion";
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

// Error boundary to prevent renderer crashes from taking down the whole app
class BalancesErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { hasError: boolean; error?: Error }> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[solanaBalances] Render error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <SleekErrorCard message={`Render error: ${this.state.error?.message || 'Unknown error'}`} />
      );
    }
    return this.props.children;
  }
}

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

function formatUsdHelper(value?: number | string | null, opts: { precise?: boolean; compact?: boolean; noCents?: boolean } = {}) {
  const numeric = pickNumber(value);
  if (numeric === undefined) return undefined;
  if (opts.compact) return formatUsdCompact(numeric);
  // No cents - round to whole dollars
  if (opts.noCents) {
    return '$' + Math.round(numeric).toLocaleString('en-US');
  }
  return formatUsdPrecise(numeric);
}

// Format USD without cents for display
function formatUsdNoCents(value?: number) {
  if (value === undefined || !Number.isFinite(value)) return undefined;
  return '$' + Math.round(value).toLocaleString('en-US');
}

function formatPercentHelper(value?: number | string | null) {
  const numeric = pickNumber(value);
  if (numeric === undefined) return undefined;
  // API returns percentage already multiplied by 100 (e.g., -651 instead of -6.51)
  // Divide by 100 to get the actual percentage value
  const corrected = numeric / 100;
  return formatPercent(corrected);
}

// --- Main Renderer ---

// SOL Icon component (Solana logo)
const SolanaIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="sol-grad-1" x1="90%" y1="0%" x2="10%" y2="100%">
        <stop offset="0%" stopColor="#00FFA3"/>
        <stop offset="100%" stopColor="#DC1FFF"/>
      </linearGradient>
    </defs>
    <path d="M25.3 93.5c0.9-0.9 2.2-1.5 3.5-1.5h97.1c2.2 0 3.4 2.7 1.8 4.3l-24.2 24.2c-0.9 0.9-2.2 1.5-3.5 1.5H2.9c-2.2 0-3.4-2.7-1.8-4.3L25.3 93.5z" fill="url(#sol-grad-1)"/>
    <path d="M25.3 2.5c1-1 2.3-1.5 3.5-1.5h97.1c2.2 0 3.4 2.7 1.8 4.3L103.5 29.5c-0.9 0.9-2.2 1.5-3.5 1.5H2.9c-2.2 0-3.4-2.7-1.8-4.3L25.3 2.5z" fill="url(#sol-grad-1)"/>
    <path d="M102.7 47.3c-0.9-0.9-2.2-1.5-3.5-1.5H2.1c-2.2 0-3.4 2.7-1.8 4.3l24.2 24.2c0.9 0.9 2.2 1.5 3.5 1.5h97.1c2.2 0 3.4-2.7 1.8-4.3L102.7 47.3z" fill="url(#sol-grad-1)"/>
  </svg>
);

// Inner component that actually renders - wrapped in error boundary
function SolanaBalancesInner({ item, isListExpanded, toggleList, debug }: { item: any; isListExpanded: boolean; toggleList: () => void; debug: boolean }) {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput) as BalancesPayload | BalanceEntry[];
  const balances: BalanceEntry[] = Array.isArray((payload as BalancesPayload)?.balances)
    ? ((payload as BalancesPayload).balances as BalanceEntry[])
    : Array.isArray(payload)
      ? (payload as BalanceEntry[])
      : [];

  // State for the "Hero" expansion
  const [expandedMint, setExpandedMint] = useState<string | null>(null);

  // Loading State
  if (item.status === "IN_PROGRESS" && balances.length === 0) {
    return <SleekLoadingCard />;
  }

  // No Balances
  if (balances.length === 0) {
    return <SleekErrorCard message="No balances detected for this wallet." />;
  }

  // Calculate total portfolio value
  let totalUsd = 0;
  let solPriceUsd = 0;
  for (const entry of balances) {
    const tokenMeta = entry.token && typeof entry.token === "object" ? entry.token : undefined;
    const holdingUsdRaw = pickNumber(
      (tokenMeta as any)?.holdingUsd, 
      (tokenMeta as any)?.balanceUsd, 
      (tokenMeta as any)?.balance_usd
    );
    const priceUsdRaw = pickNumber((tokenMeta as any)?.priceUsd, (tokenMeta as any)?.price_usd);
    const amountUi = pickNumber(entry.amountUi, entry.amount_ui);
    
    // Get SOL price for conversion
    const symbol = pickString((tokenMeta as any)?.symbol);
    if (symbol === 'SOL' && priceUsdRaw) {
      solPriceUsd = priceUsdRaw;
    }
    
    const value = holdingUsdRaw ?? (priceUsdRaw && amountUi ? priceUsdRaw * amountUi : 0);
    if (value && Number.isFinite(value)) {
      totalUsd += value;
    }
  }
  
  const totalSol = solPriceUsd > 0 ? totalUsd / solPriceUsd : undefined;

  // Helper to get USD value of a balance entry
  const getEntryValueUsd = (entry: any): number => {
    const tokenMeta = entry.token && typeof entry.token === "object" ? entry.token : undefined;
    const holdingUsdRaw = pickNumber(
      (tokenMeta as any)?.holdingUsd, 
      (tokenMeta as any)?.balanceUsd, 
      (tokenMeta as any)?.balance_usd
    );
    const priceUsdRaw = pickNumber((tokenMeta as any)?.priceUsd, (tokenMeta as any)?.price_usd);
    const amountUi = pickNumber(entry.amountUi, entry.amount_ui);
    return holdingUsdRaw ?? (priceUsdRaw && amountUi ? priceUsdRaw * amountUi : 0) ?? 0;
  };

  // Separate balances: those with USD value vs those without
  const valuedBalances = balances
    .filter(entry => getEntryValueUsd(entry) > 0)
    .sort((a, b) => getEntryValueUsd(b) - getEntryValueUsd(a)); // Sort by value descending
  
  const unvaluedBalances = balances.filter(entry => getEntryValueUsd(entry) <= 0);

  // Show valued balances by default, unvalued only when expanded
  const visibleBalances = isListExpanded 
    ? [...valuedBalances, ...unvaluedBalances] 
    : valuedBalances.slice(0, 6);
  
  const hiddenCount = isListExpanded 
    ? 0 
    : (valuedBalances.length - 6) + unvaluedBalances.length;
  const hasMore = hiddenCount > 0;

  return (
    <div className="w-full max-w-3xl space-y-4">
      {/* Total Portfolio Value - Full Width */}
      <div className="w-full p-5 rounded-sm border border-white/5 bg-gradient-to-r from-[#0A0A0A] to-[#111] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-purple-500/5 pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Total Portfolio</span>
            <span className="text-3xl font-bold text-white tracking-tight tabular-nums">
              {formatUsdNoCents(totalUsd)}
            </span>
            {totalSol !== undefined && (
              <span className="flex items-center gap-1.5 text-neutral-400">
                <SolanaIcon size={14} />
                <span className="text-base font-medium tabular-nums">
                  {totalSol.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 
         LayoutGroup ensures that when one card expands (changes size), 
         the others animate to their new positions automatically.
      */}
      <LayoutGroup>
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
              entry.icon,
              entry.logo,
            );
            // DexScreener banner (1500x500) - used as subtle card backdrop
            const bannerUrl = pickString(
              (tokenMeta as any)?.headerImageUrl,
              (tokenMeta as any)?.openGraphImageUrl,
            );

            // Logic
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
            const holdingUsd = formatUsdHelper(holdingUsdRaw, { noCents: true });

            // Derived Data
            const volumeRaw = pickNumber((tokenMeta as any)?.volume24hUsd, (tokenMeta as any)?.volume24h);
            const volume = formatUsdHelper(volumeRaw, { compact: true });
            const liquidityRaw = pickNumber((tokenMeta as any)?.liquidityUsd, (tokenMeta as any)?.liquidity_usd);
            const liquidity = formatUsdHelper(liquidityRaw, { compact: true });

            // Layout Logic - use stable key that won't change between renders
            // Prefer index-based key to avoid key changes when mint/ata arrive async
            const uniqueKey = `balance-${index}-${mint || ata || 'unknown'}`;
            const isExpanded = expandedMint === uniqueKey;

            return (
              <SleekCard 
                key={uniqueKey} 
                layout // Animate layout changes
                onClick={() => setExpandedMint(isExpanded ? null : uniqueKey)}
                className={`relative group overflow-hidden flex flex-col p-4 gap-3 cursor-pointer transition-all hover:bg-[#0A0A0A] ${isExpanded ? 'col-span-1 sm:col-span-2 ring-1 ring-white/10 bg-black' : ''}`}
              >
                 {/* DexScreener Banner Backdrop */}
                 {bannerUrl && (
                   <div 
                     className="absolute inset-0 pointer-events-none"
                     style={{
                       backgroundImage: `url(${bannerUrl})`,
                       backgroundSize: 'cover',
                       backgroundPosition: 'center top',
                       opacity: 0.35,
                       maskImage: 'linear-gradient(to bottom, black 0%, black 20%, transparent 85%)',
                       WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 20%, transparent 85%)',
                     }}
                   />
                 )}
                 {/* Glow Effect */}
                 <div 
                    className={`absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-20 blur-3xl transition-colors duration-700 pointer-events-none ${
                        isPositive ? 'bg-emerald-500' : 'bg-rose-500'
                    }`} 
                 />

                 <div className="relative z-10 flex flex-col gap-3">
                    {/* Header Row: Always visible */}
                    <div className="flex justify-between items-start">
                       <div className="flex items-center gap-3">
                          <TokenIconSleek symbol={symbol} imageUrl={iconUrl} size={isExpanded ? 56 : 42} />
                          <div>
                             <div className={`font-bold text-white tracking-tight ${isExpanded ? 'text-xl' : 'text-base'}`}>{symbol}</div>
                             <div className="text-[10px] text-neutral-400 font-medium truncate max-w-[120px]">{name}</div>
                          </div>
                       </div>
                       <div className="text-right">
                          <div className={`font-bold text-white tracking-tight tabular-nums ${isExpanded ? 'text-2xl' : 'text-base'}`}>{holdingUsd ?? "—"}</div>
                          <div className="text-[10px] text-neutral-400 font-medium tabular-nums">{amountDisplay}</div>
                       </div>
                    </div>

                    {/* Divider */}
                    <div className="h-px w-full bg-white/5" />

                    {/* Compact Footer (Visible when collapsed) */}
                    {!isExpanded && (
                      <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                              <span className="text-xs font-semibold text-neutral-200 tabular-nums">{priceUsd ?? "—"}</span>
                              <span className={`text-xs font-bold tabular-nums ${isPositive ? 'text-emerald-400' : priceChange ? 'text-rose-400' : 'text-neutral-500'}`}>
                                  {priceChange ?? "—"}
                              </span>
                          </div>
                          {volume && (
                            <span className="text-[10px] text-neutral-500 tabular-nums">
                              VOL {volume}
                            </span>
                          )}
                      </div>
                    )}

                    {/* Expanded Hero Details (Visible only when expanded) */}
                    {isExpanded && (
                      <div className="flex flex-col gap-5 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                          {/* Full Stats Grid */}
                          <div className="grid grid-cols-3 gap-3">
                             <div className="flex flex-col gap-1.5 p-3 rounded-sm bg-white/[0.02] border border-white/[0.02]">
                                  <SleekLabel>PRICE</SleekLabel>
                                  <span className="text-sm font-semibold text-neutral-200 tracking-wide">{priceUsd ?? "—"}</span>
                             </div>
                             <div className="flex flex-col gap-1.5 p-3 rounded-sm bg-white/[0.02] border border-white/[0.02]">
                                  <SleekLabel>24H CHANGE</SleekLabel>
                                  <span className={`text-sm font-bold tracking-wide ${isPositive ? 'text-emerald-400' : priceChange ? 'text-rose-400' : 'text-neutral-200'}`}>
                                      {priceChange ?? "—"}
                                  </span>
                             </div>
                             {marketCap && <MetricItem label="MCAP" value={marketCap} />}
                             {volume && <MetricItem label="VOL (24H)" value={volume} />}
                             {liquidity && <MetricItem label="LIQUIDITY" value={liquidity} />}
                          </div>

                          {/* Footer Actions */}
                          <div className="flex items-center justify-between pt-1">
                             <div>
                                 {mint && (
                                    <SleekHash value={mint} href={`https://solscan.io/token/${mint}`} label="Mint" />
                                 )}
                             </div>

                             <div className="flex gap-4">
                                {['Solscan', 'Birdeye', 'Dexscreener'].map((site) => (
                                   <a 
                                     key={site}
                                     href={mint ? `https://${site.toLowerCase()}.io/token/${mint}` : '#'}
                                     target="_blank"
                                     rel="noreferrer"
                                     className="text-[9px] uppercase font-bold tracking-widest text-neutral-600 hover:text-white transition-colors"
                                     onClick={(e) => e.stopPropagation()} // Prevent collapse when clicking links
                                   >
                                     {site}
                                   </a>
                                ))}
                             </div>
                          </div>
                      </div>
                    )}
                 </div>
              </SleekCard>
            );
          })}
        </div>
      </LayoutGroup>

      {hasMore && (
        <button
          type="button"
          onClick={toggleList}
          className="w-full py-3 rounded-sm border border-white/5 bg-white/5 text-[10px] uppercase font-bold tracking-[0.2em] text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          {isListExpanded ? "Collapse List" : `Show ${hiddenCount} more assets`}
        </button>
      )}

      {debug && (
        <details className="mt-4 border border-white/5 bg-black/50 p-4 rounded-sm text-xs text-neutral-500 font-mono">
          <summary className="cursor-pointer hover:text-white transition-colors">Raw Payload</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(rawOutput, null, 2)}</pre>
        </details>
      )}
    </div>
  );
}

// Main renderer wrapped in error boundary
const solanaBalancesRenderer: ToolNoteRenderer = ({ item, isExpanded: isListExpanded, onToggle: toggleList, debug = false }) => {
  return (
    <BalancesErrorBoundary>
      <SolanaBalancesInner 
        item={item} 
        isListExpanded={isListExpanded} 
        toggleList={toggleList} 
        debug={debug} 
      />
    </BalancesErrorBoundary>
  );
};

export default solanaBalancesRenderer;
