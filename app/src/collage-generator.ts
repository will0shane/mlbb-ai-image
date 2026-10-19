/**
 * Collage image generator using @shopify/react-native-skia.
 *
 * Renders an offscreen Skia surface with header, tier sections,
 * and skin icons. Supports page splitting for large collections.
 */
import "./polyfill";
import type {
  SkImage,
  SkCanvas,
  SkPaint,
  SkFont,
  SkSurface,
} from "@shopify/react-native-skia";
import * as FileSystem from "expo-file-system/legacy";
import { colors } from "./theme";
import type { RecognizedSkin, CollageConfig } from "./types";

// Safely resolve Skia runtime
let Skia: any = null;
let ClipOp: any = null;
try {
  const skiaPkg = require("@shopify/react-native-skia");
  Skia = skiaPkg.Skia;
  ClipOp = skiaPkg.ClipOp;
} catch {
  // Not available in standard Expo Go sandbox
}

/** Collage layout constants */
const DEFAULTS = {
  iconSize: 160,
  gap: 8,
  outerPadding: 40,
  headerHeight: 400,
  tierBarHeight: 80,
  maxHeight: 8192,
  cornerRadius: 8,
  borderWidth: 2,
};

/** Tier display order */
const TIER_ORDER = [4000, 3000, 2000, 500, 400, 200, 100];

/** Background colors by theme */
const BG_COLORS = {
  dark: "#0B1220",
  light: "#F0F2F5",
};

const TEXT_COLORS = {
  dark: "#FFFFFF",
  light: "#1A1A2E",
};

interface TierSection {
  tier: number;
  skins: RecognizedSkin[];
  rows: number;
  height: number;
}

interface LayoutInfo {
  width: number;
  totalHeight: number;
  sections: TierSection[];
  pages: TierSection[][];
}

/**
 * Calculate the layout dimensions for a collage.
 */
export function calculateLayout(
  skins: RecognizedSkin[],
  config: CollageConfig
): LayoutInfo {
  const { iconSize, gap, outerPadding, headerHeight, tierBarHeight, maxHeight } = DEFAULTS;
  const cols = config.columns;
  const width = outerPadding * 2 + cols * iconSize + (cols - 1) * gap;

  // Group skins by tier
  const skinsByTier = new Map<number, RecognizedSkin[]>();
  for (const skin of skins) {
    if (!skinsByTier.has(skin.tier)) {
      skinsByTier.set(skin.tier, []);
    }
    skinsByTier.get(skin.tier)!.push(skin);
  }

  // Sort within each tier by hero name, then skin name
  for (const [_, tierSkins] of skinsByTier) {
    tierSkins.sort((a, b) => {
      if (a.hero !== b.hero) return a.hero.localeCompare(b.hero);
      return a.skin.localeCompare(b.skin);
    });
  }

  // Build sections in tier order
  const sections: TierSection[] = [];
  for (const tier of TIER_ORDER) {
    const tierSkins = skinsByTier.get(tier);
    if (!tierSkins || tierSkins.length === 0) continue;

    const rows = Math.ceil(tierSkins.length / cols);
    const height = tierBarHeight + rows * (iconSize + gap);
    sections.push({ tier, skins: tierSkins, rows, height });
  }

  // Total height
  let totalHeight = headerHeight + outerPadding;
  for (const section of sections) {
    totalHeight += section.height;
  }
  totalHeight += outerPadding; // footer padding

  // Page splitting if needed
  const pages: TierSection[][] = [];
  if (totalHeight <= maxHeight) {
    pages.push(sections);
  } else {
    let currentPage: TierSection[] = [];
    let currentHeight = headerHeight + outerPadding;

    for (const section of sections) {
      if (currentHeight + section.height > maxHeight && currentPage.length > 0) {
        pages.push(currentPage);
        currentPage = [];
        currentHeight = headerHeight + outerPadding; // Each page gets header
      }
      currentPage.push(section);
      currentHeight += section.height;
    }
    if (currentPage.length > 0) {
      pages.push(currentPage);
    }
  }

  return { width, totalHeight, sections, pages };
}

/**
 * Render a single page of the collage.
 *
 * Returns the path to the saved PNG file.
 */
