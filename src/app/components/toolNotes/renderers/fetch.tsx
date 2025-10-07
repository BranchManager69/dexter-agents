import type { ToolNoteRenderer } from "./types";
import { BASE_CARD_CLASS, normalizeOutput, unwrapStructured } from "./helpers";
import {
  ChatKitWidgetRenderer,
  type Card,
  type ChatKitWidgetComponent,
} from "../ChatKitWidgetRenderer";

type DocumentPayload = {
  title?: string;
  url?: string;
  text?: string;
};

const fetchRenderer: ToolNoteRenderer = ({ item, isExpanded, onToggle, debug }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const doc = unwrapStructured(rawOutput) as DocumentPayload;

  const title = doc.title?.trim() || "Document";
  const url = doc.url?.trim();
  const text = doc.text ?? "";
  const excerpt = text
    ? text
        .split(/\n+/)
        .filter(Boolean)
        .slice(0, 3)
        .join("\n")
    : null;

  const rows: ChatKitWidgetComponent[] = [
    { type: "Text", value: title, size: "sm", weight: "semibold" },
    excerpt ? { type: "Text", value: excerpt, size: "sm" } : { type: "Text", value: "No preview text available.", size: "sm" },
  ];

  const widgets: Card[] = [
    {
      type: "Card",
      id: "fetch-header",
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
                { type: "Title", value: "Dexter Document", size: "md" },
                item.timestamp ? { type: "Caption", value: item.timestamp, size: "xs" } : undefined,
              ].filter(Boolean) as ChatKitWidgetComponent[],
            },
            url
              ? {
                  type: "Button",
                  label: "Open",
                  onClickAction: { type: "open_url", payload: { url } },
                  variant: "outline",
                  size: "sm",
                }
              : undefined,
          ].filter(Boolean) as ChatKitWidgetComponent[],
        },
      ],
    },
    {
      type: "Card",
      id: "fetch-body",
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
              {text || JSON.stringify(rawOutput, null, 2)}
            </pre>
          )}
        </details>
      )}
    </div>
  );
};

export default fetchRenderer;
