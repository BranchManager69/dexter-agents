import React, { useState } from "react";

export const BASE_CARD_CLASS = "w-full max-w-xl rounded-2xl border border-neutral-800/60 bg-surface-glass/50 p-4 text-neutral-100 shadow-elevated";
export const SECTION_TITLE_CLASS = "font-display text-sm uppercase tracking-[0.28em] text-neutral-400";

const usdCompactFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const usdPreciseFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 4,
});

export const countCompactFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function normalizeOutput(data: Record<string, any> | undefined) {
  if (!data) return undefined;
  if (data.output && typeof data.output === "object") return data.output;
  return data;
}

export function unwrapStructured(data: any) {
  if (!data || typeof data !== "object") return {};
  if (data.structuredContent && typeof data.structuredContent === "object") return data.structuredContent;
  if (data.structured_content && typeof data.structured_content === "object") return data.structured_content;
  if (data.result && typeof data.result === "object") return data.result;
  return data;
}

export function formatAddress(value: unknown, opts: { prefix?: number; suffix?: number } = {}) {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  const prefix = opts.prefix ?? 4;
  const suffix = opts.suffix ?? 4;
  if (value.length <= prefix + suffix + 3) return value;
  return `${value.slice(0, prefix)}…${value.slice(-suffix)}`;
}

export function resolveSourceBadge(source: string | null) {
  if (!source) {
    return {
      label: "Unknown source",
      className: "border border-neutral-700 bg-neutral-800/80 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-300",
    };
  }
  const normalized = source.toLowerCase();
  switch (normalized) {
    case "resolver":
      return {
        label: "Resolver default",
        className: "border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-300",
      };
    case "session":
    case "override":
      return {
        label: "Session override",
        className: "border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-amber-200",
      };
    case "demo":
      return {
        label: "Demo wallet",
        className: "border border-neutral-700 bg-neutral-800/80 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-300",
      };
    case "env":
    case "environment":
      return {
        label: "Env fallback",
        className: "border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-sky-200",
      };
    case "none":
      return {
        label: "No wallet bound",
        className: "border border-neutral-700 bg-neutral-800/80 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-400",
      };
    default:
      return {
        label: source,
        className: "border border-neutral-700 bg-neutral-800/80 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-300",
      };
  }
}

export function formatUsd(value: unknown, opts: { precise?: boolean } = {}) {
  if (typeof value !== "number" && typeof value !== "string") return undefined;
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return undefined;
  if (opts.precise) {
    return usdPreciseFormatter.format(numeric);
  }
  return usdCompactFormatter.format(numeric);
}

function parseLamportsToSol(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "number" && Number.isFinite(value)) return value / 1_000_000_000;
  try {
    const bigintValue = BigInt(typeof value === "bigint" ? value : String(value));
    return Number(bigintValue) / 1_000_000_000;
  } catch {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return undefined;
    return numeric / 1_000_000_000;
  }
}

export function formatSolDisplay(value: unknown, { fromLamports = false }: { fromLamports?: boolean } = {}) {
  const base = fromLamports ? parseLamportsToSol(value) : typeof value === "string" || typeof value === "number" ? Number(value) : undefined;
  if (base === undefined || Number.isNaN(base)) return undefined;
  const abs = Math.abs(base);
  let formatted: string;
  if (abs >= 1) {
    formatted = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(base);
  } else if (abs >= 0.01) {
    formatted = new Intl.NumberFormat("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 6 }).format(base);
  } else {
    formatted = new Intl.NumberFormat("en-US", { minimumSignificantDigits: 2, maximumSignificantDigits: 6 }).format(base);
  }
  return `${formatted} SOL`;
}

interface HashBadgeProps {
  value: string;
  href?: string;
  ariaLabel?: string;
}

export function HashBadge({ value, href, ariaLabel }: HashBadgeProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (event: React.MouseEvent<HTMLButtonElement | HTMLSpanElement>) => {
    event.preventDefault();
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  const display = formatAddress(value, { prefix: 6, suffix: 6 }) ?? value;

  return (
    <div className="flex items-center gap-2 text-xs text-neutral-300">
      <button
        type="button"
        onClick={handleCopy}
        className="font-mono text-sm text-neutral-100 underline decoration-dotted decoration-neutral-500 transition hover:text-flux"
        title={value}
        aria-label={ariaLabel ? `Copy ${ariaLabel}` : "Copy value"}
      >
        {display}
      </button>
      {copied && (
        <span className="text-[10px] uppercase tracking-[0.22em] text-flux">Copied</span>
      )}
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          aria-label={ariaLabel ? `Open ${ariaLabel}` : "Open in new tab"}
          className="rounded-full border border-neutral-700 px-2 py-[2px] text-[10px] uppercase tracking-[0.2em] text-neutral-400 transition hover:border-flux/50 hover:text-flux"
        >
          ↗
        </a>
      )}
    </div>
  );
}
