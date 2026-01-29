"use client";

import React from "react";
import { PaperPlaneIcon, CheckCircledIcon, ExclamationTriangleIcon, CrossCircledIcon } from "@radix-ui/react-icons";
import { motion } from "framer-motion";
import type { ToolNoteRenderer } from "./types";
import { normalizeOutput, unwrapStructured, formatTimestampDisplay, formatSolAmount } from "./helpers";
import { 
  SleekCard, 
  SleekLabel, 
  TokenIconSleek, 
  SleekHash, 
  MetricItem,
  SleekLoadingCard,
  SleekErrorCard,
  formatUsdPrecise,
} from "./sleekVisuals";

// --- Types ---

type SendResult = {
  signature?: string;
  solscanUrl?: string;
  walletAddress?: string;
  destination?: string;
  mint?: string;
  amountUi?: number;
  amountRaw?: string;
  decimals?: number;
  isNative?: boolean;
  priceUsd?: number | null;
  valueUsd?: number | null;
  recipientHandle?: string | null;
  memo?: string | null;
};

type SendPayload = {
  ok?: boolean;
  error?: string;
  thresholdUsd?: number;
  result?: SendResult;
  transfer?: SendResult & { recipient?: string };
  message?: string;
};

// --- Helpers ---

const WELL_KNOWN_MINTS: Record<string, { symbol: string; icon?: string }> = {
  "native:SOL": { symbol: "SOL" },
  "So11111111111111111111111111111111111111112": { symbol: "SOL" },
  "EPjFWdd5AuLvBFCSdEFi31DcUaPkL85BP3t8DGtA3MX": { symbol: "USDC" },
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": { symbol: "USDT" },
};

function resolveTokenSymbol(mint?: string): string {
  if (!mint) return "TOKEN";
  const known = WELL_KNOWN_MINTS[mint];
  if (known) return known.symbol;
  // Check if it's a native SOL variant
  if (mint.toLowerCase().includes("sol") || mint === "native:SOL") return "SOL";
  // Return first 4 chars of mint as fallback
  return mint.slice(0, 4).toUpperCase();
}

function formatAmount(value?: number, decimals?: number): string | undefined {
  if (value === undefined || value === null) return undefined;
  const maxDigits = decimals && decimals > 4 ? 4 : decimals ?? 6;
  if (Math.abs(value) >= 1) {
    return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: maxDigits });
  }
  return value.toLocaleString("en-US", { maximumSignificantDigits: 6 });
}

function formatUsdValue(value?: number | null): string | undefined {
  if (value === undefined || value === null || !Number.isFinite(value)) return undefined;
  return formatUsdPrecise(value);
}

function truncateAddress(address?: string, prefixLen = 6, suffixLen = 4): string {
  if (!address) return "—";
  if (address.length <= prefixLen + suffixLen + 3) return address;
  return `${address.slice(0, prefixLen)}…${address.slice(-suffixLen)}`;
}

// --- Solana Icon Component ---

const SolanaIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="sol-send-grad" x1="90%" y1="0%" x2="10%" y2="100%">
        <stop offset="0%" stopColor="#00FFA3"/>
        <stop offset="100%" stopColor="#DC1FFF"/>
      </linearGradient>
    </defs>
    <path d="M25.3 93.5c0.9-0.9 2.2-1.5 3.5-1.5h97.1c2.2 0 3.4 2.7 1.8 4.3l-24.2 24.2c-0.9 0.9-2.2 1.5-3.5 1.5H2.9c-2.2 0-3.4-2.7-1.8-4.3L25.3 93.5z" fill="url(#sol-send-grad)"/>
    <path d="M25.3 2.5c1-1 2.3-1.5 3.5-1.5h97.1c2.2 0 3.4 2.7 1.8 4.3L103.5 29.5c-0.9 0.9-2.2 1.5-3.5 1.5H2.9c-2.2 0-3.4-2.7-1.8-4.3L25.3 2.5z" fill="url(#sol-send-grad)"/>
    <path d="M102.7 47.3c-0.9-0.9-2.2-1.5-3.5-1.5H2.1c-2.2 0-3.4 2.7-1.8 4.3l24.2 24.2c0.9 0.9 2.2 1.5 3.5 1.5h97.1c2.2 0 3.4-2.7 1.8-4.3L102.7 47.3z" fill="url(#sol-send-grad)"/>
  </svg>
);

// --- Status Badge Component ---

type TransferStatus = "completed" | "confirmation_required" | "failed" | "pending";

