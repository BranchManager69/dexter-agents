import React from "react";

import type { ToolNoteRenderer } from "./types";
import { BASE_CARD_CLASS, normalizeOutput, unwrapStructured, formatTimestampDisplay } from "./helpers";
import { TokenIcon } from "./solanaVisuals";

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
  const timestamp = formatTimestampDisplay(item.timestamp);

  return (
    <div className={BASE_CARD_CLASS}>
      <section className="flex flex-col gap-6">
        <header className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-[0.32em] text-slate-400">Fetched page</span>
          {timestamp && <span className="text-xs text-slate-400">{timestamp}</span>}
        </header>

        <article className="flex flex-col gap-5">
          <header className="flex items-start gap-3">
            <TokenIcon label={(hostname ?? title).slice(0, 2).toUpperCase()} size={48} />
            <div className="flex flex-1 flex-col gap-1">
              {hostname && <span className="text-xs uppercase tracking-[0.24em] text-slate-400">{hostname}</span>}
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
              {snippet && <p className="text-sm text-slate-600">{snippet}</p>}
            </div>
          </header>

          {paragraphs.length > 0 ? (
            <div className="space-y-3 rounded-2xl border border-slate-200/70 p-4 text-sm leading-relaxed text-slate-700">
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
