import Image from "next/image";

import type { ToolNoteRenderer } from "./types";
import {
  BASE_CARD_CLASS,
  SECTION_TITLE_CLASS,
  countCompactFormatter,
  formatUsd,
  normalizeOutput,
} from "./helpers";

const pumpstreamRenderer: ToolNoteRenderer = ({ item, isExpanded, onToggle, debug }) => {
  const payload = normalizeOutput(item.data as Record<string, any> | undefined) || {};
  const streams = Array.isArray((payload as any).streams) ? (payload as any).streams : [];
  const generatedAt = typeof (payload as any).generatedAt === "string" ? (payload as any).generatedAt : null;
  const headline = streams.slice(0, 3);
  const remaining = streams.slice(3);

  const renderStreamCard = (stream: any, index: number) => {
    const title: string = stream?.name || stream?.symbol || stream?.mintId || stream?.channel || `Stream ${index + 1}`;
    const viewersRaw = stream?.currentViewers ?? stream?.viewer_count ?? stream?.viewers;
    const marketCap = formatUsd(stream?.marketCapUsd ?? stream?.market_cap_usd ?? stream?.marketCap, { precise: false });
    const momentum = stream?.momentum ?? stream?.signal;
    const momentumLabel = typeof momentum === "number"
      ? `${momentum >= 0 ? "+" : ""}${momentum.toFixed(2)}%`
      : typeof momentum === "string"
        ? momentum
        : undefined;

    const inferredHref = typeof stream?.url === "string" && stream.url
      ? stream.url
      : typeof stream?.streamUrl === "string" && stream.streamUrl
        ? stream.streamUrl
        : typeof stream?.mintId === "string" && stream.mintId
          ? `https://pump.fun/${stream.mintId}`
          : undefined;

    const card = (
      <div className="flex h-full flex-col gap-3 rounded-xl border border-neutral-800/40 bg-surface-glass/40 p-3">
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-neutral-900/60">
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
              Preview unavailable
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <div className="text-sm font-semibold text-neutral-100" title={title}>
            {title}
          </div>
          <div className="text-xs text-neutral-400">
            {typeof viewersRaw === "number"
              ? `${countCompactFormatter.format(viewersRaw)} watching`
              : viewersRaw
                ? String(viewersRaw)
                : "Viewer data pending"}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-neutral-500">
            {marketCap && <span>MCAP {marketCap}</span>}
            {momentumLabel && <span className="rounded-full border border-neutral-700 px-2 py-[1px] text-[10px] text-neutral-200">Momentum {momentumLabel}</span>}
          </div>
        </div>
      </div>
    );

    if (!inferredHref) {
      return (
        <div key={stream?.mintId || title} className="h-full">
          {card}
        </div>
      );
    }

    return (
      <a
        key={inferredHref}
        href={inferredHref}
        target="_blank"
        rel="noreferrer"
        className="h-full transition hover:border-flux/50"
      >
        {card}
      </a>
    );
  };

  return (
    <div className={BASE_CARD_CLASS}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className={SECTION_TITLE_CLASS}>Pump.fun Streams</div>
          {generatedAt && (
            <div className="text-xs text-neutral-500">Updated {new Date(generatedAt).toLocaleTimeString()}</div>
          )}
        </div>
        {streams.length > 0 && (
          <div className="rounded-full border border-neutral-700 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-neutral-300">
            {streams.length} live
          </div>
        )}
      </div>

      {headline.length > 0 ? (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {headline.map((stream: any, index: number) => renderStreamCard(stream, index))}
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
              <div className="grid gap-3 md:grid-cols-2">
                {remaining.map((stream: any, index: number) => renderStreamCard(stream, index + headline.length))}
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

export default pumpstreamRenderer;