export async function renderCollagePage(
  skins: RecognizedSkin[],
  config: CollageConfig,
  pageSections: TierSection[],
  pageNum: number,
  totalPages: number,
  loadIcon: (iconPath: string) => Promise<SkImage | null>,
  onProgress?: (loaded: number, total: number) => void
): Promise<string> {
  const { iconSize, gap, outerPadding, headerHeight, tierBarHeight, cornerRadius, borderWidth } =
    DEFAULTS;
  const cols = config.columns;
  const width = outerPadding * 2 + cols * iconSize + (cols - 1) * gap;

  // Calculate page height
  let pageHeight = headerHeight + outerPadding;
  for (const section of pageSections) {
    pageHeight += section.height;
  }
  pageHeight += outerPadding;

  // Check if Skia native surface is available (Expo Go fallback)
  if (!Skia?.Surface?.MakeOffscreen) {
    // Write sample placeholder PNG for preview in Expo Go
    const samplePng = "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNk+M9QzwAEjDAGNTU0AgA41xP9gY3cWQAAAABJRU5ErkJggg==";
    const fileName = totalPages > 1
      ? `mlbb_collage_page${pageNum}.png`
      : "mlbb_collage.png";
    const filePath = `${FileSystem.cacheDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(filePath, samplePng, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return filePath;
  }

  // Create offscreen surface
  const surface = Skia.Surface.MakeOffscreen(width, pageHeight)!;
  const canvas = surface.getCanvas();

  // Background
  const bgPaint = Skia.Paint();
  bgPaint.setColor(Skia.Color(BG_COLORS[config.theme]));
  canvas.drawRect(Skia.XYWHRect(0, 0, width, pageHeight), bgPaint);

  // Header
  const textColor = Skia.Color(TEXT_COLORS[config.theme]);
  const goldColor = Skia.Color(colors.accent);

  const titlePaint = Skia.Paint();
  titlePaint.setColor(goldColor);

  const textPaint = Skia.Paint();
  textPaint.setColor(textColor);

  const subtitlePaint = Skia.Paint();
  subtitlePaint.setColor(Skia.Color(colors.textSecondary));

  // Draw header text
  let headerY = outerPadding + 60;

  // App name
  const titleFont = Skia.Font(undefined, 48);
  canvas.drawText("MLBB Skin Collage", outerPadding, headerY, titlePaint, titleFont);
  headerY += 60;

  // Username and server
  const infoFont = Skia.Font(undefined, 28);
  if (config.username) {
    canvas.drawText(config.username, outerPadding, headerY, textPaint, infoFont);
    headerY += 40;
  }
  if (config.server) {
    canvas.drawText(config.server, outerPadding, headerY, subtitlePaint, infoFont);
    headerY += 40;
  }

  // Counts
  const countFont = Skia.Font(undefined, 24);
  if (config.showTotalCount) {
    const totalSkins = skins.length;
    canvas.drawText(
      `Total Skins: ${totalSkins}`,
      outerPadding,
      headerY,
      textPaint,
      countFont
    );
    headerY += 35;
  }

  if (config.showTierCounts) {
    const tierCountPaint = Skia.Paint();
    let tierCountX = outerPadding;
    for (const tier of TIER_ORDER) {
      const count = skins.filter((s) => s.tier === tier).length;
      if (count === 0) continue;
      const tierColor = colors.tier[tier] || colors.text;
      tierCountPaint.setColor(Skia.Color(tierColor));
      const text = `${tier}: ${count}  `;
      canvas.drawText(text, tierCountX, headerY, tierCountPaint, countFont);
      tierCountX += countFont.measureText(text).width + 10;
    }
    headerY += 35;
  }

  // Page indicator
  if (totalPages > 1) {
    canvas.drawText(
      `Page ${pageNum} of ${totalPages}`,
      outerPadding,
      headerY,
      subtitlePaint,
      countFont
    );
  }

  // Draw tier sections
  let sectionY = headerHeight;
  let totalIcons = 0;
  for (const section of pageSections) {
    totalIcons += section.skins.length;
  }

  let loadedIcons = 0;

  for (const section of pageSections) {
    // Tier bar
    const tierColor = colors.tier[section.tier] || colors.accent;
    const barPaint = Skia.Paint();
    barPaint.setColor(Skia.Color(tierColor));
    barPaint.setAlphaf(0.2);

    canvas.drawRRect(
      Skia.RRectXY(
        Skia.XYWHRect(outerPadding, sectionY, width - outerPadding * 2, tierBarHeight - 10),
        8,
        8
      ),
      barPaint
    );

    // Tier label
    const barTextPaint = Skia.Paint();
    barTextPaint.setColor(Skia.Color(tierColor));
    const barFont = Skia.Font(undefined, 28);
    canvas.drawText(
      `${section.tier} pts · ${section.skins.length} skins`,
      outerPadding + 16,
      sectionY + tierBarHeight / 2 + 8,
      barTextPaint,
      barFont
    );

    sectionY += tierBarHeight;

    // Draw icons
    for (let i = 0; i < section.skins.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = outerPadding + col * (iconSize + gap);
      const y = sectionY + row * (iconSize + gap);

      const skin = section.skins[i];

      // Load and draw icon
      try {
        const icon = await loadIcon(skin.icon);
        if (icon) {
          // Draw rounded rect clip
          canvas.save();
          const rrect = Skia.RRectXY(
            Skia.XYWHRect(x, y, iconSize, iconSize),
            cornerRadius,
            cornerRadius
          );
          canvas.clipRRect(rrect, ClipOp.Intersect, true);

          const imgPaint = Skia.Paint();
          imgPaint.setAntiAlias(true);
          canvas.drawImageRect(
            icon,
            Skia.XYWHRect(0, 0, icon.width(), icon.height()),
            Skia.XYWHRect(x, y, iconSize, iconSize),
            imgPaint
          );

          canvas.restore();

          // Tier-colored border
          const borderPaint = Skia.Paint();
          borderPaint.setColor(Skia.Color(tierColor));
          borderPaint.setStyle(1); // Stroke
          borderPaint.setStrokeWidth(borderWidth);
          canvas.drawRRect(rrect, borderPaint);
        } else {
          // Placeholder for missing icon
          const placeholderPaint = Skia.Paint();
          placeholderPaint.setColor(Skia.Color(colors.surfaceLight));
          canvas.drawRRect(
            Skia.RRectXY(
              Skia.XYWHRect(x, y, iconSize, iconSize),
              cornerRadius,
              cornerRadius
            ),
            placeholderPaint
          );
        }
      } catch {
        // Draw placeholder on error
        const errorPaint = Skia.Paint();
        errorPaint.setColor(Skia.Color(colors.surfaceLight));
        canvas.drawRRect(
          Skia.RRectXY(
            Skia.XYWHRect(x, y, iconSize, iconSize),
            cornerRadius,
            cornerRadius
          ),
          errorPaint
        );
      }

      loadedIcons++;
      onProgress?.(loadedIcons, totalIcons);
    }

    sectionY += section.rows * (iconSize + gap);
  }

  // Footer disclaimer
  const disclaimerFont = Skia.Font(undefined, 14);
  const disclaimerPaint = Skia.Paint();
  disclaimerPaint.setColor(Skia.Color(colors.textMuted));
  canvas.drawText(
    "Not affiliated with or endorsed by Moonton",
    outerPadding,
    pageHeight - outerPadding / 2,
    disclaimerPaint,
    disclaimerFont
  );

  // Export to PNG
  const image = surface.makeImageSnapshot();
  const data = image.encodeToBase64();

  const fileName = totalPages > 1
    ? `mlbb_collage_page${pageNum}.png`
    : "mlbb_collage.png";
  const filePath = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(filePath, data, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return filePath;
}

/**
 * Generate the full collage (potentially multiple pages).
 */
export async function generateCollage(
  skins: RecognizedSkin[],
  config: CollageConfig,
  loadIcon: (iconPath: string) => Promise<SkImage | null>,
  onProgress?: (loaded: number, total: number) => void
): Promise<string[]> {
  const layout = calculateLayout(skins, config);
  const pages: string[] = [];

  for (let i = 0; i < layout.pages.length; i++) {
    const path = await renderCollagePage(
      skins,
      config,
      layout.pages[i],
      i + 1,
      layout.pages.length,
      loadIcon,
      onProgress
    );
    pages.push(path);
  }

  return pages;
}
