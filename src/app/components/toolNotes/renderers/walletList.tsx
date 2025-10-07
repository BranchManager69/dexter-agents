import type { ToolNoteRenderer } from "./types";
import { BASE_CARD_CLASS, normalizeOutput, unwrapStructured } from "./helpers";
import {
  ChatKitWidgetRenderer,
  type Badge,
  type Card,
  type ListView,
  type ListViewItem,
  type ChatKitWidgetComponent,
} from "../ChatKitWidgetRenderer";

type Alignment = "start" | "center" | "end" | "stretch";

type WalletRecord = {
  address?: string;
  public_key?: string;
  label?: string;
  status?: string;
  is_default?: boolean;
};

type UserRecord = {
  id?: string;
};

const walletListRenderer: ToolNoteRenderer = ({ item, isExpanded, onToggle, debug }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput);

  const user: UserRecord | null = payload && typeof payload === "object" ? (payload as any).user ?? null : null;
  const wallets: WalletRecord[] = Array.isArray((payload as any)?.wallets) ? (payload as any).wallets : [];

  const headerCard: Card = {
    type: "Card",
    id: "wallet-list-header",
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
              { type: "Title", value: "Linked Wallets", size: "md" },
              item.timestamp ? { type: "Caption", value: item.timestamp, size: "xs" } : undefined,
            ].filter(Boolean) as ChatKitWidgetComponent[],
          },
          {
            type: "Badge",
            label: `${wallets.length} wallet${wallets.length === 1 ? "" : "s"}`,
            color: "secondary",
            variant: "outline",
          } as Badge,
        ],
      },
    ],
  };

  const listItems: ListViewItem[] = wallets.map((wallet, index) => {
    const address = typeof wallet.address === "string"
      ? wallet.address
      : typeof wallet.public_key === "string"
        ? wallet.public_key
        : null;
    const label = typeof wallet.label === "string" && wallet.label.trim().length > 0
      ? wallet.label.trim()
      : null;
    const status = typeof wallet.status === "string" ? wallet.status : null;
    const isDefault = Boolean(wallet.is_default);
    const display = label || (address ? `${address.slice(0, 4)}…${address.slice(-4)}` : `Wallet ${index + 1}`);

    const badges: Badge[] = [];
    if (isDefault) badges.push({ type: "Badge", label: "Default", color: "success", variant: "outline", size: "sm", pill: true });
    if (status) badges.push({ type: "Badge", label: status, color: "secondary", variant: "outline", size: "sm", pill: true });

    const actions: ChatKitWidgetComponent[] = [];
    if (address) {
      actions.push({
        type: "Button",
        label: "Copy",
        onClickAction: { type: "copy", payload: { value: address } },
        variant: "outline",
        size: "sm",
      });
      actions.push({
        type: "Button",
        label: "Solscan",
        onClickAction: { type: "open_url", payload: { url: `https://solscan.io/account/${address}` } },
        variant: "outline",
        size: "sm",
      });
    }

    return {
      type: "ListViewItem",
      id: address ?? `wallet-${index}`,
      children: [
        {
          type: "Row",
          justify: "between",
          align: "center" as Alignment,
          children: [
            { type: "Text", value: display, weight: "semibold", size: "sm" },
            badges.length ? { type: "Row", gap: 6, children: badges } : undefined,
          ].filter(Boolean) as ChatKitWidgetComponent[],
        },
        actions.length ? { type: "Row", gap: 6, wrap: "wrap", children: actions } : undefined,
      ].filter(Boolean) as ChatKitWidgetComponent[],
    };
  });

  const widgets: Array<Card | ListView> = [headerCard];

  if (user?.id) {
    widgets.push({
      type: "Card",
      id: "wallet-list-user",
      children: [
        {
          type: "Row",
          justify: "between",
          align: "center" as Alignment,
          children: [
            { type: "Caption", value: "Supabase user", size: "xs" },
            {
              type: "Button",
              label: String(user.id),
              onClickAction: { type: "copy", payload: { value: String(user.id) } },
              variant: "outline",
              size: "sm",
            },
          ],
        },
      ],
    } as Card);
  }

  if (wallets.length) {
    widgets.push({
      type: "ListView",
      id: "wallet-list",
      children: listItems,
    } as ListView);
  } else {
    widgets.push({
      type: "Card",
      id: "wallet-list-empty",
      children: [{ type: "Text", value: "No wallets linked to this account.", size: "sm" }],
    } as Card);
  }

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

export default walletListRenderer;
