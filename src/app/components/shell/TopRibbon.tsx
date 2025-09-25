import React from "react";
import Image from "next/image";
import type { RealtimeAgent } from "@openai/agents/realtime";
import { SessionStatus } from "@/app/types";

interface SessionIdentitySummary {
  type: "guest" | "user";
  user?: { id?: string | null; email?: string | null } | null;
  guestProfile?: { label?: string; instructions?: string } | null;
}

interface AuthStateSummary {
  loading: boolean;
  isAuthenticated: boolean;
  email: string | null;
}

interface McpStatusProps {
  state: 'loading' | 'user' | 'fallback' | 'guest' | 'none' | 'error';
  label: string;
  detail?: string;
}

interface TopRibbonProps {
  sessionStatus: SessionStatus;
  selectedAgentName: string;
  agents: RealtimeAgent[];
  onAgentChange: (agentName: string) => void;
  onReloadBrand?: () => void;
  authState: AuthStateSummary;
  sessionIdentity: SessionIdentitySummary;
  mcpStatus: McpStatusProps;
  activeWalletKey?: string | null;
  onSignIn?: () => void;
  onSignOut?: () => void;
  turnstileSlot?: React.ReactNode;
}

function getStatusAccent(sessionStatus: SessionStatus) {
  switch (sessionStatus) {
    case "CONNECTED":
      return { label: "Live", tone: "bg-flux/20 text-flux" };
    case "CONNECTING":
      return { label: "Linking", tone: "bg-accent-info/10 text-accent-info" };
    case "ERROR":
      return { label: "Fault", tone: "bg-accent-critical/20 text-accent-critical" };
    default:
      return { label: "Offline", tone: "bg-neutral-800 text-neutral-300" };
  }
}

