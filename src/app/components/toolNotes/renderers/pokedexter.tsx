"use client";

import React, { useState } from "react";
import { 
  LightningBoltIcon,
  TargetIcon,
  TimerIcon,
  PersonIcon,
  CheckCircledIcon,
  CrossCircledIcon,
  RocketIcon,
  ReloadIcon,
  CopyIcon,
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
  formatUsdPrecise,
} from "./sleekVisuals";

// --- Types ---

type Challenge = {
  id: string;
  challengerId?: string;
  challengerWallet?: string;
  amount: number;
  format?: string;
  expiresAt?: string | number;
  status?: string;
  createdAt?: string | number;
};

type WagerStatus = {
  wagerId?: string;
  id?: string;
  status?: string;
  amount?: number;
  player1?: { wallet?: string; userId?: string; deposited?: boolean };
  player2?: { wallet?: string; userId?: string; deposited?: boolean };
  battleRoomId?: string;
  roomId?: string;
  winner?: string;
  settledAt?: string | number;
  escrowAddress?: string;
};

type QueueStatus = {
  position?: number;
  queueSize?: number;
  matched?: boolean;
  battleRoomId?: string;
  roomId?: string;
  amount?: number;
  format?: string;
  waitingSince?: string | number;
};

type BattleState = {
  battleId?: string;
  deposits?: {
    player1?: { deposited?: boolean; amount?: number };
    player2?: { deposited?: boolean; amount?: number };
  };
  totalPot?: number;
  status?: string;
};

type MoveResult = {
  ok?: boolean;
  submitted?: string;
  battleId?: string;
  note?: string;
};

// --- Pokémon-themed Colors ---
const POKE_COLORS = {
  primary: "from-red-500 to-red-700",
  secondary: "from-yellow-400 to-amber-500",
  accent: "from-blue-500 to-blue-700",
  success: "from-emerald-500 to-green-600",
  warning: "from-amber-500 to-orange-500",
};

// --- Pokeball Icon Component ---

const PokeballIcon = ({ size = 20, className = "" }: { size?: number; className?: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 32 32" 
    className={className}
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="16" cy="16" r="15" fill="#fff" stroke="#333" strokeWidth="2"/>
    <path d="M1 16h30" stroke="#333" strokeWidth="2"/>
    <path d="M1 16a15 15 0 0 1 30 0" fill="#ef4444"/>
    <circle cx="16" cy="16" r="5" fill="#fff" stroke="#333" strokeWidth="2"/>
    <circle cx="16" cy="16" r="2.5" fill="#333"/>
  </svg>
);

// --- Battle Icon Component ---

const BattleIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M13 10V3L4 14h7v7l9-11h-7z" fill="currentColor"/>
  </svg>
);

// --- Status Badge ---

type StatusType = "pending" | "active" | "matched" | "completed" | "cancelled" | "waiting" | "confirmed";

