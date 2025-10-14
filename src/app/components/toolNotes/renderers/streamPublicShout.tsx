import { formatDistanceToNowStrict } from "date-fns";
import type { ToolNoteRenderer } from "./types";
import { renderStructuredJson } from "./helpers";

function formatExpiry(expiresAt?: string | null) {
  if (!expiresAt) return null;
  try {
    return formatDistanceToNowStrict(new Date(expiresAt), { addSuffix: true });
  } catch {
    return null;
  }
}

const streamPublicShoutRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const structured = (item?.structuredContent ?? {}) as Record<string, any>;
  const shout = structured?.shout ?? structured;
  const alias = shout?.alias ?? null;
  const message = shout?.message ?? item?.content?.[0]?.text ?? null;
  const expires = formatExpiry(shout?.expires_at ?? shout?.expiresAt);

  const feed = Array.isArray(structured?.shouts) ? structured.shouts : null;

  if (feed) {
    return (
      <div className="flex flex-col gap-2">
        <div className="font-medium text-sm text-neutral-300">Recent stream shouts</div>
        <ul className="flex flex-col gap-2">
          {feed.map((entry: any) => (
            <li
              key={entry?.id || entry?.created_at || Math.random()}
              className="rounded-md border border-neutral-800/80 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-200"
            >
              {entry?.message || "—"}
              <div className="mt-1 text-xs text-neutral-500">
                {entry?.alias ? entry.alias : "Anonymous"}
                {entry?.expires_at ? ` · expires ${formatExpiry(entry.expires_at) ?? "soon"}` : null}
              </div>
            </li>
          ))}
        </ul>
        {debug ? (
          <details className="mt-2 text-xs text-neutral-500">
            <summary>Raw payload</summary>
            <pre className="mt-1 whitespace-pre-wrap break-all text-[11px] leading-tight">
              {JSON.stringify(structured, null, 2)}
            </pre>
          </details>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-md border border-neutral-800/80 bg-neutral-900/60 px-3 py-2">
        <div className="text-sm text-neutral-100">{message || "Shout submitted."}</div>
        <div className="mt-1 text-xs text-neutral-500">
          {alias ? `Alias: ${alias}` : "Alias: (auto-generated)"}
          {expires ? ` · expires ${expires}` : null}
        </div>
      </div>
      {debug ? renderStructuredJson(structured) : null}
    </div>
  );
};

export default streamPublicShoutRenderer;
