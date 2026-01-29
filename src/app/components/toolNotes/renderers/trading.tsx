"use client";

import React, { useState } from "react";
import { 
  BarChartIcon,
  CheckCircledIcon,
  CrossCircledIcon,
  ExclamationTriangleIcon,
  TriangleUpIcon,
  TriangleDownIcon,
  InfoCircledIcon,
} from "@radix-ui/react-icons";
import { motion } from "framer-motion";
import type { ToolNoteRenderer } from "./types";
import { normalizeOutput, unwrapStructured, formatTimestampDisplay } from "./helpers";
import { 
  SleekCard, 
  SleekLabel, 
  MetricItem,
  SleekLoadingCard,
  SleekErrorCard,
  SleekHash,
  formatUsdPrecise,
} from "./sleekVisuals";

// --- Slippage Sentinel Types ---

type CandidateEvaluation = {
  slippageBps: number;
  priceImpactBps: number;
  stressPriceImpactBps: number;
  volatilityBufferBps: number;
  requirementBps: number;
  passes: boolean;
};

type PoolDepthInfo = {
  amm: string;
  ammKey?: string | null;
  routeShareBps?: number | null;
  inputMint: string;
  outputMint: string;
  inAmountRaw: string;
  outAmountRaw: string;
  inAmountUi?: number | null;
  outAmountUi?: number | null;
  usdValue?: number | null;
  feeAmount?: string | null;
};

type TradeSampleSummary = {
  tokenAmountP95?: number | null;
  usdAmountP95?: number | null;
  sampleCount: number;
  requestedWindowSeconds?: number;
  evaluatedWindowSeconds?: number;
  usedFallbackWindow?: boolean;
  insufficientSamples?: boolean;
};

type SlippageResult = {
  minSafeSlipBps: number;
  candidateEvaluations?: CandidateEvaluation[];
  poolDepths?: PoolDepthInfo[];
  recentTradeSizeP95?: TradeSampleSummary;
  diagnostics?: {
    inputAmountUi?: number | null;
    inputUsd?: number | null;
    tradeUsdP95?: number | null;
    tradeSampleCount?: number;
    stressMultiplier?: number;
    volatilityBufferBps?: number;
    worstObservedImpactBps?: number;
    evaluatedAt?: string;
  };
};

type SlippagePayload = {
  ok?: boolean;
  error?: string;
  amountRaw?: string;
  amountDerivedFromUi?: boolean;
  result?: SlippageResult;
};

// --- OHLCV Types ---

type OhlcvCandle = {
  t: number;
  o: number | null;
  h: number | null;
  l: number | null;
  c: number | null;
  v?: number | null;
};

type OhlcvSummary = {
  provider?: string;
  chain?: string;
  mint_address?: string;
  pair_address?: string;
  interval?: string;
  currency?: string;
  time_from?: number;
  time_to?: number;
  total_candles?: number;
  price_open?: number | null;
  price_close?: number | null;
  price_high?: number | null;
  price_low?: number | null;
  price_change_pct?: string | null;
  total_volume?: number;
  _truncated?: string;
};

type OhlcvPayload = {
  error?: string;
  summary?: OhlcvSummary;
  ohlcv?: OhlcvCandle[];
};

// --- Helpers ---

function formatBps(bps: number): string {
  if (!Number.isFinite(bps)) return "—";
  return `${(bps / 100).toFixed(2)}%`;
}