export function TopRibbon({
  sessionStatus,
  selectedAgentName,
  agents,
  onAgentChange,
  onReloadBrand,
  authState,
  sessionIdentity,
  mcpStatus,
  activeWalletKey,
  onSignIn,
  onSignOut,
  turnstileSlot,
}: TopRibbonProps) {
  const statusChip = getStatusAccent(sessionStatus);

  const sessionLabel = sessionIdentity.type === "user"
    ? sessionIdentity.user?.email || sessionIdentity.user?.id || "Authenticated"
    : sessionIdentity.guestProfile?.label || "Demo Session";

  const accountLabel = authState.loading
    ? "Checking..."
    : authState.isAuthenticated
      ? authState.email || "Signed in"
      : "Guest";

  const mcpChip = getMcpAccent(mcpStatus.state);
  const mcpLabel = mcpStatus.label || (mcpStatus.state === 'loading' ? 'Checking…' : 'Unavailable');
  const walletLabel = formatWalletAddress(activeWalletKey);

  const showSignOut = authState.isAuthenticated && !authState.loading && Boolean(onSignOut);
  const showSignIn = !authState.isAuthenticated && !authState.loading && Boolean(onSignIn);

  return (
    <div className="flex w-full flex-col gap-3 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center justify-between gap-3 lg:justify-start">
        <button
          type="button"
          onClick={onReloadBrand}
          className="group flex items-center gap-2 text-left"
        >
          <div className="relative h-7 w-7 overflow-hidden rounded-lg bg-surface-glass/70 ring-1 ring-neutral-800/60 transition group-hover:ring-flux/40">
            <Image src="/assets/logos/logo_orange.png" alt="Dexter" fill sizes="28px" priority />
          </div>
          <div>
            <div className="font-display text-base font-semibold tracking-[0.2em] uppercase text-foreground/90">
              Dexter
            </div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
              Situation Room
            </div>
          </div>
        </button>
      </div>

      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:gap-5">
        <div className="flex items-center gap-2 rounded-md bg-surface-glass/60 px-3 py-1.5 text-xs text-neutral-200 ring-1 ring-neutral-800/60">
          <span className="font-mono uppercase tracking-[0.18em] text-neutral-400">
            Link
          </span>
          <span className={`rounded-pill px-2.5 py-0.5 text-[11px] font-semibold ${statusChip.tone}`}>
            {statusChip.label}
          </span>
        </div>

        <div className="hidden items-center gap-2.5 xl:flex">
          <div className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">
            Scenario
          </div>
          <div className="rounded-md border border-neutral-800/70 bg-surface-glass/60 px-2.5 py-1.5 text-xs text-neutral-200">
            Dexter Trading Desk
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">
            Agent
          </div>
          <div className="relative">
            <select
              value={selectedAgentName}
              onChange={(event) => onAgentChange(event.target.value)}
              className="appearance-none rounded-md border border-neutral-800/80 bg-surface-glass/80 px-3 py-1.5 pr-8 text-xs text-neutral-100 outline-none transition focus:border-flux/60 focus:ring-2 focus:ring-flux/30"
            >
              {agents.map((agent) => (
                <option key={agent.name} value={agent.name}>
                  {agent.name}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-neutral-500">
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 10.44l3.71-3.21a.75.75 0 111.04 1.08l-4.25 3.65a.75.75 0 01-1.04 0L5.21 8.27a.75.75 0 01.02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-2.5">
          <div className="flex items-center gap-2">
            <div className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">
              Account
            </div>
            <div className="rounded-md border border-neutral-800/60 bg-surface-glass/60 px-2.5 py-1.5 text-[11px] font-medium text-neutral-200">
              {accountLabel}
            </div>
            {showSignOut && (
              <button
                type="button"
                onClick={onSignOut}
                className="rounded-md border border-neutral-800/60 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-neutral-300 transition hover:border-flux/40 hover:text-flux"
              >
                Sign out
              </button>
            )}
            {showSignIn && (
              <div className="flex items-center gap-2">
                {turnstileSlot && (
                  <div className="flex flex-col items-start text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                    <span>Security Check</span>
                    <div className="mt-1">{turnstileSlot}</div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={onSignIn}
                  className="rounded-md border border-flux/40 bg-flux/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-flux transition hover:bg-flux/20"
                >
                  Send magic link
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">
              Session
            </div>
            <div
              className={`rounded-md border px-2.5 py-1.5 text-[11px] font-medium ${
                sessionIdentity.type === 'user'
                  ? 'border-flux/40 bg-flux/10 text-flux'
                  : 'border-neutral-800/60 bg-surface-glass/60 text-neutral-300'
              }`}
            >
              {sessionLabel}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">
              MCP
            </div>
            <div
              className={`rounded-md border px-2.5 py-1.5 text-[11px] font-medium ${mcpChip.tone}`}
              title={mcpStatus.detail || undefined}
            >
              {mcpLabel}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">
              Wallet
            </div>
            <div
              className="rounded-md border border-neutral-800/60 bg-surface-glass/60 px-2.5 py-1.5 text-[11px] font-medium text-neutral-200"
              title={activeWalletKey || undefined}
            >
              {walletLabel}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TopRibbon;

function getMcpAccent(state: McpStatusProps['state']) {
  switch (state) {
    case 'user':
      return { tone: 'border-flux/40 bg-flux/10 text-flux' };
    case 'fallback':
      return { tone: 'border-amber-600/40 bg-amber-500/10 text-amber-200' };
    case 'guest':
    case 'none':
      return { tone: 'border-neutral-800/60 bg-surface-glass/60 text-neutral-300' };
    case 'error':
      return { tone: 'border-accent-critical/40 bg-accent-critical/10 text-accent-critical' };
    default:
      return { tone: 'border-neutral-800/60 bg-surface-glass/60 text-neutral-400' };
  }
}

function formatWalletAddress(address?: string | null) {
  if (!address || address === 'Auto' || address.trim().length === 0) {
    return 'Auto';
  }
  if (address.length <= 10) {
    return address;
  }
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}
