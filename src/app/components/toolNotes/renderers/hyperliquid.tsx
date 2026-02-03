"use client";

import React, { useState } from "react";
import { 
  RocketIcon,
  CheckCircledIcon,
  CrossCircledIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  GlobeIcon,
  CopyIcon,
  LightningBoltIcon,
  BarChartIcon,
  TargetIcon,
  LayersIcon,
  MixerHorizontalIcon,
} from "@radix-ui/react-icons";
import { motion, AnimatePresence } from "framer-motion";
import type { ToolNoteRenderer } from "./types";
import { normalizeOutput, unwrapStructured, formatTimestampDisplay } from "./helpers";
import { 
  SleekCard, 
  SleekLabel, 
  MetricItem,
  SleekLoadingCard,
  SleekErrorCard,
  formatUsdPrecise,
} from "./sleekVisuals";

// --- Types ---

type HyperliquidMarket = {
  name?: string;
  symbol?: string;
  coin?: string;
  maxLeverage?: number;
  fundingRate?: number;
  openInterest?: number;
  dayVolume?: number;
  volume24h?: number;
  price?: number;
  markPx?: number;
  midPx?: number;
  premium?: number;
  dayChange?: number;
  prevDayPx?: number;
};

type HyperliquidAgent = {
  id?: string;
  managedWalletPublicKey?: string;
  agentWalletAddress?: string;
  status?: string;
  validUntil?: string;
  metadata?: Record<string, unknown>;
  capabilities?: string[];
};

type FundStep = {
  step: string;
  status: string;
  signature?: string;
  amount?: number;
  txHash?: string;
};

type FundResult = {
  solSignature?: string;
  usdcAmount?: number;
  bridgeStatus?: string;
  steps?: FundStep[];
  estimatedArrival?: string;
};

type DepositResult = {
  txHash?: string;
  amountUsd?: number;
  status?: string;
  timestamp?: string;
};

type TradeResult = {
  orderId?: string;
  symbol?: string;
  coin?: string;
  side?: string;
  size?: number;
  sizeDelta?: number;
  price?: number;
  avgPrice?: number;
  filledSize?: number;
  status?: string;
  timestamp?: string;
  leverage?: number;
  marginUsed?: number;
  fee?: number;
  pnl?: number;
  reduceOnly?: boolean;
};

type HyperliquidPayload = {
  ok?: boolean;
  error?: string;
  markets?: HyperliquidMarket[];
  agent?: HyperliquidAgent;
  result?: FundResult | DepositResult | TradeResult;
};

// --- Helpers ---

function formatNumber(value?: number, decimals = 2): string {
  if (value === undefined || value === null || !Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(decimals)}B`;
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(decimals)}M`;
  if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(decimals)}K`;
  return value.toFixed(decimals);
}

function formatPercent(value?: number, includeSign = true): string {
  if (value === undefined || value === null || !Number.isFinite(value)) return "—";
  const pct = value * 100;
  const sign = includeSign && pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(4)}%`;
}

function formatPriceChange(current?: number, prev?: number): { change: number; pct: number } | null {
  if (!current || !prev || !Number.isFinite(current) || !Number.isFinite(prev)) return null;
  const change = current - prev;
  const pct = (change / prev) * 100;
  return { change, pct };
}

function truncateAddress(address?: string, len = 8): string {
  if (!address) return "—";
  if (address.length <= len * 2 + 3) return address;
  return `${address.slice(0, len)}...${address.slice(-4)}`;
}

// --- Hyperliquid Animated Logo ---

const HyperliquidLogo = ({ size = 24, animate = false }: { size?: number; animate?: boolean }) => (
  <motion.div 
    className="rounded-sm bg-gradient-to-br from-emerald-400 via-cyan-400 to-emerald-500 flex items-center justify-center font-black text-black shadow-lg shadow-emerald-500/20"
    style={{ width: size, height: size, fontSize: size * 0.4 }}
    animate={animate ? { 
      boxShadow: [
        "0 4px 14px 0 rgba(16,185,129,0.2)",
        "0 4px 20px 0 rgba(16,185,129,0.4)",
        "0 4px 14px 0 rgba(16,185,129,0.2)",
      ]
    } : undefined}
    transition={animate ? { duration: 2, repeat: Infinity } : undefined}
  >
    HL
  </motion.div>
);

