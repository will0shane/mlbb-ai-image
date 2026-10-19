import { calculateLayout } from "../src/collage-generator";
import { RecognizedSkin, CollageConfig } from "../src/types";

// Mock @shopify/react-native-skia & expo-file-system
jest.mock("@shopify/react-native-skia", () => ({
  Skia: {},
}));
jest.mock("expo-file-system", () => ({
  cacheDirectory: "/mock/cache/",
}));

const mockConfig: CollageConfig = {
  username: "ProGamer",
  server: "1234",
  showTotalCount: true,
  showTierCounts: true,
  columns: 16,
  theme: "dark",
};

function createMockSkins(count: number, tier: number): RecognizedSkin[] {
  return Array.from({ length: count }, (_, i) => ({
    skinId: `hero_${tier}__skin_${i}`,
    hero: `Hero_${String.fromCharCode(65 + (i % 26))}`,
    skin: `Skin_${i}`,
    tier,
    icon: `icons/${tier}/Hero__Skin_${i}.webp`,
    confidence: "high",
    ocrHeroText: `Hero`,
    ocrSkinText: `Skin`,
  }));
}

describe("collage-generator calculateLayout", () => {
  it("sorts tier sections in exact order: 4000, 3000, 2000, 500, 400, 200, 100", () => {
    const skins: RecognizedSkin[] = [
      ...createMockSkins(2, 100),
      ...createMockSkins(2, 4000),
      ...createMockSkins(2, 500),
      ...createMockSkins(2, 2000),
    ];

    const layout = calculateLayout(skins, mockConfig);
    const tiers = layout.sections.map((s) => s.tier);

    expect(tiers).toEqual([4000, 2000, 500, 100]);
  });

  it("skips empty tiers", () => {
    const skins: RecognizedSkin[] = [...createMockSkins(5, 3000)];
    const layout = calculateLayout(skins, mockConfig);

    expect(layout.sections.length).toBe(1);
    expect(layout.sections[0].tier).toBe(3000);
  });

  it("sorts heroes alphabetically within each tier", () => {
    const skins: RecognizedSkin[] = [
      {
        skinId: "z_hero__skin",
        hero: "Zilong",
        skin: "Glorious General",
        tier: 4000,
        icon: "",
        confidence: "high",
        ocrHeroText: "Zilong",
        ocrSkinText: "Glorious General",
      },
      {
        skinId: "a_hero__skin",
        hero: "Alucard",
        skin: "Obsidian Blade",
        tier: 4000,
        icon: "",
        confidence: "high",
        ocrHeroText: "Alucard",
        ocrSkinText: "Obsidian Blade",
      },
    ];

    const layout = calculateLayout(skins, mockConfig);
    const heroes = layout.sections[0].skins.map((s) => s.hero);
    expect(heroes).toEqual(["Alucard", "Zilong"]);
  });

  it("computes width based on columns and icon size", () => {
    // outerPadding 40, iconSize 160, gap 8
    // width = 40*2 + 16*160 + 15*8 = 80 + 2560 + 120 = 2760
    const skins = createMockSkins(10, 4000);
    const layout = calculateLayout(skins, { ...mockConfig, columns: 16 });
    expect(layout.width).toBe(2760);
  });

  it("splits into multiple pages if total height exceeds maxHeight (8192px)", () => {
    // 800 skins across tiers
    const largeCollection: RecognizedSkin[] = [
      ...createMockSkins(200, 4000),
      ...createMockSkins(200, 3000),
      ...createMockSkins(200, 2000),
      ...createMockSkins(200, 100),
    ];

    const layout = calculateLayout(largeCollection, mockConfig);
    expect(layout.pages.length).toBeGreaterThan(1);
  });
});
