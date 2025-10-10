import React from "react";

import type { ToolNoteRenderer } from "./types";
import { BASE_CARD_CLASS, normalizeOutput, unwrapStructured, formatTimestampDisplay } from "./helpers";
import { MetricPill, TokenIcon } from "./solanaVisuals";

type TwitterAuthor = {
  handle?: string | null;
  display_name?: string | null;
  profile_url?: string | null;
  avatar_url?: string | null;
  banner_image_url?: string | null;
  followers?: number | null;
  following?: number | null;
  is_verified?: boolean | null;
  bio?: string | null;
  location?: string | null;
  join_date?: string | null;
  website?: string | null;
};

type TwitterStats = {
  likes?: number | null;
  retweets?: number | null;
  replies?: number | null;
  views?: number | null;
};

type TwitterMedia = {
  has_media?: boolean;
  photos?: string[];
  videos?: string[];
};

type TwitterTweet = {
  id?: string;
  url?: string | null;
  timestamp?: string | null;
  text?: string | null;
  is_reply?: boolean;
  source_queries?: string[];
  author?: TwitterAuthor;
  stats?: TwitterStats;
  media?: TwitterMedia;
};

type TwitterSearchPayload = {
  query?: string | null;
  queries?: string[];
  ticker?: string | null;
  language?: string | null;
  include_replies?: boolean;
  media_only?: boolean;
  verified_only?: boolean;
  fetched?: number;
  tweets?: TwitterTweet[];
  searches?: Array<{ query: string; fetched: number; limit: number }>;
};

const compactNumber = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

function formatNumber(value: unknown) {
  if (typeof value !== "number") return undefined;
  if (!Number.isFinite(value)) return undefined;
  if (value === 0) return "0";
  return compactNumber.format(value);
}

function formatRelativeTime(timestamp?: string | null) {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return null;
  const diff = date.getTime() - Date.now();
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const divisions: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 1000 * 60 * 60 * 24 * 365],
    ["month", 1000 * 60 * 60 * 24 * 30],
    ["week", 1000 * 60 * 60 * 24 * 7],
    ["day", 1000 * 60 * 60 * 24],
    ["hour", 1000 * 60 * 60],
    ["minute", 1000 * 60],
    ["second", 1000],
  ];

  for (const [unit, ms] of divisions) {
    if (Math.abs(diff) >= ms || unit === "second") {
      const value = Math.round(diff / ms);
      return rtf.format(value, unit);
    }
  }
  return null;
}

function resolvePrimaryQuery(payload: TwitterSearchPayload) {
  if (payload.ticker) return `$${payload.ticker}`;
  if (payload.query) return payload.query;
  if (payload.queries && payload.queries.length === 1) return payload.queries[0];
  return null;
}

function ensureTweetUrl(tweet: TwitterTweet) {
  if (tweet.url && tweet.url.trim().length > 0) return tweet.url.trim();
  if (tweet.author?.handle && tweet.id) {
    return `https://x.com/${tweet.author.handle}/status/${tweet.id}`;
  }
  if (tweet.id) {
    return `https://x.com/i/web/status/${tweet.id}`;
  }
  return null;
}

