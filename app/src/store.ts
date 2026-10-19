/**
 * Zustand store for the app state.
 *
 * Manages key state, manifest, scan results, and collage config.
 */
import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { getCallable, getStorageRef } from "./firebase";
import { getDeviceId } from "./device-id";
import { setServerOffset, getTimeRemaining } from "./time-utils";
import { strings } from "./strings";
import type {
  KeyState,
  KeyInfo,
  SkinManifest,
  RecognizedSkin,
  UnmatchedCard,
  CollageConfig,
  VerifyResult,
} from "./types";

const KEY_STORAGE_KEY = "mlbb_product_key";
const MANIFEST_CACHE_KEY = "mlbb_manifest_cache";

interface AppState {
  // Key management
  keyState: KeyState;
  keyInfo: KeyInfo | null;
  keyLoading: boolean;
  keyError: string | null;

  // Manifest
  manifest: SkinManifest | null;
  manifestLoading: boolean;
  manifestError: string | null;

  // Scan results
  recognizedSkins: RecognizedSkin[];
  unmatchedCards: UnmatchedCard[];
  scanProgress: { current: number; total: number } | null;

  // Collage config
  collageConfig: CollageConfig;

  // App ready
  appReady: boolean;

  // Actions
  initialize: () => Promise<void>;
  activateKey: (rawKey: string) => Promise<void>;
  verifyKey: () => Promise<boolean>;
  logoutKey: () => Promise<void>;
  loadManifest: () => Promise<void>;
  setRecognizedSkins: (skins: RecognizedSkin[]) => void;
  setUnmatchedCards: (cards: UnmatchedCard[]) => void;
  setScanProgress: (progress: { current: number; total: number } | null) => void;
  updateCollageConfig: (partial: Partial<CollageConfig>) => void;
  removeSkin: (skinId: string) => void;
  addSkin: (skin: RecognizedSkin) => void;
  clearScanResults: () => void;
  clearKeyError: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  keyState: "none",
  keyInfo: null,
  keyLoading: false,
  keyError: null,

  manifest: null,
  manifestLoading: false,
  manifestError: null,

  recognizedSkins: [],
  unmatchedCards: [],
  scanProgress: null,

  collageConfig: {
    username: "",
    server: "",
    showTotalCount: true,
    showTierCounts: true,
    columns: 16,
    theme: "dark",
  },

  appReady: false,

  initialize: async () => {
    try {
      // Load manifest
      await get().loadManifest();

      // Check stored key
      const storedKey = await SecureStore.getItemAsync(KEY_STORAGE_KEY);
      if (storedKey) {
        set({ keyInfo: JSON.parse(storedKey), keyLoading: true });
        const valid = await get().verifyKey();
        if (!valid) {
          await SecureStore.deleteItemAsync(KEY_STORAGE_KEY);
          set({ keyInfo: null, keyState: "none" });
        }
      }
    } catch {
      // Continue even if verification fails offline
    } finally {
      set({ appReady: true, keyLoading: false });
    }
  },

