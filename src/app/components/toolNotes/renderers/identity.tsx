"use client";

import React from "react";
import { 
  PersonIcon, 
  StarFilledIcon,
  CheckCircledIcon,
  CrossCircledIcon,
  IdCardIcon,
} from "@radix-ui/react-icons";
import type { ToolNoteRenderer } from "./types";
import { normalizeOutput, unwrapStructured, formatTimestampDisplay } from "./helpers";
import { 
  SleekCard, 
  SleekLabel, 
  MetricItem,
  SleekLoadingCard,
  SleekErrorCard,
  SleekHash,
} from "./sleekVisuals";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type IdentityPayload = {
  hasIdentity?: boolean;
  has_identity?: boolean;
  identity?: {
    id?: string;
    name?: string;
    chainId?: string;
    chain_id?: string;
    tokenId?: string;
    token_id?: string;
    owner?: string;
    imageUrl?: string;
    image_url?: string;
    status?: "active" | "pending" | "expired";
    createdAt?: string;
    created_at?: string;
    expiresAt?: string;
    expires_at?: string;
    metadata?: Record<string, unknown>;
  };
  user_id?: string;
  userId?: string;
  stats?: {
    totalIdentities?: number;
    total_identities?: number;
    activeIdentities?: number;
    active_identities?: number;
    totalMints?: number;
    total_mints?: number;
  };
  error?: string;
};

type ReputationPayload = {
  agentId?: string;
  agent_id?: string;
  agentName?: string;
  agent_name?: string;
  score?: number;
  totalRatings?: number;
  total_ratings?: number;
  averageRating?: number;
  average_rating?: number;
  rank?: number;
  percentile?: number;
  badges?: string[];
  recentFeedback?: Array<{
    rating?: number;
    comment?: string;
    createdAt?: string;
    created_at?: string;
  }>;
  recent_feedback?: Array<{
    rating?: number;
    comment?: string;
    createdAt?: string;
    created_at?: string;
  }>;
  leaderboard?: Array<{
    rank?: number;
    agentId?: string;
    agent_id?: string;
    agentName?: string;
    agent_name?: string;
    score?: number;
  }>;
  error?: string;
};

type FeedbackPayload = {
  id?: string;
  feedbackId?: string;
  feedback_id?: string;
  status?: "submitted" | "received" | "acknowledged" | "resolved";
  type?: "bug" | "feature" | "general" | "praise" | "complaint";
  message?: string;
  category?: string;
  submittedAt?: string;
  submitted_at?: string;
  ticketUrl?: string;
  ticket_url?: string;
  referenceId?: string;
  reference_id?: string;
  error?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getStatusColor(status?: string): string {
  switch (status) {
    case "active": return "text-emerald-400";
    case "pending": return "text-amber-400";
    case "expired": return "text-neutral-500";
    default: return "text-neutral-400";
  }
}

function getStatusBg(status?: string): string {
  switch (status) {
    case "active": return "bg-emerald-500/10 border-emerald-500/20";
    case "pending": return "bg-amber-500/10 border-amber-500/20";
    case "expired": return "bg-neutral-500/10 border-neutral-500/20";
    default: return "bg-neutral-500/10 border-neutral-500/20";
  }
}

function formatRating(rating?: number): string {
  if (rating === undefined || !Number.isFinite(rating)) return "—";
  return rating.toFixed(1);
}

function renderStars(rating?: number): React.ReactNode {
  if (rating === undefined || !Number.isFinite(rating)) return null;
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;
  const stars = [];
  
  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push(<StarFilledIcon key={i} className="w-4 h-4 text-amber-400" />);
    } else if (i === fullStars && hasHalf) {
      stars.push(<StarFilledIcon key={i} className="w-4 h-4 text-amber-400/50" />);
    } else {
      stars.push(<StarFilledIcon key={i} className="w-4 h-4 text-neutral-700" />);
    }
  }
  
  return <div className="flex gap-0.5">{stars}</div>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Identity Status Renderer (check_identity, get_my_identity, mint_identity, get_identity_stats)
