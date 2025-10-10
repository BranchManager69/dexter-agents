import React from "react";

import type { ToolNoteRenderer } from "./types";
import { BASE_CARD_CLASS, normalizeOutput, unwrapStructured, HashBadge } from "./helpers";
import { LinkPill, MetricPill, TokenIcon } from "./solanaVisuals";

type TokenResult = {
  address?: string;
  mint?: string;
  symbol?: string;
  name?: string;
  icon?: string;
  logo?: string;
  image?: string;
  info?: Record<string, unknown>;
  priceUsd?: number;
  price_usd?: number;
  liquidityUsd?: number;
  liquidity_usd?: number;
  liquidity?: Record<string, unknown>;
  volume24hUsd?: number;
  volume24h_usd?: number;
  volume24h?: number;
  totalVolume?: { h24?: number };
  marketCap?: number;
  market_cap?: number;
  marketCapUsd?: number;
  market_cap_usd?: number;
  fdv?: number;
  fdvUsd?: number;
  fdv_usd?: number;
  priceChange?: { h24?: number };
  price_change_24h?: number;
  priceChange24h?: number;
  pairs?: PairResult[];
};

type PairResult = {
  pairAddress?: string;
  dexId?: string;
  url?: string;
  liquidity?: { usd?: number };
  liquidityUsd?: number;
  liquidity_usd?: number;
  volume?: { h24?: number };
  volume24hUsd?: number;
  volume_24h_usd?: number;
  priceChange?: { h24?: number };
  priceChange24h?: number;
  price_change_24h?: number;
};

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

function formatUsd(value?: number | string | null, precise = false) {
  const numeric = pickNumber(value);
  if (numeric === undefined) return undefined;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: precise ? 4 : 0,
  }).format(numeric);
}

function formatPercent(value?: number | string | null) {
  const numeric = pickNumber(value);
  if (numeric === undefined) return undefined;
  return `${numeric >= 0 ? "+" : ""}${numeric.toFixed(2)}%`;
}

const solanaResolveTokenRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput);
  const args = (item.data as any)?.arguments ?? {};
  const query = typeof args?.query === "string" && args.query.trim().length > 0 ? args.query.trim() : undefined;

  const results: TokenResult[] = Array.isArray((payload as any)?.results)
    ? (payload as any)?.results
    : Array.isArray(payload)
      ? (payload as TokenResult[])
      : [];

  const visibleTokens = results.slice(0, 5);

  if (item.status === "IN_PROGRESS" && results.length === 0) {
    return (
      <div className={BASE_CARD_CLASS}>
        <section className="flex flex-col gap-4">
          <header className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-[0.26em] text-indigo-500">Token lookup</span>
            {query && <span className="text-sm text-slate-500">Query · {query}</span>}
          </header>
          <p className="text-sm text-slate-500">Searching for tokens…</p>
        </section>
      </div>
    );
  }

  return (
    <div className={BASE_CARD_CLASS}>
      <section className="flex flex-col gap-7">
        <header className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-[0.26em] text-indigo-500">Token lookup</span>
          {query && <span className="text-sm text-slate-500">Query · {query}</span>}
          {results.length > 0 && (
            <span className="text-xs text-slate-400">{results.length} candidate{results.length === 1 ? "" : "s"}</span>
          )}
        </header>

        <div className="flex flex-col gap-6">
          {visibleTokens.map((token, index) => {
            const address = pickString(token.address, token.mint);
            const info = token.info && typeof token.info === "object" ? token.info : undefined;
            const symbol = pickString(token.symbol, (info as any)?.symbol) ?? (address ? address.slice(0, 4).toUpperCase() : `Result ${index + 1}`);
            const name = pickString(token.name, (info as any)?.name);
            const imageUrl = pickString(
              (info as any)?.imageUrl,
              (info as any)?.openGraphImageUrl,
              (info as any)?.headerImageUrl,
              token.icon,
              token.logo,
              token.image,
            );

            const liquiditySource = token.liquidity && typeof token.liquidity === "object" ? (token.liquidity as Record<string, unknown>).usd : undefined;
            const liquidityValue = pickNumber(token.liquidityUsd, token.liquidity_usd, liquiditySource as number | string | null | undefined);
            const liquidity = formatUsd(liquidityValue);
            const totalVolumeSource = token.totalVolume && typeof token.totalVolume === "object" ? (token.totalVolume as Record<string, unknown>).h24 : undefined;
            const volumeValue = pickNumber(token.volume24hUsd, token.volume24h_usd, token.volume24h, totalVolumeSource as number | string | null | undefined);
            const volume = formatUsd(volumeValue);
            const marketCapValue = pickNumber(
              token.marketCap,
              token.market_cap,
              token.marketCapUsd,
              token.market_cap_usd,
              token.fdv,
              token.fdvUsd,
              token.fdv_usd,
            );
            const marketCap = formatUsd(marketCapValue);
            const priceChangeRaw = pickNumber(
              token.priceChange?.h24,
              token.price_change_24h,
              token.priceChange24h,
            );
            const priceChange = priceChangeRaw !== undefined ? formatPercent(priceChangeRaw) : undefined;

            const pairs = Array.isArray(token.pairs) ? token.pairs.slice(0, 3) : [];

            return (
              <article key={address ?? `token-${index}`} className="flex flex-col gap-3 border-b border-slate-200/60 pb-5 last:border-0 last:pb-0">
                <div className="flex items-start gap-3">
                  <TokenIcon label={symbol} imageUrl={imageUrl} size={52} />
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="text-base font-semibold text-slate-900">{symbol}</span>
                        {name && <span className="text-xs text-slate-500">{name}</span>}
                      </div>
                    </div>
                    {address && (
                      <HashBadge value={address} href={`https://solscan.io/token/${address}`} ariaLabel={`${symbol} mint`} />
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  {marketCap && <MetricPill label="Market Cap" value={marketCap} />}
                  {priceChange && (
                    <MetricPill
                      label="Change"
                      value={priceChange}
                      tone={priceChangeRaw !== undefined && priceChangeRaw < 0 ? "negative" : "positive"}
                    />
                  )}
                  {liquidity && <MetricPill label="Liquidity" value={liquidity} />}
                  {volume && <MetricPill label="24h Volume" value={volume} />}
                </div>

                {pairs.length > 0 && (
                  <div className="flex flex-col gap-2 text-sm text-slate-600">
                    <span className="text-[11px] uppercase tracking-[0.24em] text-slate-300">Active pools</span>
                    <div className="flex flex-wrap gap-2">
                      {pairs.map((pair, idx) => {
                        const dexLabel = pickString(pair.dexId) ?? `Pool ${idx + 1}`;
                        const url = pickString(pair.url);
                        const liq = formatUsd(
                          pickNumber(
                            pair.liquidity && typeof pair.liquidity === "object" ? (pair.liquidity as Record<string, unknown>).usd as number | string | null | undefined : undefined,
                            pair.liquidityUsd,
                            pair.liquidity_usd,
                          ),
                        );
                        return url ? (
                          <LinkPill key={url ?? `${dexLabel}-${idx}`} value={`${dexLabel}${liq ? ` · ${liq}` : ""}`} href={url} />
                        ) : (
                          <MetricPill key={`${dexLabel}-${idx}`} label={dexLabel} value={liq ?? "On-chain"} />
                        );
          })}

          {visibleTokens.length === 0 && (
            <p className="text-sm text-slate-500">No tokens matched this query.</p>
          )}
        </div>
                  </div>
                )}
              </article>
            );
          })}

          {visibleTokens.length === 0 && (
            <p className="text-sm text-slate-500">No tokens returned for this query.</p>
          )}
        </div>
      </section>

      {debug && (
        <details className="mt-4 max-w-2xl text-sm text-slate-700" open>
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Raw token payload
          </summary>
          <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-slate-200/70 bg-white/80 p-3 text-xs">
            {JSON.stringify(rawOutput, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
};

export default solanaResolveTokenRenderer;
