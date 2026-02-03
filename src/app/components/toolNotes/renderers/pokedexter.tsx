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
  ExternalLinkIcon,
  StarFilledIcon,
  HeartFilledIcon,
  CounterClockwiseClockIcon,
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

type Pokemon = {
  name?: string;
  species?: string;
  hp?: number;
  maxHp?: number;
  level?: number;
  types?: string[];
  status?: string;
  moves?: string[];
};

type BattlePlayer = {
  odette?: string;
  odile?: string;
  name?: string;
  odette_pokemon?: Pokemon;
  odile_pokemon?: Pokemon;
  pokemon?: Pokemon;
  team?: Pokemon[];
  active?: Pokemon;
};

type BattleState = {
  battleId?: string;
  roomId?: string;
  p1?: BattlePlayer;
  p2?: BattlePlayer;
  turn?: number;
  weather?: string;
  terrain?: string;
  status?: string;
  winner?: string;
  deposits?: {
    player1?: { deposited?: boolean; amount?: number };
    player2?: { deposited?: boolean; amount?: number };
  };
  totalPot?: number;
};

type WagerStatus = {
  wagerId?: string;
  id?: string;
  status?: string;
  amount?: number;
  player1?: { wallet?: string; userId?: string; deposited?: boolean; pokemon?: Pokemon };
  player2?: { wallet?: string; userId?: string; deposited?: boolean; pokemon?: Pokemon };
  battleRoomId?: string;
  roomId?: string;
  winner?: string;
  settledAt?: string | number;
  escrowAddress?: string;
  payout?: number;
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
  estimatedWait?: number;
};

type MoveResult = {
  ok?: boolean;
  submitted?: string;
  battleId?: string;
  note?: string;
  damage?: number;
  effectiveness?: string;
  critical?: boolean;
};

// --- Pokemon Type Colors ---

const TYPE_COLORS: Record<string, string> = {
  normal: "bg-neutral-400",
  fire: "bg-orange-500",
  water: "bg-blue-500",
  electric: "bg-yellow-400",
  grass: "bg-green-500",
  ice: "bg-cyan-300",
  fighting: "bg-red-700",
  poison: "bg-purple-500",
  ground: "bg-amber-600",
  flying: "bg-indigo-300",
  psychic: "bg-pink-500",
  bug: "bg-lime-500",
  rock: "bg-amber-700",
  ghost: "bg-purple-700",
  dragon: "bg-violet-600",
  dark: "bg-neutral-700",
  steel: "bg-slate-400",
  fairy: "bg-pink-300",
};

// --- Pokeball Animated Component ---

const PokeballIcon = ({ size = 20, animate = false }: { size?: number; animate?: boolean }) => (
  <motion.svg 
    width={size} 
    height={size} 
    viewBox="0 0 32 32" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    animate={animate ? { rotate: [0, -10, 10, -10, 0] } : undefined}
    transition={animate ? { duration: 0.5, repeat: Infinity, repeatDelay: 2 } : undefined}
  >
    <circle cx="16" cy="16" r="15" fill="#fff" stroke="#333" strokeWidth="2"/>
    <path d="M1 16h30" stroke="#333" strokeWidth="2"/>
    <path d="M1 16a15 15 0 0 1 30 0" fill="#ef4444"/>
    <circle cx="16" cy="16" r="5" fill="#fff" stroke="#333" strokeWidth="2"/>
    <circle cx="16" cy="16" r="2.5" fill="#333"/>
  </motion.svg>
);

// --- Battle Icon ---

const BattleIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M13 10V3L4 14h7v7l9-11h-7z" fill="currentColor"/>
  </svg>
);

// --- Status Badge ---

type StatusType = "pending" | "active" | "matched" | "completed" | "cancelled" | "waiting" | "confirmed" | "battle";

