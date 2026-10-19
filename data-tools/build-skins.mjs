#!/usr/bin/env node

/**
 * build-skins.mjs
 *
 * Scans tier icon folders and produces:
 * - dist-data/skins.json (manifest)
 * - dist-data/icons/<tier>/<Hero__Skin_Name>.webp (resized 256x256)
 *
 * Usage: node data-tools/build-skins.mjs [--size 512]
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ICONS_DIR = path.join(ROOT, "icons");
const DIST_DIR = path.join(ROOT, "dist-data");
const MANIFEST_PATH = path.join(DIST_DIR, "skins.json");

const TIERS = [4000, 3000, 2000, 500, 400, 200, 100];
const VALID_EXTENSIONS = [".png", ".webp", ".jpg", ".jpeg"];

// Parse --size argument
const sizeArg = process.argv.indexOf("--size");
const ICON_SIZE = sizeArg !== -1 && process.argv[sizeArg + 1]
  ? parseInt(process.argv[sizeArg + 1], 10)
  : 256;

async function dirExists(dir) {
  try {
    const stat = await fs.stat(dir);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function main() {
  console.log(`🔨 Building skin database (icon size: ${ICON_SIZE}px)...`);

  // Try to load sharp, provide helpful message if not installed
  let sharp;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    console.error("❌ 'sharp' is required. Install it: npm install sharp");
    process.exit(1);
  }

  // Read previous version
  let previousVersion = 0;
  try {
    const prev = JSON.parse(await fs.readFile(MANIFEST_PATH, "utf8"));
    previousVersion = prev.version || 0;
  } catch {
    // No previous manifest
  }

  const skins = [];
  const seenIds = new Map(); // id -> tier folder path (for duplicate detection)
  const warnings = [];

  for (const tier of TIERS) {
    const tierDir = path.join(ICONS_DIR, String(tier));

    if (!(await dirExists(tierDir))) {
      console.log(`  ⏭️  Tier ${tier}: folder not found, skipping.`);
      continue;
    }

    const files = await fs.readdir(tierDir);
    const validFiles = files.filter((f) =>
      VALID_EXTENSIONS.includes(path.extname(f).toLowerCase())
    );

    if (validFiles.length === 0) {
      console.log(`  ⏭️  Tier ${tier}: empty folder, skipping.`);
      continue;
    }

    // Ensure output directory
    const outTierDir = path.join(DIST_DIR, "icons", String(tier));
    await fs.mkdir(outTierDir, { recursive: true });

    for (const file of validFiles) {
      const baseName = path.parse(file).name;

      // Validate format: Hero__Skin_Name
      if (!baseName.includes("__")) {
        warnings.push(
          `⚠️  Bad filename format (missing __): ${path.join(String(tier), file)}`
        );
        continue;
      }

      const [heroPart, skinPart] = baseName.split("__", 2);
      if (!heroPart || !skinPart) {
        warnings.push(
          `⚠️  Bad filename format (empty hero or skin): ${path.join(String(tier), file)}`
        );
        continue;
      }

      const hero = heroPart.replace(/_/g, " ");
      const skin = skinPart.replace(/_/g, " ");
      const id = baseName.toLowerCase();
      const outFileName = `${baseName}.webp`;
      const iconPath = `icons/${tier}/${outFileName}`;

      // Duplicate detection
      if (seenIds.has(id)) {
        console.error(
          `❌ Duplicate skin ID "${id}" found in tier ${tier} and tier ${seenIds.get(id)}. Fix before continuing.`
        );
        process.exit(1);
      }
      seenIds.set(id, tier);

      // Resize and convert to WebP
      const inputPath = path.join(tierDir, file);
      const outputPath = path.join(outTierDir, outFileName);

      await sharp(inputPath)
        .resize(ICON_SIZE, ICON_SIZE, { fit: "cover" })
        .webp({ lossless: true })
        .toFile(outputPath);

      skins.push({ id, hero, skin, tier, icon: iconPath });
    }

    console.log(`  ✅ Tier ${tier}: ${validFiles.length} skins processed.`);
  }

  // Print warnings
  for (const w of warnings) {
    console.log(w);
  }

  // Sort skins by tier descending, then hero, then skin
  skins.sort((a, b) => {
    if (a.tier !== b.tier) return b.tier - a.tier;
    if (a.hero !== b.hero) return a.hero.localeCompare(b.hero);
    return a.skin.localeCompare(b.skin);
  });

  // Write manifest
  const manifest = {
    version: previousVersion + 1,
    generatedAt: new Date().toISOString(),
    tiers: TIERS.filter((t) => skins.some((s) => s.tier === t)),
    skins,
  };

  await fs.mkdir(DIST_DIR, { recursive: true });
  await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf8");

  console.log(`\n✅ Built skins.json v${manifest.version} with ${skins.length} skins.`);
  console.log(`   Output: ${DIST_DIR}`);
}

main().catch((err) => {
  console.error("❌ Build failed:", err);
  process.exit(1);
});
