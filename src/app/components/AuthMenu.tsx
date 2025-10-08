import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./AuthMenu.module.css";
import { resolveEmailProvider } from "@/app/lib/emailProviders";
import { TurnstileWidget } from "./TurnstileWidget";
import { HashBadge } from "@/app/components/toolNotes/renderers/helpers";
import { UserBadge } from "./UserBadge";
import type { DexterUserBadge } from "@/app/types";

interface WalletPortfolioSummary {
  status: "idle" | "loading" | "ready" | "error";
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
  turnstileSlot,
  roleLabel,
  buttonToneClass,
  buttonTitle,
  activeWalletKey,
  walletPortfolio,
  userBadge,
}: AuthMenuProps) {
  const [accountOpen, setAccountOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [magicLinkBusy, setMagicLinkBusy] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [turnstileVisible, setTurnstileVisible] = useState(() => Boolean(turnstileSiteKey));
  const [turnstileReady, setTurnstileReady] = useState(false);
  const [walletFeedback, setWalletFeedback] = useState("");
  const [exportBusy, setExportBusy] = useState(false);
  const feedbackTimeoutRef = useRef<number | null>(null);

  const providerInfo = resolveEmailProvider(email);
  const inboxUrl = providerInfo?.inboxUrl ?? "";

  const accountRef = useRef<HTMLDivElement | null>(null);

  const isGuest = !isAuthenticated;

  useEffect(() => {
    if (!accountOpen && turnstileSiteKey) {
      setCaptchaToken(null);
      setTurnstileVisible(Boolean(turnstileSiteKey));
      setTurnstileReady(false);
      setTurnstileKey((key) => key + 1);
    }
  }, [accountOpen, turnstileSiteKey]);

  useEffect(() => {
    if (!accountOpen) return;

    function handleClick(event: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    }

    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, [accountOpen]);

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        window.clearTimeout(feedbackTimeoutRef.current);
        feedbackTimeoutRef.current = null;
      }
    };
  }, []);

  const deriveAccountLabel = () => {
    if (loading) return "Checking…";
    if (!isAuthenticated) return "Log in";
    if (authenticatedEmail && authenticatedEmail.includes("@")) {
      return authenticatedEmail.split("@")[0];
    }
    return authenticatedEmail ?? "Dexter user";
  };

  const accountLabel = deriveAccountLabel();
  const initialsSource = authenticatedEmail ?? "Dexter";
  const initials = initialsSource[0]?.toUpperCase() ?? "D";

  const setFeedbackWithTimeout = useCallback((message: string, duration = 5000) => {
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
  }, []);

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

  const handleSignOut = async () => {
    await onSignOut();
    setAccountOpen(false);
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
      setTurnstileReady(false);
      setTurnstileKey((key) => key + 1);
    }
  };

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

  const renderGuestContent = () => (
    <>
      <div className={styles.section}>
        <label htmlFor="auth-email" className={styles.labelInline}>
          Email
        </label>
        <input
          id="auth-email"
          type="email"
          className={styles.input}
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={Boolean(turnstileSiteKey) && !turnstileReady}
        />
      </div>

      {turnstileSiteKey && (
        <div className={`${styles.section} ${styles.sectionGrid}`}>
          {turnstileVisible ? (
            <div className={`${styles.turnstileOuter}${turnstileReady ? ` ${styles.turnstileOuterReady}` : ""}`}>
              <div className={styles.turnstilePlaceholder}>
                <span className={styles.turnstileSpinner} aria-hidden />
                <span>Authenticating…</span>
              </div>
              <TurnstileWidget
                refreshKey={turnstileKey}
                siteKey={turnstileSiteKey}
                onToken={(token) => setCaptchaToken(token)}
                className={styles.turnstile}
              />
            </div>
          ) : (
            <button
              type="button"
              className={styles.action}
              onClick={() => {
                setTurnstileVisible(true);
                setTurnstileReady(false);
                setTurnstileKey((key) => key + 1);
              }}
            >
              Verify again
            </button>
          )}
        </div>
      )}

      <div className={styles.section}>
        <button
          type="button"
          className={`${styles.action} ${styles.actionPrimary}`}
          onClick={handleSendMagicLink}
          disabled={magicLinkBusy || (turnstileSiteKey ? !turnstileReady : false)}
        >
          {magicLinkBusy ? "Sending…" : "Email me a link"}
        </button>
      </div>

      {(authMessage || magicLinkSent) && (
        <div className={styles.message}>
          <span>{authMessage}</span>
          {magicLinkSent && (
            <span className={styles.messageProviders}>
              {inboxUrl ? (
                <a href={inboxUrl} target="_blank" rel="noreferrer" className={styles.messageLink}>
                  Open {providerInfo?.label ?? "inbox"} ↗
                </a>
              ) : (
                <span className={styles.messageHint}>Try Gmail, Outlook, Proton, or check Spam</span>
              )}
            </span>
          )}
        </div>
      )}

      {turnstileSlot}
    </>
  );

  const renderSignedInContent = () => {
    const badgeVariant = userBadge === "dev" ? "dev" : userBadge === "pro" ? "pro" : null;

    return (
      <>
        <div className={styles.section}>
          <div className={styles.headline}>Signed in</div>
          <div className={styles.value}>{authenticatedEmail ?? "Dexter user"}</div>
          {roleLabel ? (
            <div className={styles.pill}>
              <span>Role</span>
              {badgeVariant ? <UserBadge variant={badgeVariant} size="sm" /> : <span>{roleLabel}</span>}
            </div>
          ) : null}
        </div>

        {activeWalletKey ? (
          <div className={styles.walletSection}>
            <div className={styles.walletRow}>
              <span>Wallet</span>
              <HashBadge value={activeWalletKey} ariaLabel="wallet address" />
            </div>
            {walletPortfolio ? (
              <>
                {walletPortfolio.pending ? (
                  <div className={styles.walletRow}>
                    <span>Status</span>
                    <span className="inline-block animate-pulse">Refreshing…</span>
                  </div>
                ) : walletPortfolio.status === "error" ? (
                  <div className={styles.walletRow}>
                    <span>Status</span>
                    <span>{walletPortfolio.error ?? "Unable to load balances"}</span>
                  </div>
                ) : (
                  <>
                    {walletPortfolio.solBalanceFormatted || walletPortfolio.totalUsdFormatted ? (
                      <div className={styles.walletRow}>
                        <span>SOL / USD</span>
                        <span>
                          {[walletPortfolio.solBalanceFormatted, walletPortfolio.totalUsdFormatted]
                            .filter(Boolean)
                            .join(" • ")}
                        </span>
                      </div>
                    ) : null}
                    {walletPortfolio.tokenCount ? (
                      <div className={styles.walletRow}>
                        <span>Tokens</span>
                        <span>{walletPortfolio.tokenCount}</span>
                      </div>
                    ) : null}
                    {walletPortfolio.lastUpdatedLabel ? (
                      <div className={styles.walletRow}>
                        <span>Updated</span>
                        <span>{walletPortfolio.lastUpdatedLabel}</span>
                      </div>
                    ) : null}
                  </>
                )}
              </>
            ) : null}

            <div className={styles.walletActions}>
              <button
                type="button"
                className={styles.action}
                onClick={handleExportWallet}
                disabled={exportBusy}
              >
                {exportBusy ? "Exporting…" : "Export wallet"}
              </button>
              <button type="button" className={`${styles.action} ${styles.actionDanger}`} onClick={handleSignOut}>
                Sign out
              </button>
            </div>
            {walletFeedback ? <div className={styles.walletFeedback}>{walletFeedback}</div> : null}
          </div>
        ) : (
          <div className={styles.section}>
            <button type="button" className={`${styles.action} ${styles.actionDanger}`} onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        )}
      </>
    );
  };

  return (
    <div className={styles.accountMenu} ref={accountRef}>
      <button
        type="button"
        className={`${styles.trigger}${isGuest ? ` ${styles.triggerGuest}` : ""}${buttonToneClass ? ` ${buttonToneClass}` : ""}`}
        onClick={() => setAccountOpen((open) => !open)}
        aria-expanded={accountOpen}
        title={buttonTitle}
      >
        {!isGuest && <span className={styles.avatar} aria-hidden="true">{initials}</span>}
        <span className={`${styles.label}${isGuest ? ` ${styles.triggerGuestLabel}` : ""}`}>{accountLabel}</span>
      </button>

      {accountOpen && (
        <div className={styles.dropdown}>
          {isAuthenticated ? renderSignedInContent() : renderGuestContent()}
        </div>
      )}
    </div>
  );
}
