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
  formatUsdPrecise,
} from "./sleekVisuals";

// --- Types ---

type HyperliquidMarket = {
  name?: string;
  symbol?: string;
  maxLeverage?: number;
  fundingRate?: number;
  openInterest?: number;
  dayVolume?: number;
  price?: number;
};

type HyperliquidAgent = {
  id?: string;
  managedWalletPublicKey?: string;
  agentWalletAddress?: string;
  status?: string;
  validUntil?: string;
  metadata?: Record<string, unknown>;
};

type FundResult = {
  solSignature?: string;
  usdcAmount?: number;
  bridgeStatus?: string;
  steps?: Array<{
    step: string;
    status: string;
    signature?: string;
    amount?: number;
  }>;
};

type DepositResult = {
  txHash?: string;
  amountUsd?: number;
  status?: string;
};

type TradeResult = {
  orderId?: string;
  symbol?: string;
  side?: string;
  size?: number;
  price?: number;
  filledSize?: number;
  status?: string;
  timestamp?: string;
};

type HyperliquidPayload = {
  ok?: boolean;
  error?: string;
  markets?: HyperliquidMarket[];
  agent?: HyperliquidAgent;
  result?: FundResult | DepositResult | TradeResult;
};

// --- Hyperliquid Brand Colors ---

const HL_GREEN = "emerald";
const HL_ACCENT = "cyan";

// --- Helpers ---

function formatNumber(value?: number, decimals = 2): string {
  if (value === undefined || value === null || !Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(decimals)}B`;
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(decimals)}M`;
  if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(decimals)}K`;
  return value.toFixed(decimals);
}

function formatPercent(value?: number): string {
  if (value === undefined || value === null || !Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(4)}%`;
}

function truncateAddress(address?: string, len = 8): string {
  if (!address) return "—";
  if (address.length <= len * 2 + 3) return address;
  return `${address.slice(0, len)}...${address.slice(-4)}`;
}

// --- Hyperliquid Logo ---

const HyperliquidLogo = ({ size = 20 }: { size?: number }) => (
  <div 
    className="rounded-sm bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center font-bold text-black"
    style={{ width: size, height: size, fontSize: size * 0.5 }}
  >
    HL
  </div>
);

// --- Status Badge ---

