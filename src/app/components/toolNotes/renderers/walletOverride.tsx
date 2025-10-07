import type { ToolNoteRenderer } from "./types";
import { BASE_CARD_CLASS, normalizeOutput, unwrapStructured } from "./helpers";
import {
  ChatKitWidgetRenderer,
  type Badge,
  type Card,
  type ChatKitWidgetComponent,
} from "../ChatKitWidgetRenderer";

type Alignment = "start" | "center" | "end" | "stretch";

type OverridePayload = {
  ok?: boolean;
  cleared?: boolean;
  wallet_address?: string;
};

type OverrideArgs = Record<string, unknown>;

const walletOverrideRenderer: ToolNoteRenderer = ({ item, isExpanded, onToggle, debug }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput) as OverridePayload;
  const args = (item.data as any)?.arguments as OverrideArgs | undefined;

  const cleared = Boolean(payload.cleared);
  const ok = Boolean(payload.ok);
  const walletAddress = payload.wallet_address || (typeof args?.wallet_address === "string" ? args.wallet_address : undefined);

  const statusLabel = cleared ? "Override cleared" : ok ? "Override active" : "Override failed";
  const statusColor: Badge["color"] = cleared ? "secondary" : ok ? "success" : "danger";

  const rows: ChatKitWidgetComponent[] = [];
  if (!cleared && walletAddress) {
    rows.push({
      type: "Row",
      justify: "between",
      align: "center" as Alignment,
      children: [
        { type: "Caption", value: "Override wallet", size: "xs" },
        {
          type: "Row",
          gap: 6,
          children: [
            {
              type: "Button",
              label: `${walletAddress.slice(0, 4)}…${walletAddress.slice(-4)}`,
              onClickAction: { type: "copy", payload: { value: walletAddress } },
              variant: "outline",
              size: "sm",
            },
            {
              type: "Button",
              label: "Solscan",
              onClickAction: { type: "open_url", payload: { url: `https://solscan.io/account/${walletAddress}` } },
              variant: "outline",
              size: "sm",
            },
          ],
        },
      ],
    });
  } else if (cleared) {
    rows.push({ type: "Text", value: "Override removed. Session is back to resolver defaults.", size: "sm" });
  } else {
    rows.push({ type: "Text", value: "Override failed.", size: "sm" });
  }

  const widgets: Card[] = [
    {
      type: "Card",
      id: "wallet-override-header",
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
                { type: "Title", value: "Session Wallet Override", size: "md" },
                item.timestamp ? { type: "Caption", value: item.timestamp, size: "xs" } : undefined,
              ].filter(Boolean) as ChatKitWidgetComponent[],
            },
            { type: "Badge", label: statusLabel, color: statusColor, variant: "outline" } as Badge,
          ],
        },
      ],
    },
    {
      type: "Card",
      id: "wallet-override-body",
      children: [{ type: "Col", gap: 8, children: rows }],
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

export default walletOverrideRenderer;
