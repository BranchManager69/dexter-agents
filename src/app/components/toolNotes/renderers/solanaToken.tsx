import type { ToolNoteRenderer } from "./types";
import {
  BASE_CARD_CLASS,
  normalizeOutput,
  unwrapStructured,
} from "./helpers";
import {
  ChatKitWidgetRenderer,
  type Badge,
  type Button,
  type Card,
  type ListView,
  type ListViewItem,
} from "../ChatKitWidgetRenderer";

type Alignment = "start" | "center" | "end" | "stretch";

type TokenResult = {
  address?: string;
  mint?: string;
  symbol?: string;
  name?: string;
  icon?: string;
  logo?: string;
  image?: string;
  info?: Record<string, unknown>;
  priceUsd?: number;
  price_usd?: number;
  liquidityUsd?: number;
  liquidity_usd?: number;
  liquidity?: Record<string, unknown>;
  volume24hUsd?: number;
  volume24h_usd?: number;
  volume24h?: number;
  totalVolume?: { h24?: number };
  marketCap?: number;
  market_cap?: number;
  marketCapUsd?: number;
  market_cap_usd?: number;
  fdv?: number;
  fdvUsd?: number;
  fdv_usd?: number;
  priceChange?: { h24?: number };
  price_change_24h?: number;
  priceChange24h?: number;
  pairs?: PairResult[];
};

type PairResult = {
  pairAddress?: string;
  dexId?: string;
  url?: string;
  liquidity?: { usd?: number };
  liquidityUsd?: number;
  liquidity_usd?: number;
  priceUsd?: number;
  price_usd?: number;
  volume?: { h24?: number };
  volume24hUsd?: number;
  volume_24h_usd?: number;
  priceChange?: { h24?: number };
  priceChange24h?: number;
  price_change_24h?: number;
};

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
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function truncateAddress(address: string, visible = 4) {
  if (address.length <= visible * 2 + 1) return address;
  return `${address.slice(0, visible)}…${address.slice(-visible)}`;
}

function formatUsd(value: unknown, precise = false) {
  const numeric = pickNumber(value);
  if (numeric === undefined) return undefined;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: precise ? 4 : 0,
  }).format(numeric);
}

function formatPercent(value: unknown) {
  const numeric = pickNumber(value);
  if (numeric === undefined) return undefined;
  return `${percentFormatter.format(numeric)}%`;
}

function buildLinkButton(label: string, url: string): Button {
  return {
    type: "Button",
    label,
    onClickAction: { type: "open_url", payload: { url } },
    variant: "outline",
    size: "sm",
  };
}

function buildBadge(label: string, color: Badge["color"]): Badge {
  return {
    type: "Badge",
    label,
    color,
    variant: "outline",
    size: "sm",
    pill: true,
  };
}

