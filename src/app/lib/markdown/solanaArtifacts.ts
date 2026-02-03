import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";

export type SolanaArtifactType = "publicKey" | "signature";

const BASE58_PATTERN = /[1-9A-HJ-NP-Za-km-z]{32,88}/g;

/**
 * Classify a base58 string as a Solana public key or signature.
 */
export function classifySolanaArtifact(candidate: string): SolanaArtifactType | null {
  try {
    const key = new PublicKey(candidate);
    if (key.toBase58() === candidate) {
      return "publicKey";
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
