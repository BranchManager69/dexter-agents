"use client";

import React from "react";
import { 
  VideoIcon, 
  ImageIcon,
  CheckCircledIcon,
  CrossCircledIcon,
  ClockIcon,
  ReloadIcon,
  ExternalLinkIcon,
  CopyIcon,
} from "@radix-ui/react-icons";
import { motion } from "framer-motion";
import type { ToolNoteRenderer } from "./types";
import { normalizeOutput, unwrapStructured, formatTimestampDisplay } from "./helpers";
import { 
  SleekCard, 
  SleekLabel, 
  MetricItem,
  SleekLoadingCard,
  SleekErrorCard,
  formatUsdPrecise,
} from "./sleekVisuals";

// --- Types ---

type JobStatus = "pending" | "running" | "completed" | "failed";

type MediaJob = {
  id: string;
  jobType?: string;
  status?: string;
  transport?: string;
  externalReference?: string | null;
  targetIdentifier?: string | null;
  chargeId?: string;
  costCents?: number;
  supabaseUserId?: string;
  createdAt?: string;
  updatedAt?: string;
  startedAt?: string | null;
  completedAt?: string | null;
  publicAccessToken?: string;
  statusUrl?: string | null;
  requestPayload?: {
    prompt?: string;
    seconds?: number;
    resolution?: string;
    model?: string;
    tokens?: Array<{ symbol?: string; mint?: string }>;
    includeDexterBranding?: boolean;
    [key: string]: unknown;
  };
  resultPayload?: {
    artifacts?: Array<{
      id?: string;
      url?: string;
      mimeType?: string;
      filename?: string;
    }>;
    [key: string]: unknown;
  } | null;
  errorMessage?: string | null;
  notification?: {
    twitterHandle?: string | null;
    twitterNotifiedAt?: string | null;
  };
};

type MediaJobResponse = {
  ok?: boolean;
  error?: string;
  job?: MediaJob;
  pricing?: {
    chargeCents?: number;
    chargeUsd?: number;
    estimateCents?: number;
  };
};

// --- Helpers ---

function formatTime(timestamp?: string | null): string {
  if (!timestamp) return "—";
  try {
    return new Date(timestamp).toLocaleString();
  } catch {
    return timestamp;
  }
}

function truncatePrompt(prompt?: string, maxLen = 150): string {
  if (!prompt) return "—";
  if (prompt.length <= maxLen) return prompt;
  return prompt.slice(0, maxLen) + "...";
}

// --- Status Badge ---