function PokeBadge({ status }: { status: StatusType }) {
  const configs: Record<StatusType, { label: string; className: string; icon?: React.ReactNode }> = {
    pending: { label: "Pending", className: "bg-amber-500/10 border-amber-500/20 text-amber-400" },
    active: { label: "Active", className: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400", icon: <LightningBoltIcon className="w-3 h-3" /> },
    matched: { label: "Matched!", className: "bg-violet-500/10 border-violet-500/20 text-violet-400", icon: <StarFilledIcon className="w-3 h-3" /> },
    completed: { label: "Completed", className: "bg-blue-500/10 border-blue-500/20 text-blue-400", icon: <CheckCircledIcon className="w-3 h-3" /> },
    cancelled: { label: "Cancelled", className: "bg-neutral-500/10 border-neutral-500/20 text-neutral-400" },
    waiting: { label: "In Queue", className: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400", icon: <ReloadIcon className="w-3 h-3 animate-spin" /> },
    confirmed: { label: "Confirmed", className: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400", icon: <CheckCircledIcon className="w-3 h-3" /> },
    battle: { label: "Battle!", className: "bg-red-500/10 border-red-500/20 text-red-400", icon: <BattleIcon size={12} /> },
  };

  const config = configs[status] || configs.pending;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm border text-[9px] font-bold uppercase tracking-wider ${config.className}`}>
      {config.icon}
      {config.label}
    </span>
  );
}

// --- Type Badge ---

function TypeBadge({ type }: { type: string }) {
  const bgColor = TYPE_COLORS[type.toLowerCase()] || TYPE_COLORS.normal;
  return (
    <span className={`px-1.5 py-0.5 rounded-sm text-[8px] font-bold uppercase text-white ${bgColor}`}>
      {type}
    </span>
  );
}

// --- Animated Wager Amount ---

function WagerAmount({ amount, size = "md", pulse = false }: { amount: number; size?: "sm" | "md" | "lg"; pulse?: boolean }) {
  const sizeClasses = {
    sm: "text-sm",
    md: "text-xl",
    lg: "text-3xl",
  };

  return (
    <motion.div 
      className="flex items-center gap-2"
      animate={pulse ? { scale: [1, 1.05, 1] } : undefined}
      transition={pulse ? { duration: 1.5, repeat: Infinity } : undefined}
    >
      <div className={`${sizeClasses[size]} font-black bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent tabular-nums`}>
        ${amount}
      </div>
      <span className="text-[9px] text-neutral-500 uppercase">USDC</span>
    </motion.div>
  );
}

// --- HP Bar Component ---

function HPBar({ current, max, name, level }: { current: number; max: number; name?: string; level?: number }) {
  const percentage = Math.max(0, Math.min(100, (current / max) * 100));
  const hpColor = percentage > 50 ? "bg-emerald-500" : percentage > 20 ? "bg-amber-500" : "bg-rose-500";

  return (
    <div className="flex flex-col gap-1">
      {name && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white capitalize">{name}</span>
          {level && <span className="text-[9px] text-neutral-500">Lv.{level}</span>}
        </div>
      )}
      <div className="relative h-3 bg-neutral-800 rounded-full overflow-hidden border border-white/10">
        <motion.div
          className={`absolute inset-y-0 left-0 ${hpColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
        <div className="absolute inset-0 flex items-center justify-end pr-1">
          <span className="text-[8px] font-bold text-white drop-shadow-md">
            {current}/{max}
          </span>
        </div>
      </div>
    </div>
  );
}

// --- Pokemon Card ---

function PokemonCard({ pokemon, side }: { pokemon?: Pokemon; side: "left" | "right" }) {
  if (!pokemon) return null;

  const alignment = side === "left" ? "items-start" : "items-end text-right";

  return (
    <motion.div
      initial={{ opacity: 0, x: side === "left" ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex flex-col gap-2 ${alignment}`}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-white capitalize">{pokemon.species || pokemon.name}</span>
        {pokemon.level && <span className="text-[9px] text-neutral-500">Lv.{pokemon.level}</span>}
      </div>
      
      {pokemon.types && pokemon.types.length > 0 && (
        <div className="flex gap-1">
          {pokemon.types.map(t => <TypeBadge key={t} type={t} />)}
        </div>
      )}

      {pokemon.hp !== undefined && pokemon.maxHp && (
        <div className="w-32">
          <HPBar current={pokemon.hp} max={pokemon.maxHp} />
        </div>
      )}

      {pokemon.status && pokemon.status !== "none" && (
        <span className="px-1.5 py-0.5 rounded-sm bg-purple-500/20 text-[8px] text-purple-400 uppercase">
          {pokemon.status}
        </span>
      )}
    </motion.div>
  );
}

// --- Battle Arena Visualization ---

function BattleArena({ p1, p2, turn, weather }: { p1?: BattlePlayer; p2?: BattlePlayer; turn?: number; weather?: string }) {
  const p1Pokemon = p1?.active || p1?.pokemon || p1?.odette_pokemon;
  const p2Pokemon = p2?.active || p2?.pokemon || p2?.odile_pokemon;

  return (
    <div className="relative p-4 rounded-sm bg-gradient-to-b from-sky-900/20 via-green-900/20 to-amber-900/20 border border-white/10 overflow-hidden">
      {/* Weather overlay */}
      {weather && weather !== "none" && (
        <div className="absolute inset-0 pointer-events-none">
          {weather === "rain" && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-b from-blue-500/10 to-transparent"
              animate={{ opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
          {weather === "sun" && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-b from-yellow-500/10 to-transparent"
              animate={{ opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
        </div>
      )}

      {/* Turn indicator */}
      {turn !== undefined && (
        <div className="absolute top-2 right-2 px-2 py-1 rounded-sm bg-black/50 text-[9px] text-white">
          Turn {turn}
        </div>
      )}

      {/* Pokemon sides */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <span className="text-[9px] text-neutral-500 uppercase mb-2 block">Player 1</span>
          <PokemonCard pokemon={p1Pokemon} side="left" />
        </div>

        {/* VS divider */}
        <div className="flex flex-col items-center gap-2">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-2xl font-black text-red-500"
          >
            VS
          </motion.div>
          {weather && weather !== "none" && (
            <span className="text-[8px] text-neutral-400 capitalize">{weather}</span>
          )}
        </div>

        <div className="flex-1">
          <span className="text-[9px] text-neutral-500 uppercase mb-2 block text-right">Player 2</span>
          <PokemonCard pokemon={p2Pokemon} side="right" />
        </div>
      </div>
    </div>
  );
}

// --- Challenge Card ---

function ChallengeCard({ challenge, index }: { challenge: Challenge; index: number }) {
  const expiresAt = challenge.expiresAt 
    ? new Date(typeof challenge.expiresAt === "number" ? challenge.expiresAt * 1000 : challenge.expiresAt)
    : null;
  const isExpiringSoon = expiresAt && expiresAt.getTime() - Date.now() < 5 * 60 * 1000;
  const timeLeft = expiresAt ? Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000)) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
      className={`relative p-4 rounded-sm border bg-gradient-to-br from-neutral-900/90 to-neutral-800/50 cursor-pointer ${
        isExpiringSoon ? "border-amber-500/30" : "border-white/5"
      }`}
    >
      {/* Animated pokeball in corner */}
      <div className="absolute top-2 right-2">
        <PokeballIcon size={32} animate={isExpiringSoon} />
      </div>

      <div className="flex items-start justify-between gap-4 pr-10">
        <div className="flex flex-col gap-2">
          {/* Challenger */}
          <div className="flex items-center gap-2">
            <PersonIcon className="w-3 h-3 text-neutral-500" />
            <span className="text-[10px] font-mono text-neutral-400">
              {challenge.challengerId || challenge.challengerWallet?.slice(0, 8) || "Anonymous"}
            </span>
          </div>
          
          {/* Format badge */}
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-sm bg-violet-500/10 border border-violet-500/20 text-xs text-violet-400 w-fit">
            <RocketIcon className="w-3 h-3" />
            {challenge.format || "gen9randombattle"}
          </span>
        </div>

        {/* Wager */}
        <div className="flex flex-col items-end gap-2">
          <WagerAmount amount={challenge.amount} size="md" />
          
          {/* Timer */}
          {timeLeft !== null && (
            <motion.div 
              className={`flex items-center gap-1 text-[10px] ${
                isExpiringSoon ? "text-amber-400" : "text-neutral-500"
              }`}
              animate={isExpiringSoon ? { opacity: [1, 0.5, 1] } : undefined}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <TimerIcon className="w-3 h-3" />
              {timeLeft > 60 ? `${Math.floor(timeLeft / 60)}m` : `${timeLeft}s`}
            </motion.div>
          )}
        </div>
      </div>

      {/* Accept prompt */}
      <motion.div 
        className="mt-3 pt-3 border-t border-white/5 text-center"
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">
          Click to Accept Challenge
        </span>
      </motion.div>
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
          <motion.span 
            className="text-xs font-bold text-red-400"
            animate={{ scale: challenges.length > 0 ? [1, 1.1, 1] : 1 }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {challenges.length} available
          </motion.span>
          {timestamp && <span className="text-[10px] text-neutral-600 font-mono">{timestamp}</span>}
        </div>
      </header>

      {/* Challenges List */}
      {challenges.length === 0 ? (
        <div className="p-8 text-center">
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <PokeballIcon size={64} />
          </motion.div>
          <p className="text-sm text-neutral-500 mt-4">No challengers waiting...</p>
          <p className="text-xs text-neutral-600 mt-1">Create one to start battling!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto">
          {challenges.map((challenge, idx) => (
            <ChallengeCard key={challenge.id} challenge={challenge} index={idx} />
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
  const hasWinner = !!payload.winner;

  return (
    <SleekCard className="relative overflow-visible p-6 flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BattleIcon size={18} />
          <SleekLabel>Battle State</SleekLabel>
        </div>
        <PokeBadge status={hasWinner ? "completed" : bothDeposited ? "battle" : "pending"} />
      </header>

      {/* Battle Arena */}
      {(payload.p1 || payload.p2) && (
        <BattleArena 
          p1={payload.p1} 
          p2={payload.p2} 
          turn={payload.turn}
          weather={payload.weather}
        />
      )}

      {/* Deposit Status */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div 
          className={`p-4 rounded-sm border text-center ${
            p1Deposited ? "bg-emerald-500/5 border-emerald-500/20" : "bg-amber-500/5 border-amber-500/20"
          }`}
          animate={!p1Deposited ? { borderColor: ["rgba(245,158,11,0.2)", "rgba(245,158,11,0.4)", "rgba(245,158,11,0.2)"] } : undefined}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <span className="text-[9px] text-neutral-500 uppercase block mb-2">Player 1</span>
          {p1Deposited ? (
            <CheckCircledIcon className="w-8 h-8 mx-auto text-emerald-400" />
          ) : (
            <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
              <TimerIcon className="w-8 h-8 mx-auto text-amber-400" />
            </motion.div>
          )}
          <span className={`text-xs mt-2 block ${p1Deposited ? "text-emerald-400" : "text-amber-400"}`}>
            {p1Deposited ? "Ready!" : "Waiting..."}
          </span>
        </motion.div>

        <motion.div 
          className={`p-4 rounded-sm border text-center ${
            p2Deposited ? "bg-emerald-500/5 border-emerald-500/20" : "bg-amber-500/5 border-amber-500/20"
          }`}
          animate={!p2Deposited ? { borderColor: ["rgba(245,158,11,0.2)", "rgba(245,158,11,0.4)", "rgba(245,158,11,0.2)"] } : undefined}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <span className="text-[9px] text-neutral-500 uppercase block mb-2">Player 2</span>
          {p2Deposited ? (
            <CheckCircledIcon className="w-8 h-8 mx-auto text-emerald-400" />
          ) : (
            <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
              <TimerIcon className="w-8 h-8 mx-auto text-amber-400" />
            </motion.div>
          )}
          <span className={`text-xs mt-2 block ${p2Deposited ? "text-emerald-400" : "text-amber-400"}`}>
            {p2Deposited ? "Ready!" : "Waiting..."}
          </span>
        </motion.div>
      </div>

      {/* Total Pot */}
      {payload.totalPot && (
        <div className="p-4 rounded-sm bg-gradient-to-r from-yellow-500/5 to-amber-500/5 border border-yellow-500/20 text-center">
          <span className="text-[9px] text-neutral-500 uppercase block mb-1">Prize Pool</span>
          <WagerAmount amount={payload.totalPot} size="lg" pulse={bothDeposited && !hasWinner} />
        </div>
      )}

      {/* Winner */}
      {hasWinner && (
        <motion.div 
          className="p-4 rounded-sm bg-gradient-to-r from-yellow-500/10 via-amber-500/10 to-yellow-500/10 border border-yellow-500/30"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <div className="flex items-center justify-center gap-3">
            <motion.span 
              className="text-3xl"
              animate={{ rotate: [-10, 10, -10], scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              🏆
            </motion.span>
            <div className="flex flex-col items-center">
              <span className="text-[9px] text-neutral-500 uppercase">Winner</span>
              <span className="text-lg font-black text-yellow-400">{payload.winner}</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Ready State */}
      {bothDeposited && !hasWinner && (
        <motion.div 
          className="p-4 rounded-sm bg-emerald-500/5 border border-emerald-500/20"
          animate={{ borderColor: ["rgba(16,185,129,0.2)", "rgba(16,185,129,0.5)", "rgba(16,185,129,0.2)"] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <div className="flex items-center justify-center gap-3">
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.5, repeat: Infinity }}>
              <LightningBoltIcon className="w-6 h-6 text-emerald-400" />
            </motion.div>
            <span className="text-sm font-bold text-emerald-400">Battle in Progress!</span>
          </div>
        </motion.div>
      )}

      {/* Battle Room Link */}
      {(payload.battleId || payload.roomId) && (
        <a
          href={`https://poke.dexter.cash/battle/${payload.roomId || payload.battleId}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 p-3 rounded-sm bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
        >
          <BattleIcon size={16} />
          <span className="text-sm font-bold">Watch Live</span>
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

// --- Make Move Renderer ---

const makeMoveRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput) as MoveResult & { error?: string };
  const timestamp = formatTimestampDisplay(item.timestamp);

  if (item.status === "IN_PROGRESS") return <SleekLoadingCard />;
  if (payload.error || payload.ok === false) {
    return <SleekErrorCard message={payload.error || "Failed to submit move"} />;
  }

  const isCritical = payload.critical;
  const effectiveness = payload.effectiveness;

  return (
    <SleekCard className="relative overflow-visible p-6 flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TargetIcon className="w-4 h-4 text-red-400" />
          <SleekLabel>Move Submitted</SleekLabel>
        </div>
        <PokeBadge status="confirmed" />
      </header>

      {/* Move Display with Impact Effect */}
      <motion.div 
        className="relative p-6 rounded-sm bg-gradient-to-br from-red-500/10 to-amber-500/10 border border-red-500/20 text-center overflow-hidden"
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        {/* Impact lines */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute left-1/2 top-1/2 w-px h-8 bg-gradient-to-b from-yellow-400 to-transparent"
              style={{ 
                transformOrigin: "50% 0%",
                rotate: `${i * 45}deg`,
              }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: [0, 1, 0] }}
              transition={{ duration: 0.3, delay: i * 0.02 }}
            />
          ))}
        </motion.div>

        <motion.span 
          className="text-3xl font-black text-white block"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
        >
          {payload.submitted}
        </motion.span>

        {/* Effectiveness */}
        {effectiveness && effectiveness !== "normal" && (
          <motion.span
            className={`block mt-2 text-sm font-bold ${
              effectiveness === "super" ? "text-emerald-400" : "text-neutral-500"
            }`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {effectiveness === "super" ? "Super Effective!" : "Not very effective..."}
          </motion.span>
        )}

        {/* Critical Hit */}
        {isCritical && (
          <motion.div
            className="absolute top-2 right-2"
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 300, delay: 0.2 }}
          >
            <span className="px-2 py-1 rounded-sm bg-yellow-500/20 text-[10px] font-bold text-yellow-400 uppercase">
              Critical Hit!
            </span>
          </motion.div>
        )}
      </motion.div>

      {/* Damage */}
      {payload.damage !== undefined && (
        <div className="text-center">
          <span className="text-[9px] text-neutral-500 uppercase block mb-1">Damage Dealt</span>
          <motion.span 
            className="text-2xl font-black text-rose-400"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
          >
            -{payload.damage}
          </motion.span>
        </div>
      )}

      {/* Info */}
      <div className="grid grid-cols-2 gap-3">
        <MetricItem label="BATTLE ID" value={payload.battleId || "—"} />
        <MetricItem label="STATUS" value="Recorded" />
      </div>

      {payload.note && (
        <p className="text-xs text-neutral-500 text-center italic">{payload.note}</p>
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

// --- Wager Status Renderer ---

const wagerStatusRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput) as WagerStatus & { ok?: boolean; error?: string };
  const timestamp = formatTimestampDisplay(item.timestamp);

  if (item.status === "IN_PROGRESS") return <SleekLoadingCard />;
  if (payload.error || payload.ok === false) {
    return <SleekErrorCard message={payload.error || "Failed to get wager status"} />;
  }

  const wagerId = payload.wagerId || payload.id;
  const roomId = payload.battleRoomId || payload.roomId;
  const hasWinner = !!payload.winner;
  const status: StatusType = hasWinner ? "completed" : payload.status === "active" ? "active" : "pending";

  return (
    <SleekCard className="relative overflow-visible p-6 flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PokeballIcon size={18} />
          <SleekLabel>Wager Status</SleekLabel>
        </div>
        <PokeBadge status={status} />
      </header>

      {/* Wager Amount Hero */}
      <div className="p-4 rounded-sm bg-gradient-to-r from-yellow-500/5 to-amber-500/5 border border-yellow-500/20 text-center">
        <span className="text-[9px] text-neutral-500 uppercase block mb-1">Wager Amount</span>
        <WagerAmount amount={payload.amount || 0} size="lg" pulse={!hasWinner} />
      </div>

      {/* Players with Pokemon */}
      <div className="grid grid-cols-2 gap-4">
        {/* Player 1 */}
        <div className={`p-3 rounded-sm border ${
          payload.player1?.deposited 
            ? "bg-emerald-500/5 border-emerald-500/20" 
            : "bg-neutral-800/50 border-white/5"
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] text-neutral-500 uppercase">Player 1</span>
            {payload.player1?.deposited && <CheckCircledIcon className="w-3 h-3 text-emerald-400" />}
          </div>
          <span className="text-xs font-mono text-neutral-300 block">
            {payload.player1?.wallet?.slice(0, 8) || payload.player1?.userId || "—"}
          </span>
          {payload.player1?.pokemon && (
            <div className="mt-2">
              <PokemonCard pokemon={payload.player1.pokemon} side="left" />
            </div>
          )}
        </div>

        {/* Player 2 */}
        <div className={`p-3 rounded-sm border ${
          payload.player2?.deposited 
            ? "bg-emerald-500/5 border-emerald-500/20" 
            : "bg-neutral-800/50 border-white/5"
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] text-neutral-500 uppercase">Player 2</span>
            {payload.player2?.deposited && <CheckCircledIcon className="w-3 h-3 text-emerald-400" />}
          </div>
          <span className="text-xs font-mono text-neutral-300 block">
            {payload.player2?.wallet?.slice(0, 8) || payload.player2?.userId || "Waiting..."}
          </span>
          {payload.player2?.pokemon && (
            <div className="mt-2">
              <PokemonCard pokemon={payload.player2.pokemon} side="right" />
            </div>
          )}
        </div>
      </div>

      {/* Winner */}
      {hasWinner && (
        <motion.div 
          className="p-4 rounded-sm bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/30"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.span 
                className="text-3xl"
                animate={{ rotate: [-10, 10, -10] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                🏆
              </motion.span>
              <div className="flex flex-col">
                <span className="text-[9px] text-neutral-500 uppercase">Winner</span>
                <span className="text-lg font-black text-yellow-400">{payload.winner}</span>
              </div>
            </div>
            {payload.payout && (
              <div className="text-right">
                <span className="text-[9px] text-neutral-500 uppercase block">Payout</span>
                <span className="text-lg font-bold text-emerald-400">${payload.payout}</span>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Links */}
      {roomId && (
        <a
          href={`https://poke.dexter.cash/battle/${roomId}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 p-3 rounded-sm bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
        >
          <BattleIcon size={16} />
          <span className="text-sm font-bold">{hasWinner ? "View Replay" : "Watch Live"}</span>
          <ExternalLinkIcon className="w-4 h-4" />
        </a>
      )}

      {/* Escrow */}
      {payload.escrowAddress && (
        <div className="flex items-center justify-between p-3 rounded-sm bg-white/[0.02] border border-white/5">
          <div className="flex flex-col">
            <span className="text-[9px] text-neutral-500 uppercase">Escrow</span>
            <span className="text-[10px] font-mono text-neutral-400">
              {payload.escrowAddress.slice(0, 12)}...{payload.escrowAddress.slice(-8)}
            </span>
          </div>
          <a
            href={`https://solscan.io/account/${payload.escrowAddress}`}
            target="_blank"
            rel="noreferrer"
            className="text-[10px] text-neutral-500 hover:text-white transition-colors"
          >
            View ↗
          </a>
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
          <motion.div animate={!payload.matched ? { rotate: 360 } : undefined} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
            <ReloadIcon className="w-4 h-4 text-cyan-400" />
          </motion.div>
          <SleekLabel>Queue Status</SleekLabel>
        </div>
        <PokeBadge status={status} />
      </header>

      {payload.matched ? (
        <motion.div 
          className="p-6 rounded-sm bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/30"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <div className="flex flex-col items-center gap-3">
            <motion.div
              animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.5, repeat: 3 }}
            >
              <span className="text-4xl">⚔️</span>
            </motion.div>
            <span className="text-xl font-black text-violet-400">Opponent Found!</span>
            {roomId && (
              <a
                href={`https://poke.dexter.cash/battle/${roomId}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-sm bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-colors"
              >
                <BattleIcon size={16} />
                <span className="text-sm font-bold">Enter Battle</span>
                <ExternalLinkIcon className="w-4 h-4" />
              </a>
            )}
          </div>
        </motion.div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Queue Position */}
          <div className="p-6 rounded-sm bg-cyan-500/5 border border-cyan-500/20">
            <div className="flex items-center justify-center gap-6">
              {/* Animated searching pokeball */}
              <motion.div
                animate={{ 
                  y: [0, -10, 0],
                  rotate: [0, -10, 10, -10, 0]
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <PokeballIcon size={48} />
              </motion.div>
              
              <div className="flex flex-col">
                <span className="text-sm text-cyan-400 font-medium">Searching for opponent...</span>
                <span className="text-[10px] text-neutral-500 mt-1">
                  {payload.format || "gen9randombattle"}
                </span>
              </div>
            </div>

            {/* Animated dots */}
            <div className="flex justify-center gap-1 mt-4">
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-cyan-400"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
                />
              ))}
            </div>
          </div>

          {/* Queue Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-sm bg-white/[0.02] border border-white/5 text-center">
              <span className="text-[9px] text-neutral-500 uppercase block mb-1">Position</span>
              <span className="text-xl font-bold text-white">#{payload.position || 1}</span>
            </div>
            <div className="p-3 rounded-sm bg-white/[0.02] border border-white/5 text-center">
              <span className="text-[9px] text-neutral-500 uppercase block mb-1">In Queue</span>
              <span className="text-xl font-bold text-white">{payload.queueSize || 1}</span>
            </div>
            <div className="p-3 rounded-sm bg-white/[0.02] border border-white/5 text-center">
              <span className="text-[9px] text-neutral-500 uppercase block mb-1">Wager</span>
              <span className="text-xl font-bold text-yellow-400">${payload.amount || "—"}</span>
            </div>
          </div>

          {/* Estimated wait */}
          {payload.estimatedWait && (
            <div className="flex items-center justify-center gap-2 text-[10px] text-neutral-500">
              <CounterClockwiseClockIcon className="w-3 h-3" />
              <span>Est. wait: ~{Math.ceil(payload.estimatedWait / 60)}min</span>
            </div>
          )}
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

// --- Create Challenge Renderer ---

const createChallengeRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput) as {
    ok?: boolean;
    error?: string;
    challengeId?: string;
    amount?: number;
    format?: string;
    escrowAddress?: string;
    expiresAt?: string;
  };
  const timestamp = formatTimestampDisplay(item.timestamp);

  if (item.status === "IN_PROGRESS") return <SleekLoadingCard />;
  if (payload.error || payload.ok === false) {
    return <SleekErrorCard message={payload.error || "Failed to create challenge"} />;
  }

  return (
    <SleekCard className="relative overflow-visible p-6 flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PokeballIcon size={18} animate />
          <SleekLabel>Challenge Created</SleekLabel>
        </div>
        <PokeBadge status="confirmed" />
      </header>

      {/* Success Animation */}
      <motion.div 
        className="p-6 rounded-sm bg-gradient-to-br from-red-500/10 via-amber-500/10 to-yellow-500/10 border border-red-500/20 text-center relative overflow-hidden"
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring" }}
      >
        {/* Confetti effect */}
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{ 
              backgroundColor: ["#ef4444", "#fbbf24", "#22c55e", "#3b82f6"][i % 4],
              left: `${10 + (i * 7)}%`,
            }}
            initial={{ y: 0, opacity: 1 }}
            animate={{ y: 100, opacity: 0, rotate: 360 }}
            transition={{ duration: 1.5, delay: i * 0.05 }}
          />
        ))}

        <motion.div
          animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 0.5 }}
        >
          <PokeballIcon size={64} />
        </motion.div>
        <p className="text-lg font-black text-white mt-3">Challenge Thrown!</p>
        <p className="text-xs text-neutral-400 mt-1">Waiting for a brave trainer...</p>
      </motion.div>

      {/* Challenge Details */}
      <div className="grid grid-cols-2 gap-3">
        {payload.amount && (
          <div className="p-3 rounded-sm bg-yellow-500/5 border border-yellow-500/20 text-center">
            <span className="text-[9px] text-neutral-500 uppercase block mb-1">Wager</span>
            <WagerAmount amount={payload.amount} size="md" />
          </div>
        )}
        {payload.format && (
          <div className="p-3 rounded-sm bg-violet-500/5 border border-violet-500/20 text-center">
            <span className="text-[9px] text-neutral-500 uppercase block mb-1">Format</span>
            <span className="text-sm font-bold text-violet-400">{payload.format}</span>
          </div>
        )}
      </div>

      {payload.challengeId && (
        <div className="p-3 rounded-sm bg-white/[0.02] border border-white/5">
          <span className="text-[9px] text-neutral-500 uppercase block mb-1">Challenge ID</span>
          <code className="text-xs font-mono text-neutral-300">{payload.challengeId}</code>
        </div>
      )}

      {/* Escrow */}
      {payload.escrowAddress && (
        <div className="flex items-center justify-between p-3 rounded-sm bg-white/[0.02] border border-white/5">
          <div className="flex flex-col">
            <span className="text-[9px] text-neutral-500 uppercase">Deposit To</span>
            <span className="text-[10px] font-mono text-neutral-400">
              {payload.escrowAddress.slice(0, 12)}...{payload.escrowAddress.slice(-8)}
            </span>
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(payload.escrowAddress!)}
            className="px-2 py-1 rounded-sm bg-white/5 hover:bg-white/10 text-[10px] text-neutral-400 hover:text-white transition-colors"
          >
            Copy
          </button>
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

// --- Accept Challenge Renderer ---

const acceptChallengeRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput) as {
    ok?: boolean;
    error?: string;
    wagerId?: string;
    battleRoomId?: string;
    roomId?: string;
    amount?: number;
    opponent?: string;
    escrowAddress?: string;
  };
  const timestamp = formatTimestampDisplay(item.timestamp);

  if (item.status === "IN_PROGRESS") return <SleekLoadingCard />;
  if (payload.error || payload.ok === false) {
    return <SleekErrorCard message={payload.error || "Failed to accept challenge"} />;
  }

  const roomId = payload.battleRoomId || payload.roomId;

  return (
    <SleekCard className="relative overflow-visible p-6 flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LightningBoltIcon className="w-4 h-4 text-amber-400" />
          <SleekLabel>Challenge Accepted!</SleekLabel>
        </div>
        <PokeBadge status="battle" />
      </header>

      {/* Battle Starting Animation */}
      <motion.div 
        className="p-6 rounded-sm bg-gradient-to-br from-amber-500/10 to-red-500/10 border border-amber-500/30 text-center relative overflow-hidden"
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
      >
        {/* Energy pulses */}
        <motion.div
          className="absolute inset-0 rounded-sm border-2 border-amber-400/50"
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        
        <div className="flex items-center justify-center gap-6">
          <motion.div
            animate={{ x: [-5, 0], rotate: [-5, 0] }}
            transition={{ duration: 0.3 }}
          >
            <PokeballIcon size={40} />
          </motion.div>
          
          <motion.span
            className="text-3xl font-black text-amber-400"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.5, repeat: 3 }}
          >
            VS
          </motion.span>
          
          <motion.div
            animate={{ x: [5, 0], rotate: [5, 0] }}
            transition={{ duration: 0.3 }}
          >
            <PokeballIcon size={40} />
          </motion.div>
        </div>

        <p className="text-lg font-black text-white mt-4">Battle Initiated!</p>
        {payload.opponent && (
          <p className="text-sm text-neutral-400 mt-1">vs {payload.opponent.slice(0, 8)}...</p>
        )}
      </motion.div>

      {/* Wager */}
      {payload.amount && (
        <div className="p-4 rounded-sm bg-yellow-500/5 border border-yellow-500/20 text-center">
          <span className="text-[9px] text-neutral-500 uppercase block mb-1">Stakes</span>
          <WagerAmount amount={payload.amount} size="lg" pulse />
        </div>
      )}

      {/* Battle Room Link */}
      {roomId && (
        <motion.a
          href={`https://poke.dexter.cash/battle/${roomId}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 p-4 rounded-sm bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-colors"
          animate={{ borderColor: ["rgba(239,68,68,0.3)", "rgba(239,68,68,0.6)", "rgba(239,68,68,0.3)"] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <BattleIcon size={20} />
          <span className="text-lg font-bold">Enter Battle Arena</span>
          <ExternalLinkIcon className="w-5 h-5" />
        </motion.a>
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

// --- Join Queue Renderer ---

const joinQueueRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput) as {
    ok?: boolean;
    error?: string;
    position?: number;
    queueSize?: number;
    amount?: number;
    format?: string;
    estimatedWait?: number;
  };
  const timestamp = formatTimestampDisplay(item.timestamp);

  if (item.status === "IN_PROGRESS") return <SleekLoadingCard />;
  if (payload.error || payload.ok === false) {
    return <SleekErrorCard message={payload.error || "Failed to join queue"} />;
  }

  return (
    <SleekCard className="relative overflow-visible p-6 flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RocketIcon className="w-4 h-4 text-cyan-400" />
          <SleekLabel>Joined Queue</SleekLabel>
        </div>
        <PokeBadge status="waiting" />
      </header>

      {/* Queue Animation */}
      <div className="p-6 rounded-sm bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 text-center">
        <div className="flex items-center justify-center gap-4 mb-4">
          {/* Queue visualization */}
          {[...Array(Math.min(5, payload.queueSize || 3))].map((_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: i === (payload.position || 1) - 1 ? 1 : 0.3 }}
              transition={{ delay: i * 0.1 }}
            >
              <PokeballIcon size={i === (payload.position || 1) - 1 ? 40 : 24} animate={i === (payload.position || 1) - 1} />
            </motion.div>
          ))}
        </div>

        <p className="text-lg font-black text-cyan-400">You're #{payload.position || 1} in queue</p>
        <p className="text-xs text-neutral-400 mt-1">
          {payload.queueSize || 1} trainers waiting • {payload.format || "gen9randombattle"}
        </p>
      </div>

      {/* Details */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-sm bg-white/[0.02] border border-white/5 text-center">
          <span className="text-[9px] text-neutral-500 uppercase block mb-1">Position</span>
          <span className="text-xl font-bold text-cyan-400">#{payload.position || 1}</span>
        </div>
        <div className="p-3 rounded-sm bg-white/[0.02] border border-white/5 text-center">
          <span className="text-[9px] text-neutral-500 uppercase block mb-1">Wager</span>
          <span className="text-xl font-bold text-yellow-400">${payload.amount || "—"}</span>
        </div>
        <div className="p-3 rounded-sm bg-white/[0.02] border border-white/5 text-center">
          <span className="text-[9px] text-neutral-500 uppercase block mb-1">Est. Wait</span>
          <span className="text-xl font-bold text-neutral-300">
            {payload.estimatedWait ? `${Math.ceil(payload.estimatedWait / 60)}m` : "—"}
          </span>
        </div>
      </div>

      {/* Searching indicator */}
      <div className="flex items-center justify-center gap-2 text-sm text-neutral-400">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
          <ReloadIcon className="w-4 h-4" />
        </motion.div>
        <span>Searching for opponent...</span>
      </div>

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

export const pokedexterListChallengesRenderer = listChallengesRenderer;
export const pokedexterGetBattleStateRenderer = battleStateRenderer;
export const pokedexterMakeMoveRenderer = makeMoveRenderer;
export const pokedexterGetActiveWagerRenderer = wagerStatusRenderer;
export const pokedexterGetWagerStatusRenderer = wagerStatusRenderer;
export const pokedexterCreateChallengeRenderer = createChallengeRenderer;
export const pokedexterAcceptChallengeRenderer = acceptChallengeRenderer;
export const pokedexterJoinQueueRenderer = joinQueueRenderer;
export const pokedexterQueueStatusRenderer = queueStatusRenderer;
