import type { ToolNoteRenderer } from "./types";
import { BASE_CARD_CLASS, normalizeOutput, unwrapStructured, formatSolDisplay } from "./helpers";
import {
  ChatKitWidgetRenderer,
  type Badge,
  type Card,
  type ChatKitWidgetComponent,
} from "../ChatKitWidgetRenderer";

import { formatSolValue } from "@/app/components/solana/SolanaAmount";

type Alignment = "start" | "center" | "end" | "stretch";

type TradeArgs = Record<string, unknown>;

type TradePayload = {
  walletAddress?: string;
  signature?: string;
  txSignature?: string;
  mint?: string;
  swapLamports?: number;
  swap_lamports?: number;
  feeLamports?: number;
  fee_lamports?: number;
  warnings?: unknown[];
  solscanUrl?: string;
  status?: string;
  error?: string;
};

function buildRow(label: string, components: ChatKitWidgetComponent[]): ChatKitWidgetComponent {
  return {
    type: "Row",
    justify: "between",
    align: "center" as Alignment,
    children: [
      { type: "Caption", value: label, size: "xs" },
      {
        type: "Row",
        gap: 6,
        wrap: "wrap",
        align: "center" as Alignment,
        children: components,
      },
    ],
  };
}

function createTradeRenderer(mode: "buy" | "sell"): ToolNoteRenderer {
  const heading = mode === "buy" ? "Buy Execution" : "Sell Execution";
  const badgeColor = mode === "buy" ? "success" : "warning";
  const badgeLabel = mode === "buy" ? "Buy filled" : "Sell filled";

  const TradeRenderer: ToolNoteRenderer = ({ item, isExpanded, onToggle, debug }) => {
    const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
    const trade = unwrapStructured(rawOutput) as TradePayload;
    const args = (item.data as any)?.arguments as TradeArgs | undefined;

    const walletAddress = trade.walletAddress || (typeof args?.wallet_address === "string" ? args.wallet_address : undefined);
    const mint = trade.mint || (typeof args?.mint === "string" ? args.mint : undefined);
    const signature = trade.signature || trade.txSignature;
    const solscanUrl = trade.solscanUrl || (signature ? `https://solscan.io/tx/${signature}` : undefined);

    const spendSolValue = args?.amount_sol ?? args?.amountSol;
    const spendDisplay = mode === "buy" && spendSolValue !== undefined
      ? formatSolValue(spendSolValue)
      : undefined;

    const amountRaw = mode === "sell" && typeof args?.amount_raw === "string" ? args.amount_raw : undefined;
    const percentage = mode === "sell" && typeof args?.percentage === "number" ? `${args.percentage}%` : undefined;

    const swapLamports = trade.swapLamports ?? trade.swap_lamports;
    const feeLamports = trade.feeLamports ?? trade.fee_lamports;

    const infoRows: ChatKitWidgetComponent[] = [];

    if (mint) {
      infoRows.push(buildRow("Token", [
        {
          type: "Button",
          label: `${mint.slice(0, 4)}…${mint.slice(-4)}`,
          onClickAction: { type: "open_url", payload: { url: `https://solscan.io/token/${mint}` } },
          variant: "outline",
          size: "sm",
        },
      ]));
    }

    if (walletAddress) {
      infoRows.push(buildRow("Wallet", [
        {
          type: "Button",
          label: `${walletAddress.slice(0, 4)}…${walletAddress.slice(-4)}`,
          onClickAction: { type: "open_url", payload: { url: `https://solscan.io/account/${walletAddress}` } },
          variant: "outline",
          size: "sm",
        },
        {
          type: "Button",
          label: "Copy",
          onClickAction: { type: "copy", payload: { value: walletAddress } },
          variant: "outline",
          size: "sm",
        },
      ]));
    }

    if (mode === "buy" && spendDisplay) {
      infoRows.push(buildRow("Spend", [
        { type: "Text", value: spendDisplay, weight: "semibold", size: "sm" },
      ]));
    }

    if (mode === "sell" && percentage) {
      infoRows.push(buildRow("Portion", [{ type: "Text", value: percentage, size: "sm" }]));
    }

    if (mode === "sell" && amountRaw) {
      infoRows.push(buildRow("Amount (raw)", [{ type: "Text", value: amountRaw, size: "sm" }]));
    }

    if (swapLamports !== undefined) {
      const swapDisplay = formatSolDisplay(swapLamports, { fromLamports: true });
      if (swapDisplay) {
        infoRows.push(buildRow(mode === "buy" ? "Swap out" : "Swap in", [{ type: "Text", value: swapDisplay, size: "sm", weight: "semibold" }]));
      }
    }

    if (feeLamports !== undefined) {
      const feeDisplay = formatSolDisplay(feeLamports, { fromLamports: true });
      if (feeDisplay) {
        infoRows.push(buildRow("Platform fee", [{ type: "Text", value: feeDisplay, size: "sm" }]));
      }
    }

    if (signature) {
      infoRows.push(buildRow("Signature", [
        {
          type: "Button",
          label: `${signature.slice(0, 6)}…${signature.slice(-6)}`,
          onClickAction: { type: "copy", payload: { value: signature } },
          variant: "outline",
          size: "sm",
        },
        solscanUrl
          ? {
              type: "Button",
              label: "Solscan",
              onClickAction: { type: "open_url", payload: { url: solscanUrl } },
              variant: "outline",
              size: "sm",
            }
          : undefined,
      ].filter(Boolean) as ChatKitWidgetComponent[]));
    }

    const warnings = Array.isArray(trade?.warnings)
      ? trade.warnings.filter((warn: unknown): warn is string => typeof warn === "string" && warn.length > 0)
      : [];

    const status = typeof trade?.status === "string" ? trade.status : undefined;
    const errorMessage = typeof trade?.error === "string" ? trade.error : (typeof rawOutput?.error === "string" ? rawOutput.error : undefined);

    const cards: Card[] = [
      {
        type: "Card",
        id: `${mode}-trade-header`,
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
                  { type: "Title", value: heading, size: "md" },
                  item.timestamp ? { type: "Caption", value: item.timestamp, size: "xs" } : undefined,
                ].filter(Boolean) as ChatKitWidgetComponent[],
              },
              { type: "Badge", label: badgeLabel, color: badgeColor, variant: "outline" } as Badge,
            ],
          },
        ],
      },
      {
        type: "Card",
        id: `${mode}-trade-info`,
        children: [{ type: "Col", gap: 8, children: infoRows }],
      },
    ];

    if (status) {
      cards.push({
        type: "Card",
        id: `${mode}-trade-status`,
        children: [{ type: "Row", justify: "between", align: "center", children: [
          { type: "Caption", value: "Status", size: "xs" },
          { type: "Text", value: status, size: "sm", weight: "semibold" },
        ] }],
      });
    }

    if (warnings.length) {
      cards.push({
        type: "Card",
        id: `${mode}-trade-warnings`,
        children: [
          { type: "Title", value: "Warnings", size: "sm" },
          { type: "Col", gap: 6, children: warnings.map((warn) => ({ type: "Text", value: warn, size: "sm" })) as ChatKitWidgetComponent[] },
        ],
      });
    }

    if (errorMessage) {
      cards.push({
        type: "Card",
        id: `${mode}-trade-error`,
        children: [
          { type: "Title", value: "Error", size: "sm" },
          { type: "Text", value: errorMessage, size: "sm" },
        ],
      });
    }

    const hasRequestArgs = args && typeof args === "object" && Object.keys(args).length > 0;
    const hasRawDetails = debug && Object.keys(rawOutput || {}).length > 0;

    return (
      <div className={BASE_CARD_CLASS}>
        <ChatKitWidgetRenderer widgets={cards} />
        {(hasRequestArgs || hasRawDetails) && (
          <details className="mt-4 border-t border-[#F7BE8A]/22 pt-3" open={isExpanded}>
            <summary
              className="cursor-pointer font-display text-xs font-semibold tracking-[0.08em] text-[#F9D9C3] transition hover:text-[#FFF2E2]"
              onClick={(event) => {
                event.preventDefault();
                onToggle();
              }}
            >
              {isExpanded ? "Hide details" : "Show details"}
            </summary>
            {isExpanded && (
              <div className="mt-3 space-y-3 text-[11px] text-[#FFE4CF]">
                {hasRequestArgs && (
                  <div>
                    <div className="font-display text-[10px] font-semibold tracking-[0.08em] text-[#F0BFA1]">Request</div>
                    <pre className="mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-[#F7BE8A]/24 bg-[#16070C]/85 p-3 text-[#FFF2E2]">
                      {JSON.stringify(args, null, 2)}
                    </pre>
                  </div>
                )}
                {hasRawDetails && (
                  <div>
                    <div className="font-display text-[10px] font-semibold tracking-[0.08em] text-[#F0BFA1]">Raw response</div>
                    <pre className="mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-[#F7BE8A]/24 bg-[#16070C]/85 p-3 text-[#FFF2E2]">
                      {JSON.stringify(rawOutput, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </details>
        )}
      </div>
    );
  };

  (TradeRenderer as ToolNoteRenderer & { displayName?: string }).displayName =
    mode === "buy" ? "ToolNoteTradeBuy" : "ToolNoteTradeSell";

  return TradeRenderer;
}

export const solanaExecuteBuyRenderer = createTradeRenderer("buy");
export const solanaExecuteSellRenderer = createTradeRenderer("sell");
