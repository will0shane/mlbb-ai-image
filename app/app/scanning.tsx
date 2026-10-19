import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Image,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAppStore } from "../src/store";
import { scanScreenshot } from "../src/scanner";
import { SkinMatcher } from "../src/matcher";
import { colors } from "../src/theme";
import { strings } from "../src/strings";

export default function ScanningScreen() {
  const router = useRouter();
  const { uris: rawUris } = useLocalSearchParams<{ uris: string }>();
  const {
    manifest,
    setRecognizedSkins,
    setUnmatchedCards,
  } = useAppStore();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalImages, setTotalImages] = useState(0);
  const [runningCount, setRunningCount] = useState(0);
  const isCancelled = useRef(false);

  useEffect(() => {
    async function processAllImages() {
      if (!rawUris) {
        router.replace("/upload");
        return;
      }

      const uris: string[] = JSON.parse(rawUris);
      setTotalImages(uris.length);

      const allCards: Array<{ heroText: string; skinText: string }> = [];
      const matcher = new SkinMatcher(manifest?.skins || []);

      for (let i = 0; i < uris.length; i++) {
        if (isCancelled.current) return;
        setCurrentIndex(i + 1);

        const uri = uris[i];

        try {
          // Get image dimensions
          const dimensions = await new Promise<{ width: number; height: number }>(
            (resolve) => {
              Image.getSize(
                uri,
                (width, height) => resolve({ width, height }),
                () => resolve({ width: 1080, height: 2400 }) // fallback standard mobile res
              );
            }
          );

          const scanRes = await scanScreenshot(uri, dimensions.width, dimensions.height);
          allCards.push(...scanRes.cards);

          // Update running matched count
          const currentMatches = matcher.matchAll(allCards);
          setRunningCount(currentMatches.matched.length);
        } catch (err) {
          console.warn(`Failed scanning image ${i + 1}:`, err);
        }
      }

      // Finish matching and deduplicating
      const finalResult = matcher.matchAll(allCards);
      setRecognizedSkins(finalResult.matched);
      setUnmatchedCards(finalResult.unmatched);

      // Route to review screen
      router.replace("/review");
    }

    processAllImages();

    return () => {
      isCancelled.current = true;
    };
  }, [rawUris, manifest, setRecognizedSkins, setUnmatchedCards, router]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Text style={styles.scannerIcon}>🔍</Text>
        </View>

        <Text style={styles.title}>Analyzing Screenshots</Text>

        <Text style={styles.progressText}>
          {strings.upload.scanProgress(currentIndex, totalImages || 1)}
        </Text>

        <ActivityIndicator
          size="large"
          color={colors.accent}
          style={styles.spinner}
        />

        <View style={styles.counterBadge}>
          <Text style={styles.counterText}>
            {strings.upload.recognized(runningCount)}
          </Text>
        </View>

        <Text style={styles.tipText}>
          Detecting cards, reading hero and skin names, and matching database tiers...
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  content: {
    alignItems: "center",
    width: "100%",
  },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  scannerIcon: {
    fontSize: 36,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  progressText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: "600",
  },
  spinner: {
    marginVertical: 28,
  },
  counterBadge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.accent + "60",
    marginBottom: 20,
  },
  counterText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: "800",
  },
  tipText: {
    color: colors.textDisabled,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 16,
  },
});
