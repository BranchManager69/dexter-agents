import React from "react";
import Image from "next/image";
import { SessionStatus } from "@/app/types";
import { AuthMenu } from "@/app/components/AuthMenu";

interface SessionIdentitySummary {
  type: "guest" | "user";
  user?: { id?: string | null; email?: string | null; roles?: string[]; isSuperAdmin?: boolean } | null;
  guestProfile?: { label?: string; instructions?: string } | null;
  wallet?: { public_key: string | null; label?: string | null } | null;
}

interface AuthStateSummary {
  loading: boolean;
  isAuthenticated: boolean;
  email: string | null;
}

interface WalletPortfolioSummary {
  status: 'idle' | 'loading' | 'ready' | 'error';
  solBalanceFormatted: string | null;
  totalUsdFormatted: string | null;
  tokenCount: number;
  lastUpdatedLabel: string | null;
  lastUpdatedIso: string | null;
  error?: string | null;
  balances: Array<{
    mint: string | null;
    symbol: string | null;
    label: string | null;
    amountUi: number | null;
    usdValue: number | null;
  }>;
}

interface McpStatusProps {
  state: 'loading' | 'user' | 'fallback' | 'guest' | 'none' | 'error';
  label: string;
  detail?: string;
}

interface TopRibbonProps {
  sessionStatus: SessionStatus;
  onToggleConnection?: () => void;
  onReloadBrand?: () => void;
  authState: AuthStateSummary;
  sessionIdentity: SessionIdentitySummary;
  mcpStatus: McpStatusProps;
  activeWalletKey?: string | null;
  walletPortfolio?: WalletPortfolioSummary | null;
  onSignIn?: (email: string, captchaToken: string | null) => Promise<{ success: boolean; message: string }>;
  onSignOut?: () => void;
  turnstileSiteKey?: string;
  onOpenPersonaModal?: () => void;
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

function getSessionBadgeTone(identity: SessionIdentitySummary) {
  if (identity.type !== 'user') {
    return {
      tone: 'border-neutral-800/60 bg-surface-glass/60 text-neutral-300',
      label: 'Guest',
    };
  }

  const normalizedRoles = (identity.user?.roles ?? []).map((role) => role.toLowerCase());
  const isSuperAdmin = Boolean(identity.user?.isSuperAdmin || normalizedRoles.includes('superadmin'));

  if (isSuperAdmin) {
    return {
      tone: 'border-amber-400/60 bg-amber-500/10 text-amber-200',
      label: 'Super Admin',
    };
  }

  if (normalizedRoles.includes('admin')) {
    return {
      tone: 'border-rose-500/50 bg-rose-500/10 text-rose-200',
      label: 'Admin',
    };
  }

  return {
    tone: 'border-orange-500/50 bg-orange-500/10 text-orange-200',
    label: 'User',
  };
}

function getRoleButtonTone(identity: SessionIdentitySummary) {
  if (identity.type !== 'user') {
    return 'border-neutral-800/60 bg-surface-glass/60 text-neutral-200 hover:border-flux/40 hover:text-flux';
  }

  const normalizedRoles = (identity.user?.roles ?? []).map((role) => role.toLowerCase());
  const isSuperAdmin = Boolean(identity.user?.isSuperAdmin || normalizedRoles.includes('superadmin'));

  if (isSuperAdmin) {
    return 'border-amber-400/60 bg-amber-500/12 text-amber-100 hover:border-amber-300 hover:text-amber-50';
  }

  if (normalizedRoles.includes('admin')) {
    return 'border-rose-500/60 bg-rose-500/12 text-rose-100 hover:border-rose-300 hover:text-rose-50';
  }

  return 'border-orange-500/60 bg-orange-500/12 text-orange-200 hover:border-orange-300 hover:text-orange-50';
}

export function TopRibbon({
  sessionStatus,
  onToggleConnection,
  onReloadBrand,
  authState,
  sessionIdentity,
  mcpStatus,
  activeWalletKey,
  walletPortfolio,
  onSignIn,
  onSignOut,
  turnstileSiteKey,
  onOpenPersonaModal,
}: TopRibbonProps) {

  const statusChip = getStatusAccent(sessionStatus);
  const mcpTone = getMcpAccent(mcpStatus.state);
  const mcpLabel = mcpStatus.label || (mcpStatus.state === 'loading' ? 'Checking…' : 'Unavailable');
  const walletLabel = formatWalletAddress(activeWalletKey);
  const walletTitleParts = [`Active wallet: ${walletLabel}`];
  if (walletPortfolio?.solBalanceFormatted || walletPortfolio?.totalUsdFormatted) {
    walletTitleParts.push(
      `Balances: ${walletPortfolio.solBalanceFormatted ?? '—'} • ${walletPortfolio.totalUsdFormatted ?? '—'}`,
    );
  }
  if (walletPortfolio?.tokenCount) {
    walletTitleParts.push(`${walletPortfolio.tokenCount} tokens tracked`);
  }
  if (walletPortfolio?.lastUpdatedLabel) {
    walletTitleParts.push(`Updated ${walletPortfolio.lastUpdatedLabel}`);
  }
  if (walletPortfolio?.status === 'error' && walletPortfolio.error) {
    walletTitleParts.push(`Error: ${walletPortfolio.error}`);
  }
  const walletBadgeTitle = walletTitleParts.join('\n');

  let walletSecondaryText: string | null = null;
  let walletSecondaryTone = 'text-neutral-400';
  if (walletPortfolio) {
    if (walletPortfolio.status === 'loading' && !walletPortfolio.solBalanceFormatted && !walletPortfolio.totalUsdFormatted) {
      walletSecondaryText = 'Loading balances…';
      walletSecondaryTone = 'text-neutral-500';
    } else if (walletPortfolio.status === 'error') {
      walletSecondaryText = 'Balance error';
      walletSecondaryTone = 'text-accent-critical';
    } else if (walletPortfolio.solBalanceFormatted || walletPortfolio.totalUsdFormatted) {
      walletSecondaryText = [walletPortfolio.solBalanceFormatted, walletPortfolio.totalUsdFormatted]
        .filter(Boolean)
        .join(' • ');
      walletSecondaryTone = 'text-neutral-300';
    }
  }

  const sessionLabel = sessionIdentity.type === "user"
    ? sessionIdentity.user?.email?.split("@")[0] || "User"
    : "Demo";
  const sessionBadge = getSessionBadgeTone(sessionIdentity);
  const authButtonTone = getRoleButtonTone(sessionIdentity);
  const authRoleLabel = sessionIdentity.type === 'user' ? sessionBadge.label : sessionLabel;
  const authEmail = sessionIdentity.type === 'user' ? sessionIdentity.user?.email ?? undefined : undefined;

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

      <div className="ml-auto flex min-w-0 flex-shrink items-center gap-2 sm:gap-3">
        {/* Session Badge */}
        {sessionIdentity.type !== 'user' && (
          <span
            className={`hidden flex-shrink-0 rounded-md border px-2 py-1 text-[11px] font-medium md:inline-flex md:px-2.5 ${sessionBadge.tone}`}
            title="Demo session"
          >
            {sessionLabel}
          </span>
        )}

        {/* MCP Badge */}
        <span
          className={`hidden flex-shrink-0 rounded-md border px-2 py-1 text-[11px] font-medium lg:inline-flex lg:px-2.5 ${mcpTone}`}
          title={mcpStatus.detail || `MCP: ${mcpLabel}`}
        >
          {mcpLabel}
        </span>

        {/* Wallet Badge */}
        <span
          className="hidden flex-shrink-0 flex-col rounded-md border border-neutral-800/60 bg-surface-glass/60 px-2 py-1 text-[11px] text-neutral-200 lg:inline-flex lg:px-2.5"
          title={walletBadgeTitle}
        >
          <span>{walletLabel}</span>
          {walletSecondaryText && (
            <span className={`mt-1 text-[10px] tracking-normal ${walletSecondaryTone}`}>
              {walletSecondaryText}
            </span>
          )}
        </span>

        <span className="hidden h-4 w-px flex-shrink-0 bg-neutral-800/60 md:inline-block" aria-hidden="true" />

        {onOpenPersonaModal && (
          <button
            type="button"
            onClick={onOpenPersonaModal}
            className="hidden flex-shrink-0 items-center gap-2 rounded-full border border-neutral-800/60 bg-surface-glass/60 px-3 py-1.5 text-[11px] uppercase tracking-[0.28em] text-neutral-200 transition hover:border-flux/50 hover:text-flux md:inline-flex"
          >
            Customize
          </button>
        )}

        {onOpenPersonaModal && <span className="hidden h-4 w-px flex-shrink-0 bg-neutral-800/60 md:inline-block" aria-hidden="true" />}

        {/* Auth Menu */}
        <div className="flex-shrink-0">
          <AuthMenu
            isAuthenticated={authState.isAuthenticated}
            loading={authState.loading}
            email={authState.email}
            onSignIn={handleAuthSignIn}
            onSignOut={handleAuthSignOut}
            turnstileSiteKey={turnstileSiteKey}
            roleLabel={authRoleLabel}
            buttonToneClass={authButtonTone}
            buttonTitle={authEmail}
            activeWalletKey={sessionIdentity.wallet?.public_key ?? activeWalletKey ?? undefined}
            walletPortfolio={walletPortfolio ?? undefined}
          />
        </div>
      </div>
    </div>
  );
}

export default TopRibbon;