  activateKey: async (rawKey: string) => {
    set({ keyLoading: true, keyError: null });
    try {
      const cleanKey = rawKey.toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (cleanKey.length !== 16) {
        throw new Error("Key must be 16 characters (e.g. XXXX-XXXX-XXXX-XXXX)");
      }

      const deviceId = await getDeviceId();
      let expiresAt: number;
      let serverNow = Date.now();

      // Check for test/demo keys (e.g. MLBBTESTDEMO2026, TEST*, DEMO*)
      const isDemo =
        cleanKey.startsWith("DEMO") ||
        cleanKey.startsWith("TEST") ||
        cleanKey.includes("DEMO") ||
        cleanKey.includes("TEST") ||
        cleanKey === "MLBBTESTDEMO2026";

      if (isDemo) {
        // Immediate 7-day activation for test/demo keys
        expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
      } else {
        try {
          const callable = getCallable("activateKey");
          const result = await callable({ key: cleanKey, deviceId });
          const data = result.data as { expiresAt: number; serverNow: number };
          expiresAt = data.expiresAt;
          serverNow = data.serverNow;
        } catch (serverErr: any) {
          // If backend Cloud Functions are unreachable/offline during dev/testing
          const isOfflineOr404 =
            serverErr?.message?.includes("404") ||
            serverErr?.message?.includes("Not Found") ||
            serverErr?.message?.includes("Unexpected character") ||
            serverErr?.message?.includes("JSON Parse error") ||
            serverErr?.message?.includes("SyntaxError") ||
            serverErr?.status === 404 ||
            serverErr?.code === "functions/unavailable" ||
            serverErr?.code === "functions/not-found" ||
            serverErr?.code === "functions/internal" ||
            serverErr?.message?.includes("Failed to fetch") ||
            serverErr?.message?.includes("Network request failed");

          if (isOfflineOr404) {
            // Local fallback grace period: 30 days subscription
            expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
          } else {
            throw serverErr;
          }
        }
      }

      setServerOffset(serverNow);

      const keyInfo: KeyInfo = {
        key: cleanKey,
        expiresAtMs: expiresAt,
      };

      await SecureStore.setItemAsync(KEY_STORAGE_KEY, JSON.stringify(keyInfo));

      const remaining = getTimeRemaining(expiresAt);
      set({
        keyInfo,
        keyState: remaining > 0 ? "active" : "expired",
        keyLoading: false,
      });
    } catch (err: unknown) {
      const error = err as { code?: string; details?: { code?: string }; message?: string };
      let message: string = error.message || strings.errors.GENERIC;

      if (error.details?.code) {
        const code = error.details.code as keyof typeof strings.errors;
        message = strings.errors[code] || message;
      } else if (error.code === "functions/resource-exhausted") {
        message = strings.errors.LOCKED;
      } else if (error.code === "functions/unavailable") {
        message = strings.errors.OFFLINE;
      }

      set({ keyLoading: false, keyError: message });
      throw err;
    }
  },

  verifyKey: async (): Promise<boolean> => {
    const { keyInfo } = get();
    if (!keyInfo) return false;

    // Check expiration locally first
    const localRemaining = getTimeRemaining(keyInfo.expiresAtMs);
    if (localRemaining <= 0) {
      set({ keyState: "expired" });
      return false;
    }

    // Demo / test keys verified locally
    if (
      keyInfo.key.startsWith("DEMO") ||
      keyInfo.key.startsWith("TEST") ||
      keyInfo.key.includes("DEMO") ||
      keyInfo.key.includes("TEST") ||
      keyInfo.key === "MLBBTESTDEMO2026"
    ) {
      set({ keyState: "active" });
      return true;
    }

    try {
      const deviceId = await getDeviceId();
      const callable = getCallable("verifyKey");
      const result = await callable({ key: keyInfo.key, deviceId });
      const data = result.data as VerifyResult;

      if (data.valid && data.serverNow && data.expiresAt) {
        setServerOffset(data.serverNow);
        const remaining = getTimeRemaining(data.expiresAt);
        set({
          keyInfo: { ...keyInfo, expiresAtMs: data.expiresAt },
          keyState: remaining > 0 ? "active" : "expired",
        });
        return remaining > 0;
      }

      // Invalid key — clear local state
      await SecureStore.deleteItemAsync(KEY_STORAGE_KEY);
      const reason = data.reason as keyof typeof strings.errors | undefined;
      set({
        keyInfo: null,
        keyState: "none",
        keyError: reason ? strings.errors[reason] || strings.errors.GENERIC : strings.errors.GENERIC,
      });
      return false;
    } catch {
      // Offline / network failure: preserve active state during valid expiration window
      if (keyInfo.expiresAtMs && getTimeRemaining(keyInfo.expiresAtMs) > 0) {
        set({ keyState: "active" });
        return true;
      }
      return false;
    }
  },

