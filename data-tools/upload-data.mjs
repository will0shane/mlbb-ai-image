#!/usr/bin/env node

/**
 * upload-data.mjs
 *
 * Uploads skins.json and icons from dist-data/ to Firebase Storage under data/.
 *
 * Usage: node data-tools/upload-data.mjs
 *
 * Requires: GOOGLE_APPLICATION_CREDENTIALS or firebase login
 * Environment: FIREBASE_STORAGE_BUCKET (or reads from firebase.json)
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DIST_DIR = path.join(ROOT, "dist-data");
const MANIFEST_PATH = path.join(DIST_DIR, "skins.json");

async function main() {
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET;

  const app = initializeApp({
    credential: applicationDefault(),
    storageBucket: bucketName,
  });

  const bucket = getStorage(app).bucket();

  console.log("📤 Uploading skin data to Firebase Storage...");

  // Upload skins.json with short cache
  console.log("  Uploading skins.json...");
  await bucket.upload(MANIFEST_PATH, {
    destination: "data/skins.json",
    metadata: {
      contentType: "application/json",
      cacheControl: "public, max-age=300", // 5 minutes
    },
  });

  // Upload icons with long cache
  const iconsDir = path.join(DIST_DIR, "icons");
  const tiers = await fs.readdir(iconsDir);

  let count = 0;
  for (const tier of tiers) {
    const tierDir = path.join(iconsDir, tier);
    const stat = await fs.stat(tierDir);
    if (!stat.isDirectory()) continue;

    const files = await fs.readdir(tierDir);
    for (const file of files) {
      if (!file.endsWith(".webp")) continue;

      const localPath = path.join(tierDir, file);
      const storagePath = `data/icons/${tier}/${file}`;

      await bucket.upload(localPath, {
        destination: storagePath,
        metadata: {
          contentType: "image/webp",
          cacheControl: "public, max-age=31536000, immutable", // 1 year
        },
      });
      count++;
    }
    console.log(`  ✅ Tier ${tier}: uploaded`);
  }

  console.log(`\n✅ Upload complete: skins.json + ${count} icons.`);
}

main().catch((err) => {
  console.error("❌ Upload failed:", err);
  process.exit(1);
});
