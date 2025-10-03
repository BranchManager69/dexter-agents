import type { ToolNoteRenderer } from "./types";
import {
  BASE_CARD_CLASS,
  HashBadge,
  SECTION_TITLE_CLASS,
  normalizeOutput,
  resolveSourceBadge,
} from "./helpers";

const resolveWalletRenderer: ToolNoteRenderer = ({ item, isExpanded, onToggle, debug }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, any> | undefined) || {};
  const payload = rawOutput && typeof rawOutput === "object" ? rawOutput : {};
  const args = (item.data as any)?.arguments ?? {};

  const walletAddress = typeof (payload as any)?.wallet_address === "string" ? (payload as any).wallet_address : null;
  const source = typeof (payload as any)?.source === "string" ? (payload as any).source : null;
  const sourceBadge = resolveSourceBadge(source);
  const userId = typeof (payload as any)?.user_id === "string" ? (payload as any).user_id : null;
  const requestedWallet = typeof args?.wallet_address === "string" ? args.wallet_address : null;

  const hasRawDetails = debug && Object.keys(rawOutput || {}).length > 0;

  return (
    <div className={BASE_CARD_CLASS}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className={SECTION_TITLE_CLASS}>Active Wallet</div>
          <div className="mt-2 text-xs text-neutral-400">{item.timestamp}</div>
        </div>
        <span className={sourceBadge.className}>{sourceBadge.label}</span>
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-[0.24em] text-neutral-500">Resolved</span>
          {walletAddress ? (
            <HashBadge value={walletAddress} />
          ) : (
            <span className="text-sm text-neutral-500">No wallet resolved</span>
          )}
        </div>
        {userId && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-[0.24em] text-neutral-500">Supabase user</span>
            <HashBadge value={userId} />
          </div>
        )}
      </div>

      {requestedWallet && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
          <span className="uppercase tracking-[0.24em]">Requested</span>
          <HashBadge value={requestedWallet} />
        </div>
      )}

      {hasRawDetails && (
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

export default resolveWalletRenderer;
