import type { ToolNoteRenderer } from "./types";
import { BASE_CARD_CLASS, normalizeOutput, resolveSourceBadge } from "./helpers";
import {
  ChatKitWidgetRenderer,
  type Badge,
  type Card,
  type ChatKitWidgetComponent,
} from "../ChatKitWidgetRenderer";

type Alignment = "start" | "center" | "end" | "stretch";

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

  const walletAddress = extractAddress(payload)
    ?? extractAddress(rawOutput)
    ?? extractAddress((item.data as any)?.output)
    ?? null;
  const rawSource = typeof (payload as any)?.source === "string" ? (payload as any).source : null;
  const userId = typeof (payload as any)?.user_id === "string" ? (payload as any).user_id : null;
  const requestedWallet = typeof args?.wallet_address === "string" ? args.wallet_address : null;
  const derivedSource = rawSource
    ? rawSource
    : userId
      ? "primary"
      : walletAddress
        ? "demo"
        : null;
  const sourceBadge = resolveSourceBadge(derivedSource);

  const rows: ChatKitWidgetComponent[] = [];
  const resolvedChildren: ChatKitWidgetComponent[] = walletAddress
    ? [
        {
          type: "Button",
          label: `Copy ${walletAddress.slice(0, 4)}…${walletAddress.slice(-4)}`,
          onClickAction: { type: "copy", payload: { value: walletAddress } },
          variant: "outline",
          size: "sm",
        },
        {
          type: "Button",
          label: "View on Solscan",
          onClickAction: { type: "open_url", payload: { url: `https://solscan.io/account/${walletAddress}` } },
          variant: "outline",
          size: "sm",
        },
      ]
    : [{ type: "Text", value: "No wallet resolved", size: "sm" }];

  rows.push({
    type: "Row",
    justify: "between",
    align: "center" as Alignment,
    children: [
      { type: "Caption", value: "Resolved", size: "xs" },
      {
        type: "Row",
        gap: 6,
        wrap: "wrap",
        align: "center" as Alignment,
        children: resolvedChildren,
      },
    ],
  });

  if (userId) {
    rows.push({
      type: "Row",
      justify: "between",
      align: "center" as Alignment,
      children: [
        { type: "Caption", value: "Supabase user", size: "xs" },
        {
          type: "Button",
          label: userId,
          onClickAction: { type: "copy", payload: { value: userId } },
          variant: "outline",
          size: "sm",
        },
      ],
    });
  }

  if (requestedWallet) {
    rows.push({
      type: "Row",
      justify: "between",
      align: "center" as Alignment,
      children: [
        { type: "Caption", value: "Requested", size: "xs" },
        {
          type: "Button",
          label: requestedWallet,
          onClickAction: { type: "copy", payload: { value: requestedWallet } },
          variant: "outline",
          size: "sm",
        },
      ],
    });
  }

  const widgets: Card[] = [
    {
      type: "Card",
      id: "wallet-resolve-header",
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
                { type: "Title", value: "Active Wallet", size: "md" },
                item.timestamp ? { type: "Caption", value: item.timestamp, size: "xs" } : undefined,
              ].filter(Boolean) as ChatKitWidgetComponent[],
            },
            {
              type: "Badge",
              label: sourceBadge.label,
              color: "secondary",
              variant: "outline",
            } as Badge,
          ],
        },
      ],
    },
    {
      type: "Card",
      id: "wallet-resolve-details",
      children: [
        {
          type: "Col",
          gap: 8,
          children: rows,
        },
      ],
    },
  ];

  return (
    <div className={BASE_CARD_CLASS}>
      <ChatKitWidgetRenderer widgets={widgets} />
      {debug && (
        <details className="mt-4 border-t border-[#F7BE8A]/22 pt-3" open={isExpanded}>
          <summary
            className="cursor-pointer font-display text-xs font-semibold tracking-[0.08em] text-[#F9D9C3] transition hover:text-[#FFF2E2]"
            onClick={(event) => {
              event.preventDefault();
              onToggle();
            }}
          >
            {isExpanded ? "Hide raw payload" : "Show raw payload"}
          </summary>
          {isExpanded && (
            <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-[#F7BE8A]/24 bg-[#16070C]/85 p-3 text-[11px] text-[#FFF2E2]">
              {JSON.stringify(rawOutput, null, 2)}
            </pre>
          )}
        </details>
      )}
    </div>
  );
};

export default resolveWalletRenderer;
