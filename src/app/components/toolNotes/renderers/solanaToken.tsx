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

const solanaResolveTokenRenderer: ToolNoteRenderer = ({ item, isExpanded, onToggle, debug }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, any> | undefined) || {};
  const payload = unwrapStructured(rawOutput);
  const args = (item.data as any)?.arguments ?? {};
  const query = typeof args?.query === "string" && args.query.trim().length > 0 ? args.query.trim() : undefined;

  const results = Array.isArray(payload?.results)
    ? payload.results
    : Array.isArray(payload)
      ? payload
      : [];

  const primary = results.slice(0, 3);
  const remaining = results.slice(3);

  const renderPairBadge = (pair: any, index: number) => {
    if (!pair) return null;
    const dex = typeof pair.dexId === "string" && pair.dexId ? pair.dexId : "Pair";
    const liquidity = formatUsd(pair.liquidityUsd ?? pair.liquidity_usd);
    const price = formatUsd(pair.priceUsd ?? pair.price_usd, { precise: true });
    const link = typeof pair.url === "string" && pair.url ? pair.url : undefined;

    const content = (
      <div className="rounded-lg border border-neutral-800/60 bg-surface-glass/60 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">Pair {index + 1}</div>
          <div className="rounded-full border border-neutral-700 px-2 py-[2px] text-[10px] uppercase tracking-[0.2em] text-neutral-300">
            {dex}
          </div>
        </div>
        <div className="mt-2 flex flex-col gap-1 text-xs text-neutral-300">
          {liquidity && <div>Liquidity: <span className="text-neutral-100">{liquidity}</span></div>}
          {price && <div>Price: <span className="text-neutral-100">{price}</span></div>}
        </div>
      </div>
    );

    if (!link) return content;
    return (
      <a
        key={link}
        href={link}
        target="_blank"
        rel="noreferrer"
        className="transition hover:border-flux/60"
      >
        {content}
      </a>
    );
  };

  const renderTokenCard = (token: any) => {
    if (!token) return null;
    const address = typeof token.address === "string" ? token.address : typeof token.mint === "string" ? token.mint : null;
    const symbol = typeof token.symbol === "string" && token.symbol ? token.symbol : "—";
    const name = typeof token.name === "string" && token.name ? token.name : null;
    const price = formatUsd(token.priceUsd ?? token.price_usd, { precise: true });
    const liquidity = formatUsd(token.liquidityUsd ?? token.liquidity_usd);
    const volume = formatUsd(token.volume24hUsd ?? token.volume24h_usd ?? token.volume24h, { precise: false });
    const marketCap = formatUsd(token.marketCapUsd ?? token.market_cap_usd ?? token.fdvUsd ?? token.fdv_usd);
    const pairs = Array.isArray(token.pairs) ? token.pairs.slice(0, 2) : [];
    const iconUrl = typeof token.icon === "string" && token.icon
      ? token.icon
      : typeof token.logo === "string" && token.logo
        ? token.logo
        : typeof token.image === "string" && token.image
          ? token.image
          : Array.isArray(token.pairs) && token.pairs[0]?.baseToken?.icon
            ? token.pairs[0].baseToken.icon
            : null;

    return (
      <div key={address ?? symbol} className="rounded-xl border border-neutral-800/40 bg-surface-glass/40 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 overflow-hidden rounded-full border border-neutral-800/60 bg-neutral-900/80">
              {iconUrl ? (
                <Image src={iconUrl} alt={symbol} fill sizes="40px" className="object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-xs text-neutral-400">
                  {symbol.slice(0, 2)}
                </span>
              )}
            </div>
            <div>
              <div className="text-sm font-semibold text-neutral-100" title={name || symbol}>
                {symbol}
              </div>
              {name && <div className="text-xs text-neutral-400" title={name}>{name}</div>}
            </div>
          </div>
          {price && <div className="text-sm text-neutral-100">{price}</div>}
        </div>
        <div className="mt-3 space-y-2 text-xs text-neutral-300">
          {address && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-neutral-500">Mint:</span>
              <HashBadge value={address} href={`https://solscan.io/token/${address}`} ariaLabel="Token mint" />
            </div>
          )}
          {marketCap && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-neutral-500">Market cap:</span>
              <span className="text-neutral-100">{marketCap}</span>
            </div>
          )}
          {liquidity && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-neutral-500">Liquidity:</span>
              <span className="text-neutral-100">{liquidity}</span>
            </div>
          )}
          {volume && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-neutral-500">24h volume:</span>
              <span className="text-neutral-100">{volume}</span>
            </div>
          )}
        </div>
        {pairs.length > 0 && (
          <div className="mt-4 grid gap-2">
            {pairs.map((pair: any, index: number) => renderPairBadge(pair, index))}
          </div>
        )}
      </div>
    );
  };

  const hasDebug = debug && Object.keys(rawOutput || {}).length > 0;

  return (
    <div className={BASE_CARD_CLASS}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className={SECTION_TITLE_CLASS}>Solana Token Lookup</div>
          <div className="mt-2 text-sm text-neutral-400">{item.timestamp}</div>
        </div>
        {query && (
          <div className="rounded-full border border-neutral-800/60 bg-surface-glass/60 px-3 py-1 text-xs uppercase tracking-[0.2em] text-neutral-200">
            Query: {query}
          </div>
        )}
      </div>

      {primary.length > 0 ? (
        <div className="mt-4 grid gap-3">
          {primary.map((token: any) => renderTokenCard(token))}
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-dashed border-neutral-800/60 px-4 py-6 text-center text-sm text-neutral-400">
          No matching Solana tokens reported.
        </div>
      )}

      {remaining.length > 0 && (
        <div className="mt-4">
          {!isExpanded ? (
            <button
              type="button"
              onClick={onToggle}
              className="text-xs uppercase tracking-[0.24em] text-flux transition hover:text-flux/80"
            >
              Show {remaining.length} more result{remaining.length === 1 ? "" : "s"}
            </button>
          ) : (
            <>
              <div className="grid gap-3">
                {remaining.map((token: any) => renderTokenCard(token))}
              </div>
              <button
                type="button"
                onClick={onToggle}
                className="mt-3 text-xs uppercase tracking-[0.24em] text-neutral-400 transition hover:text-neutral-200"
              >
                Hide additional results
              </button>
            </>
          )}
        </div>
      )}

      {hasDebug && (
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

export default solanaResolveTokenRenderer;
