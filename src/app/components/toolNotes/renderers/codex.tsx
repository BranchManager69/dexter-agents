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
            <div className="mt-2 text-xs text-[#F9D9C3]">{item.timestamp}</div>
          </div>
          <span className="rounded-full border border-[#F7BE8A]/30 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-[#FFE4CF]">
            {badgeLabel}
          </span>
        </div>

        <div className="mt-4 space-y-3 text-sm text-[#FFF2E2]">
          {conversationId && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#F9D9C3]">
              <span className="uppercase tracking-[0.24em]">Conversation</span>
              <span className="font-mono text-[#FFF6EC]">{conversationId}</span>
            </div>
          )}

          {model && (
            <div className="text-xs text-[#F9D9C3]">Model: <span className="text-[#FFF2E2]">{model}</span></div>
          )}
          {reasoningEffort && (
            <div className="text-xs text-[#F9D9C3]">Effort: <span className="text-[#FFF2E2]">{reasoningEffort}</span></div>
          )}
          {typeof durationMs === "number" && (
            <div className="text-xs text-[#F9D9C3]">Duration: <span className="text-[#FFF2E2]">{(durationMs / 1000).toFixed(2)}s</span></div>
          )}

          {message && (
            <div className="rounded-xl border border-[#F7BE8A]/18 bg-[#1A090D]/70 p-3 text-xs text-[#FFF6EC] whitespace-pre-wrap">
              {message}
            </div>
          )}
          {reasoning && (
            <details className="rounded-xl border border-[#F7BE8A]/18 bg-surface-glass/30 p-3 text-xs text-[#FFF2E2]">
              <summary className="cursor-pointer text-[10px] uppercase tracking-[0.22em] text-[#F0BFA1]">Reasoning trail</summary>
              <pre className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap break-words text-[#FFF2E2]">{reasoning}</pre>
            </details>
          )}

          {tokenUsage && (
            <div className="rounded-xl border border-[#F7BE8A]/18 bg-[#1A090D]/70 p-3 text-xs text-[#FFE4CF]">
              <div className="text-[10px] uppercase tracking-[0.22em] text-[#F0BFA1]">Token usage</div>
              <pre className="mt-1 whitespace-pre-wrap break-words text-[#FFF2E2]">{JSON.stringify(tokenUsage, null, 2)}</pre>
            </div>
          )}
        </div>

        {debug && (
          <div className="mt-4 border-t border-[#F7BE8A]/22 pt-3">
            <button
              type="button"
              onClick={onToggle}
              className="text-xs uppercase tracking-[0.24em] text-[#F9D9C3] transition hover:text-[#FFF2E2]"
            >
              {isExpanded ? "Hide raw payload" : "Show raw payload"}
            </button>
            {isExpanded && (
              <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-[#F7BE8A]/24 bg-[#16070C]/85 p-3 text-[11px] text-[#FFF2E2]">
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
