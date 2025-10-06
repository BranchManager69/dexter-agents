import type { ToolNoteRenderer } from "./types";
import {
  BASE_CARD_CLASS,
  SECTION_TITLE_CLASS,
  normalizeOutput,
  unwrapStructured,
} from "./helpers";
import { SolanaAmount, formatSolValue } from "@/app/components/solana/SolanaAmount";

const solanaPreviewSellRenderer: ToolNoteRenderer = ({ item, isExpanded, onToggle, debug }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, any> | undefined) || {};
  const payload = unwrapStructured(rawOutput);

  const expectedSolRaw = (payload as any)?.expectedSol ?? (payload as any)?.expected_sol;
  const expectedSol =
    formatSolValue(expectedSolRaw, { fromLamports: true }) ?? formatSolValue(expectedSolRaw);
  const warnings = Array.isArray((payload as any)?.warnings)
    ? (payload as any).warnings.filter((w: unknown): w is string => typeof w === "string" && w.length > 0)
    : [];

  return (
    <div className={BASE_CARD_CLASS}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className={SECTION_TITLE_CLASS}>Sell Preview</div>
          <div className="mt-2 text-xs text-[#F9D9C3]">{item.timestamp}</div>
        </div>
        {expectedSol && (
          <div className="rounded-full border border-[#F7BE8A]/30 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-[#FFF2E2]">
            Expected:{" "}
            <SolanaAmount value={expectedSolRaw} fromLamports className="text-xs" />
          </div>
        )}
      </div>

      {!expectedSol && (
        <div className="mt-4 rounded-lg border border-[#F7BE8A]/22 bg-[#1A090D]/70 px-3 py-2 text-sm text-[#FFE4CF]">
          Preview did not return a quote.
        </div>
      )}

      {warnings.length > 0 && (
        <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          <div className="text-[10px] uppercase tracking-[0.22em] text-amber-300">Warnings</div>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-amber-100">
            {warnings.map((warning: string) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
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
            <pre className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-[#F7BE8A]/24 bg-[#16070C]/85 p-3 text-[11px] text-[#FFF2E2]">
              {JSON.stringify(rawOutput, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};

export default solanaPreviewSellRenderer;
