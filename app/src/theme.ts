/** Design tokens for the app's dark gaming theme */
export const colors = {
  background: "#0B1220",
  surface: "#111B2E",
  surfaceLight: "#1A2540",
  accent: "#F5C451",
  accentDim: "#C49A30",
  text: "#FFFFFF",
  textPrimary: "#FFFFFF",
  textSecondary: "#8B9CC0",
  textMuted: "#5A6A8A",
  textDisabled: "#5A6A8A",
  error: "#EF4444",
  success: "#34D399",
  warning: "#F59E0B",
  border: "#1E2D4A",
  overlay: "rgba(0, 0, 0, 0.6)",

  // Tier colors
  tier: {
    4000: "#E5322D",
    3000: "#F59E0B",
    2000: "#D946A8",
    500: "#A78BFA",
    400: "#7C5CFF",
    200: "#38BDF8",
    100: "#34D399",
  } as Record<number, string>,
} as const;

export const tierColors = colors.tier;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  xxl: 28,
  display: 36,
} as const;