function HLStatusBadge({ status }: { status: string }) {
  const configs: Record<string, { className: string }> = {
    active: { className: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" },
    pending: { className: "bg-amber-500/10 border-amber-500/20 text-amber-400" },
    success: { className: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" },
    failed: { className: "bg-rose-500/10 border-rose-500/20 text-rose-400" },
    filled: { className: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" },
    partial: { className: "bg-amber-500/10 border-amber-500/20 text-amber-400" },
  };

  const config = configs[status.toLowerCase()] || configs.pending;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm border text-[9px] font-bold uppercase tracking-wider ${config.className}`}>
      {status}
    </span>
  );
}

// --- Markets List Renderer ---

const hyperliquidMarketsRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput) as HyperliquidPayload;
  const timestamp = formatTimestampDisplay(item.timestamp);

  if (item.status === "IN_PROGRESS") return <SleekLoadingCard />;
  
  if (payload.error || payload.ok === false) {
    return <SleekErrorCard message={payload.error || "Failed to fetch markets"} />;
  }

  const markets = payload.markets || [];

  return (
    <SleekCard className="relative overflow-visible p-6 flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HyperliquidLogo />
          <SleekLabel>Hyperliquid Markets</SleekLabel>
        </div>
        <span className="text-xs font-bold text-emerald-400">{markets.length} markets</span>
      </header>

      {markets.length === 0 ? (
        <div className="p-6 text-center">
          <GlobeIcon className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
          <p className="text-sm text-neutral-500">No markets available</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1 max-h-[400px] overflow-y-auto">
          {markets.slice(0, 20).map((market, idx) => (
            <motion.div
              key={market.symbol || idx}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.02 }}
              className="flex items-center justify-between p-3 rounded-sm bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-white">{market.symbol || market.name}</span>
                {market.maxLeverage && (
                  <span className="px-1.5 py-0.5 rounded-sm bg-cyan-500/10 text-[9px] text-cyan-400">
                    {market.maxLeverage}x
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-[10px]">
                {market.price && (
                  <span className="text-neutral-300">${formatNumber(market.price, 4)}</span>
                )}
                {market.fundingRate !== undefined && (
                  <span className={market.fundingRate >= 0 ? "text-emerald-400" : "text-rose-400"}>
                    {formatPercent(market.fundingRate)}
                  </span>
                )}
                {market.dayVolume && (
                  <span className="text-neutral-500">{formatNumber(market.dayVolume)} vol</span>
                )}
              </div>
            </motion.div>
          ))}
          {markets.length > 20 && (
            <p className="text-center text-[10px] text-neutral-500 mt-2">
              +{markets.length - 20} more markets
            </p>
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

  return (
    <SleekCard className="relative overflow-visible p-6 flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HyperliquidLogo />
          <SleekLabel>Hyperliquid Opt-In</SleekLabel>
        </div>
        <HLStatusBadge status={agent.status || "active"} />
      </header>

      {/* Success Message */}
      <div className="p-4 rounded-sm bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/30">
        <div className="flex items-center gap-3">
          <CheckCircledIcon className="w-6 h-6 text-emerald-400" />
          <div>
            <span className="text-sm font-medium text-emerald-400">Agent Provisioned!</span>
            <p className="text-[10px] text-neutral-500">Your Hyperliquid trading agent is ready</p>
          </div>
        </div>
      </div>

      {/* Agent Details */}
      <div className="flex flex-col gap-3">
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

        <div className="grid grid-cols-2 gap-3">
          <MetricItem label="VALID UNTIL" value={agent.validUntil ? new Date(agent.validUntil).toLocaleDateString() : "—"} />
          <MetricItem label="AGENT ID" value={agent.id?.slice(0, 8) || "—"} />
        </div>
      </div>

      {/* Managed Wallet */}
      {agent.managedWalletPublicKey && (
        <div className="border-t border-white/5 pt-4">
          <SleekLabel>MANAGED WALLET</SleekLabel>
          <code className="text-[10px] font-mono text-neutral-500 block mt-1">
            {truncateAddress(agent.managedWalletPublicKey, 12)}
          </code>
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

  return (
    <SleekCard className="relative overflow-visible p-6 flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HyperliquidLogo />
          <SleekLabel>Fund Hyperliquid</SleekLabel>
        </div>
        <HLStatusBadge status={result?.bridgeStatus || "success"} />
      </header>

      {/* Funding Flow */}
      <div className="p-4 rounded-sm bg-gradient-to-r from-emerald-500/5 via-cyan-500/5 to-emerald-500/5 border border-emerald-500/20">
        <div className="flex items-center justify-center gap-4">
          <div className="flex flex-col items-center">
            <span className="text-lg font-bold text-white">SOL</span>
            <span className="text-[9px] text-neutral-500">Solana</span>
          </div>
          <ArrowRightIcon className="w-5 h-5 text-emerald-400" />
          <div className="flex flex-col items-center">
            <span className="text-lg font-bold text-cyan-400">USDC</span>
            <span className="text-[9px] text-neutral-500">Arbitrum</span>
          </div>
          <ArrowRightIcon className="w-5 h-5 text-emerald-400" />
          <div className="flex flex-col items-center">
            <HyperliquidLogo size={32} />
            <span className="text-[9px] text-neutral-500 mt-1">Hyperliquid</span>
          </div>
        </div>
      </div>

      {/* Amount */}
      {result?.usdcAmount && (
        <div className="text-center">
          <span className="text-[9px] text-neutral-500 uppercase block mb-1">Funded</span>
          <span className="text-2xl font-black text-emerald-400">${formatNumber(result.usdcAmount, 2)}</span>
        </div>
      )}

      {/* Steps */}
      {result?.steps && result.steps.length > 0 && (
        <div className="flex flex-col gap-2">
          <SleekLabel>BRIDGE STEPS</SleekLabel>
          {result.steps.map((step, idx) => (
            <div
              key={idx}
              className={`flex items-center justify-between p-2 rounded-sm border ${
                step.status === "completed" || step.status === "success"
                  ? "bg-emerald-500/5 border-emerald-500/20"
                  : step.status === "pending"
                    ? "bg-amber-500/5 border-amber-500/20"
                    : "bg-neutral-500/5 border-neutral-500/20"
              }`}
            >
              <span className="text-[10px] text-neutral-300">{step.step}</span>
              <span className={`text-[9px] uppercase font-bold ${
                step.status === "completed" || step.status === "success"
                  ? "text-emerald-400"
                  : "text-amber-400"
              }`}>
                {step.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Signature */}
      {result?.solSignature && (
        <div className="border-t border-white/5 pt-4">
          <a
            href={`https://solscan.io/tx/${result.solSignature}`}
            target="_blank"
            rel="noreferrer"
            className="text-[10px] text-neutral-500 hover:text-white transition-colors"
          >
            View SOL transaction: {truncateAddress(result.solSignature, 12)} ↗
          </a>
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
      <div className="p-6 rounded-sm bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 border border-cyan-500/20 text-center">
        <div className="flex items-center justify-center gap-4 mb-3">
          <span className="text-neutral-400">L2 (Arbitrum)</span>
          <ArrowRightIcon className="w-5 h-5 text-cyan-400" />
          <span className="text-emerald-400 font-bold">L1 (Hyperliquid)</span>
        </div>
        {result?.amountUsd && (
          <span className="text-3xl font-black text-white">${formatNumber(result.amountUsd, 2)}</span>
        )}
      </div>

      {/* Tx Hash */}
      {result?.txHash && (
        <div className="p-3 rounded-sm bg-white/[0.02] border border-white/5">
          <SleekLabel>TRANSACTION HASH</SleekLabel>
          <div className="flex items-center justify-between mt-1">
            <code className="text-xs font-mono text-neutral-300">
              {truncateAddress(result.txHash, 16)}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(result.txHash!)}
              className="text-neutral-500 hover:text-white transition-colors"
            >
              <CopyIcon className="w-3 h-3" />
            </button>
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
  const isBuy = result?.side?.toLowerCase() === "buy";

  return (
    <SleekCard className="relative overflow-visible p-6 flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HyperliquidLogo />
          <SleekLabel>Perp Trade</SleekLabel>
        </div>
        <HLStatusBadge status={result?.status || "filled"} />
      </header>

      {/* Trade Details */}
      <div className={`p-4 rounded-sm border ${
        isBuy 
          ? "bg-emerald-500/10 border-emerald-500/30" 
          : "bg-rose-500/10 border-rose-500/30"
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isBuy ? (
              <ArrowUpIcon className="w-6 h-6 text-emerald-400" />
            ) : (
              <ArrowDownIcon className="w-6 h-6 text-rose-400" />
            )}
            <div>
              <span className={`text-xl font-black ${isBuy ? "text-emerald-400" : "text-rose-400"}`}>
                {result?.side?.toUpperCase()} {result?.symbol}
              </span>
              <p className="text-[10px] text-neutral-500">Perpetual</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-lg font-bold text-white">{formatNumber(result?.size, 4)}</span>
            <p className="text-[10px] text-neutral-500">Size</p>
          </div>
        </div>
      </div>

      {/* Trade Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricItem label="PRICE" value={result?.price ? `$${formatNumber(result.price, 4)}` : "Market"} />
        <MetricItem label="FILLED" value={formatNumber(result?.filledSize, 4)} />
        <MetricItem label="ORDER ID" value={result?.orderId?.slice(0, 8) || "—"} />
        <MetricItem label="TIME" value={result?.timestamp ? new Date(result.timestamp).toLocaleTimeString() : "—"} />
      </div>

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
