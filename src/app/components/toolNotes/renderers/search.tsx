import React from "react";

import type { ToolNoteRenderer } from "./types";
import { BASE_CARD_CLASS, normalizeOutput, unwrapStructured } from "./helpers";
import { LinkPill, MetricPill } from "./solanaVisuals";

type SearchResult = {
  id?: string;
  title?: string;
  url?: string;
  snippet?: string;
};

type SearchPayload = {
  results?: SearchResult[];
};

type SearchArgs = {
  query?: string;
};

const searchRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const normalized = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(normalized) as SearchPayload | SearchResult[];
  const args = ((item.data as any)?.arguments ?? {}) as SearchArgs;

  const results: SearchResult[] = Array.isArray((payload as SearchPayload)?.results)
    ? ((payload as SearchPayload).results as SearchResult[])
    : Array.isArray(payload)
      ? (payload as SearchResult[])
      : [];

  const query = typeof args.query === "string" && args.query.trim().length > 0 ? args.query.trim() : undefined;

  return (
    <div className={BASE_CARD_CLASS}>
      <section className="flex flex-col gap-7">
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-[0.26em] text-indigo-500">Dexter Search</span>
            {query && <span className="text-sm text-slate-500">Query · {query}</span>}
            <span className="text-xs text-slate-400">{new Date(item.timestamp).toLocaleString()}</span>
          </div>
          <MetricPill label="Hits" value={`${results.length}`} tone={results.length ? "neutral" : "notice"} />
        </header>

        <div className="flex flex-col gap-4">
          {results.map((result, index) => {
            const title = result.title?.trim() || `Result ${index + 1}`;
            const snippet = result.snippet?.trim();
            const url = result.url?.trim();

            return (
              <article key={result.id ?? url ?? `result-${index}`} className="flex flex-col gap-2 border-b border-slate-200/60 pb-4 last:border-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-900">{title}</span>
                  {url && <LinkPill value="Open" href={url} />}
                </div>
                {snippet && <p className="text-sm text-slate-600">{snippet}</p>}
                {!snippet && <p className="text-sm text-slate-500">No excerpt available.</p>}
              </article>
            );
          })}

          {results.length === 0 && <p className="text-sm text-slate-500">No documents matched this query.</p>}
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
