/**
 * Wallet Key Format Utilities
 * 
 * Helpers for converting between private key formats:
 * - Base58 (Solana standard, e.g., from Phantom export)
 * - JSON byte array (compatible with Solana CLI keypair files)
 */

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/**
 * Decode a base58-encoded string to a byte array
 */
export function base58Decode(base58: string): Uint8Array {
  const bytes: number[] = [];
  
  for (const char of base58) {
    let carry = BASE58_ALPHABET.indexOf(char);
    if (carry < 0) continue; // Skip invalid characters
    
    for (let i = 0; i < bytes.length; i++) {
      carry += bytes[i] * 58;
      bytes[i] = carry & 0xff;
      carry >>= 8;
    }
    
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  
  // Handle leading zeros in base58 (they become leading zeros in output)
  for (const char of base58) {
    if (char !== "1") break;
    bytes.push(0);
  }
  
  bytes.reverse();
  return new Uint8Array(bytes);
}

/**
 * Convert a base58-encoded private key to JSON byte array format
 * This format is compatible with Solana CLI keypair files
 */
export function base58ToJsonArray(base58Key: string): string {
  const bytes = base58Decode(base58Key);
  return JSON.stringify(Array.from(bytes));
}

/**
 * Get the formatted key in the requested format
 */
export function formatPrivateKey(
  base58Key: string,
  format: "base58" | "json"
): string {
  if (format === "base58") return base58Key;
  return base58ToJsonArray(base58Key);
}

/**
 * Validate that a string looks like a valid base58 private key
 * Solana private keys are 64 bytes (88 chars in base58) or 32 bytes (44 chars)
 */
export function isValidBase58Key(key: string): boolean {
  if (!key || typeof key !== "string") return false;
  
  // Check length - private keys are typically 64 or 32 bytes
  if (key.length < 32 || key.length > 100) return false;
  
  // Check all characters are in base58 alphabet
  for (const char of key) {
    if (!BASE58_ALPHABET.includes(char)) return false;
  }
  
  return true;
}

export type KeyFormat = "base58" | "json";
