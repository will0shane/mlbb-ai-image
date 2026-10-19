/**
 * Text normalization for OCR matching.
 *
 * Handles: lowercase, accent stripping, punctuation removal,
 * space collapsing, and OCR confusion map.
 */

/** OCR confusion map: common misreadings */
const OCR_CONFUSION: Record<string, string> = {
  "0": "o",
  "1": "l",
  "|": "l",
  "!": "l",
  "@": "a",
  "$": "s",
  "5": "s",
  "8": "b",
};

/**
 * Normalize a string for fuzzy matching.
 * - Lowercase
 * - Strip accents
 * - Apply OCR confusion map
 * - Remove punctuation
 * - Collapse whitespace
 */
export function normalize(input: string): string {
  let result = input.toLowerCase();

  // Strip accents (NFD decomposition + strip combining marks)
  result = result.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Apply OCR confusion map
  result = result
    .split("")
    .map((ch) => OCR_CONFUSION[ch] ?? ch)
    .join("");

  // Remove punctuation except spaces
  result = result.replace(/[^\w\s]/g, "");

  // Collapse whitespace
  result = result.replace(/\s+/g, " ").trim();

  return result;
}

/**
 * Levenshtein distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[m][n];
}

/**
 * Levenshtein similarity ratio (0 to 1).
 * 1.0 = exact match, 0.0 = completely different.
 */
export function similarityRatio(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(a, b) / maxLen;
}
