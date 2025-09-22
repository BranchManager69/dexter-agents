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

interface TopRibbonProps {
  sessionStatus: SessionStatus;
  selectedAgentName: string;
  agents: RealtimeAgent[];
  onAgentChange: (agentName: string) => void;
  onReloadBrand?: () => void;
  authState: AuthStateSummary;
  sessionIdentity: SessionIdentitySummary;
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

  const showSignOut = authState.isAuthenticated && !authState.loading && Boolean(onSignOut);
  const showSignIn = !authState.isAuthenticated && !authState.loading && Boolean(onSignIn);

  return (
    <div className="flex w-full flex-col gap-4 px-9 py-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center justify-between gap-4 lg:justify-start">
        <button
          type="button"
          onClick={onReloadBrand}
          className="group flex items-center gap-3 text-left"
        >
          <div className="relative h-8 w-8 overflow-hidden rounded-lg bg-surface-glass/70 ring-1 ring-neutral-800/60 transition group-hover:ring-flux/40">
            <Image src="/openai-logomark.svg" alt="Dexter" fill />
          </div>
          <div>
            <div className="font-display text-lg font-semibold tracking-wide uppercase text-foreground/90">
              Dexter
            </div>
            <div className="text-xs uppercase tracking-[0.2em] text-neutral-500">
              Situation Room
            </div>
          </div>
        </button>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-7">
        <div className="flex items-center gap-3 rounded-md bg-surface-glass/60 px-4 py-2 text-sm text-neutral-200 ring-1 ring-neutral-800/60">
          <span className="font-mono uppercase tracking-[0.24em] text-neutral-400">
            Link
          </span>
          <span className={`rounded-pill px-3 py-1 text-xs font-semibold ${statusChip.tone}`}>
            {statusChip.label}
          </span>
        </div>

        <div className="hidden items-center gap-3 xl:flex">
          <div className="text-xs uppercase tracking-[0.3em] text-neutral-500">
            Scenario
          </div>
          <div className="rounded-md border border-neutral-800/70 bg-surface-glass/60 px-3 py-2 font-body text-sm text-neutral-200">
            Dexter Trading Desk
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs uppercase tracking-[0.3em] text-neutral-500">
            Agent
          </div>
          <div className="relative">
            <select
              value={selectedAgentName}
              onChange={(event) => onAgentChange(event.target.value)}
              className="appearance-none rounded-md border border-neutral-800/80 bg-surface-glass/80 px-4 py-2 pr-10 text-sm text-neutral-100 outline-none transition focus:border-flux/60 focus:ring-2 focus:ring-flux/30"
            >
              {agents.map((agent) => (
                <option key={agent.name} value={agent.name}>
                  {agent.name}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-neutral-500">
              <svg
                className="h-4 w-4"
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

        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
          <div className="flex items-center gap-2">
            <div className="text-xs uppercase tracking-[0.3em] text-neutral-500">
              Account
            </div>
            <div className="rounded-md border border-neutral-800/60 bg-surface-glass/60 px-3 py-2 text-xs font-medium text-neutral-200">
              {accountLabel}
            </div>
            {showSignOut && (
              <button
                type="button"
                onClick={onSignOut}
                className="rounded-md border border-neutral-800/60 px-3 py-1 text-xs uppercase tracking-[0.2em] text-neutral-300 transition hover:border-flux/40 hover:text-flux"
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
                  className="rounded-md border border-flux/40 bg-flux/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-flux transition hover:bg-flux/20"
                >
                  Send magic link
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs uppercase tracking-[0.3em] text-neutral-500">
              Session
            </div>
            <div
              className={`rounded-md border px-3 py-2 text-xs font-medium ${
                sessionIdentity.type === 'user'
                  ? 'border-flux/40 bg-flux/10 text-flux'
                  : 'border-neutral-800/60 bg-surface-glass/60 text-neutral-300'
              }`}
            >
              {sessionLabel}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TopRibbon;
