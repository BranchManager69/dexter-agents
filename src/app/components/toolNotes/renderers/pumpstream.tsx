import type { ToolNoteRenderer } from "./types";
import { BASE_CARD_CLASS, normalizeOutput } from "./helpers";
import {
  ChatKitWidgetRenderer,
  type Badge,
  type Card,
  type ListView,
  type ListViewItem,
} from "../ChatKitWidgetRenderer";

type Alignment = "start" | "center" | "end" | "stretch";

type StreamEntry = {
  name?: string;
  symbol?: string;
  mintId?: string;
  channel?: string;
  url?: string;
  streamUrl?: string;
  thumbnail?: string;
  currentViewers?: number;
  viewer_count?: number;
  viewers?: number;
  marketCapUsd?: number;
  market_cap_usd?: number;
  marketCap?: number;
  momentum?: number | string;
  signal?: number | string;
};

const countFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function truncateLabel(label: string, max = 42) {
  if (label.length <= max) return label;
  return `${label.slice(0, max - 1)}…`;
}

function formatCurrency(value: unknown) {
  const numeric = typeof value === "number" ? value : typeof value === "string" ? Number(value) : undefined;
  if (numeric === undefined || !Number.isFinite(numeric)) return undefined;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    numeric,
  );
}

function formatMomentum(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return undefined;
}

function createBadge(label: string, color: Badge["color"], extra?: Partial<Badge>): Badge {
  return {
    type: "Badge",
    label,
    color,
    variant: "outline",
    size: "sm",
    pill: true,
    ...extra,
  };
}

const pumpstreamRenderer: ToolNoteRenderer = ({ item, isExpanded, onToggle, debug }) => {
  const payload = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const streams: StreamEntry[] = Array.isArray((payload as any).streams) ? (payload as any).streams : [];
  const generatedAt = typeof (payload as any).generatedAt === "string" ? (payload as any).generatedAt : null;

  const items: ListViewItem[] = streams
    .slice(0, isExpanded ? streams.length : 6)
    .map((stream, index): ListViewItem => {
      const rawTitle =
        stream.name || stream.symbol || stream.mintId || stream.channel || `Stream ${index + 1}`;
      const title = truncateLabel(rawTitle ?? `Stream ${index + 1}`);
      const viewersRaw = stream.currentViewers ?? stream.viewer_count ?? stream.viewers;
      const viewerLabel = typeof viewersRaw === "number"
        ? `${countFormatter.format(viewersRaw)} watching`
        : viewersRaw
          ? String(viewersRaw)
          : undefined;

      const marketCap =
        formatCurrency(stream.marketCapUsd ?? stream.market_cap_usd ?? stream.marketCap);
      const momentumLabel = formatMomentum(stream.momentum ?? stream.signal);
      const momentumValue = typeof (stream.momentum ?? stream.signal) === "number"
        ? Number(stream.momentum ?? stream.signal)
        : undefined;

      const href = typeof stream.url === "string" && stream.url
        ? stream.url
        : typeof stream.streamUrl === "string" && stream.streamUrl
          ? stream.streamUrl
          : typeof stream.mintId === "string" && stream.mintId
            ? `https://pump.fun/${stream.mintId}`
            : undefined;

      const badges: Badge[] = [];
      if (marketCap) badges.push(createBadge(`MCAP ${marketCap}`, "info"));
      if (momentumLabel) {
        badges.push(
          createBadge(
            `Momentum ${momentumLabel}`,
            momentumValue !== undefined && momentumValue < 0 ? "danger" : "success",
          ),
        );
      }

      const children: ListViewItem["children"] = [
        {
          type: "Row",
          gap: 12,
          align: "start" as Alignment,
          children: [
            stream.thumbnail
              ? {
                  type: "Image",
                  src: stream.thumbnail,
                  alt: title,
                  width: 120,
                  height: 72,
                  radius: "12px",
                }
              : undefined,
            {
              type: "Col",
              gap: 6,
              children: [
                { type: "Text", value: title, weight: "semibold", size: "md" },
                viewerLabel ? { type: "Caption", value: viewerLabel, size: "sm" } : undefined,
                badges.length
                  ? {
                      type: "Row",
                      gap: 6,
                      children: badges,
                    }
                  : undefined,
              ].filter(Boolean) as any,
            },
          ].filter(Boolean) as any,
        },
      ];

      return {
        type: "ListViewItem",
        id: stream.mintId ?? `stream-${index}`,
        onClickAction: href ? { type: "open_url", payload: { url: href } } : undefined,
        children,
        gap: 8,
      };
    });

  const headerCard: Card = {
    type: "Card",
    id: "pumpstream-header",
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
              { type: "Title", value: "Pump.fun Streams", size: "md" },
              generatedAt
                ? { type: "Caption", value: `Updated ${new Date(generatedAt).toLocaleTimeString()}`, size: "xs" }
                : undefined,
            ].filter(Boolean) as any,
          },
          streams.length
            ? createBadge(`${streams.length} live`, "info", { id: "pumpstream-count" })
            : undefined,
        ].filter(Boolean) as any,
      },
    ],
  };

  const listView: ListView = {
    type: "ListView",
    id: "pumpstream-streams",
    children: items,
  };

  const widgetPayload = [headerCard, listView];

  return (
    <div className={BASE_CARD_CLASS}>
      <ChatKitWidgetRenderer widgets={widgetPayload} />
      {streams.length > 6 && (
        <div className="mt-4">
          <button
            type="button"
            onClick={onToggle}
            className="text-xs uppercase tracking-[0.24em] text-flux transition hover:text-flux/80"
          >
            {isExpanded ? "Hide extra streams" : `Show ${streams.length - 6} more`}
          </button>
        </div>
      )}

      {debug && isExpanded && (
        <details className="mt-4 w-full" open>
          <summary className="cursor-pointer text-xs uppercase tracking-[0.2em] text-[#F9D9C3]">
            Raw payload
          </summary>
          <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-[#F7BE8A]/24 bg-[#16070C]/85 p-3 text-[11px] text-[#FFF2E2]">
            {JSON.stringify(payload, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
};

export default pumpstreamRenderer;
