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
  ChevronDownIcon,
  ChevronRightIcon,
  CodeIcon,
  GearIcon,
  ChatBubbleIcon,
  FileTextIcon,
  LightningBoltIcon,
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

type AgentEvent = {
  type: "tool_call" | "tool_result" | "message" | "thinking" | "error" | "turn" | "unknown";
  timestamp?: string;
  name?: string;
  content?: string | Record<string, unknown>;
  tool?: string;
  args?: Record<string, unknown>;
  result?: unknown;
  turn?: number;
  error?: string;
};

type StudioJob = {
  id: string;
  status: JobStatus;
  task?: string;
  current_step?: string;
  turns?: number;
  max_turns?: number;
  started_at?: string;
  ended_at?: string;
  elapsed_seconds?: number;
  result?: unknown;
  error?: string;
  model?: string;
  events?: AgentEvent[];
  tools_used?: string[];
  token_usage?: {
    input?: number;
    output?: number;
    total?: number;
  };
};

type MediaJob = {
  type: "video" | "infographic";
  job_id?: string;
  status?: string;
  preview_url?: string;
};

// --- Helpers ---

function formatDuration(seconds?: number): string {
  if (!seconds || !Number.isFinite(seconds)) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
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

function formatTimeShort(timestamp?: string): string {
  if (!timestamp) return "";
  try {
    return new Date(timestamp).toLocaleTimeString();
  } catch {
    return "";
  }
}

function truncateTask(task?: string, maxLen = 100): string {
  if (!task) return "—";
  if (task.length <= maxLen) return task;
  return task.slice(0, maxLen) + "...";
}

// --- Claude/Anthropic Brand Colors ---

const CLAUDE_ORANGE = "#CC785C";
const CLAUDE_CORAL = "#DA7756";

// --- Status Badge ---

function StudioStatusBadge({ status, animated = false }: { status: JobStatus; animated?: boolean }) {
  const configs: Record<JobStatus, { icon: React.ReactNode; label: string; className: string }> = {
    running: {
      icon: <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}><GearIcon className="w-3 h-3" /></motion.div>,
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
    <motion.span 
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm border text-[9px] font-bold uppercase tracking-wider ${config.className}`}
      animate={animated && status === "running" ? { 
        boxShadow: ["0 0 0 0 rgba(6,182,212,0)", "0 0 0 4px rgba(6,182,212,0.2)", "0 0 0 0 rgba(6,182,212,0)"]
      } : undefined}
      transition={{ duration: 2, repeat: Infinity }}
    >
      {config.icon}
      {config.label}
    </motion.span>
  );
}

// --- Event Icon ---

function EventIcon({ type }: { type: AgentEvent["type"] }) {
  const icons: Record<AgentEvent["type"], React.ReactNode> = {
    tool_call: <CodeIcon className="w-3 h-3 text-violet-400" />,
    tool_result: <CheckCircledIcon className="w-3 h-3 text-emerald-400" />,
    message: <ChatBubbleIcon className="w-3 h-3 text-blue-400" />,
    thinking: <LightningBoltIcon className="w-3 h-3 text-amber-400" />,
    error: <CrossCircledIcon className="w-3 h-3 text-rose-400" />,
    turn: <ReloadIcon className="w-3 h-3 text-cyan-400" />,
    unknown: <InfoCircledIcon className="w-3 h-3 text-neutral-400" />,
  };
  return icons[type] || icons.unknown;
}

// --- Progress Ring ---

function ProgressRing({ progress, size = 60 }: { progress: number; size?: number }) {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-neutral-800"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#progress-grad)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="progress-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={CLAUDE_CORAL} />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-white">{Math.round(progress)}%</span>
      </div>
    </div>
  );
}

// --- Turn Progress Bar ---

function TurnProgressBar({ current, max }: { current: number; max?: number }) {
  const maxTurns = max || 10;
  const progress = Math.min((current / maxTurns) * 100, 100);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[9px] text-neutral-500 uppercase">Turn Progress</span>
        <span className="text-[10px] text-neutral-400">{current}/{maxTurns}</span>
      </div>
      <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ 
            background: `linear-gradient(90deg, ${CLAUDE_CORAL}, #06b6d4)`,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );
}

// --- Event Timeline ---

function EventTimeline({ events, maxDisplay = 10 }: { events: AgentEvent[]; maxDisplay?: number }) {
  const [expanded, setExpanded] = useState(false);
  const displayEvents = expanded ? events : events.slice(-maxDisplay);

  if (events.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <SleekLabel>EVENT TIMELINE</SleekLabel>
        {events.length > maxDisplay && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[9px] text-neutral-500 hover:text-white transition-colors flex items-center gap-1"
          >
            {expanded ? <ChevronDownIcon className="w-3 h-3" /> : <ChevronRightIcon className="w-3 h-3" />}
            {expanded ? "Collapse" : `Show all ${events.length}`}
          </button>
        )}
      </div>

      <div className="max-h-[300px] overflow-y-auto">
        {displayEvents.map((event, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.02 }}
            className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0"
          >
            {/* Icon */}
            <div className="mt-1">
              <EventIcon type={event.type} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-white capitalize">
                  {event.type.replace("_", " ")}
                </span>
                {event.tool && (
                  <code className="text-[9px] px-1 py-0.5 rounded-sm bg-violet-500/10 text-violet-400">
                    {event.tool}
                  </code>
                )}
                {event.turn !== undefined && (
                  <span className="text-[9px] text-neutral-500">Turn {event.turn}</span>
                )}
              </div>
              
              {event.name && (
                <p className="text-[10px] text-neutral-400 mt-0.5 truncate">{event.name}</p>
              )}
              
              {event.content && typeof event.content === "string" && (
                <p className="text-[10px] text-neutral-500 mt-0.5 line-clamp-2">{event.content}</p>
              )}

              {event.error && (
                <p className="text-[10px] text-rose-400 mt-0.5">{event.error}</p>
              )}
            </div>

            {/* Timestamp */}
            {event.timestamp && (
              <span className="text-[9px] text-neutral-600 shrink-0">
                {formatTimeShort(event.timestamp)}
              </span>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// --- Tools Used Badge List ---

function ToolsUsedList({ tools }: { tools?: string[] }) {
  if (!tools || tools.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <SleekLabel>TOOLS USED</SleekLabel>
      <div className="flex flex-wrap gap-1.5">
        {tools.map((tool, idx) => (
          <motion.span
            key={tool}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.03 }}
            className="px-2 py-1 rounded-sm bg-violet-500/10 border border-violet-500/20 text-[9px] text-violet-400 font-mono"
          >
            {tool}
          </motion.span>
        ))}
      </div>
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
    task?: string;
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
        <StudioStatusBadge status="running" animated />
      </header>

      {/* Success Animation */}
      <motion.div 
        className="relative p-6 rounded-sm overflow-hidden"
        style={{ 
          background: `linear-gradient(135deg, ${CLAUDE_CORAL}15, rgba(6,182,212,0.1))`,
          border: `1px solid ${CLAUDE_CORAL}40`
        }}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
      >
        {/* Animated background particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full"
            style={{ 
              backgroundColor: CLAUDE_CORAL,
              left: `${20 + i * 15}%`,
              top: "50%",
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 2,
              delay: i * 0.2,
              repeat: Infinity,
            }}
          />
        ))}

        <div className="relative flex items-center gap-4">
          <motion.div
            animate={{ 
              rotate: [0, 10, -10, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ duration: 1, repeat: 2 }}
          >
            <RocketIcon className="w-10 h-10" style={{ color: CLAUDE_CORAL }} />
          </motion.div>
          <div>
            <p className="text-lg font-bold text-white">Agent Launched!</p>
            <p className="text-xs text-neutral-400">Claude is working on your task</p>
          </div>
        </div>
      </motion.div>

      {/* Task Preview */}
      {payload.task && (
        <div className="p-3 rounded-sm bg-white/[0.02] border border-white/5">
          <SleekLabel>TASK</SleekLabel>
          <p className="mt-1 text-sm text-neutral-300 line-clamp-3">{payload.task}</p>
        </div>
      )}

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
  const maxTurns = payload.max_turns || 10;
  const progress = payload.turns ? (payload.turns / maxTurns) * 100 : 0;

  return (
    <SleekCard className="relative overflow-visible p-6 flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <InfoCircledIcon className="w-4 h-4 text-cyan-400" />
          <SleekLabel>Job Status</SleekLabel>
        </div>
        <div className="flex items-center gap-3">
          <StudioStatusBadge status={status} animated={status === "running"} />
          {timestamp && <span className="text-[10px] text-neutral-600 font-mono">{timestamp}</span>}
        </div>
      </header>

      {/* Progress Section */}
      {status === "running" && (
        <div className="flex items-center gap-6 p-4 rounded-sm bg-gradient-to-r from-cyan-500/5 to-blue-500/5 border border-cyan-500/20">
          <ProgressRing progress={progress} />
          <div className="flex-1">
            <TurnProgressBar current={payload.turns || 0} max={maxTurns} />
            {payload.current_step && (
              <p className="text-xs text-neutral-400 mt-2 line-clamp-1">
                {payload.current_step}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Job ID */}
      <div className="p-3 rounded-sm bg-white/[0.02] border border-white/5">
        <div className="flex items-center justify-between">
          <SleekLabel>JOB ID</SleekLabel>
          <code className="text-xs font-mono text-neutral-300">{jobId}</code>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricItem label="STATUS" value={status.toUpperCase()} />
        <MetricItem label="TURNS" value={`${payload.turns || 0}/${maxTurns}`} />
        <MetricItem label="ELAPSED" value={formatDuration(payload.elapsed_seconds)} />
        <MetricItem label="MODEL" value={payload.model || "claude"} />
      </div>

      {/* Token Usage */}
      {payload.token_usage && (
        <div className="grid grid-cols-3 gap-3">
          <div className="p-2 rounded-sm bg-violet-500/5 border border-violet-500/20 text-center">
            <span className="text-[9px] text-neutral-500 uppercase block">Input</span>
            <span className="text-sm font-bold text-violet-400">{payload.token_usage.input?.toLocaleString() || "—"}</span>
          </div>
          <div className="p-2 rounded-sm bg-cyan-500/5 border border-cyan-500/20 text-center">
            <span className="text-[9px] text-neutral-500 uppercase block">Output</span>
            <span className="text-sm font-bold text-cyan-400">{payload.token_usage.output?.toLocaleString() || "—"}</span>
          </div>
          <div className="p-2 rounded-sm bg-emerald-500/5 border border-emerald-500/20 text-center">
            <span className="text-[9px] text-neutral-500 uppercase block">Total</span>
            <span className="text-sm font-bold text-emerald-400">{payload.token_usage.total?.toLocaleString() || "—"}</span>
          </div>
        </div>
      )}

      {/* Tools Used */}
      <ToolsUsedList tools={payload.tools_used} />

      {/* Result or Error */}
      {status === "completed" && payload.result && (
        <div className="p-4 rounded-sm bg-emerald-500/5 border border-emerald-500/20">
          <SleekLabel>RESULT</SleekLabel>
          <div className="mt-2 max-h-[200px] overflow-y-auto">
            <pre className="text-xs text-neutral-300 whitespace-pre-wrap">
              {typeof payload.result === "string" ? payload.result : JSON.stringify(payload.result, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {status === "failed" && payload.error && (
        <div className="p-4 rounded-sm bg-rose-500/5 border border-rose-500/20">
          <div className="flex items-start gap-3">
            <CrossCircledIcon className="w-5 h-5 text-rose-400 shrink-0" />
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-rose-400">Error</span>
              <p className="text-xs text-neutral-400">{payload.error}</p>
            </div>
          </div>
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

// --- studio_cancel Renderer ---

const studioCancelRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput) as { 
    success?: boolean; 
    job_id?: string; 
    message?: string;
    error?: string;
    cancelled_at?: string;
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

      <motion.div 
        className={`p-4 rounded-sm border ${
          success 
            ? "bg-amber-500/5 border-amber-500/20" 
            : "bg-rose-500/5 border-rose-500/20"
        }`}
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
      >
        <div className="flex items-center gap-3">
          {success ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring" }}
            >
              <StopIcon className="w-8 h-8 text-amber-400" />
            </motion.div>
          ) : (
            <CrossCircledIcon className="w-8 h-8 text-rose-400" />
          )}
          <div className="flex flex-col">
            <span className={`text-sm font-medium ${success ? "text-amber-400" : "text-rose-400"}`}>
              {success ? "Job Cancelled" : "Cancellation Failed"}
            </span>
            {payload.message && (
              <p className="text-xs text-neutral-400 mt-1">{payload.message}</p>
            )}
            {payload.cancelled_at && (
              <p className="text-[10px] text-neutral-500 mt-1">
                Cancelled at {formatTime(payload.cancelled_at)}
              </p>
            )}
          </div>
        </div>
      </motion.div>

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
      elapsed_seconds?: number;
    }>;
    error?: string;
  };
  const timestamp = formatTimestampDisplay(item.timestamp);

  if (item.status === "IN_PROGRESS") return <SleekLoadingCard />;
  
  if (payload.error || payload.success === false) {
    return <SleekErrorCard message={payload.error || "Failed to list jobs"} />;
  }

  const jobs = payload.jobs || [];
  const runningCount = jobs.filter(j => j.status === "running").length;
  const completedCount = jobs.filter(j => j.status === "completed").length;

  return (
    <SleekCard className="relative overflow-visible p-6 flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListBulletIcon className="w-4 h-4 text-violet-400" />
          <SleekLabel>Studio Jobs</SleekLabel>
        </div>
        <span className="text-xs font-bold text-violet-400">{payload.count || jobs.length} jobs</span>
      </header>

      {/* Stats */}
      {jobs.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="p-2 rounded-sm bg-cyan-500/5 border border-cyan-500/20 text-center">
            <span className="text-[9px] text-neutral-500 uppercase block">Running</span>
            <span className="text-lg font-bold text-cyan-400">{runningCount}</span>
          </div>
          <div className="p-2 rounded-sm bg-emerald-500/5 border border-emerald-500/20 text-center">
            <span className="text-[9px] text-neutral-500 uppercase block">Completed</span>
            <span className="text-lg font-bold text-emerald-400">{completedCount}</span>
          </div>
          <div className="p-2 rounded-sm bg-violet-500/5 border border-violet-500/20 text-center">
            <span className="text-[9px] text-neutral-500 uppercase block">Total</span>
            <span className="text-lg font-bold text-violet-400">{jobs.length}</span>
          </div>
        </div>
      )}

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
                    <code className="text-[10px] font-mono text-neutral-400">{job.id.slice(0, 12)}...</code>
                    <StudioStatusBadge status={job.status} />
                  </div>
                  <p className="text-xs text-neutral-300 truncate">{truncateTask(job.task, 60)}</p>
                </div>
                <div className="flex flex-col items-end gap-1 text-[10px] text-neutral-500 shrink-0">
                  <span>{job.turns} turns</span>
                  <span>{formatDuration(job.elapsed_seconds)}</span>
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
  const events = job.events || [];

  return (
    <SleekCard className="relative overflow-visible p-6 flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileTextIcon className="w-4 h-4 text-fuchsia-400" />
          <SleekLabel>Job Inspection</SleekLabel>
        </div>
        <StudioStatusBadge status={status} />
      </header>

      {/* Job Overview */}
      <div className="p-4 rounded-sm bg-gradient-to-r from-fuchsia-500/5 to-violet-500/5 border border-fuchsia-500/20">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <span className="text-[9px] text-neutral-500 uppercase block">Job ID</span>
            <code className="text-xs text-white">{job.id.slice(0, 12)}...</code>
          </div>
          <div>
            <span className="text-[9px] text-neutral-500 uppercase block">Turns</span>
            <span className="text-sm font-bold text-white">{job.turns || 0}</span>
          </div>
          <div>
            <span className="text-[9px] text-neutral-500 uppercase block">Elapsed</span>
            <span className="text-sm text-white">{formatDuration(job.elapsed_seconds)}</span>
          </div>
          <div>
            <span className="text-[9px] text-neutral-500 uppercase block">Model</span>
            <span className="text-sm text-white">{job.model || "claude"}</span>
          </div>
        </div>
      </div>

      {/* Task */}
      {job.task && (
        <div className="p-3 rounded-sm bg-white/[0.02] border border-white/5">
          <SleekLabel>TASK</SleekLabel>
          <p className="mt-1 text-sm text-neutral-300">{job.task}</p>
        </div>
      )}

      {/* Token Usage */}
      {job.token_usage && (
        <div className="grid grid-cols-3 gap-3">
          <div className="p-2 rounded-sm bg-violet-500/5 border border-violet-500/20 text-center">
            <span className="text-[9px] text-neutral-500 uppercase block">Input Tokens</span>
            <span className="text-sm font-bold text-violet-400">{job.token_usage.input?.toLocaleString() || "—"}</span>
          </div>
          <div className="p-2 rounded-sm bg-cyan-500/5 border border-cyan-500/20 text-center">
            <span className="text-[9px] text-neutral-500 uppercase block">Output Tokens</span>
            <span className="text-sm font-bold text-cyan-400">{job.token_usage.output?.toLocaleString() || "—"}</span>
          </div>
          <div className="p-2 rounded-sm bg-emerald-500/5 border border-emerald-500/20 text-center">
            <span className="text-[9px] text-neutral-500 uppercase block">Total Tokens</span>
            <span className="text-sm font-bold text-emerald-400">{job.token_usage.total?.toLocaleString() || "—"}</span>
          </div>
        </div>
      )}

      {/* Tools Used */}
      <ToolsUsedList tools={job.tools_used} />

      {/* Event Timeline */}
      <EventTimeline events={events} />

      {/* Result */}
      {status === "completed" && job.result && (
        <div className="p-4 rounded-sm bg-emerald-500/5 border border-emerald-500/20">
          <SleekLabel>FINAL RESULT</SleekLabel>
          <div className="mt-2 max-h-[200px] overflow-y-auto">
            <pre className="text-xs text-neutral-300 whitespace-pre-wrap">
              {typeof job.result === "string" ? job.result : JSON.stringify(job.result, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Error */}
      {job.error && (
        <div className="p-4 rounded-sm bg-rose-500/5 border border-rose-500/20">
          <div className="flex items-start gap-3">
            <CrossCircledIcon className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <span className="text-sm font-medium text-rose-400">Error</span>
              <p className="text-xs text-neutral-400 mt-1">{job.error}</p>
            </div>
          </div>
        </div>
      )}

      {debug && (
        <details className="mt-2 border border-white/5 bg-black/50 p-4 rounded-sm text-xs text-neutral-500 font-mono">
          <summary className="cursor-pointer hover:text-white transition-colors">Full Job Data</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(job, null, 2)}</pre>
        </details>
      )}
    </SleekCard>
  );
};

// --- studio_breaking_news Renderer ---

const studioBreakingNewsRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput) as { 
    success?: boolean; 
    headline?: string;
    summary?: string;
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
        <StudioStatusBadge status="running" animated />
      </header>

      {/* Headline with ticker animation */}
      {payload.headline && (
        <motion.div 
          className="relative p-4 rounded-sm bg-gradient-to-r from-red-500/10 via-orange-500/10 to-red-500/10 border border-red-500/30 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {/* Breaking news bar */}
          <motion.div 
            className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500"
            animate={{ 
              backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
            }}
            transition={{ duration: 3, repeat: Infinity }}
            style={{ backgroundSize: "200% 200%" }}
          />

          <div className="flex items-center gap-2 mb-2">
            <motion.span 
              className="px-2 py-0.5 rounded-sm bg-red-500 text-white text-[9px] font-bold uppercase"
              animate={{ opacity: [1, 0.7, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              Breaking
            </motion.span>
            <span className="text-[9px] text-neutral-500">DEXTER NEWS</span>
          </div>
          
          <motion.p 
            className="text-xl font-black text-white leading-tight"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {payload.headline}
          </motion.p>

          {payload.summary && (
            <motion.p 
              className="text-sm text-neutral-300 mt-2"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {payload.summary}
            </motion.p>
          )}
        </motion.div>
      )}

      {/* Media Jobs */}
      {media.length > 0 && (
        <div className="flex flex-col gap-3">
          <SleekLabel>GENERATING MEDIA</SleekLabel>
          <div className="grid grid-cols-2 gap-3">
            {media.map((m, idx) => (
              <motion.div
                key={m.job_id || idx}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                className={`p-4 rounded-sm border relative overflow-hidden ${
                  m.type === "video" 
                    ? "bg-red-500/5 border-red-500/20" 
                    : "bg-blue-500/5 border-blue-500/20"
                }`}
              >
                {/* Preview placeholder or actual preview */}
                {m.preview_url ? (
                  <img 
                    src={m.preview_url} 
                    alt="Preview" 
                    className="w-full h-24 object-cover rounded-sm mb-3"
                  />
                ) : (
                  <div className="w-full h-24 bg-black/30 rounded-sm mb-3 flex items-center justify-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      {m.type === "video" ? (
                        <VideoIcon className="w-8 h-8 text-red-400/50" />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-blue-400/50" />
                      )}
                    </motion.div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${
                    m.type === "video" ? "text-red-400" : "text-blue-400"
                  }`}>
                    {m.type === "video" ? "Sora Video" : "Infographic"}
                  </span>
                  <span className="text-[9px] text-neutral-500 uppercase">
                    {m.status || "processing"}
                  </span>
                </div>

                {m.job_id && (
                  <code className="text-[9px] font-mono text-neutral-600 mt-1 block">
                    {m.job_id.slice(0, 12)}...
                  </code>
                )}
              </motion.div>
            ))}
          </div>
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
          className="flex items-center justify-center gap-2 p-3 rounded-sm bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
        >
          <span className="text-sm font-bold">View Media Jobs</span>
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
    media_urls?: string[];
    view_at?: string;
    error?: string;
  };
  const timestamp = formatTimestampDisplay(item.timestamp);

  if (item.status === "IN_PROGRESS") return <SleekLoadingCard />;
  
  if (payload.error || payload.success === false) {
    return <SleekErrorCard message={payload.error || "Failed to get status"} />;
  }

  const status = (payload.status || "pending") as JobStatus;
  const isComplete = status === "completed";

  return (
    <SleekCard className="relative overflow-visible p-6 flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <VideoIcon className="w-4 h-4 text-red-400" />
          <SleekLabel>News Media Status</SleekLabel>
        </div>
        <StudioStatusBadge status={status} animated={status === "running"} />
      </header>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricItem label="JOB ID" value={payload.job_id?.slice(0, 8) || "—"} />
        <MetricItem label="STATUS" value={status.toUpperCase()} />
        <MetricItem label="CREATED" value={formatTime(payload.created_at)} />
        <MetricItem label="ARTIFACTS" value={payload.artifacts?.toString() || "0"} />
      </div>

      {/* Media Previews */}
      {payload.media_urls && payload.media_urls.length > 0 && (
        <div className="flex flex-col gap-2">
          <SleekLabel>GENERATED MEDIA</SleekLabel>
          <div className="grid grid-cols-2 gap-2">
            {payload.media_urls.map((url, idx) => (
              <motion.a
                key={idx}
                href={url}
                target="_blank"
                rel="noreferrer"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="relative rounded-sm overflow-hidden border border-white/10 hover:border-red-500/30 transition-colors group"
              >
                {url.includes(".mp4") || url.includes("video") ? (
                  <video src={url} className="w-full h-32 object-cover" />
                ) : (
                  <img src={url} alt={`Media ${idx + 1}`} className="w-full h-32 object-cover" />
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ExternalLinkIcon className="w-6 h-6 text-white" />
                </div>
              </motion.a>
            ))}
          </div>
        </div>
      )}

      {/* Completed */}
      {isComplete && payload.completed_at && (
        <motion.div 
          className="p-4 rounded-sm bg-emerald-500/5 border border-emerald-500/20"
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
        >
          <div className="flex items-center gap-3">
            <CheckCircledIcon className="w-5 h-5 text-emerald-400" />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-emerald-400">Media Ready!</span>
              <span className="text-[10px] text-neutral-500">{formatTime(payload.completed_at)}</span>
            </div>
          </div>
        </motion.div>
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
