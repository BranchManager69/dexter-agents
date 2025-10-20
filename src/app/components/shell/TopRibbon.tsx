import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { SessionStatus } from "@/app/types";
import type { DexterUserBadge } from "@/app/types";
import { AuthMenu } from "@/app/components/AuthMenu";
import { DexterAnimatedCrest } from "@/app/components/DexterAnimatedCrest";
import type { UserBadgeVariant } from "@/app/components/UserBadge";

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

interface TopRibbonProps {
  sessionStatus: SessionStatus;
  onToggleConnection?: () => void;
  onReloadBrand?: () => void;
  authState: AuthStateSummary;
  sessionIdentity: SessionIdentitySummary;
  activeWalletKey?: string | null;
  walletPortfolio?: WalletPortfolioSummary | null;
  onSignIn?: (email: string, captchaToken: string | null) => Promise<{ success: boolean; message: string }>;
  onSignOut?: () => void;
  turnstileSiteKey?: string;
  userBadge?: DexterUserBadge | null;
  showHeaderCrest?: boolean;
  crestOrigin?: { pageLeft: number; pageTop: number; width: number; height: number } | null;
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
  activeWalletKey,
  walletPortfolio,
  onSignIn,
  onSignOut,
  turnstileSiteKey,
  userBadge,
  showHeaderCrest = false,
  crestOrigin,
}: TopRibbonProps) {
  const sessionVariant = resolveSessionRoleVariant(sessionIdentity, userBadge);
  const sessionLabel = resolveSessionLabel(sessionVariant);
  const walletAddressValue = sessionIdentity.wallet?.public_key ?? activeWalletKey ?? undefined;
  const walletLabel = formatWalletAddress(walletAddressValue);
  const hasConnectionToggle = Boolean(onToggleConnection);
  const hasWalletAddress = walletAddressValue && walletLabel !== 'Auto';

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

  const crestTargetRef = React.useRef<HTMLDivElement | null>(null);
  const [initialTransform, setInitialTransform] = React.useState<{ x: number; y: number; scale: number } | null>(null);
  const [originReady, setOriginReady] = React.useState(false);

  React.useLayoutEffect(() => {
    if (!showHeaderCrest) {
      setInitialTransform(null);
      setOriginReady(false);
      return;
    }

    let rafTwo: number | undefined;
    let cancelled = false;

    const measure = () => {
      if (cancelled) return;
      const targetNode = crestTargetRef.current;
      if (!targetNode) {
        rafTwo = window.requestAnimationFrame(measure);
        return;
      }

      const targetRect = targetNode.getBoundingClientRect();
      if (targetRect.width === 0 || targetRect.height === 0) {
        rafTwo = window.requestAnimationFrame(measure);
        return;
      }

      if (crestOrigin && typeof window !== 'undefined') {
        const scrollX = typeof window.scrollX === 'number' ? window.scrollX : window.pageXOffset;
        const scrollY = typeof window.scrollY === 'number' ? window.scrollY : window.pageYOffset;
        const viewport = window.visualViewport;
        const offsetLeft = viewport?.offsetLeft ?? 0;
        const offsetTop = viewport?.offsetTop ?? 0;

        const targetLeft = targetRect.left + scrollX + offsetLeft;
        const targetTop = targetRect.top + scrollY + offsetTop;

        const originCenterX = crestOrigin.pageLeft + crestOrigin.width / 2;
        const originCenterY = crestOrigin.pageTop + crestOrigin.height / 2;
        const targetCenterX = targetLeft + targetRect.width / 2;
        const targetCenterY = targetTop + targetRect.height / 2;

        const safeTargetWidth = targetRect.width > 0 ? targetRect.width : 1;
        const safeOriginWidth = crestOrigin.width > 0 ? crestOrigin.width : safeTargetWidth;
        const scale = safeOriginWidth / safeTargetWidth;

        setInitialTransform({
          x: originCenterX - targetCenterX,
          y: originCenterY - targetCenterY,
          scale,
        });
      } else {
        setInitialTransform(null);
      }

      setOriginReady(true);
    };

    const rafOne = window.requestAnimationFrame(() => {
      rafTwo = window.requestAnimationFrame(measure);
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafOne);
      if (rafTwo) {
        window.cancelAnimationFrame(rafTwo);
      }
      setOriginReady(false);
    };
  }, [showHeaderCrest, crestOrigin]);

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
          <div className="ml-auto flex flex-shrink-0 items-center gap-3 pl-2 whitespace-nowrap">
            {hasWalletAddress ? (
              <button
                type="button"
                onClick={handleWalletCopy}
                className="relative flex items-center gap-2 rounded-full bg-white/92 px-4 py-1.5 font-display text-[11px] font-semibold tracking-[0.08em] text-[#1F130A] shadow-[0_12px_26px_rgba(18,8,4,0.18)] transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#1F130A]/15 focus:ring-offset-2 focus:ring-offset-transparent"
                title={walletAddressValue ? `Copy ${walletAddressValue}` : undefined}
              >
                <span className="text-[9px] uppercase tracking-[0.28em] text-[#5C4031]">Wallet</span>
                <span className="text-[11px] tracking-[0.08em] text-[#1F130A]">{walletLabel}</span>
                {walletCopied && (
                  <span className="pointer-events-none absolute -bottom-3 left-1/2 -translate-x-1/2 text-[8px] tracking-[0.08em] text-[#1F130A]/70">
                    Copied
                  </span>
                )}
              </button>
            ) : null}

            <div className="flex items-center">
              <AuthMenu
                isAuthenticated={authState.isAuthenticated}
                loading={authState.loading}
                email={authState.email}
                onSignIn={handleAuthSignIn}
                onSignOut={handleAuthSignOut}
                turnstileSiteKey={turnstileSiteKey}
                roleLabel={sessionLabel}
                buttonTitle={sessionIdentity.type === 'user' ? sessionIdentity.user?.email ?? undefined : undefined}
                activeWalletKey={sessionIdentity.wallet?.public_key ?? activeWalletKey ?? undefined}
                walletPortfolio={walletPortfolio ?? undefined}
                userBadge={userBadge ?? undefined}
              />
            </div>
          </div>

          <AnimatePresence>
            {showHeaderCrest && (!crestOrigin || originReady) ? (
              <motion.div
                key="dexter-crest-header"
                layoutId="dexter-crest"
                ref={crestTargetRef}
                className="pointer-events-none fixed z-[60]"
                style={{
                  left: 'max(env(safe-area-inset-left, 0px) + 16px, 16px)',
                  top: 'max(env(safe-area-inset-top, 0px) + 16px, 16px)',
                }}
                initial={initialTransform
                  ? { opacity: 0, scale: initialTransform.scale, rotate: -10, x: initialTransform.x, y: initialTransform.y }
                  : { opacity: 0, scale: 0.9, rotate: -10, x: -24, y: -24 }}
                animate={{ opacity: 1, scale: 1, rotate: 0, x: 0, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, rotate: 6, y: -12, x: -8 }}
                transition={{ duration: 0.6, ease: [0.19, 1, 0.22, 1] }}
              >
                <motion.button
                  type="button"
                  onClick={onReloadBrand}
                  className="pointer-events-auto group relative flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#FEFBF4]/70 focus:ring-offset-2 focus:ring-offset-[#FF6500]"
                  aria-label="Reload Dexter brand"
                  whileHover={{ scale: 1.04, rotate: 4 }}
                  whileFocus={{ scale: 1.04, rotate: -3 }}
                  whileTap={{ scale: 0.96, rotate: -2 }}
                >
                  <DexterAnimatedCrest size={82} className="relative" />
                </motion.button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}

export default TopRibbon;
