import React, { useEffect, useRef, useState } from "react";
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
    <div className="flex w-full flex-wrap items-center gap-4 px-6 py-3">
      <button
        type="button"
        onClick={onReloadBrand}
        className="group flex items-center gap-2 text-left"
      >
        <div className="relative h-7 w-7 overflow-hidden rounded-lg bg-surface-glass/70 ring-1 ring-neutral-800/60 transition group-hover:ring-flux/40">
          <Image src="/assets/logos/logo_orange.png" alt="Dexter" fill sizes="28px" priority />
        </div>
        <div className="leading-tight">
          <div className="font-display text-sm font-semibold tracking-[0.18em] uppercase text-foreground/90">
            Dexter
          </div>
          <div className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
            Situation Room
          </div>
        </div>
      </button>

      <span className="hidden h-4 w-px bg-neutral-800/60 sm:inline-block" aria-hidden="true" />

      <div className="flex flex-1 flex-wrap items-center gap-4">
        <div className="flex flex-wrap items-center gap-4 flex-shrink-0">
          <HeaderChip label="Status">
            <span className={`inline-flex items-center rounded-pill px-2.5 py-0.5 text-[11px] font-semibold ${statusChip.tone}`}>
              {statusChip.label}
            </span>
          </HeaderChip>

          <HeaderChip label="Scenario">
            <span className="inline-flex rounded-md border border-neutral-800/70 bg-surface-glass/60 px-2.5 py-1 text-xs text-neutral-200">
              Dexter Trading Desk
            </span>
          </HeaderChip>

          <HeaderChip label="Agent">
            <div className="relative inline-flex">
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
          </HeaderChip>
        </div>

        <span className="hidden h-4 w-px bg-neutral-800/60 lg:inline-block" aria-hidden="true" />

        <div className="flex flex-wrap items-center gap-4 mx-auto">
          <HeaderChip label="Session">
            <span
              className={`inline-flex rounded-md border px-2.5 py-1.5 text-[11px] font-medium ${
                sessionIdentity.type === 'user'
                  ? 'border-flux/40 bg-flux/10 text-flux'
                  : 'border-neutral-800/60 bg-surface-glass/60 text-neutral-300'
              }`}
            >
              {sessionLabel}
            </span>
          </HeaderChip>

          <HeaderChip label="MCP">
            <span
              className={`inline-flex rounded-md border px-2.5 py-1.5 text-[11px] font-medium ${mcpChip.tone}`}
              title={mcpStatus.detail || undefined}
            >
              {mcpLabel}
            </span>
          </HeaderChip>

          <HeaderChip label="Wallet">
            <span className="inline-flex rounded-md border border-neutral-800/60 bg-surface-glass/60 px-2.5 py-1.5 text-[11px] text-neutral-200">
              {walletLabel}
            </span>
          </HeaderChip>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {turnstileSlot && showSignIn && (
          <div className="hidden flex-col gap-1 text-[10px] uppercase tracking-[0.18em] text-neutral-500 sm:flex">
            <span>Security Check</span>
            <div>{turnstileSlot}</div>
          </div>
        )}
        <AccountMenu
          label={accountLabel}
          onSignOut={showSignOut ? onSignOut : undefined}
          onSignIn={showSignIn ? onSignIn : undefined}
        />
      </div>
    </div>
  );
}

export default TopRibbon;

function HeaderChip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 text-xs text-neutral-200">
      <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">{label}</div>
      <div>{children}</div>
    </div>
  );
}

interface AccountMenuProps {
  label: string;
  onSignOut?: () => void;
  onSignIn?: () => void;
}

function AccountMenu({ label, onSignOut, onSignIn }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [open]);

  if (!onSignOut) {
    return (
      <div className="inline-flex items-center gap-2">
        <span className="inline-flex rounded-md border border-neutral-800/60 bg-surface-glass/60 px-3 py-1.5 text-[11px] text-neutral-200">
          {label}
        </span>
        {onSignIn && (
          <button
            type="button"
            onClick={onSignIn}
            className="inline-flex items-center justify-center rounded-md border border-flux/40 bg-flux/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-flux transition hover:bg-flux/20"
          >
            Send magic link
          </button>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`inline-flex items-center gap-2 rounded-md border border-neutral-800/60 bg-surface-glass/60 px-3 py-1.5 text-[11px] text-neutral-200 transition ${open ? 'border-flux/40 text-flux' : 'hover:border-flux/40 hover:text-flux'}`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span>{label}</span>
        <svg className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-90 text-flux' : 'text-neutral-400'}`} viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M3 10a.75.75 0 01.75-.75h10.69l-2.72-2.72a.75.75 0 111.06-1.06l4 4a.75.75 0 010 1.06l-4 4a.75.75 0 01-1.06-1.06l2.72-2.72H3.75A.75.75 0 013 10z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-36 rounded-md border border-neutral-800/60 bg-surface-glass/90 p-2 text-xs text-neutral-200 shadow-lg backdrop-blur">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
            className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left transition hover:bg-neutral-800/40 hover:text-flux"
          >
            <span>Sign out</span>
            <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M3 10a.75.75 0 01.75-.75h7.69l-2.22-2.22a.75.75 0 111.06-1.06l3.5 3.5a.75.75 0 010 1.06l-3.5 3.5a.75.75 0 11-1.06-1.06l2.22-2.22H3.75A.75.75 0 013 10z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}


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
    return 'Auto (Dexter selects)';
  }
  if (address.length <= 10) {
    return address;
  }
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}