const twitterSearchRenderer: ToolNoteRenderer = ({ item, isExpanded, onToggle, debug = false }) => {
  const normalized = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(normalized) as TwitterSearchPayload;

  const tweets = Array.isArray(payload?.tweets) ? payload.tweets : [];
  const visibleTweets = isExpanded ? tweets : tweets.slice(0, 5);
  const hasMore = tweets.length > visibleTweets.length;

  const primaryQuery = resolvePrimaryQuery(payload);
  const secondaryQueries =
    payload.queries && payload.queries.length > 1 ? payload.queries.filter((q) => q !== primaryQuery) : [];

  const filters: string[] = [];
  if (payload.include_replies === false) filters.push("Replies off");
  if (payload.media_only) filters.push("Media only");
  if (payload.verified_only) filters.push("Verified only");
  if (payload.language) filters.push(`Lang ${payload.language.toUpperCase()}`);

  const tweetCount = typeof payload.fetched === "number" ? payload.fetched : tweets.length;

  const timestamp = formatTimestampDisplay(item.timestamp);

  return (
    <div className={BASE_CARD_CLASS}>
      <section className="flex flex-col gap-7">
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-[0.26em] text-sky-600">Twitter Search</span>
            {primaryQuery && <span className="text-sm text-slate-500">Focus · {primaryQuery}</span>}
            {!primaryQuery && payload.queries && payload.queries.length > 0 && (
              <span className="text-xs text-slate-400">{payload.queries.join(" · ")}</span>
            )}
            {timestamp && <span className="text-xs text-slate-400">{timestamp}</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            <MetricPill label="Tweets" value={`${tweetCount}`} tone={tweetCount ? "positive" : "neutral"} />
            {secondaryQueries.length > 0 && <MetricPill label="Variations" value={`${secondaryQueries.length}`} />}
            {filters.length > 0 && <MetricPill label="Filters" value={filters.join(" · ")} tone="notice" />}
          </div>
        </header>

        {secondaryQueries.length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-slate-400">
            {secondaryQueries.map((query) => (
              <span key={query} className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-500">
                {query}
              </span>
            ))}
          </div>
        )}

        <div className="twitter-timeline relative flex flex-col gap-7">
          <div className="twitter-timeline__track" aria-hidden />
          {visibleTweets.map((tweet, index) => {
            const authorName = tweet.author?.display_name?.trim() || tweet.author?.handle || "Unknown";
            const handle = tweet.author?.handle ? `@${tweet.author.handle}` : null;
            const avatar = tweet.author?.avatar_url ?? tweet.author?.banner_image_url ?? null;
            const isVerified = tweet.author?.is_verified === true;
            const tweetUrl = ensureTweetUrl(tweet);
            const timestamp = tweet.timestamp ? new Date(tweet.timestamp) : null;
            const relativeTime = formatRelativeTime(tweet.timestamp);
            const stats = tweet.stats ?? {};
            const imageMedia = Array.isArray(tweet.media?.photos) ? tweet.media?.photos : [];
            const videoMedia = Array.isArray(tweet.media?.videos) ? tweet.media?.videos : [];

            const statItems: Array<{ label: string; value?: string }> = [
              { label: "Likes", value: formatNumber(stats.likes ?? undefined) },
              { label: "Reposts", value: formatNumber(stats.retweets ?? undefined) },
              { label: "Replies", value: formatNumber(stats.replies ?? undefined) },
              { label: "Views", value: formatNumber(stats.views ?? undefined) },
            ].filter((item) => item.value && item.value !== "0");

            const sourceQueries = Array.isArray(tweet.source_queries) ? tweet.source_queries : [];

            const body = (
              <article className="relative flex flex-col gap-3 rounded-3xl border border-slate-200/70 p-5 shadow-[0_18px_28px_rgba(15,23,42,0.08)] transition hover:border-slate-300 hover:shadow-[0_22px_38px_rgba(15,23,42,0.12)]">
                <span className="twitter-timeline__node" aria-hidden />

                <header className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-slate-100">
                    {avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatar} alt={authorName} className="h-full w-full object-cover" />
                    ) : (
                      <TokenIcon label={authorName} size={48} />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">{authorName}</span>
                      {isVerified && (
                        <span className="text-xs text-sky-500">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2 9.19 4.81 5 4.99l.19 4.18L2 12l3.19 2.83L5 19l4.19-.19L12 22l2.83-3.19L19 19l-.19-4.17L22 12l-3.19-2.83L19 5l-4.17-.19L12 2Zm-1 13.17-3.59-3.59L8 10l3 3 5-5 1.41 1.41-6.41 6.76Z" />
                          </svg>
                        </span>
                      )}
                      {handle && <span className="text-xs text-slate-400">{handle}</span>}
                      {tweet.is_reply && (
                        <span className="rounded-full border border-slate-200 px-2 py-[2px] text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Reply
                        </span>
                      )}
                    </div>
                    {relativeTime && (
                      <span className="text-xs text-slate-400" title={timestamp?.toLocaleString()}>
                        {relativeTime}
                      </span>
                    )}
                  </div>
                </header>

                {tweet.text && (
                  <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{tweet.text.trim()}</p>
                )}

                {statItems.length > 0 && (
                  <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-slate-400">
                    {statItems.map((item) => (
                      <span key={item.label} className="inline-flex items-center gap-1 font-semibold text-slate-500">
                        <span>{item.label}</span>
                        <span className="text-slate-900">{item.value}</span>
                      </span>
                    ))}
                  </div>
                )}

                {(imageMedia.length > 0 || videoMedia.length > 0) && (
                  <div className={`grid gap-3 ${imageMedia.length + videoMedia.length > 1 ? "grid-cols-2" : ""}`}>
                    {imageMedia.slice(0, 4).map((url, mediaIndex) => (
                      <div
                        key={`${tweet.id}-img-${mediaIndex}`}
                        className="relative overflow-hidden rounded-2xl bg-slate-100 shadow-[0_12px_22px_rgba(15,23,42,0.12)]"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="Tweet media" className="h-full w-full object-cover" />
                      </div>
                    ))}
                    {videoMedia.slice(0, 2).map((url, mediaIndex) => (
                      <div
                        key={`${tweet.id}-vid-${mediaIndex}`}
                        className="relative overflow-hidden rounded-2xl bg-black shadow-[0_12px_22px_rgba(15,23,42,0.12)]"
                      >
                        <video className="h-full w-full" controls preload="metadata">
                          <source src={url} />
                        </video>
                      </div>
                    ))}
                  </div>
                )}

                {sourceQueries.length > 0 && (
                  <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.22em] text-slate-400">
                    {sourceQueries.map((source) => (
                      <span key={source} className="rounded-full border border-slate-200 px-2 py-1 text-slate-500">
                        {source}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            );

            return tweetUrl ? (
              <a
                key={tweet.id ?? index}
                href={tweetUrl}
                target="_blank"
                rel="noreferrer"
                className="twitter-timeline__item group relative flex flex-col gap-3 pl-8 sm:pl-12"
              >
                {body}
              </a>
            ) : (
              <div key={tweet.id ?? index} className="twitter-timeline__item relative flex flex-col gap-3 pl-8 sm:pl-12">
                {body}
              </div>
            );
          })}

          {visibleTweets.length === 0 && (
            <p className="pl-8 text-sm text-slate-500 sm:pl-12">No tweets were captured for this search.</p>
          )}
        </div>

        {hasMore && (
          <button
            type="button"
            onClick={onToggle}
            className="self-start rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
          >
            {isExpanded ? "Collapse" : `Show ${tweets.length - visibleTweets.length} more`}
          </button>
        )}
      </section>

      {debug && (
        <details className="mt-4 max-w-2xl text-sm text-slate-700" open>
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Raw twitter payload
          </summary>
          <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-slate-200/70 bg-white/80 p-3 text-xs">
            {JSON.stringify(payload ?? normalized, null, 2)}
          </pre>
        </details>
      )}

      <style jsx>{`
        .twitter-timeline__track {
          position: absolute;
          left: 22px;
          top: 12px;
          bottom: 12px;
          width: 2px;
          border-radius: 9999px;
          background: linear-gradient(180deg, rgba(56, 189, 248, 0.25), rgba(59, 130, 246, 0.28), rgba(236, 72, 153, 0.3));
          animation: twitterPulse 8s ease-in-out infinite;
        }
        .twitter-timeline__item {
          position: relative;
        }
        .twitter-timeline__node {
          position: absolute;
          left: -32px;
          top: 24px;
          width: 12px;
          height: 12px;
          border-radius: 9999px;
          background: linear-gradient(135deg, #38bdf8, #6366f1);
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.12), 0 10px 22px rgba(15, 23, 42, 0.25);
          transition: transform 0.35s ease, box-shadow 0.35s ease;
        }
        .twitter-timeline__item:hover .twitter-timeline__node,
        .twitter-timeline__item:focus .twitter-timeline__node {
          transform: scale(1.08);
          box-shadow: 0 0 0 6px rgba(99, 102, 241, 0.2), 0 14px 28px rgba(15, 23, 42, 0.3);
        }
        @keyframes twitterPulse {
          0% {
            opacity: 0.6;
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0.6;
          }
        }
        @media (max-width: 640px) {
          .twitter-timeline__track {
            left: 16px;
          }
          .twitter-timeline__node {
            left: -24px;
          }
        }
      `}</style>
    </div>
  );
};

export default twitterSearchRenderer;