function StatusBadge({ status }: { status: TransferStatus }) {
  const configs: Record<TransferStatus, { icon: React.ReactNode; label: string; className: string }> = {
    completed: {
      icon: <CheckCircledIcon className="w-3 h-3" />,
      label: "Confirmed",
      className: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    },
    confirmation_required: {
      icon: <ExclamationTriangleIcon className="w-3 h-3" />,
      label: "Needs Confirmation",
      className: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    },
    failed: {
      icon: <CrossCircledIcon className="w-3 h-3" />,
      label: "Failed",
      className: "bg-rose-500/10 border-rose-500/20 text-rose-400",
    },
    pending: {
      icon: <div className="w-2 h-2 rounded-full bg-current animate-pulse" />,
      label: "Pending",
      className: "bg-neutral-500/10 border-neutral-500/20 text-neutral-400",
    },
  };

  const config = configs[status];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm border text-[9px] font-bold uppercase tracking-wider ${config.className}`}>
      {config.icon}
      {config.label}
    </span>
  );
}

// --- Transfer Flow Visualization ---

function TransferFlow({ 
  from, 
  to, 
  amount, 
  symbol, 
  valueUsd,
  recipientHandle,
}: { 
  from: string; 
  to: string; 
  amount?: string;
  symbol: string;
  valueUsd?: string;
  recipientHandle?: string | null;
}) {
  const isNativeSol = symbol === "SOL";

  return (
    <div className="relative flex items-center justify-between gap-4 py-6">
      {/* From Wallet */}
      <div className="flex flex-col items-center gap-2 min-w-[100px]">
        <div className="w-12 h-12 rounded-sm bg-neutral-800 border border-white/10 flex items-center justify-center">
          <span className="text-neutral-400 text-xs font-bold">FROM</span>
        </div>
        <span className="text-[10px] font-mono text-neutral-500">{truncateAddress(from)}</span>
      </div>

      {/* Animated Transfer Arrow with Amount */}
      <div className="flex-1 flex flex-col items-center gap-3 relative">
        {/* Amount Display */}
        <div className="flex items-center gap-2">
          {isNativeSol ? (
            <SolanaIcon size={24} />
          ) : (
            <TokenIconSleek symbol={symbol} size={24} />
          )}
          <div className="flex flex-col">
            <span className="text-xl font-bold text-white tabular-nums">
              {amount ?? "—"} <span className="text-sm text-neutral-400">{symbol}</span>
            </span>
            {valueUsd && (
              <span className="text-xs text-neutral-500 tabular-nums">{valueUsd}</span>
            )}
          </div>
        </div>

        {/* Animated Arrow Track */}
        <div className="relative w-full h-8 flex items-center justify-center">
          <div className="absolute inset-x-8 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <motion.div
            className="absolute"
            animate={{
              x: [-40, 40],
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <PaperPlaneIcon className="w-5 h-5 text-emerald-400 rotate-90" />
          </motion.div>
        </div>
      </div>

      {/* To Wallet */}
      <div className="flex flex-col items-center gap-2 min-w-[100px]">
        <div className="w-12 h-12 rounded-sm bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <span className="text-emerald-400 text-xs font-bold">TO</span>
        </div>
        <span className="text-[10px] font-mono text-neutral-500">{truncateAddress(to)}</span>
        {recipientHandle && (
          <span className="text-[10px] text-emerald-400 font-medium">{recipientHandle}</span>
        )}
      </div>
    </div>
  );
}

// --- Confirmation Required View ---

function ConfirmationRequiredView({ 
  transfer, 
  thresholdUsd 
}: { 
  transfer: SendResult & { recipient?: string };
  thresholdUsd?: number;
}) {
  const symbol = resolveTokenSymbol(transfer.mint);
  const amount = formatAmount(transfer.amountUi, transfer.decimals);
  const valueUsd = formatUsdValue(transfer.valueUsd);
  const destination = transfer.recipient || transfer.destination || "";

  return (
    <div className="flex flex-col gap-5">
      {/* Warning Banner */}
      <div className="p-4 rounded-sm bg-amber-500/5 border border-amber-500/20">
        <div className="flex items-start gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-amber-400">Confirmation Required</span>
            <p className="text-xs text-neutral-400 leading-relaxed">
              This transfer exceeds the ${thresholdUsd ?? 50} threshold. 
              Re-run with <code className="px-1 py-0.5 bg-white/5 rounded text-amber-300">confirm=true</code> to proceed.
            </p>
          </div>
        </div>
      </div>

      {/* Transfer Preview */}
      <TransferFlow
        from={transfer.walletAddress || ""}
        to={destination}
        amount={amount}
        symbol={symbol}
        valueUsd={valueUsd}
        recipientHandle={transfer.recipientHandle}
      />

      {/* Details */}
      <div className="grid grid-cols-2 gap-3">
        <MetricItem label="AMOUNT" value={`${amount ?? "—"} ${symbol}`} />
        <MetricItem label="VALUE" value={valueUsd ?? "—"} />
        {transfer.priceUsd && (
          <MetricItem label="PRICE" value={formatUsdValue(transfer.priceUsd) ?? "—"} />
        )}
        {transfer.memo && (
          <MetricItem label="MEMO" value={transfer.memo} className="col-span-2" />
        )}
      </div>
    </div>
  );
}

// --- Success View ---

function SuccessView({ result }: { result: SendResult }) {
  const symbol = resolveTokenSymbol(result.mint);
  const amount = formatAmount(result.amountUi, result.decimals);
  const valueUsd = formatUsdValue(result.valueUsd);

  return (
    <div className="flex flex-col gap-5">
      {/* Transfer Flow */}
      <TransferFlow
        from={result.walletAddress || ""}
        to={result.destination || ""}
        amount={amount}
        symbol={symbol}
        valueUsd={valueUsd}
        recipientHandle={result.recipientHandle}
      />

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border-t border-white/5 pt-5">
        <MetricItem label="AMOUNT" value={`${amount ?? "—"} ${symbol}`} />
        <MetricItem label="VALUE" value={valueUsd ?? "—"} />
        {result.priceUsd && (
          <MetricItem label="PRICE" value={formatUsdValue(result.priceUsd) ?? "—"} />
        )}
      </div>

      {/* Memo if present */}
      {result.memo && (
        <div className="p-3 rounded-sm bg-white/[0.02] border border-white/[0.02]">
          <SleekLabel>MEMO</SleekLabel>
          <p className="mt-1 text-sm text-neutral-300">{result.memo}</p>
        </div>
      )}

      {/* Transaction Signature */}
      {result.signature && (
        <div className="flex flex-col gap-2 border-t border-white/5 pt-4">
          <SleekLabel>TRANSACTION</SleekLabel>
          <SleekHash 
            value={result.signature} 
            href={result.solscanUrl || `https://solscan.io/tx/${result.signature}`} 
            label="Signature"
            truncate={true}
          />
        </div>
      )}

      {/* Explorer Link */}
      {result.solscanUrl && (
        <div className="flex justify-end">
          <a
            href={result.solscanUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[9px] uppercase font-bold tracking-widest text-neutral-600 hover:text-white transition-colors"
          >
            View on Solscan ↗
          </a>
        </div>
      )}
    </div>
  );
}

