import type { ToolNoteRenderer } from "./types";
import { BASE_CARD_CLASS, normalizeOutput, unwrapStructured } from "./helpers";
import {
  ChatKitWidgetRenderer,
  type Card,
  type ChatKitWidgetComponent,
} from "../ChatKitWidgetRenderer";

type Diagnostics = {
  bearer_source?: string;
  has_token?: boolean;
  override_session?: string;
  detail?: string;
  wallets_cached?: number;
};

type Summary = {
  wallet_address?: string;
  user_id?: string;
  source?: string;
  diagnostics?: Diagnostics;
};

type Alignment = "start" | "center" | "end" | "stretch";

const walletAuthRenderer: ToolNoteRenderer = ({ item, isExpanded, onToggle, debug }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput) as Summary;

  const rows: ChatKitWidgetComponent[] = [];

  if (payload.wallet_address) {
    rows.push({
      type: "Row",
      justify: "between",
      align: "center" as Alignment,
      children: [
        { type: "Caption", value: "Active wallet", size: "xs" },
        {
          type: "Row",
          gap: 6,
          children: [
        {
          type: "Button",
          label: `${payload.wallet_address.slice(0, 4)}…${payload.wallet_address.slice(-4)}`,
          onClickAction: { type: "copy", payload: { value: payload.wallet_address } },
          variant: "outline",
          size: "sm",
        },
        {
          type: "Button",
          label: "Solscan",
          onClickAction: { type: "open_url", payload: { url: `https://solscan.io/account/${payload.wallet_address}` } },
          variant: "outline",
          size: "sm",
        },
          ],
        },
      ],
    });
  } else {
    rows.push({ type: "Text", value: "No wallet bound to this session.", size: "sm" });
  }

  if (payload.user_id) {
    rows.push({
      type: "Row",
      justify: "between",
      align: "center" as Alignment,
      children: [
        { type: "Caption", value: "Supabase user", size: "xs" },
        {
          type: "Button",
          label: payload.user_id,
          onClickAction: { type: "copy", payload: { value: payload.user_id } },
          variant: "outline",
          size: "sm",
        },
      ],
    });
  }

  const diagnostics = payload.diagnostics;
  const widgets: Card[] = [
    {
      type: "Card",
      id: "wallet-auth-header",
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
                { type: "Title", value: "Auth Diagnostics", size: "md" },
                item.timestamp ? { type: "Caption", value: item.timestamp, size: "xs" } : undefined,
              ].filter(Boolean) as ChatKitWidgetComponent[],
            },
            payload.source
              ? { type: "Badge", label: `Source: ${payload.source}`, color: "secondary", variant: "outline" } as any
              : undefined,
          ].filter(Boolean) as ChatKitWidgetComponent[],
        },
      ],
    },
    {
      type: "Card",
      id: "wallet-auth-body",
      children: [{ type: "Col", gap: 8, children: rows }],
    },
  ];

  if (diagnostics) {
    const diagRows: ChatKitWidgetComponent[] = [];
    if (diagnostics.bearer_source) diagRows.push(makeDiagRow("Bearer source", diagnostics.bearer_source));
    if (diagnostics.has_token !== undefined) diagRows.push(makeDiagRow("Has token", diagnostics.has_token ? "yes" : "no"));
    if (diagnostics.override_session) diagRows.push(makeDiagRow("Session override", diagnostics.override_session));
    if (diagnostics.detail) diagRows.push(makeDiagRow("Resolver detail", diagnostics.detail));
    if (diagnostics.wallets_cached !== undefined) diagRows.push(makeDiagRow("Wallets cached", String(diagnostics.wallets_cached)));

    widgets.push({
      type: "Card",
      id: "wallet-diagnostics",
      children: [
        { type: "Title", value: "Diagnostics", size: "sm" },
        { type: "Col", gap: 6, children: diagRows },
      ],
    });
  }

  return (
    <div className={BASE_CARD_CLASS}>
      <ChatKitWidgetRenderer widgets={widgets} />
      {debug && (
        <details className="mt-4 border-t border-[#F7BE8A]/22 pt-3" open={isExpanded}>
          <summary
            className="cursor-pointer text-xs uppercase tracking-[0.24em] text-[#F9D9C3] transition hover:text-[#FFF2E2]"
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

function makeDiagRow(label: string, value: string): ChatKitWidgetComponent {
  return {
    type: "Row",
    justify: "between",
    align: "center" as Alignment,
    children: [
      { type: "Caption", value: label, size: "xs" },
      { type: "Text", value, size: "sm" },
    ],
  };
}

export default walletAuthRenderer;
