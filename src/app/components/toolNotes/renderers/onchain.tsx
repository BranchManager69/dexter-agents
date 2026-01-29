"use client";

import React, { useState } from "react";
import { 
  ActivityLogIcon, 
  RocketIcon, 
  ArrowDownIcon, 
  ArrowUpIcon,
  PersonIcon,
  ClockIcon,
  CheckCircledIcon,
  CrossCircledIcon,
} from "@radix-ui/react-icons";
import { motion, AnimatePresence } from "framer-motion";
import type { ToolNoteRenderer } from "./types";
import { normalizeOutput, unwrapStructured, formatTimestampDisplay } from "./helpers";
import { 
  SleekCard, 
  SleekLabel, 
  SleekHash, 
  MetricItem,
  SleekLoadingCard,
  SleekErrorCard,
  formatUsdPrecise,
} from "./sleekVisuals";

// --- Types ---

type WalletFlowSummary = {
  wallet: string;
  trades: number;
  netQuoteVolume: number;
  netBaseVolume: number;
  lastSeen: number;
};

type NormalizedTrade = {
  signature: string;
  wallet: string;
  side: "buy" | "sell";
  timestamp: number;
  pool?: string | null;
  source?: string | null;
  quoteSymbol?: string | null;
  quoteAbs: number;
  quoteSigned: number;
  baseSymbol?: string | null;
  baseAbs: number;
  baseSigned: number;
  priceUsd?: number | null;
};

type TokenActivitySummary = {
  mint: string;
  timeframeSeconds: number;
  tradeCount: number;
  uniqueWallets: number;
  quoteSymbols?: string[];
  primaryQuoteSymbol?: string | null;
  baseSymbols?: string[];
  primaryBaseSymbol?: string | null;
  buyQuoteVolume: number;
  sellQuoteVolume: number;
  netQuoteVolume: number;
  buyBaseVolume: number;
  sellBaseVolume: number;
  netBaseVolume: number;
  topNetBuyers?: WalletFlowSummary[];
  topNetSellers?: WalletFlowSummary[];
  largestTrades?: NormalizedTrade[];
  recentTrades?: NormalizedTrade[];
};

type WalletActivitySummary = {
  wallet: string;
  mint?: string;
  timeframeSeconds: number;
  tradeCount: number;
  quoteSymbols?: string[];
  primaryQuoteSymbol?: string | null;
  baseSymbols?: string[];
  primaryBaseSymbol?: string | null;
  buyQuoteVolume: number;
  sellQuoteVolume: number;
  netQuoteVolume: number;
  buyBaseVolume?: number;
  sellBaseVolume?: number;
  netBaseVolume?: number;
  incomingSol?: number;
  outgoingSol?: number;
  incomingBase?: number;
  outgoingBase?: number;
  netSolUsd?: number | null;
  netBaseUsd?: number | null;
  netUsdChange?: number | null;
  avgHoldSeconds?: number | null;
  trades?: NormalizedTrade[];
};

type TokenBalanceDelta = {
  owner: string;
  mint: string;
  delta: number;
  final: number;
};

type TradeInsight = {
  signature: string;
  timestamp?: number | null;
  slot?: number | null;
  err?: unknown;
  tokenBalanceDeltas?: TokenBalanceDelta[];
};

type OnchainPayload = {
  ok?: boolean;
  error?: string;
  message?: string;
  scope?: "token" | "wallet" | "trade";
  summary?: TokenActivitySummary | WalletActivitySummary | TradeInsight;
};

// --- Helpers ---

function formatTimeframe(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}

function formatVolume(value: number, decimals = 4): string {
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
  return value.toFixed(decimals);
}

function formatSol(value?: number): string {
  if (value === undefined || value === null || !Number.isFinite(value)) return "—";
  return `${formatVolume(value, 4)} SOL`;
}

function truncateAddress(address?: string, len = 6): string {
  if (!address) return "—";
  if (address.length <= len * 2 + 3) return address;
  return `${address.slice(0, len)}…${address.slice(-4)}`;
}

