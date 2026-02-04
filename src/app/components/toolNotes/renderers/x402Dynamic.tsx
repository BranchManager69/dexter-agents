"use client";

import React, { useState } from "react";
import { 
  RocketIcon,
  BarChartIcon,
  ExclamationTriangleIcon,
  LightningBoltIcon,
  LockClosedIcon,
  SpeakerLoudIcon,
  CodeIcon,
  MagnifyingGlassIcon,
  StarFilledIcon,
  ReaderIcon,
} from "@radix-ui/react-icons";
import type { ToolNoteRenderer } from "./types";
import { normalizeOutput, unwrapStructured, formatTimestampDisplay } from "./helpers";
import { 
  SleekCard, 
  SleekLabel, 
  MetricItem,
  SleekLoadingCard,
  SleekErrorCard,
  SleekHash,
  TokenIconSleek,
  formatUsdCompact,
} from "./sleekVisuals";

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

// Solscan Trending
type TrendingToken = {
  rank?: number;
  symbol?: string;
  name?: string;
  mint?: string;
  address?: string;
  price?: number;
  priceChange24h?: number;
  price_change_24h?: number;
  volume24h?: number;
  volume_24h?: number;
  marketCap?: number;
  market_cap?: number;
  holders?: number;
  logoUrl?: string;
  logo_url?: string;
  image?: string;
};

type TrendingPayload = {
  tokens?: TrendingToken[];
  data?: TrendingToken[];
  results?: TrendingToken[];
  fetchedAt?: string;
  fetched_at?: string;
  error?: string;
};

// Jupiter Quote
type JupiterQuotePayload = {
  inputMint?: string;
  input_mint?: string;
  outputMint?: string;
  output_mint?: string;
  inAmount?: string | number;
  in_amount?: string | number;
  outAmount?: string | number;
  out_amount?: string | number;
  slippageBps?: number;
  slippage_bps?: number;
  priceImpactPct?: string | number;
  price_impact_pct?: string | number;
  routePlan?: Array<{ label?: string; percent?: number }>;
  route_plan?: Array<{ label?: string; percent?: number }>;
  inputSymbol?: string;
  outputSymbol?: string;
  inputDecimals?: number;
  outputDecimals?: number;
  error?: string;
};

// x402 Stats
type X402StatsPayload = {
  network_summary?: {
    total_transactions?: number;
    total_volume?: number;
    active_facilitators?: number;
    active_agents?: number;
  };
  facilitators?: Array<{
    name?: string;
    transactions?: number;
    volume?: number;
    health?: string;
  }>;
  top_agents?: Array<{
    name?: string;
    id?: string;
    volume?: number;
  }>;
  fetchedAt?: string;
  fetched_at?: string;
  error?: string;
};

// Shield
type ShieldPayload = {
  id?: string;
  shield_id?: string;
  status?: string;
  type?: string;
  mint?: string;
  symbol?: string;
  coverage?: { amount?: number; percentage?: number };
  premium?: { amount?: number };
  expiresAt?: string;
  expires_at?: string;
  protectedValue?: number;
  protected_value?: number;
  claimable?: boolean;
  error?: string;
};

// Async Jobs (Spaces, Code-Interpreter, Deep-Research)
type AsyncJobPayload = {
  jobId?: string;
  job_id?: string;
  id?: string;
  type?: string;
  status?: string;
  progress?: number;
  result?: string | object;
  output?: string | object;
  code?: string;
  language?: string;
  query?: string;
  sources?: Array<{ title?: string; url?: string }>;
  spaceName?: string;
  space_name?: string;
  durationMs?: number;
  duration_ms?: number;
  createdAt?: string;
  created_at?: string;
  error?: string;
};

// Games
type GamePayload = {
  gameType?: string;
  game_type?: string;
  type?: string;
  currentKing?: string;
  current_king?: string;
  kingScore?: number;
  king_score?: number;
  challengers?: number;
  storyId?: string;
  story_id?: string;
  title?: string;
  chapter?: number;
  content?: string;
  choices?: string[];
  state?: object;
  error?: string;
};

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════════

function formatPrice(value?: number): string {
  if (!value || !Number.isFinite(value)) return "—";
  if (value < 0.0001) return `$${value.toExponential(2)}`;
  if (value < 1) return `$${value.toFixed(6)}`;
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
}

