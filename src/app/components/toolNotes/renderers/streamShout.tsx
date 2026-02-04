"use client";

import React from "react";
import { 
  SpeakerLoudIcon,
  PersonIcon,
  ClockIcon,
} from "@radix-ui/react-icons";
import { motion } from "framer-motion";
import type { ToolNoteRenderer } from "./types";
import { normalizeOutput, unwrapStructured, formatTimestampDisplay } from "./helpers";
import { 
  SleekCard, 
  SleekLabel, 
  SleekLoadingCard,
} from "./sleekVisuals";
import { presets, staggerDelay } from "./motionPresets";

// --- Types ---

type Shout = {
  id?: string;
  message?: string;
  text?: string;
  alias?: string;
  expires_at?: string;
  expiresAt?: string;
  created_at?: string;
  createdAt?: string;
};

type ShoutPayload = {
  shout?: Shout & { shouts?: Shout[] };
  shouts?: Shout[];
  structured_content?: { shout?: Shout; shouts?: Shout[] };
  structuredContent?: { shout?: Shout; shouts?: Shout[] };
};

// --- Single Shout Card ---

function ShoutCard({ shout, index }: { shout: Shout; index: number }) {
  const message = shout.message?.trim() || shout.text?.trim() || "—";
  const alias = shout.alias?.trim() || null;
  const expiresAt = shout.expires_at || shout.expiresAt;
  const expiresDisplay = expiresAt ? formatTimestampDisplay(expiresAt) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={staggerDelay(index)}
      className="p-4 rounded-sm bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors"
    >
      {/* Message */}
      <p className="text-sm text-neutral-200 leading-relaxed">{message}</p>
      
      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5">
        <div className="flex items-center gap-2 text-[10px] text-neutral-500">
          <PersonIcon className="w-3 h-3" />
          <span>{alias || "Anonymous"}</span>
        </div>
        
        {expiresDisplay && (
          <div className="flex items-center gap-1 text-[10px] text-neutral-600">
            <ClockIcon className="w-3 h-3" />
            <span>{expiresDisplay}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// --- Feed View ---

function ShoutFeed({ shouts, timestamp }: { shouts: Shout[]; timestamp?: string | null }) {
  return (
    <SleekCard className="p-6 flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <motion.div {...presets.pulseSubtle}>
            <SpeakerLoudIcon className="w-4 h-4 text-cyan-400" />
          </motion.div>
          <SleekLabel>Stream Shouts</SleekLabel>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-cyan-400">{shouts.length} shouts</span>
          {timestamp && <span className="text-[10px] text-neutral-600 font-mono">{timestamp}</span>}
        </div>
      </header>

      {shouts.length === 0 ? (
        <div className="p-6 text-center">
          <SpeakerLoudIcon className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
          <p className="text-sm text-neutral-500">No shouts yet</p>
          <p className="text-xs text-neutral-600 mt-1">Be the first to shout!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
          {shouts.map((shout, idx) => (
            <ShoutCard key={shout.id || shout.created_at || `shout-${idx}`} shout={shout} index={idx} />
          ))}
        </div>
      )}
    </SleekCard>
  );
}

// --- Single Shout Confirmation ---

function ShoutConfirmation({ shout, timestamp }: { shout: Shout; timestamp?: string | null }) {
  const message = shout.message?.trim() || shout.text?.trim() || "Shout submitted.";
  const alias = shout.alias?.trim();
  const expiresAt = shout.expires_at || shout.expiresAt;
  const expiresDisplay = expiresAt ? formatTimestampDisplay(expiresAt) : null;

  return (
    <SleekCard className="p-6 flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <SpeakerLoudIcon className="w-4 h-4 text-emerald-400" />
          </motion.div>
          <SleekLabel>Shout Posted</SleekLabel>
        </div>
        {timestamp && <span className="text-[10px] text-neutral-600 font-mono">{timestamp}</span>}
      </header>

      {/* Success indicator */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-sm bg-emerald-500/5 border border-emerald-500/20"
      >
        <div className="flex items-start gap-3">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.1 }}
            className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0"
          >
            <span className="text-emerald-400 text-lg">✓</span>
          </motion.div>
          <div className="flex-1">
            <p className="text-sm text-neutral-200">{message}</p>
            <div className="flex items-center gap-4 mt-2 text-[10px] text-neutral-500">
              <span>Alias: {alias || "(auto-generated)"}</span>
              {expiresDisplay && <span>Expires: {expiresDisplay}</span>}
            </div>
          </div>
        </div>
      </motion.div>
    </SleekCard>
  );
}

// --- Main Renderer ---

const streamShoutRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const normalized = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const structured = unwrapStructured(normalized) as ShoutPayload;
  const timestamp = formatTimestampDisplay(item.timestamp);

  if (item.status === "IN_PROGRESS") return <SleekLoadingCard />;

  // Extract shout data from various possible structures
  const innerShout = structured?.shout ?? (structured as unknown as Shout);
  const shoutList = 
    structured?.shouts ||
    (structured?.shout as Shout & { shouts?: Shout[] })?.shouts ||
    (innerShout as Shout & { shouts?: Shout[] })?.shouts ||
    null;

  // If we have a feed of shouts, render the feed view
  if (shoutList && Array.isArray(shoutList) && shoutList.length > 0) {
    return (
      <>
        <ShoutFeed shouts={shoutList} timestamp={timestamp} />
        {debug && (
          <details className="mt-2 border border-white/5 bg-black/50 p-4 rounded-sm text-xs text-neutral-500 font-mono">
            <summary className="cursor-pointer hover:text-white transition-colors">Raw Payload</summary>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(normalized, null, 2)}</pre>
          </details>
        )}
      </>
    );
  }

  // Single shout confirmation
  return (
    <>
      <ShoutConfirmation shout={innerShout} timestamp={timestamp} />
      {debug && (
        <details className="mt-2 border border-white/5 bg-black/50 p-4 rounded-sm text-xs text-neutral-500 font-mono">
          <summary className="cursor-pointer hover:text-white transition-colors">Raw Payload</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(normalized, null, 2)}</pre>
        </details>
      )}
    </>
  );
};

export default streamShoutRenderer;
