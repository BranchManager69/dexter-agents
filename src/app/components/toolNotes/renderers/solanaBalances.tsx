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

type BalanceEntry = {
  mint?: string;
  ata?: string;
  amountUi?: number;
  amount_ui?: number;
  decimals?: number;
  token?: Record<string, unknown>;
  icon?: string;
  logo?: string;
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

const solanaBalancesRenderer: ToolNoteRenderer = ({ item, isExpanded, onToggle, debug }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput);

  const balances: BalanceEntry[] = Array.isArray((payload as any)?.balances)
    ? (payload as any).balances
    : Array.isArray(payload)
      ? payload
      : [];

  const listItems: ListViewItem[] = balances
    .slice(0, isExpanded ? balances.length : 6)
    .map((entry, index): ListViewItem => {
      const mint = pickString(entry?.mint);
      const ata = pickString(entry?.ata);
      const tokenMeta = entry?.token && typeof entry.token === "object" ? entry.token : undefined;
      const symbol = pickString(tokenMeta?.symbol) ?? (mint ? truncateAddress(mint, 3) : `Token ${index + 1}`);
      const name = pickString(tokenMeta?.name);
      const iconUrl = pickString(
        tokenMeta?.imageUrl,
        tokenMeta?.openGraphImageUrl,
        tokenMeta?.headerImageUrl,
        entry?.icon,
        entry?.logo,
      );

      const amountUi = pickNumber(entry?.amountUi, entry?.amount_ui);
      const decimals = typeof entry?.decimals === "number" ? entry.decimals : undefined;
      const amountDisplay = amountUi !== undefined
        ? amountUi.toLocaleString("en-US", {
            maximumFractionDigits: decimals && decimals > 4 ? 4 : decimals ?? 6,
          })
        : undefined;

      const price = formatUsd(tokenMeta?.priceUsd ?? tokenMeta?.price_usd, true);
      const marketCap = formatUsd(
        tokenMeta?.marketCap ?? tokenMeta?.market_cap ?? tokenMeta?.marketCapUsd ?? tokenMeta?.market_cap_usd,
      );
      const priceChange = formatPercent(tokenMeta?.priceChange24h ?? tokenMeta?.price_change_24h);
      const priceColor = tokenMeta?.priceChange24h !== undefined && Number(tokenMeta.priceChange24h) < 0
        ? "danger"
        : "success";

      const badges: (Badge | Button)[] = [];
      if (price) badges.push(buildBadge(`Price ${price}`, "info"));
      if (marketCap) badges.push(buildBadge(`MCap ${marketCap}`, "secondary"));
      if (priceChange) badges.push(buildBadge(`24h ${priceChange}`, priceColor));

      const linkBadges: Button[] = [];
      if (mint) linkBadges.push(buildLinkButton(truncateAddress(mint), `https://solscan.io/token/${mint}`));
      if (ata) linkBadges.push(buildLinkButton(truncateAddress(ata), `https://solscan.io/account/${ata}`));

      return {
        type: "ListViewItem",
        id: mint ?? ata ?? `balance-${index}`,
        gap: 10,
        children: [
          {
            type: "Row",
            gap: 12,
            align: "center" as Alignment,
            children: [
              iconUrl
                ? {
                    type: "Image",
                    src: iconUrl,
                    alt: symbol,
                    width: 48,
                    height: 48,
                    radius: "50%",
                  }
                : {
                    type: "Box",
                    align: "center" as Alignment,
                    justify: "center",
                    background: "rgba(255,255,255,0.04)",
                    width: 48,
                    height: 48,
                    radius: "50%",
                    children: [{ type: "Text", value: symbol.slice(0, 2), size: "sm", weight: "semibold" }],
                  },
              {
                type: "Col",
                gap: 6,
                children: [
                  {
                    type: "Row",
                    justify: "between",
                    align: "center" as Alignment,
                    children: [
                      {
                        type: "Col",
                        gap: 2,
                        children: [
                          { type: "Text", value: symbol, weight: "semibold" },
                          name ? { type: "Caption", value: name, size: "xs" } : undefined,
                        ].filter(Boolean) as any,
                      },
                      amountDisplay ? { type: "Text", value: amountDisplay, size: "sm", weight: "semibold" } : undefined,
                    ].filter(Boolean) as any,
                  },
                  badges.length
                    ? { type: "Row", gap: 6, wrap: "wrap", children: badges }
                    : undefined,
                  linkBadges.length
                    ? { type: "Row", gap: 6, wrap: "wrap", children: linkBadges }
                    : undefined,
                ].filter(Boolean) as any,
              },
            ].filter(Boolean) as any,
          },
        ],
      };
    });

  const headerCard: Card = {
    type: "Card",
    id: "balances-header",
    children: [
      {
        type: "Row",
        justify: "between",
        align: "center",
        children: [
          {
            type: "Col",
            gap: 4,
            children: [
              { type: "Title", value: "Token Balances", size: "md" },
              item.timestamp ? { type: "Caption", value: item.timestamp, size: "xs" } : undefined,
            ].filter(Boolean) as any,
          },
          balances.length
            ? buildBadge(`${balances.length} token${balances.length === 1 ? "" : "s"}`, "info")
            : undefined,
        ].filter(Boolean) as any,
      },
    ],
  };

  const listView: ListView = {
    type: "ListView",
    id: "balances-list",
    children: listItems,
  };

  const widgetPayload = [headerCard, listView];

  return (
    <div className={BASE_CARD_CLASS}>
      <ChatKitWidgetRenderer widgets={widgetPayload} />
      {balances.length > 6 && (
        <div className="mt-4">
          <button
            type="button"
            onClick={onToggle}
            className="font-display text-xs font-semibold tracking-[0.08em] text-flux transition hover:text-flux/80"
          >
            {isExpanded ? "Hide extra balances" : `Show ${balances.length - 6} more`}
          </button>
        </div>
      )}

      {debug && (
        <div className="mt-4 border-t border-[#F7BE8A]/22 pt-3">
          <button
            type="button"
            onClick={onToggle}
            className="font-display text-xs font-semibold tracking-[0.08em] text-[#F9D9C3] transition hover:text-[#FFF2E2]"
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

export default solanaBalancesRenderer;
