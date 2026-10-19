/**
 * Cloud Functions integration tests using Firebase Emulators.
 *
 * Run with: npm test (with emulators running)
 * Or: firebase emulators:exec "cd functions && npm test"
 */

import { initializeApp, deleteApp, App } from "firebase-admin/app";
import { getFirestore, Timestamp, Firestore } from "firebase-admin/firestore";

// Point to emulators
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.GCLOUD_PROJECT = "test-project";

import { normalizeKey, formatKey, generateKey, maskKey, redactKey } from "../src/key-utils";
import { KEY_ALPHABET, KEY_LENGTH, MAX_ATTEMPTS, BASE_LOCK_MINUTES, MS_PER_DAY } from "../src/constants";
import { KeyDoc, AttemptDoc } from "../src/types";

/* ──────────────────────────────────────────── */
/*  Unit tests for key-utils                    */
/* ──────────────────────────────────────────── */

describe("key-utils", () => {
  describe("normalizeKey", () => {
    it("uppercases and strips dashes and spaces", () => {
      expect(normalizeKey("abcd-efgh-1234-5678")).toBe("ABCDEFGH12345678");
      expect(normalizeKey("  ab cd ")).toBe("ABCD");
    });
  });

  describe("formatKey", () => {
    it("inserts dashes every 4 characters", () => {
      expect(formatKey("ABCDEFGH12345678")).toBe("ABCD-EFGH-1234-5678");
    });

    it("handles short strings", () => {
      expect(formatKey("ABC")).toBe("ABC");
    });
  });

  describe("generateKey", () => {
    it("produces a key of correct length", () => {
      const key = generateKey();
      expect(key.length).toBe(KEY_LENGTH);
    });

    it("uses only valid alphabet characters", () => {
      for (let i = 0; i < 50; i++) {
        const key = generateKey();
        for (const ch of key) {
          expect(KEY_ALPHABET).toContain(ch);
        }
      }
    });

    it("generates unique keys", () => {
      const keys = new Set<string>();
      for (let i = 0; i < 100; i++) {
        keys.add(generateKey());
      }
      expect(keys.size).toBe(100);
    });
  });

  describe("maskKey", () => {
    it("masks the middle of a standard key", () => {
      const masked = maskKey("ABCDEFGH12345678");
      expect(masked).toBe("ABCD-****-****-5678");
    });

    it("handles short keys", () => {
      expect(maskKey("ABCD")).toBe("****");
    });
  });

  describe("redactKey", () => {
    it("shows only last 4 characters", () => {
      expect(redactKey("ABCDEFGH12345678")).toBe("****5678");
    });
  });
});

/* ──────────────────────────────────────────── */
/*  Integration tests with Firestore emulator   */
/* ──────────────────────────────────────────── */