// --- Status Badge ---

function HLStatusBadge({ status, showIcon = true }: { status: string; showIcon?: boolean }) {
  const configs: Record<string, { className: string; icon?: React.ReactNode }> = {
    active: { className: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400", icon: <CheckCircledIcon className="w-3 h-3" /> },
    pending: { className: "bg-amber-500/10 border-amber-500/20 text-amber-400", icon: <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" /> },
    success: { className: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400", icon: <CheckCircledIcon className="w-3 h-3" /> },
    failed: { className: "bg-rose-500/10 border-rose-500/20 text-rose-400", icon: <CrossCircledIcon className="w-3 h-3" /> },
    filled: { className: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400", icon: <CheckCircledIcon className="w-3 h-3" /> },
    partial: { className: "bg-amber-500/10 border-amber-500/20 text-amber-400" },
    bridging: { className: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400", icon: <LightningBoltIcon className="w-3 h-3" /> },
  };

  const config = configs[status.toLowerCase()] || configs.pending;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm border text-[9px] font-bold uppercase tracking-wider ${config.className}`}>
      {showIcon && config.icon}
      {status}
    </span>
  );
}

// --- Mini Sparkline Component ---

function MiniSparkline({ data, color = "emerald" }: { data: number[]; color?: "emerald" | "rose" | "cyan" }) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 60;
    const y = 20 - ((v - min) / range) * 16;
    return `${x},${y}`;
  }).join(" ");

  const colors = {
    emerald: { stroke: "#10b981", fill: "url(#sparkline-grad-emerald)" },
    rose: { stroke: "#f43f5e", fill: "url(#sparkline-grad-rose)" },
    cyan: { stroke: "#06b6d4", fill: "url(#sparkline-grad-cyan)" },
  };

  const c = colors[color];

  return (
    <svg width="60" height="20" className="overflow-visible">
      <defs>
        <linearGradient id="sparkline-grad-emerald" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="sparkline-grad-rose" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="sparkline-grad-cyan" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon 
        points={`0,20 ${points} 60,20`} 
        fill={c.fill}
      />
      <polyline 
        points={points} 
        fill="none" 
        stroke={c.stroke} 
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// --- Funding Rate Indicator ---

function FundingRateIndicator({ rate, size = "md" }: { rate: number; size?: "sm" | "md" }) {
  const isPositive = rate >= 0;
  const absRate = Math.abs(rate * 100);
  const intensity = Math.min(absRate / 0.05, 1); // Cap at 0.05% for max intensity

  return (
    <div className={`flex items-center gap-1 ${size === "sm" ? "text-[10px]" : "text-xs"}`}>
      <motion.div
        className={`w-1.5 h-1.5 rounded-full ${isPositive ? "bg-emerald-400" : "bg-rose-400"}`}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{ opacity: 0.5 + intensity * 0.5 }}
      />
      <span className={isPositive ? "text-emerald-400" : "text-rose-400"}>
        {formatPercent(rate)}
      </span>
    </div>
  );
}

// --- Market Card ---

function MarketCard({ market, index }: { market: HyperliquidMarket; index: number }) {
  const symbol = market.symbol || market.coin || market.name || "—";
  const price = market.price || market.markPx || market.midPx;
  const volume = market.dayVolume || market.volume24h;
  const change = market.dayChange !== undefined 
    ? { pct: market.dayChange }
    : market.prevDayPx && price 
      ? formatPriceChange(price, market.prevDayPx)
      : null;
  const isPositive = change && change.pct >= 0;

  // Generate fake sparkline data based on change (in real app, this would come from API)
  const sparklineData = Array.from({ length: 12 }, (_, i) => {
    const base = price || 100;
    const variance = base * 0.02;
    return base + (Math.random() - 0.5) * variance;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      className="p-3 rounded-sm bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-emerald-500/20 transition-all cursor-pointer group"
    >
      <div className="flex items-center justify-between gap-4">
        {/* Symbol & Leverage */}
        <div className="flex items-center gap-3 min-w-[100px]">
          <span className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
            {symbol}
          </span>
          {market.maxLeverage && (
            <span className="px-1.5 py-0.5 rounded-sm bg-cyan-500/10 text-[8px] text-cyan-400 font-bold">
              {market.maxLeverage}x
            </span>
          )}
        </div>

        {/* Price & Change */}
        <div className="flex items-center gap-3 flex-1 justify-center">
          <span className="text-sm font-mono text-white tabular-nums">
            ${formatNumber(price, price && price < 1 ? 6 : 2)}
          </span>
          {change && (
            <span className={`text-[10px] font-bold tabular-nums ${
              isPositive ? "text-emerald-400" : "text-rose-400"
            }`}>
              {isPositive ? "+" : ""}{change.pct.toFixed(2)}%
            </span>
          )}
        </div>

        {/* Sparkline */}
        <div className="hidden sm:block">
          <MiniSparkline 
            data={sparklineData} 
            color={isPositive === undefined ? "cyan" : isPositive ? "emerald" : "rose"} 
          />
        </div>

        {/* Funding & Volume */}
        <div className="flex items-center gap-4 text-[10px] min-w-[140px] justify-end">
          {market.fundingRate !== undefined && (
            <FundingRateIndicator rate={market.fundingRate} size="sm" />
          )}
          {volume && (
            <span className="text-neutral-500">${formatNumber(volume)}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// --- Markets List Renderer ---

const hyperliquidMarketsRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const [sortBy, setSortBy] = useState<"volume" | "funding" | "name">("volume");
  const [showAll, setShowAll] = useState(false);
  
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput) as HyperliquidPayload;
  const timestamp = formatTimestampDisplay(item.timestamp);

  if (item.status === "IN_PROGRESS") return <SleekLoadingCard />;
  
  if (payload.error || payload.ok === false) {
    return <SleekErrorCard message={payload.error || "Failed to fetch markets"} />;
  }

  let markets = [...(payload.markets || [])];
  
  // Sort markets
  if (sortBy === "volume") {
    markets.sort((a, b) => (b.dayVolume || b.volume24h || 0) - (a.dayVolume || a.volume24h || 0));
  } else if (sortBy === "funding") {
    markets.sort((a, b) => Math.abs(b.fundingRate || 0) - Math.abs(a.fundingRate || 0));
  } else {
    markets.sort((a, b) => (a.symbol || a.name || "").localeCompare(b.symbol || b.name || ""));
  }

  const displayMarkets = showAll ? markets : markets.slice(0, 10);
  
  // Aggregate stats
  const totalVolume = markets.reduce((acc, m) => acc + (m.dayVolume || m.volume24h || 0), 0);
  const totalOI = markets.reduce((acc, m) => acc + (m.openInterest || 0), 0);
  const avgFunding = markets.length > 0 
    ? markets.reduce((acc, m) => acc + (m.fundingRate || 0), 0) / markets.length 
    : 0;

  return (
    <SleekCard className="relative overflow-visible p-6 flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HyperliquidLogo animate />
          <SleekLabel>Hyperliquid Markets</SleekLabel>
        </div>
        <span className="text-xs font-bold text-emerald-400">{markets.length} markets</span>
      </header>

      {/* Aggregate Stats */}
      <div className="grid grid-cols-3 gap-3">
        <motion.div 
          className="p-3 rounded-sm bg-gradient-to-br from-emerald-500/5 to-cyan-500/5 border border-emerald-500/20"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="text-[9px] text-neutral-500 uppercase block mb-1">24h Volume</span>
          <span className="text-lg font-bold text-emerald-400">${formatNumber(totalVolume)}</span>
        </motion.div>
        <motion.div 
          className="p-3 rounded-sm bg-gradient-to-br from-cyan-500/5 to-blue-500/5 border border-cyan-500/20"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <span className="text-[9px] text-neutral-500 uppercase block mb-1">Open Interest</span>
          <span className="text-lg font-bold text-cyan-400">${formatNumber(totalOI)}</span>
        </motion.div>
        <motion.div 
          className="p-3 rounded-sm bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 border border-violet-500/20"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <span className="text-[9px] text-neutral-500 uppercase block mb-1">Avg Funding</span>
          <FundingRateIndicator rate={avgFunding} />
        </motion.div>
      </div>

      {/* Sort Controls */}
      <div className="flex items-center gap-2">
        <span className="text-[9px] text-neutral-500 uppercase">Sort by:</span>
        {(["volume", "funding", "name"] as const).map(s => (
          <button
            key={s}
            onClick={() => setSortBy(s)}
            className={`px-2 py-1 rounded-sm text-[9px] uppercase font-bold transition-colors ${
              sortBy === s 
                ? "bg-emerald-500/20 text-emerald-400" 
                : "bg-white/5 text-neutral-500 hover:text-white"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Markets List */}
      {markets.length === 0 ? (
        <div className="p-6 text-center">
          <GlobeIcon className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
          <p className="text-sm text-neutral-500">No markets available</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1 max-h-[400px] overflow-y-auto">
          {/* Header row */}
          <div className="flex items-center justify-between gap-4 px-3 py-2 text-[9px] text-neutral-500 uppercase border-b border-white/5">
            <span className="min-w-[100px]">Market</span>
            <span className="flex-1 text-center">Price</span>
            <span className="hidden sm:block w-[60px]">Chart</span>
            <span className="min-w-[140px] text-right">Funding / Volume</span>
          </div>
          
          {displayMarkets.map((market, idx) => (
            <MarketCard key={market.symbol || market.name || idx} market={market} index={idx} />
          ))}
          
          {markets.length > 10 && !showAll && (
            <button
              onClick={() => setShowAll(true)}
              className="mt-2 p-2 text-center text-[10px] text-neutral-500 hover:text-emerald-400 transition-colors"
            >
              Show all {markets.length} markets
            </button>
          )}
        </div>
      )}

      {debug && (
        <details className="mt-2 border border-white/5 bg-black/50 p-4 rounded-sm text-xs text-neutral-500 font-mono">
          <summary className="cursor-pointer hover:text-white transition-colors">Raw Payload</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(rawOutput, null, 2)}</pre>
        </details>
      )}
    </SleekCard>
  );
};

// --- Opt-in Renderer ---

const hyperliquidOptInRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput) as HyperliquidPayload;
  const timestamp = formatTimestampDisplay(item.timestamp);

  if (item.status === "IN_PROGRESS") return <SleekLoadingCard />;
  
  if (payload.error || payload.ok === false) {
    return <SleekErrorCard message={payload.error || "Opt-in failed"} />;
  }

  const agent = payload.agent;
  if (!agent) {
    return <SleekErrorCard message="No agent data returned" />;
  }

  const capabilities = agent.capabilities || ["trade", "deposit", "withdraw"];

  return (
    <SleekCard className="relative overflow-visible p-6 flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HyperliquidLogo animate />
          <SleekLabel>Hyperliquid Opt-In</SleekLabel>
        </div>
        <HLStatusBadge status={agent.status || "active"} />
      </header>

      {/* Success Animation */}
      <motion.div 
        className="p-6 rounded-sm bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-emerald-500/10 border border-emerald-500/30 relative overflow-hidden"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        {/* Animated rings */}
        <motion.div
          className="absolute inset-0 rounded-sm border-2 border-emerald-400/20"
          animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        
        <div className="flex items-center gap-4 relative">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <HyperliquidLogo size={48} />
          </motion.div>
          <div>
            <span className="text-lg font-bold text-emerald-400">Agent Provisioned!</span>
            <p className="text-xs text-neutral-400">Your Hyperliquid trading agent is ready</p>
          </div>
        </div>
      </motion.div>

      {/* Capabilities */}
      <div className="flex flex-col gap-2">
        <SleekLabel>CAPABILITIES</SleekLabel>
        <div className="flex flex-wrap gap-2">
          {capabilities.map((cap, idx) => (
            <motion.span
              key={cap}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className="px-2 py-1 rounded-sm bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 uppercase font-bold"
            >
              {cap}
            </motion.span>
          ))}
        </div>
      </div>

      {/* Agent Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3 rounded-sm bg-white/[0.02] border border-white/5">
          <SleekLabel>AGENT WALLET</SleekLabel>
          <div className="flex items-center justify-between mt-1">
            <code className="text-xs font-mono text-neutral-300">
              {truncateAddress(agent.agentWalletAddress, 12)}
            </code>
            {agent.agentWalletAddress && (
              <button
                onClick={() => navigator.clipboard.writeText(agent.agentWalletAddress!)}
                className="text-neutral-500 hover:text-white transition-colors"
              >
                <CopyIcon className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        <div className="p-3 rounded-sm bg-white/[0.02] border border-white/5">
          <SleekLabel>VALID UNTIL</SleekLabel>
          <span className="text-sm text-white mt-1 block">
            {agent.validUntil ? new Date(agent.validUntil).toLocaleDateString() : "Indefinite"}
          </span>
        </div>
      </div>

      {/* Managed Wallet */}
      {agent.managedWalletPublicKey && (
        <div className="p-3 rounded-sm bg-gradient-to-r from-cyan-500/5 to-emerald-500/5 border border-cyan-500/20">
          <div className="flex items-center justify-between">
            <div>
              <SleekLabel>MANAGED WALLET (SOLANA)</SleekLabel>
              <code className="text-[10px] font-mono text-neutral-400 block mt-1">
                {truncateAddress(agent.managedWalletPublicKey, 16)}
              </code>
            </div>
            <a
              href={`https://solscan.io/account/${agent.managedWalletPublicKey}`}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-neutral-500 hover:text-cyan-400 transition-colors"
            >
              View ↗
            </a>
          </div>
        </div>
      )}

      {debug && (
        <details className="mt-2 border border-white/5 bg-black/50 p-4 rounded-sm text-xs text-neutral-500 font-mono">
          <summary className="cursor-pointer hover:text-white transition-colors">Raw Payload</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(rawOutput, null, 2)}</pre>
        </details>
      )}
    </SleekCard>
  );
};

