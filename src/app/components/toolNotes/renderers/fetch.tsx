import React from "react";

import type { ToolNoteRenderer } from "./types";
import { BASE_CARD_CLASS, normalizeOutput, unwrapStructured } from "./helpers";
import { LinkPill } from "./solanaVisuals";

type DocumentPayload = {
  title?: string;
  url?: string;
  text?: string;
};

const fetchRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const normalized = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const doc = unwrapStructured(normalized) as DocumentPayload;

  const title = doc.title?.trim() || "Document";
  const url = doc.url?.trim();
  const text = doc.text ?? "";
  const paragraphs = text
    ? text
        .split(/\n+/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
    : [];

  return (
    <div className={BASE_CARD_CLASS}>
      <section className="flex flex-col gap-6">
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-[0.26em] text-indigo-500">Fetched document</span>
            <span className="text-xs text-slate-400">{new Date(item.timestamp).toLocaleString()}</span>
          </div>
          {url && <LinkPill value="Open" href={url} />}
        </header>

        <article className="flex flex-col gap-3">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          {paragraphs.length > 0 ? (
            <div className="space-y-3 text-sm text-slate-600">
              {paragraphs.slice(0, 3).map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
              {paragraphs.length > 3 && <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Excerpt truncated</p>}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No preview text available.</p>
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
