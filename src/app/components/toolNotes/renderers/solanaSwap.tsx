import React from "react";

import type { ToolNoteRenderer } from "./types";
import {
  BASE_CARD_CLASS,
  normalizeOutput,
  unwrapStructured,
  formatSolDisplay,
  formatUsd,
} from "./helpers";
import {
  ChatKitWidgetRenderer,
  type Badge,
  type Button,
  type Card,
  type ListView,
  type ListViewItem,
  type ChatKitWidgetComponent,
} from "../ChatKitWidgetRenderer";

type Alignment = "start" | "center" | "end" | "stretch";

type SwapArgs = Record<string, unknown>;

type SwapSummary = {
  headerCard: Card;
  infoRows: ChatKitWidgetComponent[];
  routeSection?: Card | ListView;
  warningsCard?: Card;
  raw: any;
};

const percentFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
  signDisplay: "always",
});

function formatPercent(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return undefined;
  return `${percentFormatter.format(numeric)}%`;
}

function pick<T = unknown>(...candidates: Array<T | null | undefined>): T | undefined {
  for (const candidate of candidates) {
    if (candidate !== null && candidate !== undefined) {
      return candidate as T;
    }
  }
  return undefined;
}

function truncateAddress(address: string, visible = 4) {
  if (address.length <= visible * 2 + 1) return address;
  return `${address.slice(0, visible)}…${address.slice(-visible)}`;
}

