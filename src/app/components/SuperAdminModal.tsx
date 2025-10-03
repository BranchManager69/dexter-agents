"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

interface SuperAdminModalProps {
  open: boolean;
  onClose: () => void;
}

export function SuperAdminModal({ open, onClose }: SuperAdminModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const modalContent = (
    <>
      <div
        className="fixed inset-0 z-[10998] bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-0 z-[10999] flex items-center justify-center px-4 py-8">
        <div
          className="w-full max-w-md rounded-xl border border-amber-400/60 bg-neutral-950/95 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-amber-200/80">
                Superadmin Tools
              </p>
              <h2 className="mt-2 font-display text-lg text-amber-100">
                Prompt Segment Workbench
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-amber-300/40 p-1 text-amber-200 transition hover:border-amber-200/60 hover:text-amber-50"
              aria-label="Close superadmin panel"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 5l10 10" />
                <path d="M15 5l-10 10" />
              </svg>
            </button>
          </div>

          <div className="mt-5 space-y-4">
            <p className="text-sm leading-relaxed text-neutral-300">
              Live prompt segment editing is coming soon. This panel will let you inspect, tweak, and publish backend prompt modules without leaving the session.
            </p>
            <div className="rounded-lg border border-amber-400/30 bg-amber-500/5 p-4 text-xs text-amber-100/90">
              <p className="font-semibold uppercase tracking-[0.25em] text-[10px] text-amber-200">
                Preview Deck
              </p>
              <ul className="mt-2 space-y-1 text-[11px] text-amber-100/90">
                <li>• Review active prompt segments and inheritance order.</li>
                <li>• Stage edits safely with automatic diff snapshots.</li>
                <li>• Push updates with one-click redeploy (coming soon).</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-amber-300/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-amber-100 transition hover:border-amber-200 hover:text-amber-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}

export default SuperAdminModal;
