import type { ToolNoteRenderer } from "./types";
import { BASE_CARD_CLASS, SECTION_TITLE_CLASS, normalizeOutput, unwrapStructured } from "./helpers";

function createCodexRenderer(kind: "start" | "reply" | "exec"): ToolNoteRenderer {
  const badgeLabel = kind === "start" ? "Session started" : kind === "reply" ? "Reply sent" : "Exec run";

  const CodexRenderer: ToolNoteRenderer = ({ item, isExpanded, onToggle, debug }) => {
    const rawOutput = normalizeOutput(item.data as Record<string, any> | undefined) || {};
    const structured = unwrapStructured(rawOutput);

    const conversationId = typeof (structured as any)?.conversationId === "string" ? (structured as any).conversationId : null;
    const message = (structured as any)?.response?.text;
    const reasoning = (structured as any)?.response?.reasoning;
    const model = (structured as any)?.session?.model;
    const reasoningEffort = (structured as any)?.session?.reasoningEffort;
    const durationMs = typeof (structured as any)?.durationMs === "number" ? (structured as any).durationMs : null;
    const tokenUsage = (structured as any)?.tokenUsage;

    return (
      <div className={BASE_CARD_CLASS}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className={SECTION_TITLE_CLASS}>Codex {kind === "exec" ? "Exec" : "Session"}</div>
            <div className="mt-2 text-xs text-neutral-400">{item.timestamp}</div>
          </div>
          <span className="rounded-full border border-neutral-700 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-neutral-300">
            {badgeLabel}
          </span>
        </div>

        <div className="mt-4 space-y-3 text-sm text-neutral-200">
          {conversationId && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400">
              <span className="uppercase tracking-[0.24em]">Conversation</span>
              <span className="font-mono text-neutral-100">{conversationId}</span>
            </div>
          )}

          {model && (
            <div className="text-xs text-neutral-400">Model: <span className="text-neutral-200">{model}</span></div>
          )}
          {reasoningEffort && (
            <div className="text-xs text-neutral-400">Effort: <span className="text-neutral-200">{reasoningEffort}</span></div>
          )}
          {typeof durationMs === "number" && (
            <div className="text-xs text-neutral-400">Duration: <span className="text-neutral-200">{(durationMs / 1000).toFixed(2)}s</span></div>
          )}

          {message && (
            <div className="rounded-xl border border-neutral-800/40 bg-surface-glass/40 p-3 text-xs text-neutral-100 whitespace-pre-wrap">
              {message}
            </div>
          )}
          {reasoning && (
            <details className="rounded-xl border border-neutral-800/40 bg-surface-glass/30 p-3 text-xs text-neutral-200">
              <summary className="cursor-pointer text-[10px] uppercase tracking-[0.22em] text-neutral-500">Reasoning trail</summary>
              <pre className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap break-words text-neutral-200">{reasoning}</pre>
            </details>
          )}

          {tokenUsage && (
            <div className="rounded-xl border border-neutral-800/40 bg-surface-glass/40 p-3 text-xs text-neutral-300">
              <div className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">Token usage</div>
              <pre className="mt-1 whitespace-pre-wrap break-words text-neutral-200">{JSON.stringify(tokenUsage, null, 2)}</pre>
            </div>
          )}
        </div>

        {debug && (
          <div className="mt-4 border-t border-neutral-800/50 pt-3">
            <button
              type="button"
              onClick={onToggle}
              className="text-xs uppercase tracking-[0.24em] text-neutral-400 transition hover:text-neutral-200"
            >
              {isExpanded ? "Hide raw payload" : "Show raw payload"}
            </button>
            {isExpanded && (
              <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-neutral-800/60 bg-surface-base/80 p-3 text-[11px] text-neutral-200">
                {JSON.stringify(rawOutput, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    );
  };

  return CodexRenderer;
}

export const codexStartRenderer = createCodexRenderer("start");
export const codexReplyRenderer = createCodexRenderer("reply");
export const codexExecRenderer = createCodexRenderer("exec");
