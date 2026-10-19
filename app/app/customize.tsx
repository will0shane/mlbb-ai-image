import "../src/polyfill";
import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { useRouter } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import { useAppStore } from "../src/store";
import { colors } from "../src/theme";
import { strings } from "../src/strings";
import { generateCollage } from "../src/collage-generator";

// Safely resolve Skia at runtime without crashing Expo Go route evaluation
let SkiaRef: any = null;
try {
  SkiaRef = require("@shopify/react-native-skia").Skia;
} catch {
  // Not available in standard Expo Go sandbox
}

export default function CustomizeScreen() {
  const router = useRouter();
  const {
    recognizedSkins,
    collageConfig,
    updateCollageConfig,
    verifyKey,
  } = useAppStore();

  const [username, setUsername] = useState(collageConfig.username);
  const [server, setServer] = useState(collageConfig.server);
  const serverInputRef = useRef<TextInput>(null);
  const [showTotal, setShowTotal] = useState(collageConfig.showTotalCount);
  const [showTier, setShowTier] = useState(collageConfig.showTierCounts);
  const [columns, setColumns] = useState(collageConfig.columns);
  const [theme, setTheme] = useState(collageConfig.theme);

  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ loaded: 0, total: recognizedSkins.length });

  // Icon loader from local cache or Firebase storage
  const loadIcon = async (iconPath: string) => {
    try {
      if (!SkiaRef?.Image) return null;
      const localPath = `${FileSystem.cacheDirectory}${iconPath.replace(/\//g, "_")}`;
      const info = await FileSystem.getInfoAsync(localPath);
      let uri = localPath;
      if (!info.exists) {
        // If not cached, fallback or download
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

  const handleGenerate = async () => {
    // 1. Verify key online before generating
    const isValid = await verifyKey();
    if (!isValid) {
      Alert.alert(
        "Verification Failed",
        "Your access key has expired or is in use on another device."
      );
      router.replace("/");
      return;
    }

    const config = {
      username: username.trim(),
      server: server.trim(),
      showTotalCount: showTotal,
      showTierCounts: showTier,
      columns,
      theme,
    };
    updateCollageConfig(config);

    setGenerating(true);
    try {
      const pagePaths = await generateCollage(
        recognizedSkins,
        config,
        loadIcon,
        (loaded, total) => {
          setProgress({ loaded, total });
        }
      );

      setGenerating(false);
      router.push({
        pathname: "/result",
        params: { paths: JSON.stringify(pagePaths) },
      });
    } catch (err: any) {
      setGenerating(false);
      Alert.alert("Generation Error", err.message || "Failed to render collage image.");
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets={true}
    >
      <Text style={styles.title}>{strings.customize.title}</Text>

      {/* Header Info Card */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>HEADER DETAILS</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{strings.customize.username}</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. MythicPlayer"
            placeholderTextColor={colors.textDisabled}
            value={username}
            onChangeText={setUsername}
            returnKeyType="next"
            onSubmitEditing={() => serverInputRef.current?.focus()}
            onKeyPress={(e) => {
              if (e.nativeEvent.key === "Enter") {
                serverInputRef.current?.focus();
              }
            }}
            blurOnSubmit={false}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{strings.customize.server}</Text>
          <TextInput
            ref={serverInputRef}
            style={styles.textInput}
            placeholder="e.g. (1234)"
            placeholderTextColor={colors.textDisabled}
            value={server}
            onChangeText={setServer}
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
            onKeyPress={(e) => {
              if (e.nativeEvent.key === "Enter") {
                Keyboard.dismiss();
              }
            }}
          />
        </View>
      </View>

      {/* Toggles Card */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>DISPLAY STATS</Text>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>{strings.customize.showTotal}</Text>
          <Switch
            value={showTotal}
            onValueChange={setShowTotal}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={colors.textPrimary}
          />
        </View>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>{strings.customize.showTiers}</Text>
          <Switch
            value={showTier}
            onValueChange={setShowTier}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={colors.textPrimary}
          />
        </View>
      </View>

      {/* Layout Columns Choice */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>{strings.customize.columns}</Text>
        <View style={styles.optionRow}>
          {[12, 16, 20].map((col) => (
            <TouchableOpacity
              key={col}
              style={[
                styles.optionButton,
                columns === col && styles.optionButtonActive,
              ]}
              onPress={() => setColumns(col as 12 | 16 | 20)}
            >
              <Text
                style={[
                  styles.optionButtonText,
                  columns === col && styles.optionButtonTextActive,
                ]}
              >
                {col} Cols
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Theme Choice */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>{strings.customize.theme}</Text>
        <View style={styles.optionRow}>
          {(["dark", "light"] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[
                styles.optionButton,
                theme === t && styles.optionButtonActive,
              ]}
              onPress={() => setTheme(t)}
            >
              <Text
                style={[
                  styles.optionButtonText,
                  theme === t && styles.optionButtonTextActive,
                ]}
              >
                {t === "dark" ? "Dark (Gaming)" : "Light"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Generate Action Button */}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={styles.generateButton}
          onPress={handleGenerate}
          activeOpacity={0.8}
        >
          <Text style={styles.generateButtonText}>
            {strings.customize.generate}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Loading Modal with Progress */}
      <Modal visible={generating} transparent animationType="fade">
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.loadingTitle}>Generating Skin Collage</Text>
            <Text style={styles.loadingProgress}>
              Drawing icons ({progress.loaded} of {progress.total})...
            </Text>
            <Text style={styles.loadingSubtitle}>
              Rendering ultra-sharp Skia surface layout...
            </Text>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: colors.background,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 16,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  cardHeader: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
  },
  textInput: {
    height: 44,
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    color: colors.textPrimary,
    fontSize: 14,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  toggleLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  optionRow: {
    flexDirection: "row",
    gap: 10,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  optionButtonActive: {
    backgroundColor: colors.accent + "20",
    borderColor: colors.accent,
  },
  optionButtonText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
  },
  optionButtonTextActive: {
    color: colors.accent,
  },
  actionContainer: {
    marginTop: 8,
    marginBottom: 32,
  },
  generateButton: {
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
  generateButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: "800",
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    width: "100%",
    maxWidth: 320,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadingTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "800",
    marginTop: 16,
    marginBottom: 6,
  },
  loadingProgress: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  loadingSubtitle: {
    color: colors.textDisabled,
    fontSize: 12,
    textAlign: "center",
  },
});
