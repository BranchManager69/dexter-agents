import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { resolveEmailProvider } from "@/app/lib/emailProviders";
import { TurnstileWidget } from "./TurnstileWidget";
import { HashBadge } from "@/app/components/toolNotes/renderers/helpers";

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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right: number } | null>(null);

  const providerInfo = resolveEmailProvider(email);
  const inboxUrl = providerInfo?.inboxUrl ?? "";

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
      setWalletFeedback("");
      if (turnstileSiteKey) {
        setCaptchaToken(null);
        setTurnstileVisible(Boolean(turnstileSiteKey));
        setTurnstileKey((key) => key + 1);
      }
    }
  }, [open, turnstileSiteKey]);

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
    : "Guest";

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
    setWalletFeedback("");
    if (turnstileSiteKey) {
      setCaptchaToken(null);
      setTurnstileVisible(Boolean(turnstileSiteKey));
      setTurnstileKey((key) => key + 1);
    }
  };

  const handleExportWallet = () => {
    setWalletFeedback('Export coming soon');
    setTimeout(() => setWalletFeedback(""), 2000);
  };

  const dropdownContent = open && dropdownPosition && (
    <div
      ref={dropdownRef}
      className="fixed z-[9999] w-80 rounded-md border border-neutral-800/60 bg-surface-glass/95 shadow-elevated backdrop-blur-xl"
      style={{ top: `${dropdownPosition.top}px`, right: `${dropdownPosition.right}px` }}
    >
          {isAuthenticated ? (
            <div className="p-4">
              <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                Signed in
              </div>
              <div className="mb-4 text-sm text-neutral-200">
                {authenticatedEmail ?? "Dexter user"}
              </div>
              {roleLabel && (
                <div className="mb-3 text-xs text-neutral-400">
                  Role: <span className="text-neutral-100">{roleLabel}</span>
                </div>
              )}
              {activeWalletKey && (
                <div className="mb-4 rounded-md border border-neutral-800/60 bg-surface-glass/60 px-3 py-3 text-xs text-neutral-300">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Active Wallet</div>
                  <div className="mt-2">
                    <HashBadge value={activeWalletKey} ariaLabel="wallet address" />
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={handleExportWallet}
                      className="flex-1 rounded-md border border-rose-500/50 bg-rose-500/12 px-3 py-2 text-xs text-rose-100 transition hover:border-rose-300 hover:text-rose-50"
                    >
                      Export wallet
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
                <label htmlFor="auth-email" className="mb-2 block text-[10px] uppercase tracking-[0.18em] text-neutral-500">
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
                  className="w-full rounded-md border border-flux/40 bg-flux/10 px-3 py-2 text-xs uppercase tracking-[0.18em] text-flux transition hover:bg-flux/20 disabled:opacity-50"
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
                  <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-neutral-500">
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

  const closedToneClass = buttonToneClass || 'border-neutral-800/60 bg-surface-glass/60 text-neutral-200 hover:border-flux/40 hover:text-flux';
  const openToneClass = buttonToneClass
    ? `${buttonToneClass} ring-2 ring-offset-0 ring-flux/40`
    : 'border-flux/40 bg-flux/10 text-flux';

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-[11px] transition ${open ? openToneClass : closedToneClass}`}
        aria-haspopup="menu"
        aria-expanded={open}
        title={buttonTitle || authenticatedEmail || undefined}
      >
        <span>{accountLabel}</span>
        <svg
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.44l3.71-3.21a.75.75 0 111.04 1.08l-4.25 3.65a.75.75 0 01-1.04 0L5.21 8.27a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {typeof window !== 'undefined' && dropdownContent && createPortal(dropdownContent, document.body)}
    </div>
  );
}