function relativeTime(timestamp?: number | null): string {
  if (!timestamp) return "—";
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// --- Volume Bar Component ---

function VolumeBar({ buy, sell, label }: { buy: number; sell: number; label?: string }) {
  const total = buy + sell;
  const buyPct = total > 0 ? (buy / total) * 100 : 50;
  const sellPct = total > 0 ? (sell / total) * 100 : 50;

  return (
    <div className="flex flex-col gap-2">
      {label && <SleekLabel>{label}</SleekLabel>}
      <div className="relative h-6 rounded-sm overflow-hidden bg-neutral-900 border border-white/5">
        <motion.div 
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500/60 to-emerald-500/30"
          initial={{ width: 0 }}
          animate={{ width: `${buyPct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
        <motion.div 
          className="absolute inset-y-0 right-0 bg-gradient-to-l from-rose-500/60 to-rose-500/30"
          initial={{ width: 0 }}
          animate={{ width: `${sellPct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
        <div className="absolute inset-0 flex items-center justify-between px-2 text-[10px] font-bold">
          <span className="text-emerald-300">{formatVolume(buy)}</span>
          <span className="text-rose-300">{formatVolume(sell)}</span>
        </div>
      </div>
      <div className="flex justify-between text-[9px] text-neutral-500">
        <span>BUY {buyPct.toFixed(0)}%</span>
        <span>SELL {sellPct.toFixed(0)}%</span>
      </div>
    </div>
  );
}

// --- Net Flow Indicator ---

function NetFlowIndicator({ value, symbol = "SOL" }: { value: number; symbol?: string }) {
  const isPositive = value > 0;
  const isNeutral = Math.abs(value) < 0.0001;

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-sm border ${
      isNeutral ? "bg-neutral-500/5 border-neutral-500/20" :
      isPositive ? "bg-emerald-500/5 border-emerald-500/20" : "bg-rose-500/5 border-rose-500/20"
    }`}>
      {!isNeutral && (
        isPositive ? <ArrowUpIcon className="w-4 h-4 text-emerald-400" /> : <ArrowDownIcon className="w-4 h-4 text-rose-400" />
      )}
      <div className="flex flex-col">
        <span className="text-[9px] uppercase text-neutral-500 tracking-wider">Net Flow</span>
        <span className={`text-sm font-bold tabular-nums ${
          isNeutral ? "text-neutral-400" : isPositive ? "text-emerald-400" : "text-rose-400"
        }`}>
          {isPositive ? "+" : ""}{formatVolume(value)} {symbol}
        </span>
      </div>
    </div>
  );
}

// --- Top Traders List ---

function TopTradersList({ 
  buyers, 
  sellers, 
  limit = 3 
}: { 
  buyers?: WalletFlowSummary[]; 
  sellers?: WalletFlowSummary[];
  limit?: number;
}) {
  const [showAll, setShowAll] = useState(false);
  const topBuyers = (buyers || []).slice(0, showAll ? 10 : limit);
  const topSellers = (sellers || []).slice(0, showAll ? 10 : limit);

  if (topBuyers.length === 0 && topSellers.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <SleekLabel>Top Traders</SleekLabel>
        {((buyers?.length || 0) > limit || (sellers?.length || 0) > limit) && (
          <button 
            onClick={() => setShowAll(!showAll)}
            className="text-[9px] text-neutral-500 hover:text-white transition-colors"
          >
            {showAll ? "Show Less" : "Show All"}
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {/* Buyers */}
        <div className="flex flex-col gap-2">
          <span className="text-[9px] text-emerald-400 uppercase tracking-wider flex items-center gap-1">
            <ArrowUpIcon className="w-3 h-3" /> Buyers
          </span>
          <AnimatePresence>
            {topBuyers.map((flow, idx) => (
              <motion.div 
                key={flow.wallet}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center justify-between p-2 rounded-sm bg-emerald-500/5 border border-emerald-500/10"
              >
                <a 
                  href={`https://solscan.io/account/${flow.wallet}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] font-mono text-neutral-400 hover:text-emerald-400 transition-colors"
                >
                  {truncateAddress(flow.wallet)}
                </a>
                <span className="text-[10px] text-emerald-400 font-bold tabular-nums">
                  +{formatVolume(flow.netBaseVolume, 2)}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Sellers */}
        <div className="flex flex-col gap-2">
          <span className="text-[9px] text-rose-400 uppercase tracking-wider flex items-center gap-1">
            <ArrowDownIcon className="w-3 h-3" /> Sellers
          </span>
          <AnimatePresence>
            {topSellers.map((flow, idx) => (
              <motion.div 
                key={flow.wallet}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center justify-between p-2 rounded-sm bg-rose-500/5 border border-rose-500/10"
              >
                <a 
                  href={`https://solscan.io/account/${flow.wallet}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] font-mono text-neutral-400 hover:text-rose-400 transition-colors"
                >
                  {truncateAddress(flow.wallet)}
                </a>
                <span className="text-[10px] text-rose-400 font-bold tabular-nums">
                  {formatVolume(flow.netBaseVolume, 2)}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// --- Recent Trades List ---

function RecentTradesList({ trades, limit = 5 }: { trades?: NormalizedTrade[]; limit?: number }) {
  const [expanded, setExpanded] = useState(false);
  const displayTrades = (trades || []).slice(0, expanded ? 20 : limit);

  if (displayTrades.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <SleekLabel>Recent Trades</SleekLabel>
        {(trades?.length || 0) > limit && (
          <button 
            onClick={() => setExpanded(!expanded)}
            className="text-[9px] text-neutral-500 hover:text-white transition-colors"
          >
            {expanded ? "Collapse" : `Show ${Math.min(20, trades!.length)} trades`}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto">
        {displayTrades.map((trade, idx) => (
          <motion.div
            key={trade.signature}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.02 }}
            className={`flex items-center justify-between p-2 rounded-sm border ${
              trade.side === "buy" 
                ? "bg-emerald-500/5 border-emerald-500/10" 
                : "bg-rose-500/5 border-rose-500/10"
            }`}
          >
            <div className="flex items-center gap-2">
              {trade.side === "buy" ? (
                <ArrowUpIcon className="w-3 h-3 text-emerald-400" />
              ) : (
                <ArrowDownIcon className="w-3 h-3 text-rose-400" />
              )}
              <a 
                href={`https://solscan.io/tx/${trade.signature}`}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] font-mono text-neutral-500 hover:text-white transition-colors"
              >
                {truncateAddress(trade.signature, 8)}
              </a>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-[10px] font-bold tabular-nums ${
                trade.side === "buy" ? "text-emerald-400" : "text-rose-400"
              }`}>
                {formatVolume(trade.quoteAbs, 4)} {trade.quoteSymbol || "SOL"}
              </span>
              <span className="text-[9px] text-neutral-600">{relativeTime(trade.timestamp)}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// --- Token Activity View ---

function TokenActivityView({ summary }: { summary: TokenActivitySummary }) {
  return (
    <div className="flex flex-col gap-5">
      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-3">
        <MetricItem 
          label="TRADES" 
          value={summary.tradeCount.toLocaleString()} 
        />
        <MetricItem 
          label="WALLETS" 
          value={summary.uniqueWallets.toLocaleString()} 
        />
        <MetricItem 
          label="TIMEFRAME" 
          value={formatTimeframe(summary.timeframeSeconds)} 
        />
      </div>

      {/* Volume Bar */}
      <VolumeBar 
        buy={summary.buyQuoteVolume} 
        sell={summary.sellQuoteVolume}
        label="VOLUME (SOL)"
      />

      {/* Net Flow */}
      <NetFlowIndicator value={summary.netQuoteVolume} />

      {/* Top Traders */}
      <TopTradersList 
        buyers={summary.topNetBuyers} 
        sellers={summary.topNetSellers} 
      />

      {/* Recent Trades */}
      <RecentTradesList trades={summary.recentTrades} />

      {/* Mint Address */}
      <div className="border-t border-white/5 pt-4">
        <SleekHash 
          value={summary.mint} 
          href={`https://solscan.io/token/${summary.mint}`}
          label="Token"
          truncate
        />
      </div>
    </div>
  );
}

// --- Wallet Activity View ---

function WalletActivityView({ summary }: { summary: WalletActivitySummary }) {
  const symbol = summary.primaryBaseSymbol || "TOKEN";

  return (
    <div className="flex flex-col gap-5">
      {/* Wallet Header */}
      <div className="flex items-center gap-3 p-3 rounded-sm bg-white/[0.02] border border-white/5">
        <div className="w-10 h-10 rounded-sm bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-white/10 flex items-center justify-center">
          <PersonIcon className="w-5 h-5 text-white/50" />
        </div>
        <div className="flex flex-col gap-1">
          <a 
            href={`https://solscan.io/account/${summary.wallet}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-mono text-white hover:text-violet-400 transition-colors"
          >
            {truncateAddress(summary.wallet, 8)}
          </a>
          <span className="text-[10px] text-neutral-500">
            {formatTimeframe(summary.timeframeSeconds)} activity window
          </span>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricItem label="TRADES" value={summary.tradeCount.toLocaleString()} />
        <MetricItem label="BUY VOL" value={formatSol(summary.buyQuoteVolume)} />
        <MetricItem label="SELL VOL" value={formatSol(summary.sellQuoteVolume)} />
        <MetricItem 
          label="NET SOL" 
          value={formatSol(summary.netQuoteVolume)}
          className={summary.netQuoteVolume > 0 ? "text-emerald-400" : summary.netQuoteVolume < 0 ? "text-rose-400" : ""}
        />
      </div>

      {/* Net USD if available */}
      {summary.netUsdChange !== undefined && summary.netUsdChange !== null && (
        <div className={`p-3 rounded-sm border ${
          summary.netUsdChange >= 0 
            ? "bg-emerald-500/5 border-emerald-500/20" 
            : "bg-rose-500/5 border-rose-500/20"
        }`}>
          <SleekLabel>NET P&L</SleekLabel>
          <span className={`text-xl font-bold ${
            summary.netUsdChange >= 0 ? "text-emerald-400" : "text-rose-400"
          }`}>
            {summary.netUsdChange >= 0 ? "+" : ""}{formatUsdPrecise(summary.netUsdChange)}
          </span>
        </div>
      )}

      {/* Trade List */}
      <RecentTradesList trades={summary.trades} />

      {/* Token Link */}
      {summary.mint && (
        <div className="border-t border-white/5 pt-4">
          <SleekHash 
            value={summary.mint} 
            href={`https://solscan.io/token/${summary.mint}`}
            label="Token"
            truncate
          />
        </div>
      )}
    </div>
  );
}

// --- Trade Insight View ---

function TradeInsightView({ summary }: { summary: TradeInsight }) {
  const hasError = summary.err !== null && summary.err !== undefined;
  const deltas = summary.tokenBalanceDeltas || [];

  return (
    <div className="flex flex-col gap-5">
      {/* Transaction Status */}
      <div className={`flex items-center gap-3 p-3 rounded-sm border ${
        hasError 
          ? "bg-rose-500/5 border-rose-500/20" 
          : "bg-emerald-500/5 border-emerald-500/20"
      }`}>
        {hasError ? (
          <CrossCircledIcon className="w-5 h-5 text-rose-400" />
        ) : (
          <CheckCircledIcon className="w-5 h-5 text-emerald-400" />
        )}
        <div className="flex flex-col">
          <span className={`text-sm font-semibold ${hasError ? "text-rose-400" : "text-emerald-400"}`}>
            {hasError ? "Transaction Failed" : "Transaction Confirmed"}
          </span>
          {summary.slot && (
            <span className="text-[10px] text-neutral-500">Slot {summary.slot.toLocaleString()}</span>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <MetricItem 
          label="TIMESTAMP" 
          value={summary.timestamp ? new Date(summary.timestamp * 1000).toLocaleString() : "—"} 
        />
        <MetricItem 
          label="BALANCE CHANGES" 
          value={deltas.length.toString()} 
        />
      </div>

      {/* Balance Deltas */}
      {deltas.length > 0 && (
        <div className="flex flex-col gap-2">
          <SleekLabel>Token Balance Changes</SleekLabel>
          <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto">
            {deltas.map((delta, idx) => (
              <motion.div
                key={`${delta.owner}-${delta.mint}-${idx}`}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className={`flex items-center justify-between p-2 rounded-sm border ${
                  delta.delta >= 0 
                    ? "bg-emerald-500/5 border-emerald-500/10" 
                    : "bg-rose-500/5 border-rose-500/10"
                }`}
              >
                <div className="flex flex-col gap-0.5">
                  <a 
                    href={`https://solscan.io/account/${delta.owner}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-mono text-neutral-400 hover:text-white transition-colors"
                  >
                    {truncateAddress(delta.owner)}
                  </a>
                  <a 
                    href={`https://solscan.io/token/${delta.mint}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[9px] font-mono text-neutral-600 hover:text-neutral-400 transition-colors"
                  >
                    {truncateAddress(delta.mint, 8)}
                  </a>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <span className={`text-[10px] font-bold tabular-nums ${
                    delta.delta >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}>
                    {delta.delta >= 0 ? "+" : ""}{formatVolume(delta.delta, 4)}
                  </span>
                  <span className="text-[9px] text-neutral-600">
                    Final: {formatVolume(delta.final, 4)}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Signature */}
      <div className="border-t border-white/5 pt-4">
        <SleekHash 
          value={summary.signature} 
          href={`https://solscan.io/tx/${summary.signature}`}
          label="Transaction"
          truncate
        />
      </div>
    </div>
  );
}

// --- Scope Badge ---

function ScopeBadge({ scope }: { scope: "token" | "wallet" | "trade" }) {
  const configs = {
    token: { icon: <RocketIcon className="w-3 h-3" />, label: "Token", className: "bg-violet-500/10 border-violet-500/20 text-violet-400" },
    wallet: { icon: <PersonIcon className="w-3 h-3" />, label: "Wallet", className: "bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-400" },
    trade: { icon: <ActivityLogIcon className="w-3 h-3" />, label: "Trade", className: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" },
  };
  const config = configs[scope];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm border text-[9px] font-bold uppercase tracking-wider ${config.className}`}>
      {config.icon}
      {config.label}
    </span>
  );
}

// --- Main Renderers ---

const onchainActivityRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput) as OnchainPayload;
  const timestamp = formatTimestampDisplay(item.timestamp);

  // Loading state
  if (item.status === "IN_PROGRESS" && !payload.ok && !payload.error) {
    return <SleekLoadingCard />;
  }

  // Error state
  if (payload.ok === false || payload.error) {
    return <SleekErrorCard message={payload.error || payload.message || "Activity lookup failed"} />;
  }

  const scope = payload.scope || "token";
  const summary = payload.summary;

  if (!summary) {
    return <SleekErrorCard message="No activity data available" />;
  }

  return (
    <SleekCard className="relative overflow-visible p-6 flex flex-col gap-5">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ActivityLogIcon className="w-4 h-4 text-violet-400" />
          <SleekLabel>On-Chain Activity</SleekLabel>
        </div>
        <div className="flex items-center gap-3">
          <ScopeBadge scope={scope} />
          {timestamp && <span className="text-[10px] text-neutral-600 font-mono">{timestamp}</span>}
        </div>
      </header>

      {/* Content based on scope */}
      {scope === "token" && <TokenActivityView summary={summary as TokenActivitySummary} />}
      {scope === "wallet" && <WalletActivityView summary={summary as WalletActivitySummary} />}
      {scope === "trade" && <TradeInsightView summary={summary as TradeInsight} />}

      {/* Debug View */}
      {debug && (
        <details className="mt-2 border border-white/5 bg-black/50 p-4 rounded-sm text-xs text-neutral-500 font-mono">
          <summary className="cursor-pointer hover:text-white transition-colors">Raw Payload</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(rawOutput, null, 2)}</pre>
        </details>
      )}
    </SleekCard>
  );
};

// Entity Insight uses the same renderer since it returns the same structure
const onchainEntityRenderer: ToolNoteRenderer = onchainActivityRenderer;

export { onchainActivityRenderer, onchainEntityRenderer };
