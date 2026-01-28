/**
 * Hook for wallet export functionality
 * 
 * Manages the export flow state machine:
 * - idle: Ready to start export
 * - confirm: Showing security warning, awaiting confirmation
 * - loading: Fetching key from API
 * - revealed: Key is displayed to user
 * - error: Something went wrong
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { formatPrivateKey, isValidBase58Key, type KeyFormat } from "@/app/lib/wallet/keyFormat";

export type ExportStep = "idle" | "confirm" | "loading" | "revealed" | "error";

export interface WalletExportState {
  step: ExportStep;
  exportedKey: string | null;
  keyFormat: KeyFormat;
  feedback: string;
  error: string | null;
}

export interface WalletExportActions {
  /** Start the export flow (goes to confirm step) */
  initiateExport: () => void;
  /** User confirmed - fetch the key */
  confirmExport: () => Promise<void>;
  /** Cancel and reset to idle */
  cancelExport: () => void;
  /** Change the display format */
  setKeyFormat: (format: KeyFormat) => void;
  /** Copy the key to clipboard */
  copyKey: () => Promise<boolean>;
  /** Get the formatted key for display */
  getFormattedKey: () => string | null;
  /** Reset everything */
  reset: () => void;
}

const INITIAL_STATE: WalletExportState = {
  step: "idle",
  exportedKey: null,
  keyFormat: "base58",
  feedback: "",
  error: null,
};

export function useWalletExport(): WalletExportState & WalletExportActions {
  const [state, setState] = useState<WalletExportState>(INITIAL_STATE);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup feedback timeout on unmount
  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  const setFeedback = useCallback((message: string, duration = 5000) => {
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
    }
    
    setState(prev => ({ ...prev, feedback: message }));
    
    if (duration > 0 && message) {
      feedbackTimeoutRef.current = setTimeout(() => {
        setState(prev => ({ ...prev, feedback: "" }));
        feedbackTimeoutRef.current = null;
      }, duration);
    }
  }, []);

  const initiateExport = useCallback(() => {
    setState(prev => ({
      ...prev,
      step: "confirm",
      exportedKey: null,
      error: null,
      feedback: "",
    }));
  }, []);

  const confirmExport = useCallback(async () => {
    setState(prev => ({ ...prev, step: "loading", feedback: "Fetching key…" }));

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
          // Ignore parse errors
        }
        
        setState(prev => ({
          ...prev,
          step: "error",
          error: errorMessage,
          feedback: "",
        }));
        return;
      }

      const payload = await response.json();
      const secretKey = typeof payload?.secret_key === "string" 
        ? payload.secret_key.trim() 
        : null;

      if (!secretKey || !isValidBase58Key(secretKey)) {
        setState(prev => ({
          ...prev,
          step: "error",
          error: "Invalid key received from server.",
          feedback: "",
        }));
        return;
      }

      setState(prev => ({
        ...prev,
        step: "revealed",
        exportedKey: secretKey,
        feedback: "",
        error: null,
      }));
    } catch (error) {
      console.error("Wallet export failed:", error);
      setState(prev => ({
        ...prev,
        step: "error",
        error: "Unexpected error exporting wallet.",
        feedback: "",
      }));
    }
  }, []);

  const cancelExport = useCallback(() => {
    setState(INITIAL_STATE);
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
    }
  }, []);

  const setKeyFormat = useCallback((format: KeyFormat) => {
    setState(prev => ({ ...prev, keyFormat: format }));
  }, []);

  const getFormattedKey = useCallback(() => {
    if (!state.exportedKey) return null;
    return formatPrivateKey(state.exportedKey, state.keyFormat);
  }, [state.exportedKey, state.keyFormat]);

  const copyKey = useCallback(async (): Promise<boolean> => {
    const formatted = getFormattedKey();
    if (!formatted) return false;

    try {
      await navigator.clipboard.writeText(formatted);
      setFeedback("Copied to clipboard!", 3000);
      return true;
    } catch {
      setFeedback("Failed to copy. Select and copy manually.", 4000);
      return false;
    }
  }, [getFormattedKey, setFeedback]);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
    }
  }, []);

  return {
    ...state,
    initiateExport,
    confirmExport,
    cancelExport,
    setKeyFormat,
    copyKey,
    getFormattedKey,
    reset,
  };
}
