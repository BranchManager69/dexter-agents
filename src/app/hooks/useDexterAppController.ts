"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentProps } from "react";
import { useSearchParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

import type { HeroControlsProps } from "../components/HeroControls";
import type TopRibbonComponent from "../components/shell/TopRibbon";
import type VoiceDockComponent from "../components/shell/VoiceDock";
import type BottomStatusRailComponent from "../components/shell/BottomStatusRail";
import type SignalStackComponent from "../components/signals/SignalStack";
import type SignalsDrawerComponent from "../components/signals/SignalsDrawer";
import type { DebugInfoModal as DebugInfoModalComponent } from "../components/DebugInfoModal";
import type SuperAdminModalComponent from "../components/SuperAdminModal";
import type { TranscriptMessages as TranscriptMessagesComponent } from "../components/TranscriptMessages";
import type { InputBar as InputBarComponent } from "../components/InputBar";

declare global {
  interface Window {
    __DEXTER_DISABLE_SYNTHETIC_GREETING?: boolean;
  }
}

// Types
import { SessionStatus } from "@/app/types";
import type { RealtimeAgent } from '@openai/agents/realtime';

// Context providers & hooks
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { useEvent } from "@/app/contexts/EventContext";
import { useRealtimeSession } from "./useRealtimeSession";
import { createModerationGuardrail } from "@/app/agentConfigs/guardrails";
import { useSignalData } from "./useSignalData";
import { useAuth } from "../auth-context";

type DexterSessionUser = {
  id?: string | null;
  email?: string | null;
  roles?: string[];
  isSuperAdmin?: boolean;
};

export type DexterSessionSummary = {
  type: "guest" | "user";
  user: DexterSessionUser | null;
  guestProfile?: { label?: string; instructions?: string } | null;
  wallet?: { public_key: string | null; label?: string | null } | null;
};

type WalletBalanceEntry = {
  mint: string | null;
  symbol: string | null;
  label: string | null;
  decimals: number | null;
  amountUi: number | null;
  usdValue: number | null;
};

type WalletPortfolioSnapshot = {
  address: string | null;
  label?: string | null;
  solBalance: number | null;
  solBalanceFormatted: string | null;
  totalUsd: number | null;
  totalUsdFormatted: string | null;
  tokenCount: number;
  balances: WalletBalanceEntry[];
  fetchedAt: string;
};

type McpStatusState = {
  state: "loading" | "user" | "fallback" | "guest" | "none" | "error";
  label: string;
  detail?: string;
};

type TopRibbonProps = ComponentProps<typeof TopRibbonComponent>;
type VoiceDockProps = ComponentProps<typeof VoiceDockComponent>;
type BottomStatusRailProps = ComponentProps<typeof BottomStatusRailComponent>;
type SignalStackComponentProps = ComponentProps<typeof SignalStackComponent>;
type SignalsDrawerProps = ComponentProps<typeof SignalsDrawerComponent>;
type DebugInfoModalProps = ComponentProps<typeof DebugInfoModalComponent>;
type SuperAdminModalProps = ComponentProps<typeof SuperAdminModalComponent>;
type TranscriptMessagesProps = ComponentProps<typeof TranscriptMessagesComponent>;
type InputBarProps = ComponentProps<typeof InputBarComponent>;

type SignalStackLayoutProps = Pick<SignalStackComponentProps, "showLogs" | "toolCatalog">;
type SignalsDrawerShellProps = Omit<SignalsDrawerProps, "children">;

export interface DexterAppController {
  topRibbonProps: TopRibbonProps;
  heroContainerClassName: string;
  heroControlsProps: HeroControlsProps;
  transcriptProps: TranscriptMessagesProps;
  inputBarProps: InputBarProps;
  signalStackProps: SignalStackLayoutProps;
  bottomStatusProps: BottomStatusRailProps;
  signalsDrawerProps: SignalsDrawerShellProps;
  voiceDockProps: VoiceDockProps | null;
  debugModalProps: DebugInfoModalProps;
  superAdminModalProps: SuperAdminModalProps;
}

const GUEST_SESSION_INSTRUCTIONS =
  "Operate using the shared Dexter demo wallet with limited funds. Avoid destructive actions and encourage the user to sign in for persistent access.";

const createGuestIdentity = (): DexterSessionSummary => ({
  type: "guest",
  user: null,
  guestProfile: { label: "Dexter Demo Wallet", instructions: GUEST_SESSION_INSTRUCTIONS },
  wallet: null,
});

const SOLANA_NATIVE_MINT = 'So11111111111111111111111111111111111111112';

const USD_COMPACT_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const USD_PRECISE_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

const SOL_LARGE_FORMATTER = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

const SOL_SMALL_FORMATTER = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 4,
  maximumFractionDigits: 6,
});

function formatUsdDisplay(value: number | null | undefined): string | null {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  const abs = Math.abs(value);
  if (abs >= 1000) {
    return USD_COMPACT_FORMATTER.format(value);
  }
  return USD_PRECISE_FORMATTER.format(value);
}

function formatSolDisplay(value: number | null | undefined): string | null {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  const abs = Math.abs(value);
  const formatter = abs >= 1 ? SOL_LARGE_FORMATTER : SOL_SMALL_FORMATTER;
  return `${formatter.format(value)} SOL`;
}

