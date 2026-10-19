/**
 * Skin matcher: matches OCR text against the skin database.
 *
 * Strategy:
 * 1. Match heroText against unique hero names (Fuse.js, threshold ~0.3)
 * 2. Within that hero's skins, match skinText (similarity >= 0.80)
 * 3. Fallback: match combined "hero skin" across all skins (>= 0.85, gap >= 0.05)
 * 4. Otherwise: unmatched with top 3 suggestions
 */
import Fuse from "fuse.js";
import { normalize, similarityRatio } from "./normalizer";
import type { SkinEntry, RecognizedSkin, UnmatchedCard } from "./types";

interface MatchResult {
  matched: RecognizedSkin[];
  unmatched: UnmatchedCard[];
}

export class SkinMatcher {
  private skins: SkinEntry[];
  private heroFuse: Fuse<{ name: string }>;
  private skinsByHero: Map<string, SkinEntry[]>;
  private allFuse: Fuse<SkinEntry>;
  private normalizedHeroes: Map<string, string>; // normalized -> original
  private normalizedSkins: Map<string, string>; // normalized combo -> skin id

  constructor(skins: SkinEntry[]) {
    this.skins = skins;

    // Build unique hero list
    const heroNames = [...new Set(skins.map((s) => s.hero))];
    this.heroFuse = new Fuse(
      heroNames.map((name) => ({ name })),
      { keys: ["name"], threshold: 0.3, includeScore: true }
    );

    // Group skins by hero
    this.skinsByHero = new Map();
    for (const skin of skins) {
      const heroLower = skin.hero.toLowerCase();
      if (!this.skinsByHero.has(heroLower)) {
        this.skinsByHero.set(heroLower, []);
      }
      this.skinsByHero.get(heroLower)!.push(skin);
    }

    // Build fuse for all skins (combined hero + skin name)
    this.allFuse = new Fuse(skins, {
      keys: [
        { name: "hero", weight: 0.4 },
        { name: "skin", weight: 0.6 },
      ],
      threshold: 0.4,
      includeScore: true,
    });

    // Normalized lookup maps
    this.normalizedHeroes = new Map();
    for (const name of heroNames) {
      this.normalizedHeroes.set(normalize(name), name);
    }

    this.normalizedSkins = new Map();
    for (const skin of skins) {
      const key = normalize(`${skin.hero} ${skin.skin}`);
      this.normalizedSkins.set(key, skin.id);
    }
  }

  /**
   * Match a single OCR card (heroText + skinText) against the database.
   */
  matchCard(
    heroText: string,
    skinText: string
  ): { skin: RecognizedSkin | null; unmatched: UnmatchedCard | null } {
    const normHero = normalize(heroText);
    const normSkin = normalize(skinText);

    // Step 1: Match hero
    const heroResults = this.heroFuse.search(heroText);
    if (heroResults.length > 0 && (heroResults[0].score ?? 1) < 0.4) {
      const matchedHero = heroResults[0].item.name;
      const heroSkins = this.skinsByHero.get(matchedHero.toLowerCase()) || [];

      // Step 2: Match skin within this hero's skins
      let bestSkin: SkinEntry | null = null;
      let bestRatio = 0;

      for (const entry of heroSkins) {
        const ratio = similarityRatio(normSkin, normalize(entry.skin));
        if (ratio > bestRatio) {
          bestRatio = ratio;
          bestSkin = entry;
        }
      }

      if (bestSkin && bestRatio >= 0.8) {
        const confidence =
          bestRatio >= 0.9 ? "high" : bestRatio >= 0.8 ? "medium" : "low";
        return {
          skin: {
            skinId: bestSkin.id,
            hero: bestSkin.hero,
            skin: bestSkin.skin,
            tier: bestSkin.tier,
            icon: bestSkin.icon,
            confidence,
            ocrHeroText: heroText,
            ocrSkinText: skinText,
          },
          unmatched: null,
        };
      }
    }

    // Step 3: Fallback — match combined string across all skins
    const combined = `${heroText} ${skinText}`;
    const normCombined = normalize(combined);

    const allResults: Array<{ skin: SkinEntry; ratio: number }> = [];
    for (const entry of this.skins) {
      const entryNorm = normalize(`${entry.hero} ${entry.skin}`);
      const ratio = similarityRatio(normCombined, entryNorm);
      allResults.push({ skin: entry, ratio });
    }

    allResults.sort((a, b) => b.ratio - a.ratio);

    if (
      allResults.length > 0 &&
      allResults[0].ratio >= 0.85 &&
      (allResults.length === 1 || allResults[0].ratio - allResults[1].ratio >= 0.05)
    ) {
      const best = allResults[0];
      return {
        skin: {
          skinId: best.skin.id,
          hero: best.skin.hero,
          skin: best.skin.skin,
          tier: best.skin.tier,
          icon: best.skin.icon,
          confidence: best.ratio >= 0.9 ? "high" : "medium",
          ocrHeroText: heroText,
          ocrSkinText: skinText,
        },
        unmatched: null,
      };
    }

    // Step 4: Unmatched — return top 3 suggestions
    const suggestions = allResults.slice(0, 3).map((r) => r.skin);
    return {
      skin: null,
      unmatched: {
        ocrHeroText: heroText,
        ocrSkinText: skinText,
        suggestions,
      },
    };
  }

  /**
   * Match multiple cards and deduplicate by skin ID.
   */
  matchAll(
    cards: Array<{ heroText: string; skinText: string }>
  ): MatchResult {
    const matched: RecognizedSkin[] = [];
    const unmatched: UnmatchedCard[] = [];
    const seenIds = new Set<string>();

    for (const card of cards) {
      const result = this.matchCard(card.heroText, card.skinText);

      if (result.skin) {
        // Deduplicate by skin ID
        if (!seenIds.has(result.skin.skinId)) {
          seenIds.add(result.skin.skinId);
          matched.push(result.skin);
        }
      } else if (result.unmatched) {
        unmatched.push(result.unmatched);
      }
    }

    // Sort matched by tier descending, then hero, then skin
    matched.sort((a, b) => {
      if (a.tier !== b.tier) return b.tier - a.tier;
      if (a.hero !== b.hero) return a.hero.localeCompare(b.hero);
      return a.skin.localeCompare(b.skin);
    });

    return { matched, unmatched };
  }
}