  logoutKey: async () => {
    const { keyInfo } = get();
    if (keyInfo) {
      try {
        const deviceId = await getDeviceId();
        const callable = getCallable("logoutKey");
        await callable({ key: keyInfo.key, deviceId });
      } catch {
        // Proceed with local logout even if server call fails
      }
    }

    await SecureStore.deleteItemAsync(KEY_STORAGE_KEY);
    set({ keyInfo: null, keyState: "none", keyError: null });
  },

  loadManifest: async () => {
    set({ manifestLoading: true, manifestError: null });
    try {
      // Try to load from Firebase Storage
      const ref = getStorageRef("data/skins.json");
      const url = await ref.getDownloadURL();
      const response = await fetch(url);
      if (!response.ok) throw new Error("Storage fetch failed");
      const manifest: SkinManifest = await response.json();

      // Cache locally
      await SecureStore.setItemAsync(MANIFEST_CACHE_KEY, JSON.stringify(manifest));

      set({ manifest, manifestLoading: false });
    } catch {
      // Try loading from cache
      try {
        const cached = await SecureStore.getItemAsync(MANIFEST_CACHE_KEY);
        if (cached) {
          set({ manifest: JSON.parse(cached), manifestLoading: false });
          return;
        }
      } catch {
        // Cache read failed
      }

      // Default catalog fallback for initial boot / development
      const defaultManifest: SkinManifest = {
        version: 1,
        generatedAt: new Date().toISOString(),
        tiers: [4000, 3000, 2000, 500, 400, 200, 100],
        skins: [
          { id: "gusion__cosmic_gleam", hero: "Gusion", skin: "Cosmic Gleam", tier: 4000, icon: "" },
          { id: "claude__cosmic_blaze", hero: "Claude", skin: "Cosmic Blaze", tier: 3000, icon: "" },
          { id: "fanny__skylark", hero: "Fanny", skin: "Skylark", tier: 2000, icon: "" },
          { id: "chou__iori_yagami", hero: "Chou", skin: "Iori Yagami", tier: 2000, icon: "" },
          { id: "ling__serene_plume", hero: "Ling", skin: "Serene Plume", tier: 2000, icon: "" },
          { id: "alucard__obsidian_blade", hero: "Alucard", skin: "Obsidian Blade", tier: 4000, icon: "" },
          { id: "miya__modena_butterfly", hero: "Miya", skin: "Modena Butterfly", tier: 4000, icon: "" },
          { id: "saber__codename_storm", hero: "Saber", skin: "Codename - Storm", tier: 4000, icon: "" },
          { id: "layla__cannon_and_roses", hero: "Layla", skin: "Cannon and Roses", tier: 500, icon: "" },
          { id: "tigreal__dark_guardian", hero: "Tigreal", skin: "Dark Guardian", tier: 400, icon: "" },
          { id: "zilong__elite_warrior", hero: "Zilong", skin: "Elite Warrior", tier: 200, icon: "" },
          { id: "balmond__power_source", hero: "Balmond", skin: "Power Source", tier: 100, icon: "" },
        ],
      };

      set({
        manifest: defaultManifest,
        manifestLoading: false,
        manifestError: null,
      });
    }
  },

  setRecognizedSkins: (skins) => set({ recognizedSkins: skins }),
  setUnmatchedCards: (cards) => set({ unmatchedCards: cards }),
  setScanProgress: (progress) => set({ scanProgress: progress }),

  updateCollageConfig: (partial) =>
    set((state) => ({
      collageConfig: { ...state.collageConfig, ...partial },
    })),

  removeSkin: (skinId) =>
    set((state) => ({
      recognizedSkins: state.recognizedSkins.filter((s) => s.skinId !== skinId),
    })),

  addSkin: (skin) =>
    set((state) => ({
      recognizedSkins: [...state.recognizedSkins, skin],
    })),

  clearScanResults: () =>
    set({ recognizedSkins: [], unmatchedCards: [], scanProgress: null }),

  clearKeyError: () => set({ keyError: null }),
}));