function buildBadge(label: string, color: Badge["color"], extra?: Partial<Badge>): Badge {
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

function buildLinkButton(label: string, url: string): Button {
  return {
    type: "Button",
    label,
    onClickAction: { type: "open_url", payload: { url } },
    variant: "outline",
    size: "sm",
  };
}

function buildRow(label: string, children: ChatKitWidgetComponent[]): ChatKitWidgetComponent {
  return {
    type: "Row",
    justify: "between",
    align: "center" as Alignment,
    gap: 8,
    children: [
      { type: "Caption", value: label, size: "xs" },
      {
        type: "Row",
        gap: 6,
        wrap: "wrap",
        align: "center" as Alignment,
        children,
      },
    ],
  };
}

function asText(value: string, options?: { weight?: "normal" | "medium" | "semibold" | "bold"; size?: "xs" | "sm" | "md" }) {
  return {
    type: "Text", value, size: options?.size ?? "sm", weight: options?.weight ?? "normal",
  } as ChatKitWidgetComponent;
}

function computeSummary(label: string, item: any, structured: any, args: SwapArgs): SwapSummary {
  const headerCard: Card = {
    type: "Card",
    id: `${label.toLowerCase().replace(/\s+/g, "-")}-header`,
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
              { type: "Title", value: label, size: "md" },
              item.timestamp ? { type: "Caption", value: item.timestamp, size: "xs" } : undefined,
            ].filter(Boolean) as ChatKitWidgetComponent[],
          },
        ],
      },
    ],
  };

  const infoRows: ChatKitWidgetComponent[] = [];

  const fromMint = pick<string>(structured?.inputMint, structured?.sourceMint, args?.from_mint as string, args?.input_mint as string);
  const toMint = pick<string>(structured?.outputMint, structured?.destinationMint, args?.to_mint as string, args?.output_mint as string);
  const amountIn = pick(structured?.inputAmount, structured?.amountIn, args?.amount_in, args?.amountIn);
  const amountOut = pick(structured?.outputAmount, structured?.amountOut, structured?.expectedOutput, structured?.expected_out, structured?.quote);
  const amountInLamports = pick(structured?.inputAmountLamports, structured?.amountInLamports, args?.amount_in_lamports);
  const amountOutLamports = pick(structured?.outputAmountLamports, structured?.amountOutLamports, structured?.expected_output_lamports);

  if (fromMint || amountIn || amountInLamports) {
    const pieces: ChatKitWidgetComponent[] = [];
    if (amountIn) {
      pieces.push(asText(String(amountIn), { weight: "semibold" }));
    } else if (amountInLamports) {
      const solDisplay = formatSolDisplay(amountInLamports, { fromLamports: true });
      if (solDisplay) {
        pieces.push(asText(solDisplay, { weight: "semibold" }));
      }
    }
    if (fromMint) {
      pieces.push(buildLinkButton(truncateAddress(fromMint), `https://solscan.io/token/${fromMint}`));
    }
    infoRows.push(buildRow("From", pieces));
  }

  if (toMint || amountOut || amountOutLamports) {
    const pieces: ChatKitWidgetComponent[] = [];
    if (amountOut) {
      pieces.push(asText(String(amountOut), { weight: "semibold" }));
    } else if (amountOutLamports) {
      const solDisplay = formatSolDisplay(amountOutLamports, { fromLamports: true });
      if (solDisplay) {
        pieces.push(asText(solDisplay, { weight: "semibold" }));
      }
    }
    if (toMint) {
      pieces.push(buildLinkButton(truncateAddress(toMint), `https://solscan.io/token/${toMint}`));
    }
    infoRows.push(buildRow("To", pieces));
  }

  const usdIn = pick(structured?.inputUsdValue, structured?.usdIn, structured?.usd_in);
  if (usdIn) {
    const formatted = formatUsd(usdIn) ?? String(usdIn);
    infoRows.push(buildRow("Input USD", [asText(formatted, { weight: "semibold" })]));
  }

  const usdOut = pick(structured?.outputUsdValue, structured?.usdOut, structured?.usd_out);
  if (usdOut) {
    const formatted = formatUsd(usdOut) ?? String(usdOut);
    infoRows.push(buildRow("Output USD", [asText(formatted, { weight: "semibold" })]));
  }

  const priceImpact = pick(structured?.priceImpactPercent, structured?.priceImpact, structured?.price_impact_percent, structured?.price_impact);
  if (priceImpact) {
    const formatted = formatPercent(priceImpact) ?? String(priceImpact);
    infoRows.push(buildRow("Price impact", [asText(formatted)]));
  }

  const feeLamports = pick(structured?.feesLamports, structured?.platformFeeLamports, structured?.totalFeesLamports);
  if (feeLamports) {
    const formatted = formatSolDisplay(feeLamports, { fromLamports: true }) ?? String(feeLamports);
    infoRows.push(buildRow("Platform fees", [asText(formatted)]));
  }

  const slippage = pick(structured?.slippageBps, structured?.slippage_bps, args?.slippage_bps);
  if (slippage !== undefined) {
    const bps = typeof slippage === "number" ? slippage : Number(slippage);
    const percent = Number.isFinite(bps) ? `${(bps / 100).toFixed(2)}%` : String(slippage);
    infoRows.push(buildRow("Slippage", [asText(percent)]));
  }

  const route = structured?.route ?? structured?.legs;
  let routeSection: Card | ListView | undefined;
  if (Array.isArray(route)) {
    const listItems: ListViewItem[] = route.map((leg: any, index: number) => {
      const label = pick<string>(leg?.label, leg?.pool, leg?.dex, `Leg ${index + 1}`) ?? `Leg ${index + 1}`;
      const provider = pick<string>(leg?.provider, leg?.source);
      const inMint = pick<string>(leg?.inputMint, leg?.inMint);
      const outMint = pick<string>(leg?.outputMint, leg?.outMint);
      const legBadges: Badge[] = [];
      if (provider) legBadges.push(buildBadge(provider, "secondary"));
      const mintRowChildren: ChatKitWidgetComponent[] = [];
      if (inMint) mintRowChildren.push(buildLinkButton(`From ${truncateAddress(inMint)}`, `https://solscan.io/token/${inMint}`));
      if (outMint) mintRowChildren.push(buildLinkButton(`To ${truncateAddress(outMint)}`, `https://solscan.io/token/${outMint}`));
      return {
        type: "ListViewItem",
        id: leg?.id ?? leg?.pool ?? `leg-${index}`,
        gap: 6,
        children: [
          {
            type: "Row",
            justify: "between",
            align: "center" as Alignment,
            children: [
              { type: "Text", value: label, weight: "semibold", size: "sm" },
              legBadges.length ? { type: "Row", gap: 6, children: legBadges } : undefined,
            ].filter(Boolean) as ChatKitWidgetComponent[],
          },
          mintRowChildren.length
            ? { type: "Row", gap: 6, wrap: "wrap", children: mintRowChildren }
            : undefined,
        ].filter(Boolean) as ChatKitWidgetComponent[],
      };
    });
    routeSection = {
      type: "ListView",
      id: "swap-route",
      children: listItems,
    };
  } else if (typeof route === "string") {
    routeSection = {
      type: "Card",
      id: "swap-route-text",
      children: [
        { type: "Title", value: "Route", size: "sm" },
        { type: "Text", value: route, size: "sm" },
      ],
    };
  }

  const warnings = Array.isArray(structured?.warnings)
    ? structured.warnings.filter((warn: unknown): warn is string => typeof warn === "string" && warn.length > 0)
    : [];

  const warningsCard = warnings.length
    ? ({
        type: "Card",
        id: "swap-warnings",
        children: [
          { type: "Title", value: "Warnings", size: "sm" },
          {
            type: "Col",
            gap: 6,
            children: warnings.map((warn: string) => ({ type: "Text", value: warn, size: "sm" })) as ChatKitWidgetComponent[],
          },
        ],
      } as Card)
    : undefined;

  const enrichedInfoRows = infoRows.filter(Boolean);

  return {
    headerCard,
    infoRows: enrichedInfoRows,
    routeSection,
    warningsCard,
    raw: structured,
  };
}