// --- Fund Flow Visualization ---

function FundFlowStep({ step, index, isLast }: { step: FundStep; index: number; isLast: boolean }) {
  const isComplete = step.status === "completed" || step.status === "success";
  const isPending = step.status === "pending" || step.status === "processing";

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.15 }}
      className="flex items-center gap-3"
    >
      {/* Step indicator */}
      <div className="flex flex-col items-center">
        <motion.div
          className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isComplete 
              ? "bg-emerald-500/20 border-2 border-emerald-500" 
              : isPending 
                ? "bg-amber-500/20 border-2 border-amber-500" 
                : "bg-neutral-800 border-2 border-neutral-600"
          }`}
          animate={isPending ? { scale: [1, 1.1, 1] } : undefined}
          transition={{ duration: 1, repeat: Infinity }}
        >
          {isComplete ? (
            <CheckCircledIcon className="w-4 h-4 text-emerald-400" />
          ) : isPending ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <LightningBoltIcon className="w-4 h-4 text-amber-400" />
            </motion.div>
          ) : (
            <span className="text-xs text-neutral-500">{index + 1}</span>
          )}
        </motion.div>
        {!isLast && (
          <motion.div 
            className={`w-0.5 h-8 ${isComplete ? "bg-emerald-500" : "bg-neutral-700"}`}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ delay: index * 0.15 + 0.1 }}
          />
        )}
      </div>

      {/* Step content */}
      <div className="flex-1 pb-6">
        <div className="flex items-center justify-between">
          <span className="text-sm text-white font-medium">{step.step}</span>
          <HLStatusBadge status={step.status} showIcon={false} />
        </div>
        {step.amount && (
          <span className="text-[10px] text-neutral-500 mt-1 block">
            ${formatNumber(step.amount, 2)} USDC
          </span>
        )}
        {step.signature && (
          <a
            href={`https://solscan.io/tx/${step.signature}`}
            target="_blank"
            rel="noreferrer"
            className="text-[9px] text-neutral-600 hover:text-cyan-400 mt-1 block transition-colors"
          >
            {truncateAddress(step.signature, 8)} ↗
          </a>
        )}
      </div>
    </motion.div>
  );
}

