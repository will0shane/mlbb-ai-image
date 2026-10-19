import { randomUUID } from "crypto";
import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { REGION, MS_PER_DAY } from "./constants";
import { normalizeKey, formatKey, generateKey, redactKey } from "./key-utils";
import { KeyDoc, DerivedStatus } from "./types";

// enforceAppCheck is off: the admin web app has no App Check provider, and with
// firebase-functions >= 6 a missing App Check token is rejected (even in the
// emulator). CORS must be enabled so the hosted admin panel can call these.
const adminCallableOpts = {
  region: REGION,
  cors: true,
};

/** Helper to verify admin claim */
function assertAdmin(request: CallableRequest): void {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  const email = request.auth.token.email?.toLowerCase();
  const configuredAdmin = (process.env.ADMIN_EMAIL || "mlbbaiimage@gmail.com").toLowerCase();
  const isAuthorized = request.auth.token.admin === true || email === configuredAdmin;
  if (!isAuthorized) {
    throw new HttpsError("permission-denied", "Admin access required.");
  }
}

/** Derive the runtime status from a key document */
function deriveStatus(keyData: KeyDoc): DerivedStatus {
  if (keyData.status === "revoked") return "revoked";
  if (keyData.status === "unused") return "unused";
  // status is "active"
  if (keyData.expiresAt && keyData.expiresAt.toMillis() <= Date.now()) return "expired";
  if (!keyData.deviceId) return "available";
  return "active";
}

/**
 * createKeys({ durationDays, count, label })
 * Creates 1 to 100 keys and returns the formatted key strings.
 */
export const createKeys = onCall(adminCallableOpts, async (request: CallableRequest) => {
  assertAdmin(request);

  const { durationDays, count, label } = request.data as {
    durationDays: number;
    count: number;
    label: string;
  };

  if (!durationDays || durationDays < 1) {
    throw new HttpsError("invalid-argument", "durationDays must be at least 1.");
  }
  if (!count || count < 1 || count > 100) {
    throw new HttpsError("invalid-argument", "count must be between 1 and 100.");
  }

  const db = getFirestore();
  const batch = db.batch();
  const now = Timestamp.now();
  const keys: string[] = [];

  for (let i = 0; i < count; i++) {
    const raw = generateKey();
    const keyRef = db.collection("keys").doc(raw);
    const keyDoc: KeyDoc = {
      durationDays,
      status: "unused",
      activatedAt: null,
      expiresAt: null,
      deviceId: null,
      label: label || "",
      createdAt: now,
      lastSeenAt: null,
    };
    batch.set(keyRef, keyDoc);
    keys.push(formatKey(raw));
  }

  await batch.commit();
  console.log(`createKeys: created ${count} keys with ${durationDays}d duration`);

  return { keys };
});

/**
 * listKeys({ status, search, limit, cursor })
 * Paginated list with derived status.
 */
export const listKeys = onCall(adminCallableOpts, async (request: CallableRequest) => {
  assertAdmin(request);

  const { status: filterStatus, search, limit: rawLimit, cursor } = request.data as {
    status?: string;
    search?: string;
    limit?: number;
    cursor?: string;
  };

  const limit = Math.min(rawLimit || 50, 100);
  const db = getFirestore();
  let query = db.collection("keys").orderBy("createdAt", "desc").limit(limit + 1);

  if (cursor) {
    const cursorSnap = await db.collection("keys").doc(cursor).get();
    if (cursorSnap.exists) {
      query = query.startAfter(cursorSnap);
    }
  }

  const snap = await query.get();
  const now = Date.now();
  const results: Array<{
    key: string;
    formattedKey: string;
    label: string;
    durationDays: number;
    status: DerivedStatus;
    activatedAt: number | null;
    expiresAt: number | null;
    timeLeftMs: number | null;
    deviceBound: boolean;
    lastSeenAt: number | null;
    createdAt: number;
  }> = [];

  for (const doc of snap.docs.slice(0, limit)) {
    const data = doc.data() as KeyDoc;
    const derived = deriveStatus(data);

    // Apply status filter
    if (filterStatus && derived !== filterStatus) continue;

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      const keyLower = doc.id.toLowerCase();
      const labelLower = (data.label || "").toLowerCase();
      if (!keyLower.includes(searchLower) && !labelLower.includes(searchLower)) {
        continue;
      }
    }

    const expiresAtMs = data.expiresAt?.toMillis() ?? null;
    const timeLeftMs = expiresAtMs ? Math.max(0, expiresAtMs - now) : null;

    results.push({
      key: doc.id,
      formattedKey: formatKey(doc.id),
      label: data.label,
      durationDays: data.durationDays,
      status: derived,
      activatedAt: data.activatedAt?.toMillis() ?? null,
      expiresAt: expiresAtMs,
      timeLeftMs,
      deviceBound: !!data.deviceId,
      lastSeenAt: data.lastSeenAt?.toMillis() ?? null,
      createdAt: data.createdAt.toMillis(),
    });
  }

  const hasMore = snap.docs.length > limit;
  const nextCursor = hasMore ? snap.docs[limit - 1].id : null;

  return { keys: results, nextCursor };
});

