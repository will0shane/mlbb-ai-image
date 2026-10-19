import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import { useAppStore } from "../src/store";
import { colors } from "../src/theme";
import { strings } from "../src/strings";
import { RecognizedSkin } from "../src/types";
import { generateCollage } from "../src/collage-generator";

export default function ReviewScreen() {
  const router = useRouter();
  const {
    recognizedSkins,
    unmatchedCards,
    removeSkin,
    setUnmatchedCards,
    collageConfig,
    verifyKey,
  } = useAppStore();

  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState({ loaded: 0, total: recognizedSkins.length });

  // Icon loader for collage generator
  const loadIcon = async (iconPath: string) => {
    try {
      let SkiaRef: any = null;
      try {
        SkiaRef = require("@shopify/react-native-skia").Skia;
      } catch {
        // Skia not available in Expo Go sandbox
      }
      if (!SkiaRef?.Image) return null;

      const localPath = `${FileSystem.cacheDirectory}${iconPath.replace(/\//g, "_")}`;
      const info = await FileSystem.getInfoAsync(localPath);
      let uri = localPath;
      if (!info.exists) {
        uri = `https://storage.googleapis.com/mlbb-collage.appspot.com/data/${iconPath}`;
      }
      const data = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return SkiaRef.Image.MakeImageFromEncoded(SkiaRef.Data.fromBase64(data));
    } catch {
      return null;
    }
  };

  const handleAskGenerate = () => {
    if (recognizedSkins.length === 0) {
      Alert.alert("No Skins Detected", "Please upload screenshots that show your owned skins.");
      return;
    }

    Alert.alert(
      "Generate Collage Picture",
      `Would you like to generate your skin collage picture with all ${recognizedSkins.length} recognized skins now?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "✨ Generate Picture",
          style: "default",
          onPress: executeGenerate,
        },
      ]
    );
  };

  const executeGenerate = async () => {
    // Verify subscription key before generating
    const isValid = await verifyKey();
    if (!isValid) {
      Alert.alert(
        "Subscription Required",
        "Your license key is not active. Please enter an active product key to generate the collage picture."
      );
      router.replace("/");
      return;
    }

    setGenerating(true);
    try {
      const pagePaths = await generateCollage(
        recognizedSkins,
        collageConfig,
        loadIcon,
        (loaded, total) => {
          setGenProgress({ loaded, total });
        }
      );

      setGenerating(false);
      router.push({
        pathname: "/result",
        params: { paths: JSON.stringify(pagePaths) },
      });
    } catch (err: any) {
      setGenerating(false);
      Alert.alert("Generation Error", err.message || "Failed to generate collage picture.");
    }
  };

  const handleRemoveUnmatched = (index: number) => {
    const updated = unmatchedCards.filter((_, i) => i !== index);
    setUnmatchedCards(updated);
  };

  const matchedCount = recognizedSkins.length;
  const unmatchedCount = unmatchedCards.length;

  return (
    <View style={styles.container}>
      {/* Header Banner */}
      <View style={styles.headerBanner}>
        <View style={styles.headerTextGroup}>
          <Text style={styles.headerTitle}>Recognized Skins</Text>
          <Text style={styles.headerSubtitle}>
            {matchedCount} skins detected from screenshots
          </Text>
        </View>

        <View style={styles.totalBadge}>
          <Text style={styles.totalBadgeNumber}>{matchedCount}</Text>
          <Text style={styles.totalBadgeLabel}>Skins</Text>
        </View>
      </View>

      {/* Main Skins List */}
      <FlatList
        data={recognizedSkins}
        keyExtractor={(item, index) => `${item.skinId}_${index}`}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          unmatchedCount > 0 ? (
            <View style={styles.unmatchedSection}>
              <View style={styles.unmatchedHeaderRow}>
                <Text style={styles.unmatchedTitle}>
                  ⚠️ Unmatched OCR Cards ({unmatchedCount})
                </Text>
                <TouchableOpacity
                  onPress={() => setUnmatchedCards([])}
                  style={styles.clearUnmatchedButton}
                >
                  <Text style={styles.clearUnmatchedText}>Dismiss All</Text>
                </TouchableOpacity>
              </View>

              {unmatchedCards.map((card, idx) => (
                <View key={`unmatched_${idx}`} style={styles.unmatchedRow}>
                  <Text style={styles.unmatchedText}>
                    "{card.ocrHeroText} - {card.ocrSkinText}"
                  </Text>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleRemoveUnmatched(idx)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.deleteBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : null
        }
        renderItem={({ item, index }) => (
          <View style={styles.skinCard}>
            <View style={styles.skinIndexBadge}>
              <Text style={styles.skinIndexText}>{index + 1}</Text>
            </View>

            <View style={styles.skinInfo}>
              <Text style={styles.skinHero}>{item.hero}</Text>
              <Text style={styles.skinName}>{item.skin}</Text>
            </View>

            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => removeSkin(item.skinId)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.deleteBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyTitle}>No Skins Detected</Text>
            <Text style={styles.emptyText}>
              Go back and upload clearer screenshots from your Owned Skins collection.
            </Text>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backButtonText}>← Upload Again</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Bottom Footer: Ask to Generate Picture */}
      {matchedCount > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.generateButton}
            onPress={handleAskGenerate}
            activeOpacity={0.8}
          >
            <Text style={styles.generateButtonText}>
              🎨 Generate Picture ({matchedCount} Skins)
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Generating Progress Modal */}
      <Modal visible={generating} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.modalTitle}>Generating Collage Picture...</Text>
            <Text style={styles.modalSubtext}>
              Rendering {matchedCount} skins in high quality
            </Text>
            {genProgress.total > 0 && (
              <Text style={styles.modalProgress}>
                Processing {genProgress.loaded} of {genProgress.total}
              </Text>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTextGroup: {
    flex: 1,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "800",
  },
  headerSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  totalBadge: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignItems: "center",
  },
  totalBadgeNumber: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: "900",
  },
  totalBadgeLabel: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  skinCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skinIndexBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skinIndexText: {
    color: colors.textDisabled,
    fontSize: 11,
    fontWeight: "700",
  },
  skinInfo: {
    flex: 1,
  },
  skinHero: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
  },
  skinName: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 1,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteBtnText: {
    color: "#EF4444",
    fontSize: 13,
    fontWeight: "800",
  },
  unmatchedSection: {
    backgroundColor: "rgba(245, 158, 11, 0.08)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.25)",
  },
  unmatchedHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  unmatchedTitle: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  clearUnmatchedButton: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  clearUnmatchedText: {
    color: colors.textDisabled,
    fontSize: 11,
    textDecorationLine: "underline",
  },
  unmatchedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  unmatchedText: {
    color: colors.textSecondary,
    fontSize: 12,
    flex: 1,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  generateButton: {
    height: 52,
    backgroundColor: colors.accent,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  generateButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  backButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backButtonText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "700",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalBox: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    width: "100%",
    maxWidth: 320,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "800",
    marginTop: 18,
    textAlign: "center",
  },
  modalSubtext: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 6,
    textAlign: "center",
  },
  modalProgress: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 10,
  },
});
