import React from "react";
import { motion } from "framer-motion";
import { createPortal } from "react-dom";
import { SessionStatus } from "@/app/types";
import type { DexterUserBadge } from "@/app/types";
import { AuthMenu } from "@/app/components/AuthMenu";
import { DexterAnimatedCrest } from "@/app/components/DexterAnimatedCrest";
import { resolveUserBadgeTextClass, UserBadgeVariant } from "@/app/components/UserBadge";

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
  pending?: boolean;
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
      return { label: "Live", dotClass: "bg-[#16C98C]", textClass: "text-[#73F7C2]" };
    case "CONNECTING":
      return { label: "Linking", dotClass: "bg-[#26B5FF]", textClass: "text-[#7FD0FF]" };
    case "ERROR":
      return { label: "Fault", dotClass: "bg-[#FF4D69]", textClass: "text-[#FF96AD]" };
    default:
      return { label: "Offline", dotClass: "bg-[#FF3B30]", textClass: "text-[#FF8A7F]" };
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

function resolveSessionRoleVariant(identity: SessionIdentitySummary, userBadge?: DexterUserBadge | null): UserBadgeVariant {
  if (userBadge === 'dev' || userBadge === 'pro') {
    return userBadge;
  }

  if (identity.type !== 'user') {
    return 'demo';
  }

  const normalizedRoles = (identity.user?.roles ?? []).map((role) => role.toLowerCase());
  if (identity.user?.isSuperAdmin || normalizedRoles.includes('superadmin')) return 'dev';
  if (normalizedRoles.includes('admin')) return 'admin';
  return 'user';
}