function MediaStatusBadge({ status }: { status: JobStatus }) {
  const configs: Record<JobStatus, { icon: React.ReactNode; label: string; className: string }> = {
    pending: {
      icon: <ClockIcon className="w-3 h-3" />,
      label: "Pending",
      className: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    },
    running: {
      icon: <ReloadIcon className="w-3 h-3 animate-spin" />,
      label: "Processing",
      className: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400",
    },
    completed: {
      icon: <CheckCircledIcon className="w-3 h-3" />,
      label: "Complete",
      className: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    },
    failed: {
      icon: <CrossCircledIcon className="w-3 h-3" />,
      label: "Failed",
      className: "bg-rose-500/10 border-rose-500/20 text-rose-400",
    },
  };

  const config = configs[status] || configs.pending;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm border text-[9px] font-bold uppercase tracking-wider ${config.className}`}>
      {config.icon}
      {config.label}
    </span>
  );
}

// --- Job Preview Component ---

function JobPreview({ job, type }: { job: MediaJob; type: "video" | "image" }) {
  const artifacts = job.resultPayload?.artifacts || [];
  const hasArtifacts = artifacts.length > 0;

  if (!hasArtifacts) {
    return (
      <div className={`p-8 rounded-sm border ${
        type === "video" 
          ? "bg-gradient-to-br from-red-500/5 to-orange-500/5 border-red-500/20" 
          : "bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 border-violet-500/20"
      }`}>
        <div className="flex flex-col items-center gap-3">
          {type === "video" ? (
            <VideoIcon className="w-12 h-12 text-red-400/50" />
          ) : (
            <ImageIcon className="w-12 h-12 text-violet-400/50" />
          )}
          <div className="text-center">
            <p className="text-sm text-neutral-400">
              {job.status === "completed" ? "Generation complete" : "Processing..."}
            </p>
            {job.status === "running" && (
              <motion.div
                className="mt-2 h-1 w-24 mx-auto bg-neutral-800 rounded-full overflow-hidden"
              >
                <motion.div
                  className={`h-full ${type === "video" ? "bg-red-500" : "bg-violet-500"}`}
                  animate={{
                    x: ["-100%", "100%"],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  style={{ width: "50%" }}
                />
              </motion.div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show first artifact
  const artifact = artifacts[0];
  const isVideo = artifact.mimeType?.startsWith("video/") || type === "video";

  return (
    <div className="relative rounded-sm overflow-hidden border border-white/10">
      {isVideo ? (
        <video
          src={artifact.url}
          controls
          className="w-full max-h-[300px] object-contain bg-black"
          poster={artifacts.find(a => a.mimeType?.startsWith("image/"))?.url}
        >
          Your browser does not support video playback.
        </video>
      ) : (
        <img
          src={artifact.url}
          alt="Generated media"
          className="w-full max-h-[400px] object-contain bg-black"
        />
      )}

      {/* Artifact count badge */}
      {artifacts.length > 1 && (
        <div className="absolute top-2 right-2 px-2 py-1 rounded-sm bg-black/70 border border-white/10 text-[10px] text-white">
          {artifacts.length} files
        </div>
      )}
    </div>
  );
}

// --- Prompt Display ---

function PromptDisplay({ prompt }: { prompt?: string }) {
  if (!prompt) return null;

  return (
    <div className="p-3 rounded-sm bg-white/[0.02] border border-white/5">
      <SleekLabel>PROMPT</SleekLabel>
      <p className="mt-1 text-xs text-neutral-300 leading-relaxed">
        {truncatePrompt(prompt, 300)}
      </p>
    </div>
  );
}

// --- Pricing Display ---

function PricingDisplay({ pricing, costCents }: { pricing?: MediaJobResponse["pricing"]; costCents?: number }) {
  const cost = pricing?.chargeCents || costCents;
  if (!cost) return null;

  const usd = pricing?.chargeUsd || (cost / 100);

  return (
    <div className="flex items-center gap-3 p-3 rounded-sm bg-gradient-to-r from-yellow-500/5 to-amber-500/5 border border-yellow-500/20">
      <span className="text-[9px] text-neutral-500 uppercase">Cost</span>
      <span className="text-sm font-bold text-yellow-400">{formatUsdPrecise(usd)}</span>
    </div>
  );
}

// --- Create Renderer ---

function createMediaJobRenderer(type: "video" | "image"): ToolNoteRenderer {
  return ({ item, debug = false }) => {
    const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
    const payload = unwrapStructured(rawOutput) as MediaJobResponse;
    const timestamp = formatTimestampDisplay(item.timestamp);

    if (item.status === "IN_PROGRESS" && !payload.job) return <SleekLoadingCard />;
    
    if (payload.error || payload.ok === false) {
      return <SleekErrorCard message={payload.error || "Job creation failed"} />;
    }

    const job = payload.job;
    if (!job) {
      return <SleekErrorCard message="No job data returned" />;
    }

    const status = (job.status || "pending") as JobStatus;
    const jobType = job.jobType || (type === "video" ? "sora" : "meme");

    return (
      <SleekCard className="relative overflow-visible p-6 flex flex-col gap-5">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {type === "video" ? (
              <VideoIcon className="w-4 h-4 text-red-400" />
            ) : (
              <ImageIcon className="w-4 h-4 text-violet-400" />
            )}
            <SleekLabel>
              {type === "video" ? "Sora Video Job" : "Meme Generator Job"}
            </SleekLabel>
          </div>
          <div className="flex items-center gap-3">
            <MediaStatusBadge status={status} />
            {timestamp && <span className="text-[10px] text-neutral-600 font-mono">{timestamp}</span>}
          </div>
        </header>

        {/* Job Preview */}
        <JobPreview job={job} type={type} />

        {/* Prompt */}
        <PromptDisplay prompt={job.requestPayload?.prompt} />

        {/* Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricItem label="STATUS" value={status.toUpperCase()} />
          {type === "video" && job.requestPayload?.seconds && (
            <MetricItem label="DURATION" value={`${job.requestPayload.seconds}s`} />
          )}
          {type === "video" && job.requestPayload?.resolution && (
            <MetricItem label="RESOLUTION" value={job.requestPayload.resolution} />
          )}
          {job.requestPayload?.model && (
            <MetricItem label="MODEL" value={job.requestPayload.model} />
          )}
          <MetricItem label="CREATED" value={formatTime(job.createdAt)} />
        </div>

        {/* Tokens (for meme jobs) */}
        {type === "image" && job.requestPayload?.tokens && job.requestPayload.tokens.length > 0 && (
          <div className="flex flex-col gap-2">
            <SleekLabel>TOKENS</SleekLabel>
            <div className="flex flex-wrap gap-2">
            {job.requestPayload.tokens.map((token, idx) => (
              <span
                key={idx}
                className="px-2 py-1 rounded-sm bg-violet-500/10 border border-violet-500/20 text-xs text-violet-400"
              >
                {token.symbol || token.mint?.slice(0, 8) || "Unknown"}
              </span>
            ))}
            </div>
          </div>
        )}

        {/* Pricing */}
        <PricingDisplay pricing={payload.pricing} costCents={job.costCents} />

        {/* Error Message */}
        {job.errorMessage && (
          <div className="p-4 rounded-sm bg-rose-500/5 border border-rose-500/20">
            <div className="flex items-start gap-3">
              <CrossCircledIcon className="w-5 h-5 text-rose-400 shrink-0" />
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-rose-400">Error</span>
                <p className="text-xs text-neutral-400">{job.errorMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Job ID & Links */}
        <div className="flex items-center justify-between pt-3 border-t border-white/5">
          <div className="flex items-center gap-2">
            <code className="text-[10px] font-mono text-neutral-500">{job.id}</code>
            <button
              onClick={() => navigator.clipboard.writeText(job.id)}
              className="text-neutral-600 hover:text-white transition-colors"
            >
              <CopyIcon className="w-3 h-3" />
            </button>
          </div>
          
          {job.statusUrl && (
            <a
              href={job.statusUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-[10px] text-neutral-500 hover:text-white transition-colors"
            >
              View Job <ExternalLinkIcon className="w-3 h-3" />
            </a>
          )}
        </div>

        {/* Debug */}
        {debug && (
          <details className="mt-2 border border-white/5 bg-black/50 p-4 rounded-sm text-xs text-neutral-500 font-mono">
            <summary className="cursor-pointer hover:text-white transition-colors">Raw Payload</summary>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(rawOutput, null, 2)}</pre>
          </details>
        )}
      </SleekCard>
    );
  };
}

// --- Export Renderers ---

export const soraVideoJobRenderer = createMediaJobRenderer("video");
export const memeGeneratorJobRenderer = createMediaJobRenderer("image");
