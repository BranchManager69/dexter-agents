"use client";

import { useEffect } from "react";
import type { RealtimeAgent } from "@openai/agents/realtime";
import { createPortal } from "react-dom";

interface DebugInfoModalProps {
  open: boolean;
  onClose: () => void;
  connectionStatus: string;
  identityLabel: string;
  mcpStatus: string;
  walletStatus: string;
  isAudioPlaybackEnabled: boolean;
  setIsAudioPlaybackEnabled: (value: boolean) => void;
  isEventsPaneExpanded: boolean;
  setIsEventsPaneExpanded: (value: boolean) => void;
  codec: string;
  onCodecChange: (codec: string) => void;
  buildTag: string;
  agents: RealtimeAgent[];
  selectedAgentName: string;
  onAgentChange: (agentName: string) => void;
  canManageAgents: boolean;
}

export function DebugInfoModal({
  open,
  onClose,
  connectionStatus,
  identityLabel,
  mcpStatus,
  walletStatus,
  isAudioPlaybackEnabled,
  setIsAudioPlaybackEnabled,
  isEventsPaneExpanded,
  setIsEventsPaneExpanded,
  codec,
  onCodecChange,
  buildTag,
  agents,
  selectedAgentName,
  onAgentChange,
  canManageAgents,
}: DebugInfoModalProps) {
  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  const shouldShowAgentSelector = canManageAgents && agents.length > 0;

  const getAgentDisplayName = (agentName: string) => {
    const displayNames: Record<string, string> = {
      dexterVoice: "Dexter Voice",
    };
    return displayNames[agentName] || agentName;
  };

  const modalContent = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div
          className="w-full max-w-sm rounded-lg border border-neutral-800/60 bg-surface-glass/95 p-6 shadow-elevated backdrop-blur-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-sm uppercase tracking-[0.28em] text-neutral-300">
              Debug Info
            </h2>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-200 transition-colors"
              aria-label="Close"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M15 5L5 15M5 5L15 15"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          {/* Status rows */}
          <div className="space-y-3 mb-6">
            {/* Identity */}
            <div className="flex items-center justify-between rounded-md bg-neutral-900/40 px-4 py-3">
              <span className="text-sm text-neutral-400">Identity</span>
              <span className="rounded-full bg-neutral-800/80 px-3 py-1 text-xs font-medium text-neutral-200">
                {identityLabel}
              </span>
            </div>

            {/* Connection */}
            <div className="flex items-center justify-between rounded-md bg-neutral-900/40 px-4 py-3">
              <span className="text-sm text-neutral-400">Connection</span>
              <span className="rounded-full bg-neutral-800/80 px-3 py-1 text-xs font-medium text-neutral-200">
                {connectionStatus}
              </span>
            </div>

            {/* MCP */}
            <div className="flex items-center justify-between rounded-md bg-neutral-900/40 px-4 py-3">
              <span className="text-sm text-neutral-400">MCP</span>
              <span className="rounded-full bg-neutral-800/80 px-3 py-1 text-xs font-medium text-neutral-200">
                {mcpStatus}
              </span>
            </div>

            {/* Wallet */}
            <div className="flex items-center justify-between rounded-md bg-neutral-900/40 px-4 py-3">
              <span className="text-sm text-neutral-400">Wallet</span>
              <span className="rounded-full bg-neutral-800/80 px-3 py-1 text-xs font-medium text-neutral-200">
                {walletStatus}
              </span>
            </div>

            {/* Build */}
            <div className="flex items-center justify-between rounded-md bg-neutral-900/40 px-4 py-3">
              <span className="text-sm text-neutral-400">Build</span>
              <span className="rounded-full bg-neutral-800/80 px-3 py-1 text-xs font-medium text-neutral-200">
                {buildTag}
              </span>
            </div>
          </div>

          {/* Controls section */}
          <div className="space-y-4 border-t border-neutral-800/60 pt-4">
            {/* Audio Playback */}
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-neutral-400">Audio Playback</span>
              <input
                type="checkbox"
                className="h-4 w-4 accent-flux cursor-pointer"
                checked={isAudioPlaybackEnabled}
                onChange={(e) => setIsAudioPlaybackEnabled(e.target.checked)}
              />
            </label>

            {/* Event Logs */}
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-neutral-400">Event Logs</span>
              <input
                type="checkbox"
                className="h-4 w-4 accent-iris cursor-pointer"
                checked={isEventsPaneExpanded}
                onChange={(e) => setIsEventsPaneExpanded(e.target.checked)}
              />
            </label>

            {/* Codec Selector */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-400">Audio Codec</span>
              <select
                value={codec}
                onChange={(e) => onCodecChange(e.target.value)}
                className="rounded-md border border-neutral-800/80 bg-surface-glass/60 px-3 py-1.5 text-xs text-neutral-200 outline-none transition focus:border-flux/60 focus:ring-2 focus:ring-flux/30"
              >
                <option value="opus">Opus (48k)</option>
                <option value="pcmu">PCMU (8k)</option>
                <option value="pcma">PCMA (8k)</option>
              </select>
            </div>

            {shouldShowAgentSelector && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-400">Agent</span>
                <select
                  value={selectedAgentName}
                  onChange={(e) => onAgentChange(e.target.value)}
                  className="rounded-md border border-neutral-800/80 bg-surface-glass/60 px-3 py-1.5 text-xs text-neutral-200 outline-none transition focus:border-rose-400/60 focus:ring-2 focus:ring-rose-300/30"
                >
                  {agents.map((agent) => (
                    <option key={agent.name} value={agent.name} className="bg-neutral-900 text-rose-100">
                      {getAgentDisplayName(agent.name)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}