// --- Fund Renderer ---

const hyperliquidFundRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput) as HyperliquidPayload;
  const timestamp = formatTimestampDisplay(item.timestamp);

  if (item.status === "IN_PROGRESS") return <SleekLoadingCard />;
  
  if (payload.error || payload.ok === false) {
    return <SleekErrorCard message={payload.error || "Funding failed"} />;
  }

  const result = payload.result as FundResult | undefined;
  const steps = result?.steps || [];

  return (
    <SleekCard className="relative overflow-visible p-6 flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HyperliquidLogo animate />
          <SleekLabel>Fund Hyperliquid</SleekLabel>
        </div>
        <HLStatusBadge status={result?.bridgeStatus || "success"} />
      </header>

      {/* Bridge Visualization */}
      <div className="p-4 rounded-sm bg-gradient-to-r from-violet-500/5 via-emerald-500/5 to-cyan-500/5 border border-emerald-500/20">
        <div className="flex items-center justify-between">
          {/* Source: Solana */}
          <motion.div 
            className="flex flex-col items-center gap-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">SOL</span>
            </div>
            <span className="text-[9px] text-neutral-500">Solana</span>
          </motion.div>

          {/* Arrow 1 */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: 0.2 }}
            className="flex-1 flex items-center justify-center"
          >
            <motion.div
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <ArrowRightIcon className="w-5 h-5 text-neutral-600" />
            </motion.div>
          </motion.div>

          {/* USDC */}
          <motion.div 
            className="flex flex-col items-center gap-2"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">USDC</span>
            </div>
            <span className="text-[9px] text-neutral-500">Arbitrum</span>
          </motion.div>

          {/* Arrow 2 */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: 0.4 }}
            className="flex-1 flex items-center justify-center"
          >
            <motion.div
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.5 }}
            >
              <ArrowRightIcon className="w-5 h-5 text-neutral-600" />
            </motion.div>
          </motion.div>

          {/* Destination: Hyperliquid */}
          <motion.div 
            className="flex flex-col items-center gap-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <HyperliquidLogo size={48} animate />
            <span className="text-[9px] text-neutral-500">Hyperliquid</span>
          </motion.div>
        </div>
      </div>

      {/* Amount */}
      {result?.usdcAmount && (
        <motion.div 
          className="text-center p-4 rounded-sm bg-emerald-500/5 border border-emerald-500/20"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <span className="text-[9px] text-neutral-500 uppercase block mb-1">Amount Funded</span>
          <span className="text-3xl font-black text-emerald-400">${formatNumber(result.usdcAmount, 2)}</span>
        </motion.div>
      )}

      {/* Steps Timeline */}
      {steps.length > 0 && (
        <div className="flex flex-col gap-0">
          <SleekLabel>BRIDGE STEPS</SleekLabel>
          <div className="mt-3">
            {steps.map((step, idx) => (
              <FundFlowStep 
                key={step.step} 
                step={step} 
                index={idx} 
                isLast={idx === steps.length - 1} 
              />
            ))}
          </div>
        </div>
      )}

      {/* ETA */}
      {result?.estimatedArrival && (
        <div className="flex items-center justify-center gap-2 text-[10px] text-neutral-500">
          <LayersIcon className="w-3 h-3" />
          <span>Est. arrival: {result.estimatedArrival}</span>
        </div>
      )}

      {debug && (
        <details className="mt-2 border border-white/5 bg-black/50 p-4 rounded-sm text-xs text-neutral-500 font-mono">
          <summary className="cursor-pointer hover:text-white transition-colors">Raw Payload</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(rawOutput, null, 2)}</pre>
        </details>
      )}
    </SleekCard>
  );
};

