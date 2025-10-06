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

function formatPercent(value: unknown) {
  const numeric = pickNumber(value);
  if (numeric === undefined) return undefined;
  return `${percentFormatter.format(numeric)}%`;
}

function pickString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return undefined;
}

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
    const key = pair?.pairAddress ?? pair?.url ?? `pair-${index}`;
    const dex = typeof pair?.dexId === "string" && pair.dexId ? pair.dexId : "Pair";
    const liquidityValue = pickNumber(pair?.liquidity?.usd, pair?.liquidityUsd, pair?.liquidity_usd);
    const liquidity = formatUsd(liquidityValue);
    const priceValue = pickNumber(pair?.priceUsd, pair?.price_usd);
    const price = formatUsd(priceValue, { precise: true });
    const volumeValue = pickNumber(pair?.volume?.h24, pair?.volume24hUsd, pair?.volume_24h_usd);
    const volume = formatUsd(volumeValue);
    const priceChangeValue = pickNumber(pair?.priceChange?.h24, pair?.price_change_24h, pair?.priceChange24h);
    const priceChange = formatPercent(priceChangeValue);
    const priceChangeClass = priceChangeValue !== undefined && priceChangeValue < 0 ? "text-rose-300" : "text-emerald-300";
    const link = typeof pair?.url === "string" && pair.url ? pair.url : undefined;

    const body = (
      <>
        <div className="flex items-center justify-between gap-2">
          <div className="text-[10px] uppercase tracking-[0.22em] text-[#F0BFA1]">Pair {index + 1}</div>
          <div className="rounded-full border border-[#F7BE8A]/30 px-2 py-[2px] text-[10px] uppercase tracking-[0.2em] text-[#FFE4CF]">
            {dex}
          </div>
        </div>
        <div className="mt-2 flex flex-col gap-1 text-xs text-[#FFE4CF]">
          {liquidity && (
            <div>
              Liquidity: <span className="text-[#FFF6EC]">{liquidity}</span>
            </div>
          )}
          {price && (
            <div>
              Price: <span className="text-[#FFF6EC]">{price}</span>
            </div>
          )}
          {volume && (
            <div>
              24h volume: <span className="text-[#FFF6EC]">{volume}</span>
            </div>
          )}
          {priceChange && (
            <div>
              24h Δ: <span className={priceChangeClass}>{priceChange}</span>
            </div>
          )}
        </div>
      </>
    );

    if (link) {
      return (
        <a
          key={key}
          href={link}
          target="_blank"
          rel="noreferrer"
          className="block rounded-lg border border-[#F7BE8A]/24 bg-[#201012]/70 px-3 py-2 transition hover:border-flux/60"
        >
          {body}
        </a>
      );
    }

    return (
      <div key={key} className="rounded-lg border border-[#F7BE8A]/24 bg-[#201012]/70 px-3 py-2">
        {body}
      </div>
    );
  };

  const renderTokenCard = (token: any) => {
    if (!token) return null;
    const address = typeof token?.address === "string" ? token.address : typeof token?.mint === "string" ? token.mint : null;
    const symbol = typeof token?.symbol === "string" && token.symbol ? token.symbol : "—";
    const name = typeof token?.name === "string" && token.name ? token.name : null;
    const price = formatUsd(pickNumber(token?.priceUsd, token?.price_usd), { precise: true });
    const liquidity = formatUsd(pickNumber(token?.liquidityUsd, token?.liquidity_usd));
    const volume = formatUsd(pickNumber(token?.volume24hUsd, token?.volume24h_usd, token?.volume24h, token?.totalVolume?.h24));
    const marketCapValue = pickNumber(
      token?.marketCap,
      token?.market_cap,
      token?.marketCapUsd,
      token?.market_cap_usd,
      token?.fdv,
      token?.fdvUsd,
      token?.fdv_usd,
    );
    const marketCap = formatUsd(marketCapValue);
    const priceChangeValue = pickNumber(token?.priceChange?.h24, token?.price_change_24h, token?.priceChange24h);
    const priceChange = formatPercent(priceChangeValue);
    const priceChangeClass = priceChangeValue !== undefined && priceChangeValue < 0 ? "text-rose-300" : "text-emerald-300";
    const info = token?.info && typeof token.info === "object" ? token.info : undefined;
    const pairs = Array.isArray(token?.pairs) ? token.pairs.slice(0, 3) : [];
    const pairIcon = pairs
      .map((pair: any) => pickString(pair?.info?.imageUrl, pair?.info?.openGraph))
      .find((value: string | undefined) => typeof value === "string" && value.length > 0);
    const iconUrl = pickString(
      info?.imageUrl,
      info?.openGraphImageUrl,
      info?.headerImageUrl,
      token?.icon,
      token?.logo,
      token?.image,
      token?.pairs?.[0]?.baseToken?.icon,
      pairIcon ?? undefined,
    );

    return (
      <div key={address ?? symbol} className="rounded-xl border border-[#F7BE8A]/18 bg-[#1A090D]/70 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 overflow-hidden rounded-full border border-[#F7BE8A]/24 bg-neutral-900/80">
              {iconUrl ? (
                <Image src={iconUrl} alt={symbol} fill sizes="40px" className="object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-xs text-[#F9D9C3]">
                  {symbol.slice(0, 2)}
                </span>
              )}
            </div>
            <div>
              <div className="text-sm font-semibold text-[#FFF6EC]" title={name || symbol}>
                {symbol}
              </div>
              {name && <div className="text-xs text-[#F9D9C3]" title={name}>{name}</div>}
            </div>
          </div>
          {price && <div className="text-sm text-[#FFF6EC]">{price}</div>}
        </div>
        <div className="mt-3 space-y-2 text-xs text-[#FFE4CF]">
          {address && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[#F0BFA1]">Mint:</span>
              <HashBadge value={address} href={`https://solscan.io/token/${address}`} ariaLabel="Token mint" />
            </div>
          )}
          {marketCap && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[#F0BFA1]">Market cap:</span>
              <span className="text-[#FFF6EC]">{marketCap}</span>
            </div>
          )}
          {liquidity && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[#F0BFA1]">Liquidity:</span>
              <span className="text-[#FFF6EC]">{liquidity}</span>
            </div>
          )}
          {volume && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[#F0BFA1]">24h volume:</span>
              <span className="text-[#FFF6EC]">{volume}</span>
            </div>
          )}
          {priceChange && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[#F0BFA1]">24h change:</span>
              <span className={priceChangeClass}>{priceChange}</span>
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
          <div className="mt-2 text-sm text-[#F9D9C3]">{item.timestamp}</div>
        </div>
        {query && (
          <div className="rounded-full border border-[#F7BE8A]/24 bg-[#201012]/70 px-3 py-1 text-xs uppercase tracking-[0.2em] text-[#FFF2E2]">
            Query: {query}
          </div>
        )}
      </div>

      {primary.length > 0 ? (
        <div className="mt-4 grid gap-3">
          {primary.map((token: any) => renderTokenCard(token))}
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-dashed border-[#F7BE8A]/24 px-4 py-6 text-center text-sm text-[#F9D9C3]">
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
                className="mt-3 text-xs uppercase tracking-[0.24em] text-[#F9D9C3] transition hover:text-[#FFF2E2]"
              >
                Hide additional results
              </button>
            </>
          )}
        </div>
      )}

      {hasDebug && (
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

export default solanaResolveTokenRenderer;
