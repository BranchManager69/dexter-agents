import type { ToolNoteRenderer } from "./types";
import {
  BASE_CARD_CLASS,
  HashBadge,
  SECTION_TITLE_CLASS,
  normalizeOutput,
  resolveSourceBadge,
} from "./helpers";

const resolveWalletRenderer: ToolNoteRenderer = ({ item, isExpanded, onToggle, debug }) => {
  const normalized = normalizeOutput(item.data as Record<string, any> | undefined);
  const rawOutput = normalized ?? (item.data as any);
  const payload = rawOutput && typeof rawOutput === "object" ? rawOutput : {};
  const args = (item.data as any)?.arguments ?? {};

  const extractAddress = (value: any, depth = 0): string | null => {
    if (value === null || value === undefined) return null;
    if (depth > 4) return null;

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return null;
      if (/^[1-9A-HJ-NP-Za-km-z]{32,64}$/.test(trimmed)) {
        return trimmed;
      }
      return null;
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        const found = extractAddress(entry, depth + 1);
        if (found) return found;
      }
      return null;
    }

    if (typeof value === "object") {
      const candidates = [
        (value as any)?.wallet_address,
        (value as any)?.address,
        (value as any)?.public_key,
        (value as any)?.active_wallet_address,
        (value as any)?.text,
        (value as any)?.value,
      ];
      for (const candidate of candidates) {
        const found = extractAddress(candidate, depth + 1);
        if (found) return found;
      }
      for (const key of Object.keys(value)) {
        if (candidates.some((candidate) => candidate === (value as any)[key])) continue;
        const found = extractAddress((value as any)[key], depth + 1);
        if (found) return found;
      }
    }
    return null;
  };

  const walletAddress = extractAddress(payload) ?? extractAddress(rawOutput) ?? extractAddress((item.data as any)?.output) ?? null;
  const rawSource = typeof (payload as any)?.source === "string" ? (payload as any).source : null;
  const userId = typeof (payload as any)?.user_id === "string" ? (payload as any).user_id : null;
  const requestedWallet = typeof args?.wallet_address === "string" ? args.wallet_address : null;
  const derivedSource = rawSource
    ? rawSource
    : userId
      ? 'primary'
      : walletAddress
        ? 'demo'
        : null;
  const sourceBadge = resolveSourceBadge(derivedSource);

  const hasRawDetails = debug && Object.keys(rawOutput || {}).length > 0;

  return (
    <div className={BASE_CARD_CLASS}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className={SECTION_TITLE_CLASS}>Active Wallet</div>
          <div className="mt-2 text-xs text-[#F9D9C3]">{item.timestamp}</div>
        </div>
        <span className={sourceBadge.className}>{sourceBadge.label}</span>
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-[0.24em] text-[#F0BFA1]">Resolved</span>
          {walletAddress ? (
            <HashBadge value={walletAddress} />
          ) : (
            <span className="text-sm text-[#F0BFA1]">No wallet resolved</span>
          )}
        </div>
        {userId && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-[0.24em] text-[#F0BFA1]">Supabase user</span>
            <HashBadge value={userId} />
          </div>
        )}
      </div>

      {requestedWallet && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[#F9D9C3]">
          <span className="uppercase tracking-[0.24em]">Requested</span>
          <HashBadge value={requestedWallet} />
        </div>
      )}

      {hasRawDetails && (
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

export default resolveWalletRenderer;