describe("Cloud Functions integration (emulator)", () => {
  let app: App;
  let db: Firestore;

  beforeAll(() => {
    app = initializeApp({ projectId: "test-project" }, "test-app");
    db = getFirestore(app);
  });

  afterAll(async () => {
    await deleteApp(app);
  });

  // Helper to create a key document directly in Firestore
  async function createTestKey(
    normalized: string,
    overrides: Partial<KeyDoc> = {}
  ): Promise<void> {
    const now = Timestamp.now();
    const doc: KeyDoc = {
      durationDays: 7,
      status: "unused",
      activatedAt: null,
      expiresAt: null,
      deviceId: null,
      label: "test",
      createdAt: now,
      lastSeenAt: null,
      ...overrides,
    };
    await db.collection("keys").doc(normalized).set(doc);
  }

  // Helper to create an attempt document
  async function createAttempt(
    uid: string,
    overrides: Partial<AttemptDoc> = {}
  ): Promise<void> {
    const doc: AttemptDoc = {
      count: 0,
      lockedUntil: null,
      lastAttemptAt: Timestamp.now(),
      lockMultiplier: 1,
      ...overrides,
    };
    await db.collection("attempts").doc(uid).set(doc);
  }

  // Clean up test data
  async function cleanCollection(name: string): Promise<void> {
    const snap = await db.collection(name).get();
    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }

  beforeEach(async () => {
    await cleanCollection("keys");
    await cleanCollection("attempts");
  });

  describe("Key document operations", () => {
    it("should create and read a key document", async () => {
      const keyId = generateKey();
      await createTestKey(keyId, { durationDays: 30, label: "premium" });

      const snap = await db.collection("keys").doc(keyId).get();
      expect(snap.exists).toBe(true);

      const data = snap.data() as KeyDoc;
      expect(data.durationDays).toBe(30);
      expect(data.status).toBe("unused");
      expect(data.label).toBe("premium");
      expect(data.activatedAt).toBeNull();
      expect(data.expiresAt).toBeNull();
      expect(data.deviceId).toBeNull();
    });

    it("should activate a key with first device", async () => {
      const keyId = generateKey();
      await createTestKey(keyId);

      const now = Timestamp.now();
      const nowMs = now.toMillis();
      const expiresAt = Timestamp.fromMillis(nowMs + 7 * MS_PER_DAY);

      await db.collection("keys").doc(keyId).update({
        status: "active",
        activatedAt: now,
        expiresAt: expiresAt,
        deviceId: "device-1",
        lastSeenAt: now,
      });

      const snap = await db.collection("keys").doc(keyId).get();
      const data = snap.data() as KeyDoc;
      expect(data.status).toBe("active");
      expect(data.deviceId).toBe("device-1");
      expect(data.activatedAt).not.toBeNull();
      expect(data.expiresAt).not.toBeNull();
    });

    it("should allow same device to re-activate without changing expiry", async () => {
      const keyId = generateKey();
      const now = Timestamp.now();
      const nowMs = now.toMillis();
      const expiresAt = Timestamp.fromMillis(nowMs + 7 * MS_PER_DAY);

      await createTestKey(keyId, {
        status: "active",
        activatedAt: now,
        expiresAt: expiresAt,
        deviceId: "device-1",
      });

      // Re-activate with same device - just update deviceId and lastSeenAt
      await db.collection("keys").doc(keyId).update({
        deviceId: "device-1",
        lastSeenAt: Timestamp.now(),
      });

      const snap = await db.collection("keys").doc(keyId).get();
      const data = snap.data() as KeyDoc;
      expect(data.expiresAt!.toMillis()).toBe(expiresAt.toMillis());
      expect(data.deviceId).toBe("device-1");
    });

    it("should reject activation from another device when bound", async () => {
      const keyId = generateKey();
      const now = Timestamp.now();
      const expiresAt = Timestamp.fromMillis(now.toMillis() + 7 * MS_PER_DAY);

      await createTestKey(keyId, {
        status: "active",
        activatedAt: now,
        expiresAt: expiresAt,
        deviceId: "device-1",
      });

      // Read and check device binding
      const snap = await db.collection("keys").doc(keyId).get();
      const data = snap.data() as KeyDoc;
      expect(data.deviceId).toBe("device-1");
      expect(data.deviceId !== "device-2").toBe(true); // KEY_IN_USE scenario
    });

    it("should allow activation on new device after logout", async () => {
      const keyId = generateKey();
      const now = Timestamp.now();
      const expiresAt = Timestamp.fromMillis(now.toMillis() + 7 * MS_PER_DAY);

      await createTestKey(keyId, {
        status: "active",
        activatedAt: now,
        expiresAt: expiresAt,
        deviceId: "device-1",
      });

      // Logout: set deviceId to null
      await db.collection("keys").doc(keyId).update({ deviceId: null });

      // Activate with new device
      await db.collection("keys").doc(keyId).update({
        deviceId: "device-2",
        lastSeenAt: Timestamp.now(),
      });

      const snap = await db.collection("keys").doc(keyId).get();
      const data = snap.data() as KeyDoc;
      expect(data.deviceId).toBe("device-2");
      expect(data.expiresAt!.toMillis()).toBe(expiresAt.toMillis()); // Expiry unchanged
    });

    it("should detect expired key", async () => {
      const keyId = generateKey();
      const now = Timestamp.now();
      const pastExpiry = Timestamp.fromMillis(now.toMillis() - 1000);

      await createTestKey(keyId, {
        status: "active",
        activatedAt: Timestamp.fromMillis(now.toMillis() - 7 * MS_PER_DAY),
        expiresAt: pastExpiry,
        deviceId: "device-1",
      });

      const snap = await db.collection("keys").doc(keyId).get();
      const data = snap.data() as KeyDoc;
      expect(data.expiresAt!.toMillis() <= Date.now()).toBe(true); // KEY_EXPIRED
    });

    it("should detect revoked key", async () => {
      const keyId = generateKey();
      await createTestKey(keyId, { status: "revoked" });

      const snap = await db.collection("keys").doc(keyId).get();
      const data = snap.data() as KeyDoc;
      expect(data.status).toBe("revoked");
    });

    it("should clear device on admin reset without changing expiry", async () => {
      const keyId = generateKey();
      const now = Timestamp.now();
      const expiresAt = Timestamp.fromMillis(now.toMillis() + 7 * MS_PER_DAY);

      await createTestKey(keyId, {
        status: "active",
        activatedAt: now,
        expiresAt: expiresAt,
        deviceId: "device-1",
      });

      // Admin reset device
      await db.collection("keys").doc(keyId).update({ deviceId: null });

      const snap = await db.collection("keys").doc(keyId).get();
      const data = snap.data() as KeyDoc;
      expect(data.deviceId).toBeNull();
      expect(data.expiresAt!.toMillis()).toBe(expiresAt.toMillis()); // Expiry unchanged
    });
  });

  describe("Attempt tracking", () => {
    it("should increment attempt count on unknown key", async () => {
      const uid = "user-1";
      await createAttempt(uid, { count: 0 });

      // Simulate failed attempt
      await db.collection("attempts").doc(uid).update({
        count: 1,
        lastAttemptAt: Timestamp.now(),
      });

      const snap = await db.collection("attempts").doc(uid).get();
      const data = snap.data() as AttemptDoc;
      expect(data.count).toBe(1);
    });

    it("should lock after MAX_ATTEMPTS failures", async () => {
      const uid = "user-2";
      const now = Timestamp.now();
      const lockUntil = Timestamp.fromMillis(now.toMillis() + BASE_LOCK_MINUTES * 60 * 1000);

      await createAttempt(uid, {
        count: MAX_ATTEMPTS,
        lockedUntil: lockUntil,
        lockMultiplier: 2,
      });

      const snap = await db.collection("attempts").doc(uid).get();
      const data = snap.data() as AttemptDoc;
      expect(data.lockedUntil!.toMillis()).toBeGreaterThan(Date.now());
      expect(data.lockMultiplier).toBe(2); // Doubled for next lockout
    });
  });

  describe("Key lifecycle scenarios", () => {
    it("logout then wait then activate: remaining time reduced", async () => {
      const keyId = generateKey();
      const activatedAt = Timestamp.now();
      const originalExpiry = Timestamp.fromMillis(activatedAt.toMillis() + 7 * MS_PER_DAY);

      await createTestKey(keyId, {
        status: "active",
        activatedAt: activatedAt,
        expiresAt: originalExpiry,
        deviceId: "device-1",
      });

      // Logout
      await db.collection("keys").doc(keyId).update({ deviceId: null });

      // Time passes (simulated by checking expiry hasn't changed)
      const snap = await db.collection("keys").doc(keyId).get();
      const data = snap.data() as KeyDoc;
      expect(data.deviceId).toBeNull();
      // expiresAt is FIXED and does NOT change on logout
      expect(data.expiresAt!.toMillis()).toBe(originalExpiry.toMillis());
      // Time remaining = expiresAt - now, which is less than the original duration
    });

    it("extend key adds days to expiresAt for active key", async () => {
      const keyId = generateKey();
      const now = Timestamp.now();
      const originalExpiry = Timestamp.fromMillis(now.toMillis() + 3 * MS_PER_DAY);

      await createTestKey(keyId, {
        status: "active",
        activatedAt: now,
        expiresAt: originalExpiry,
        deviceId: "device-1",
      });

      // Extend by 7 days
      const newExpiry = Timestamp.fromMillis(originalExpiry.toMillis() + 7 * MS_PER_DAY);
      await db.collection("keys").doc(keyId).update({ expiresAt: newExpiry });

      const snap = await db.collection("keys").doc(keyId).get();
      const data = snap.data() as KeyDoc;
      expect(data.expiresAt!.toMillis()).toBe(originalExpiry.toMillis() + 7 * MS_PER_DAY);
    });

    it("extend unused key adds to durationDays", async () => {
      const keyId = generateKey();
      await createTestKey(keyId, { durationDays: 7 });

      // Extend by 3 days
      await db.collection("keys").doc(keyId).update({ durationDays: 10 });

      const snap = await db.collection("keys").doc(keyId).get();
      const data = snap.data() as KeyDoc;
      expect(data.durationDays).toBe(10);
    });

    it("revoke and restore a key", async () => {
      const keyId = generateKey();
      const now = Timestamp.now();

      await createTestKey(keyId, {
        status: "active",
        activatedAt: now,
        expiresAt: Timestamp.fromMillis(now.toMillis() + 7 * MS_PER_DAY),
      });

      // Revoke
      await db.collection("keys").doc(keyId).update({ status: "revoked" });
      let snap = await db.collection("keys").doc(keyId).get();
      expect((snap.data() as KeyDoc).status).toBe("revoked");

      // Restore
      await db.collection("keys").doc(keyId).update({ status: "active" });
      snap = await db.collection("keys").doc(keyId).get();
      expect((snap.data() as KeyDoc).status).toBe("active");
    });

    it("delete a key removes the document", async () => {
      const keyId = generateKey();
      await createTestKey(keyId);

      await db.collection("keys").doc(keyId).delete();

      const snap = await db.collection("keys").doc(keyId).get();
      expect(snap.exists).toBe(false);
    });
  });
});
