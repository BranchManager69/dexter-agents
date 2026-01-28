/**
 * WalletExportSection Component
 * 
 * A self-contained UI for exporting the user's managed wallet.
 * Handles the full flow: idle → confirm → loading → revealed/error
 */

"use client";

import { useWalletExport } from "@/app/hooks/useWalletExport";
import styles from "./WalletExportSection.module.css";

interface WalletExportSectionProps {
  /** Callback when user clicks sign out (rendered alongside export in idle state) */
  onSignOut?: () => void;
}

export function WalletExportSection({ onSignOut }: WalletExportSectionProps) {
  const {
    step,
    keyFormat,
    feedback,
    error,
    initiateExport,
    confirmExport,
    cancelExport,
    setKeyFormat,
    copyKey,
    getFormattedKey,
  } = useWalletExport();

  const formattedKey = getFormattedKey();

  // Idle state - show export and sign out buttons
  if (step === "idle") {
    return (
      <div className={styles.ctaRow}>
        <button
          type="button"
          className={`${styles.actionButton} ${styles.actionPrimary}`}
          onClick={initiateExport}
        >
          Export wallet
        </button>
        {onSignOut && (
          <button
            type="button"
            className={`${styles.actionButton} ${styles.actionDanger}`}
            onClick={onSignOut}
          >
            Sign out
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={styles.exportSection}>
      {/* Confirm step */}
      {step === "confirm" && (
        <div className={styles.exportConfirm}>
          <div className={styles.exportWarning}>
            <span className={styles.exportWarningIcon} aria-hidden="true">⚠️</span>
            <div className={styles.exportWarningText}>
              <strong>Reveal private key?</strong>
              <p>Your private key grants full control of this wallet. Never share it with anyone. Make sure no one is watching your screen.</p>
            </div>
          </div>
          <div className={styles.ctaRow}>
            <button
              type="button"
              className={`${styles.actionButton} ${styles.actionDanger}`}
              onClick={confirmExport}
            >
              Yes, reveal key
            </button>
            <button
              type="button"
              className={styles.actionButton}
              onClick={cancelExport}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Loading step */}
      {step === "loading" && (
        <div className={styles.ctaRow}>
          <button
            type="button"
            className={`${styles.actionButton} ${styles.actionPrimary}`}
            disabled
          >
            <span className={styles.loadingSpinner} aria-hidden="true" />
            Fetching key…
          </button>
        </div>
      )}

      {/* Error step */}
      {step === "error" && error && (
        <>
          <div className={styles.errorBox}>
            <p className={styles.errorText}>{error}</p>
          </div>
          <div className={styles.ctaRow}>
            <button
              type="button"
              className={`${styles.actionButton} ${styles.actionPrimary}`}
              onClick={initiateExport}
            >
              Try again
            </button>
            <button
              type="button"
              className={styles.actionButton}
              onClick={cancelExport}
            >
              Cancel
            </button>
          </div>
        </>
      )}

      {/* Revealed step */}
      {step === "revealed" && formattedKey && (
        <div className={styles.exportRevealed}>
          <div className={styles.formatToggle}>
            <span className={styles.formatLabel}>Format:</span>
            <button
              type="button"
              className={`${styles.formatOption} ${keyFormat === "base58" ? styles.formatOptionActive : ""}`}
              onClick={() => setKeyFormat("base58")}
            >
              Base58
            </button>
            <button
              type="button"
              className={`${styles.formatOption} ${keyFormat === "json" ? styles.formatOptionActive : ""}`}
              onClick={() => setKeyFormat("json")}
            >
              JSON Array
            </button>
          </div>
          <div className={styles.keyDisplay}>
            <code className={styles.keyValue}>{formattedKey}</code>
          </div>
          <div className={styles.ctaRow}>
            <button
              type="button"
              className={`${styles.actionButton} ${styles.actionPrimary}`}
              onClick={copyKey}
            >
              Copy to clipboard
            </button>
            <button
              type="button"
              className={styles.actionButton}
              onClick={cancelExport}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Feedback message */}
      {feedback && <div className={styles.feedbackBar}>{feedback}</div>}
    </div>
  );
}
