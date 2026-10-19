import { Timestamp } from "firebase-admin/firestore";

/** Firestore document shape for a key in the `keys` collection */
export interface KeyDoc {
  durationDays: number;
  status: "unused" | "active" | "revoked";
  activatedAt: Timestamp | null;
  expiresAt: Timestamp | null;
  deviceId: string | null;
  label: string;
  createdAt: Timestamp;
  lastSeenAt: Timestamp | null;
}

/** Derived status includes runtime calculations */
export type DerivedStatus = "unused" | "active" | "available" | "expired" | "revoked";

/** Firestore document shape for the `attempts` collection */
export interface AttemptDoc {
  count: number;
  lockedUntil: Timestamp | null;
  lastAttemptAt: Timestamp;
  lockMultiplier: number;
}

/** Error reason codes returned by verifyKey */
export type KeyErrorReason =
  | "KEY_REVOKED"
  | "KEY_EXPIRED"
  | "KEY_IN_USE"
  | "NOT_FOUND"
  | "DEVICE_MISMATCH";
