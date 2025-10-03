import type { ToolNoteRenderer } from "./types";
import { BASE_CARD_CLASS, HashBadge, SECTION_TITLE_CLASS, normalizeOutput, unwrapStructured } from "./helpers";

const solanaBalancesRenderer: ToolNoteRenderer = ({ item, isExpanded, onToggle, debug }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, any> | undefined) || {};
  const payload = unwrapStructured(rawOutput);

  const balances = Array.isArray((payload as any)?.balances)
    ? (payload as any).balances
    : Array.isArray(payload)
      ? payload
      : [];

  return (
    <div className={BASE_CARD_CLASS}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className={SECTION_TITLE_CLASS}>Token Balances</div>
          <div className="mt-2 text-xs text-neutral-400">{item.timestamp}</div>
        </div>
        <div className="rounded-full border border-neutral-700 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-neutral-300">
          {balances.length} token{balances.length === 1 ? "" : "s"}
        </div>
      </div>

      {balances.length > 0 ? (
        <div className="mt-4 space-y-3">
          {balances.slice(0, 6).map((entry: any, index: number) => {
            const mint = typeof entry?.mint === "string" ? entry.mint : null;
            const amountUi = typeof entry?.amountUi === "number" ? entry.amountUi : Number(entry?.amount_ui);
            const decimals = typeof entry?.decimals === "number" ? entry.decimals : undefined;
            const ata = typeof entry?.ata === "string" ? entry.ata : null;

            return (
              <div key={mint ?? ata ?? index} className="rounded-xl border border-neutral-800/40 bg-surface-glass/40 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-neutral-100">
                    {mint ? `${mint.slice(0, 4)}…${mint.slice(-4)}` : `Token ${index + 1}`}
                  </div>
                  {typeof amountUi === "number" && (
                    <div className="text-xs text-neutral-300">
                      {amountUi.toLocaleString("en-US", { maximumFractionDigits: decimals && decimals > 4 ? 4 : decimals ?? 6 })}
                    </div>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
                  {mint && <HashBadge value={mint} href={`https://solscan.io/token/${mint}`} ariaLabel="Token mint" />}
                  {ata && <HashBadge value={ata} ariaLabel="Associated token account" />}
                  {typeof decimals === "number" && <span>decimals: {decimals}</span>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-dashed border-neutral-800/60 px-4 py-6 text-center text-sm text-neutral-400">
          No balances returned for this wallet.
        </div>
      )}

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

export default solanaBalancesRenderer;