// ─────────────────────────────────────────────────────────────────────────────

const identityStatusRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput) as IdentityPayload;
  const timestamp = formatTimestampDisplay(item.timestamp);

  if (item.status === "IN_PROGRESS") return <SleekLoadingCard />;
  
  if (payload.error) {
    return <SleekErrorCard message={payload.error} />;
  }

  const hasIdentity = payload.hasIdentity ?? payload.has_identity;
  const identity = payload.identity;
  const stats = payload.stats;

  // Stats view (get_identity_stats)
  if (stats) {
    const total = stats.totalIdentities ?? stats.total_identities ?? 0;
    const active = stats.activeIdentities ?? stats.active_identities ?? 0;
    const mints = stats.totalMints ?? stats.total_mints ?? 0;

    return (
      <SleekCard className="p-6 flex flex-col gap-4">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IdCardIcon className="w-4 h-4 text-violet-400" />
            <SleekLabel>Identity Network Stats</SleekLabel>
          </div>
          {timestamp && <span className="text-[10px] text-neutral-600 font-mono">{timestamp}</span>}
        </header>

        <div className="grid grid-cols-3 gap-3">
          <MetricItem label="TOTAL" value={total.toLocaleString()} />
          <MetricItem label="ACTIVE" value={active.toLocaleString()} />
          <MetricItem label="MINTS" value={mints.toLocaleString()} />
        </div>
      </SleekCard>
    );
  }

  // No identity
  if (hasIdentity === false && !identity) {
    return (
      <SleekCard className="p-6 flex flex-col gap-4">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IdCardIcon className="w-4 h-4 text-violet-400" />
            <SleekLabel>Identity Status</SleekLabel>
          </div>
        </header>
        <div className="flex items-center gap-3 p-4 rounded-sm bg-neutral-500/10 border border-neutral-500/20">
          <CrossCircledIcon className="w-5 h-5 text-neutral-400" />
          <span className="text-sm text-neutral-400">No ERC-8004 identity found</span>
        </div>
      </SleekCard>
    );
  }

  // Identity details
  const name = identity?.name;
  const status = identity?.status;
  const chainId = identity?.chainId ?? identity?.chain_id;
  const tokenId = identity?.tokenId ?? identity?.token_id;
  const owner = identity?.owner;
  const imageUrl = identity?.imageUrl ?? identity?.image_url;
  const createdAt = identity?.createdAt ?? identity?.created_at;
  const expiresAt = identity?.expiresAt ?? identity?.expires_at;

  return (
    <SleekCard className="p-6 flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IdCardIcon className="w-4 h-4 text-violet-400" />
          <SleekLabel>Identity Status</SleekLabel>
        </div>
        {status && (
          <span className={`px-2 py-0.5 rounded-sm text-[9px] uppercase font-bold border ${getStatusBg(status)} ${getStatusColor(status)}`}>
            {status}
          </span>
        )}
      </header>

      {/* Identity Card */}
      <div className="flex items-start gap-4">
        {imageUrl ? (
          <img src={imageUrl} alt={name || "Identity"} className="w-16 h-16 rounded-sm object-cover border border-white/10" />
        ) : (
          <div className="w-16 h-16 rounded-sm bg-violet-500/20 flex items-center justify-center border border-violet-500/30">
            <PersonIcon className="w-8 h-8 text-violet-400" />
          </div>
        )}
        <div className="flex-1">
          <div className="text-lg font-bold text-white">{name || "Unnamed Identity"}</div>
          {chainId && <div className="text-xs text-neutral-500">Chain: {chainId}</div>}
          {tokenId && <div className="text-xs text-neutral-500">Token: #{tokenId}</div>}
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-3">
        {owner && (
          <div className="col-span-2">
            <SleekLabel>Owner</SleekLabel>
            <div className="mt-1">
              <SleekHash value={owner} label="Owner" truncate />
            </div>
          </div>
        )}
        {createdAt && <MetricItem label="CREATED" value={formatTimestampDisplay(createdAt) || "—"} />}
        {expiresAt && <MetricItem label="EXPIRES" value={formatTimestampDisplay(expiresAt) || "—"} />}
      </div>

      {debug && (
        <details className="mt-2 border border-white/5 bg-black/50 p-4 rounded-sm text-xs text-neutral-500 font-mono">
          <summary className="cursor-pointer hover:text-white transition-colors">Raw Payload</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(rawOutput, null, 2)}</pre>
        </details>
      )}
    </SleekCard>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Reputation Renderer (get_agent_reputation, get_reputation_leaderboard)
// ─────────────────────────────────────────────────────────────────────────────

const reputationRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput) as ReputationPayload;
  const timestamp = formatTimestampDisplay(item.timestamp);

  if (item.status === "IN_PROGRESS") return <SleekLoadingCard />;
  
  if (payload.error) {
    return <SleekErrorCard message={payload.error} />;
  }

  // Leaderboard view
  if (payload.leaderboard && payload.leaderboard.length > 0) {
    return (
      <SleekCard className="p-6 flex flex-col gap-4">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StarFilledIcon className="w-4 h-4 text-amber-400" />
            <SleekLabel>Reputation Leaderboard</SleekLabel>
          </div>
          {timestamp && <span className="text-[10px] text-neutral-600 font-mono">{timestamp}</span>}
        </header>

        <div className="flex flex-col gap-2">
          {payload.leaderboard.slice(0, 10).map((entry, idx) => (
            <div
              key={entry.agentId ?? entry.agent_id ?? idx}
              className={`flex items-center justify-between p-3 rounded-sm border ${
                idx === 0 ? "bg-amber-500/10 border-amber-500/20" : "bg-white/[0.02] border-white/5"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`text-sm font-bold w-6 ${idx === 0 ? "text-amber-400" : "text-neutral-500"}`}>
                  #{entry.rank ?? idx + 1}
                </span>
                <span className="text-sm text-white">
                  {entry.agentName ?? entry.agent_name ?? entry.agentId ?? entry.agent_id ?? "Unknown"}
                </span>
              </div>
              <span className="text-sm font-bold text-emerald-400">{entry.score?.toFixed(1) ?? "—"}</span>
            </div>
          ))}
        </div>
      </SleekCard>
    );
  }

  // Individual reputation
  const agentName = payload.agentName ?? payload.agent_name;
  const score = payload.score;
  const totalRatings = payload.totalRatings ?? payload.total_ratings;
  const avgRating = payload.averageRating ?? payload.average_rating;
  const rank = payload.rank;
  const percentile = payload.percentile;
  const badges = payload.badges || [];
  const feedback = payload.recentFeedback ?? payload.recent_feedback ?? [];

  return (
    <SleekCard className="p-6 flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StarFilledIcon className="w-4 h-4 text-amber-400" />
          <SleekLabel>Agent Reputation</SleekLabel>
        </div>
        {rank && (
          <span className="px-2 py-0.5 rounded-sm bg-amber-500/10 border border-amber-500/20 text-[9px] uppercase font-bold text-amber-400">
            Rank #{rank}
          </span>
        )}
      </header>

      {/* Score Display */}
      <div className="p-4 rounded-sm bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
        <div className="flex items-center justify-between">
          <div>
            {agentName && <div className="text-sm text-neutral-400 mb-1">{agentName}</div>}
            <div className="text-4xl font-black text-amber-400">{score?.toFixed(1) ?? "—"}</div>
          </div>
          <div className="text-right">
            {avgRating && (
              <div className="flex flex-col items-end gap-1">
                {renderStars(avgRating)}
                <span className="text-xs text-neutral-500">{totalRatings?.toLocaleString() ?? 0} ratings</span>
              </div>
            )}
          </div>
        </div>
        {percentile && (
          <div className="mt-3 text-xs text-neutral-400">
            Top {percentile.toFixed(0)}% of all agents
          </div>
        )}
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {badges.map((badge, idx) => (
            <span key={idx} className="px-2 py-1 rounded-sm bg-violet-500/10 border border-violet-500/20 text-[10px] text-violet-400">
              {badge}
            </span>
          ))}
        </div>
      )}

      {/* Recent Feedback */}
      {feedback.length > 0 && (
        <div className="flex flex-col gap-2">
          <SleekLabel>Recent Feedback</SleekLabel>
          {feedback.slice(0, 3).map((fb, idx) => (
            <div key={idx} className="p-3 rounded-sm bg-white/[0.02] border border-white/5">
              <div className="flex items-center justify-between mb-1">
                {renderStars(fb.rating)}
                <span className="text-[10px] text-neutral-600">
                  {formatTimestampDisplay(fb.createdAt ?? fb.created_at)}
                </span>
              </div>
              {fb.comment && <p className="text-xs text-neutral-400">{fb.comment}</p>}
            </div>
          ))}
        </div>
      )}

      {debug && (
        <details className="mt-2 border border-white/5 bg-black/50 p-4 rounded-sm text-xs text-neutral-500 font-mono">
          <summary className="cursor-pointer hover:text-white transition-colors">Raw Payload</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(rawOutput, null, 2)}</pre>
        </details>
      )}
    </SleekCard>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Feedback Renderer (submit_feedback)
// ─────────────────────────────────────────────────────────────────────────────

const feedbackRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput) as FeedbackPayload;
  const timestamp = formatTimestampDisplay(item.timestamp);

  if (item.status === "IN_PROGRESS") return <SleekLoadingCard />;
  
  if (payload.error) {
    return <SleekErrorCard message={payload.error} />;
  }

  const feedbackId = payload.id ?? payload.feedbackId ?? payload.feedback_id;
  const submittedAt = payload.submittedAt ?? payload.submitted_at;
  const ticketUrl = payload.ticketUrl ?? payload.ticket_url;
  const refId = payload.referenceId ?? payload.reference_id;

  const typeIcons: Record<string, string> = {
    bug: "🐛",
    feature: "💡",
    praise: "⭐",
    complaint: "⚠️",
    general: "📝",
  };

  return (
    <SleekCard className="p-6 flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{typeIcons[payload.type || "general"]}</span>
          <SleekLabel>Feedback Submitted</SleekLabel>
        </div>
        <span className="px-2 py-0.5 rounded-sm bg-emerald-500/10 border border-emerald-500/20 text-[9px] uppercase font-bold text-emerald-400">
          ✓ Submitted
        </span>
      </header>

      {/* Message Preview */}
      {payload.message && (
        <div className="p-4 rounded-sm bg-white/[0.02] border border-white/5">
          <SleekLabel>Your Feedback</SleekLabel>
          <p className="mt-2 text-sm text-neutral-300 leading-relaxed">
            {payload.message.length > 200 ? `${payload.message.slice(0, 200)}...` : payload.message}
          </p>
        </div>
      )}

      {/* Details */}
      <div className="grid grid-cols-2 gap-3">
        {feedbackId && <MetricItem label="ID" value={feedbackId.slice(0, 12)} />}
        {payload.category && <MetricItem label="CATEGORY" value={payload.category} />}
        {refId && <MetricItem label="REFERENCE" value={refId} />}
        {submittedAt && <MetricItem label="SUBMITTED" value={formatTimestampDisplay(submittedAt) || "—"} />}
      </div>

      {/* Ticket Link */}
      {ticketUrl && (
        <a
          href={ticketUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 p-3 rounded-sm bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium hover:bg-cyan-500/20 transition-colors"
        >
          View Ticket ↗
        </a>
      )}

      <div className="p-3 rounded-sm bg-emerald-500/5 border border-emerald-500/10 text-xs text-neutral-500 text-center">
        Thank you for your feedback! We&apos;ll review it shortly.
      </div>

      {debug && (
        <details className="mt-2 border border-white/5 bg-black/50 p-4 rounded-sm text-xs text-neutral-500 font-mono">
          <summary className="cursor-pointer hover:text-white transition-colors">Raw Payload</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(rawOutput, null, 2)}</pre>
        </details>
      )}
    </SleekCard>
  );
};

export {
  identityStatusRenderer,
  reputationRenderer,
  feedbackRenderer,
};