function formatVolume(value?: number): string {
  if (!value || !Number.isFinite(value)) return "—";
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function formatChange(value?: number): { text: string; isPositive: boolean } {
  if (!value || !Number.isFinite(value)) return { text: "0.00%", isPositive: true };
  const isPositive = value >= 0;
  return { text: `${isPositive ? "+" : ""}${value.toFixed(2)}%`, isPositive };
}

function formatAmount(value?: string | number, decimals = 9): string {
  if (!value) return "0";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (!Number.isFinite(num)) return "0";
  const adjusted = num / Math.pow(10, decimals);
  if (adjusted < 0.0001) return adjusted.toExponential(4);
  return adjusted.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

function shortenMint(mint?: string): string {
  if (!mint) return "—";
  if (mint.length <= 10) return mint;
  return `${mint.slice(0, 4)}...${mint.slice(-4)}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Solscan Trending Renderer
// ═══════════════════════════════════════════════════════════════════════════════

const solscanTrendingRenderer: ToolNoteRenderer = ({ item, isExpanded, onToggle, debug = false }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput) as TrendingPayload;
  const timestamp = formatTimestampDisplay(item.timestamp);

  if (item.status === "IN_PROGRESS") return <SleekLoadingCard />;
  
  if (payload.error) {
    return <SleekErrorCard message={payload.error} />;
  }

  const tokens = payload.tokens || payload.data || payload.results || [];

  if (tokens.length === 0) {
    return <SleekErrorCard message="No trending tokens found" />;
  }

  const displayTokens = isExpanded ? tokens : tokens.slice(0, 5);

  return (
    <SleekCard className="p-6 flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RocketIcon className="w-4 h-4 text-orange-400" />
          <SleekLabel>Solscan Trending</SleekLabel>
        </div>
        {timestamp && <span className="text-[10px] text-neutral-600 font-mono">{timestamp}</span>}
      </header>

      <div className="flex flex-col gap-2">
        {displayTokens.map((token, idx) => {
          const change = formatChange(token.priceChange24h || token.price_change_24h);
          const logo = token.logoUrl || token.logo_url || token.image;
          const address = token.mint || token.address;

          return (
            <div
              key={address || idx}
              className="flex items-center justify-between p-3 rounded-sm bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-neutral-500 w-5">#{token.rank || idx + 1}</span>
                <TokenIconSleek symbol={token.symbol || "?"} imageUrl={logo} size={32} />
                <div>
                  <span className="text-sm font-bold text-white">{token.symbol || "Unknown"}</span>
                  <span className="text-[10px] text-neutral-500 ml-2">{token.name}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-white">{formatPrice(token.price)}</div>
                <div className={`text-xs font-bold ${change.isPositive ? "text-emerald-400" : "text-rose-400"}`}>
                  {change.text}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {tokens.length > 5 && (
        <button
          onClick={onToggle}
          className="w-full py-2 rounded-sm bg-white/5 text-[10px] uppercase font-bold tracking-wider text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          {isExpanded ? "Show Less" : `Show ${tokens.length - 5} More`}
        </button>
      )}

      {debug && (
        <details className="mt-2 border border-white/5 bg-black/50 p-4 rounded-sm text-xs text-neutral-500 font-mono">
          <summary className="cursor-pointer hover:text-white">Raw Payload</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(rawOutput, null, 2)}</pre>
        </details>
      )}
    </SleekCard>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Jupiter Quote Renderer
// ═══════════════════════════════════════════════════════════════════════════════

const jupiterQuoteRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput) as JupiterQuotePayload;
  const timestamp = formatTimestampDisplay(item.timestamp);

  if (item.status === "IN_PROGRESS") return <SleekLoadingCard />;
  
  if (payload.error) {
    return <SleekErrorCard message={payload.error} />;
  }

  const inputMint = payload.inputMint || payload.input_mint;
  const outputMint = payload.outputMint || payload.output_mint;
  const inAmount = payload.inAmount || payload.in_amount;
  const outAmount = payload.outAmount || payload.out_amount;
  const slippage = payload.slippageBps || payload.slippage_bps || 0;
  const priceImpact = payload.priceImpactPct || payload.price_impact_pct;
  const routePlan = payload.routePlan || payload.route_plan || [];
  const inputSymbol = payload.inputSymbol || shortenMint(inputMint);
  const outputSymbol = payload.outputSymbol || shortenMint(outputMint);

  const impactNum = typeof priceImpact === "string" ? parseFloat(priceImpact) : priceImpact;
  const impactColor = impactNum && impactNum > 1 ? "text-rose-400" : impactNum && impactNum > 0.5 ? "text-amber-400" : "text-emerald-400";

  return (
    <SleekCard className="p-6 flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LightningBoltIcon className="w-4 h-4 text-emerald-400" />
          <SleekLabel>Jupiter Quote</SleekLabel>
        </div>
        <span className="px-2 py-0.5 rounded-sm bg-emerald-500/10 border border-emerald-500/20 text-[9px] text-emerald-400 uppercase font-bold">
          Preview
        </span>
      </header>

      {/* Swap Summary */}
      <div className="flex items-center justify-between p-4 rounded-sm bg-gradient-to-r from-emerald-500/5 to-cyan-500/5 border border-emerald-500/20">
        <div className="flex flex-col gap-1">
          <span className="text-[9px] text-neutral-500 uppercase">From</span>
          <span className="text-xl font-bold text-white">{formatAmount(inAmount, payload.inputDecimals || 9)}</span>
          <span className="text-xs text-neutral-400">{inputSymbol}</span>
        </div>
        <span className="text-2xl text-emerald-400">→</span>
        <div className="flex flex-col gap-1 text-right">
          <span className="text-[9px] text-neutral-500 uppercase">To</span>
          <span className="text-xl font-bold text-white">{formatAmount(outAmount, payload.outputDecimals || 9)}</span>
          <span className="text-xs text-neutral-400">{outputSymbol}</span>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-3">
        <MetricItem label="SLIPPAGE" value={`${(slippage / 100).toFixed(2)}%`} />
        <div className="flex flex-col gap-1.5 p-3 rounded-sm bg-white/[0.02] border border-white/[0.02]">
          <SleekLabel>PRICE IMPACT</SleekLabel>
          <span className={`text-sm font-semibold ${impactColor}`}>
            {impactNum ? `${impactNum.toFixed(4)}%` : "< 0.01%"}
          </span>
        </div>
        {routePlan.length > 0 && (
          <MetricItem label="ROUTE" value={`${routePlan.length} hop${routePlan.length > 1 ? "s" : ""}`} />
        )}
      </div>

      {/* Route Path */}
      {routePlan.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {routePlan.map((step, idx) => (
            <span key={idx} className="px-2 py-1 rounded-sm bg-cyan-500/10 border border-cyan-500/20 text-[10px] text-cyan-400">
              {step.label || `Step ${idx + 1}`}
              {step.percent && <span className="text-neutral-500 ml-1">{step.percent}%</span>}
            </span>
          ))}
        </div>
      )}

      {debug && (
        <details className="mt-2 border border-white/5 bg-black/50 p-4 rounded-sm text-xs text-neutral-500 font-mono">
          <summary className="cursor-pointer hover:text-white">Raw Payload</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(rawOutput, null, 2)}</pre>
        </details>
      )}
    </SleekCard>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// x402 Stats Renderer
// ═══════════════════════════════════════════════════════════════════════════════

const x402StatsRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput) as X402StatsPayload;
  const timestamp = formatTimestampDisplay(item.timestamp);

  if (item.status === "IN_PROGRESS") return <SleekLoadingCard />;
  
  if (payload.error) {
    return <SleekErrorCard message={payload.error} />;
  }

  const summary = payload.network_summary;
  const facilitators = payload.facilitators || [];
  const topAgents = payload.top_agents || [];

  return (
    <SleekCard className="p-6 flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChartIcon className="w-4 h-4 text-amber-400" />
          <SleekLabel>x402 Network Stats</SleekLabel>
        </div>
        {timestamp && <span className="text-[10px] text-neutral-600 font-mono">{timestamp}</span>}
      </header>

      {/* Network Summary */}
      {summary && (
        <div className="grid grid-cols-4 gap-3 p-4 rounded-sm bg-gradient-to-r from-amber-500/5 to-orange-500/5 border border-amber-500/20">
          <div className="text-center">
            <div className="text-lg font-bold text-amber-400">{summary.total_transactions?.toLocaleString() || "0"}</div>
            <div className="text-[9px] text-neutral-500 uppercase">Transactions</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-amber-400">{formatVolume(summary.total_volume)}</div>
            <div className="text-[9px] text-neutral-500 uppercase">Volume</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-amber-400">{summary.active_facilitators || 0}</div>
            <div className="text-[9px] text-neutral-500 uppercase">Facilitators</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-amber-400">{summary.active_agents || 0}</div>
            <div className="text-[9px] text-neutral-500 uppercase">Agents</div>
          </div>
        </div>
      )}

      {/* Facilitators */}
      {facilitators.length > 0 && (
        <div className="flex flex-col gap-2">
          <SleekLabel>Facilitators</SleekLabel>
          {facilitators.slice(0, 5).map((f, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 rounded-sm bg-white/[0.02] border border-white/5">
              <div className="flex items-center gap-2">
                <span className="text-sm text-white">{f.name || "Unknown"}</span>
                {f.health && (
                  <span className={`px-1.5 py-0.5 rounded-sm text-[8px] uppercase ${
                    f.health === "healthy" ? "bg-emerald-500/10 text-emerald-400" :
                    f.health === "degraded" ? "bg-amber-500/10 text-amber-400" :
                    "bg-rose-500/10 text-rose-400"
                  }`}>
                    {f.health}
                  </span>
                )}
              </div>
              <span className="text-xs text-neutral-400">{formatVolume(f.volume)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Top Agents */}
      {topAgents.length > 0 && (
        <div className="flex flex-col gap-2">
          <SleekLabel>Top Agents</SleekLabel>
          {topAgents.slice(0, 5).map((agent, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 rounded-sm bg-white/[0.02] border border-white/5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-neutral-500 w-5">#{idx + 1}</span>
                <span className="text-sm text-white">{agent.name || agent.id || "Unknown"}</span>
              </div>
              <span className="text-xs font-medium text-amber-400">{formatVolume(agent.volume)}</span>
            </div>
          ))}
        </div>
      )}

      {debug && (
        <details className="mt-2 border border-white/5 bg-black/50 p-4 rounded-sm text-xs text-neutral-500 font-mono">
          <summary className="cursor-pointer hover:text-white">Raw Payload</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(rawOutput, null, 2)}</pre>
        </details>
      )}
    </SleekCard>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Shield Renderer
// ═══════════════════════════════════════════════════════════════════════════════

const shieldRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput) as ShieldPayload;
  const timestamp = formatTimestampDisplay(item.timestamp);

  if (item.status === "IN_PROGRESS") return <SleekLoadingCard />;
  
  if (payload.error) {
    return <SleekErrorCard message={payload.error} />;
  }

  const id = payload.id || payload.shield_id;
  const expires = payload.expiresAt || payload.expires_at;
  const protectedValue = payload.protectedValue || payload.protected_value;

  const statusColor = payload.status === "active" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" :
                      payload.status === "pending" ? "text-amber-400 bg-amber-500/10 border-amber-500/20" :
                      "text-neutral-400 bg-neutral-500/10 border-neutral-500/20";

  return (
    <SleekCard className="p-6 flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LockClosedIcon className="w-4 h-4 text-violet-400" />
          <SleekLabel>Protection Shield</SleekLabel>
        </div>
        {payload.status && (
          <span className={`px-2 py-0.5 rounded-sm text-[9px] uppercase font-bold border ${statusColor}`}>
            {payload.status}
          </span>
        )}
      </header>

      {/* Token Info */}
      {payload.symbol && (
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-white">{payload.symbol}</span>
          {payload.type && <span className="text-xs text-neutral-500 uppercase">{payload.type}</span>}
        </div>
      )}

      {/* Coverage */}
      <div className="grid grid-cols-3 gap-3 p-4 rounded-sm bg-violet-500/5 border border-violet-500/15">
        <div className="text-center">
          <div className="text-lg font-bold text-violet-400">{formatVolume(protectedValue)}</div>
          <div className="text-[9px] text-neutral-500 uppercase">Protected</div>
        </div>
        {payload.coverage && (
          <div className="text-center">
            <div className="text-lg font-bold text-violet-400">
              {payload.coverage.percentage ? `${payload.coverage.percentage}%` : formatVolume(payload.coverage.amount)}
            </div>
            <div className="text-[9px] text-neutral-500 uppercase">Coverage</div>
          </div>
        )}
        {payload.premium && (
          <div className="text-center">
            <div className="text-lg font-bold text-amber-400">{formatVolume(payload.premium.amount)}</div>
            <div className="text-[9px] text-neutral-500 uppercase">Premium</div>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-3">
        {id && <MetricItem label="SHIELD ID" value={`${id.slice(0, 8)}...`} />}
        {expires && <MetricItem label="EXPIRES" value={formatTimestampDisplay(expires) || "—"} />}
      </div>

      {payload.claimable && (
        <div className="p-3 rounded-sm bg-emerald-500/10 border border-emerald-500/20 text-center text-sm font-medium text-emerald-400">
          ✓ This shield is claimable
        </div>
      )}

      {debug && (
        <details className="mt-2 border border-white/5 bg-black/50 p-4 rounded-sm text-xs text-neutral-500 font-mono">
          <summary className="cursor-pointer hover:text-white">Raw Payload</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(rawOutput, null, 2)}</pre>
        </details>
      )}
    </SleekCard>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Async Job Renderer (Spaces, Code-Interpreter, Deep-Research)
// ═══════════════════════════════════════════════════════════════════════════════

const asyncJobRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput) as AsyncJobPayload;
  const timestamp = formatTimestampDisplay(item.timestamp);

  if (item.status === "IN_PROGRESS") return <SleekLoadingCard />;
  
  if (payload.error) {
    return <SleekErrorCard message={payload.error} />;
  }

  // Detect job type
  const spaceName = payload.spaceName || payload.space_name;
  const jobType = payload.type || (spaceName ? "spaces" : payload.code ? "code-interpreter" : payload.query ? "deep-research" : "async");
  
  const jobId = payload.jobId || payload.job_id || payload.id;
  const created = payload.createdAt || payload.created_at;
  const duration = payload.durationMs || payload.duration_ms;
  const result = payload.result || payload.output;

  const icons: Record<string, React.ReactNode> = {
    spaces: <SpeakerLoudIcon className="w-4 h-4 text-cyan-400" />,
    "code-interpreter": <CodeIcon className="w-4 h-4 text-emerald-400" />,
    "deep-research": <MagnifyingGlassIcon className="w-4 h-4 text-violet-400" />,
    async: <LightningBoltIcon className="w-4 h-4 text-amber-400" />,
  };

  const titles: Record<string, string> = {
    spaces: "Twitter Spaces Job",
    "code-interpreter": "Code Execution",
    "deep-research": "Deep Research",
    async: "Async Job",
  };

  const statusColor = payload.status === "completed" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" :
                      payload.status === "running" ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" :
                      payload.status === "queued" ? "text-amber-400 bg-amber-500/10 border-amber-500/20" :
                      payload.status === "failed" ? "text-rose-400 bg-rose-500/10 border-rose-500/20" :
                      "text-neutral-400 bg-neutral-500/10 border-neutral-500/20";

  return (
    <SleekCard className="p-6 flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icons[jobType] || icons.async}
          <SleekLabel>{titles[jobType] || titles.async}</SleekLabel>
        </div>
        {payload.status && (
          <span className={`px-2 py-0.5 rounded-sm text-[9px] uppercase font-bold border ${statusColor}`}>
            {payload.status}
          </span>
        )}
      </header>

      {/* Progress */}
      {payload.status === "running" && payload.progress != null && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all"
              style={{ width: `${Math.min(payload.progress, 100)}%` }}
            />
          </div>
          <span className="text-xs font-bold text-cyan-400">{payload.progress}%</span>
        </div>
      )}

      {/* Type-specific content */}
      {jobType === "spaces" && spaceName && (
        <MetricItem label="SPACE" value={spaceName} />
      )}

      {jobType === "code-interpreter" && payload.code && (
        <div className="rounded-sm overflow-hidden">
          <div className="px-3 py-1.5 bg-white/5 text-[9px] uppercase text-neutral-500">
            {payload.language || "Code"}
          </div>
          <pre className="p-3 bg-black/40 text-[11px] text-neutral-300 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
            {payload.code}
          </pre>
        </div>
      )}

      {jobType === "deep-research" && payload.query && (
        <MetricItem label="QUERY" value={payload.query} />
      )}

      {/* Result */}
      {result && payload.status === "completed" && (
        <div className="p-3 rounded-sm bg-emerald-500/5 border border-emerald-500/15">
          <SleekLabel>Result</SleekLabel>
          <div className="mt-2 text-sm text-neutral-300">
            {typeof result === "string" ? result : JSON.stringify(result, null, 2).slice(0, 300)}
          </div>
        </div>
      )}

      {/* Sources (deep-research) */}
      {payload.sources && payload.sources.length > 0 && (
        <div className="flex flex-col gap-1">
          <SleekLabel>Sources ({payload.sources.length})</SleekLabel>
          {payload.sources.slice(0, 5).map((src, idx) => (
            <a 
              key={idx}
              href={src.url}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-cyan-400 hover:underline truncate"
            >
              {src.title || src.url}
            </a>
          ))}
        </div>
      )}

      {/* Metadata */}
      <div className="grid grid-cols-3 gap-3 border-t border-white/5 pt-3">
        {jobId && <MetricItem label="JOB ID" value={jobId.length > 12 ? `${jobId.slice(0, 8)}...` : jobId} />}
        {created && <MetricItem label="STARTED" value={formatTimestampDisplay(created) || "—"} />}
        {duration && <MetricItem label="DURATION" value={duration < 1000 ? `${duration}ms` : `${(duration / 1000).toFixed(1)}s`} />}
      </div>

      {debug && (
        <details className="mt-2 border border-white/5 bg-black/50 p-4 rounded-sm text-xs text-neutral-500 font-mono">
          <summary className="cursor-pointer hover:text-white">Raw Payload</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(rawOutput, null, 2)}</pre>
        </details>
      )}
    </SleekCard>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Game State Renderer (King of the Hill, Story)
// ═══════════════════════════════════════════════════════════════════════════════

const gameStateRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput) as GamePayload;
  const timestamp = formatTimestampDisplay(item.timestamp);

  if (item.status === "IN_PROGRESS") return <SleekLoadingCard />;
  
  if (payload.error) {
    return <SleekErrorCard message={payload.error} />;
  }

  // Detect game type
  const currentKing = payload.currentKing || payload.current_king;
  const kingScore = payload.kingScore || payload.king_score;
  const storyId = payload.storyId || payload.story_id;
  const gameType = payload.gameType || payload.game_type || payload.type || 
                   (currentKing || kingScore != null ? "king" : storyId || payload.chapter != null ? "story" : "generic");

  const icons: Record<string, React.ReactNode> = {
    king: <StarFilledIcon className="w-4 h-4 text-amber-400" />,
    story: <ReaderIcon className="w-4 h-4 text-violet-400" />,
    generic: <LightningBoltIcon className="w-4 h-4 text-cyan-400" />,
  };

  const titles: Record<string, string> = {
    king: "King of the Hill",
    story: "Story Game",
    generic: "Game State",
  };

  return (
    <SleekCard className="p-6 flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icons[gameType] || icons.generic}
          <SleekLabel>{titles[gameType] || titles.generic}</SleekLabel>
        </div>
        <span className="px-2 py-0.5 rounded-sm bg-neutral-500/10 border border-neutral-500/20 text-[9px] text-neutral-400 uppercase">
          Stub
        </span>
      </header>

      {/* King of the Hill */}
      {gameType === "king" && (
        <div className="grid grid-cols-3 gap-3">
          {currentKing && <MetricItem label="CURRENT KING" value={currentKing} />}
          {kingScore != null && <MetricItem label="SCORE" value={kingScore.toString()} />}
          {payload.challengers != null && <MetricItem label="CHALLENGERS" value={payload.challengers.toString()} />}
        </div>
      )}

      {/* Story Game */}
      {gameType === "story" && (
        <div className="flex flex-col gap-3">
          {payload.title && <MetricItem label="TITLE" value={payload.title} />}
          {payload.chapter != null && <MetricItem label="CHAPTER" value={payload.chapter.toString()} />}
          {payload.content && (
            <div className="p-3 rounded-sm bg-white/[0.02] border border-white/5">
              <p className="text-sm text-neutral-300 line-clamp-4">{payload.content}</p>
            </div>
          )}
        </div>
      )}

      {/* Generic fallback */}
      {gameType === "generic" && payload.state && (
        <pre className="p-3 rounded-sm bg-black/40 text-[10px] text-neutral-400 font-mono overflow-x-auto">
          {JSON.stringify(payload.state, null, 2).slice(0, 500)}
        </pre>
      )}

      <div className="p-2 rounded-sm bg-amber-500/5 border border-amber-500/10 text-center text-[10px] text-amber-400">
        This is a stub renderer. Full implementation pending.
      </div>

      {debug && (
        <details className="mt-2 border border-white/5 bg-black/50 p-4 rounded-sm text-xs text-neutral-500 font-mono">
          <summary className="cursor-pointer hover:text-white">Raw Payload</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(rawOutput, null, 2)}</pre>
        </details>
      )}
    </SleekCard>
  );
};

export {
  solscanTrendingRenderer,
  jupiterQuoteRenderer,
  x402StatsRenderer,
  shieldRenderer,
  asyncJobRenderer,
  gameStateRenderer,
};
