"use client";

import React, { useState } from "react";
import { 
  RocketIcon, 
  PlayIcon,
  StopIcon,
  ReloadIcon,
  CheckCircledIcon,
  CrossCircledIcon,
  ClockIcon,
  ListBulletIcon,
  InfoCircledIcon,
  VideoIcon,
  ImageIcon,
  ExternalLinkIcon,
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
} from "./sleekVisuals";

// --- Types ---

type JobStatus = "running" | "completed" | "failed" | "cancelled" | "pending" | "queued";

type StudioJob = {
  id: string;
  status: JobStatus;
  task?: string;
  current_step?: string;
  turns?: number;
  started_at?: string;
  ended_at?: string;
  elapsed_seconds?: number;
  result?: unknown;
  error?: string;
  model?: string;
  events?: unknown[];
};

type MediaJob = {
  type: "video" | "infographic";
  job_id?: string;
  status?: string;
};

// --- Helpers ---

function formatDuration(seconds?: number): string {
  if (!seconds || !Number.isFinite(seconds)) return "—";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hrs}h ${mins}m`;
}

function formatTime(timestamp?: string): string {
  if (!timestamp) return "—";
  try {
    return new Date(timestamp).toLocaleString();
  } catch {
    return timestamp;
  }
}

function truncateTask(task?: string, maxLen = 100): string {
  if (!task) return "—";
  if (task.length <= maxLen) return task;
  return task.slice(0, maxLen) + "...";
}

// --- Status Badge ---

function StudioStatusBadge({ status }: { status: JobStatus }) {
  const configs: Record<JobStatus, { icon: React.ReactNode; label: string; className: string }> = {
    running: {
      icon: <ReloadIcon className="w-3 h-3 animate-spin" />,
      label: "Running",
      className: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400",
    },
    completed: {
      icon: <CheckCircledIcon className="w-3 h-3" />,
      label: "Completed",
      className: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    },
    failed: {
      icon: <CrossCircledIcon className="w-3 h-3" />,
      label: "Failed",
      className: "bg-rose-500/10 border-rose-500/20 text-rose-400",
    },
    cancelled: {
      icon: <StopIcon className="w-3 h-3" />,
      label: "Cancelled",
      className: "bg-neutral-500/10 border-neutral-500/20 text-neutral-400",
    },
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
  };

  const config = configs[status] || configs.pending;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm border text-[9px] font-bold uppercase tracking-wider ${config.className}`}>
      {config.icon}
      {config.label}
    </span>
  );
}

// --- Progress Indicator ---