function formatVolume(value?: number | null): string {
  if (value === undefined || value === null || !Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (Math.abs(value) >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

function formatPrice(value?: number | null): string {
  if (value === undefined || value === null || !Number.isFinite(value)) return "—";
  if (value >= 1) return `$${value.toFixed(4)}`;
  if (value >= 0.0001) return `$${value.toFixed(6)}`;
  return `$${value.toExponential(4)}`;
}

function formatTimestamp(epoch?: number): string {
  if (!epoch) return "—";
  return new Date(epoch * 1000).toLocaleString();
}

// --- Slippage Candidate Card ---

function SlippageCandidate({ candidate, isRecommended }: { candidate: CandidateEvaluation; isRecommended: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`p-3 rounded-sm border ${
        candidate.passes
          ? isRecommended
            ? "bg-emerald-500/10 border-emerald-500/30"
            : "bg-emerald-500/5 border-emerald-500/20"
          : "bg-rose-500/5 border-rose-500/20"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`text-lg font-bold ${
            candidate.passes ? "text-emerald-400" : "text-rose-400"
          }`}>
            {formatBps(candidate.slippageBps)}
          </span>
          {isRecommended && (
            <span className="px-1.5 py-0.5 rounded-sm bg-emerald-500/20 text-[8px] text-emerald-400 uppercase font-bold">
              Recommended
            </span>
          )}
        </div>
        {candidate.passes ? (
          <CheckCircledIcon className="w-4 h-4 text-emerald-400" />
        ) : (
          <CrossCircledIcon className="w-4 h-4 text-rose-400" />
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-[10px]">
        <div className="flex justify-between">
          <span className="text-neutral-500">Price Impact:</span>
          <span className="text-neutral-300">{formatBps(candidate.priceImpactBps)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-500">Stress Impact:</span>
          <span className="text-neutral-300">{formatBps(candidate.stressPriceImpactBps)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-500">Buffer:</span>
          <span className="text-neutral-300">{formatBps(candidate.volatilityBufferBps)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-500">Required:</span>
          <span className="text-neutral-300">{formatBps(candidate.requirementBps)}</span>
        </div>
      </div>
    </motion.div>
  );
}

// --- Pool Depth Display ---

function PoolDepthDisplay({ pools }: { pools?: PoolDepthInfo[] }) {
  const [expanded, setExpanded] = useState(false);
  
  if (!pools || pools.length === 0) return null;

  const displayPools = expanded ? pools : pools.slice(0, 3);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <SleekLabel>Pool Depths</SleekLabel>
        {pools.length > 3 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[9px] text-neutral-500 hover:text-white transition-colors"
          >
            {expanded ? "Show Less" : `+${pools.length - 3} more`}
          </button>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        {displayPools.map((pool, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between p-2 rounded-sm bg-white/[0.02] border border-white/5"
          >
            <div className="flex flex-col">
              <span className="text-[10px] text-neutral-300 font-medium">{pool.amm}</span>
              {pool.routeShareBps && (
                <span className="text-[9px] text-neutral-500">{formatBps(pool.routeShareBps)} of route</span>
              )}
            </div>
            <span className="text-[10px] text-neutral-400 font-mono">
              {pool.usdValue ? formatVolume(pool.usdValue) : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Mini Chart for OHLCV ---

function MiniCandleChart({ candles }: { candles: OhlcvCandle[] }) {
  if (candles.length === 0) return null;

  // Take last 50 candles max for display
  const displayCandles = candles.slice(-50);
  const prices = displayCandles.flatMap(c => [c.o, c.h, c.l, c.c]).filter((v): v is number => v !== null);
  
  if (prices.length === 0) return null;

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const range = maxPrice - minPrice || 1;

  const chartHeight = 100;
  const chartWidth = 300;
  const candleWidth = Math.max(2, (chartWidth - 10) / displayCandles.length - 1);

  const scaleY = (value: number) => chartHeight - ((value - minPrice) / range) * (chartHeight - 10);

  return (
    <div className="p-3 rounded-sm bg-black/30 border border-white/5">
      <svg 
        width="100%" 
        height={chartHeight} 
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        preserveAspectRatio="none"
        className="overflow-visible"
      >
        {displayCandles.map((candle, idx) => {
          const x = (idx / displayCandles.length) * (chartWidth - 10) + 5;
          const open = candle.o ?? candle.c ?? 0;
          const close = candle.c ?? candle.o ?? 0;
          const high = candle.h ?? Math.max(open, close);
          const low = candle.l ?? Math.min(open, close);
          const isGreen = close >= open;

          const bodyTop = scaleY(Math.max(open, close));
          const bodyBottom = scaleY(Math.min(open, close));
          const bodyHeight = Math.max(1, bodyBottom - bodyTop);

          return (
            <g key={idx}>
              {/* Wick */}
              <line
                x1={x + candleWidth / 2}
                y1={scaleY(high)}
                x2={x + candleWidth / 2}
                y2={scaleY(low)}
                stroke={isGreen ? "#10b981" : "#ef4444"}
                strokeWidth={1}
                opacity={0.5}
              />
              {/* Body */}
              <rect
                x={x}
                y={bodyTop}
                width={candleWidth}
                height={bodyHeight}
                fill={isGreen ? "#10b981" : "#ef4444"}
                opacity={0.8}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// --- Slippage Sentinel Renderer ---

const slippageSentinelRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput) as SlippagePayload;
  const timestamp = formatTimestampDisplay(item.timestamp);

  if (item.status === "IN_PROGRESS") return <SleekLoadingCard />;
  
  if (payload.error || payload.ok === false) {
    return <SleekErrorCard message={payload.error || "Slippage analysis failed"} />;
  }

  const result = payload.result;
  if (!result) {
    return <SleekErrorCard message="No analysis result returned" />;
  }

  const passingCandidates = result.candidateEvaluations?.filter(c => c.passes) || [];
  const minSafe = result.minSafeSlipBps;

  return (
    <SleekCard className="relative overflow-visible p-6 flex flex-col gap-5">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ExclamationTriangleIcon className="w-4 h-4 text-amber-400" />
          <SleekLabel>Slippage Analysis</SleekLabel>
        </div>
        {timestamp && <span className="text-[10px] text-neutral-600 font-mono">{timestamp}</span>}
      </header>

      {/* Recommended Slippage */}
      <div className="p-4 rounded-sm bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/30">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[9px] text-neutral-500 uppercase block mb-1">Recommended Slippage</span>
            <span className="text-3xl font-black text-emerald-400">{formatBps(minSafe)}</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircledIcon className="w-6 h-6" />
            <span className="text-sm font-medium">Safe</span>
          </div>
        </div>
      </div>

      {/* Candidate Evaluations */}
      {result.candidateEvaluations && result.candidateEvaluations.length > 0 && (
        <div className="flex flex-col gap-2">
          <SleekLabel>Slippage Candidates</SleekLabel>
          <div className="grid grid-cols-2 gap-2">
            {result.candidateEvaluations.slice(0, 6).map((candidate, idx) => (
              <SlippageCandidate
                key={idx}
                candidate={candidate}
                isRecommended={candidate.slippageBps === minSafe}
              />
            ))}
          </div>
        </div>
      )}

      {/* Pool Depths */}
      <PoolDepthDisplay pools={result.poolDepths} />

      {/* Diagnostics */}
      {result.diagnostics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-white/5 pt-4">
          <MetricItem label="INPUT USD" value={formatVolume(result.diagnostics.inputUsd)} />
          <MetricItem label="P95 TRADE SIZE" value={formatVolume(result.diagnostics.tradeUsdP95)} />
          <MetricItem label="SAMPLES" value={result.diagnostics.tradeSampleCount?.toString() || "—"} />
          <MetricItem label="STRESS MULT" value={result.diagnostics.stressMultiplier?.toFixed(1) || "—"} />
        </div>
      )}

      {/* Debug */}
      {debug && (
        <details className="mt-2 border border-white/5 bg-black/50 p-4 rounded-sm text-xs text-neutral-500 font-mono">
          <summary className="cursor-pointer hover:text-white transition-colors">Raw Payload</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(rawOutput, null, 2)}</pre>
        </details>
      )}
    </SleekCard>
  );
};

// --- Markets OHLCV Renderer ---

const marketsOhlcvRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput) as OhlcvPayload;
  const timestamp = formatTimestampDisplay(item.timestamp);

  if (item.status === "IN_PROGRESS") return <SleekLoadingCard />;
  
  if (payload.error) {
    return <SleekErrorCard message={payload.error} />;
  }

  const summary = payload.summary;
  const candles = payload.ohlcv || [];

  if (!summary && candles.length === 0) {
    return <SleekErrorCard message="No OHLCV data returned" />;
  }

  const priceChange = summary?.price_change_pct;
  const isPositive = priceChange && priceChange.startsWith("-") === false && priceChange !== "0.00%";
  const isNegative = priceChange && priceChange.startsWith("-");

  return (
    <SleekCard className="relative overflow-visible p-6 flex flex-col gap-5">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChartIcon className="w-4 h-4 text-cyan-400" />
          <SleekLabel>OHLCV Data</SleekLabel>
        </div>
        <div className="flex items-center gap-3">
          {summary?.interval && (
            <span className="px-2 py-0.5 rounded-sm bg-cyan-500/10 border border-cyan-500/20 text-[9px] text-cyan-400 uppercase">
              {summary.interval}
            </span>
          )}
          {timestamp && <span className="text-[10px] text-neutral-600 font-mono">{timestamp}</span>}
        </div>
      </header>

      {/* Price Change Banner */}
      {priceChange && (
        <div className={`p-4 rounded-sm border ${
          isPositive 
            ? "bg-emerald-500/10 border-emerald-500/20" 
            : isNegative 
              ? "bg-rose-500/10 border-rose-500/20"
              : "bg-neutral-500/10 border-neutral-500/20"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isPositive && <TriangleUpIcon className="w-5 h-5 text-emerald-400" />}
              {isNegative && <TriangleDownIcon className="w-5 h-5 text-rose-400" />}
              <div>
                <span className="text-[9px] text-neutral-500 uppercase block">Price Change</span>
                <span className={`text-2xl font-black ${
                  isPositive ? "text-emerald-400" : isNegative ? "text-rose-400" : "text-neutral-400"
                }`}>
                  {priceChange}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[9px] text-neutral-500 uppercase block">Candles</span>
              <span className="text-lg font-bold text-white">{summary?.total_candles || candles.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* Mini Chart */}
      {candles.length > 0 && <MiniCandleChart candles={candles} />}

      {/* Price Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricItem label="OPEN" value={formatPrice(summary?.price_open)} />
        <MetricItem label="HIGH" value={formatPrice(summary?.price_high)} />
        <MetricItem label="LOW" value={formatPrice(summary?.price_low)} />
        <MetricItem label="CLOSE" value={formatPrice(summary?.price_close)} />
      </div>

      {/* Volume & Timeframe */}
      <div className="grid grid-cols-2 gap-3">
        <MetricItem label="VOLUME" value={formatVolume(summary?.total_volume)} />
        <MetricItem label="CURRENCY" value={summary?.currency?.toUpperCase() || "USD"} />
      </div>

      {/* Timeframe */}
      {summary?.time_from && summary?.time_to && (
        <div className="flex items-center justify-between p-3 rounded-sm bg-white/[0.02] border border-white/5 text-[10px]">
          <span className="text-neutral-500">From: <span className="text-neutral-300">{formatTimestamp(summary.time_from)}</span></span>
          <span className="text-neutral-500">To: <span className="text-neutral-300">{formatTimestamp(summary.time_to)}</span></span>
        </div>
      )}

      {/* Truncation Notice */}
      {summary?._truncated && (
        <div className="flex items-center gap-2 text-[10px] text-amber-400">
          <InfoCircledIcon className="w-3 h-3" />
          <span>{summary._truncated}</span>
        </div>
      )}

      {/* Token Link */}
      {summary?.mint_address && (
        <div className="border-t border-white/5 pt-4">
          <SleekHash 
            value={summary.mint_address} 
            href={`https://solscan.io/token/${summary.mint_address}`}
            label="Token"
            truncate
          />
        </div>
      )}

      {/* Debug */}
      {debug && (
        <details className="mt-2 border border-white/5 bg-black/50 p-4 rounded-sm text-xs text-neutral-500 font-mono">
          <summary className="cursor-pointer hover:text-white transition-colors">Raw Payload</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(rawOutput, null, 2)}</pre>
        </details>
      )}
    </SleekCard>
  );
};

export { slippageSentinelRenderer, marketsOhlcvRenderer };
