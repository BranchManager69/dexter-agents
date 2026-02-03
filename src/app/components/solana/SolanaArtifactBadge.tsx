"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { SolanaArtifactType } from "@/app/lib/markdown/solanaArtifacts";
import { getKnownAddressInfo } from "@/app/lib/markdown/solanaArtifacts";

interface SolanaArtifactBadgeProps {
  value: string;
  type: SolanaArtifactType;
}

// Default icons for different artifact types
const SOLANA_ICON = "/assets/icons/solana.svg";

// SVG icons as data URIs for different address types
const WALLET_ICON = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#9945FF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>`)}`;

const PROGRAM_ICON = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#14F195" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 9h6"/><path d="M9 13h6"/><path d="M9 17h6"/></svg>`)}`;

const TX_ICON = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#00D1FF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"/><path d="m5 12 7-7 7 7"/><path d="M5 21h14"/></svg>`)}`;

// Jupiter API for token metadata
const JUPITER_TOKEN_API = "https://token.jup.ag/strict";

interface TokenMetadata {
  symbol: string;
  name: string;
  logoURI?: string;
}

// Cache for token metadata to avoid repeated fetches
const tokenMetadataCache = new Map<string, TokenMetadata | null>();

export function SolanaArtifactBadge({ value, type }: SolanaArtifactBadgeProps) {
  const [copied, setCopied] = useState(false);
  const [tokenMeta, setTokenMeta] = useState<TokenMetadata | null>(null);
  const [iconError, setIconError] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchedRef = useRef(false);

  // Check if this is a known address
  const knownInfo = useMemo(() => getKnownAddressInfo(value), [value]);

  // Fetch token metadata for program addresses (potential token mints)
  useEffect(() => {
    if (type !== "program" || fetchedRef.current) return;
    
    // Check cache first
    if (tokenMetadataCache.has(value)) {
      setTokenMeta(tokenMetadataCache.get(value) ?? null);
      return;
    }

    fetchedRef.current = true;

    // Fetch from Jupiter token list
    fetch(JUPITER_TOKEN_API)
      .then((res) => res.json())
      .then((tokens: TokenMetadata[]) => {
        const token = tokens.find((t: any) => t.address === value);
        if (token) {
          tokenMetadataCache.set(value, token);
          setTokenMeta(token);
        } else {
          tokenMetadataCache.set(value, null);
        }
      })
      .catch(() => {
        tokenMetadataCache.set(value, null);
      });
  }, [value, type]);

  useEffect(() => () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  }, []);

  const display = useMemo(() => {
    // If we have token metadata, show symbol
    if (tokenMeta?.symbol) {
      return tokenMeta.symbol;
    }
    // If known address, show shortened name
    if (knownInfo?.name) {
      return knownInfo.name.length > 12 ? `${knownInfo.name.slice(0, 10)}…` : knownInfo.name;
    }
    // Default: truncated address
    if (value.length <= 12) return value;
    return `${value.slice(0, 4)}…${value.slice(-4)}`;
  }, [value, tokenMeta, knownInfo]);

  const explorerUrl = useMemo(() => {
    if (type === "signature") return `https://solscan.io/tx/${value}`;
    return `https://solscan.io/address/${value}`;
  }, [type, value]);

  const { kindLabel, iconSrc, iconAlt } = useMemo(() => {
    if (type === "signature") {
      return { kindLabel: "Transaction", iconSrc: TX_ICON, iconAlt: "Transaction" };
    }
    
    // Token with logo
    if (tokenMeta?.logoURI && !iconError) {
      return { 
        kindLabel: "Token", 
        iconSrc: tokenMeta.logoURI, 
        iconAlt: tokenMeta.name || "Token" 
      };
    }
    
    // Known token without fetched metadata
    if (knownInfo?.type === "token") {
      return { kindLabel: "Token", iconSrc: SOLANA_ICON, iconAlt: knownInfo.name };
    }
    
    // Known program
    if (knownInfo?.type === "program") {
      return { kindLabel: "Program", iconSrc: PROGRAM_ICON, iconAlt: knownInfo.name };
    }
    
    // Wallet (on-curve)
    if (type === "wallet") {
      return { kindLabel: "Wallet", iconSrc: WALLET_ICON, iconAlt: "Wallet Address" };
    }
    
    // Program/PDA (off-curve) - could be token mint or program account
    if (type === "program") {
      return { kindLabel: "Address", iconSrc: PROGRAM_ICON, iconAlt: "Program Address" };
    }
    
    // Fallback
    return { kindLabel: "Address", iconSrc: SOLANA_ICON, iconAlt: "Solana" };
  }, [type, tokenMeta, knownInfo, iconError]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }, [value]);

  const handleIconError = useCallback(() => {
    setIconError(true);
  }, []);

  // Background color based on type
  const bgColor = useMemo(() => {
    if (type === "signature") return "bg-cyan-950/40";
    if (type === "wallet") return "bg-purple-950/40";
    if (tokenMeta || knownInfo?.type === "token") return "bg-green-950/40";
    return "bg-neutral-900/40";
  }, [type, tokenMeta, knownInfo]);

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-xs text-neutral-100 ${bgColor}`}>
      <span className="inline-flex items-center gap-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src={iconError ? SOLANA_ICON : iconSrc} 
          alt={iconAlt} 
          width={14} 
          height={14} 
          className="h-3.5 w-3.5 rounded-full"
          onError={handleIconError}
        />
        <button
          type="button"
          onClick={handleCopy}
          className="font-mono text-sm text-neutral-100 underline decoration-dotted decoration-neutral-500 underline-offset-2 transition hover:text-flux focus:outline-none focus:ring-1 focus:ring-flux/60"
          title={`Copy ${value}`}
          aria-label={`Copy ${kindLabel}`}
        >
          {display}
        </button>
      </span>
      {explorerUrl && (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noreferrer"
          className="font-display text-[10px] font-semibold tracking-[0.08em] text-neutral-500 transition hover:text-flux"
          title="Open in Solscan"
          aria-label="Open in Solscan"
        >
          ↗
        </a>
      )}
      <span
        aria-live="polite"
        className={`font-display text-[10px] font-semibold tracking-[0.08em] transition ${copied ? "text-flux" : "text-neutral-500"}`}
      >
        {copied ? "Copied" : kindLabel}
      </span>
    </span>
  );
}

export default SolanaArtifactBadge;
