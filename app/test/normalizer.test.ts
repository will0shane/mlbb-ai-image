import { normalize, levenshteinDistance, similarityRatio } from "../src/normalizer";

describe("normalizer", () => {
  describe("normalize", () => {
    it("lowercases and collapses extra whitespace", () => {
      expect(normalize("  Gusion   Cosmic  Gleam ")).toBe("gusion cosmic gleam");
    });

    it("strips accents and diacritics", () => {
      expect(normalize("Éudora Vívíd Sólár")).toBe("eudora vivid solar");
    });

    it("applies OCR confusion map characters", () => {
      // 0 -> o, 1 -> l, | -> l, ! -> l, @ -> a, $ -> s, 5 -> s, 8 -> b
      expect(normalize("C0sm1c")).toBe("cosmlc");
      expect(normalize("T|ger")).toBe("tlger");
      expect(normalize("B@ll")).toBe("ball");
      expect(normalize("$h!ne")).toBe("shlne");
      expect(normalize("5tar")).toBe("star");
      expect(normalize("8east")).toBe("beast");
    });

    it("removes punctuation characters", () => {
      expect(normalize("Layla: Cannon & Roses!")).toBe("layla cannon rosesl");
      expect(normalize("Chou - Dragon Boy #1")).toBe("chou dragon boy l");
    });
  });

  describe("levenshteinDistance", () => {
    it("returns 0 for identical strings", () => {
      expect(levenshteinDistance("claude", "claude")).toBe(0);
    });

    it("calculates correct distance for edits", () => {
      expect(levenshteinDistance("kitten", "sitting")).toBe(3);
      expect(levenshteinDistance("", "hero")).toBe(4);
      expect(levenshteinDistance("hero", "")).toBe(4);
    });
  });

  describe("similarityRatio", () => {
    it("returns 1 for exact match", () => {
      expect(similarityRatio("tigreal", "tigreal")).toBe(1);
    });

    it("returns ratio between 0 and 1 for partial matches", () => {
      const ratio = similarityRatio("cosmic blaze", "cosmic bloze");
      expect(ratio).toBeGreaterThan(0.9);
      expect(ratio).toBeLessThan(1);
    });

    it("returns 0 for completely disjoint strings", () => {
      expect(similarityRatio("abc", "xyz")).toBe(0);
    });
  });
});
