import type { ToolNoteRenderer } from "./types";
import { BASE_CARD_CLASS, normalizeOutput, unwrapStructured } from "./helpers";
import {
  ChatKitWidgetRenderer,
  type Badge,
  type Card,
  type ChatKitWidgetComponent,
} from "../ChatKitWidgetRenderer";

type Alignment = "start" | "center" | "end" | "stretch";

type CodexPayload = {
  conversationId?: string;
  response?: {
    text?: string;
    reasoning?: string;
  };
  session?: {
    model?: string;
    reasoningEffort?: string;
  };
  durationMs?: number;
  tokenUsage?: Record<string, unknown>;
};

type CodexArgs = Record<string, unknown>;

type CodexKind = "start" | "reply" | "exec";

function createCodexRenderer(kind: CodexKind): ToolNoteRenderer {
  const badgeLabel = kind === "start" ? "Session started" : kind === "reply" ? "Reply sent" : "Exec run";
  const title = kind === "exec" ? "Codex Exec" : "Codex Session";

  const CodexRenderer: ToolNoteRenderer = ({ item, isExpanded, onToggle, debug }) => {
    const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
    const structured = unwrapStructured(rawOutput) as CodexPayload;
    const args = (item.data as any)?.arguments as CodexArgs | undefined;

    const conversationId = structured.conversationId ?? (typeof args?.conversation_id === "string" ? args.conversation_id : undefined);
    const message = structured.response?.text;
    const reasoning = structured.response?.reasoning;
    const model = structured.session?.model;
    const reasoningEffort = structured.session?.reasoningEffort;
    const durationMs = typeof structured.durationMs === "number" ? structured.durationMs : undefined;
    const tokenUsage = structured.tokenUsage;

    const infoRows: ChatKitWidgetComponent[] = [];
    if (conversationId) {
      infoRows.push(buildRow("Conversation", conversationId));
    }
    if (model) {
      infoRows.push(buildRow("Model", model));
    }
    if (reasoningEffort) {
      infoRows.push(buildRow("Effort", reasoningEffort));
    }
    if (durationMs !== undefined) {
      infoRows.push(buildRow("Duration", `${(durationMs / 1000).toFixed(2)}s`));
    }

    const widgets: Card[] = [
      {
        type: "Card",
        id: `codex-${kind}-header`,
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
                  { type: "Title", value: title, size: "md" },
                  item.timestamp ? { type: "Caption", value: item.timestamp, size: "xs" } : undefined,
                ].filter(Boolean) as ChatKitWidgetComponent[],
              },
              { type: "Badge", label: badgeLabel, color: "secondary", variant: "outline" } as Badge,
            ],
          },
        ],
      },
      {
        type: "Card",
        id: `codex-${kind}-summary`,
        children: [{ type: "Col", gap: 8, children: infoRows.length ? infoRows : [{ type: "Text", value: "No session metadata.", size: "sm" }] }],
      },
    ];

    if (message) {
      widgets.push({
        type: "Card",
        id: `codex-${kind}-message`,
        children: [
          { type: "Title", value: "Message", size: "sm" },
          { type: "Text", value: message, size: "sm" },
        ],
      });
    }

    if (reasoning) {
      widgets.push({
        type: "Card",
        id: `codex-${kind}-reasoning`,
        children: [
          { type: "Title", value: "Reasoning trail", size: "sm" },
          { type: "Text", value: reasoning, size: "sm" },
        ],
      });
    }

    if (tokenUsage) {
      widgets.push({
        type: "Card",
        id: `codex-${kind}-tokens`,
        children: [
          { type: "Title", value: "Token usage", size: "sm" },
          { type: "Text", value: JSON.stringify(tokenUsage, null, 2), size: "sm" },
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

  return CodexRenderer;
}

function buildRow(label: string, value: string): ChatKitWidgetComponent {
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

export const codexStartRenderer = createCodexRenderer("start");
export const codexReplyRenderer = createCodexRenderer("reply");
export const codexExecRenderer = createCodexRenderer("exec");
