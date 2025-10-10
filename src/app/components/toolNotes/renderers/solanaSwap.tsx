import React from "react";

import type { ToolNoteRenderer } from "./types";
import { BASE_CARD_CLASS, normalizeOutput, unwrapStructured, formatSolDisplay } from "./helpers";
import { LinkPill, MetricPill, TokenFlow } from "./solanaVisuals";
import type { TokenSide } from "./solanaVisuals";

type SwapArgs = Record<string, unknown>;

type Metric = {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "negative" | "notice";
  href?: string;
};

type SwapViewModel = {
  title: string;
  timestamp?: string;
  hero: {
    from: TokenSide;
    to: TokenSide;
    priceImpact?: { value: string; tone: "neutral" | "positive" | "negative" };
  };
  metrics: Metric[];
  meta: Metric[];
  warnings: string[];
  errorMessage?: string;
  rawData: any;
};

const percentFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
  signDisplay: "always",
});

const WELL_KNOWN_MINTS: Record<string, string> = {
  USDC11111111111111111111111111111111111111: "USDC",
  So11111111111111111111111111111111111111112: "SOL",
};

function formatPercent(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return undefined;
  return `${percentFormatter.format(numeric)}%`;
}

function pick<T = unknown>(...candidates: Array<T | null | undefined>): T | undefined {
  for (const candidate of candidates) {
    if (candidate !== null && candidate !== undefined) {
      return candidate as T;
    }
  }
  return undefined;
}

function symbolFromMint(mint?: string): string | undefined {
  if (!mint) return undefined;
  const known = WELL_KNOWN_MINTS[mint];
  if (known) return known;
  return mint.slice(0, 3).toUpperCase();
}

function normalizeAssetSymbol(symbol?: string, fallbackMint?: string) {
  if (!symbol || symbol.trim().length === 0) return symbolFromMint(fallbackMint);
  const normalized = symbol.replace(/\s+/g, " ").trim().toUpperCase();
  if (normalized === "NAT" || normalized === "NATIVE" || normalized === "NATIVE SOL" || normalized === "NATIVE-SOL") {
    return "SOL";
  }
  if (normalized === "UNKNOWN" && fallbackMint) {
    return symbolFromMint(fallbackMint);
  }
  return normalized;
}

function parseAmountDisplay(raw: unknown, fallbackMint?: string): { amount: string; asset?: string } | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const parts = trimmed.split(/\s+/);
    if (parts.length > 1) {
      const assetLabel = parts.slice(1).join(" ");
      return { amount: parts[0], asset: normalizeAssetSymbol(assetLabel, fallbackMint) };
    }
    return { amount: parts[0], asset: normalizeAssetSymbol(undefined, fallbackMint) };
  }
  if (typeof raw === "number") {
    const formatted =
      Math.abs(raw) >= 1
        ? raw.toLocaleString("en-US", { maximumFractionDigits: 2 })
        : raw.toLocaleString("en-US", { maximumFractionDigits: 6 });
    return { amount: formatted, asset: normalizeAssetSymbol(undefined, fallbackMint) };
  }
  return null;
}

function resolveTokenImage(structured: any, kind: "input" | "output"): string | undefined {
  if (!structured) return undefined;
  const lower = kind === "input";
  const direct = lower
    ? pick(
        structured?.inputLogo,
        structured?.input_logo,
        structured?.inputIcon,
        structured?.input_icon,
        structured?.sourceLogo,
        structured?.source_icon,
        structured?.route?.[0]?.icon,
        structured?.legs?.[0]?.icon
      )
    : pick(
        structured?.outputLogo,
        structured?.output_logo,
        structured?.destinationLogo,
        structured?.destination_icon,
        structured?.outputIcon,
        structured?.output_icon,
        structured?.legs?.[structured?.legs?.length - 1]?.icon,
        structured?.route?.[structured?.route?.length - 1]?.icon
      );
  if (typeof direct === "string" && direct.startsWith("http")) return direct;
  return undefined;
}

