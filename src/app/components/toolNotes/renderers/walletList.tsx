import type { ToolNoteRenderer } from "./types";
import {
  BASE_CARD_CLASS,
  HashBadge,
  SECTION_TITLE_CLASS,
  normalizeOutput,
  unwrapStructured,
} from "./helpers";

const walletListRenderer: ToolNoteRenderer = ({ item, isExpanded, onToggle, debug }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, any> | undefined) || {};
  const payload = unwrapStructured(rawOutput);

  const user = payload && typeof payload === "object" ? (payload as any).user : null;
  const wallets = Array.isArray((payload as any)?.wallets) ? (payload as any).wallets : [];

  return (
    <div className={BASE_CARD_CLASS}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className={SECTION_TITLE_CLASS}>Linked Wallets</div>
          <div className="mt-2 text-xs text-neutral-400">{item.timestamp}</div>
        </div>
        <div className="rounded-full border border-neutral-700 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-neutral-300">
          {wallets.length} wallet{wallets.length === 1 ? "" : "s"}
        </div>
      </div>

      {user?.id && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-[0.24em] text-neutral-500">Supabase user</span>
          <HashBadge value={String(user.id)} />
        </div>
      )}

      {wallets.length > 0 ? (
        <div className="mt-4 space-y-3">
          {wallets.map((wallet: any, index: number) => {
            const address = typeof wallet?.address === "string" ? wallet.address : typeof wallet?.public_key === "string" ? wallet.public_key : null;
            const label = typeof wallet?.label === "string" && wallet.label.trim().length > 0 ? wallet.label : null;
            const status = typeof wallet?.status === "string" ? wallet.status : null;
            const isDefault = Boolean(wallet?.is_default);
            return (
              <div key={address ?? index} className="rounded-xl border border-neutral-800/40 bg-surface-glass/40 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-neutral-100">
                    {label || (address ? `${address.slice(0, 4)}…${address.slice(-4)}` : `Wallet ${index + 1}`)}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-neutral-400">
                    {isDefault && <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-[2px] text-emerald-200">Default</span>}
                    {status && <span className="rounded-full border border-neutral-700 px-2 py-[2px] text-neutral-300">{status}</span>}
                  </div>
                </div>
                {address && (
                  <div className="mt-2">
                    <HashBadge value={address} href={`https://solscan.io/account/${address}`} ariaLabel="Wallet address" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-dashed border-neutral-800/60 px-4 py-6 text-center text-sm text-neutral-400">
          No wallets linked to this account.
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

export default walletListRenderer;