/**
 * revokeKey({ key })
 */
export const revokeKey = onCall(adminCallableOpts, async (request: CallableRequest) => {
  assertAdmin(request);

  const { key: rawKey } = request.data as { key: string };
  if (!rawKey) throw new HttpsError("invalid-argument", "key is required.");

  const normalized = normalizeKey(rawKey);
  const db = getFirestore();
  const keyRef = db.collection("keys").doc(normalized);

  const snap = await keyRef.get();
  if (!snap.exists) throw new HttpsError("not-found", "Key not found.");

  await keyRef.update({ status: "revoked" });
  console.log(`revokeKey: key ${redactKey(normalized)} revoked`);

  return { success: true };
});

/**
 * restoreKey({ key })
 */
export const restoreKey = onCall(adminCallableOpts, async (request: CallableRequest) => {
  assertAdmin(request);

  const { key: rawKey } = request.data as { key: string };
  if (!rawKey) throw new HttpsError("invalid-argument", "key is required.");

  const normalized = normalizeKey(rawKey);
  const db = getFirestore();
  const keyRef = db.collection("keys").doc(normalized);

  const snap = await keyRef.get();
  if (!snap.exists) throw new HttpsError("not-found", "Key not found.");

  const data = snap.data() as KeyDoc;
  const newStatus = data.activatedAt ? "active" : "unused";

  await keyRef.update({ status: newStatus });
  console.log(`restoreKey: key ${redactKey(normalized)} restored to ${newStatus}`);

  return { success: true };
});

/**
 * resetDevice({ key })
 * Sets deviceId = null (for lost or reinstalled phones).
 */
export const resetDevice = onCall(adminCallableOpts, async (request: CallableRequest) => {
  assertAdmin(request);

  const { key: rawKey } = request.data as { key: string };
  if (!rawKey) throw new HttpsError("invalid-argument", "key is required.");

  const normalized = normalizeKey(rawKey);
  const db = getFirestore();
  const keyRef = db.collection("keys").doc(normalized);

  const snap = await keyRef.get();
  if (!snap.exists) throw new HttpsError("not-found", "Key not found.");

  await keyRef.update({ deviceId: null });
  console.log(`resetDevice: key ${redactKey(normalized)} device cleared`);

  return { success: true };
});

/**
 * extendKey({ key, days })
 * Adds days to expiresAt (or to durationDays if unused).
 */
export const extendKey = onCall(adminCallableOpts, async (request: CallableRequest) => {
  assertAdmin(request);

  const { key: rawKey, days } = request.data as { key: string; days: number };
  if (!rawKey) throw new HttpsError("invalid-argument", "key is required.");
  if (!days || days < 1) throw new HttpsError("invalid-argument", "days must be at least 1.");

  const normalized = normalizeKey(rawKey);
  const db = getFirestore();
  const keyRef = db.collection("keys").doc(normalized);

  const snap = await keyRef.get();
  if (!snap.exists) throw new HttpsError("not-found", "Key not found.");

  const data = snap.data() as KeyDoc;

  if (data.activatedAt && data.expiresAt) {
    // Active key: extend expiresAt
    const newExpiry = Timestamp.fromMillis(data.expiresAt.toMillis() + days * MS_PER_DAY);
    await keyRef.update({ expiresAt: newExpiry });
  } else {
    // Unused key: extend durationDays
    await keyRef.update({ durationDays: data.durationDays + days });
  }

  console.log(`extendKey: key ${redactKey(normalized)} extended by ${days} days`);
  return { success: true };
});

/**
 * deleteKey({ key })
 */