function PokeBadge({ status }: { status: StatusType }) {
  const configs: Record<StatusType, { label: string; className: string }> = {
    pending: { label: "Pending", className: "bg-amber-500/10 border-amber-500/20 text-amber-400" },
    active: { label: "Active", className: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" },
    matched: { label: "Matched!", className: "bg-violet-500/10 border-violet-500/20 text-violet-400" },
    completed: { label: "Completed", className: "bg-blue-500/10 border-blue-500/20 text-blue-400" },
    cancelled: { label: "Cancelled", className: "bg-neutral-500/10 border-neutral-500/20 text-neutral-400" },
    waiting: { label: "In Queue", className: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" },
    confirmed: { label: "Confirmed", className: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" },
  };

  const config = configs[status] || configs.pending;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm border text-[9px] font-bold uppercase tracking-wider ${config.className}`}>
      {config.label}
    </span>
  );
}

// --- Wager Amount Display ---

function WagerAmount({ amount, size = "md" }: { amount: number; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "text-sm",
    md: "text-xl",
    lg: "text-3xl",
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`${sizeClasses[size]} font-black bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent tabular-nums`}>
        ${amount}
      </div>
      <span className="text-[9px] text-neutral-500 uppercase">USDC</span>
    </div>
  );
}

// --- Challenge Card ---

function ChallengeCard({ challenge, index }: { challenge: Challenge; index: number }) {
  const expiresAt = challenge.expiresAt 
    ? new Date(typeof challenge.expiresAt === "number" ? challenge.expiresAt * 1000 : challenge.expiresAt)
    : null;
  const isExpiringSoon = expiresAt && expiresAt.getTime() - Date.now() < 5 * 60 * 1000;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className={`relative p-4 rounded-sm border bg-gradient-to-br from-neutral-900/90 to-neutral-800/50 ${
        isExpiringSoon ? "border-amber-500/30" : "border-white/5"
      }`}
    >
      {/* Pokeball Decoration */}
      <div className="absolute top-2 right-2 opacity-10">
        <PokeballIcon size={40} />
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          {/* Challenger */}
          <div className="flex items-center gap-2">
            <PersonIcon className="w-3 h-3 text-neutral-500" />
            <span className="text-[10px] font-mono text-neutral-400">
              {challenge.challengerId || challenge.challengerWallet?.slice(0, 8) || "Anonymous"}
            </span>
          </div>
          
          {/* Format */}
          <span className="text-xs text-neutral-300 font-medium">
            {challenge.format || "gen9randombattle"}
          </span>
        </div>

        {/* Wager */}
        <div className="flex flex-col items-end gap-2">
          <WagerAmount amount={challenge.amount} size="md" />
          
          {/* Expiration */}
          {expiresAt && (
            <div className={`flex items-center gap-1 text-[9px] ${
              isExpiringSoon ? "text-amber-400" : "text-neutral-500"
            }`}>
              <TimerIcon className="w-3 h-3" />
              {isExpiringSoon ? "Expiring soon" : expiresAt.toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>

      {/* Challenge ID */}
      <div className="mt-3 pt-3 border-t border-white/5">
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-neutral-600">ID: {challenge.id}</span>
          <span className="text-[9px] text-red-400 font-bold">
            ACCEPT TO BATTLE
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// --- List Challenges Renderer ---

const listChallengesRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput) as { challenges?: Challenge[]; data?: Challenge[] };
  const timestamp = formatTimestampDisplay(item.timestamp);

  if (item.status === "IN_PROGRESS") return <SleekLoadingCard />;

  const challenges = payload.challenges || payload.data || [];

  return (
    <SleekCard className="relative overflow-visible p-6 flex flex-col gap-5">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PokeballIcon size={18} />
          <SleekLabel>Open Challenges</SleekLabel>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-red-400">{challenges.length} available</span>
          {timestamp && <span className="text-[10px] text-neutral-600 font-mono">{timestamp}</span>}
        </div>
      </header>

      {/* Challenges List */}
      {challenges.length === 0 ? (
        <div className="p-6 text-center">
          <PokeballIcon size={48} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm text-neutral-500">No open challenges right now</p>
          <p className="text-xs text-neutral-600 mt-1">Create one with pokedexter_create_challenge!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto">
          {challenges.map((challenge, idx) => (
            <ChallengeCard key={challenge.id} challenge={challenge} index={idx} />
          ))}
        </div>
      )}

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

// --- Wager Status Renderer ---

function WagerStatusView({ wager }: { wager: WagerStatus }) {
  const wagerId = wager.wagerId || wager.id;
  const roomId = wager.battleRoomId || wager.roomId;
  const status: StatusType = wager.winner ? "completed" : wager.status === "active" ? "active" : "pending";

  return (
    <div className="flex flex-col gap-5">
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-sm bg-gradient-to-br from-red-500/20 to-amber-500/20 border border-white/10 flex items-center justify-center">
            <BattleIcon size={24} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold text-white">Wager Match</span>
            <span className="text-[10px] text-neutral-500 font-mono">#{wagerId}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <WagerAmount amount={wager.amount || 0} />
          <PokeBadge status={status} />
        </div>
      </div>

      {/* Players */}
      <div className="grid grid-cols-2 gap-4">
        {/* Player 1 */}
        <div className={`p-3 rounded-sm border ${
          wager.player1?.deposited 
            ? "bg-emerald-500/5 border-emerald-500/20" 
            : "bg-neutral-800/50 border-white/5"
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] text-neutral-500 uppercase">Player 1</span>
            {wager.player1?.deposited && <CheckCircledIcon className="w-3 h-3 text-emerald-400" />}
          </div>
          <span className="text-xs font-mono text-neutral-300">
            {wager.player1?.wallet?.slice(0, 8) || wager.player1?.userId || "—"}
          </span>
        </div>

        {/* Player 2 */}
        <div className={`p-3 rounded-sm border ${
          wager.player2?.deposited 
            ? "bg-emerald-500/5 border-emerald-500/20" 
            : "bg-neutral-800/50 border-white/5"
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] text-neutral-500 uppercase">Player 2</span>
            {wager.player2?.deposited && <CheckCircledIcon className="w-3 h-3 text-emerald-400" />}
          </div>
          <span className="text-xs font-mono text-neutral-300">
            {wager.player2?.wallet?.slice(0, 8) || wager.player2?.userId || "Waiting..."}
          </span>
        </div>
      </div>

      {/* Winner (if completed) */}
      {wager.winner && (
        <div className="p-4 rounded-sm bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏆</span>
            <div className="flex flex-col">
              <span className="text-[9px] text-neutral-500 uppercase">Winner</span>
              <span className="text-sm font-bold text-yellow-400">{wager.winner}</span>
            </div>
          </div>
        </div>
      )}

      {/* Battle Room Link */}
      {roomId && (
        <div className="flex items-center justify-between p-3 rounded-sm bg-white/[0.02] border border-white/5">
          <div className="flex flex-col">
            <span className="text-[9px] text-neutral-500 uppercase">Battle Room</span>
            <span className="text-xs font-mono text-neutral-300">{roomId}</span>
          </div>
          <a
            href={`https://poke.dexter.cash/battle/${roomId}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-300 transition-colors"
          >
            Watch Battle <ExternalLinkIcon className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* Escrow Address */}
      {wager.escrowAddress && (
        <div className="flex items-center justify-between p-3 rounded-sm bg-white/[0.02] border border-white/5">
          <div className="flex flex-col">
            <span className="text-[9px] text-neutral-500 uppercase">Escrow</span>
            <span className="text-[10px] font-mono text-neutral-400">
              {wager.escrowAddress.slice(0, 12)}...{wager.escrowAddress.slice(-8)}
            </span>
          </div>
          <a
            href={`https://solscan.io/account/${wager.escrowAddress}`}
            target="_blank"
            rel="noreferrer"
            className="text-[10px] text-neutral-500 hover:text-white transition-colors"
          >
            View ↗
          </a>
        </div>
      )}
    </div>
  );
}

const wagerStatusRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput) as WagerStatus & { ok?: boolean; error?: string };
  const timestamp = formatTimestampDisplay(item.timestamp);

  if (item.status === "IN_PROGRESS") return <SleekLoadingCard />;
  if (payload.error || payload.ok === false) {
    return <SleekErrorCard message={payload.error || "Failed to get wager status"} />;
  }

  return (
    <SleekCard className="relative overflow-visible p-6 flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PokeballIcon size={18} />
          <SleekLabel>Wager Status</SleekLabel>
        </div>
        {timestamp && <span className="text-[10px] text-neutral-600 font-mono">{timestamp}</span>}
      </header>

      <WagerStatusView wager={payload} />

      {debug && (
        <details className="mt-2 border border-white/5 bg-black/50 p-4 rounded-sm text-xs text-neutral-500 font-mono">
          <summary className="cursor-pointer hover:text-white transition-colors">Raw Payload</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(rawOutput, null, 2)}</pre>
        </details>
      )}
    </SleekCard>
  );
};

