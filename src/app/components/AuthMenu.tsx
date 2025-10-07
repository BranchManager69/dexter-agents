import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { resolveEmailProvider } from "@/app/lib/emailProviders";
import { TurnstileWidget } from "./TurnstileWidget";
import { HashBadge } from "@/app/components/toolNotes/renderers/helpers";
import { UserBadge } from "./UserBadge";
import type { DexterUserBadge } from "@/app/types";

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

interface AuthMenuProps {
  isAuthenticated: boolean;
  loading: boolean;
  email: string | null;
  onSignIn: (email: string, captchaToken: string | null) => Promise<{ success: boolean; message: string }>;
  onSignOut: () => void;
  turnstileSiteKey?: string;
  turnstileSlot?: React.ReactNode;
  roleLabel?: string | null;
  buttonToneClass?: string;
  buttonTitle?: string;
  activeWalletKey?: string | null;
  walletPortfolio?: WalletPortfolioSummary;
  userBadge?: DexterUserBadge | null;
}

export function AuthMenu({
  isAuthenticated,
  loading,
  email: authenticatedEmail,
  onSignIn,
  onSignOut,
  turnstileSiteKey,
  roleLabel,
  buttonToneClass,
  buttonTitle,
  activeWalletKey,
  walletPortfolio,
  userBadge,
}: AuthMenuProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [magicLinkBusy, setMagicLinkBusy] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [turnstileVisible, setTurnstileVisible] = useState(() => Boolean(turnstileSiteKey));
  const [walletFeedback, setWalletFeedback] = useState<string>("");
  const [exportBusy, setExportBusy] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right: number } | null>(null);
  const feedbackTimeoutRef = useRef<number | null>(null);

  const providerInfo = resolveEmailProvider(email);
  const inboxUrl = providerInfo?.inboxUrl ?? "";

  const badgeVariant = userBadge === "dev" ? "dev" : userBadge === "pro" ? "pro" : null;
  const accountPillClass = (() => {
    switch (badgeVariant) {
      case 'dev':
        return 'bg-amber-400/25 border border-amber-300/60 text-amber-100';
      case 'pro':
        return 'bg-iris/20 border border-iris/50 text-iris';
      default:
        return 'bg-neutral-900/50 border border-neutral-700 text-neutral-200';
    }
  })();

  // Calculate dropdown position when opening
  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    } else {
      setDropdownPosition(null);
    }
  }, [open]);

  // Reset turnstile when dropdown closes
  useEffect(() => {
    if (!open) {
      if (feedbackTimeoutRef.current) {
        window.clearTimeout(feedbackTimeoutRef.current);
        feedbackTimeoutRef.current = null;
      }
      setWalletFeedback("");
      if (turnstileSiteKey) {
        setCaptchaToken(null);
        setTurnstileVisible(Boolean(turnstileSiteKey));
        setTurnstileKey((key) => key + 1);
      }
    }
  }, [open, turnstileSiteKey]);

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        window.clearTimeout(feedbackTimeoutRef.current);
        feedbackTimeoutRef.current = null;
      }
    };
  }, []);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    function handlePointer(event: MouseEvent | PointerEvent | TouchEvent) {
      const targetNode = event.target as Node | null;
      const path = typeof event.composedPath === "function" ? event.composedPath() : [];
      const isInContainer = containerRef.current ? path.includes(containerRef.current) || (targetNode ? containerRef.current.contains(targetNode) : false) : false;
      const isInDropdown = dropdownRef.current ? path.includes(dropdownRef.current) || (targetNode ? dropdownRef.current.contains(targetNode) : false) : false;
      if (isInContainer || isInDropdown) return;
      setOpen(false);
    }
    window.addEventListener("pointerdown", handlePointer, true);
    window.addEventListener("mousedown", handlePointer, true);
    window.addEventListener("touchstart", handlePointer, true);
    return () => {
      window.removeEventListener("pointerdown", handlePointer, true);
      window.removeEventListener("mousedown", handlePointer, true);
      window.removeEventListener("touchstart", handlePointer, true);
    };
  }, [open]);

  const accountLabel = loading
    ? "Checking…"
    : isAuthenticated
    ? authenticatedEmail?.split("@")[0] || "Signed in"
    : "Sign in";

  const handleSendMagicLink = async () => {
    if (!email.trim()) {
      setAuthMessage("Enter your email.");
      return;
    }
    if (turnstileSiteKey && !captchaToken) {
      setAuthMessage("Complete the verification challenge to continue.");
      return;
    }
    setMagicLinkBusy(true);
    setMagicLinkSent(false);
    setAuthMessage("");

    const result = await onSignIn(email, captchaToken);
    if (result.success) {
      setMagicLinkSent(true);
      setAuthMessage("Check your inbox for the sign-in link.");
      if (turnstileSiteKey) {
        setCaptchaToken(null);
        setTurnstileVisible(false);
      }
    } else {
      setAuthMessage(result.message);
    }

    setMagicLinkBusy(false);
  };

  const handleSignOut = () => {
    onSignOut();
    setOpen(false);
    setEmail("");
    setAuthMessage("");
    setMagicLinkSent(false);
    if (feedbackTimeoutRef.current) {
      window.clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
    }
    setWalletFeedback("");
    if (turnstileSiteKey) {
      setCaptchaToken(null);
      setTurnstileVisible(Boolean(turnstileSiteKey));
      setTurnstileKey((key) => key + 1);
    }
  };

  const setFeedbackWithTimeout = useCallback(
    (message: string, duration = 5000) => {
      if (feedbackTimeoutRef.current) {
        window.clearTimeout(feedbackTimeoutRef.current);
        feedbackTimeoutRef.current = null;
      }
      setWalletFeedback(message);
      if (duration > 0) {
        feedbackTimeoutRef.current = window.setTimeout(() => {
          setWalletFeedback("");
          feedbackTimeoutRef.current = null;
        }, duration);
      }
    },
    [setWalletFeedback],
  );

  const handleExportWallet = useCallback(async () => {
    if (exportBusy) return;
    setFeedbackWithTimeout("Preparing export…", 0);
    setExportBusy(true);

    try {
      const response = await fetch("/api/wallet/export", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        let errorMessage = "Unable to export wallet.";
        try {
          const errorData = await response.json();
          if (typeof errorData?.error === "string") {
            errorMessage = errorData.error.replace(/_/g, " ");
          }
        } catch {
          // ignore parse errors
        }
        setFeedbackWithTimeout(errorMessage, 6000);
        return;
      }

      const payload = await response.json();
      const secretKey = typeof payload?.secret_key === "string" ? payload.secret_key.trim() : null;
      if (!secretKey) {
        setFeedbackWithTimeout("Wallet export response missing key.", 6000);
        return;
      }

      const blob = new Blob([secretKey], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      try {
        const filenameSuffix = secretKey.slice(0, 8) || "wallet";
        const link = document.createElement("a");
        link.href = url;
        link.download = `dexter-wallet-${filenameSuffix}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setFeedbackWithTimeout("Wallet export downloaded.", 6000);
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Wallet export failed", error);
      setFeedbackWithTimeout("Unexpected error exporting wallet.", 6000);
    } finally {
      setExportBusy(false);
    }
  }, [exportBusy, setFeedbackWithTimeout]);

  const dropdownContent = open && dropdownPosition && (
    <div
      ref={dropdownRef}
      className="fixed z-[9999] w-80 rounded-md border border-neutral-800/60 bg-surface-glass/95 shadow-elevated backdrop-blur-xl"
      style={{ top: `${dropdownPosition.top}px`, right: `${dropdownPosition.right}px` }}
    >
          {isAuthenticated ? (
            <div className="p-4">
              <div className="mb-2 font-display text-[10px] font-semibold tracking-[0.08em] text-neutral-500">
                Signed in
              </div>
              <div className="mb-4 text-sm text-neutral-200">
                {authenticatedEmail ?? "Dexter user"}
              </div>
              {roleLabel && (
                <div className="mb-3 text-xs text-neutral-400">
                  Role:{" "}
                  {badgeVariant ? (
                    <UserBadge variant={badgeVariant} size="sm" className="ml-2" />
                  ) : (
                    <span className="ml-1 text-neutral-100">{roleLabel}</span>
                  )}
                </div>
              )}
              {activeWalletKey && (
                <div className="mb-4 rounded-md border border-neutral-800/60 bg-surface-glass/60 px-3 py-3 text-xs text-neutral-300">
                  <div className="font-display text-[10px] font-semibold tracking-[0.08em] text-neutral-500">Active Wallet</div>
                  <div className="mt-2">
                    <HashBadge value={activeWalletKey} ariaLabel="wallet address" />
                  </div>
                  {walletPortfolio && (
                    <div className="mt-3 space-y-1 text-[11px] text-neutral-300">
                      <div className="font-display text-[10px] font-semibold tracking-[0.08em] text-neutral-500">Balances</div>
                      {walletPortfolio.pending && walletPortfolio.status !== 'ready' ? (
                        <div className="text-neutral-500">
                          <span className="inline-block animate-pulse">…</span>
                        </div>
                      ) : walletPortfolio.status === 'loading' && !walletPortfolio.solBalanceFormatted && !walletPortfolio.totalUsdFormatted ? (
                        <div className="text-neutral-500">
                          <span className="inline-block animate-pulse">…</span>
                        </div>
                      ) : walletPortfolio.status === 'error' ? (
                        <div className="text-accent-critical">
                          {walletPortfolio.error || 'Unable to load balances'}
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2 text-neutral-100">
                          {walletPortfolio.solBalanceFormatted && <span>{walletPortfolio.solBalanceFormatted}</span>}
                          {walletPortfolio.solBalanceFormatted && walletPortfolio.totalUsdFormatted && (
                            <span className="text-neutral-600">•</span>
                          )}
                          {walletPortfolio.totalUsdFormatted && <span>{walletPortfolio.totalUsdFormatted}</span>}
                          {walletPortfolio.tokenCount > 0 && (
                            <span className="text-neutral-500">({walletPortfolio.tokenCount} tokens)</span>
                          )}
                        </div>
                      )}
                      {walletPortfolio.balances.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {walletPortfolio.balances.slice(0, 5).map((token, index) => {
                            const symbol = token.symbol || token.label || (token.mint ? `${token.mint.slice(0, 4)}…${token.mint.slice(-4)}` : `Token ${index + 1}`);
                            const amount = typeof token.amountUi === 'number'
                              ? token.amountUi.toLocaleString('en-US', {
                                  maximumFractionDigits: token.amountUi >= 1 ? 4 : 6,
                                })
                              : '—';
                            const usd = typeof token.usdValue === 'number'
                              ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(token.usdValue)
                              : null;
                            return (
                              <div key={`${token.mint ?? symbol}-${index}`} className="flex items-center justify-between gap-2 text-[11px] text-neutral-200">
                                <span className="font-medium text-neutral-100" title={token.label ?? symbol}>{symbol}</span>
                                <span className="flex items-center gap-2 text-neutral-300">
                                  <span title={`${amount} ${symbol}`}>{amount}</span>
                                  {usd && <span className="text-neutral-500">{usd}</span>}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {walletPortfolio.lastUpdatedLabel && walletPortfolio.status === 'ready' && (
                        <div className="font-display text-[10px] font-semibold tracking-[0.08em] text-neutral-500">
                          Updated {walletPortfolio.lastUpdatedLabel}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={handleExportWallet}
                      disabled={exportBusy}
                      className="flex-1 rounded-md border border-rose-500/50 bg-rose-500/12 px-3 py-2 text-xs text-rose-100 transition hover:border-rose-300 hover:text-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {exportBusy ? "Preparing…" : "Export wallet"}
                    </button>
                  </div>
                  {walletFeedback && (
                    <div className="mt-2 text-[11px] text-neutral-300">{walletFeedback}</div>
                  )}
                </div>
              )}
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full rounded-md border border-accent-critical/40 bg-accent-critical/10 px-3 py-2 text-xs text-accent-critical transition hover:bg-accent-critical/20"
              >
                Sign out
              </button>
            </div>
          ) : (
            <>
              <div className="border-b border-neutral-800/60 p-4">
                <label htmlFor="auth-email" className="mb-2 block font-display text-[10px] font-semibold tracking-[0.08em] text-neutral-500">
                  Email
                </label>
                <input
                  id="auth-email"
                  type="email"
                  className="mb-3 w-full rounded-md border border-neutral-800/80 bg-surface-base/80 px-3 py-2 text-sm text-neutral-100 outline-none transition focus:border-flux/60 focus:ring-2 focus:ring-flux/30"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      handleSendMagicLink();
                    }
                  }}
                />
                <button
                  type="button"
                  className="w-full rounded-md border border-flux/40 bg-flux/10 px-3 py-2 font-display text-xs font-semibold tracking-[0.08em] text-flux transition hover:bg-flux/20 disabled:opacity-50"
                  onClick={handleSendMagicLink}
                  disabled={magicLinkBusy}
                >
                  {magicLinkBusy ? "Sending…" : "Email me a link"}
                </button>
              </div>

              {(authMessage || magicLinkSent) && (
                <div className="border-b border-neutral-800/60 p-4 text-xs text-neutral-300">
                  <span>{authMessage}</span>
                  {magicLinkSent && inboxUrl && (
                    <div className="mt-2">
                      <a
                        href={inboxUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-flux hover:underline"
                      >
                        Open {providerInfo?.label ?? "inbox"}
                        <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z"
                            clipRule="evenodd"
                          />
                          <path
                            fillRule="evenodd"
                            d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </a>
                    </div>
                  )}
                  {magicLinkSent && !inboxUrl && (
                    <div className="mt-1 text-[10px] text-neutral-500">
                      Try Gmail, Outlook, Proton, or check Spam
                    </div>
                  )}
                </div>
              )}

              {turnstileSiteKey && (
                <div className="p-4">
                  <div className="mb-2 font-display text-[10px] font-semibold tracking-[0.08em] text-neutral-500">
                    Security Check
                  </div>
                  {turnstileVisible ? (
                    <TurnstileWidget
                      refreshKey={turnstileKey}
                      siteKey={turnstileSiteKey}
                      onToken={(token) => setCaptchaToken(token)}
                      action="magic_link"
                    />
                  ) : (
                    <button
                      type="button"
                      className="w-full rounded-md border border-neutral-800/60 bg-surface-glass/60 px-3 py-2 text-xs text-neutral-300 transition hover:border-flux/40 hover:text-flux"
                      onClick={() => {
                        setTurnstileVisible(true);
                        setTurnstileKey((key) => key + 1);
                      }}
                    >
                      Verify again
                    </button>
                  )}
                </div>
              )}
            </>
          )}
    </div>
  );

  const closedToneClass = buttonToneClass || 'border-transparent bg-transparent text-neutral-200 hover:text-flux';
  const openToneClass = buttonToneClass
    ? `${buttonToneClass} ring-2 ring-offset-0 ring-flux/40`
    : 'border-flux/40 bg-flux/10 text-flux';

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`inline-flex items-center gap-0 rounded-md border px-0 py-0 text-[11px] transition ${open ? openToneClass : closedToneClass}`}
        aria-haspopup="menu"
        aria-expanded={open}
        title={buttonTitle || authenticatedEmail || undefined}
        data-auth-trigger
      >
        {accountLabel ? (
          <span className={`inline-flex items-center px-2.5 py-1 font-display text-xs font-semibold tracking-[0.08em] ${accountPillClass}`}>
            {accountLabel}
          </span>
        ) : null}
      </button>

      {typeof window !== 'undefined' && dropdownContent && createPortal(dropdownContent, document.body)}
    </div>
  );
}
