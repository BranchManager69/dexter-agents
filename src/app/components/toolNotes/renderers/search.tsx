import React from "react";

import type { ToolNoteRenderer } from "./types";
import { BASE_CARD_CLASS, normalizeOutput, unwrapStructured } from "./helpers";
import { TokenIcon } from "./solanaVisuals";

type SearchResult = {
  id?: string;
  title?: string;
  url?: string;
  snippet?: string;
  favicon?: string;
};

type SearchPayload = {
  results?: SearchResult[];
  answer?: string | null;
  response_time?: number | null;
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

  return (
    <div className={BASE_CARD_CLASS}>
      <section className="flex flex-col gap-6">
        <header className="flex flex-col gap-1">
          {query && <span className="text-xs uppercase tracking-[0.32em] text-slate-400">Search</span>}
          <div className="flex flex-col gap-1">
            {query && <h2 className="text-lg font-semibold text-slate-900">{query}</h2>}
            <span className="text-xs text-slate-400">{new Date(item.timestamp).toLocaleString()}</span>
          </div>
        </header>

        {answer && (
          <article className="rounded-2xl border border-slate-200/70 bg-white/60 px-4 py-3 text-sm text-slate-700 shadow-sm">
            <span className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-400">Summary</span>
            <p className="mt-2 leading-relaxed">{answer}</p>
          </article>
        )}

        <div className="flex flex-col gap-5">
          {results.map((result, index) => {
            const title = result.title?.trim() || `Result ${index + 1}`;
            const snippet = result.snippet?.trim();
            const url = result.url?.trim();
            const hostname = extractHostname(url);

            const label = hostname ? hostname.slice(0, 2).toUpperCase() : title.slice(0, 2).toUpperCase();

            return (
              <article
                key={result.id ?? url ?? `result-${index}`}
                className="group flex flex-col gap-2 rounded-2xl border border-transparent px-4 py-3 transition hover:border-slate-200 hover:bg-white/60"
              >
                {url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-col gap-3 focus:outline-none focus:ring-2 focus:ring-flux/40"
                  >
                    <div className="flex items-start gap-4">
                      <div className="mt-[3px] flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-slate-100 shadow-sm">
                        {result.favicon ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={result.favicon} alt={hostname ?? title} className="h-full w-full object-cover" />
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
                        <span className="text-base font-semibold text-slate-900 transition group-hover:text-flux">
                          {title}
                        </span>
                        {snippet && <p className="text-sm text-slate-600">{snippet}</p>}
                      </div>
                    </div>
                  </a>
                ) : (
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-semibold text-slate-900">{title}</span>
                    {snippet && <p className="text-sm text-slate-600">{snippet}</p>}
                  </div>
                )}
              </article>
            );
          })}

          {results.length === 0 && <p className="text-sm text-slate-500">Tavily did not return any web results.</p>}
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
