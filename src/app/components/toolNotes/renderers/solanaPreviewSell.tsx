import type { ToolNoteRenderer } from "./types";
import { BASE_CARD_CLASS, normalizeOutput, unwrapStructured } from "./helpers";
import {
  ChatKitWidgetRenderer,
  type Card,
  type ChatKitWidgetComponent,
} from "../ChatKitWidgetRenderer";
import { formatSolDisplay } from "./helpers";

type Alignment = "start" | "center" | "end" | "stretch";

type PreviewPayload = {
  expectedSol?: number | string;
  expected_sol?: number | string;
  warnings?: unknown[];
};

type PreviewArgs = Record<string, unknown>;

const solanaPreviewSellRenderer: ToolNoteRenderer = ({ item, isExpanded, onToggle, debug }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput) as PreviewPayload;
  const args = (item.data as any)?.arguments as PreviewArgs | undefined;

  const expectedRaw = payload.expectedSol ?? payload.expected_sol ?? args?.expected_sol;
  const expectedDisplay = expectedRaw !== undefined
    ? formatSolDisplay(expectedRaw, { fromLamports: true }) ?? formatSolDisplay(expectedRaw)
    : undefined;

  const warnings = Array.isArray(payload?.warnings)
    ? payload.warnings.filter((w: unknown): w is string => typeof w === "string" && w.length > 0)
    : [];

  const rows: ChatKitWidgetComponent[] = [];
  if (expectedDisplay) {
    rows.push({
      type: "Row",
      justify: "between",
      align: "center" as Alignment,
      children: [
        { type: "Caption", value: "Expected SOL", size: "xs" },
        { type: "Text", value: expectedDisplay, weight: "semibold", size: "sm" },
      ],
    });
  } else {
    rows.push({ type: "Text", value: "Preview did not return a quote.", size: "sm" });
  }

  const widgets: Card[] = [
    {
      type: "Card",
      id: "sell-preview-header",
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
                { type: "Title", value: "Sell Preview", size: "md" },
                item.timestamp ? { type: "Caption", value: item.timestamp, size: "xs" } : undefined,
              ].filter(Boolean) as ChatKitWidgetComponent[],
            },
            expectedDisplay
              ? { type: "Badge", label: expectedDisplay, color: "secondary", variant: "outline" } as any
              : undefined,
          ].filter(Boolean) as ChatKitWidgetComponent[],
        },
      ],
    },
    {
      type: "Card",
      id: "sell-preview-details",
      children: [{ type: "Col", gap: 8, children: rows }],
    },
  ];

  if (warnings.length) {
    widgets.push({
      type: "Card",
      id: "sell-preview-warnings",
      children: [
        { type: "Title", value: "Warnings", size: "sm" },
        {
          type: "Col",
          gap: 6,
          children: warnings.map((warn) => ({ type: "Text", value: warn, size: "sm" })) as ChatKitWidgetComponent[],
        },
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
            <pre className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-[#F7BE8A]/24 bg-[#16070C]/85 p-3 text-[11px] text-[#FFF2E2]">
              {JSON.stringify(rawOutput, null, 2)}
            </pre>
          )}
        </details>
      )}
    </div>
  );
};

export default solanaPreviewSellRenderer;