// --- Main Renderer ---

const solanaSendRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput) as SendPayload;
  const timestamp = formatTimestampDisplay(item.timestamp);

  // Determine status
  let status: TransferStatus = "pending";
  if (payload.ok === true && payload.result?.signature) {
    status = "completed";
  } else if (payload.error === "confirmation_required") {
    status = "confirmation_required";
  } else if (payload.ok === false && payload.error && payload.error !== "confirmation_required") {
    status = "failed";
  }

  // Loading state
  if (item.status === "IN_PROGRESS" && !payload.ok && !payload.error) {
    return <SleekLoadingCard />;
  }

  // Error state (not confirmation required)
  if (status === "failed") {
    return (
      <SleekCard className="p-6 flex flex-col gap-4">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PaperPlaneIcon className="w-4 h-4 text-rose-400" />
            <SleekLabel>Transfer Failed</SleekLabel>
          </div>
          <StatusBadge status="failed" />
        </header>
        <div className="p-4 rounded-sm bg-rose-500/5 border border-rose-500/20">
          <p className="text-sm text-rose-400">{payload.message || payload.error || "Transfer failed"}</p>
        </div>
        {debug && (
          <details className="mt-2 border border-white/5 bg-black/50 p-4 rounded-sm text-xs text-neutral-500 font-mono">
            <summary className="cursor-pointer hover:text-white transition-colors">Raw Payload</summary>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(rawOutput, null, 2)}</pre>
          </details>
        )}
      </SleekCard>
    );
  }

  return (
    <SleekCard className="relative overflow-visible p-6 flex flex-col gap-5">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PaperPlaneIcon className={`w-4 h-4 ${status === "completed" ? "text-emerald-400" : "text-amber-400"}`} />
          <SleekLabel>
            {status === "confirmation_required" ? "Transfer Preview" : "Token Transfer"}
          </SleekLabel>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={status} />
          {timestamp && <span className="text-[10px] text-neutral-600 font-mono">{timestamp}</span>}
        </div>
      </header>

      {/* Content based on status */}
      {status === "confirmation_required" && payload.transfer ? (
        <ConfirmationRequiredView 
          transfer={payload.transfer} 
          thresholdUsd={payload.thresholdUsd} 
        />
      ) : status === "completed" && payload.result ? (
        <SuccessView result={payload.result} />
      ) : (
        <SleekErrorCard message="Unexpected transfer state" />
      )}

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

export default solanaSendRenderer;
