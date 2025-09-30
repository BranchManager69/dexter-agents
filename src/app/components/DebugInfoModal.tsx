"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

interface DebugInfoModalProps {
  open: boolean;
  onClose: () => void;
  sessionStatus: string;
  mcpStatus: string;
  walletStatus: string;
}

export function DebugInfoModal({
  open,
  onClose,
  sessionStatus,
  mcpStatus,
  walletStatus,
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

          {/* Badge rows */}
          <div className="space-y-3">
            {/* Session */}
            <div className="flex items-center justify-between rounded-md bg-neutral-900/40 px-4 py-3">
              <span className="text-sm text-neutral-400">Session</span>
              <span className="rounded-full bg-neutral-800/80 px-3 py-1 text-xs font-medium text-neutral-200">
                {sessionStatus}
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
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}