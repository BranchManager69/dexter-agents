"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Job status values that indicate the job is still processing
 */
const PROCESSING_STATUSES = new Set([
  "processing",
  "running",
  "queued",
  "pending",
  "in_progress",
  "analyzing",
  "generating",
  "rendering",
  "initializing",
]);

/**
 * Job status values that indicate the job is complete (no more polling needed)
 */
const TERMINAL_STATUSES = new Set([
  "completed",
  "complete",
  "done",
  "success",
  "failed",
  "error",
  "cancelled",
  "canceled",
  "expired",
]);

type JobPollingOptions = {
  /** The job ID to poll for */
  jobId?: string | null;
  
  /** Current job status */
  status?: string | null;
  
  /** The MCP tool name to call for status updates */
  toolName: string;
  
  /** Additional arguments to pass to the tool (e.g., job_id) */
  toolArgs?: Record<string, unknown>;
  
  /** Initial polling interval in ms (default: 2000) */
  initialInterval?: number;
  
  /** Maximum polling interval in ms (default: 10000) */
  maxInterval?: number;
  
  /** Whether polling is enabled (default: true when status is processing) */
  enabled?: boolean;
  
  /** Callback when new data is received */
  onUpdate?: (data: unknown) => void;
  
  /** Callback when job completes */
  onComplete?: (data: unknown) => void;
  
  /** Callback when polling fails */
  onError?: (error: Error) => void;
};

type JobPollingResult<T = unknown> = {
  /** Latest data from the poll */
  data: T | null;
  
  /** Whether currently polling */
  isPolling: boolean;
  
  /** Any error from the last poll */
  error: Error | null;
  
  /** Number of polls completed */
  pollCount: number;
  
  /** Time until next poll (ms) */
  nextPollIn: number | null;
  
  /** Manually trigger a poll */
  poll: () => Promise<void>;
  
  /** Stop polling */
  stop: () => void;
  
  /** Start polling */
  start: () => void;
};

/**
 * Hook for polling job status from MCP tools.
 * 
 * Features:
 * - Exponential backoff (starts fast, slows down over time)
 * - Automatic stopping when job reaches terminal status
 * - Manual poll trigger
 * - Error handling with retry
 * 
 * @example
 * ```tsx
 * const { data, isPolling } = useJobPolling({
 *   jobId: job.id,
 *   status: job.status,
 *   toolName: "sora_video_job",
 *   toolArgs: { job_id: job.id },
 *   onComplete: (result) => console.log("Video ready:", result),
 * });
 * ```
 */
export function useJobPolling<T = unknown>(options: JobPollingOptions): JobPollingResult<T> {
  const {
    jobId,
    status,
    toolName,
    toolArgs = {},
    initialInterval = 2000,
    maxInterval = 10000,
    enabled,
    onUpdate,
    onComplete,
    onError,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const [nextPollIn, setNextPollIn] = useState<number | null>(null);
  const [manualEnabled, setManualEnabled] = useState<boolean | null>(null);

  // Refs for cleanup and state tracking
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const lastStatusRef = useRef<string | undefined>(status ?? undefined);

  // Determine if we should be polling
  const isProcessing = status ? PROCESSING_STATUSES.has(status.toLowerCase()) : false;
  const isTerminal = status ? TERMINAL_STATUSES.has(status.toLowerCase()) : false;
  const shouldPoll = enabled ?? (manualEnabled ?? (isProcessing && !isTerminal));

  // Calculate interval with exponential backoff
  const getInterval = useCallback((count: number) => {
    // Start at initialInterval, double each time, cap at maxInterval
    const interval = Math.min(initialInterval * Math.pow(1.5, count), maxInterval);
    return Math.round(interval);
  }, [initialInterval, maxInterval]);

  // Perform a single poll
  const doPoll = useCallback(async () => {
    if (!mountedRef.current) return;
    
    try {
      setError(null);
      
      const response = await fetch("/api/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          tool: toolName,
          arguments: { ...toolArgs, job_id: jobId },
        }),
      });

      if (!mountedRef.current) return;

      if (!response.ok) {
        throw new Error(`Poll failed: HTTP ${response.status}`);
      }

      const result = await response.json();
      if (!mountedRef.current) return;

      // Extract the actual data from various wrapper formats
      const payload =
        result?.structuredContent ??
        result?.structured_content ??
        result?.result ??
        result;

      setData(payload as T);
      setPollCount((c) => c + 1);
      onUpdate?.(payload);

      // Check if job completed
      const newStatus = (payload as any)?.status?.toLowerCase?.() ?? "";
      if (TERMINAL_STATUSES.has(newStatus)) {
        setIsPolling(false);
        setNextPollIn(null);
        onComplete?.(payload);
        return;
      }

      // Update status ref
      lastStatusRef.current = newStatus;
    } catch (err) {
      if (!mountedRef.current) return;
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
    }
  }, [jobId, toolName, toolArgs, onUpdate, onComplete, onError]);

  // Manual poll trigger
  const poll = useCallback(async () => {
    await doPoll();
  }, [doPoll]);

  // Start polling
  const start = useCallback(() => {
    setManualEnabled(true);
  }, []);

  // Stop polling
  const stop = useCallback(() => {
    setManualEnabled(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsPolling(false);
    setNextPollIn(null);
  }, []);

  // Main polling effect
  useEffect(() => {
    mountedRef.current = true;

    if (!shouldPoll || !jobId) {
      setIsPolling(false);
      setNextPollIn(null);
      return;
    }

    setIsPolling(true);

    const schedulePoll = () => {
      if (!mountedRef.current || !shouldPoll) return;

      const interval = getInterval(pollCount);
      setNextPollIn(interval);

      timeoutRef.current = setTimeout(async () => {
        if (!mountedRef.current) return;
        setNextPollIn(null);
        await doPoll();
        
        // Schedule next poll if still processing
        if (mountedRef.current && shouldPoll && !isTerminal) {
          schedulePoll();
        }
      }, interval);
    };

    // Initial poll immediately, then schedule
    doPoll().then(() => {
      if (mountedRef.current && shouldPoll && !isTerminal) {
        schedulePoll();
      }
    });

    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [shouldPoll, jobId, isTerminal, getInterval, pollCount, doPoll]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    data,
    isPolling,
    error,
    pollCount,
    nextPollIn,
    poll,
    stop,
    start,
  };
}

/**
 * Simple countdown timer hook for displaying time until next poll
 */
export function usePollCountdown(nextPollIn: number | null): number | null {
  const [countdown, setCountdown] = useState<number | null>(nextPollIn);
  
  useEffect(() => {
    if (nextPollIn === null) {
      setCountdown(null);
      return;
    }

    setCountdown(nextPollIn);
    const startTime = Date.now();
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, nextPollIn - elapsed);
      setCountdown(remaining);
      
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [nextPollIn]);

  return countdown;
}

/**
 * Check if a status string indicates the job is still processing
 */
export function isJobProcessing(status?: string | null): boolean {
  if (!status) return false;
  return PROCESSING_STATUSES.has(status.toLowerCase());
}

/**
 * Check if a status string indicates the job has completed (success or failure)
 */
export function isJobTerminal(status?: string | null): boolean {
  if (!status) return false;
  return TERMINAL_STATUSES.has(status.toLowerCase());
}

export default useJobPolling;
