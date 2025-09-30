import React from "react";
import Image from "next/image";
import type { RealtimeAgent } from "@openai/agents/realtime";
import { SessionStatus } from "@/app/types";
import { AuthMenu } from "@/app/components/AuthMenu";

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
  onToggleConnection?: () => void;
  onReloadBrand?: () => void;
  authState: AuthStateSummary;
  sessionIdentity: SessionIdentitySummary;
  mcpStatus: McpStatusProps;
  activeWalletKey?: string | null;
  onSignIn?: (email: string, captchaToken: string | null) => Promise<{ success: boolean; message: string }>;
  onSignOut?: () => void;
  turnstileSiteKey?: string;
}

function getStatusAccent(sessionStatus: SessionStatus) {
  switch (sessionStatus) {
    case "CONNECTED":
      return { label: "Live", tone: "bg-flux/20 text-flux border-flux/30" };
    case "CONNECTING":
      return { label: "Linking", tone: "bg-accent-info/10 text-accent-info border-accent-info/30" };
    case "ERROR":
      return { label: "Fault", tone: "bg-accent-critical/20 text-accent-critical border-accent-critical/30" };
    default:
      return { label: "Offline", tone: "bg-neutral-800/60 text-neutral-400 border-neutral-800" };
  }
}

function getAgentDisplayName(agentName: string): string {
  const displayNames: Record<string, string> = {
    'dexterVoice': 'Dexter Voice',
  };
  return displayNames[agentName] || agentName;
}

