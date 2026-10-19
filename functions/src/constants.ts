/** Default region for all Cloud Functions */
export const REGION = process.env.FUNCTIONS_REGION || "asia-south1";

/** Key format: 16 chars from this alphabet (no 0, O, 1, I) */
export const KEY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const KEY_LENGTH = 16;

/** Attempt limiting */
export const MAX_ATTEMPTS = 5;
export const BASE_LOCK_MINUTES = 15;

/** Milliseconds per day */
export const MS_PER_DAY = 24 * 60 * 60 * 1000;
