import type { ToolNoteRenderer } from "./types";
import {
  BASE_CARD_CLASS,
  HashBadge,
  SECTION_TITLE_CLASS,
  normalizeOutput,
  unwrapStructured,
} from "./helpers";

const walletOverrideRenderer: ToolNoteRenderer = ({ item, isExpanded, onToggle, debug }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, any> | undefined) || {};
  const payload = unwrapStructured(rawOutput);

  const ok = Boolean((payload as any)?.ok);
  const cleared = Boolean((payload as any)?.cleared);
  const walletAddress = typeof (payload as any)?.wallet_address === "string" ? (payload as any).wallet_address : null;

  const statusLabel = cleared ? "Override cleared" : ok ? "Override active" : "Override failed";
  const statusTone = cleared ? "border border-[#F7BE8A]/30 text-[#FFE4CF]" : ok ? "border border-emerald-500/40 text-emerald-200" : "border border-rose-500/40 text-rose-200";

  return (
    <div className={BASE_CARD_CLASS}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className={SECTION_TITLE_CLASS}>Session Wallet Override</div>
          <div className="mt-2 text-xs text-[#F9D9C3]">{item.timestamp}</div>
        </div>
        <span className={`rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.2em] ${statusTone} bg-[#1A090D]/70`}>
          {statusLabel}
        </span>
      </div>

      {!cleared && walletAddress && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-[0.24em] text-[#F0BFA1]">Override wallet</span>
          <HashBadge value={walletAddress} href={`https://solscan.io/account/${walletAddress}`} ariaLabel="Override wallet" />
        </div>
      )}

      {cleared && (
        <div className="mt-4 rounded-lg border border-[#F7BE8A]/22 bg-[#1A090D]/70 px-3 py-2 text-xs text-[#FFE4CF]">
          Override removed. Session is back to resolver defaults.
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

export default walletOverrideRenderer;
