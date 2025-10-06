import type { ToolNoteRenderer } from "./types";
import {
  BASE_CARD_CLASS,
  SECTION_TITLE_CLASS,
  normalizeOutput,
  unwrapStructured,
} from "./helpers";

const searchRenderer: ToolNoteRenderer = ({ item, isExpanded, onToggle, debug }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, any> | undefined) || {};
  const payload = unwrapStructured(rawOutput);
  const results = Array.isArray((payload as any)?.results)
    ? (payload as any).results
    : Array.isArray(payload)
      ? payload
      : [];

  return (
    <div className={BASE_CARD_CLASS}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className={SECTION_TITLE_CLASS}>Dexter Search</div>
          <div className="mt-2 text-xs text-[#F9D9C3]">{item.timestamp}</div>
        </div>
        <div className="rounded-full border border-[#F7BE8A]/30 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-[#FFE4CF]">
          {results.length} hit{results.length === 1 ? "" : "s"}
        </div>
      </div>

      {results.length > 0 ? (
        <ol className="mt-4 space-y-3 text-sm text-[#FFF2E2]">
          {results.map((result: any, index: number) => {
            const title = typeof result?.title === "string" ? result.title : `Result ${index + 1}`;
            const url = typeof result?.url === "string" ? result.url : undefined;
            const snippet = typeof result?.snippet === "string" ? result.snippet : undefined;
            return (
              <li key={result?.id ?? index} className="rounded-xl border border-[#F7BE8A]/18 bg-[#1A090D]/70 p-3">
                <div className="flex flex-col gap-1">
                  {url ? (
                    <a href={url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-flux transition hover:text-flux/80">
                      {title}
                    </a>
                  ) : (
                    <span className="text-sm font-semibold text-[#FFF6EC]">{title}</span>
                  )}
                  {snippet && <p className="text-xs text-[#F9D9C3]">{snippet}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="mt-4 rounded-lg border border-dashed border-[#F7BE8A]/24 px-4 py-6 text-center text-sm text-[#F9D9C3]">
          No documents matched this query.
        </div>
      )}

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

export default searchRenderer;