function pickNumber(...values: Array<unknown>): number | undefined {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

function pickString(...values: Array<unknown>): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function extractStructuredPayload(result: any): any {
  if (result === null || result === undefined) return undefined;
  if (Array.isArray(result)) return result;
  if (typeof result !== 'object') return result;

  if ('structuredContent' in result && result.structuredContent) {
    return extractStructuredPayload(result.structuredContent);
  }
  if ('structured_content' in result && (result as any).structured_content) {
    return extractStructuredPayload((result as any).structured_content);
  }
  if ('structured' in result && (result as any).structured) {
    return extractStructuredPayload((result as any).structured);
  }
  if ('output' in result && (result as any).output) {
    return extractStructuredPayload((result as any).output);
  }
  if ('result' in result && (result as any).result) {
    return extractStructuredPayload((result as any).result);
  }
  if ('data' in result && (result as any).data) {
    return extractStructuredPayload((result as any).data);
  }

  if (Array.isArray((result as any).content)) {
    for (const entry of (result as any).content) {
      if (!entry || typeof entry !== 'object') continue;
      if ('json' in entry && entry.json) {
        const unwrapped = extractStructuredPayload(entry.json);
        if (unwrapped !== undefined) return unwrapped;
      }
      if ('object' in entry && entry.object) {
        const unwrapped = extractStructuredPayload(entry.object);
        if (unwrapped !== undefined) return unwrapped;
      }
      if ('data' in entry && entry.data) {
        const unwrapped = extractStructuredPayload(entry.data);
        if (unwrapped !== undefined) return unwrapped;
      }
      if ('result' in entry && entry.result) {
        const unwrapped = extractStructuredPayload(entry.result);
        if (unwrapped !== undefined) return unwrapped;
      }
      if ('text' in entry && typeof entry.text === 'string') {
        try {
          const parsed = JSON.parse(entry.text);
          const unwrapped = extractStructuredPayload(parsed);
          if (unwrapped !== undefined) return unwrapped;
        } catch {
          // ignore
        }
      }
    }
  }

  return result;
}

function deriveActiveWalletMeta(payload: any): { address: string | null; label: string | null } {
  const attemptFromString = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^[1-9A-HJ-NP-Za-km-z]{20,60}$/.test(trimmed)) {
      return trimmed;
    }
    return null;
  };

  if (Array.isArray(payload)) {
    for (const entry of payload) {
      const fromArray = attemptFromString(entry);
      if (fromArray) {
        return { address: fromArray, label: null };
      }
      if (entry && typeof entry === 'object') {
        const maybeText = attemptFromString((entry as any).text);
        if (maybeText) {
          return { address: maybeText, label: null };
        }
        const maybeValue = attemptFromString((entry as any).value);
        if (maybeValue) {
          return { address: maybeValue, label: null };
        }
      }
    }
  }

  const stringCandidate = attemptFromString(payload);
  if (stringCandidate) {
    return { address: stringCandidate, label: null };
  }

  if (!payload || typeof payload !== 'object') {
    return { address: null, label: null };
  }

  const active =
    (typeof (payload as any).active_wallet === 'object' && (payload as any).active_wallet) ||
    (typeof (payload as any).wallet === 'object' && (payload as any).wallet) ||
    undefined;

  const address =
    pickString(
      active?.address,
      active?.public_key,
      (payload as any).wallet_address,
      (payload as any).public_key,
      (payload as any).address,
      (payload as any).active_wallet_address,
    ) ?? null;

  const label =
    pickString(
      active?.label,
      (payload as any).wallet_label,
      (payload as any).label,
    ) ?? null;

  return { address, label };
}

function normalizeBalancesPayload(payload: any): { balances: WalletBalanceEntry[]; solBalance: number | null; totalUsd: number | null; tokenCount: number | null } {
  const root = extractStructuredPayload(payload);

  let sourceList: any[] = [];
  if (Array.isArray(root?.balances)) {
    sourceList = root.balances as any[];
  } else if (Array.isArray(root?.tokens)) {
    sourceList = root.tokens as any[];
  } else if (Array.isArray(root?.entries)) {
    sourceList = root.entries as any[];
  } else if (Array.isArray(root?.data)) {
    sourceList = root.data as any[];
  } else if (Array.isArray(root?.items)) {
    sourceList = root.items as any[];
  } else if (Array.isArray(root)) {
    sourceList = root as any[];
  }

  if (!Array.isArray(sourceList) || sourceList.length === 0) {
    if (root && typeof root === 'object') {
      const maybeBalancesObj = root?.balances ?? root?.tokens ?? root?.entries;
      if (maybeBalancesObj && typeof maybeBalancesObj === 'object') {
        sourceList = Object.values(maybeBalancesObj);
      }
    }
  }

  const normalized: WalletBalanceEntry[] = [];
  let solBalance: number | null = null;
  let totalUsd = 0;
  let hasUsdValues = false;

  sourceList.slice(0, 30).forEach((entry) => {
    if (!entry || typeof entry !== 'object') return;

    const mint = pickString(entry.mint, entry.mintAddress, entry.publicKey, entry.address, entry.id) ?? null;
    const tokenMeta = typeof entry.token === 'object' && entry.token ? entry.token : undefined;
    const symbol =
      pickString(
        entry.symbol,
        entry.ticker,
        entry.asset_symbol,
        tokenMeta?.symbol,
        tokenMeta?.ticker,
      ) || (mint ? `${mint.slice(0, 4)}…${mint.slice(-4)}` : null);
    const label = pickString(
      entry.label,
      entry.name,
      entry.asset_name,
      tokenMeta?.name,
      tokenMeta?.label,
      symbol,
    ) ?? null;
    const decimals = pickNumber(entry.decimals, tokenMeta?.decimals) ?? null;

    const lamports = pickNumber(entry.lamports, entry.amountLamports, entry.amount_lamports, entry.balanceLamports);
    let amountUi =
      pickNumber(
        entry.amountUi,
        entry.amount_ui,
        entry.uiAmount,
        entry.ui_amount,
        entry.balanceUi,
        entry.balance_ui,
      ) ?? null;
    if (amountUi === null && lamports !== undefined && lamports !== null) {
      amountUi = lamports / 1_000_000_000;
    }

    let usdValue = pickNumber(
      entry.usdValue,
      entry.usd_value,
      entry.valueUsd,
      entry.totalUsd,
      entry.total_value_usd,
    );
    const priceUsd = pickNumber(entry.priceUsd, entry.price_usd, tokenMeta?.priceUsd, tokenMeta?.price_usd);
    if ((usdValue === undefined || usdValue === null) && amountUi !== null && priceUsd !== undefined) {
      usdValue = amountUi * priceUsd;
    }

    if (usdValue !== undefined && usdValue !== null && Number.isFinite(usdValue)) {
      totalUsd += usdValue;
      hasUsdValues = true;
    }

    const normalizedEntry: WalletBalanceEntry = {
      mint,
      symbol,
      label,
      decimals,
      amountUi,
      usdValue: usdValue !== undefined && usdValue !== null && Number.isFinite(usdValue) ? usdValue : null,
    };
    normalized.push(normalizedEntry);

    const candidateMint = mint ?? '';
    const candidateSymbol = symbol ? symbol.toUpperCase() : null;
    const isNative = Boolean(entry.isNative || entry.native || entry.is_sol);
    if (solBalance === null) {
      if (isNative || candidateSymbol === 'SOL' || candidateMint === SOLANA_NATIVE_MINT) {
        if (amountUi !== null) {
          solBalance = amountUi;
        } else if (lamports !== undefined && lamports !== null) {
          solBalance = lamports / 1_000_000_000;
        }
      }
    }
  });

  const totalUsdValue = normalized.length === 0
    ? null
    : hasUsdValues
      ? totalUsd
      : null;

  const summaryNode = typeof root?.summary === 'object' && root.summary ? root.summary : root && typeof root === 'object' ? root : undefined;

  if ((solBalance === null || Number.isNaN(solBalance)) && summaryNode) {
    const summarySol = pickNumber(
      (summaryNode as any).solBalance,
      (summaryNode as any).sol_balance,
      (summaryNode as any).sol,
      (summaryNode as any).solana,
      (summaryNode as any).nativeBalance,
      (summaryNode as any).native_balance,
      (summaryNode as any).native,
    );
    if (summarySol !== undefined) {
      solBalance = summarySol;
    }
  }

  let aggregatedUsd = totalUsdValue;
  if ((aggregatedUsd === null || Number.isNaN(aggregatedUsd)) && summaryNode) {
    const summaryUsd = pickNumber(
      (summaryNode as any).totalUsd,
      (summaryNode as any).total_usd,
      (summaryNode as any).usdTotal,
      (summaryNode as any).usd_total,
      (summaryNode as any).portfolioUsd,
      (summaryNode as any).portfolio_usd,
      (summaryNode as any).valueUsd,
      (summaryNode as any).value_usd,
    );
    if (summaryUsd !== undefined) {
      aggregatedUsd = summaryUsd;
    } else if (summaryNode && typeof summaryNode === 'object' && 'total' in summaryNode) {
      const totalField = (summaryNode as any).total;
      const numericTotal = pickNumber(totalField, totalField?.usd, totalField?.usd_value);
      if (numericTotal !== undefined) {
        aggregatedUsd = numericTotal;
      }
    }
  }

  const summaryTokenCount = pickNumber(
    (summaryNode as any)?.tokenCount,
    (summaryNode as any)?.tokens,
    (summaryNode as any)?.balances,
    (summaryNode as any)?.walletCount,
  );

  const sortedBalances = normalized.sort((a, b) => {
    const aUsd = a.usdValue ?? 0;
    const bUsd = b.usdValue ?? 0;
    if (Number.isFinite(bUsd) && Number.isFinite(aUsd) && bUsd !== aUsd) {
      return bUsd - aUsd;
    }
    const aAmount = a.amountUi ?? 0;
    const bAmount = b.amountUi ?? 0;
    return bAmount - aAmount;
  });

  return {
    balances: sortedBalances,
    solBalance,
    totalUsd: aggregatedUsd,
    tokenCount: summaryTokenCount ?? (sortedBalances.length > 0 ? sortedBalances.length : null),
  };
}