function getMcpAccent(state: McpStatusProps['state']) {
  switch (state) {
    case 'user':
      return 'border-flux/40 bg-flux/10 text-flux';
    case 'fallback':
      return 'border-amber-600/40 bg-amber-500/10 text-amber-200';
    case 'guest':
    case 'none':
      return 'border-neutral-800/60 bg-surface-glass/60 text-neutral-300';
    case 'error':
      return 'border-accent-critical/40 bg-accent-critical/10 text-accent-critical';
    default:
      return 'border-neutral-800/60 bg-surface-glass/60 text-neutral-400';
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

export function TopRibbon({
  sessionStatus,
  selectedAgentName,
  agents,
  onAgentChange,
  onToggleConnection,
  onReloadBrand,
  authState,
  sessionIdentity,
  mcpStatus,
  activeWalletKey,
  onSignIn,
  onSignOut,
  turnstileSiteKey,
}: TopRibbonProps) {

  const statusChip = getStatusAccent(sessionStatus);
  const mcpTone = getMcpAccent(mcpStatus.state);
  const mcpLabel = mcpStatus.label || (mcpStatus.state === 'loading' ? 'Checking…' : 'Unavailable');
  const walletLabel = formatWalletAddress(activeWalletKey);

  const sessionLabel = sessionIdentity.type === "user"
    ? sessionIdentity.user?.email?.split("@")[0] || "User"
    : "Demo";

  const handleAuthSignIn = async (email: string, captchaToken: string | null) => {
    if (!onSignIn) return { success: false, message: "Sign-in not available" };
    return onSignIn(email, captchaToken);
  };

  const handleAuthSignOut = () => {
    if (onSignOut) onSignOut();
  };

  return (
    <div className="flex w-full items-center gap-2 overflow-hidden px-6 py-3 sm:gap-3 md:gap-4">
      {/* Logo */}
      <button
        type="button"
        onClick={onReloadBrand}
        className="group flex flex-shrink-0 items-center gap-2 text-left"
      >
        <div className="relative h-7 w-7 overflow-hidden rounded-lg bg-surface-glass/70 ring-1 ring-neutral-800/60 transition group-hover:ring-flux/40">
          <Image src="/assets/logos/logo_orange.png" alt="Dexter" fill sizes="28px" priority />
        </div>
        <div className="hidden leading-tight sm:block">
          <div className="font-display text-sm font-semibold tracking-[0.18em] uppercase text-foreground/90">
            Dexter
          </div>
          <div className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
            Situation Room
          </div>
        </div>
      </button>

      <span className="hidden h-4 w-px flex-shrink-0 bg-neutral-800/60 sm:inline-block" aria-hidden="true" />

      {/* Status Indicator */}
      <span
        className={`flex-shrink-0 ${
          sessionStatus === "CONNECTED" ? "bg-flux" :
          sessionStatus === "CONNECTING" ? "bg-accent-info" :
          sessionStatus === "ERROR" ? "bg-accent-critical" :
          "bg-neutral-600"
        } h-2 w-2 rounded-full`}
        title={`Connection status: ${statusChip.label}`}
      />

      {/* Connect/Disconnect Button */}
      {onToggleConnection && (
        <button
          type="button"
          onClick={onToggleConnection}
          className={`flex-shrink-0 rounded-md px-2 py-1 text-[10px] font-medium uppercase tracking-wider transition ${
            sessionStatus === "CONNECTED"
              ? "bg-accent-critical/20 text-accent-critical hover:bg-accent-critical/30"
              : "bg-flux/20 text-flux hover:bg-flux/30"
          }`}
        >
          {sessionStatus === "CONNECTED" ? "Disconnect" : "Connect"}
        </button>
      )}

      {/* Agent Selector */}
      <div className="relative inline-flex flex-shrink min-w-0">
        <select
          value={selectedAgentName}
          onChange={(event) => onAgentChange(event.target.value)}
          className="appearance-none rounded-md border border-neutral-800/80 bg-surface-glass/80 px-2 py-1.5 pr-7 text-xs text-neutral-100 outline-none transition focus:border-flux/60 focus:ring-2 focus:ring-flux/30 sm:px-3 sm:pr-8"
          title="Select agent"
        >
          {agents.map((agent) => (
            <option key={agent.name} value={agent.name}>
              {getAgentDisplayName(agent.name)}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-neutral-500">
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 10.44l3.71-3.21a.75.75 0 111.04 1.08l-4.25 3.65a.75.75 0 01-1.04 0L5.21 8.27a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      </div>

      <div className="ml-auto flex min-w-0 flex-shrink items-center gap-2 sm:gap-3">
        {/* Session Badge */}
        <span
          className={`hidden flex-shrink-0 rounded-md border px-2 py-1 text-[11px] font-medium md:inline-flex md:px-2.5 ${
            sessionIdentity.type === 'user'
              ? 'border-flux/40 bg-flux/10 text-flux'
              : 'border-neutral-800/60 bg-surface-glass/60 text-neutral-300'
          }`}
          title={sessionIdentity.type === "user" ? `Session: ${sessionIdentity.user?.email || "Authenticated"}` : "Demo session"}
        >
          {sessionLabel}
        </span>

        {/* MCP Badge */}
        <span
          className={`hidden flex-shrink-0 rounded-md border px-2 py-1 text-[11px] font-medium lg:inline-flex lg:px-2.5 ${mcpTone}`}
          title={mcpStatus.detail || `MCP: ${mcpLabel}`}
        >
          {mcpLabel}
        </span>

        {/* Wallet Badge */}
        <span
          className="hidden flex-shrink-0 rounded-md border border-neutral-800/60 bg-surface-glass/60 px-2 py-1 text-[11px] text-neutral-200 lg:inline-flex lg:px-2.5"
          title={`Active wallet: ${activeWalletKey || 'Auto (Dexter selects)'}`}
        >
          {walletLabel}
        </span>

        <span className="hidden h-4 w-px flex-shrink-0 bg-neutral-800/60 md:inline-block" aria-hidden="true" />

        {/* Auth Menu */}
        <div className="flex-shrink-0">
          <AuthMenu
            isAuthenticated={authState.isAuthenticated}
            loading={authState.loading}
            email={authState.email}
            onSignIn={handleAuthSignIn}
            onSignOut={handleAuthSignOut}
            turnstileSiteKey={turnstileSiteKey}
          />
        </div>
      </div>
    </div>
  );
}

export default TopRibbon;