import { SkinMatcher } from "../src/matcher";
import { SkinEntry } from "../src/types";

const mockSkins: SkinEntry[] = [
  {
    id: "claude__cosmic_blaze",
    hero: "Claude",
    skin: "Cosmic Blaze",
    tier: 3000,
    icon: "icons/3000/Claude__Cosmic_Blaze.webp",
  },
  {
    id: "claude__mecha_dragon",
    hero: "Claude",
    skin: "Mecha Dragon",
    tier: 2000,
    icon: "icons/2000/Claude__Mecha_Dragon.webp",
  },
  {
    id: "gusion__cosmic_gleam",
    hero: "Gusion",
    skin: "Cosmic Gleam",
    tier: 4000,
    icon: "icons/4000/Gusion__Cosmic_Gleam.webp",
  },
  {
    id: "layla__cannon_and_roses",
    hero: "Layla",
    skin: "Cannon and Roses",
    tier: 400,
    icon: "icons/400/Layla__Cannon_and_Roses.webp",
  },
  {
    id: "tigreal__lightborn_defender",
    hero: "Tigreal",
    skin: "Lightborn Defender",
    tier: 2000,
    icon: "icons/2000/Tigreal__Lightborn_Defender.webp",
  },
];

describe("SkinMatcher", () => {
  let matcher: SkinMatcher;

  beforeEach(() => {
    matcher = new SkinMatcher(mockSkins);
  });

  describe("matchCard", () => {
    it("matches exact hero and skin name with high confidence", () => {
      const res = matcher.matchCard("Claude", "Cosmic Blaze");
      expect(res.skin).not.toBeNull();
      expect(res.skin?.skinId).toBe("claude__cosmic_blaze");
      expect(res.skin?.confidence).toBe("high");
      expect(res.unmatched).toBeNull();
    });

    it("matches with minor OCR typos in skin name", () => {
      const res = matcher.matchCard("Claude", "Cosmic Bloze");
      expect(res.skin).not.toBeNull();
      expect(res.skin?.skinId).toBe("claude__cosmic_blaze");
    });

    it("matches with minor OCR typos in hero name", () => {
      const res = matcher.matchCard("Cloude", "Cosmic Blaze");
      expect(res.skin).not.toBeNull();
      expect(res.skin?.skinId).toBe("claude__cosmic_blaze");
    });

    it("correctly distinguishes between two heroes with similar skin names", () => {
      const claudeRes = matcher.matchCard("Claude", "Cosmic Blaze");
      const gusionRes = matcher.matchCard("Gusion", "Cosmic Gleam");

      expect(claudeRes.skin?.skinId).toBe("claude__cosmic_blaze");
      expect(gusionRes.skin?.skinId).toBe("gusion__cosmic_gleam");
    });

    it("marks card unmatched and provides top suggestions if completely unknown", () => {
      const res = matcher.matchCard("UnknownHeroXYZ", "UnknownSkinABC");
      expect(res.skin).toBeNull();
      expect(res.unmatched).not.toBeNull();
      expect(res.unmatched?.ocrHeroText).toBe("UnknownHeroXYZ");
      expect(res.unmatched?.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe("deduplication across multiple screenshots", () => {
    it("deduplicates identical skins seen across multiple cards", () => {
      const cards = [
        { heroText: "Claude", skinText: "Cosmic Blaze" },
        { heroText: "Claude", skinText: "Cosmic Blaze" }, // Duplicate from overlapping screenshot
        { heroText: "Gusion", skinText: "Cosmic Gleam" },
      ];

      const res = matcher.matchAll(cards);
      expect(res.matched.length).toBe(2);
      const skinIds = res.matched.map((s) => s.skinId);
      expect(skinIds).toContain("claude__cosmic_blaze");
      expect(skinIds).toContain("gusion__cosmic_gleam");
    });
  });
});
