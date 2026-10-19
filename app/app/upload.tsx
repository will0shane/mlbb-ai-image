import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  FlatList,
  StyleSheet,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useAppStore } from "../src/store";
import { colors } from "../src/theme";
import { strings } from "../src/strings";

export default function UploadScreen() {
  const router = useRouter();
  const { verifyKey, clearScanResults } = useAppStore();
  const [images, setImages] = useState<string[]>([]);

  const handlePickImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission Required",
        "Permission to access your photo gallery is needed to select collection screenshots."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 0, // 0 means no limit
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uris = result.assets.map((a) => a.uri);
      setImages((prev) => [...prev, ...uris]);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStartScan = async () => {
    if (images.length === 0) {
      Alert.alert("No Images", "Please select at least one collection screenshot.");
      return;
    }

    // Must verify key before scanning
    const isValid = await verifyKey();
    if (!isValid) {
      Alert.alert("Access Denied", "Your key is no longer valid or in use on another device.");
      router.replace("/");
      return;
    }

    clearScanResults();
    // Navigate to scanning with image URIs
    router.push({
      pathname: "/scanning",
      params: { uris: JSON.stringify(images) },
    });
  };

  return (
    <View style={styles.container}>
      {/* Instructions Card */}
      <View style={styles.instructionsCard}>
        <Text style={styles.instructionsIcon}>📸</Text>
        <Text style={styles.instructionsTitle}>How to capture</Text>
        <Text style={styles.instructionsText}>
          {strings.upload.instructions}
        </Text>
      </View>

      {/* Image Selection Area */}
      <View style={styles.selectionHeader}>
        <Text style={styles.sectionTitle}>
          Screenshots ({images.length})
        </Text>
        <TouchableOpacity
          style={styles.addMoreButton}
          onPress={handlePickImages}
          activeOpacity={0.7}
        >
          <Text style={styles.addMoreButtonText}>+ Add Screenshots</Text>
        </TouchableOpacity>
      </View>

      {images.length === 0 ? (
        <TouchableOpacity
          style={styles.emptyContainer}
          onPress={handlePickImages}
          activeOpacity={0.7}
        >
          <View style={styles.emptyIconBadge}>
            <Text style={styles.emptyIcon}>🖼️</Text>
          </View>
          <Text style={styles.emptyTitle}>Select Collection Screenshots</Text>
          <Text style={styles.emptySubtitle}>
            Tap here to pick screenshots from your gallery (no limit)
          </Text>
        </TouchableOpacity>
      ) : (
        <FlatList
          data={images}
          keyExtractor={(item, index) => `${item}_${index}`}
          numColumns={3}
          contentContainerStyle={styles.grid}
          renderItem={({ item, index }) => (
            <View style={styles.thumbnailWrapper}>
              <Image source={{ uri: item }} style={styles.thumbnail} />
              <TouchableOpacity
                style={styles.removeBadge}
                onPress={() => handleRemoveImage(index)}
              >
                <Text style={styles.removeBadgeText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* Scan Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.scanButton,
            images.length === 0 && styles.scanButtonDisabled,
          ]}
          onPress={handleStartScan}
          disabled={images.length === 0}
          activeOpacity={0.8}
        >
          <Text style={styles.scanButtonText}>
            {strings.upload.scan} ({images.length} Image{images.length !== 1 ? "s" : ""})
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
    padding: 20,
    justifyContent: "space-between",
  },
  instructionsCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  instructionsIcon: {
    fontSize: 22,
    marginBottom: 6,
  },
  instructionsTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  instructionsText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  selectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  addMoreButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addMoreButtonText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "700",
  },
  emptyContainer: {
    flex: 1,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: "dashed",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: colors.surface + "40",
    marginBottom: 20,
  },
  emptyIconBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyIcon: {
    fontSize: 28,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptySubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: "center",
  },
  grid: {
    paddingBottom: 16,
  },
  thumbnailWrapper: {
    flex: 1 / 3,
    aspectRatio: 9 / 16,
    margin: 4,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    backgroundColor: colors.surface,
  },
  thumbnail: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  removeBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  removeBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  footer: {
    paddingTop: 12,
  },
  scanButton: {
    width: "100%",
    height: 54,
    backgroundColor: colors.accent,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  scanButtonDisabled: {
    backgroundColor: colors.surface,
    shadowOpacity: 0,
    elevation: 0,
  },
  scanButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: "800",
  },
});
