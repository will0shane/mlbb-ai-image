/**
 * Time formatting utilities.
 * Uses server time offset to prevent clock manipulation.
 */

import { strings } from "./strings";

/** Stored offset between server time and local time */
let serverOffset = 0;

/** Update the offset after receiving serverNow from a verification call */
export function setServerOffset(serverNowMs: number): void {
  serverOffset = serverNowMs - Date.now();
}

/** Get the current server-adjusted time in ms */
export function getServerNow(): number {
  return Date.now() + serverOffset;
}

/** Calculate remaining time in ms from an expiry timestamp */
export function getTimeRemaining(expiresAtMs: number): number {
  return Math.max(0, expiresAtMs - getServerNow());
}

/** Format remaining time as a human-readable string */
export function formatTimeRemaining(remainingMs: number): string {
  if (remainingMs <= 0) return strings.home.expired;

  const totalMinutes = Math.floor(remainingMs / (60 * 1000));
  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const minutes = totalMinutes % 60;

  if (days >= 1) {
    return strings.time.daysHours(days, hours);
  }
  if (totalHours >= 1) {
    return strings.time.hoursMin(totalHours, minutes);
  }
  return strings.time.minLeft(Math.max(1, minutes));
}