function buildPortfolioSnapshot(
  meta: { address: string | null; label: string | null },
  balancesPayload: any,
): WalletPortfolioSnapshot {
  const normalized = normalizeBalancesPayload(balancesPayload);
  const solFormatted = formatSolDisplay(normalized.solBalance ?? null);
  const totalUsdFormatted = formatUsdDisplay(normalized.totalUsd ?? null);

  return {
    address: meta.address,
    label: meta.label ?? undefined,
    solBalance: normalized.solBalance ?? null,
    solBalanceFormatted: solFormatted,
    totalUsd: normalized.totalUsd ?? null,
    totalUsdFormatted,
    tokenCount: normalized.tokenCount ?? normalized.balances.length,
    balances: normalized.balances,
    fetchedAt: new Date().toISOString(),
  };
}

// Agent configs
import { scenarioLoaders, defaultAgentSetKey } from "@/app/agentConfigs";
import { dexterTradingCompanyName } from "@/app/agentConfigs/customerServiceRetail";

import useAudioDownload from "./useAudioDownload";
import { useHandleSessionHistory } from "./useHandleSessionHistory";
import {
  getMcpStatusSnapshot,
  setMcpStatusError,
  subscribeMcpStatus,
  updateMcpStatusFromPayload,
} from "../state/mcpStatusStore";
import { useToolCatalog } from "./useToolCatalog";

