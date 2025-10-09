import React from "react";

import type { ToolNoteRenderer } from "./types";
import { BASE_CARD_CLASS, normalizeOutput, unwrapStructured } from "./helpers";
import { MetricPill, TokenIcon } from "./solanaVisuals";

type DocumentPayload = {
  title?: string;
  url?: string;
  text?: string;
  snippet?: string;
  images?: string[];
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

const fetchRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const normalized = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const doc = unwrapStructured(normalized) as DocumentPayload;

  const title = doc.title?.trim() || "Document";
  const url = doc.url?.trim();
  const hostname = extractHostname(url);
  const snippet = doc.snippet?.trim();
  const text = doc.text ?? "";
  const paragraphs = text
    ? text
        .split(/\n+/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
    : [];
  const imageCount = Array.isArray(doc.images) ? doc.images.length : 0;

  return (
    <div className={BASE_CARD_CLASS}>
      <section className="flex flex-col gap-6">
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-[0.26em] text-indigo-500">Fetched document</span>
            <span className="text-xs text-slate-400">{new Date(item.timestamp).toLocaleString()}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {hostname && <MetricPill label="Domain" value={hostname} />}
            {imageCount > 0 && <MetricPill label="Images" value={`${imageCount}`} />}
          </div>
        </header>

        <article className="flex flex-col gap-4 rounded-2xl border border-slate-200/60 bg-white/70 p-4 shadow-sm">
          <header className="flex items-start gap-3">
            <TokenIcon label={(hostname ?? title).slice(0, 2).toUpperCase()} size={48} />
            <div className="flex flex-1 flex-col gap-1">
              {url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-base font-semibold text-slate-900 transition hover:text-flux focus:outline-none focus:ring-2 focus:ring-flux/40"
                >
                  {title}
                </a>
              ) : (
                <h3 className="text-base font-semibold text-slate-900">{title}</h3>
              )}
              {hostname && <span className="text-xs uppercase tracking-[0.28em] text-slate-400">{hostname}</span>}
              {snippet && <p className="text-sm text-slate-600">{snippet}</p>}
            </div>
          </header>

          {paragraphs.length > 0 ? (
            <div className="space-y-3 text-sm text-slate-600">
              {paragraphs.slice(0, 4).map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
              {paragraphs.length > 4 && <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Excerpt truncated</p>}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No full text returned for this page.</p>
          )}
        </article>
      </section>

      {debug && (
        <details className="mt-4 max-w-2xl text-sm text-slate-700" open>
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Raw fetch payload
          </summary>
          <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-slate-200/70 bg-white/80 p-3 text-xs">
            {text || JSON.stringify(normalized, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
};

export default fetchRenderer;
