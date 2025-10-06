import type { ToolNoteRenderer } from "./types";
import {
  BASE_CARD_CLASS,
  HashBadge,
  SECTION_TITLE_CLASS,
  normalizeOutput,
  unwrapStructured,
} from "./helpers";
import { SolanaAmount, formatSolValue } from "@/app/components/solana/SolanaAmount";

function createTradeRenderer(mode: "buy" | "sell"): ToolNoteRenderer {
  const badgeClass =
    mode === "buy"
      ? "border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-300"
      : "border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-amber-200";

  const heading = mode === "buy" ? "Buy Execution" : "Sell Execution";
  const badgeLabel = mode === "buy" ? "Buy filled" : "Sell filled";

  const TradeRenderer: ToolNoteRenderer = ({ item, isExpanded, onToggle, debug }) => {
    const rawOutput = normalizeOutput(item.data as Record<string, any> | undefined) || {};
    const trade = unwrapStructured(rawOutput);
    const args = (item.data as any)?.arguments ?? {};

    const walletAddress = typeof trade?.walletAddress === "string"
      ? trade.walletAddress
      : typeof args?.wallet_address === "string"
        ? args.wallet_address
        : null;

    const signature = typeof trade?.signature === "string"
      ? trade.signature
      : typeof trade?.txSignature === "string"
        ? trade.txSignature
        : null;
    const solscanUrl = typeof trade?.solscanUrl === "string"
      ? trade.solscanUrl
      : signature
        ? `https://solscan.io/tx/${signature}`
        : undefined;

    const swapLamports = trade?.swapLamports ?? trade?.swap_lamports;
    const feeLamports = trade?.feeLamports ?? trade?.fee_lamports;
    const spendSolValue = args?.amount_sol ?? args?.amountSol;
    const swapDisplay = formatSolValue(swapLamports, { fromLamports: true });
    const feeDisplay = formatSolValue(feeLamports, { fromLamports: true });
    const spendDisplay = formatSolValue(spendSolValue);
    const percentage = typeof args?.percentage === "number" ? `${args.percentage}%` : undefined;
    const amountRaw = typeof args?.amount_raw === "string" && args.amount_raw.trim().length > 0 ? args.amount_raw : undefined;
    const mint = typeof args?.mint === "string" ? args.mint : typeof trade?.mint === "string" ? trade.mint : undefined;

    const warnings: string[] = Array.isArray(trade?.warnings)
      ? trade.warnings.filter((w: unknown): w is string => typeof w === "string" && w.length > 0)
      : [];

    const isError = rawOutput?.ok === false || rawOutput?.isError === true || typeof rawOutput?.error === "string";
    const errorMessage = typeof rawOutput?.error === "string" ? rawOutput.error : undefined;

    const hasRequestArgs = args && typeof args === "object" && Object.keys(args).length > 0;
    const hasRawDetails = debug && Object.keys(rawOutput || {}).length > 0;
    const hasExpandable = hasRequestArgs || hasRawDetails;

    const infoRows: Array<{ label: string; value: React.ReactNode }> = [];

    if (mint) {
      infoRows.push({
        label: "Token",
        value: <HashBadge value={mint} href={`https://solscan.io/token/${mint}`} ariaLabel="Token mint" />,
      });
    }
    if (walletAddress) {
      infoRows.push({
        label: "Wallet",
        value: <HashBadge value={walletAddress} href={`https://solscan.io/account/${walletAddress}`} ariaLabel="Wallet address" />,
      });
    }
    if (mode === "buy" && spendDisplay) {
      infoRows.push({ label: "Spend", value: <SolanaAmount value={spendSolValue} /> });
    }
    if (mode === "sell" && percentage) {
      infoRows.push({ label: "Portion", value: <span className="text-[#FFF6EC]">{percentage}</span> });
    }
    if (mode === "sell" && amountRaw) {
      infoRows.push({ label: "Amount (raw)", value: <span className="font-mono text-[#FFF6EC]" title={amountRaw}>{amountRaw}</span> });
    }
    if (swapDisplay) {
      infoRows.push({
        label: mode === "buy" ? "Swap out" : "Swap in",
        value: <SolanaAmount value={swapLamports} fromLamports />,
      });
    }
    if (feeDisplay) {
      infoRows.push({ label: "Platform fee", value: <SolanaAmount value={feeLamports} fromLamports /> });
    }
    if (signature) {
      infoRows.push({
        label: "Signature",
        value: <HashBadge value={signature} href={solscanUrl} ariaLabel="Transaction signature" />,
      });
    }

    return (
      <div className={BASE_CARD_CLASS}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className={SECTION_TITLE_CLASS}>{heading}</div>
            <div className="mt-2 text-sm text-[#F9D9C3]">{item.timestamp}</div>
          </div>
          <span className={badgeClass}>{badgeLabel}</span>
        </div>

        <div className="mt-4 space-y-3">
          {infoRows.map(({ label, value }) => (
            <div key={label} className="flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase tracking-[0.24em] text-[#F0BFA1]">{label}</span>
              {value}
            </div>
          ))}
        </div>

        {warnings.length > 0 && (
          <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            <div className="text-[10px] uppercase tracking-[0.22em] text-amber-300">Warnings</div>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-amber-100">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        {isError && (
          <div className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            Trade failed{errorMessage ? `: ${errorMessage}` : "."}
          </div>
        )}

        {solscanUrl && (
          <a
            className="mt-4 inline-flex items-center gap-1 rounded-full border border-[#F7BE8A]/30 px-3 py-1 text-xs uppercase tracking-[0.2em] text-flux transition hover:border-flux/60 hover:text-flux/80"
            href={solscanUrl}
            target="_blank"
            rel="noreferrer"
          >
            View on Solscan →
          </a>
        )}

        {hasExpandable && (
          <div className="mt-4 border-t border-[#F7BE8A]/22 pt-3">
            <button
              type="button"
              onClick={onToggle}
              className="text-xs uppercase tracking-[0.24em] text-[#F9D9C3] transition hover:text-[#FFF2E2]"
            >
              {isExpanded ? "Hide details" : "Show details"}
            </button>
            {isExpanded && (
              <div className="mt-3 space-y-3 text-[11px] text-[#FFE4CF]">
                {hasRequestArgs && (
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.22em] text-[#F0BFA1]">Request</div>
                    <pre className="mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-[#F7BE8A]/24 bg-surface-base/70 p-3 text-[#FFF2E2]">
                      {JSON.stringify(args, null, 2)}
                    </pre>
                  </div>
                )}
                {hasRawDetails && (
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.22em] text-[#F0BFA1]">Raw response</div>
                    <pre className="mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-[#F7BE8A]/24 bg-surface-base/70 p-3 text-[#FFF2E2]">
                      {JSON.stringify(rawOutput, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  (TradeRenderer as ToolNoteRenderer & { displayName?: string }).displayName =
    mode === "buy" ? "ToolNoteTradeBuy" : "ToolNoteTradeSell";

  return TradeRenderer;
}

export const solanaExecuteBuyRenderer = createTradeRenderer("buy");
export const solanaExecuteSellRenderer = createTradeRenderer("sell");