export function useDexterAppController(): DexterAppController {
  const searchParams = useSearchParams()!;
  const {
    session: authSession,
    loading: authLoading,
    signOut: authSignOut,
    sendMagicLink,
  } = useAuth();

  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const [sessionIdentity, setSessionIdentity] = useState<DexterSessionSummary>(createGuestIdentity);
  const [mcpStatus, setMcpStatus] = useState<McpStatusState>(getMcpStatusSnapshot());
  const [isSuperAdminModalOpen, setIsSuperAdminModalOpen] = useState(false);
  const [walletPortfolio, setWalletPortfolio] = useState<WalletPortfolioSnapshot | null>(null);
  const [walletPortfolioStatus, setWalletPortfolioStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [walletPortfolioError, setWalletPortfolioError] = useState<string | null>(null);

  const authEmail = useMemo(() => {
    if (!authSession) return null;
    return (
      (authSession.user.email as string | null | undefined) ??
      (authSession.user.user_metadata?.email as string | null | undefined) ??
      null
    );
  }, [authSession]);

  const resetSessionIdentity = useCallback(() => {
    setSessionIdentity(createGuestIdentity());
  }, []);

  const syncIdentityToAuthSession = useCallback((walletOverride?: { public_key: string | null; label?: string | null } | null) => {
    if (!authSession) {
      resetSessionIdentity();
      return;
    }

    const rawRoles = authSession.user.app_metadata?.roles as unknown;
    const roles = Array.isArray(rawRoles)
      ? rawRoles.map((value) => String(value))
      : typeof rawRoles === 'string'
        ? [rawRoles]
        : [];
    const isSuperAdmin = roles.map((r) => r.toLowerCase()).includes('superadmin');

    setSessionIdentity((current) => {
      if (
        current.type === 'user' &&
        current.user?.id === authSession.user.id &&
        current.user?.email === authSession.user.email &&
        JSON.stringify(current.user?.roles ?? []) === JSON.stringify(roles) &&
        Boolean(current.user?.isSuperAdmin) === isSuperAdmin
      ) {
        if (walletOverride === undefined) {
          return current;
        }
      }

      return {
        type: 'user',
        user: {
          id: authSession.user.id,
          email: authSession.user.email ?? null,
          roles,
          isSuperAdmin,
        },
        guestProfile: null,
        wallet:
          walletOverride !== undefined
            ? walletOverride
            : current.type === 'user'
              ? current.wallet ?? null
              : null,
      };
    });
  }, [authSession, resetSessionIdentity]);

  const callMcpTool = useCallback(async (toolName: string, args: Record<string, unknown> = {}) => {
    try {
      const response = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tool: toolName, arguments: args ?? {} }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`MCP ${toolName} failed (${response.status}): ${text.slice(0, 200)}`);
      }

      return await response.json();
    } catch (error: any) {
      throw new Error(error?.message || `MCP ${toolName} failed`);
    }
  }, []);

  const walletFetchIdRef = useRef(0);
  const lastFetchedWalletRef = useRef<string | null>(null);
  const walletSignalRefreshRef = useRef<string | undefined>(undefined);

  const fetchActiveWallet = useCallback(async () => {
    try {
      const response = await fetch('/api/wallet/active', {
        method: 'GET',
        credentials: 'include',
      });
      if (!response.ok) {
        console.warn('[wallet] /api/wallet/active non-200', response.status);
        return null;
      }
      const data = await response.json();
      const wallet = data?.wallet;
      if (wallet && typeof wallet === 'object') {
        console.log('[wallet] active wallet payload', wallet);
        return {
          public_key: typeof wallet.public_key === 'string' ? wallet.public_key : null,
          label: typeof wallet.label === 'string' ? wallet.label : null,
        };
      }
    } catch (error) {
      console.warn('Failed to fetch active wallet', error);
    }
    return null;
  }, []);

  const fetchWalletPortfolio = useCallback(async (reason: 'initial' | 'refresh' = 'initial') => {
    if (sessionIdentity.type !== 'user') {
      setWalletPortfolio(null);
      setWalletPortfolioStatus('idle');
      setWalletPortfolioError(null);
      return;
    }

    const lastKnownAddress = sessionIdentity.wallet?.public_key;
    const lastKnownLabel = sessionIdentity.wallet?.label ?? null;
    console.log('[wallet] portfolio fetch start', { reason, lastKnownAddress, lastKnownLabel, status: walletPortfolioStatus });
    if (!lastKnownAddress) {
      setWalletPortfolio(null);
      setWalletPortfolioStatus('idle');
      setWalletPortfolioError(null);
      return;
    }

    walletFetchIdRef.current += 1;
    const requestId = walletFetchIdRef.current;

    if (reason === 'initial') {
      setWalletPortfolioStatus('loading');
    } else {
      setWalletPortfolioStatus((prev) => (prev === 'idle' ? 'loading' : prev));
    }
    setWalletPortfolioError(null);

    try {
      let effectiveAddress: string | null = lastKnownAddress ?? null;
      let effectiveLabel: string | null = lastKnownLabel ?? null;

      try {
        const resolveResult = await callMcpTool('resolve_wallet');
        const resolvePayload = extractStructuredPayload(resolveResult);
        const meta = deriveActiveWalletMeta(resolvePayload);
        if (meta.address && typeof meta.address === 'string') {
          effectiveAddress = meta.address;
        }
        if (meta.label && typeof meta.label === 'string') {
          effectiveLabel = meta.label;
        }
      } catch (resolveError) {
        console.warn('resolve_wallet failed or returned unexpected payload', resolveError);
      }

      if (!effectiveAddress) {
        try {
          const walletsResult = await callMcpTool('list_my_wallets');
          const walletsPayload = extractStructuredPayload(walletsResult);
          const walletsArray = Array.isArray((walletsPayload as any)?.wallets)
            ? (walletsPayload as any).wallets
            : Array.isArray(walletsPayload)
              ? walletsPayload
              : [];
          const preferredWallet = walletsArray.find((entry: any) => entry?.is_default) || walletsArray[0];
          const addressCandidate = typeof preferredWallet?.address === 'string'
            ? preferredWallet.address
            : typeof preferredWallet?.public_key === 'string'
              ? preferredWallet.public_key
              : typeof preferredWallet?.wallet_address === 'string'
                ? preferredWallet.wallet_address
                : null;
          if (addressCandidate) {
            effectiveAddress = addressCandidate;
          }
          if (!effectiveLabel && typeof preferredWallet?.label === 'string') {
            effectiveLabel = preferredWallet.label;
          }
        } catch (listError) {
          console.warn('list_my_wallets fallback failed', listError);
        }
      }

      if (!effectiveAddress) {
        throw new Error('No wallet address available for balance fetch.');
      }

      const balancesResult = await callMcpTool('solana_list_balances', {
        wallet_address: effectiveAddress,
        limit: 30,
      });

      const snapshot = buildPortfolioSnapshot({ address: effectiveAddress, label: effectiveLabel }, balancesResult);

      if (walletFetchIdRef.current === requestId) {
        setWalletPortfolio(snapshot);
        setWalletPortfolioStatus('ready');
      }
    } catch (error: any) {
      console.error('Failed to load wallet portfolio', error);
      if (walletFetchIdRef.current === requestId) {
        setWalletPortfolioStatus('error');
        setWalletPortfolioError(error?.message || 'Unable to load wallet balances.');
      }
    }
  }, [callMcpTool, sessionIdentity.type, sessionIdentity.wallet?.label, sessionIdentity.wallet?.public_key, walletPortfolioStatus]);

  useEffect(() => {
    let cancelled = false;

    const hydrateIdentity = async () => {
      if (!authSession) {
        resetSessionIdentity();
        return;
      }

      const wallet = await fetchActiveWallet();
      if (!cancelled) {
        syncIdentityToAuthSession(wallet);
      }
    };

    hydrateIdentity();

    return () => {
      cancelled = true;
    };
  }, [authSession, fetchActiveWallet, resetSessionIdentity, syncIdentityToAuthSession]);

  useEffect(() => {
    if (sessionIdentity.type !== 'user') {
      lastFetchedWalletRef.current = null;
      setWalletPortfolio(null);
      setWalletPortfolioStatus('idle');
      setWalletPortfolioError(null);
      return;
    }

    const activeAddress = sessionIdentity.wallet?.public_key;
    if (!activeAddress) {
      lastFetchedWalletRef.current = null;
      setWalletPortfolio(null);
      setWalletPortfolioStatus('idle');
      setWalletPortfolioError(null);
      return;
    }

    if (lastFetchedWalletRef.current === activeAddress) {
      return;
    }

    lastFetchedWalletRef.current = activeAddress;
    fetchWalletPortfolio('initial');
  }, [sessionIdentity.type, sessionIdentity.wallet?.public_key, fetchWalletPortfolio]);

  useEffect(() => {
    const unsubscribe = subscribeMcpStatus((snapshot) => {
      setMcpStatus({ state: snapshot.state, label: snapshot.label, detail: snapshot.detail });

      // Notify waiting callbacks if MCP is now ready
      if (snapshot.state === 'user' || snapshot.state === 'fallback' || snapshot.state === 'guest') {
        mcpReadyCallbacksRef.current.forEach(cb => cb());
        mcpReadyCallbacksRef.current = [];
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    fetch("/api/mcp/status", { credentials: "include" })
      .then((response) => response.json())
      .then((data) => updateMcpStatusFromPayload(data || {}))
      .catch(() => setMcpStatusError());
  }, [sessionIdentity.type, sessionIdentity.user?.id, sessionIdentity.guestProfile?.label]);

  // ---------------------------------------------------------------------
  // Codec selector – lets you toggle between wide-band Opus (48 kHz)
  // and narrow-band PCMU/PCMA (8 kHz) to hear what the agent sounds like on
  // a traditional phone line and to validate ASR / VAD behaviour under that
  // constraint.
  //
  // We read the `?codec=` query-param and rely on the `changePeerConnection`
  // hook (configured in `useRealtimeSession`) to set the preferred codec
  // before the offer/answer negotiation.
  // ---------------------------------------------------------------------
  const urlCodec = searchParams.get("codec") || "opus";

  // Agents SDK doesn't currently support codec selection so it is now forced 
  // via global codecPatch at module load 

  const {
    addTranscriptMessage,
    addTranscriptBreadcrumb,
  } = useTranscript();
  const { logClientEvent, logServerEvent } = useEvent();

  const [scenarioMap, setScenarioMap] = useState<Record<string, RealtimeAgent[]>>({});
  const scenarioCacheRef = useRef<Record<string, RealtimeAgent[]>>({});

  const ensureScenarioLoaded = useCallback(async (key: string) => {
    if (scenarioCacheRef.current[key]) {
      return scenarioCacheRef.current[key];
    }
    const loader = scenarioLoaders[key];
    if (!loader) {
      throw new Error(`Unknown agent set: ${key}`);
    }
    const agents = await loader();
    scenarioCacheRef.current = { ...scenarioCacheRef.current, [key]: agents };
    setScenarioMap((prev) => {
      if (prev[key]) return prev;
      return { ...prev, [key]: agents };
    });
    return agents;
  }, []);

  const scenarioAgents = scenarioMap[defaultAgentSetKey] ?? [];
  const [selectedAgentName, setSelectedAgentName] = useState<string>("");

  useEffect(() => {
    ensureScenarioLoaded(defaultAgentSetKey).catch((error) => {
      console.error('Failed to preload agent scenario', error);
    });
  }, [ensureScenarioLoaded]);

  useEffect(() => {
    if (!selectedAgentName && scenarioAgents.length > 0) {
      setSelectedAgentName(scenarioAgents[0].name);
    }
  }, [scenarioAgents, selectedAgentName]);

  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  // Ref to identify whether the latest agent switch came from an automatic handoff
  const handoffTriggeredRef = useRef(false);

  const sdkAudioElement = useMemo(() => {
    if (typeof window === 'undefined') return undefined;
    const el = document.createElement('audio');
    el.autoplay = true;
    el.style.display = 'none';
    document.body.appendChild(el);
    return el;
  }, []);

  // Attach SDK audio element once it exists (after first render in browser)
  useEffect(() => {
    if (sdkAudioElement && !audioElementRef.current) {
      audioElementRef.current = sdkAudioElement;
    }
  }, [sdkAudioElement]);

  const {
    connect,
    disconnect,
    sendUserText,
    sendEvent,
    interrupt,
    mute,
  } = useRealtimeSession({
    onConnectionChange: (s) => setSessionStatus(s as SessionStatus),
    onAgentHandoff: (agentName: string) => {
      handoffTriggeredRef.current = true;
      setSelectedAgentName(agentName);
    },
  });

  const [sessionStatus, setSessionStatus] =
    useState<SessionStatus>("DISCONNECTED");
  const mcpReadyCallbacksRef = useRef<Array<() => void>>([]);

  const [isEventsPaneExpanded, setIsEventsPaneExpanded] =
    useState<boolean>(true);
  const [userText, setUserText] = useState<string>("");
  const [isPTTActive, setIsPTTActive] = useState<boolean>(false);
  const [isPTTUserSpeaking, setIsPTTUserSpeaking] = useState<boolean>(false);
  const [isMobileSignalsOpen, setIsMobileSignalsOpen] = useState<boolean>(false);
  const [isAudioPlaybackEnabled, setIsAudioPlaybackEnabled] = useState<boolean>(
    () => {
      if (typeof window === 'undefined') return true;
      const stored = localStorage.getItem('audioPlaybackEnabled');
      return stored ? stored === 'true' : true;
    },
  );
  const [hasActivatedSession, setHasActivatedSession] = useState<boolean>(false);
  const [pendingAutoConnect, setPendingAutoConnect] = useState<boolean>(false);
  const [isVoiceDockExpanded, setIsVoiceDockExpanded] = useState<boolean>(true);
  const [isDebugModalOpen, setIsDebugModalOpen] = useState<boolean>(false);

  // Initialize the recording hook.
  const { startRecording, stopRecording, downloadRecording } =
    useAudioDownload();

  const signalData = useSignalData();
  const toolCatalog = useToolCatalog();

  useEffect(() => {
    const lastUpdated = signalData.wallet.lastUpdated;
    if (!lastUpdated || sessionIdentity.type !== 'user') {
      return;
    }

    if (walletSignalRefreshRef.current === lastUpdated) {
      return;
    }

    walletSignalRefreshRef.current = lastUpdated;
    fetchWalletPortfolio('refresh');
  }, [signalData.wallet.lastUpdated, sessionIdentity.type, fetchWalletPortfolio]);

  const walletPortfolioSummary = useMemo(() => {
    if (!walletPortfolio && walletPortfolioStatus === 'idle') {
      return null;
    }

    let lastUpdatedLabel: string | null = null;
    const lastUpdatedIso = walletPortfolio?.fetchedAt ?? null;
    if (lastUpdatedIso) {
      try {
        lastUpdatedLabel = new Date(lastUpdatedIso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      } catch {
        lastUpdatedLabel = null;
      }
    }

    return {
      status: walletPortfolioStatus,
      solBalanceFormatted: walletPortfolio?.solBalanceFormatted ?? null,
      totalUsdFormatted: walletPortfolio?.totalUsdFormatted ?? null,
      tokenCount: walletPortfolio?.tokenCount ?? walletPortfolio?.balances.length ?? 0,
      lastUpdatedLabel,
      lastUpdatedIso,
      error: walletPortfolioError,
      balances: walletPortfolio?.balances ?? [],
    };
  }, [walletPortfolio, walletPortfolioStatus, walletPortfolioError]);

  const handleSignIn = useCallback(async (email: string, captchaToken: string | null): Promise<{ success: boolean; message: string }> => {
    try {
      const result = await sendMagicLink(email, {
        captchaToken: captchaToken ?? undefined,
      });
      return result;
    } catch (err) {
      console.error("Sign-in error:", err);
      return { success: false, message: "Something went wrong sending the magic link." };
    }
  }, [sendMagicLink]);

  const sendClientEvent = (eventObj: any, eventNameSuffix = "") => {
    try {
      sendEvent(eventObj);
      logClientEvent(eventObj, eventNameSuffix);
    } catch (err) {
      console.error('Failed to send via SDK', err);
    }
  };

  useHandleSessionHistory();

  useEffect(() => {
    if (
      sessionStatus === "CONNECTED" &&
      selectedAgentName
    ) {
      const currentAgent = scenarioAgents.find(
        (a) => a.name === selectedAgentName
      );
      addTranscriptBreadcrumb(
        `Session started with ${selectedAgentName}`,
        currentAgent ? { name: currentAgent.name } : undefined,
      );
      const isHandoff = handoffTriggeredRef.current;
      updateSession(false);
      if (!isHandoff) {
        setHasActivatedSession(false);
      }
      // Reset flag after handling so subsequent effects behave normally
      handoffTriggeredRef.current = false;
    }
  }, [scenarioAgents, selectedAgentName, sessionStatus]);

  useEffect(() => {
    if (pendingAutoConnect && sessionStatus === "DISCONNECTED" && selectedAgentName) {
      connectToRealtime();
      setPendingAutoConnect(false);
    }
  }, [pendingAutoConnect, sessionStatus, selectedAgentName]);

  useEffect(() => {
    if (sessionStatus === "CONNECTED") {
      updateSession();
    }
  }, [isPTTActive]);

  const fetchEphemeralKey = async (): Promise<string | null> => {
    logClientEvent({ url: "/session" }, "fetch_session_token_request");
    const tokenResponse = await fetch("/api/session", {
      method: "GET",
      credentials: "include",
      headers: authSession?.access_token
        ? {
            Authorization: `Bearer ${authSession.access_token}`,
          }
        : undefined,
    });
    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text().catch(() => "");
      console.error("Failed to fetch session token:", tokenResponse.status, errorBody);
      resetSessionIdentity();
      setSessionStatus("DISCONNECTED");
      return null;
    }

    const data = await tokenResponse.json();
    logServerEvent(data, "fetch_session_token_response");

    const dexterSession = data?.dexter_session;
    const authRolesRaw = authSession?.user?.app_metadata?.roles as unknown;
    const authRoles = Array.isArray(authRolesRaw) ? authRolesRaw.map((value) => String(value)) : [];
    const userIsSuperAdmin = authRoles.includes('superadmin');

    if (dexterSession) {
      if (dexterSession.type === "user") {
        setSessionIdentity({
          type: "user",
          user: {
            id: dexterSession.user?.id ?? null,
            email: dexterSession.user?.email ?? null,
            roles: authRoles,
            isSuperAdmin: userIsSuperAdmin,
          },
          guestProfile: null,
          wallet: dexterSession.wallet ?? null,
        });
      } else {
        setSessionIdentity({
          type: "guest",
          user: null,
          guestProfile: dexterSession.guest_profile ?? {
            label: "Dexter Demo Wallet",
            instructions: GUEST_SESSION_INSTRUCTIONS,
          },
          wallet: dexterSession.wallet ?? null,
        });
      }
    } else {
      resetSessionIdentity();
    }

    if (!data.client_secret?.value) {
      logClientEvent(data, "error.no_ephemeral_key");
      console.error("No ephemeral key provided by the server");
      setSessionStatus("DISCONNECTED");
      return null;
    }

    return data.client_secret.value;
  };

  const connectToRealtime = async () => {
    const agentSetKey = defaultAgentSetKey;
    if (sessionStatus !== "DISCONNECTED") return;
    setHasActivatedSession(false);
    setSessionStatus("CONNECTING");

    try {
      const scenario = await ensureScenarioLoaded(agentSetKey);
      if (!scenario?.length) {
        throw new Error(`No agents configured for scenario ${agentSetKey}`);
      }
      const EPHEMERAL_KEY = await fetchEphemeralKey();
      if (!EPHEMERAL_KEY) return;

      // Ensure the selectedAgentName is first so that it becomes the root
      const activeAgentName = selectedAgentName || scenario[0]?.name || '';
      if (!selectedAgentName && activeAgentName) {
        setSelectedAgentName(activeAgentName);
      }
      const reorderedAgents = [...scenario];
      const idx = reorderedAgents.findIndex((a) => a.name === activeAgentName);
      if (idx > 0) {
        const [agent] = reorderedAgents.splice(idx, 1);
        reorderedAgents.unshift(agent);
      }

      const guardrail = createModerationGuardrail(
        dexterTradingCompanyName,
      );

      await connect({
        getEphemeralKey: async () => EPHEMERAL_KEY,
        initialAgents: reorderedAgents,
        audioElement: sdkAudioElement,
        outputGuardrails: [guardrail],
      });
    } catch (err) {
      console.error("Error connecting via SDK:", err);
      setSessionStatus("DISCONNECTED");
    }
  };

  const disconnectFromRealtime = () => {
    disconnect();
    setSessionStatus("DISCONNECTED");
    setIsPTTUserSpeaking(false);
    void fetchActiveWallet().then((wallet) => {
      syncIdentityToAuthSession(wallet);
    });
    setHasActivatedSession(false);
    setPendingAutoConnect(false);
  };

  const handleSignOut = useCallback(async () => {
    try {
      await authSignOut();
    } catch (err) {
      console.error("Sign-out error:", err);
    } finally {
      disconnectFromRealtime();
    }
  }, [authSignOut, disconnectFromRealtime]);

  const sendSimulatedUserMessage = (text: string) => {
    const id = uuidv4().slice(0, 32);
    addTranscriptMessage(id, "user", text, true);

    sendClientEvent({
      type: 'conversation.item.create',
      item: {
        id,
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }],
      },
    });
    sendClientEvent({ type: 'response.create' }, '(simulated user text message)');
  };

  const shouldSkipSyntheticGreeting = () => {
    if (process.env.NEXT_PUBLIC_DISABLE_SYNTHETIC_GREETING === 'true') {
      return true;
    }
    if (typeof window !== 'undefined') {
      if (window.__DEXTER_DISABLE_SYNTHETIC_GREETING === true) {
        return true;
      }
      try {
        return window.localStorage?.getItem('dexter:disableSyntheticGreeting') === 'true';
      } catch (error) {
        console.warn('Failed to read synthetic greeting preference:', error);
      }
    }
    return false;
  };

  const updateSession = (shouldTriggerResponse: boolean = false) => {
    // Reflect Push-to-Talk UI state by (de)activating server VAD on the
    // backend. The Realtime SDK supports live session updates via the
    // `session.update` event.
    const turnDetection = isPTTActive
      ? null
      : {
          type: 'server_vad',
          threshold: 0.9,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
          create_response: true,
        };

    sendEvent({
      type: 'session.update',
      session: {
        turn_detection: turnDetection,
      },
    });

    // Send an initial 'hi' message to trigger the agent to greet the user
    if (shouldTriggerResponse && !shouldSkipSyntheticGreeting()) {
      sendSimulatedUserMessage('hi');
    }
    return;
  }

  const waitForMcpReady = () => {
    const currentState = mcpStatus.state;
    if (currentState === 'user' || currentState === 'fallback' || currentState === 'guest') {
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('MCP ready timeout'));
      }, 10000);

      mcpReadyCallbacksRef.current.push(() => {
        clearTimeout(timeout);
        resolve();
      });
    });
  };

  const handleSendTextMessage = async (directMessage?: string) => {
    // Use provided message or fall back to state
    const messageToSend = (directMessage || userText).trim();
    if (!messageToSend) return;

    setUserText("");

    // If not connected, connect first
    if (sessionStatus !== 'CONNECTED') {
      try {
        await connectToRealtime();
      } catch (err) {
        console.error('Failed to connect', err);
        setUserText(messageToSend);
        return;
      }
    }

    // Wait for MCP to be ready
    try {
      await waitForMcpReady();
    } catch (err) {
      console.error('MCP not ready, aborting message send', err);
      setUserText(messageToSend);
      return;
    }

    interrupt();
    setHasActivatedSession(true);

    try {
      sendUserText(messageToSend);
    } catch (err) {
      console.error('Failed to send via SDK', err);
    }
  };

  const handleTalkButtonDown = () => {
    if (sessionStatus !== 'CONNECTED') return;
    interrupt();
    setHasActivatedSession(true);

    setIsPTTUserSpeaking(true);
    sendClientEvent({ type: 'input_audio_buffer.clear' }, 'clear PTT buffer');

    // No placeholder; we'll rely on server transcript once ready.
  };

  const handleTalkButtonUp = () => {
    if (sessionStatus !== 'CONNECTED' || !isPTTUserSpeaking)
      return;

    setIsPTTUserSpeaking(false);
    sendClientEvent({ type: 'input_audio_buffer.commit' }, 'commit PTT');
    sendClientEvent({ type: 'response.create' }, 'trigger response PTT');
  };

  const onToggleConnection = () => {
    if (sessionStatus === "CONNECTED" || sessionStatus === "CONNECTING") {
      disconnectFromRealtime();
      setSessionStatus("DISCONNECTED");
    } else {
      setHasActivatedSession(false);
      connectToRealtime();
    }
  };

  const handleSelectedAgentChange = (newAgentName: string) => {
    // Reconnect session with the newly selected agent as root so that tool
    // execution works correctly.
    disconnectFromRealtime();
    setSelectedAgentName(newAgentName);
    setHasActivatedSession(false);
    setPendingAutoConnect(true);
  };

  // Because we need a new connection, refresh the page when codec changes
  const handleCodecChange = (newCodec: string) => {
    const url = new URL(window.location.toString());
    url.searchParams.set("codec", newCodec);
    window.location.replace(url.toString());
  };

  useEffect(() => {
    const storedPushToTalkUI = localStorage.getItem("pushToTalkUI");
    if (storedPushToTalkUI) {
      setIsPTTActive(storedPushToTalkUI === "true");
    }
    const storedLogsExpanded = localStorage.getItem("logsExpanded");
    if (storedLogsExpanded) {
      setIsEventsPaneExpanded(storedLogsExpanded === "true");
    }
    const storedAudioPlaybackEnabled = localStorage.getItem(
      "audioPlaybackEnabled"
    );
    if (storedAudioPlaybackEnabled) {
      setIsAudioPlaybackEnabled(storedAudioPlaybackEnabled === "true");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("pushToTalkUI", isPTTActive.toString());
  }, [isPTTActive]);

  useEffect(() => {
    localStorage.setItem("logsExpanded", isEventsPaneExpanded.toString());
  }, [isEventsPaneExpanded]);

  useEffect(() => {
    localStorage.setItem(
      "audioPlaybackEnabled",
      isAudioPlaybackEnabled.toString()
    );
  }, [isAudioPlaybackEnabled]);

  useEffect(() => {
    if (audioElementRef.current) {
      if (isAudioPlaybackEnabled) {
        audioElementRef.current.muted = false;
        audioElementRef.current.play().catch((err) => {
          console.warn("Autoplay may be blocked by browser:", err);
        });
      } else {
        // Mute and pause to avoid brief audio blips before pause takes effect.
        audioElementRef.current.muted = true;
        audioElementRef.current.pause();
      }
    }

    // Toggle server-side audio stream mute so bandwidth is saved when the
    // user disables playback. 
    try {
      mute(!isAudioPlaybackEnabled);
    } catch (err) {
      console.warn('Failed to toggle SDK mute', err);
    }
  }, [isAudioPlaybackEnabled]);

  // Ensure mute state is propagated to transport right after we connect or
  // whenever the SDK client reference becomes available.
  useEffect(() => {
    if (sessionStatus === 'CONNECTED') {
      try {
        mute(!isAudioPlaybackEnabled);
      } catch (err) {
        console.warn('mute sync after connect failed', err);
      }
    }
  }, [sessionStatus, isAudioPlaybackEnabled]);

  useEffect(() => {
    if (sessionStatus === "CONNECTED" && audioElementRef.current?.srcObject) {
      // The remote audio stream from the audio element.
      const remoteStream = audioElementRef.current.srcObject as MediaStream;
      startRecording(remoteStream);
    }

    // Clean up on unmount or when sessionStatus is updated.
    return () => {
      stopRecording();
    };
  }, [sessionStatus]);

  const { transcriptItems } = useTranscript();
  const { loggedEvents } = useEvent();

  const handleSaveLog = () => {
    try {
      const artifact = {
        timestamp: new Date().toISOString(),
        source: "live",
        structured: {
          transcripts: transcriptItems,
          events: loggedEvents,
        },
        meta: {
          assistantMessageCount: transcriptItems.filter(
            (item) => item.type === "MESSAGE" && item.role === "assistant" && !item.isHidden,
          ).length,
          userMessageCount: transcriptItems.filter(
            (item) => item.type === "MESSAGE" && item.role === "user",
          ).length,
          generatedAt: new Date().toLocaleString(),
        },
      };

      const blob = new Blob([JSON.stringify(artifact, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `live-${artifact.timestamp.replace(/[:.]/g, "-")}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      requestAnimationFrame(() => {
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
      });
    } catch (error) {
      console.error("Failed to save run artifact:", error);
    }
  };

  const handleCopyTranscript = async () => {
    const transcriptRef = document.querySelector('[data-transcript-messages]');
    if (transcriptRef) {
      await navigator.clipboard.writeText(transcriptRef.textContent || '');
    }
  };

  const normalizedRoles = (sessionIdentity.user?.roles ?? []).map((role) => (typeof role === 'string' ? role.toLowerCase() : String(role || '').toLowerCase()));
  const isAdminRole = normalizedRoles.includes('admin');
  const isSuperAdmin = Boolean(sessionIdentity.user?.isSuperAdmin || normalizedRoles.includes('superadmin'));
  const canUseAdminTools = sessionIdentity.type === 'user' && (isSuperAdmin || isAdminRole);
  const canViewDebugPayloads = process.env.NEXT_PUBLIC_DEBUG_TRANSCRIPT === 'true'
    && sessionIdentity.type === 'user'
    && (isSuperAdmin || isAdminRole);

  const heroContainerClassName = "border-b border-neutral-800/60 px-7 py-7";
  const heroControlsProps: HeroControlsProps = {
    className: "mt-5",
    sessionStatus,
    onOpenSignals: () => setIsMobileSignalsOpen(true),
    onCopyTranscript: handleCopyTranscript,
    onDownloadAudio: downloadRecording,
    onSaveLog: handleSaveLog,
    isVoiceDockExpanded,
    onToggleVoiceDock: () => setIsVoiceDockExpanded(!isVoiceDockExpanded),
    canUseAdminTools,
    showSuperAdminTools: isSuperAdmin,
    onOpenSuperAdmin: () => setIsSuperAdminModalOpen(true),
  };

  const voiceDockProps: VoiceDockProps | null = sessionStatus === "CONNECTED" && isVoiceDockExpanded
    ? {
        sessionStatus,
        isPTTActive,
        isPTTUserSpeaking,
        onTogglePTT: setIsPTTActive,
        onTalkStart: handleTalkButtonDown,
        onTalkEnd: handleTalkButtonUp,
      }
    : null;

  const transcriptProps: TranscriptMessagesProps = {
    hasActivatedSession,
    onSendMessage: (message: string) => {
      void handleSendTextMessage(message);
    },
    canViewDebugPayloads,
  };

  const inputBarProps: InputBarProps = {
    userText,
    setUserText,
    onSendMessage: () => {
      void handleSendTextMessage();
    },
    canSend: sessionStatus !== 'CONNECTING',
  };

  const signalStackProps: SignalStackLayoutProps = {
    showLogs: isEventsPaneExpanded,
    toolCatalog,
  };

  const bottomStatusProps: BottomStatusRailProps = {
    onOpenDebugModal: () => setIsDebugModalOpen(true),
  };

  const signalsDrawerProps: SignalsDrawerShellProps = {
    open: isMobileSignalsOpen,
    onClose: () => setIsMobileSignalsOpen(false),
  };

  const activeWalletAddress = walletPortfolio?.address
    ?? sessionIdentity.wallet?.public_key
    ?? signalData.wallet.summary.activeWallet
    ?? null;

  const topRibbonProps: TopRibbonProps = {
    sessionStatus,
    selectedAgentName,
    agents: scenarioAgents,
    onAgentChange: handleSelectedAgentChange,
    onToggleConnection,
    onReloadBrand: () => window.location.reload(),
    authState: {
      loading: authLoading,
      isAuthenticated: Boolean(authSession),
      email: authEmail,
    },
    sessionIdentity,
    mcpStatus,
    activeWalletKey: activeWalletAddress,
    walletPortfolio: walletPortfolioSummary,
    onSignIn: handleSignIn,
    onSignOut: handleSignOut,
    turnstileSiteKey,
  };

  const identityLabel = sessionIdentity.type === "user"
    ? sessionIdentity.user?.email?.split("@")[0] || "User"
    : "Demo";

  const debugModalProps: DebugInfoModalProps = {
    open: isDebugModalOpen,
    onClose: () => setIsDebugModalOpen(false),
    connectionStatus: sessionStatus,
    identityLabel,
    mcpStatus: mcpStatus.label,
    walletStatus: signalData.wallet.summary.activeWallet || "Auto",
    isAudioPlaybackEnabled,
    setIsAudioPlaybackEnabled,
    isEventsPaneExpanded,
    setIsEventsPaneExpanded,
    codec: urlCodec,
    onCodecChange: handleCodecChange,
    buildTag: process.env.NEXT_PUBLIC_BUILD_TAG ?? "dev",
  };

  const superAdminModalProps: SuperAdminModalProps = {
    open: isSuperAdminModalOpen,
    onClose: () => setIsSuperAdminModalOpen(false),
  };

  return {
    topRibbonProps,
    heroContainerClassName,
    heroControlsProps,
    transcriptProps,
    inputBarProps,
    signalStackProps,
    bottomStatusProps,
    signalsDrawerProps,
    voiceDockProps,
    debugModalProps,
    superAdminModalProps,
  };
}
