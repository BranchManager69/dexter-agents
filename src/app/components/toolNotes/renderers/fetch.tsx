import type { ToolNoteRenderer } from "./types";
import {
  BASE_CARD_CLASS,
  SECTION_TITLE_CLASS,
  normalizeOutput,
  unwrapStructured,
} from "./helpers";

const fetchRenderer: ToolNoteRenderer = ({ item, isExpanded, onToggle, debug }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, any> | undefined) || {};
  const doc = unwrapStructured(rawOutput);

  const title = typeof (doc as any)?.title === "string" ? (doc as any).title : "Document";
  const url = typeof (doc as any)?.url === "string" ? (doc as any).url : undefined;
  const text = typeof (doc as any)?.text === "string" ? (doc as any).text : undefined;

  const excerpt = text ? text.split(/\n+/).filter(Boolean).slice(0, 2).join("\n") : null;

  return (
    <div className={BASE_CARD_CLASS}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className={SECTION_TITLE_CLASS}>Dexter Document</div>
          <div className="mt-2 text-xs text-neutral-400">{item.timestamp}</div>
        </div>
        {url && (
          <a href={url} target="_blank" rel="noreferrer" className="rounded-full border border-neutral-700 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-flux transition hover:text-flux/80">
            Open
          </a>
        )}
      </div>

      <div className="mt-4 space-y-3 text-sm text-neutral-100">
        <div className="font-semibold">{title}</div>
        {excerpt ? (
          <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words text-xs text-neutral-300">{excerpt}</pre>
        ) : (
          <div className="text-xs text-neutral-400">No preview text available.</div>
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
          {isExpanded && text && (
            <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-neutral-800/60 bg-surface-base/80 p-3 text-[11px] text-neutral-200">
              {text}
            </pre>
          )}
          {isExpanded && !text && (
            <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-neutral-800/60 bg-surface-base/80 p-3 text-[11px] text-neutral-200">
              {JSON.stringify(rawOutput, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};

export default fetchRenderer;
