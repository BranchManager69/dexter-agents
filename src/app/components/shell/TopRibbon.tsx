import React from "react";
import { SessionStatus } from "@/app/types";
import type { DexterUserBadge } from "@/app/types";
import { AuthMenu } from "@/app/components/AuthMenu";
import { DexterAnimatedCrest } from "@/app/components/DexterAnimatedCrest";

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
  userBadge?: DexterUserBadge | null;
}

function getStatusVisual(sessionStatus: SessionStatus) {
  switch (sessionStatus) {
    case "CONNECTED":
      return { label: "Live", dot: "bg-[#16C98C]" };
    case "CONNECTING":
      return { label: "Linking", dot: "bg-[#26B5FF]" };
    case "ERROR":
      return { label: "Fault", dot: "bg-[#FF4D69]" };
    default:
      return { label: "Offline", dot: "bg-[#FF3B30]" };
  }
}

function getMcpLabel(state: McpStatusProps['state'], fallback: string) {
  switch (state) {
    case 'user':
      return 'Ready';
    case 'fallback':
      return 'Fallback';
    case 'guest':
    case 'none':
      return 'Guest';
    case 'error':
      return 'Error';
    case 'loading':
    default:
      return fallback || 'Loading';
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

function resolveSessionLabel(identity: SessionIdentitySummary, userBadge?: DexterUserBadge | null) {
  if (identity.type !== 'user') {
    return 'Demo';
  }

  if (userBadge === 'dev') return 'Dev';
  if (userBadge === 'pro') return 'Pro';

  const normalizedRoles = (identity.user?.roles ?? []).map((role) => role.toLowerCase());
  if (identity.user?.isSuperAdmin || normalizedRoles.includes('superadmin')) return 'Super Admin';
  if (normalizedRoles.includes('admin')) return 'Admin';
  return 'User';
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
  userBadge,
}: TopRibbonProps) {
  const statusVisual = getStatusVisual(sessionStatus);
  const sessionLabel = resolveSessionLabel(sessionIdentity, userBadge);
  const mcpText = getMcpLabel(mcpStatus.state, mcpStatus.label);
  const walletLabel = formatWalletAddress(sessionIdentity.wallet?.public_key ?? activeWalletKey ?? undefined);

  const walletSecondaryText = (() => {
    if (!walletPortfolio) return null;
    if (walletPortfolio.status === 'loading' && !walletPortfolio.solBalanceFormatted && !walletPortfolio.totalUsdFormatted) {
      return 'Loading balances…';
    }
    if (walletPortfolio.status === 'error') {
      return 'Balance error';
    }
    const parts = [walletPortfolio.solBalanceFormatted, walletPortfolio.totalUsdFormatted].filter(Boolean);
    return parts.length ? parts.join(' • ') : null;
  })();

  const handleAuthSignIn = async (email: string, captchaToken: string | null) => {
    if (!onSignIn) return { success: false, message: "Sign-in not available" };
    return onSignIn(email, captchaToken);
  };

  const handleAuthSignOut = () => {
    if (onSignOut) onSignOut();
  };

  return (
    <div className="relative w-full px-5 pb-2 pt-1 sm:px-7">
      <div className="relative mx-auto flex w-full max-w-6xl items-center gap-3">
        <div className="flex flex-shrink-0 items-center gap-3 overflow-x-auto whitespace-nowrap text-[8.5px] font-semibold uppercase tracking-[0.2em] text-[#FFF3E3]/85 scrollbar-hide">
          <span className="flex flex-shrink-0 items-center gap-2" title={`Connection status: ${statusVisual.label}`}>
            <span className={`h-2.5 w-2.5 rounded-full ${statusVisual.dot}`} aria-hidden="true" />
            <span className="sr-only">{statusVisual.label}</span>
          </span>

          {onToggleConnection && (
            <button
              type="button"
              onClick={onToggleConnection}
              className="flex flex-shrink-0 items-center gap-2 text-[#FEFBF4] underline decoration-[#FEFBF4]/45 underline-offset-[4px] transition hover:decoration-[#FEFBF4]"
            >
              {sessionStatus === "CONNECTED" ? "Disconnect" : "Connect"}
            </button>
          )}
        </div>

        <div className="ml-auto flex flex-shrink-0 items-center gap-3 overflow-x-auto whitespace-nowrap text-[8.5px] font-semibold uppercase tracking-[0.2em] text-[#FFF3E3]/85 scrollbar-hide">
          <span className="flex flex-shrink-0 items-center gap-2 text-[#FEFBF4]">
            {sessionLabel}
          </span>

          <span className="flex flex-shrink-0 items-center gap-2 text-[#FEFBF4]/75" title={mcpStatus.detail || `MCP: ${mcpStatus.label}`}>
            {mcpText}
          </span>

          <span className="flex flex-shrink-0 items-center gap-2 text-[#FEFBF4]">
            <span className="tracking-[0.18em] text-[#FEFBF4]">{walletLabel}</span>
          </span>

          {walletSecondaryText && (
            <span className="flex flex-shrink-0 items-center gap-2 text-[#FEFBF4]/60 tracking-[0.18em]">
              {walletSecondaryText}
            </span>
          )}
        </div>

        <div className="flex flex-shrink-0 items-center pl-2">
          <AuthMenu
            isAuthenticated={authState.isAuthenticated}
            loading={authState.loading}
            email={authState.email}
            onSignIn={handleAuthSignIn}
            onSignOut={handleAuthSignOut}
            turnstileSiteKey={turnstileSiteKey}
            roleLabel={sessionLabel}
            buttonToneClass="rounded-none border-transparent px-0 py-0 bg-transparent text-[#FEFBF4] hover:text-[#FFF3E3]"
            buttonTitle={sessionIdentity.type === 'user' ? sessionIdentity.user?.email ?? undefined : undefined}
            activeWalletKey={sessionIdentity.wallet?.public_key ?? activeWalletKey ?? undefined}
            walletPortfolio={walletPortfolio ?? undefined}
            userBadge={userBadge ?? undefined}
          />
        </div>

        <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 justify-center">
          <button
            type="button"
            onClick={onReloadBrand}
            className="pointer-events-auto group relative flex h-[88px] w-[88px] items-center justify-center rounded-full border border-[#FEFBF4]/35 bg-gradient-to-br from-[#F26B1A] via-[#F23E01] to-[#F26B1A] shadow-[0_18px_48px_rgba(242,107,26,0.45)] focus:outline-none focus:ring-2 focus:ring-[#FEFBF4]/70 focus:ring-offset-2 focus:ring-offset-[#FF6500]"
            aria-label="Reload Dexter brand"
          >
            <span className="absolute -inset-1.5 rounded-full border border-[#FEFBF4]/20 bg-gradient-to-b from-[#FEFBF4]/18 to-transparent opacity-70 blur-[1px] transition group-hover:opacity-95" aria-hidden="true" />
            <DexterAnimatedCrest size={78} className="relative" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default TopRibbon;
