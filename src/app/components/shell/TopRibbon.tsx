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
  crestOrigin?: { left: number; top: number; width: number; height: number } | null;
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
  const [headerRect, setHeaderRect] = React.useState<DOMRect | null>(null);
  const [isHeaderSettled, setIsHeaderSettled] = React.useState(false);

  React.useEffect(() => {
    if (!showHeaderCrest || !crestOrigin) {
      setIsHeaderSettled(false);
      setHeaderRect(null);
      return;
    }

    setIsHeaderSettled(false);
    setHeaderRect(null);

    let rafId: number;
    let lastRect: DOMRect | null = null;
    let stableCount = 0;
    let cancelled = false;
    const threshold = 0.75;

    const resolveHeader = () =>
      crestTargetRef.current?.closest<HTMLElement>(".dexter-header") ??
      document.querySelector<HTMLElement>(".dexter-header");

    const tick = () => {
      if (cancelled) {
        return;
      }
      const headerEl = resolveHeader();
      if (!headerEl) {
        stableCount = 0;
        lastRect = null;
        rafId = window.requestAnimationFrame(tick);
        return;
      }

      const rect = headerEl.getBoundingClientRect();
      if (lastRect) {
        const deltaX = Math.abs(rect.left - lastRect.left);
        const deltaY = Math.abs(rect.top - lastRect.top);
        if (deltaX < threshold && deltaY < threshold) {
          stableCount += 1;
          if (stableCount >= 4) {
            setHeaderRect(rect);
            setIsHeaderSettled(true);
            return;
          }
        } else {
          stableCount = 0;
        }
      }

      lastRect = rect;
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [showHeaderCrest, crestOrigin]);

  React.useLayoutEffect(() => {
    if (!showHeaderCrest || !crestOrigin || !headerRect || !isHeaderSettled) {
      setInitialTransform(null);
      return;
    }

    const targetRect = crestTargetRef.current?.getBoundingClientRect();
    if (!targetRect || targetRect.width === 0 || targetRect.height === 0) {
      setInitialTransform(null);
      return;
    }

    const normalizePoint = (rect: { left: number; top: number; width: number; height: number }) => ({
      x: rect.left + rect.width / 2 - headerRect.left,
      y: rect.top + rect.height / 2 - headerRect.top,
    });

    const originCenter = normalizePoint(crestOrigin);
    const targetCenter = normalizePoint(targetRect);

    const safeOriginWidth = crestOrigin.width > 0 ? crestOrigin.width : 1;
    const safeTargetWidth = targetRect.width > 0 ? targetRect.width : 1;
    const scale = safeOriginWidth / safeTargetWidth;

    setInitialTransform({
      x: originCenter.x - targetCenter.x,
      y: originCenter.y - targetCenter.y,
      scale: scale || 1,
    });
  }, [showHeaderCrest, crestOrigin, headerRect, isHeaderSettled]);

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
                className="relative flex items-center gap-2 rounded-full border border-[#FEFBF4]/30 px-3 py-1 font-display text-[10px] font-semibold tracking-[0.08em] text-[#FEFBF4] transition hover:border-[#FEFBF4]/50 hover:text-[#FFF3E3]"
                title={walletAddressValue ? `Copy ${walletAddressValue}` : undefined}
              >
                <span className="text-[9px] uppercase tracking-[0.28em] text-[#FEFBF4]/60">Wallet</span>
                <span className="text-[10px] tracking-[0.08em]">{walletLabel}</span>
                {walletCopied && (
                  <span className="pointer-events-none absolute -bottom-3 left-1/2 -translate-x-1/2 text-[8px] tracking-[0.08em] text-[#FEFBF4]/70">
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
                buttonToneClass="rounded-none border-transparent px-0 py-0 bg-transparent text-[#FEFBF4] hover:text-[#FFF3E3]"
                buttonTitle={sessionIdentity.type === 'user' ? sessionIdentity.user?.email ?? undefined : undefined}
                activeWalletKey={sessionIdentity.wallet?.public_key ?? activeWalletKey ?? undefined}
                walletPortfolio={walletPortfolio ?? undefined}
                userBadge={userBadge ?? undefined}
              />
            </div>
          </div>

          <AnimatePresence>
            {showHeaderCrest && (!crestOrigin || isHeaderSettled) ? (
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