// --- Queue Status Renderer ---

const queueStatusRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput) as QueueStatus & { ok?: boolean; error?: string };
  const timestamp = formatTimestampDisplay(item.timestamp);

  if (item.status === "IN_PROGRESS") return <SleekLoadingCard />;
  if (payload.error || payload.ok === false) {
    return <SleekErrorCard message={payload.error || "Failed to get queue status"} />;
  }

  const status: StatusType = payload.matched ? "matched" : "waiting";
  const roomId = payload.battleRoomId || payload.roomId;

  return (
    <SleekCard className="relative overflow-visible p-6 flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ReloadIcon className={`w-4 h-4 text-cyan-400 ${!payload.matched ? "animate-spin" : ""}`} />
          <SleekLabel>Queue Status</SleekLabel>
        </div>
        <PokeBadge status={status} />
      </header>

      {payload.matched ? (
        <div className="p-4 rounded-sm bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚔️</span>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-violet-400">Match Found!</span>
              {roomId && (
                <a
                  href={`https://poke.dexter.cash/battle/${roomId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-neutral-400 hover:text-white transition-colors"
                >
                  Join Battle: {roomId}
                </a>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            <MetricItem label="POSITION" value={`#${payload.position || 1}`} />
            <MetricItem label="IN QUEUE" value={`${payload.queueSize || 1} players`} />
            <MetricItem label="WAGER" value={`$${payload.amount || "—"}`} />
          </div>

          <div className="p-4 rounded-sm bg-cyan-500/5 border border-cyan-500/20">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <PokeballIcon size={24} />
              </motion.div>
              <div className="flex flex-col">
                <span className="text-sm text-cyan-400">Searching for opponent...</span>
                <span className="text-[10px] text-neutral-500">
                  {payload.format || "gen9randombattle"}
                </span>
              </div>
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

// --- Battle State Renderer ---

const battleStateRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput) as BattleState & { ok?: boolean; error?: string };
  const timestamp = formatTimestampDisplay(item.timestamp);

  if (item.status === "IN_PROGRESS") return <SleekLoadingCard />;
  if (payload.error || payload.ok === false) {
    return <SleekErrorCard message={payload.error || "Failed to get battle state"} />;
  }

  const p1Deposited = payload.deposits?.player1?.deposited;
  const p2Deposited = payload.deposits?.player2?.deposited;
  const bothDeposited = p1Deposited && p2Deposited;

  return (
    <SleekCard className="relative overflow-visible p-6 flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BattleIcon size={18} />
          <SleekLabel>Battle State</SleekLabel>
        </div>
        <PokeBadge status={bothDeposited ? "active" : "pending"} />
      </header>

      {/* Deposit Status */}
      <div className="grid grid-cols-2 gap-4">
        <div className={`p-4 rounded-sm border text-center ${
          p1Deposited ? "bg-emerald-500/5 border-emerald-500/20" : "bg-amber-500/5 border-amber-500/20"
        }`}>
          <span className="text-[9px] text-neutral-500 uppercase block mb-2">Player 1</span>
          {p1Deposited ? (
            <CheckCircledIcon className="w-8 h-8 mx-auto text-emerald-400" />
          ) : (
            <TimerIcon className="w-8 h-8 mx-auto text-amber-400" />
          )}
          <span className={`text-xs mt-2 block ${p1Deposited ? "text-emerald-400" : "text-amber-400"}`}>
            {p1Deposited ? "Deposited" : "Pending"}
          </span>
        </div>

        <div className={`p-4 rounded-sm border text-center ${
          p2Deposited ? "bg-emerald-500/5 border-emerald-500/20" : "bg-amber-500/5 border-amber-500/20"
        }`}>
          <span className="text-[9px] text-neutral-500 uppercase block mb-2">Player 2</span>
          {p2Deposited ? (
            <CheckCircledIcon className="w-8 h-8 mx-auto text-emerald-400" />
          ) : (
            <TimerIcon className="w-8 h-8 mx-auto text-amber-400" />
          )}
          <span className={`text-xs mt-2 block ${p2Deposited ? "text-emerald-400" : "text-amber-400"}`}>
            {p2Deposited ? "Deposited" : "Pending"}
          </span>
        </div>
      </div>

      {/* Total Pot */}
      {payload.totalPot && (
        <div className="p-4 rounded-sm bg-gradient-to-r from-yellow-500/5 to-amber-500/5 border border-yellow-500/20 text-center">
          <span className="text-[9px] text-neutral-500 uppercase block mb-1">Total Pot</span>
          <WagerAmount amount={payload.totalPot} size="lg" />
        </div>
      )}

      {/* Ready State */}
      {bothDeposited && (
        <div className="p-4 rounded-sm bg-emerald-500/5 border border-emerald-500/20">
          <div className="flex items-center justify-center gap-3">
            <LightningBoltIcon className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-bold text-emerald-400">Battle Ready!</span>
          </div>
        </div>
      )}

      {/* Battle ID */}
      {payload.battleId && (
        <div className="text-center">
          <span className="text-[9px] text-neutral-600">Battle ID: {payload.battleId}</span>
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

// --- Make Move Renderer ---

const makeMoveRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput) as MoveResult & { error?: string };
  const timestamp = formatTimestampDisplay(item.timestamp);

  if (item.status === "IN_PROGRESS") return <SleekLoadingCard />;
  if (payload.error || payload.ok === false) {
    return <SleekErrorCard message={payload.error || "Failed to submit move"} />;
  }

  return (
    <SleekCard className="relative overflow-visible p-6 flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TargetIcon className="w-4 h-4 text-red-400" />
          <SleekLabel>Move Submitted</SleekLabel>
        </div>
        <PokeBadge status="confirmed" />
      </header>

      {/* Move Display */}
      <div className="p-6 rounded-sm bg-gradient-to-br from-red-500/10 to-amber-500/10 border border-red-500/20 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
        >
          <span className="text-2xl font-black text-white">{payload.submitted}</span>
        </motion.div>
      </div>

      {/* Info */}
      <div className="grid grid-cols-2 gap-3">
        <MetricItem label="BATTLE ID" value={payload.battleId || "—"} />
        <MetricItem label="STATUS" value="Recorded" />
      </div>

      {payload.note && (
        <p className="text-xs text-neutral-500 text-center">{payload.note}</p>
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

// --- Generic Success Renderer (for create/accept/join) ---

function createSuccessRenderer(title: string, icon: React.ReactNode): ToolNoteRenderer {
  return ({ item, debug = false }) => {
    const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
    const payload = unwrapStructured(rawOutput) as {
      ok?: boolean;
      error?: string;
      challengeId?: string;
      wagerId?: string;
      battleRoomId?: string;
      roomId?: string;
      amount?: number;
      format?: string;
      escrowAddress?: string;
      depositRequired?: boolean;
      position?: number;
    };
    const timestamp = formatTimestampDisplay(item.timestamp);

    if (item.status === "IN_PROGRESS") return <SleekLoadingCard />;
    if (payload.error || payload.ok === false) {
      return <SleekErrorCard message={payload.error || `${title} failed`} />;
    }

    const roomId = payload.battleRoomId || payload.roomId;

    return (
      <SleekCard className="relative overflow-visible p-6 flex flex-col gap-5">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <SleekLabel>{title}</SleekLabel>
          </div>
          <PokeBadge status="confirmed" />
        </header>

        {/* Success Animation */}
        <motion.div 
          className="p-6 rounded-sm bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20 text-center"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring" }}
        >
          <CheckCircledIcon className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <span className="text-sm text-emerald-400 font-bold">Success!</span>
        </motion.div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-3">
          {payload.amount && <MetricItem label="WAGER" value={`$${payload.amount}`} />}
          {payload.format && <MetricItem label="FORMAT" value={payload.format} />}
          {payload.challengeId && <MetricItem label="CHALLENGE ID" value={payload.challengeId} />}
          {payload.wagerId && <MetricItem label="WAGER ID" value={payload.wagerId} />}
          {payload.position && <MetricItem label="QUEUE POSITION" value={`#${payload.position}`} />}
        </div>

        {/* Battle Room Link */}
        {roomId && (
          <a
            href={`https://poke.dexter.cash/battle/${roomId}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 p-3 rounded-sm bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <BattleIcon size={16} />
            <span className="text-sm font-bold">Enter Battle Room</span>
            <ExternalLinkIcon className="w-4 h-4" />
          </a>
        )}

        {/* Escrow Address */}
        {payload.escrowAddress && (
          <div className="p-3 rounded-sm bg-white/[0.02] border border-white/5">
            <span className="text-[9px] text-neutral-500 uppercase block mb-1">Deposit To</span>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-neutral-300">
                {payload.escrowAddress.slice(0, 16)}...{payload.escrowAddress.slice(-8)}
              </span>
              <button
                onClick={() => navigator.clipboard.writeText(payload.escrowAddress!)}
                className="text-neutral-500 hover:text-white transition-colors"
              >
                <CopyIcon className="w-4 h-4" />
              </button>
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
}

// --- Export all renderers ---

export const pokedexterListChallengesRenderer = listChallengesRenderer;
export const pokedexterGetBattleStateRenderer = battleStateRenderer;
export const pokedexterMakeMoveRenderer = makeMoveRenderer;
export const pokedexterGetActiveWagerRenderer = wagerStatusRenderer;
export const pokedexterGetWagerStatusRenderer = wagerStatusRenderer;
export const pokedexterCreateChallengeRenderer = createSuccessRenderer("Challenge Created", <PokeballIcon size={18} />);
export const pokedexterAcceptChallengeRenderer = createSuccessRenderer("Challenge Accepted", <LightningBoltIcon className="w-4 h-4 text-amber-400" />);
export const pokedexterJoinQueueRenderer = createSuccessRenderer("Joined Queue", <RocketIcon className="w-4 h-4 text-cyan-400" />);
export const pokedexterQueueStatusRenderer = queueStatusRenderer;
