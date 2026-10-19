export type DerivedStatus = "unused" | "active" | "available" | "expired" | "revoked";

export interface KeyItem {
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
}

export interface SummaryStats {
  total: number;
  active: number;
  expiringSoon: number;
  unused: number;
}

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

export interface AppIcon {
  url: string;
  path: string;
  fileName: string;
  contentType: string;
  size: number;
  updatedAt: number | null;
}
