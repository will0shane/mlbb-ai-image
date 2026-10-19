import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { REGION, MAX_ATTEMPTS, BASE_LOCK_MINUTES, MS_PER_DAY } from "./constants";
import { normalizeKey, redactKey } from "./key-utils";
import { KeyDoc, AttemptDoc } from "./types";

const callableOpts = {
  region: REGION,
  enforceAppCheck: true,
};

/**
 * activateKey({ key, deviceId })
 *
 * Inside a Firestore transaction, using server timestamps:
 * - Check attempt locking
 * - Validate the key exists and is usable
 * - Bind the device
 */
export const activateKey = onCall(callableOpts, async (request: CallableRequest) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const { key: rawKey, deviceId } = request.data as { key: string; deviceId: string };
  if (!rawKey || !deviceId) {
    throw new HttpsError("invalid-argument", "key and deviceId are required.");
  }

  const normalized = normalizeKey(rawKey);
  const uid = request.auth.uid;
  const db = getFirestore();
  const keyRef = db.collection("keys").doc(normalized);
  const attemptRef = db.collection("attempts").doc(uid);

  const result = await db.runTransaction(async (tx) => {
    const now = Timestamp.now();
    const nowMs = now.toMillis();

    // Check attempt locking
    const attemptSnap = await tx.get(attemptRef);
    const attemptData = attemptSnap.data() as AttemptDoc | undefined;

    if (attemptData?.lockedUntil && attemptData.lockedUntil.toMillis() > nowMs) {
      const remainingSec = Math.ceil((attemptData.lockedUntil.toMillis() - nowMs) / 1000);
      throw new HttpsError(
        "resource-exhausted",
        `Too many attempts. Try again in ${remainingSec} seconds.`,
        { remainingSeconds: remainingSec }
      );
    }

    // Look up the key
    const keySnap = await tx.get(keyRef);
    if (!keySnap.exists) {
      // Increment failed attempt count
      const currentCount = attemptData?.count ?? 0;
      const newCount = currentCount + 1;
      const lockMultiplier = attemptData?.lockMultiplier ?? 1;

      if (newCount >= MAX_ATTEMPTS) {
        const lockMs = BASE_LOCK_MINUTES * lockMultiplier * 60 * 1000;
        tx.set(attemptRef, {
          count: 0,
          lockedUntil: Timestamp.fromMillis(nowMs + lockMs),
          lastAttemptAt: now,
          lockMultiplier: lockMultiplier * 2,
        });
      } else {
        tx.set(attemptRef, {
          count: newCount,
          lockedUntil: attemptData?.lockedUntil ?? null,
          lastAttemptAt: now,
          lockMultiplier: lockMultiplier,
        }, { merge: true });
      }

      console.log(`activateKey: key ****${redactKey(normalized)} not found, uid=${uid}`);
      throw new HttpsError("not-found", "Key not found.");
    }

    // Reset attempt counter on successful lookup
    if (attemptData && attemptData.count > 0) {
      tx.update(attemptRef, { count: 0 });
    }

    const keyData = keySnap.data() as KeyDoc;

    // Check revoked
    if (keyData.status === "revoked") {
      console.log(`activateKey: key ${redactKey(normalized)} is revoked`);
      throw new HttpsError("permission-denied", "This key has been revoked.", { code: "KEY_REVOKED" });
    }

    // Check expired
    if (keyData.expiresAt && keyData.expiresAt.toMillis() <= nowMs) {
      console.log(`activateKey: key ${redactKey(normalized)} is expired`);
      throw new HttpsError("failed-precondition", "This key has expired.", { code: "KEY_EXPIRED" });
    }

    // Check device binding
    if (keyData.deviceId && keyData.deviceId !== deviceId) {
      console.log(`activateKey: key ${redactKey(normalized)} in use on another device`);
      throw new HttpsError("failed-precondition", "This key is in use on another device.", { code: "KEY_IN_USE" });
    }

    // First activation
    if (keyData.activatedAt === null) {
      const expiresAt = Timestamp.fromMillis(nowMs + keyData.durationDays * MS_PER_DAY);
      tx.update(keyRef, {
        status: "active",
        activatedAt: now,
        expiresAt: expiresAt,
        deviceId: deviceId,
        lastSeenAt: now,
      });
      console.log(`activateKey: key ${redactKey(normalized)} first activation`);
      return { expiresAt: expiresAt.toMillis(), serverNow: nowMs };
    }

    // Subsequent activation (same device re-login, or after logout)
    tx.update(keyRef, {
      deviceId: deviceId,
      lastSeenAt: now,
    });
    console.log(`activateKey: key ${redactKey(normalized)} re-activated`);
    return { expiresAt: keyData.expiresAt!.toMillis(), serverNow: nowMs };
  });

  return result;
});

/**
 * verifyKey({ key, deviceId })
 *
 * Returns { valid: true, expiresAt, serverNow } or { valid: false, reason }.
 */
export const verifyKey = onCall(callableOpts, async (request: CallableRequest) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const { key: rawKey, deviceId } = request.data as { key: string; deviceId: string };
  if (!rawKey || !deviceId) {
    throw new HttpsError("invalid-argument", "key and deviceId are required.");
  }

  const normalized = normalizeKey(rawKey);
  const db = getFirestore();
  const keyRef = db.collection("keys").doc(normalized);

  const keySnap = await keyRef.get();
  if (!keySnap.exists) {
    return { valid: false, reason: "NOT_FOUND" };
  }

  const keyData = keySnap.data() as KeyDoc;
  const now = Timestamp.now();
  const nowMs = now.toMillis();

  // Update lastSeenAt (fire-and-forget within the function)
  await keyRef.update({ lastSeenAt: now });

  if (keyData.status === "revoked") {
    return { valid: false, reason: "KEY_REVOKED" };
  }

  if (keyData.expiresAt && keyData.expiresAt.toMillis() <= nowMs) {
    return { valid: false, reason: "KEY_EXPIRED" };
  }

  if (!keyData.deviceId) {
    return { valid: false, reason: "NOT_FOUND" };
  }

  if (keyData.deviceId !== deviceId) {
    return { valid: false, reason: "DEVICE_MISMATCH" };
  }

  return {
    valid: true,
    expiresAt: keyData.expiresAt!.toMillis(),
    serverNow: nowMs,
  };
});

/**
 * logoutKey({ key, deviceId })
 *
 * Unbind the device. Never modify expiresAt or status.
 */
export const logoutKey = onCall(callableOpts, async (request: CallableRequest) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const { key: rawKey, deviceId } = request.data as { key: string; deviceId: string };
  if (!rawKey || !deviceId) {
    throw new HttpsError("invalid-argument", "key and deviceId are required.");
  }

  const normalized = normalizeKey(rawKey);
  const db = getFirestore();
  const keyRef = db.collection("keys").doc(normalized);

  const keySnap = await keyRef.get();
  if (!keySnap.exists) {
    // Succeed quietly
    return { success: true };
  }

  const keyData = keySnap.data() as KeyDoc;

  if (keyData.deviceId === deviceId) {
    await keyRef.update({ deviceId: null });
    console.log(`logoutKey: key ${redactKey(normalized)} device unbound`);
  }

  return { success: true };
});
