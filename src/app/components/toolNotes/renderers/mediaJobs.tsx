"use client";

import React, { useState } from "react";
import { 
  VideoIcon, 
  ImageIcon,
  CheckCircledIcon,
  CrossCircledIcon,
  ClockIcon,
  ReloadIcon,
  ExternalLinkIcon,
  CopyIcon,
  MagicWandIcon,
  RocketIcon,
  LightningBoltIcon,
  StarFilledIcon,
  LayersIcon,
} from "@radix-ui/react-icons";
import { motion, AnimatePresence } from "framer-motion";
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

type JobStatus = "pending" | "queued" | "processing" | "running" | "completed" | "failed";

type MediaArtifact = {
  id?: string;
  url?: string;
  mimeType?: string;
  filename?: string;
  width?: number;
  height?: number;
  duration?: number;
};

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
    negative_prompt?: string;
    seconds?: number;
    resolution?: string;
    aspect_ratio?: string;
    model?: string;
    style?: string;
    tokens?: Array<{ symbol?: string; mint?: string; name?: string }>;
    includeDexterBranding?: boolean;
    seed?: number;
    [key: string]: unknown;
  };
  resultPayload?: {
    artifacts?: MediaArtifact[];
    [key: string]: unknown;
  } | null;
  errorMessage?: string | null;
  notification?: {
    twitterHandle?: string | null;
    twitterNotifiedAt?: string | null;
  };
  progress?: {
    stage?: string;
    percent?: number;
    eta_seconds?: number;
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
    baseCost?: number;
    markup?: number;
    total?: number;
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

function formatDuration(seconds?: number): string {
  if (!seconds || !Number.isFinite(seconds)) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}

// --- Generation Stages ---

const GENERATION_STAGES = {
  video: [
    { id: "queued", label: "Queued", icon: <ClockIcon className="w-4 h-4" /> },
    { id: "analyzing", label: "Analyzing Prompt", icon: <MagicWandIcon className="w-4 h-4" /> },
    { id: "generating", label: "Generating Frames", icon: <LayersIcon className="w-4 h-4" /> },
    { id: "encoding", label: "Encoding Video", icon: <VideoIcon className="w-4 h-4" /> },
    { id: "completed", label: "Complete", icon: <CheckCircledIcon className="w-4 h-4" /> },
  ],
  image: [
    { id: "queued", label: "Queued", icon: <ClockIcon className="w-4 h-4" /> },
    { id: "analyzing", label: "Analyzing Request", icon: <MagicWandIcon className="w-4 h-4" /> },
    { id: "generating", label: "Generating Image", icon: <ImageIcon className="w-4 h-4" /> },
    { id: "completed", label: "Complete", icon: <CheckCircledIcon className="w-4 h-4" /> },
  ],
};

function getStageIndex(status?: string, stage?: string, type: "video" | "image" = "video"): number {
  const stages = GENERATION_STAGES[type];
  
  if (status === "completed") return stages.length - 1;
  if (status === "failed") return -1;
  if (!stage) {
    if (status === "processing" || status === "running") return 1;
    return 0;
  }
  
  const idx = stages.findIndex(s => s.id === stage.toLowerCase());
  return idx >= 0 ? idx : 1;
}

// --- Status Badge ---

function MediaStatusBadge({ status, animated = false }: { status: JobStatus; animated?: boolean }) {
  const configs: Record<JobStatus, { icon: React.ReactNode; label: string; className: string }> = {
    pending: {
      icon: <ClockIcon className="w-3 h-3" />,
      label: "Pending",
      className: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    },
    queued: {
      icon: <ClockIcon className="w-3 h-3" />,
      label: "Queued",
      className: "bg-violet-500/10 border-violet-500/20 text-violet-400",
    },
    processing: {
      icon: <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}><ReloadIcon className="w-3 h-3" /></motion.div>,
      label: "Processing",
      className: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400",
    },
    running: {
      icon: <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}><ReloadIcon className="w-3 h-3" /></motion.div>,
      label: "Running",
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
    <motion.span 
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm border text-[9px] font-bold uppercase tracking-wider ${config.className}`}
      animate={animated && (status === "processing" || status === "running") ? {
        boxShadow: ["0 0 0 0 rgba(6,182,212,0)", "0 0 0 4px rgba(6,182,212,0.2)", "0 0 0 0 rgba(6,182,212,0)"]
      } : undefined}
      transition={{ duration: 2, repeat: Infinity }}
    >
      {config.icon}
      {config.label}
    </motion.span>
  );
}

// --- Generation Progress Pipeline ---

function GenerationPipeline({ 
  type, 
  currentStage, 
  status,
  progress 
}: { 
  type: "video" | "image"; 
  currentStage?: string;
  status?: string;
  progress?: MediaJob["progress"];
}) {
  const stages = GENERATION_STAGES[type];
  const currentIndex = getStageIndex(status, currentStage || progress?.stage, type);
  const isFailed = status === "failed";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        {stages.map((stage, idx) => {
          const isComplete = idx < currentIndex;
          const isCurrent = idx === currentIndex && !isFailed;
          const isPending = idx > currentIndex;

          return (
            <React.Fragment key={stage.id}>
              {/* Stage node */}
              <motion.div
                className={`flex flex-col items-center gap-1`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <motion.div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    isComplete 
                      ? "bg-emerald-500/20 border-2 border-emerald-500" 
                      : isCurrent
                        ? type === "video" 
                          ? "bg-red-500/20 border-2 border-red-500"
                          : "bg-violet-500/20 border-2 border-violet-500"
                        : "bg-neutral-800 border-2 border-neutral-700"
                  }`}
                  animate={isCurrent ? { scale: [1, 1.1, 1] } : undefined}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <span className={`${
                    isComplete ? "text-emerald-400" : 
                    isCurrent ? (type === "video" ? "text-red-400" : "text-violet-400") : 
                    "text-neutral-500"
                  }`}>
                    {stage.icon}
                  </span>
                </motion.div>
                <span className={`text-[9px] text-center ${
                  isComplete ? "text-emerald-400" :
                  isCurrent ? "text-white" :
                  "text-neutral-600"
                }`}>
                  {stage.label}
                </span>
              </motion.div>

              {/* Connector line */}
              {idx < stages.length - 1 && (
                <motion.div 
                  className={`flex-1 h-0.5 mx-2 ${
                    idx < currentIndex ? "bg-emerald-500" : "bg-neutral-800"
                  }`}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: idx * 0.1 + 0.05 }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Progress bar if available */}
      {progress?.percent !== undefined && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[9px]">
            <span className="text-neutral-500">{progress.stage || "Processing"}</span>
            <span className="text-neutral-400">{progress.percent}%</span>
          </div>
          <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${
                type === "video" 
                  ? "bg-gradient-to-r from-red-500 to-orange-500" 
                  : "bg-gradient-to-r from-violet-500 to-fuchsia-500"
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${progress.percent}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          {progress.eta_seconds && (
            <span className="text-[9px] text-neutral-600 text-right">
              ETA: {formatDuration(progress.eta_seconds)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// --- Prompt Display ---

function PromptDisplay({ prompt, negativePrompt }: { prompt?: string; negativePrompt?: string }) {
  const [expanded, setExpanded] = useState(false);

  if (!prompt) return null;

  const charCount = prompt.length;
  const isLong = charCount > 200;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <SleekLabel>PROMPT</SleekLabel>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-neutral-600">{charCount} chars</span>
          {isLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-[9px] text-neutral-500 hover:text-white transition-colors"
            >
              {expanded ? "Less" : "More"}
            </button>
          )}
        </div>
      </div>
      
      <div className="p-3 rounded-sm bg-gradient-to-r from-violet-500/5 to-fuchsia-500/5 border border-violet-500/20">
        <p className={`text-sm text-neutral-300 leading-relaxed ${
          !expanded && isLong ? "line-clamp-3" : ""
        }`}>
          "{prompt}"
        </p>
      </div>

      {negativePrompt && (
        <div className="p-2 rounded-sm bg-rose-500/5 border border-rose-500/20">
          <span className="text-[9px] text-rose-400 uppercase block mb-1">Negative Prompt</span>
          <p className="text-xs text-neutral-400">{negativePrompt}</p>
        </div>
      )}
    </div>
  );
}

// --- Media Preview ---

function MediaPreview({ job, type }: { job: MediaJob; type: "video" | "image" }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const artifacts = job.resultPayload?.artifacts || [];
  const hasArtifacts = artifacts.length > 0;
  const status = (job.status || "pending") as JobStatus;
  const isProcessing = status === "processing" || status === "running";

  // Placeholder during generation
  if (!hasArtifacts) {
    return (
      <motion.div 
        className={`relative rounded-sm overflow-hidden border ${
          type === "video" 
            ? "bg-gradient-to-br from-red-500/5 via-neutral-900 to-orange-500/5 border-red-500/20" 
            : "bg-gradient-to-br from-violet-500/5 via-neutral-900 to-fuchsia-500/5 border-violet-500/20"
        }`}
        style={{ aspectRatio: type === "video" ? "16/9" : "1/1" }}
      >
        {/* Animated background */}
        {isProcessing && (
          <motion.div
            className="absolute inset-0"
            animate={{
              background: [
                "radial-gradient(circle at 20% 20%, rgba(239,68,68,0.1) 0%, transparent 50%)",
                "radial-gradient(circle at 80% 80%, rgba(239,68,68,0.1) 0%, transparent 50%)",
                "radial-gradient(circle at 20% 20%, rgba(239,68,68,0.1) 0%, transparent 50%)",
              ]
            }}
            transition={{ duration: 4, repeat: Infinity }}
          />
        )}

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          {isProcessing ? (
            <>
              <motion.div
                animate={{ 
                  rotate: 360,
                  scale: [1, 1.2, 1]
                }}
                transition={{ 
                  rotate: { duration: 3, repeat: Infinity, ease: "linear" },
                  scale: { duration: 1.5, repeat: Infinity }
                }}
              >
                {type === "video" ? (
                  <VideoIcon className="w-12 h-12 text-red-400/60" />
                ) : (
                  <ImageIcon className="w-12 h-12 text-violet-400/60" />
                )}
              </motion.div>
              <motion.p 
                className="text-sm text-neutral-400"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {type === "video" ? "Generating video..." : "Creating meme..."}
              </motion.p>
            </>
          ) : status === "completed" ? (
            <>
              <CheckCircledIcon className="w-12 h-12 text-emerald-400/60" />
              <p className="text-sm text-neutral-400">Generation complete</p>
            </>
          ) : (
            <>
              <ClockIcon className="w-12 h-12 text-neutral-600" />
              <p className="text-sm text-neutral-500">Waiting to start</p>
            </>
          )}
        </div>
      </motion.div>
    );
  }

  // Show actual media
  const artifact = artifacts[0];
  const isVideo = artifact.mimeType?.startsWith("video/") || type === "video";

  return (
    <div className="relative rounded-sm overflow-hidden border border-white/10 group">
      {isVideo ? (
        <div className="relative" style={{ aspectRatio: "16/9" }}>
          <video
            src={artifact.url}
            controls
            className="w-full h-full object-contain bg-black"
            poster={artifacts.find(a => a.mimeType?.startsWith("image/"))?.url}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          >
            Your browser does not support video playback.
          </video>
          
          {/* Play button overlay */}
          {!isPlaying && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
              initial={{ opacity: 1 }}
              whileHover={{ opacity: 0.8 }}
            >
              <motion.div
                className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center"
                whileHover={{ scale: 1.1 }}
              >
                <div className="w-0 h-0 border-t-8 border-t-transparent border-l-12 border-l-white border-b-8 border-b-transparent ml-1" />
              </motion.div>
            </motion.div>
          )}
        </div>
      ) : (
        <div className="relative">
          <img
            src={artifact.url}
            alt="Generated media"
            className="w-full max-h-[400px] object-contain bg-black"
          />
          
          {/* Hover overlay */}
          <motion.div
            className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <a
              href={artifact.url}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-sm bg-white/20 text-white text-sm font-medium hover:bg-white/30 transition-colors"
            >
              View Full Size
            </a>
          </motion.div>
        </div>
      )}

      {/* Artifact info overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-between text-[9px] text-white/70">
          {artifact.width && artifact.height && (
            <span>{artifact.width} × {artifact.height}</span>
          )}
          {artifact.duration && (
            <span>{formatDuration(artifact.duration)}</span>
          )}
          {artifacts.length > 1 && (
            <span>{artifacts.length} files</span>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Pricing Breakdown ---

function PricingBreakdown({ pricing, costCents }: { pricing?: MediaJobResponse["pricing"]; costCents?: number }) {
  const total = pricing?.total || pricing?.chargeUsd || (costCents ? costCents / 100 : undefined);
  
  if (!total && !pricing?.baseCost) return null;

  return (
    <div className="p-3 rounded-sm bg-gradient-to-r from-yellow-500/5 to-amber-500/5 border border-yellow-500/20">
      <div className="flex items-center justify-between mb-2">
        <SleekLabel>PRICING</SleekLabel>
        <span className="text-lg font-bold text-yellow-400">{formatUsdPrecise(total || 0)}</span>
      </div>

      {pricing?.baseCost !== undefined && pricing?.markup !== undefined && (
        <div className="flex items-center gap-4 text-[10px] text-neutral-500">
          <span>Base: ${(pricing.baseCost).toFixed(4)}</span>
          <span>+</span>
          <span>Markup: ${(pricing.markup).toFixed(4)}</span>
        </div>
      )}
    </div>
  );
}

// --- Token Pills ---

function TokenPills({ tokens }: { tokens?: Array<{ symbol?: string; mint?: string; name?: string }> }) {
  if (!tokens || tokens.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <SleekLabel>TOKENS</SleekLabel>
      <div className="flex flex-wrap gap-2">
        {tokens.map((token, idx) => (
          <motion.span
            key={idx}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            className="px-2 py-1 rounded-sm bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 text-xs text-violet-400 font-medium"
          >
            {token.symbol || token.name || token.mint?.slice(0, 8) || "Unknown"}
          </motion.span>
        ))}
      </div>
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
    const isComplete = status === "completed";
    const isProcessing = status === "processing" || status === "running";

    return (
      <SleekCard className="relative overflow-visible p-6 flex flex-col gap-5">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {type === "video" ? (
              <motion.div
                animate={isProcessing ? { rotate: [0, 10, -10, 0] } : undefined}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <VideoIcon className="w-4 h-4 text-red-400" />
              </motion.div>
            ) : (
              <motion.div
                animate={isProcessing ? { scale: [1, 1.1, 1] } : undefined}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <ImageIcon className="w-4 h-4 text-violet-400" />
              </motion.div>
            )}
            <SleekLabel>
              {type === "video" ? "Sora Video Generation" : "Meme Generator"}
            </SleekLabel>
          </div>
          <div className="flex items-center gap-3">
            <MediaStatusBadge status={status} animated={isProcessing} />
            {timestamp && <span className="text-[10px] text-neutral-600 font-mono">{timestamp}</span>}
          </div>
        </header>

        {/* Generation Pipeline */}
        {!isComplete && (
          <GenerationPipeline 
            type={type} 
            currentStage={job.progress?.stage}
            status={job.status}
            progress={job.progress}
          />
        )}

        {/* Media Preview */}
        <MediaPreview job={job} type={type} />

        {/* Prompt */}
        <PromptDisplay 
          prompt={job.requestPayload?.prompt} 
          negativePrompt={job.requestPayload?.negative_prompt}
        />

        {/* Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricItem label="STATUS" value={status.toUpperCase()} />
          {type === "video" && job.requestPayload?.seconds && (
            <MetricItem label="DURATION" value={`${job.requestPayload.seconds}s`} />
          )}
          {(job.requestPayload?.resolution || job.requestPayload?.aspect_ratio) && (
            <MetricItem 
              label={type === "video" ? "RESOLUTION" : "ASPECT"} 
              value={job.requestPayload.resolution || job.requestPayload.aspect_ratio || "—"} 
            />
          )}
          {job.requestPayload?.model && (
            <MetricItem label="MODEL" value={job.requestPayload.model} />
          )}
          {job.requestPayload?.style && (
            <MetricItem label="STYLE" value={job.requestPayload.style} />
          )}
        </div>

        {/* Tokens (for meme jobs) */}
        {type === "image" && <TokenPills tokens={job.requestPayload?.tokens} />}

        {/* Pricing */}
        <PricingBreakdown pricing={payload.pricing} costCents={job.costCents} />

        {/* Error Message */}
        {job.errorMessage && (
          <motion.div 
            className="p-4 rounded-sm bg-rose-500/5 border border-rose-500/20"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-start gap-3">
              <CrossCircledIcon className="w-5 h-5 text-rose-400 shrink-0" />
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-rose-400">Generation Failed</span>
                <p className="text-xs text-neutral-400">{job.errorMessage}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Timestamps */}
        <div className="grid grid-cols-2 gap-3 text-[10px] text-neutral-500">
          <div>
            <span className="text-neutral-600">Created: </span>
            {formatTime(job.createdAt)}
          </div>
          {job.completedAt && (
            <div>
              <span className="text-neutral-600">Completed: </span>
              {formatTime(job.completedAt)}
            </div>
          )}
        </div>

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
