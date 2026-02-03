import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";

/**
 * Extended artifact types:
 * - wallet: On-curve address that can sign transactions (user wallet)
 * - program: Off-curve address (PDA, token mint, program account)
 * - signature: Transaction signature (64 bytes)
 */
export type SolanaArtifactType = "wallet" | "program" | "signature";

// Keep legacy type for backwards compatibility
export type LegacySolanaArtifactType = "publicKey" | "signature";

const BASE58_PATTERN = /[1-9A-HJ-NP-Za-km-z]{32,88}/g;

// Well-known addresses for special handling
const KNOWN_ADDRESSES: Record<string, { type: "token" | "program"; name: string }> = {
  // Native SOL wrapped
  "So11111111111111111111111111111111111111112": { type: "token", name: "Wrapped SOL" },
  // USDC
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": { type: "token", name: "USDC" },
  // USDT
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": { type: "token", name: "USDT" },
  // System Program
  "11111111111111111111111111111111": { type: "program", name: "System Program" },
  // Token Program
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA": { type: "program", name: "Token Program" },
  // Token 2022 Program
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb": { type: "program", name: "Token 2022" },
  // Associated Token Program
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL": { type: "program", name: "ATA Program" },
};

/**
 * Check if a PublicKey is on the ed25519 curve.
 * On-curve = can sign transactions (wallet)
 * Off-curve = PDA or program-derived (cannot sign)
 */
function isOnCurve(pubkey: PublicKey): boolean {
  try {
    // PublicKey.isOnCurve() returns true if the point is on the ed25519 curve
    return PublicKey.isOnCurve(pubkey.toBytes());
  } catch {
    return false;
  }
}

/**
 * Get metadata about a known address if it exists.
 */
export function getKnownAddressInfo(address: string): { type: "token" | "program"; name: string } | null {
  return KNOWN_ADDRESSES[address] ?? null;
}

/**
 * Classify a base58 string as a Solana artifact with detailed type info.
 */
export function classifySolanaArtifact(candidate: string): SolanaArtifactType | null {
  try {
    const key = new PublicKey(candidate);
    if (key.toBase58() === candidate) {
      // Valid public key - check if it's on-curve (wallet) or off-curve (PDA/program)
      return isOnCurve(key) ? "wallet" : "program";
    }
  } catch {
    // not a public key; try signature detection below
  }

  try {
    const decoded = bs58.decode(candidate);
    if (decoded.length === 64) {
      return "signature";
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Parse text and return segments with Solana artifacts identified.
 */
export function parseSolanaArtifacts(text: string): Array<{ type: "text" | "artifact"; value: string; artifactType?: SolanaArtifactType }> {
  const segments: Array<{ type: "text" | "artifact"; value: string; artifactType?: SolanaArtifactType }> = [];
  const matches = [...text.matchAll(BASE58_PATTERN)];
  
  if (matches.length === 0) {
    return [{ type: "text", value: text }];
  }

  let lastIndex = 0;

  for (const match of matches) {
    const matchIndex = match.index ?? 0;
    const candidate = match[0];

    // Add text before the match
    if (matchIndex > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, matchIndex) });
    }

    // Classify and add the candidate
    const artifactType = classifySolanaArtifact(candidate);
    if (artifactType) {
      segments.push({ type: "artifact", value: candidate, artifactType });
    } else {
      segments.push({ type: "text", value: candidate });
    }

    lastIndex = matchIndex + candidate.length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }

  return segments;
}
