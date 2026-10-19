import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Dimensions,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import { colors } from "../src/theme";
import { strings } from "../src/strings";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function ResultScreen() {
  const router = useRouter();
  const { paths: rawPaths } = useLocalSearchParams<{ paths: string }>();
  const pagePaths: string[] = rawPaths ? JSON.parse(rawPaths) : [];

  const [activePageIndex, setActivePageIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  const currentPath = pagePaths[activePageIndex] || pagePaths[0];

  const handleSaveToGallery = async () => {
    if (!currentPath) return;

    try {
      setSaving(true);
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Media library access is needed to save the image to your gallery."
        );
        return;
      }

      for (const path of pagePaths) {
        await MediaLibrary.saveToLibraryAsync(path);
      }

      Alert.alert(
        "Saved Successfully!",
        pagePaths.length > 1
          ? `All ${pagePaths.length} pages have been saved to your photo gallery.`
          : "Your skin collage image has been saved to your photo gallery."
      );
    } catch (err: any) {
      Alert.alert("Save Failed", err.message || "Failed to save image.");
    } finally {
      setSaving(false);
    }
  };

  const handleShareFile = async () => {
    if (!currentPath) return;

    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert("Sharing Unavailable", "Sharing is not available on this device.");
        return;
      }

      await Sharing.shareAsync(currentPath, {
        mimeType: "image/png",
        dialogTitle: "Share MLBB Skin Collage",
      });
    } catch (err: any) {
      Alert.alert("Share Failed", err.message || "Failed to share image.");
    }
  };

  return (
    <View style={styles.container}>
      {/* Page Selector (if multiple pages generated for large collections) */}
      {pagePaths.length > 1 && (
        <View style={styles.pageSelector}>
          {pagePaths.map((_, idx) => (
            <TouchableOpacity
              key={idx}
              style={[
                styles.pageBadge,
                activePageIndex === idx && styles.pageBadgeActive,
              ]}
              onPress={() => setActivePageIndex(idx)}
            >
              <Text
                style={[
                  styles.pageBadgeText,
                  activePageIndex === idx && styles.pageBadgeTextActive,
                ]}
              >
                Page {idx + 1}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Image Preview Area */}
      <ScrollView
        style={styles.previewScroll}
        contentContainerStyle={styles.previewContainer}
        maximumZoomScale={3}
        minimumZoomScale={1}
      >
        {currentPath ? (
          <Image
            source={{ uri: currentPath }}
            style={styles.previewImage}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No image available</Text>
          </View>
        )}
      </ScrollView>

      {/* WhatsApp Quality Compression Tip */}
      <View style={styles.noteBanner}>
        <Text style={styles.noteIcon}>💡</Text>
        <Text style={styles.noteText}>{strings.result.shareNote}</Text>
      </View>

      {/* Actions */}
      <View style={styles.footer}>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.saveButton]}
            onPress={handleSaveToGallery}
            disabled={saving}
            activeOpacity={0.8}
          >
            <Text style={styles.saveButtonText}>
              {saving ? "Saving..." : strings.result.saveGallery}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.shareButton]}
            onPress={handleShareFile}
            activeOpacity={0.8}
          >
            <Text style={styles.shareButtonText}>{strings.result.share}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.regenerateButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={styles.regenerateButtonText}>
            {strings.result.regenerate}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  pageSelector: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 10,
    backgroundColor: colors.surface,
    gap: 8,
  },
  pageBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pageBadgeActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  pageBadgeText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  pageBadgeTextActive: {
    color: colors.background,
  },
  previewScroll: {
    flex: 1,
  },
  previewContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 12,
  },
  previewImage: {
    width: SCREEN_WIDTH - 24,
    height: 480,
    borderRadius: 12,
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  noteBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  noteIcon: {
    fontSize: 16,
  },
  noteText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  footer: {
    padding: 16,
    paddingBottom: 24,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 10,
  },
  actionButton: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  saveButton: {
    backgroundColor: colors.accent,
  },
  saveButtonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: "800",
  },
  shareButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  shareButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  regenerateButton: {
    alignItems: "center",
    paddingVertical: 10,
  },
  regenerateButtonText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
});
