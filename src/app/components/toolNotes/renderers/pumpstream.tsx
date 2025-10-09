import React from "react";

import type { ToolNoteRenderer } from "./types";
import { BASE_CARD_CLASS, normalizeOutput } from "./helpers";
import { MetricPill, TokenIcon } from "./solanaVisuals";
import { HashBadge } from "./helpers";

type StreamEntry = {
  name?: string;
  symbol?: string;
  mintId?: string;
  channel?: string;
  url?: string;
  streamUrl?: string;
  thumbnail?: string;
  currentViewers?: number;
  viewer_count?: number;
  viewers?: number;
  marketCapUsd?: number;
  market_cap_usd?: number;
  marketCap?: number;
  momentum?: number | string;
  signal?: number | string;
};

const countFormatter = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

function formatViewerCount(value: unknown) {
  const numeric = typeof value === "number" ? value : typeof value === "string" ? Number(value) : undefined;
  if (numeric === undefined || !Number.isFinite(numeric)) return undefined;
  return `${countFormatter.format(numeric)} watching`;
}

function formatCurrency(value: unknown) {
  const numeric = typeof value === "number" ? value : typeof value === "string" ? Number(value) : undefined;
  if (numeric === undefined || !Number.isFinite(numeric)) return undefined;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(numeric);
}

function formatMomentum(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  }
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  return undefined;
}

const pumpstreamRenderer: ToolNoteRenderer = ({ item, isExpanded, onToggle, debug = false }) => {
  const payload = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const streams: StreamEntry[] = Array.isArray((payload as any).streams) ? (payload as any).streams : [];
  const generatedAt = typeof (payload as any).generatedAt === "string" ? (payload as any).generatedAt : null;

  const visibleStreams = isExpanded ? streams : streams.slice(0, 6);
  const hasMore = streams.length > visibleStreams.length;

  return (
    <div className={BASE_CARD_CLASS}>
      <section className="flex flex-col gap-7">
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-[0.26em] text-indigo-500">Pump.fun Streams</span>
            {generatedAt && <span className="text-xs text-slate-400">Updated {new Date(generatedAt).toLocaleTimeString()}</span>}
          </div>
          <MetricPill label="Live" value={`${streams.length}`} tone={streams.length ? "positive" : "neutral"} />
        </header>

        <div className="flex flex-col gap-5">
          {visibleStreams.map((stream, index) => {
            const title = stream.name || stream.symbol || stream.mintId || stream.channel || `Stream ${index + 1}`;
            const viewers = formatViewerCount(stream.currentViewers ?? stream.viewer_count ?? stream.viewers);
            const marketCap = formatCurrency(stream.marketCapUsd ?? stream.market_cap_usd ?? stream.marketCap);
            const momentumValue = stream.momentum ?? stream.signal;
            const momentumDisplay = formatMomentum(momentumValue);
            const momentumTone = typeof momentumValue === "number" && momentumValue < 0 ? "negative" : "positive";
            const href = stream.url || stream.streamUrl || (stream.mintId ? `https://pump.fun/${stream.mintId}` : undefined);

            const body = (
              <div className="flex items-start gap-4">
                {stream.thumbnail ? (
                  <div className="relative h-[72px] w-[120px] overflow-hidden rounded-xl shadow-[0_14px_28px_rgba(15,23,42,0.18)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={stream.thumbnail} alt={title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
                  </div>
                ) : (
                  <TokenIcon label={title.slice(0, 2)} size={56} />
                )}
                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-base font-semibold text-slate-900">{title}</span>
                    {viewers && <span className="text-xs uppercase tracking-[0.22em] text-slate-400">{viewers}</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                    {marketCap && (
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-900">
                        <span className="text-[0.58rem] uppercase tracking-[0.28em] text-slate-400">MC</span>
                        {marketCap}
                        {momentumDisplay && (
                          <span className={momentumTone === "negative" ? "text-rose-500" : "text-emerald-500"}>{momentumDisplay}</span>
                        )}
                      </span>
                    )}
                    {stream.mintId && (
                      <HashBadge value={stream.mintId} href={`https://solscan.io/token/${stream.mintId}`} ariaLabel={`${title} mint`} />
                    )}
                  </div>
                </div>
              </div>
            );

            return (
              <article key={stream.mintId ?? href ?? `${title}-${index}`} className="group flex flex-col gap-3 border-b border-slate-200/60 pb-5 last:border-0 last:pb-0">
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-col gap-2 transition hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-flux/40"
                  >
                    {body}
                  </a>
                ) : (
                  body
                )}
              </article>
            );
          })}

          {visibleStreams.length === 0 && <p className="text-sm text-slate-500">No live streams detected.</p>}
        </div>

        {hasMore && (
          <button
            type="button"
            onClick={onToggle}
            className="self-start rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
          >
            {isExpanded ? "Collapse" : `Show ${streams.length - visibleStreams.length} more`}
          </button>
        )}
      </section>

      {debug && (
        <details className="mt-4 max-w-2xl text-sm text-slate-700" open>
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Raw pumpstream payload
          </summary>
          <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-slate-200/70 bg-white/80 p-3 text-xs">
            {JSON.stringify(payload, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
};

export default pumpstreamRenderer;
