import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFunctions, httpsCallable, connectFunctionsEmulator } from "firebase/functions";
import {
  localListKeys,
  localCreateKeys,
  localRevokeKey,
  localRestoreKey,
  localResetDevice,
  localExtendKey,
  localDeleteKey,
  localGetAppIcon,
  localUploadAppIcon,
} from "./local-store";

// Config from env or fallback placeholder
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDummyKeyForLocalDev",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mlbb-collage.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mlbb-collage",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "mlbb-collage.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1234567890:web:abcdef",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const functions = getFunctions(app, import.meta.env.VITE_FIREBASE_REGION || "asia-south1");

// Connect emulators if enabled
if (import.meta.env.VITE_USE_EMULATORS === "true") {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}

// Whether to use local store directly (avoids CORS & 404 when GCP billing is not enabled)
export const isLocalMode =
  import.meta.env.VITE_USE_LOCAL_STORE === "true" ||
  (import.meta.env.DEV &&
    import.meta.env.VITE_USE_EMULATORS !== "true" &&
    import.meta.env.VITE_USE_CLOUD_FUNCTIONS !== "true");

// Native Cloud Functions callables
const rawFnCreateKeys = httpsCallable<{ durationDays: number; count: number; label: string }, { keys: string[] }>(
  functions,
  "createKeys"
);

const rawFnListKeys = httpsCallable<
  { status?: string; search?: string; limit?: number; cursor?: string },
  { keys: import("./types").KeyItem[]; nextCursor: string | null }
>(functions, "listKeys");

const rawFnRevokeKey = httpsCallable<{ key: string }, { success: boolean }>(functions, "revokeKey");
const rawFnRestoreKey = httpsCallable<{ key: string }, { success: boolean }>(functions, "restoreKey");
const rawFnResetDevice = httpsCallable<{ key: string }, { success: boolean }>(functions, "resetDevice");
const rawFnExtendKey = httpsCallable<{ key: string; days: number }, { success: boolean }>(functions, "extendKey");
const rawFnDeleteKey = httpsCallable<{ key: string }, { success: boolean }>(functions, "deleteKey");

const rawFnGetAppIcon = httpsCallable<Record<string, never>, { icon: import("./types").AppIcon | null }>(
  functions,
  "getAppIcon"
);

const rawFnUploadAppIcon = httpsCallable<
  { fileName: string; contentType: string; data: string },
  { icon: import("./types").AppIcon }
>(functions, "uploadIcon");

// Resilient wrapper: calls Cloud Functions if configured, with graceful fallback to local store
export const fnListKeys = async (params: { status?: string; search?: string; limit?: number; cursor?: string } = {}) => {
  if (isLocalMode) {
    return { data: localListKeys(params) };
  }
  try {
    return await rawFnListKeys(params);
  } catch (err: any) {
    console.warn("Cloud Functions listKeys failed, falling back to local database:", err?.message || err);
    return { data: localListKeys(params) };
  }
};

export const fnCreateKeys = async (params: { durationDays: number; count: number; label: string }) => {
  if (isLocalMode) {
    return { data: localCreateKeys(params) };
  }
  try {
    return await rawFnCreateKeys(params);
  } catch (err: any) {
    console.warn("Cloud Functions createKeys failed, falling back to local database:", err?.message || err);
    return { data: localCreateKeys(params) };
  }
};

export const fnRevokeKey = async (params: { key: string }) => {
  if (isLocalMode) {
    return { data: localRevokeKey(params.key) };
  }
  try {
    return await rawFnRevokeKey(params);
  } catch (err: any) {
    console.warn("Cloud Functions revokeKey failed, falling back to local database:", err?.message || err);
    return { data: localRevokeKey(params.key) };
  }
};

export const fnRestoreKey = async (params: { key: string }) => {
  if (isLocalMode) {
    return { data: localRestoreKey(params.key) };
  }
  try {
    return await rawFnRestoreKey(params);
  } catch (err: any) {
    console.warn("Cloud Functions restoreKey failed, falling back to local database:", err?.message || err);
    return { data: localRestoreKey(params.key) };
  }
};

export const fnResetDevice = async (params: { key: string }) => {
  if (isLocalMode) {
    return { data: localResetDevice(params.key) };
  }
  try {
    return await rawFnResetDevice(params);
  } catch (err: any) {
    console.warn("Cloud Functions resetDevice failed, falling back to local database:", err?.message || err);
    return { data: localResetDevice(params.key) };
  }
};

export const fnExtendKey = async (params: { key: string; days: number }) => {
  if (isLocalMode) {
    return { data: localExtendKey(params.key, params.days) };
  }
  try {
    return await rawFnExtendKey(params);
  } catch (err: any) {
    console.warn("Cloud Functions extendKey failed, falling back to local database:", err?.message || err);
    return { data: localExtendKey(params.key, params.days) };
  }
};

export const fnDeleteKey = async (params: { key: string }) => {
  if (isLocalMode) {
    return { data: localDeleteKey(params.key) };
  }
  try {
    return await rawFnDeleteKey(params);
  } catch (err: any) {
    console.warn("Cloud Functions deleteKey failed, falling back to local database:", err?.message || err);
    return { data: localDeleteKey(params.key) };
  }
};

export const fnGetAppIcon = async (params: Record<string, never> = {}) => {
  if (isLocalMode) {
    return { data: localGetAppIcon() };
  }
  try {
    return await rawFnGetAppIcon(params);
  } catch (err: any) {
    console.warn("Cloud Functions getAppIcon failed, falling back to local database:", err?.message || err);
    return { data: localGetAppIcon() };
  }
};

export const fnUploadAppIcon = async (params: { fileName: string; contentType: string; data: string }) => {
  if (isLocalMode) {
    return { data: localUploadAppIcon(params) };
  }
  try {
    return await rawFnUploadAppIcon(params);
  } catch (err: any) {
    console.warn("Cloud Functions uploadAppIcon failed, falling back to local database:", err?.message || err);
    return { data: localUploadAppIcon(params) };
  }
};
