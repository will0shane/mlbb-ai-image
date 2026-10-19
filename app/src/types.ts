/** Shared types for the app */

export interface SkinEntry {
  id: string;
  hero: string;
  skin: string;
  tier: number;
  icon: string;
}

export interface SkinManifest {
  version: number;
  generatedAt: string;
  tiers: number[];
  skins: SkinEntry[];
}

export interface RecognizedSkin {
  skinId: string;
  hero: string;
  skin: string;
  tier: number;
  icon: string;
  confidence: "high" | "medium" | "low";
  ocrHeroText: string;
  ocrSkinText: string;
  suggestions?: SkinEntry[];
}

export interface UnmatchedCard {
  ocrHeroText: string;
  ocrSkinText: string;
  suggestions: SkinEntry[];
}

export interface CollageConfig {
  username: string;
  server: string;
  showTotalCount: boolean;
  showTierCounts: boolean;
  columns: 12 | 16 | 20;
  theme: "dark" | "light";
}

export type KeyState = "none" | "active" | "expired";

export interface KeyInfo {
  key: string;
  expiresAtMs: number;
}

export interface VerifyResult {
  valid: boolean;
  expiresAt?: number;
  serverNow?: number;
  reason?: string;
}
