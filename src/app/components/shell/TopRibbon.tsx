import React from "react";
import { AnimatePresence, motion } from "framer-motion";
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
  showHeaderCrest?: boolean;
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
  showHeaderCrest = false,
}: TopRibbonProps) {
  const sessionVariant = resolveSessionRoleVariant(sessionIdentity, userBadge);
  const sessionLabel = resolveSessionLabel(sessionVariant);
  const sessionToneClass = resolveUserBadgeTextClass(sessionVariant);
  const mcpText = getMcpLabel(mcpStatus.state, mcpStatus.label);
  const walletAddressValue = sessionIdentity.wallet?.public_key ?? activeWalletKey ?? undefined;
  const walletLabel = formatWalletAddress(walletAddressValue);
  const hasConnectionToggle = Boolean(onToggleConnection);

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
            <div className="pointer-events-none fixed top-6 left-1/2 z-[9999] -translate-x-1/2 rounded-full border border-[#FEFBF4]/35 bg-[#200700]/90 px-4 py-1 font-display text-[11px] font-semibold tracking-[0.08em] text-[#FEFBF4] shadow-[0_12px_28px_rgba(242,62,1,0.28)]">
              Wallet copied
            </div>,
            document.body,
          )
        : null}
      <div
        className="relative w-full px-5 pb-2 pt-1 sm:px-7"
        data-session-status={sessionStatus}
        data-can-toggle-connection={hasConnectionToggle}
      >
        <div className="relative mx-auto flex w-full max-w-6xl items-center gap-3">
          <div className="ml-auto flex flex-shrink-0 items-center gap-3 overflow-x-auto whitespace-nowrap font-display text-[10px] font-semibold tracking-[0.08em] text-[#FFF3E3]/85 scrollbar-hide">
            <span className="relative flex flex-shrink-0 items-center leading-none">
              <span className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 font-display text-[7px] tracking-[0.08em] text-[#FEFBF4]/60 leading-none">
                Role
              </span>
              <span className={`leading-none ${sessionToneClass}`}>{sessionLabel}</span>
            </span>

            <span
              className="relative flex flex-shrink-0 items-center text-[#FEFBF4]/75 leading-none"
              title={mcpStatus.detail || `MCP: ${mcpStatus.label}`}
            >
              <span className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 font-display text-[7px] tracking-[0.08em] text-[#FEFBF4]/50 leading-none">
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
              <span className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 font-display text-[7px] tracking-[0.08em] text-[#FEFBF4]/60 leading-none">
                Wallet
              </span>
              <span className="font-display tracking-[0.08em] text-[#FEFBF4] leading-none">
                {walletPortfolio?.pending && mcpStatus.state !== 'user'
                  ? <span className="inline-block animate-pulse align-middle">…</span>
                  : walletLabel}
              </span>
              {walletCopied && (
                <span className="pointer-events-none absolute -bottom-3 left-1/2 -translate-x-1/2 font-display text-[8px] tracking-[0.08em] text-[#FEFBF4]/70">
                  Copied
                </span>
              )}
            </button>

            {walletSecondaryText && (
              <span className="flex flex-shrink-0 items-center gap-2 font-display text-[#FEFBF4]/60 tracking-[0.08em]">
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

          <div className="pointer-events-none absolute left-4 top-3 flex items-start justify-start">
            <AnimatePresence>
              {showHeaderCrest ? (
                <motion.button
                  key="dexter-crest-header"
                  type="button"
                  onClick={onReloadBrand}
                  className="pointer-events-auto group relative flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#FEFBF4]/70 focus:ring-offset-2 focus:ring-offset-[#FF6500]"
                  aria-label="Reload Dexter brand"
                  layoutId="dexter-crest"
                  initial={{ opacity: 0, scale: 0.9, rotate: -8, y: -18, x: -18 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0, y: 0, x: 0 }}
                  exit={{ opacity: 0, scale: 0.92, rotate: 8, y: -12, x: -10 }}
                  transition={{ duration: 0.6, ease: [0.19, 1, 0.22, 1] }}
                  whileHover={{ scale: 1.04, rotate: 4 }}
                  whileFocus={{ scale: 1.04, rotate: -3 }}
                  whileTap={{ scale: 0.96, rotate: -2 }}
                >
                  <DexterAnimatedCrest size={82} className="relative" />
                </motion.button>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
}

export default TopRibbon;