const solanaResolveTokenRenderer: ToolNoteRenderer = ({ item, debug }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput);
  const args = (item.data as any)?.arguments ?? {};
  const query = typeof args?.query === "string" && args.query.trim().length > 0 ? args.query.trim() : undefined;

  const results: TokenResult[] = Array.isArray(payload?.results)
    ? payload.results
    : Array.isArray(payload)
      ? payload
      : [];

  const widgets: Array<Card | ListView> = [];

  const introCard: Card = {
    type: "Card",
    id: "token-search-header",
    children: [
      {
        type: "Col",
        gap: 6,
        children: [
          { type: "Title", value: "Token lookup", size: "md" },
          query ? { type: "Caption", value: `Query: ${query}`, size: "sm" } : undefined,
          results.length ? { type: "Caption", value: `${results.length} candidate${results.length === 1 ? "" : "s"}`, size: "xs" } : undefined,
        ].filter(Boolean) as any,
      },
    ],
  };
  widgets.push(introCard);

  results.slice(0, 5).forEach((token, index) => {
    const address = pickString(token.address, token.mint);
    const symbol = pickString(token.symbol) ?? (address ? truncateAddress(address, 3) : `Result ${index + 1}`);
    const name = pickString(token.name);
    const info = token.info && typeof token.info === "object" ? token.info : undefined;
    const image = pickString(
      info?.imageUrl,
      info?.openGraphImageUrl,
      info?.headerImageUrl,
      token.icon,
      token.logo,
      token.image,
    );

    const price = formatUsd(token.priceUsd ?? token.price_usd, true);
    const liquidity = formatUsd(token.liquidityUsd ?? token.liquidity_usd ?? token.liquidity?.usd);
    const volume = formatUsd(token.volume24hUsd ?? token.volume24h_usd ?? token.volume24h ?? token.totalVolume?.h24);
    const marketCap = formatUsd(
      token.marketCap ?? token.market_cap ?? token.marketCapUsd ?? token.market_cap_usd ?? token.fdv ?? token.fdvUsd ?? token.fdv_usd,
    );
    const priceChange = formatPercent(token.priceChange?.h24 ?? token.price_change_24h ?? token.priceChange24h);
    const priceChangeNegative = pickNumber(token.priceChange?.h24, token.price_change_24h, token.priceChange24h) ?? 0;

    const badges: Badge[] = [];
    if (price) badges.push(buildBadge(`Price ${price}`, "info"));
    if (marketCap) badges.push(buildBadge(`MCap ${marketCap}`, "secondary"));
    if (liquidity) badges.push(buildBadge(`Liquidity ${liquidity}`, "success"));
    if (volume) badges.push(buildBadge(`24h Vol ${volume}`, "info"));
    if (priceChange) badges.push(buildBadge(`24h ${priceChange}`, priceChangeNegative < 0 ? "danger" : "success"));

    const linkButtons: Button[] = [];
    if (address) linkButtons.push(buildLinkButton(truncateAddress(address), `https://solscan.io/token/${address}`));

    const pairItems: ListViewItem[] = Array.isArray(token.pairs)
      ? token.pairs.slice(0, 3).map((pair, pairIndex) => {
          const liquidityPair = formatUsd(pair.liquidity?.usd ?? pair.liquidityUsd ?? pair.liquidity_usd);
          const pricePair = formatUsd(pair.priceUsd ?? pair.price_usd, true);
          const volumePair = formatUsd(pair.volume?.h24 ?? pair.volume24hUsd ?? pair.volume_24h_usd);
          const changePair = formatPercent(pair.priceChange?.h24 ?? pair.priceChange24h ?? pair.price_change_24h);
          const dexLabel = pickString(pair.dexId) ?? `Pair ${pairIndex + 1}`;

          const pairBadges: Badge[] = [];
          if (liquidityPair) pairBadges.push(buildBadge(`Liq ${liquidityPair}`, "secondary"));
          if (pricePair) pairBadges.push(buildBadge(`Price ${pricePair}`, "info"));
          if (volumePair) pairBadges.push(buildBadge(`24h Vol ${volumePair}`, "info"));
          if (changePair) pairBadges.push(buildBadge(`24h ${changePair}`, pickNumber(pair.priceChange?.h24, pair.priceChange24h, pair.price_change_24h) ?? 0 < 0 ? "danger" : "success"));

          return {
            type: "ListViewItem",
            id: pair.pairAddress ?? `pair-${pairIndex}`,
            onClickAction: pair.url ? { type: "open_url", payload: { url: pair.url } } : undefined,
            gap: 6,
            children: [
              { type: "Text", value: dexLabel, weight: "semibold", size: "sm" },
              pairBadges.length ? { type: "Row", gap: 6, wrap: "wrap", children: pairBadges } : undefined,
            ].filter(Boolean) as any,
          };
        })
      : [];

    const card: Card = {
      type: "Card",
      id: address ?? `token-${index}`,
      children: [
        {
          type: "Row",
          justify: "between",
          align: "center",
          children: [
            {
              type: "Row",
              gap: 12,
              align: "center" as Alignment,
              children: [
                image
                  ? {
                      type: "Image",
                      src: image,
                      alt: symbol,
                      width: 48,
                      height: 48,
                      radius: "50%",
                    }
                  : {
                      type: "Box",
                      align: "center" as Alignment,
                      justify: "center",
                      width: 48,
                      height: 48,
                      radius: "50%",
                      background: "rgba(255,255,255,0.04)",
                      children: [{ type: "Text", value: symbol.slice(0, 2), size: "sm", weight: "semibold" }],
                    },
                {
                  type: "Col",
                  gap: 4,
                  children: [
                    { type: "Text", value: symbol, weight: "semibold", size: "md" },
                    name ? { type: "Caption", value: name, size: "xs" } : undefined,
                  ].filter(Boolean) as any,
                },
              ].filter(Boolean) as any,
            },
            price ? { type: "Text", value: price, weight: "semibold", size: "sm" } : undefined,
          ].filter(Boolean) as any,
        },
        badges.length ? { type: "Row", gap: 6, wrap: "wrap", children: badges } : undefined,
        linkButtons.length ? { type: "Row", gap: 6, wrap: "wrap", children: linkButtons } : undefined,
      ].filter(Boolean) as any,
    };

    widgets.push(card);

    if (pairItems.length) {
      widgets.push({
        type: "ListView",
        id: `${address ?? `token-${index}`}-pairs`,
        children: pairItems,
      });
    }
  });

  return (
    <div className={BASE_CARD_CLASS}>
      <ChatKitWidgetRenderer widgets={widgets} />

      {debug && (
        <details className="mt-4 w-full" open>
          <summary className="cursor-pointer font-display text-xs font-semibold tracking-[0.08em] text-[#F9D9C3]">
            Raw payload
          </summary>
          <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-[#F7BE8A]/24 bg-[#16070C]/85 p-3 text-[11px] text-[#FFF2E2]">
            {JSON.stringify(rawOutput, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
};

export default solanaResolveTokenRenderer;
