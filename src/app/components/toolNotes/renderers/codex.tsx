import React from "react";

import type { ToolNoteRenderer } from "./types";
import { BASE_CARD_CLASS, normalizeOutput, unwrapStructured, formatTimestampDisplay } from "./helpers";
import { MetricPill } from "./solanaVisuals";

type CodexPayload = {
  conversationId?: string;
  response?: {
    text?: string;
    reasoning?: string;
  };
  session?: {
    model?: string;
    reasoningEffort?: string;
  };
  durationMs?: number;
  tokenUsage?: Record<string, unknown>;
};

type CodexArgs = Record<string, unknown>;

type CodexKind = "start" | "reply" | "exec";

type InfoRow = {
  label: string;
  value: string;
};

function createCodexRenderer(kind: CodexKind): ToolNoteRenderer {
  const statusLabel = kind === "start" ? "Session started" : kind === "reply" ? "Reply sent" : "Exec run";
  const statusTone = kind === "start" ? "positive" : kind === "reply" ? "neutral" : "notice";
  const title = kind === "exec" ? "Codex Exec" : "Codex Session";

  const CodexRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
    const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
    const structured = unwrapStructured(rawOutput) as CodexPayload;
    const args = (item.data as any)?.arguments as CodexArgs | undefined;

    const conversationId = structured.conversationId ?? (typeof args?.conversation_id === "string" ? args.conversation_id : undefined);
    const message = structured.response?.text?.trim();
    const reasoning = structured.response?.reasoning?.trim();
    const model = structured.session?.model;
    const reasoningEffort = structured.session?.reasoningEffort;
    const durationMs = typeof structured.durationMs === "number" ? structured.durationMs : undefined;
    const tokenUsage = structured.tokenUsage;

    const timestamp = formatTimestampDisplay(item.timestamp);

    const infoRows: InfoRow[] = [];
    if (conversationId) infoRows.push({ label: "Conversation", value: conversationId });
    if (model) infoRows.push({ label: "Model", value: model });
    if (reasoningEffort) infoRows.push({ label: "Effort", value: reasoningEffort });
    if (durationMs !== undefined) infoRows.push({ label: "Duration", value: `${(durationMs / 1000).toFixed(2)}s` });

    return (
      <div className={BASE_CARD_CLASS}>
        <section className="flex flex-col gap-6">
          <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-[0.26em] text-indigo-500">{title}</span>
              {timestamp && <span className="text-xs text-slate-400">{timestamp}</span>}
            </div>
            <MetricPill label="Status" value={statusLabel} tone={statusTone as any} />
          </header>

          <div className="flex flex-col gap-3">
            {infoRows.length ? (
              infoRows.map((row) => (
                <div key={`${row.label}-${row.value}`} className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
                  <span className="text-xs uppercase tracking-[0.24em] text-slate-400">{row.label}</span>
                  <span className="font-semibold text-slate-900">{row.value}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No session metadata.</p>
            )}
          </div>

          {message && (
            <article className="flex flex-col gap-2 rounded-3xl bg-white/60 p-4 text-sm text-slate-700">
              <span className="text-xs uppercase tracking-[0.24em] text-slate-400">Message</span>
              <p className="leading-relaxed">{message}</p>
            </article>
          )}

          {reasoning && (
            <article className="flex flex-col gap-2 rounded-3xl bg-white/60 p-4 text-sm text-slate-700">
              <span className="text-xs uppercase tracking-[0.24em] text-slate-400">Reasoning trail</span>
              <p className="leading-relaxed whitespace-pre-wrap">{reasoning}</p>
            </article>
          )}

          {tokenUsage && (
            <article className="flex flex-col gap-2 rounded-3xl bg-white/40 p-4 text-xs text-slate-600">
              <span className="text-xs uppercase tracking-[0.24em] text-slate-400">Token usage</span>
              <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words text-[11px] text-slate-700">
                {JSON.stringify(tokenUsage, null, 2)}
              </pre>
            </article>
          )}

          {debug && (
            <details className="border-t border-slate-200 pt-3 text-xs text-slate-600">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Raw payload</summary>
              <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-2xl border border-slate-200/70 bg-white/70 p-3 text-[11px]">
                {JSON.stringify(rawOutput, null, 2)}
              </pre>
            </details>
          )}
        </section>
      </div>
    );
  };

  return CodexRenderer;
}

export const codexStartRenderer = createCodexRenderer("start");
export const codexReplyRenderer = createCodexRenderer("reply");
export const codexExecRenderer = createCodexRenderer("exec");
