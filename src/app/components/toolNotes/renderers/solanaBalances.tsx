import Image from "next/image";

import type { ToolNoteRenderer } from "./types";
import {
  BASE_CARD_CLASS,
  HashBadge,
  SECTION_TITLE_CLASS,
  formatUsd,
  normalizeOutput,
  unwrapStructured,
} from "./helpers";

const percentFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
  signDisplay: "always",
});

function pickNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

function pickString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) return value;
  }
  return undefined;
}

function formatPercent(value: unknown) {
  const numeric = pickNumber(value);
  if (numeric === undefined) return undefined;
  return `${percentFormatter.format(numeric)}%`;
}

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
            const amountDisplay = Number.isFinite(amountUi)
              ? amountUi.toLocaleString("en-US", {
                  maximumFractionDigits: entry?.decimals && entry.decimals > 4 ? 4 : entry?.decimals ?? 6,
                })
              : undefined;
            const decimals = typeof entry?.decimals === "number" ? entry.decimals : undefined;
            const ata = typeof entry?.ata === "string" ? entry.ata : null;
            const tokenMeta = entry?.token && typeof entry.token === "object" ? entry.token : undefined;
            const symbol = pickString(tokenMeta?.symbol) ?? (mint ? `${mint.slice(0, 4)}…${mint.slice(-4)}` : `Token ${index + 1}`);
            const name = pickString(tokenMeta?.name);
            const iconUrl = pickString(
              tokenMeta?.imageUrl,
              tokenMeta?.openGraphImageUrl,
              tokenMeta?.headerImageUrl,
              entry?.icon,
              entry?.logo,
            );
            const priceUsd = formatUsd(tokenMeta?.priceUsd, { precise: true });
            const marketCap = formatUsd(tokenMeta?.marketCap ?? tokenMeta?.fdv);
            const priceChange = formatPercent(tokenMeta?.priceChange24h);
            const priceChangeClass = tokenMeta?.priceChange24h !== undefined && Number(tokenMeta.priceChange24h) < 0
              ? "text-rose-300"
              : "text-emerald-300";

            return (
              <div key={mint ?? ata ?? index} className="rounded-xl border border-neutral-800/40 bg-surface-glass/40 p-3">
                <div className="flex items-center gap-3">
                  <div className="relative h-9 w-9 overflow-hidden rounded-full border border-neutral-800/60 bg-neutral-900/80">
                    {iconUrl ? (
                      <Image src={iconUrl} alt={symbol} fill sizes="36px" className="object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-[11px] uppercase tracking-[0.12em] text-neutral-400">
                        {symbol.slice(0, 2)}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold text-neutral-100" title={name || symbol}>
                          {symbol}
                        </div>
                        {name && (
                          <div className="text-xs text-neutral-400" title={name}>
                            {name}
                          </div>
                        )}
                      </div>
                      {amountDisplay && <div className="text-xs text-neutral-100">{amountDisplay}</div>}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.16em] text-neutral-400">
                      {priceUsd && (
                        <span className="flex items-center gap-1">
                          <span className="text-neutral-500">Price</span>
                          <span className="text-neutral-100 normal-case tracking-normal">{priceUsd}</span>
                        </span>
                      )}
                      {marketCap && (
                        <span className="flex items-center gap-1">
                          <span className="text-neutral-500">MCap</span>
                          <span className="text-neutral-100 normal-case tracking-normal">{marketCap}</span>
                        </span>
                      )}
                      {priceChange && (
                        <span className="flex items-center gap-1">
                          <span className="text-neutral-500">24h</span>
                          <span className={`${priceChangeClass} normal-case tracking-normal`}>{priceChange}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
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