function toTokenSide(kind: "from" | "to", amountRaw: unknown, amountLamports: unknown, mint: string | undefined, imageUrl?: string): TokenSide {
  const display =
    parseAmountDisplay(amountRaw, mint) ??
    (amountLamports ? parseAmountDisplay(formatSolDisplay(amountLamports, { fromLamports: true }), "So11111111111111111111111111111111111111112") : null);
  const asset = display?.asset ?? symbolFromMint(mint) ?? "TOKEN";
  const explorerUrl = mint ? `https://solscan.io/token/${mint}` : undefined;

  return {
    heading: kind === "from" ? "You give" : "You receive",
    amount: display?.amount ?? undefined,
    asset,
    mintAddress: mint,
    explorerUrl,
    imageUrl,
    accent: kind,
  };
}

function buildMetrics(structured: any, variant: "preview" | "execute"): { metrics: Metric[]; meta: Metric[]; priceImpact?: { value: string; tone: "neutral" | "positive" | "negative" } } {
  const metrics: Metric[] = [];
  const meta: Metric[] = [];

  const slippage = pick(structured?.slippageBps, structured?.slippage_bps, structured?.slippageBpsPercent);
  if (slippage !== undefined) {
    const numeric = typeof slippage === "number" ? slippage : Number(slippage);
    const percent = Number.isFinite(numeric) ? `${(numeric / 100).toFixed(2)}%` : String(slippage);
    metrics.push({
      label: "Slippage",
      value: percent,
    });
  }

  const priceImpactRaw = pick(structured?.priceImpactPercent, structured?.priceImpact, structured?.price_impact_percent, structured?.price_impact);
  let priceImpact: { value: string; tone: "neutral" | "positive" | "negative" } | undefined;
  if (priceImpactRaw !== undefined) {
    const formatted = formatPercent(priceImpactRaw) ?? String(priceImpactRaw);
    const numeric = typeof priceImpactRaw === "number" ? priceImpactRaw : Number(priceImpactRaw);
    const tone = Number.isFinite(numeric) ? (numeric >= 0 ? "positive" : "negative") : "neutral";
    priceImpact = { value: formatted, tone };
  }

  if (variant === "preview") {
    const quoteSource = pick(structured?.quoteSource, structured?.provider, structured?.routeSource);
    if (quoteSource) {
      meta.push({ label: "Quote", value: String(quoteSource) });
    }
    const eta = pick(structured?.estimatedSeconds, structured?.ETASeconds, structured?.eta_seconds);
    if (eta !== undefined) {
      const seconds = typeof eta === "number" ? eta : Number(eta);
      const label = Number.isFinite(seconds) ? `${seconds.toFixed(0)}s` : String(eta);
      meta.push({ label: "ETA", value: label });
    }
  }

  return { metrics, meta, priceImpact };
}

function formatTimestamp(value?: string): string | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildSwapViewModel(label: string, item: any, structured: any, args: SwapArgs, variant: "preview" | "execute"): SwapViewModel {
  const fromMint = pick<string>(structured?.inputMint, structured?.sourceMint, args?.from_mint as string, args?.input_mint as string);
  const toMint = pick<string>(structured?.outputMint, structured?.destinationMint, args?.to_mint as string, args?.output_mint as string);
  const amountIn = pick(structured?.inputAmount, structured?.amountIn, args?.amount_in, args?.amountIn);
  const amountOut = pick(structured?.outputAmount, structured?.amountOut, structured?.expectedOutput, structured?.expected_out, structured?.quote);
  const amountInLamports = pick(structured?.inputAmountLamports, structured?.amountInLamports, args?.amount_in_lamports);
  const amountOutLamports = pick(structured?.outputAmountLamports, structured?.amountOutLamports, structured?.expected_output_lamports);

  const heroFrom = toTokenSide("from", amountIn, amountInLamports, fromMint, resolveTokenImage(structured, "input"));
  const heroTo = toTokenSide("to", amountOut, amountOutLamports, toMint, resolveTokenImage(structured, "output"));

  const { metrics, meta, priceImpact } = buildMetrics(structured, variant);

  if (variant === "execute") {
    const status = pick<string>(structured?.status);
    if (status) {
      const tone: Metric["tone"] =
        status.toLowerCase() === "confirmed" ? "positive" : status.toLowerCase() === "failed" ? "negative" : "notice";
      meta.push({ label: "Status", value: status, tone });
    }
    const signature = pick<string>(structured?.signature, structured?.txSignature, structured?.signatureId, structured?.transaction);
    if (signature) {
      meta.push({
        label: "Explorer",
        value: "View on Solscan",
        href: `https://solscan.io/tx/${signature}`,
      });
    }
  }

  const warnings = Array.isArray(structured?.warnings)
    ? structured.warnings.filter((warn: unknown): warn is string => typeof warn === "string" && warn.length > 0)
    : [];

  const errorMessage = pick<string>(structured?.error, structured?.errorMessage);

  return {
    title: label,
    timestamp: formatTimestamp(item.timestamp),
    hero: {
      from: heroFrom,
      to: heroTo,
      priceImpact,
    },
    metrics,
    meta,
    warnings,
    errorMessage,
    rawData: structured,
  };
}

