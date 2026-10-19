import { KeyItem, DerivedStatus, AppIcon } from "./types";

const STORAGE_KEY = "mlbb_admin_keys_v1";
const ICON_STORAGE_KEY = "mlbb_admin_app_icon_v1";

const KEY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const KEY_LENGTH = 16;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function normalizeKey(raw: string): string {
  return raw.toUpperCase().replace(/[-\s]/g, "");
}

export function formatKey(normalized: string): string {
  return normalized.match(/.{1,4}/g)?.join("-") ?? normalized;
}

export function generateKey(): string {
  let key = "";
  for (let i = 0; i < KEY_LENGTH; i++) {
    const idx = Math.floor(Math.random() * KEY_ALPHABET.length);
    key += KEY_ALPHABET[idx];
  }
  return key;
}

function deriveStatus(key: KeyItem): DerivedStatus {
  if (key.status === "revoked") return "revoked";
  if (key.status === "unused") return "unused";
  if (key.expiresAt && key.expiresAt <= Date.now()) return "expired";
  if (!key.deviceBound) return "available";
  return "active";
}

function getInitialKeys(): KeyItem[] {
  const now = Date.now();
  return [
    {
      key: "MLBBTESTDEMO2026",
      formattedKey: "MLBB-TEST-DEMO-2026",
      label: "Demo Trial Key",
      durationDays: 7,
      status: "active",
      activatedAt: now - 1 * MS_PER_DAY,
      expiresAt: now + 6 * MS_PER_DAY,
      timeLeftMs: 6 * MS_PER_DAY,
      deviceBound: true,
      lastSeenAt: now - 3600000,
      createdAt: now - 2 * MS_PER_DAY,
    },
    {
      key: "VIP789ABCDEF2345",
      formattedKey: "VIP7-89AB-CDEF-2345",
      label: "VIP Monthly Pass",
      durationDays: 30,
      status: "unused",
      activatedAt: null,
      expiresAt: null,
      timeLeftMs: null,
      deviceBound: false,
      lastSeenAt: null,
      createdAt: now - 1 * MS_PER_DAY,
    },
    {
      key: "STAR6789JKLMNPQR",
      formattedKey: "STAR-6789-JKLM-NPQR",
      label: "Standard 7-Day",
      durationDays: 7,
      status: "unused",
      activatedAt: null,
      expiresAt: null,
      timeLeftMs: null,
      deviceBound: false,
      lastSeenAt: null,
      createdAt: now,
    },
  ];
}

export function getLocalKeys(): KeyItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getInitialKeys();
      saveLocalKeys(initial);
      return initial;
    }
    const parsed: KeyItem[] = JSON.parse(raw);
    const now = Date.now();
    return parsed.map((k) => {
      const status = deriveStatus(k);
      const timeLeftMs = k.expiresAt ? Math.max(0, k.expiresAt - now) : null;
      return {
        ...k,
        status,
        timeLeftMs,
      };
    });
  } catch (err) {
    console.warn("Failed to read local keys from storage:", err);
    return getInitialKeys();
  }
}

export function saveLocalKeys(keys: KeyItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  } catch (err) {
    console.warn("Failed to save local keys to storage:", err);
  }
}

export function localListKeys(params: {
  status?: string;
  search?: string;
  limit?: number;
  cursor?: string;
}): { keys: KeyItem[]; nextCursor: string | null } {
  let list = getLocalKeys();

  if (params.status) {
    list = list.filter((k) => k.status === params.status);
  }

  if (params.search) {
    const s = params.search.toLowerCase();
    list = list.filter(
      (k) =>
        k.key.toLowerCase().includes(s) ||
        k.formattedKey.toLowerCase().includes(s) ||
        k.label.toLowerCase().includes(s)
    );
  }

  // Sort newest first
  list.sort((a, b) => b.createdAt - a.createdAt);

  let startIndex = 0;
  if (params.cursor) {
    const foundIndex = list.findIndex((k) => k.key === params.cursor);
    if (foundIndex !== -1) {
      startIndex = foundIndex + 1;
    }
  }

  const limit = params.limit || 50;
  const paged = list.slice(startIndex, startIndex + limit);
  const nextCursor = startIndex + limit < list.length ? paged[paged.length - 1]?.key || null : null;

  return { keys: paged, nextCursor };
}

