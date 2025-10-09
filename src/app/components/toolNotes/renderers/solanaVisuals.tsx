import React from "react";

import { HashBadge } from "./helpers";

type TokenAccent = "from" | "to" | "neutral";

interface TokenIconProps {
  label: string;
  accent?: TokenAccent;
  imageUrl?: string;
  size?: number;
  className?: string;
}

const ACCENT_GRADIENTS: Record<TokenAccent, string> = {
  from: "linear-gradient(135deg,#0ea5e9,#6366f1)",
  to: "linear-gradient(135deg,#a855f7,#ec4899)",
  neutral: "linear-gradient(135deg,#1e293b,#64748b)",
};

function computeInitials(label: string) {
  const cleaned = label.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (cleaned.length >= 2) return cleaned.slice(0, 2);
  if (cleaned.length === 1) return `${cleaned}•`;
  return "••";
}

export function TokenIcon({ label, accent = "neutral", imageUrl, size = 48, className }: TokenIconProps) {
  const initials = computeInitials(label);
  const style: React.CSSProperties = imageUrl
    ? {
        backgroundImage: `url(${imageUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : {
        background: ACCENT_GRADIENTS[accent],
        color: "#fff",
      };

  return (
    <span
      className={`flex items-center justify-center rounded-[1.5rem] font-semibold tracking-[0.14em] uppercase text-[11px] text-white shadow-[0_12px_24px_rgba(15,23,42,0.18)] ${className ?? ""}`}
      style={{ width: size, height: size, ...style }}
    >
      {!imageUrl && <span>{initials}</span>}
    </span>
  );
}

interface MetricPillProps {
  label?: string;
  value: string;
  tone?: "neutral" | "positive" | "negative" | "notice";
}

const TONE_STYLES: Record<NonNullable<MetricPillProps["tone"]>, string> = {
  neutral: "border-slate-200 text-slate-600",
  positive: "border-emerald-200 text-emerald-600",
  negative: "border-rose-200 text-rose-600",
  notice: "border-indigo-200 text-indigo-600",
};

export function MetricPill({ label, value, tone = "neutral" }: MetricPillProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${TONE_STYLES[tone] ?? TONE_STYLES.neutral}`}
    >
      {label && <span className="text-[0.58rem] uppercase tracking-[0.28em] text-slate-300">{label}</span>}
      <span>{value}</span>
    </span>
  );
}

export function LinkPill({ value, href }: { value: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
    >
      {value}
    </a>
  );
}

export type TokenSide = {
  heading: string;
  amount?: string;
  asset?: string;
  mintAddress?: string;
  explorerUrl?: string;
  imageUrl?: string;
  accent?: TokenAccent;
};

interface TokenBadgeProps {
  side: TokenSide;
  size?: number;
  compact?: boolean;
}

export function TokenBadge({ side, size = 48, compact = false }: TokenBadgeProps) {
  return (
    <div className={`group flex items-center gap-3 ${compact ? "text-sm" : ""}`}>
      <TokenIcon label={side.asset ?? side.heading ?? "TOKEN"} accent={side.accent} imageUrl={side.imageUrl} size={size} />
      <div className="flex min-w-[120px] flex-col">
        <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{side.heading}</span>
        {side.amount && (
          <span className="text-lg font-semibold text-slate-900">
            {side.amount} {side.asset && <span className="text-sm font-medium text-slate-500">{side.asset}</span>}
          </span>
        )}
        {!side.amount && side.asset && <span className="text-lg font-semibold text-slate-900">{side.asset}</span>}
        {side.mintAddress && (
          <HashBadge value={side.mintAddress} href={side.explorerUrl} ariaLabel={`${side.asset ?? "Token"} mint`} />
        )}
      </div>
    </div>
  );
}

interface TokenFlowProps {
  from: TokenSide;
  to: TokenSide;
  animate?: boolean;
}

export function TokenFlow({ from, to, animate = false }: TokenFlowProps) {
  return (
    <div className="relative mt-2 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
      <TokenBadge side={{ ...from, accent: from.accent ?? "from" }} />

      {animate ? (
        <div className="swap-animation relative flex h-18 w-36 items-center justify-center">
          <div className="swap-animation__track absolute inset-0">
            <div className="swap-animation__token swap-animation__token--from">
              <TokenIcon label={from.asset ?? from.heading ?? "TOKEN"} accent="from" imageUrl={from.imageUrl} size={44} />
            </div>
            <div className="swap-animation__token swap-animation__token--to">
              <TokenIcon label={to.asset ?? to.heading ?? "TOKEN"} accent="to" imageUrl={to.imageUrl} size={44} />
            </div>
          </div>
          <div className="swap-animation__arrow relative z-10 flex h-11 w-11 items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M5 12.75h10.19l-2.72 2.72a.75.75 0 1 0 1.06 1.06l4.25-4.25a.75.75 0 0 0 0-1.06l-4.25-4.25a.75.75 0 0 0-1.06 1.06l2.72 2.72H5a.75.75 0 0 0 0 1.5Z"
              />
            </svg>
          </div>
        </div>
      ) : (
        <div className="flex h-11 w-11 items-center justify-center text-slate-400">
          <svg width="24" height="24" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M5 12.75h10.19l-2.72 2.72a.75.75 0 1 0 1.06 1.06l4.25-4.25a.75.75 0 0 0 0-1.06l-4.25-4.25a.75.75 0 0 0-1.06 1.06l2.72 2.72H5a.75.75 0 0 0 0 1.5Z"
            />
          </svg>
        </div>
      )}

      <TokenBadge side={{ ...to, accent: to.accent ?? "to" }} />

      {animate && (
        <style jsx>{`
          .swap-animation {
            width: 160px;
            height: 80px;
          }
          .swap-animation__track {
            pointer-events: none;
          }
          .swap-animation__token {
            position: absolute;
            top: 50%;
            margin-top: -22px;
            filter: drop-shadow(0 12px 22px rgba(15, 23, 42, 0.2));
            opacity: 0;
          }
          .swap-animation__token--from {
            animation: swapSlideFrom 8s ease-in-out infinite alternate;
          }
          .swap-animation__token--to {
            animation: swapSlideTo 8s ease-in-out infinite alternate;
          }
          .swap-animation__arrow svg {
            width: 26px;
            height: 26px;
            color: #1e293b;
            filter: drop-shadow(0 6px 12px rgba(15, 23, 42, 0.15));
            animation: swapFlip 8s ease-in-out infinite alternate;
          }
          @keyframes swapSlideFrom {
            0% {
              transform: translateX(-70px) scale(0.9);
              opacity: 0;
            }
            15% {
              opacity: 0.8;
            }
            40% {
              transform: translateX(-18px) scale(1.02);
              opacity: 1;
            }
            50% {
              transform: translateX(0px) scale(0.88);
              opacity: 0.2;
            }
            100% {
              transform: translateX(70px) scale(0.9);
              opacity: 0;
            }
          }
          @keyframes swapSlideTo {
            0% {
              transform: translateX(70px) scale(0.9);
              opacity: 0;
            }
            15% {
              opacity: 0.8;
            }
            40% {
              transform: translateX(18px) scale(1.02);
              opacity: 1;
            }
            50% {
              transform: translateX(0px) scale(0.88);
              opacity: 0.2;
            }
            100% {
              transform: translateX(-70px) scale(0.9);
              opacity: 0;
            }
          }
          @keyframes swapFlip {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(180deg);
            }
          }
        `}</style>
      )}
    </div>
  );
}