function resolveSessionLabel(variant: UserBadgeVariant) {
  switch (variant) {
    case 'dev':
      return 'Dev';
    case 'pro':
      return 'Pro';
    case 'admin':
      return 'Admin';
    case 'user':
      return 'User';
    default:
      return 'Demo';
  }
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
  const sessionVariant = resolveSessionRoleVariant(sessionIdentity, userBadge);
  const sessionLabel = resolveSessionLabel(sessionVariant);
  const sessionToneClass = resolveUserBadgeTextClass(sessionVariant);
  const mcpText = getMcpLabel(mcpStatus.state, mcpStatus.label);
  const walletAddressValue = sessionIdentity.wallet?.public_key ?? activeWalletKey ?? undefined;
  const walletLabel = formatWalletAddress(walletAddressValue);

  const connectionButtonLabel = sessionStatus === 'CONNECTED'
    ? 'Disconnect'
    : sessionStatus === 'CONNECTING'
      ? 'Connecting…'
      : 'Connect';

  const walletSecondaryText = (() => {
    if (!walletPortfolio) return null;
    if (walletPortfolio.pending && mcpStatus.state !== 'user') {
      return <span className="inline-block animate-pulse">…</span>;
    }
    if (walletPortfolio.status === 'loading' && !walletPortfolio.solBalanceFormatted && !walletPortfolio.totalUsdFormatted) {
      return <span className="inline-block animate-pulse">…</span>;
    }
    if (walletPortfolio.status === 'error') {
      return 'Balance error';
    }
    const parts = [walletPortfolio.solBalanceFormatted, walletPortfolio.totalUsdFormatted].filter(Boolean);
    return parts.length ? parts.join(' • ') : null;
  })();

  const [walletCopied, setWalletCopied] = React.useState(false);
  const walletCopyTimeoutRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (walletCopyTimeoutRef.current) {
        window.clearTimeout(walletCopyTimeoutRef.current);
        walletCopyTimeoutRef.current = null;
      }
    };
  }, []);

  const handleWalletCopy = React.useCallback(async () => {
    if (!walletAddressValue) return;
    try {
      await navigator.clipboard.writeText(walletAddressValue);
      setWalletCopied(true);
      if (walletCopyTimeoutRef.current) {
        window.clearTimeout(walletCopyTimeoutRef.current);
      }
      walletCopyTimeoutRef.current = window.setTimeout(() => {
        setWalletCopied(false);
        walletCopyTimeoutRef.current = null;
      }, 1200);
    } catch (error) {
      console.warn('Failed to copy wallet address', error);
    }
  }, [walletAddressValue]);

  const handleAuthSignIn = async (email: string, captchaToken: string | null) => {
    if (!onSignIn) return { success: false, message: "Sign-in not available" };
    return onSignIn(email, captchaToken);
  };

  const handleAuthSignOut = () => {
    if (onSignOut) onSignOut();
  };

  return (
    <>
      {walletCopied && typeof window !== 'undefined'
        ? createPortal(
            <div className="pointer-events-none fixed top-6 left-1/2 z-[9999] -translate-x-1/2 rounded-full border border-[#FEFBF4]/35 bg-[#200700]/90 px-4 py-1 text-[11px] uppercase tracking-[0.3em] text-[#FEFBF4] shadow-[0_12px_28px_rgba(242,62,1,0.28)]">
              Wallet copied
            </div>,
            document.body,
          )
        : null}
      <div className="relative w-full px-5 pb-2 pt-1 sm:px-7">
        <div className="relative mx-auto flex w-full max-w-6xl items-center gap-3">
          <div className="flex flex-shrink-0 items-center gap-3 overflow-x-auto whitespace-nowrap text-[8.5px] font-semibold uppercase tracking-[0.2em] text-[#FFF3E3]/85 scrollbar-hide">
            <span className="flex flex-shrink-0 items-center gap-2" title={`Connection status: ${statusVisual.label}`}>
              <span className={`h-2.5 w-2.5 rounded-full ${statusVisual.dotClass}`} aria-hidden="true" />
              <span className="sr-only">{statusVisual.label}</span>
            </span>

            {onToggleConnection && (
              <button
                type="button"
                onClick={onToggleConnection}
                className={`flex flex-shrink-0 items-center gap-2 underline decoration-[#FEFBF4]/45 underline-offset-[4px] transition hover:decoration-[#FEFBF4] ${statusVisual.textClass}`}
              >
                {connectionButtonLabel}
              </button>
            )}
          </div>

          <div className="ml-auto flex flex-shrink-0 items-center gap-3 overflow-x-auto whitespace-nowrap text-[8.5px] font-semibold uppercase tracking-[0.2em] text-[#FFF3E3]/85 scrollbar-hide">
            <span className="relative flex flex-shrink-0 items-center leading-none">
              <span className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 text-[6px] uppercase tracking-[0.38em] text-[#FEFBF4]/50 leading-none">
                Role
              </span>
              <span className={`leading-none ${sessionToneClass}`}>{sessionLabel}</span>
            </span>

            <span
              className="relative flex flex-shrink-0 items-center text-[#FEFBF4]/75 leading-none"
              title={mcpStatus.detail || `MCP: ${mcpStatus.label}`}
            >
              <span className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 text-[6px] uppercase tracking-[0.38em] text-[#FEFBF4]/40 leading-none">
                MCP
              </span>
              <span className="leading-none">{mcpText}</span>
            </span>

            <button
              type="button"
              onClick={handleWalletCopy}
              disabled={!walletAddressValue}
              className="relative flex flex-shrink-0 items-center text-[#FEFBF4] leading-none transition hover:text-[#FFF3E3] disabled:cursor-not-allowed disabled:text-[#FEFBF4]/40"
              title={walletAddressValue ? `Copy ${walletAddressValue}` : undefined}
            >
              <span className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 text-[6px] uppercase tracking-[0.38em] text-[#FEFBF4]/50 leading-none">
                Wallet
              </span>
              <span className="tracking-[0.18em] text-[#FEFBF4] leading-none">
                {walletPortfolio?.pending && mcpStatus.state !== 'user'
                  ? <span className="inline-block animate-pulse align-middle">…</span>
                  : walletLabel}
              </span>
              {walletCopied && (
                <span className="pointer-events-none absolute -bottom-3 left-1/2 -translate-x-1/2 text-[7px] uppercase tracking-[0.32em] text-[#FEFBF4]/70">
                  Copied
                </span>
              )}
            </button>

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
            <motion.button
              type="button"
              onClick={onReloadBrand}
              className="pointer-events-auto group relative flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#FEFBF4]/70 focus:ring-offset-2 focus:ring-offset-[#FF6500]"
              aria-label="Reload Dexter brand"
              initial={{ opacity: 0, scale: 0.78, rotate: -12, y: -28 }}
              animate={{ opacity: 1, scale: 1, rotate: 0, y: 0 }}
              transition={{ duration: 1.6, ease: [0.19, 1, 0.22, 1], delay: 0.35 }}
              whileHover={{ scale: 1.04, rotate: 4 }}
              whileFocus={{ scale: 1.04, rotate: -3 }}
              whileTap={{ scale: 0.96, rotate: -2 }}
            >
              <DexterAnimatedCrest size={82} className="relative" />
            </motion.button>
          </div>
        </div>
      </div>
    </>
  );
}

export default TopRibbon;