export function localCreateKeys(params: {
  durationDays: number;
  count: number;
  label: string;
}): { keys: string[] } {
  const existing = getLocalKeys();
  const createdFormatted: string[] = [];
  const now = Date.now();

  for (let i = 0; i < params.count; i++) {
    const raw = generateKey();
    const formatted = formatKey(raw);
    createdFormatted.push(formatted);

    const newKey: KeyItem = {
      key: raw,
      formattedKey: formatted,
      label: params.label || "",
      durationDays: params.durationDays,
      status: "unused",
      activatedAt: null,
      expiresAt: null,
      timeLeftMs: null,
      deviceBound: false,
      lastSeenAt: null,
      createdAt: now + i, // slight offset to maintain order
    };
    existing.unshift(newKey);
  }

  saveLocalKeys(existing);
  return { keys: createdFormatted };
}

export function localRevokeKey(rawKey: string): { success: boolean } {
  const norm = normalizeKey(rawKey);
  const keys = getLocalKeys();
  const target = keys.find((k) => k.key === norm || normalizeKey(k.formattedKey) === norm);
  if (!target) return { success: false };
  target.status = "revoked";
  saveLocalKeys(keys);
  return { success: true };
}

export function localRestoreKey(rawKey: string): { success: boolean } {
  const norm = normalizeKey(rawKey);
  const keys = getLocalKeys();
  const target = keys.find((k) => k.key === norm || normalizeKey(k.formattedKey) === norm);
  if (!target) return { success: false };
  target.status = target.activatedAt ? "active" : "unused";
  saveLocalKeys(keys);
  return { success: true };
}

export function localResetDevice(rawKey: string): { success: boolean } {
  const norm = normalizeKey(rawKey);
  const keys = getLocalKeys();
  const target = keys.find((k) => k.key === norm || normalizeKey(k.formattedKey) === norm);
  if (!target) return { success: false };
  target.deviceBound = false;
  saveLocalKeys(keys);
  return { success: true };
}

export function localExtendKey(rawKey: string, days: number): { success: boolean } {
  const norm = normalizeKey(rawKey);
  const keys = getLocalKeys();
  const target = keys.find((k) => k.key === norm || normalizeKey(k.formattedKey) === norm);
  if (!target) return { success: false };

  if (target.activatedAt && target.expiresAt) {
    target.expiresAt += days * MS_PER_DAY;
    target.timeLeftMs = Math.max(0, target.expiresAt - Date.now());
  } else {
    target.durationDays += days;
  }
  saveLocalKeys(keys);
  return { success: true };
}

export function localDeleteKey(rawKey: string): { success: boolean } {
  const norm = normalizeKey(rawKey);
  let keys = getLocalKeys();
  keys = keys.filter((k) => k.key !== norm && normalizeKey(k.formattedKey) !== norm);
  saveLocalKeys(keys);
  return { success: true };
}

export function localGetAppIcon(): { icon: AppIcon | null } {
  try {
    const raw = localStorage.getItem(ICON_STORAGE_KEY);
    if (!raw) return { icon: null };
    return { icon: JSON.parse(raw) };
  } catch {
    return { icon: null };
  }
}

export function localUploadAppIcon(params: {
  fileName: string;
  contentType: string;
  data: string;
}): { icon: AppIcon } {
  const url = params.data.startsWith("data:")
    ? params.data
    : `data:${params.contentType};base64,${params.data}`;

  const icon: AppIcon = {
    url,
    path: `admin/app-icon/${params.fileName}`,
    fileName: params.fileName,
    contentType: params.contentType,
    size: Math.round(params.data.length * 0.75),
    updatedAt: Date.now(),
  };

  try {
    localStorage.setItem(ICON_STORAGE_KEY, JSON.stringify(icon));
  } catch (err) {
    console.warn("Failed to save icon to local storage:", err);
  }

  return { icon };
}
