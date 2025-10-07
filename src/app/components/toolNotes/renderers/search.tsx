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

type SearchResult = {
  id?: string;
  title?: string;
  url?: string;
  snippet?: string;
};

type SearchPayload = {
  results?: SearchResult[];
};

type SearchArgs = Record<string, unknown>;

const searchRenderer: ToolNoteRenderer = ({ item, isExpanded, onToggle, debug }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput) as SearchPayload | SearchResult[];
  const args = (item.data as any)?.arguments as SearchArgs | undefined;

  const results: SearchResult[] = Array.isArray(payload)
    ? payload as SearchResult[]
    : Array.isArray(payload?.results)
      ? payload.results!
      : [];

  const query = typeof args?.query === "string" ? args.query : undefined;

  const headerCard: Card = {
    type: "Card",
    id: "search-header",
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
              { type: "Title", value: "Dexter Search", size: "md" },
              item.timestamp ? { type: "Caption", value: item.timestamp, size: "xs" } : undefined,
            ].filter(Boolean) as ChatKitWidgetComponent[],
          },
          { type: "Badge", label: `${results.length} hit${results.length === 1 ? "" : "s"}`, color: "secondary", variant: "outline" } as Badge,
        ],
      },
    ],
  };

  const listItems: ListViewItem[] = results.map((result, index) => {
    const title = result.title?.trim() || `Result ${index + 1}`;
    const snippet = result.snippet?.trim();
    const url = result.url?.trim();

    const children: ChatKitWidgetComponent[] = [
      url
        ? {
            type: "Button",
            label: title,
            onClickAction: { type: "open_url", payload: { url } },
            variant: "outline",
            size: "sm",
          }
        : { type: "Text", value: title, size: "sm", weight: "semibold" },
    ];
    if (snippet) {
      children.push({ type: "Text", value: snippet, size: "sm" });
    }

    return {
      type: "ListViewItem",
      id: result.id ?? url ?? `result-${index}`,
      children,
    };
  });

  const widgets: Array<Card | ListView> = [headerCard];

  if (query) {
    widgets.push({
      type: "Card",
      id: "search-query",
      children: [
        {
          type: "Row",
          justify: "between",
          align: "center" as Alignment,
          children: [
            { type: "Caption", value: "Query", size: "xs" },
            { type: "Text", value: query, size: "sm" },
          ],
        },
      ],
    });
  }

  if (results.length) {
    widgets.push({ type: "ListView", id: "search-results", children: listItems });
  } else {
    widgets.push({
      type: "Card",
      id: "search-empty",
      children: [{ type: "Text", value: "No documents matched this query.", size: "sm" }],
    });
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

export default searchRenderer;