function ProgressIndicator({ step, turns }: { step?: string; turns?: number }) {
  return (
    <div className="p-4 rounded-sm bg-gradient-to-r from-cyan-500/5 to-blue-500/5 border border-cyan-500/20">
      <div className="flex items-center gap-3">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center"
        >
          <RocketIcon className="w-4 h-4 text-cyan-400" />
        </motion.div>
        <div className="flex flex-col gap-1 flex-1">
          <span className="text-sm text-cyan-400 font-medium">
            {step || "Processing..."}
          </span>
          {turns !== undefined && (
            <span className="text-[10px] text-neutral-500">
              Turn {turns}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Result Display ---

function ResultDisplay({ result, error }: { result?: unknown; error?: string }) {
  const [expanded, setExpanded] = useState(false);

  if (error) {
    return (
      <div className="p-4 rounded-sm bg-rose-500/5 border border-rose-500/20">
        <div className="flex items-start gap-3">
          <CrossCircledIcon className="w-5 h-5 text-rose-400 shrink-0" />
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-rose-400">Error</span>
            <p className="text-xs text-neutral-400">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!result) return null;

  const resultStr = typeof result === "string" ? result : JSON.stringify(result, null, 2);
  const isLong = resultStr.length > 500;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <SleekLabel>Result</SleekLabel>
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[9px] text-neutral-500 hover:text-white transition-colors"
          >
            {expanded ? "Collapse" : "Expand"}
          </button>
        )}
      </div>
      <pre className={`p-4 rounded-sm bg-black/50 border border-white/5 text-xs text-neutral-300 font-mono whitespace-pre-wrap overflow-x-auto ${
        !expanded && isLong ? "max-h-[200px]" : ""
      }`}>
        {expanded || !isLong ? resultStr : resultStr.slice(0, 500) + "..."}
      </pre>
    </div>
  );
}

// --- studio_create Renderer ---

const studioCreateRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput) as { 
    success?: boolean; 
    job_id?: string; 
    message?: string;
    error?: string;
  };
  const timestamp = formatTimestampDisplay(item.timestamp);

  if (item.status === "IN_PROGRESS") return <SleekLoadingCard />;
  
  if (payload.error || payload.success === false) {
    return <SleekErrorCard message={payload.error || "Failed to create job"} />;
  }

  return (
    <SleekCard className="relative overflow-visible p-6 flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PlayIcon className="w-4 h-4 text-emerald-400" />
          <SleekLabel>Studio Job Created</SleekLabel>
        </div>
        <StudioStatusBadge status="running" />
      </header>

      {/* Success Animation */}
      <motion.div 
        className="p-6 rounded-sm bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 text-center"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
      >
        <RocketIcon className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
        <p className="text-sm text-emerald-400 font-medium">Agent Started!</p>
      </motion.div>

      {/* Job ID */}
      {payload.job_id && (
        <div className="p-3 rounded-sm bg-white/[0.02] border border-white/5">
          <SleekLabel>JOB ID</SleekLabel>
          <code className="text-sm font-mono text-white mt-1 block">{payload.job_id}</code>
        </div>
      )}

      {/* Message */}
      {payload.message && (
        <p className="text-xs text-neutral-400">{payload.message}</p>
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

// --- studio_status Renderer ---

const studioStatusRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput) as StudioJob & { 
    success?: boolean; 
    job_id?: string;
    error?: string;
    message?: string;
  };
  const timestamp = formatTimestampDisplay(item.timestamp);

  if (item.status === "IN_PROGRESS") return <SleekLoadingCard />;
  
  if (payload.success === false || (!payload.job_id && !payload.id)) {
    return <SleekErrorCard message={payload.error || payload.message || "Job not found"} />;
  }

  const status = (payload.status || "pending") as JobStatus;
  const jobId = payload.job_id || payload.id;

  return (
    <SleekCard className="relative overflow-visible p-6 flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <InfoCircledIcon className="w-4 h-4 text-cyan-400" />
          <SleekLabel>Job Status</SleekLabel>
        </div>
        <div className="flex items-center gap-3">
          <StudioStatusBadge status={status} />
          {timestamp && <span className="text-[10px] text-neutral-600 font-mono">{timestamp}</span>}
        </div>
      </header>

      {/* Job ID */}
      <div className="p-3 rounded-sm bg-white/[0.02] border border-white/5">
        <div className="flex items-center justify-between">
          <SleekLabel>JOB ID</SleekLabel>
          <code className="text-xs font-mono text-neutral-300">{jobId}</code>
        </div>
      </div>

      {/* Progress (if running) */}
      {status === "running" && (
        <ProgressIndicator step={payload.current_step} turns={payload.turns} />
      )}

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricItem label="STATUS" value={status.toUpperCase()} />
        <MetricItem label="TURNS" value={payload.turns?.toString() || "0"} />
        <MetricItem label="ELAPSED" value={formatDuration(payload.elapsed_seconds)} />
        <MetricItem label="STARTED" value={formatTime(payload.started_at)} />
      </div>

      {/* Current Step */}
      {payload.current_step && status === "running" && (
        <div className="p-3 rounded-sm bg-white/[0.02] border border-white/5">
          <SleekLabel>CURRENT STEP</SleekLabel>
          <p className="text-sm text-neutral-300 mt-1">{payload.current_step}</p>
        </div>
      )}

      {/* Result or Error */}
      <ResultDisplay result={payload.result} error={payload.error} />

      {debug && (
        <details className="mt-2 border border-white/5 bg-black/50 p-4 rounded-sm text-xs text-neutral-500 font-mono">
          <summary className="cursor-pointer hover:text-white transition-colors">Raw Payload</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(rawOutput, null, 2)}</pre>
        </details>
      )}
    </SleekCard>
  );
};

// --- studio_cancel Renderer ---

const studioCancelRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput) as { 
    success?: boolean; 
    job_id?: string; 
    message?: string;
    error?: string;
  };
  const timestamp = formatTimestampDisplay(item.timestamp);

  if (item.status === "IN_PROGRESS") return <SleekLoadingCard />;

  const success = payload.success === true;

  return (
    <SleekCard className="relative overflow-visible p-6 flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StopIcon className={`w-4 h-4 ${success ? "text-amber-400" : "text-rose-400"}`} />
          <SleekLabel>Job Cancellation</SleekLabel>
        </div>
        <StudioStatusBadge status={success ? "cancelled" : "failed"} />
      </header>

      <div className={`p-4 rounded-sm border ${
        success 
          ? "bg-amber-500/5 border-amber-500/20" 
          : "bg-rose-500/5 border-rose-500/20"
      }`}>
        <div className="flex items-center gap-3">
          {success ? (
            <StopIcon className="w-6 h-6 text-amber-400" />
          ) : (
            <CrossCircledIcon className="w-6 h-6 text-rose-400" />
          )}
          <div className="flex flex-col">
            <span className={`text-sm font-medium ${success ? "text-amber-400" : "text-rose-400"}`}>
              {success ? "Cancellation Requested" : "Cancellation Failed"}
            </span>
            {payload.message && (
              <p className="text-xs text-neutral-400 mt-1">{payload.message}</p>
            )}
          </div>
        </div>
      </div>

      {payload.job_id && (
        <MetricItem label="JOB ID" value={payload.job_id} />
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

// --- studio_list Renderer ---

const studioListRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput) as { 
    success?: boolean; 
    count?: number;
    jobs?: Array<{
      id: string;
      status: JobStatus;
      task: string;
      turns: number;
      started_at: string;
    }>;
    error?: string;
  };
  const timestamp = formatTimestampDisplay(item.timestamp);

  if (item.status === "IN_PROGRESS") return <SleekLoadingCard />;
  
  if (payload.error || payload.success === false) {
    return <SleekErrorCard message={payload.error || "Failed to list jobs"} />;
  }

  const jobs = payload.jobs || [];

  return (
    <SleekCard className="relative overflow-visible p-6 flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListBulletIcon className="w-4 h-4 text-violet-400" />
          <SleekLabel>Studio Jobs</SleekLabel>
        </div>
        <span className="text-xs font-bold text-violet-400">{payload.count || jobs.length} jobs</span>
      </header>

      {jobs.length === 0 ? (
        <div className="p-6 text-center">
          <RocketIcon className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
          <p className="text-sm text-neutral-500">No jobs found</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
          {jobs.map((job, idx) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="p-3 rounded-sm bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="text-[10px] font-mono text-neutral-400">{job.id}</code>
                    <StudioStatusBadge status={job.status} />
                  </div>
                  <p className="text-xs text-neutral-300 truncate">{job.task}</p>
                </div>
                <div className="flex flex-col items-end gap-1 text-[10px] text-neutral-500">
                  <span>{job.turns} turns</span>
                  <span>{formatTime(job.started_at)}</span>
                </div>
              </div>
            </motion.div>
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

// --- studio_inspect Renderer ---

const studioInspectRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput) as { 
    success?: boolean; 
    job?: StudioJob;
    error?: string;
  };

  if (item.status === "IN_PROGRESS") return <SleekLoadingCard />;
  
  if (payload.error || payload.success === false || !payload.job) {
    return <SleekErrorCard message={payload.error || "Job not found"} />;
  }

  const job = payload.job;
  const status = (job.status || "pending") as JobStatus;

  return (
    <SleekCard className="relative overflow-visible p-6 flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <InfoCircledIcon className="w-4 h-4 text-fuchsia-400" />
          <SleekLabel>Job Inspection</SleekLabel>
        </div>
        <StudioStatusBadge status={status} />
      </header>

      {/* Full Job Details */}
      <pre className="p-4 rounded-sm bg-black/50 border border-white/5 text-xs text-neutral-300 font-mono whitespace-pre-wrap overflow-x-auto max-h-[400px]">
        {JSON.stringify(job, null, 2)}
      </pre>
    </SleekCard>
  );
};

// --- studio_breaking_news Renderer ---

const studioBreakingNewsRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput) as { 
    success?: boolean; 
    headline?: string;
    media?: MediaJob[];
    message?: string;
    view_at?: string;
    error?: string;
  };
  const timestamp = formatTimestampDisplay(item.timestamp);

  if (item.status === "IN_PROGRESS") return <SleekLoadingCard />;
  
  if (payload.error || payload.success === false) {
    return <SleekErrorCard message={payload.error || "Failed to generate media"} />;
  }

  const media = payload.media || [];

  return (
    <SleekCard className="relative overflow-visible p-6 flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <VideoIcon className="w-4 h-4 text-red-400" />
          <SleekLabel>Breaking News Media</SleekLabel>
        </div>
        <StudioStatusBadge status="running" />
      </header>

      {/* Headline */}
      {payload.headline && (
        <div className="p-4 rounded-sm bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20">
          <span className="text-[9px] text-neutral-500 uppercase block mb-1">HEADLINE</span>
          <p className="text-lg font-black text-white">{payload.headline}</p>
        </div>
      )}

      {/* Media Jobs */}
      {media.length > 0 && (
        <div className="flex flex-col gap-3">
          <SleekLabel>MEDIA JOBS</SleekLabel>
          {media.map((m, idx) => (
            <motion.div
              key={m.job_id || idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`p-3 rounded-sm border ${
                m.type === "video" 
                  ? "bg-red-500/5 border-red-500/20" 
                  : "bg-blue-500/5 border-blue-500/20"
              }`}
            >
              <div className="flex items-center gap-3">
                {m.type === "video" ? (
                  <VideoIcon className="w-5 h-5 text-red-400" />
                ) : (
                  <ImageIcon className="w-5 h-5 text-blue-400" />
                )}
                <div className="flex flex-col">
                  <span className={`text-sm font-medium ${
                    m.type === "video" ? "text-red-400" : "text-blue-400"
                  }`}>
                    {m.type === "video" ? "Sora Video" : "Infographic"}
                  </span>
                  {m.job_id && (
                    <code className="text-[10px] font-mono text-neutral-500">{m.job_id}</code>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Message */}
      {payload.message && (
        <p className="text-sm text-neutral-400">{payload.message}</p>
      )}

      {/* View Link */}
      {payload.view_at && (
        <a
          href={payload.view_at}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 p-3 rounded-sm bg-white/[0.02] border border-white/5 text-neutral-400 hover:text-white hover:bg-white/[0.04] transition-colors"
        >
          <span className="text-sm">View Jobs</span>
          <ExternalLinkIcon className="w-4 h-4" />
        </a>
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

// --- studio_news_status Renderer ---

const studioNewsStatusRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput) as { 
    success?: boolean; 
    job_id?: string;
    status?: string;
    created_at?: string;
    completed_at?: string;
    artifacts?: number;
    view_at?: string;
    error?: string;
  };
  const timestamp = formatTimestampDisplay(item.timestamp);

  if (item.status === "IN_PROGRESS") return <SleekLoadingCard />;
  
  if (payload.error || payload.success === false) {
    return <SleekErrorCard message={payload.error || "Failed to get status"} />;
  }

  const status = (payload.status || "pending") as JobStatus;

  return (
    <SleekCard className="relative overflow-visible p-6 flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <VideoIcon className="w-4 h-4 text-red-400" />
          <SleekLabel>News Media Status</SleekLabel>
        </div>
        <StudioStatusBadge status={status} />
      </header>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <MetricItem label="JOB ID" value={payload.job_id || "—"} />
        <MetricItem label="STATUS" value={status.toUpperCase()} />
        <MetricItem label="CREATED" value={formatTime(payload.created_at)} />
        <MetricItem label="ARTIFACTS" value={payload.artifacts?.toString() || "0"} />
      </div>

      {/* Completed */}
      {payload.completed_at && (
        <div className="p-4 rounded-sm bg-emerald-500/5 border border-emerald-500/20">
          <div className="flex items-center gap-3">
            <CheckCircledIcon className="w-5 h-5 text-emerald-400" />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-emerald-400">Completed</span>
              <span className="text-[10px] text-neutral-500">{formatTime(payload.completed_at)}</span>
            </div>
          </div>
        </div>
      )}

      {/* View Link */}
      {payload.view_at && (
        <a
          href={payload.view_at}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 p-3 rounded-sm bg-white/[0.02] border border-white/5 text-neutral-400 hover:text-white hover:bg-white/[0.04] transition-colors"
        >
          <span className="text-sm">View Details</span>
          <ExternalLinkIcon className="w-4 h-4" />
        </a>
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

// --- Export all renderers ---

export {
  studioCreateRenderer,
  studioStatusRenderer,
  studioCancelRenderer,
  studioListRenderer,
  studioInspectRenderer,
  studioBreakingNewsRenderer,
  studioNewsStatusRenderer,
};