function MetricCard({ metric }: { metric: Metric }) {
  return <MetricPill label={metric.label} value={metric.value} tone={metric.tone ?? "neutral"} />;
}

function SwapNote({ view, debug, debugLabel }: { view: SwapViewModel; debug?: boolean; debugLabel: string }) {
  return (
    <div className={BASE_CARD_CLASS}>
      <section className="relative flex flex-col gap-8">
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-[0.26em] text-indigo-500">{view.title}</span>
            {view.timestamp && <span className="text-xs text-slate-400">{view.timestamp}</span>}
          </div>
          {view.hero.priceImpact && (
            <span
              className={`inline-flex h-8 items-center justify-center rounded-full px-4 text-sm font-semibold ${
                view.hero.priceImpact.tone === "positive"
                  ? "bg-emerald-500/10 text-emerald-600"
                  : view.hero.priceImpact.tone === "negative"
                    ? "bg-rose-500/10 text-rose-600"
                    : "bg-slate-900/5 text-slate-700"
              }`}
            >
              {`Price impact ${view.hero.priceImpact.value}`}
            </span>
          )}
        </header>

        <TokenFlow from={view.hero.from} to={view.hero.to} animate />

        {view.metrics.length > 0 && (
          <div className="relative mt-2 flex flex-wrap gap-3">
            {view.metrics.map((metric) => (
              <MetricCard key={`${metric.label}-${metric.value}`} metric={metric} />
            ))}
          </div>
        )}

        {view.meta.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-600">
            {view.meta.map((meta) =>
              meta.href ? (
                <LinkPill key={`${meta.label}-${meta.value}`} value={meta.value} href={meta.href} />
              ) : (
                <MetricPill key={`${meta.label}-${meta.value}`} label={meta.label} value={meta.value} tone={meta.tone ?? "neutral"} />
              )
            )}
          </div>
        )}

        {view.warnings.length > 0 && (
          <section className="mt-4 flex flex-col gap-2 text-sm text-amber-900">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-amber-600">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-700">!</span>
              Pay attention
            </div>
            <ul className="space-y-2">
              {view.warnings.map((warn, idx) => (
                <li key={`${warn}-${idx}`} className="leading-relaxed">
                  {warn}
                </li>
              ))}
            </ul>
          </section>
        )}

        {view.errorMessage && (
          <section className="mt-4 flex flex-col gap-2 text-sm text-rose-600">
            <div className="text-xs font-semibold uppercase tracking-[0.22em]">Execution error</div>
            <p className="mt-2 leading-relaxed">{view.errorMessage}</p>
          </section>
        )}
      </section>

      {debug && (
        <details className="mt-4 max-w-2xl text-sm text-slate-700" open>
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            {debugLabel}
          </summary>
          <pre className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap break-words text-xs">{JSON.stringify(view.rawData, null, 2)}</pre>
        </details>
      )}

    </div>
  );
}

export const solanaSwapPreviewRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const structured = unwrapStructured(rawOutput);
  const args = (item.data as any)?.arguments ?? {};

  const view = buildSwapViewModel("Swap Preview", item, structured, args, "preview");

  return <SwapNote view={view} debug={debug} debugLabel="Raw preview data" />;
};

export const solanaSwapExecuteRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const structured = unwrapStructured(rawOutput);
  const args = (item.data as any)?.arguments ?? {};

  const view = buildSwapViewModel("Swap Execution", item, structured, args, "execute");

  return <SwapNote view={view} debug={debug} debugLabel="Raw execution data" />;
};