export const solanaSwapPreviewRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const structured = unwrapStructured(rawOutput);
  const args = (item.data as any)?.arguments ?? {};

  const summary = computeSummary("Swap Preview", item, structured, args);

  const previewRows: ChatKitWidgetComponent[] = [];
  const quoteSource = pick(structured?.quoteSource, structured?.provider, structured?.routeSource);
  if (quoteSource) {
    previewRows.push(buildRow("Quote source", [asText(String(quoteSource))]));
  }
  const estimatedTime = pick(structured?.estimatedSeconds, structured?.ETASeconds, structured?.eta_seconds);
  if (estimatedTime !== undefined) {
    const seconds = typeof estimatedTime === "number" ? estimatedTime : Number(estimatedTime);
    const label = Number.isFinite(seconds) ? `${seconds.toFixed(0)}s` : String(estimatedTime);
    previewRows.push(buildRow("ETA", [asText(label)]));
  }

  const widgets: Array<Card | ListView> = [summary.headerCard];
  if (summary.infoRows.length || previewRows.length) {
    widgets.push({
      type: "Card",
      id: "swap-preview-info",
      children: [
        {
          type: "Col",
          gap: 8,
          children: [...summary.infoRows, ...previewRows],
        },
      ],
    });
  }
  if (summary.routeSection) widgets.push(summary.routeSection);
  if (summary.warningsCard) widgets.push(summary.warningsCard);

  return (
    <div className={BASE_CARD_CLASS}>
      <ChatKitWidgetRenderer widgets={widgets} />
      {debug && (
        <details className="mt-4 rounded-md border border-[#F7BE8A]/18 bg-[#1A090D]/70 p-3 text-sm text-[#FFEBD7]">
          <summary className="cursor-pointer text-[10px] uppercase tracking-[0.22em] text-[#F0BFA1]">
            Raw preview data
          </summary>
          <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap break-words text-xs text-[#FFF6EC]">
            {JSON.stringify(rawOutput, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
};

export const solanaSwapExecuteRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const structured = unwrapStructured(rawOutput);
  const args = (item.data as any)?.arguments ?? {};

  const summary = computeSummary("Swap Execution", item, structured, args);

  const extraRows: ChatKitWidgetComponent[] = [];
  const status = pick(structured?.status, rawOutput?.status);
  if (status) {
    extraRows.push(buildRow("Status", [asText(String(status), { weight: "semibold" })]));
  }
  const slot = pick(structured?.slot, rawOutput?.slot);
  if (slot !== undefined) {
    extraRows.push(buildRow("Slot", [asText(String(slot))]));
  }
  const signature = pick<string>(structured?.signature, structured?.txSignature, structured?.signatureId, structured?.transaction);
  if (signature) {
    extraRows.push(buildRow("Signature", [buildLinkButton(truncateAddress(signature, 6), `https://solscan.io/tx/${signature}`)]));
  }

  const errorMessage = pick<string>(rawOutput?.errorMessage, rawOutput?.error, structured?.error);

  const widgets: Array<Card | ListView> = [summary.headerCard];
  if (summary.infoRows.length || extraRows.length) {
    widgets.push({
      type: "Card",
      id: "swap-execution-info",
      children: [
        {
          type: "Col",
          gap: 8,
          children: [...summary.infoRows, ...extraRows],
        },
      ],
    });
  }
  if (summary.routeSection) widgets.push(summary.routeSection);
  if (summary.warningsCard) widgets.push(summary.warningsCard);
  if (errorMessage) {
    widgets.push({
      type: "Card",
      id: "swap-execution-error",
      children: [
        { type: "Title", value: "Execution error", size: "sm" },
        { type: "Text", value: errorMessage, size: "sm" },
      ],
    });
  }

  return (
    <div className={BASE_CARD_CLASS}>
      <ChatKitWidgetRenderer widgets={widgets} />
      {debug && (
        <details className="mt-4 rounded-md border border-[#F7BE8A]/18 bg-[#1A090D]/70 p-3 text-sm text-[#FFEBD7]">
          <summary className="cursor-pointer text-[10px] uppercase tracking-[0.22em] text-[#F0BFA1]">
            Raw execution data
          </summary>
          <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap break-words text-xs text-[#FFF6EC]">
            {JSON.stringify(rawOutput, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
};
