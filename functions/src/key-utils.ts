import * as crypto from "crypto";
import { KEY_ALPHABET, KEY_LENGTH } from "./constants";

/**
 * Normalize a key string: uppercase, remove dashes and spaces.
 * Used as the Firestore document ID.
 */
export function normalizeKey(raw: string): string {
  return raw.toUpperCase().replace(/[-\s]/g, "");
}

/**
 * Format a normalized key into display format: XXXX-XXXX-XXXX-XXXX
 */
export function formatKey(normalized: string): string {
  return normalized.match(/.{1,4}/g)?.join("-") ?? normalized;
}

/**
 * Generate a single cryptographically secure random key.
 * Uses KEY_ALPHABET (no 0, O, 1, I to avoid confusion).
 */
export function generateKey(): string {
  const bytes = crypto.randomBytes(KEY_LENGTH);
  let key = "";
  for (let i = 0; i < KEY_LENGTH; i++) {
    key += KEY_ALPHABET[bytes[i] % KEY_ALPHABET.length];
  }
  return key;
}

/**
 * Mask a key for display: show first 4 and last 4, mask the middle.
 * e.g., "ABCD-****-****-QRST"
 */
export function maskKey(normalized: string): string {
  if (normalized.length < 8) return "****";
  const first = normalized.slice(0, 4);
  const last = normalized.slice(-4);
  const middleLen = normalized.length - 8;
  const masked = "*".repeat(middleLen);
  const full = first + masked + last;
  return full.match(/.{1,4}/g)?.join("-") ?? full;
}

/**
 * Redact a key for logging: show only last 4 characters.
 */
export function redactKey(normalized: string): string {
  if (normalized.length <= 4) return normalized;
  return `****${normalized.slice(-4)}`;
}
