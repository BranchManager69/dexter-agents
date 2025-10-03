import React from "react";
import Image from "next/image";
import type { TranscriptItem } from "@/app/types";

export interface ToolNoteRendererProps {
  item: TranscriptItem;
  isExpanded: boolean;
  onToggle: () => void;
  debug?: boolean;
}

export type ToolNoteRenderer = (props: ToolNoteRendererProps) => React.ReactNode;

function normalizeOutput(data: Record<string, any> | undefined) {
  if (!data) return undefined;
  if (data.output && typeof data.output === "object") return data.output;
  return data;
}

const pumpstreamRenderer: ToolNoteRenderer = ({ item, isExpanded, onToggle, debug }) => {
  const payload = normalizeOutput(item.data as Record<string, any> | undefined) || {};
  const streams = Array.isArray((payload as any).streams) ? (payload as any).streams : [];
  const generatedAt = typeof (payload as any).generatedAt === "string" ? (payload as any).generatedAt : null;
  const headline = streams.slice(0, 3);
  const remaining = streams.slice(3);

  const formatNumber = (value: unknown, options?: Intl.NumberFormatOptions) => {
    if (typeof value !== "number" && typeof value !== "bigint") return undefined;
    return new Intl.NumberFormat("en-US", options).format(Number(value));
  };

  const renderStreamCard = (stream: any) => {
    const title: string = stream?.name || stream?.symbol || stream?.mintId || "Stream";
    const viewers = formatNumber(stream?.currentViewers);
    const marketCap = formatNumber(stream?.marketCapUsd, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

    const inferredHref = typeof stream?.url === "string" && stream.url
      ? stream.url
      : typeof stream?.streamUrl === "string" && stream.streamUrl
        ? stream.streamUrl
        : typeof stream?.mintId === "string" && stream.mintId
          ? `https://pump.fun/${stream.mintId}`
          : undefined;

    const content = (
      <div className="w-full rounded-xl border border-neutral-800/60 bg-surface-glass/70 p-3 transition hover:border-flux/60">
        <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-neutral-900/60 bg-neutral-900/60">
          {typeof stream?.thumbnail === "string" && stream.thumbnail ? (
            <Image
              src={stream.thumbnail}
              alt={title}
              fill
              sizes="(min-width: 1024px) 12rem, 100vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-neutral-500">
              No thumbnail
            </div>
          )}
        </div>
        <div className="mt-3 text-sm font-medium text-neutral-100 truncate" title={title}>
          {title}
        </div>
        <div className="mt-1 text-xs text-neutral-400">
          {viewers ? `${viewers} watching` : "Viewer data pending"}
        </div>
        {marketCap && (
          <div className="text-xs text-neutral-500">MCAP {marketCap}</div>
        )}
      </div>
    );

    if (!inferredHref) {
      return (
        <div key={stream?.mintId || title} className="flex">
          {content}
        </div>
      );
    }

    return (
      <a
        key={inferredHref}
        href={inferredHref}
        target="_blank"
        rel="noreferrer"
        className="flex"
      >
        {content}
      </a>
    );
  };

  return (
    <div className="w-full max-w-xl rounded-2xl border border-neutral-800/60 bg-surface-glass/50 p-4 text-neutral-100 shadow-elevated">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="font-display text-sm uppercase tracking-[0.28em] text-neutral-400">
          Pump.fun Streams
        </div>
        {generatedAt && (
          <div className="text-[10px] text-neutral-500">{new Date(generatedAt).toLocaleTimeString()}</div>
        )}
      </div>
      {headline.length > 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {headline.map((stream: any) => renderStreamCard(stream))}
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-dashed border-neutral-800/60 px-4 py-6 text-center text-sm text-neutral-400">
          No live streams reported in the last response.
        </div>
      )}
      {remaining.length > 0 && (
        <div className="mt-4">
          {!isExpanded ? (
            <button
              type="button"
              onClick={onToggle}
              className="text-xs uppercase tracking-[0.24em] text-flux transition hover:text-flux/80"
            >
              Show {remaining.length} more
            </button>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {remaining.map((stream: any) => renderStreamCard(stream))}
              </div>
              <button
                type="button"
                onClick={onToggle}
                className="mt-3 text-xs uppercase tracking-[0.24em] text-neutral-400 transition hover:text-neutral-200"
              >
                Hide extra streams
              </button>
            </>
          )}
        </div>
      )}
      {debug && isExpanded && (
        <details className="mt-4 w-full" open>
          <summary className="cursor-pointer text-xs uppercase tracking-[0.2em] text-neutral-400">
            Raw payload
          </summary>
          <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-neutral-800/60 bg-surface-base/80 p-3 text-[11px] text-neutral-200">
            {JSON.stringify(payload, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
};

const TOOL_NOTE_RENDERERS: Record<string, ToolNoteRenderer> = {
  pumpstream_live_summary: pumpstreamRenderer,
};

export function getToolNoteRenderer(toolName?: string | null): ToolNoteRenderer | undefined {
  if (!toolName) return undefined;
  const key = toolName.trim().toLowerCase();
  return TOOL_NOTE_RENDERERS[key];
}
