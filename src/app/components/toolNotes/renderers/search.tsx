import React from "react";

import type { ToolNoteRenderer } from "./types";
import { BASE_CARD_CLASS, normalizeOutput, unwrapStructured, formatTimestampDisplay } from "./helpers";
import { TokenIcon } from "./solanaVisuals";

type SearchResult = {
  id?: string;
  title?: string;
  url?: string;
  snippet?: string;
  favicon?: string;
  content?: string | null;
  raw_content?: string | null;
  score?: number | null;
  published_at?: string | null;
};

type SearchPayload = {
  results?: SearchResult[];
  answer?: string | null;
  response_time?: number | null;
  responseTime?: number | null;
  images?: Array<{ url?: string | null; description?: string | null }>;
};

type SearchArgs = {
  query?: string;
};

function extractHostname(url?: string | null) {
  if (!url) return null;
  try {
    const { hostname } = new URL(url);
    return hostname.replace(/^www\./i, "");
  } catch {
    return null;
  }
}

function resolveFaviconUrl(favicon?: string | null, pageUrl?: string | null) {
  if (!favicon) return null;
  const trimmed = favicon.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("data:")) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }
  if (pageUrl) {
    try {
      const base = new URL(pageUrl);
      if (trimmed.startsWith("/")) {
        return `${base.origin}${trimmed}`;
      }
      return new URL(trimmed, `${base.origin}/`).toString();
    } catch {
      // ignore and fall back below
    }
  }
  return trimmed;
}