// --- Bridge Deposit Renderer ---

const hyperliquidDepositRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput) as HyperliquidPayload;
  const timestamp = formatTimestampDisplay(item.timestamp);

  if (item.status === "IN_PROGRESS") return <SleekLoadingCard />;
  
  if (payload.error || payload.ok === false) {
    return <SleekErrorCard message={payload.error || "Deposit failed"} />;
  }

  const result = payload.result as DepositResult | undefined;

  return (
    <SleekCard className="relative overflow-visible p-6 flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HyperliquidLogo />
          <SleekLabel>Bridge Deposit</SleekLabel>
        </div>
        <HLStatusBadge status={result?.status || "success"} />
      </header>

      {/* Deposit Visual */}
      <motion.div 
        className="p-6 rounded-sm bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 border border-cyan-500/30 relative overflow-hidden"
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
      >
        {/* Animated deposit effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-b from-emerald-500/20 to-transparent"
          animate={{ y: ["100%", "-100%"] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />

        <div className="relative">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="flex flex-col items-center">
              <span className="text-neutral-400 text-sm">L2</span>
              <span className="text-[9px] text-neutral-500">(Arbitrum)</span>
            </div>
            <motion.div
              animate={{ x: [0, 10, 0], rotate: [0, 10, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <ArrowRightIcon className="w-6 h-6 text-cyan-400" />
            </motion.div>
            <div className="flex flex-col items-center">
              <span className="text-emerald-400 font-bold text-sm">L1</span>
              <span className="text-[9px] text-neutral-500">(Hyperliquid)</span>
            </div>
          </div>
          
          {result?.amountUsd && (
            <div className="text-center">
              <motion.span 
                className="text-4xl font-black text-white"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
              >
                ${formatNumber(result.amountUsd, 2)}
              </motion.span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Tx Hash */}
      {result?.txHash && (
        <div className="p-3 rounded-sm bg-white/[0.02] border border-white/5">
          <SleekLabel>TRANSACTION HASH</SleekLabel>
          <div className="flex items-center justify-between mt-1">
            <code className="text-xs font-mono text-neutral-300">
              {truncateAddress(result.txHash, 16)}
            </code>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigator.clipboard.writeText(result.txHash!)}
                className="text-neutral-500 hover:text-white transition-colors"
              >
                <CopyIcon className="w-3 h-3" />
              </button>
              <a
                href={`https://arbiscan.io/tx/${result.txHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-neutral-500 hover:text-cyan-400 transition-colors text-[10px]"
              >
                View ↗
              </a>
            </div>
          </div>
        </div>
      )}

      {debug && (
        <details className="mt-2 border border-white/5 bg-black/50 p-4 rounded-sm text-xs text-neutral-500 font-mono">
          <summary className="cursor-pointer hover:text-white transition-colors">Raw Payload</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(rawOutput, null, 2)}</pre>
        </details>
      )}
    </SleekCard>
  );
};

// --- Perp Trade Renderer ---

const hyperliquidPerpTradeRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput) as HyperliquidPayload;
  const timestamp = formatTimestampDisplay(item.timestamp);

  if (item.status === "IN_PROGRESS") return <SleekLoadingCard />;
  
  if (payload.error || payload.ok === false) {
    return <SleekErrorCard message={payload.error || "Trade failed"} />;
  }

  const result = payload.result as TradeResult | undefined;
  const isBuy = result?.side?.toLowerCase() === "buy" || result?.side?.toLowerCase() === "long";
  const symbol = result?.symbol || result?.coin;
  const size = result?.size || result?.sizeDelta;
  const price = result?.price || result?.avgPrice;

  return (
    <SleekCard className="relative overflow-visible p-6 flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HyperliquidLogo />
          <SleekLabel>Perp Trade</SleekLabel>
        </div>
        <HLStatusBadge status={result?.status || "filled"} />
      </header>

      {/* Trade Hero */}
      <motion.div 
        className={`p-5 rounded-sm border relative overflow-hidden ${
          isBuy 
            ? "bg-gradient-to-br from-emerald-500/10 to-green-500/10 border-emerald-500/30" 
            : "bg-gradient-to-br from-rose-500/10 to-red-500/10 border-rose-500/30"
        }`}
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
      >
        {/* Background pulse */}
        <motion.div
          className={`absolute inset-0 ${isBuy ? "bg-emerald-500" : "bg-rose-500"}`}
          animate={{ opacity: [0.05, 0.1, 0.05] }}
          transition={{ duration: 2, repeat: Infinity }}
        />

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              {isBuy ? (
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <ArrowUpIcon className="w-6 h-6 text-emerald-400" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center">
                  <ArrowDownIcon className="w-6 h-6 text-rose-400" />
                </div>
              )}
            </motion.div>
            <div>
              <span className={`text-2xl font-black ${isBuy ? "text-emerald-400" : "text-rose-400"}`}>
                {result?.side?.toUpperCase()}
              </span>
              <span className="text-xl font-bold text-white ml-2">{symbol}</span>
              <p className="text-[10px] text-neutral-500">Perpetual Contract</p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[9px] text-neutral-500 uppercase block">Size</span>
            <span className="text-xl font-bold text-white tabular-nums">{formatNumber(size, 4)}</span>
          </div>
        </div>
      </motion.div>

      {/* Trade Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <motion.div 
          className="p-3 rounded-sm bg-white/[0.02] border border-white/5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="text-[9px] text-neutral-500 uppercase block mb-1">Entry Price</span>
          <span className="text-sm font-bold text-white tabular-nums">
            ${formatNumber(price, price && price < 1 ? 6 : 2)}
          </span>
        </motion.div>

        <motion.div 
          className="p-3 rounded-sm bg-white/[0.02] border border-white/5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <span className="text-[9px] text-neutral-500 uppercase block mb-1">Filled</span>
          <span className="text-sm font-bold text-white tabular-nums">
            {formatNumber(result?.filledSize || size, 4)}
          </span>
        </motion.div>

        {result?.leverage && (
          <motion.div 
            className="p-3 rounded-sm bg-cyan-500/5 border border-cyan-500/20"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <span className="text-[9px] text-neutral-500 uppercase block mb-1">Leverage</span>
            <span className="text-sm font-bold text-cyan-400">{result.leverage}x</span>
          </motion.div>
        )}

        {result?.marginUsed && (
          <motion.div 
            className="p-3 rounded-sm bg-white/[0.02] border border-white/5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <span className="text-[9px] text-neutral-500 uppercase block mb-1">Margin</span>
            <span className="text-sm font-bold text-white">${formatNumber(result.marginUsed, 2)}</span>
          </motion.div>
        )}
      </div>

      {/* Fee & P&L */}
      {(result?.fee !== undefined || result?.pnl !== undefined) && (
        <div className="flex items-center justify-between p-3 rounded-sm bg-white/[0.02] border border-white/5">
          {result?.fee !== undefined && (
            <div>
              <span className="text-[9px] text-neutral-500 uppercase">Fee</span>
              <span className="text-xs text-neutral-400 ml-2">${formatNumber(result.fee, 4)}</span>
            </div>
          )}
          {result?.pnl !== undefined && (
            <div>
              <span className="text-[9px] text-neutral-500 uppercase">P&L</span>
              <span className={`text-sm font-bold ml-2 ${result.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {result.pnl >= 0 ? "+" : ""}{formatUsdPrecise(result.pnl)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Order ID */}
      {result?.orderId && (
        <div className="flex items-center justify-between text-[10px] text-neutral-500">
          <span>Order ID: {result.orderId.slice(0, 12)}...</span>
          {result.timestamp && (
            <span>{new Date(result.timestamp).toLocaleTimeString()}</span>
          )}
        </div>
      )}

      {debug && (
        <details className="mt-2 border border-white/5 bg-black/50 p-4 rounded-sm text-xs text-neutral-500 font-mono">
          <summary className="cursor-pointer hover:text-white transition-colors">Raw Payload</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(rawOutput, null, 2)}</pre>
        </details>
      )}
    </SleekCard>
  );
};

// --- Exports ---

export {
  hyperliquidMarketsRenderer,
  hyperliquidOptInRenderer,
  hyperliquidFundRenderer,
  hyperliquidDepositRenderer,
  hyperliquidPerpTradeRenderer,
};