export const deleteKey = onCall(adminCallableOpts, async (request: CallableRequest) => {
  assertAdmin(request);

  const { key: rawKey } = request.data as { key: string };
  if (!rawKey) throw new HttpsError("invalid-argument", "key is required.");

  const normalized = normalizeKey(rawKey);
  const db = getFirestore();
  const keyRef = db.collection("keys").doc(normalized);

  const snap = await keyRef.get();
  if (!snap.exists) throw new HttpsError("not-found", "Key not found.");

  await keyRef.delete();
  console.log(`deleteKey: key ${redactKey(normalized)} deleted`);

  return { success: true };
});

/** ---- App icon upload ---- */

const MAX_ICON_BYTES = 4 * 1024 * 1024; // 4 MB decoded (≈5.4 MB base64 payload)
const ICON_EXT_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
};
const ICON_STORAGE_DIR = "admin/app-icon";
const ICON_DOC_PATH = "settings/appIcon";

interface IconMeta {
  url: string;
  path: string;
  fileName: string;
  contentType: string;
  size: number;
  updatedAt: number | null;
}

/** Token-based download URL works without touching storage security rules. */
function buildIconUrl(bucketName: string, path: string, token: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(
    path
  )}?alt=media&token=${token}`;
}

/**
 * getAppIcon()
 * Returns the currently stored app icon (or null if none uploaded yet).
 */
export const getAppIcon = onCall(adminCallableOpts, async (request: CallableRequest) => {
  assertAdmin(request);

  const snap = await getFirestore().doc(ICON_DOC_PATH).get();
  if (!snap.exists) return { icon: null };

  const data = snap.data() as {
    path: string;
    token: string;
    fileName: string;
    contentType: string;
    size: number;
    updatedAt?: Timestamp;
  };

  const bucket = getStorage().bucket();
  const icon: IconMeta = {
    url: buildIconUrl(bucket.name, data.path, data.token),
    path: data.path,
    fileName: data.fileName,
    contentType: data.contentType,
    size: data.size,
    updatedAt: data.updatedAt?.toMillis() ?? null,
  };

  return { icon };
});

/**
 * uploadIcon({ fileName, contentType, data })
 * Uploads (or replaces) the app icon in Cloud Storage.
 * The file lives at a fixed path, so every new upload overwrites the old one.
 */
export const uploadIcon = onCall(adminCallableOpts, async (request: CallableRequest) => {
  assertAdmin(request);

  const { fileName, contentType, data } = request.data as {
    fileName?: string;
    contentType?: string;
    data?: string;
  };

  if (!contentType || !ICON_EXT_BY_TYPE[contentType]) {
    throw new HttpsError(
      "invalid-argument",
      "contentType must be image/png, image/jpeg, image/webp, image/svg+xml or image/x-icon."
    );
  }
  const ext = ICON_EXT_BY_TYPE[contentType];
  if (!data || typeof data !== "string") {
    throw new HttpsError("invalid-argument", "data (base64 file content) is required.");
  }

  const buffer = Buffer.from(data, "base64");
  if (buffer.length === 0) {
    throw new HttpsError("invalid-argument", "File is empty.");
  }
  if (buffer.length > MAX_ICON_BYTES) {
    throw new HttpsError("invalid-argument", "Icon must be 4 MB or smaller.");
  }

  const bucket = getStorage().bucket();
  const token = randomUUID();
  const path = `${ICON_STORAGE_DIR}/icon.${ext}`;

  // Remove stale files from earlier uploads (e.g. icon.png replaced by icon.webp)
  const [existingFiles] = await bucket.getFiles({ prefix: `${ICON_STORAGE_DIR}/` });
  await Promise.all(
    existingFiles
      .filter((f) => f.name !== path)
      .map((f) => f.delete().catch(() => undefined))
  );

  await bucket.file(path).save(buffer, {
    contentType,
    resumable: false,
    metadata: {
      cacheControl: "public, max-age=3600",
      metadata: { downloadTokens: [token] },
    },
  });

  const cleanName = (fileName || `icon.${ext}`)
    .split(/[\\/]/)
    .pop()!
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 100);

  const db = getFirestore();
  await db.doc(ICON_DOC_PATH).set({
    path,
    token,
    fileName: cleanName,
    contentType,
    size: buffer.length,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const icon: IconMeta = {
    url: buildIconUrl(bucket.name, path, token),
    path,
    fileName: cleanName,
    contentType,
    size: buffer.length,
    updatedAt: Date.now(),
  };

  console.log(`uploadIcon: saved ${path} (${buffer.length} bytes, ${cleanName})`);
  return { icon };
});