function formatResponseTime(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  if (value >= 1200) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, "")} s`;
  }
  return `${Math.round(value)} ms`;
}

const searchRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const normalized = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(normalized) as SearchPayload | SearchResult[];
  const args = ((item.data as any)?.arguments ?? {}) as SearchArgs;

  const results: SearchResult[] = Array.isArray((payload as SearchPayload)?.results)
    ? ((payload as SearchPayload).results as SearchResult[])
    : Array.isArray(payload)
      ? (payload as SearchResult[])
      : [];

  const answer = typeof (payload as SearchPayload)?.answer === "string" && (payload as SearchPayload).answer?.trim().length
    ? (payload as SearchPayload).answer!.trim()
    : null;
  const query = typeof args.query === "string" && args.query.trim().length > 0 ? args.query.trim() : undefined;
  const responseTimeRaw =
    (payload as SearchPayload)?.response_time ??
    (payload as SearchPayload)?.responseTime ??
    (typeof (normalized as any)?.response_time === "number" ? (normalized as any).response_time : undefined);
  const responseTime =
    typeof responseTimeRaw === "number"
      ? responseTimeRaw
      : typeof responseTimeRaw === "string"
        ? Number(responseTimeRaw)
        : undefined;
  const responseTimeDisplay = formatResponseTime(Number.isFinite(responseTime) ? responseTime : undefined);
  const rawImages = Array.isArray((payload as SearchPayload)?.images) ? ((payload as SearchPayload).images ?? []) : [];
  const imageResults = rawImages.filter(
    (img): img is { url: string; description?: string | null } =>
      Boolean(img && typeof img.url === "string" && img.url.trim().length),
  );

  const timestamp = formatTimestampDisplay(item.timestamp);

  return (
    <div className={BASE_CARD_CLASS}>
      <section className="flex flex-col gap-6">
        <header className="flex flex-col gap-1">
          {query && <span className="text-xs uppercase tracking-[0.32em] text-slate-400">Search</span>}
          <div className="flex flex-col gap-1">
            {query && <h2 className="text-lg font-semibold text-slate-900">{query}</h2>}
            {(timestamp || responseTimeDisplay) && (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                {timestamp && <span>{timestamp}</span>}
                {timestamp && responseTimeDisplay && <span>•</span>}
                {responseTimeDisplay && <span>Response time {responseTimeDisplay}</span>}
              </div>
            )}
          </div>
        </header>

        {answer && (
          <article className="rounded-2xl border border-slate-200/70 bg-white/60 px-4 py-3 text-sm text-slate-700 shadow-sm">
            <span className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-400">Summary</span>
            <p className="mt-2 break-words leading-relaxed">{answer}</p>
          </article>
        )}

        {imageResults.length > 0 && (
          <section className="flex flex-col gap-3">
            <span className="text-xs uppercase tracking-[0.32em] text-slate-400">Image Highlights</span>
            <div className={`grid gap-3 ${imageResults.length > 1 ? "sm:grid-cols-2" : ""}`}>
              {imageResults.slice(0, 4).map((image, index) => (
                <a
                  key={`${image.url}-${index}`}
                  href={image.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative block overflow-hidden rounded-2xl border border-transparent bg-white/40 shadow-sm transition hover:border-slate-200 hover:bg-white/70"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.url}
                    alt={image.description ?? "Search result illustration"}
                    loading="lazy"
                    className="h-40 w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                  />
                  {image.description && (
                    <div className="absolute inset-x-0 bottom-0 bg-black/55 px-3 py-2 text-xs font-medium text-white backdrop-blur-sm">
                      <p className="line-clamp-2">{image.description}</p>
                    </div>
                  )}
                </a>
              ))}
            </div>
          </section>
        )}

        <div className="flex flex-col gap-5">
          {results.map((result, index) => {
            const title = result.title?.trim() || `Result ${index + 1}`;
            const snippet = result.snippet?.trim();
            const url = result.url?.trim();
            const hostname = extractHostname(url);
            const label = hostname ? hostname.slice(0, 2).toUpperCase() : title.slice(0, 2).toUpperCase();
            const publishedAt = formatTimestampDisplay(result.published_at ?? (result as any)?.publishedAt);
            const score = typeof result.score === "number" && Number.isFinite(result.score) ? result.score : null;
            const faviconUrl =
              resolveFaviconUrl(result.favicon, url) ??
              (url || hostname
                ? `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(url ?? hostname!)}`
                : null);

            return (
              <article
                key={result.id ?? url ?? `result-${index}`}
                className="group flex w-full flex-col gap-2 rounded-2xl border border-transparent px-4 py-3 transition hover:border-slate-200 hover:bg-white/60"
              >
                {url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-col gap-3 focus:outline-none focus:ring-2 focus:ring-flux/40"
                  >
                    <div className="flex items-start gap-4">
                      <div className="mt-[3px] flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 shadow-sm">
                        {faviconUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={faviconUrl}
                            alt={hostname ?? title}
                            className="h-full w-full object-cover"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <TokenIcon label={label} size={48} />
                        )}
                      </div>
                      <div className="flex flex-1 flex-col gap-1">
                        {hostname && (
                          <span className="text-xs uppercase tracking-[0.24em] text-slate-400">
                            {hostname}
                          </span>
                        )}
                        <span className="break-words text-base font-semibold text-slate-900 transition group-hover:text-flux">
                          {title}
                        </span>
                        {snippet && <p className="break-words text-sm text-slate-600">{snippet}</p>}
                        {(publishedAt || score !== null) && (
                          <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-slate-400">
                            {publishedAt && <span>{publishedAt}</span>}
                            {publishedAt && score !== null && <span>•</span>}
                            {score !== null && <span>Relevance {score.toFixed(2)}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </a>
                ) : (
                  <div className="flex flex-col gap-1">
                    <span className="break-words text-sm font-semibold text-slate-900">{title}</span>
                    {snippet && <p className="break-words text-sm text-slate-600">{snippet}</p>}
                  </div>
                )}
              </article>
            );
          })}

          {results.length === 0 && <p className="text-sm text-slate-500">No web results were returned.</p>}
        </div>
      </section>

      {debug && (
        <details className="mt-4 max-w-2xl text-sm text-slate-700" open>
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Raw search payload
          </summary>
          <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-slate-200/70 bg-white/80 p-3 text-xs">
            {JSON.stringify(normalized, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
};

export default searchRenderer;
