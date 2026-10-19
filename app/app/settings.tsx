import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useAppStore } from "../src/store";
import { colors } from "../src/theme";
import { strings } from "../src/strings";
import { getDeviceId } from "../src/device-id";
import { getTimeRemaining, formatTimeRemaining } from "../src/time-utils";

export default function SettingsScreen() {
  const router = useRouter();
  const { manifest, keyState, keyInfo, logoutKey } = useAppStore();

  const [deviceId, setDeviceId] = useState<string>("");
  const [remainingText, setRemainingText] = useState("");

  useEffect(() => {
    getDeviceId().then(setDeviceId).catch(() => {});
  }, []);

  useEffect(() => {
    if (keyState === "active" && keyInfo?.expiresAtMs) {
      const remainingMs = getTimeRemaining(keyInfo.expiresAtMs);
      setRemainingText(formatTimeRemaining(remainingMs));
    } else if (keyState === "expired") {
      setRemainingText("Subscription Expired");
    } else {
      setRemainingText("No Active Subscription");
    }
  }, [keyState, keyInfo]);

  const handleLogout = () => {
    Alert.alert(
      "Log Out Product Key?",
      "Logging out will unlink this key from this device so you can activate it on another device.\n\nNote: Your remaining subscription time keeps running while logged out.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: async () => {
            await logoutKey();
            Alert.alert("Logged Out", "This device has been unlinked successfully.");
          },
        },
      ]
    );
  };

  const maskedKey = keyInfo?.key
    ? `${keyInfo.key.slice(0, 4)}-••••-••••-${keyInfo.key.slice(-4)}`
    : null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Brand & Version Card */}
      <View style={styles.card}>
        <View style={styles.badgeRow}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>MLBB</Text>
          </View>
          <View>
            <Text style={styles.appName}>{strings.appName}</Text>
            <Text style={styles.versionText}>Version 1.0.0 (Expo SDK 57)</Text>
            {manifest?.version && (
              <Text style={styles.catalogVersion}>
                Database Catalog v{manifest.version} ({manifest.skins.length} skins)
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Product Key & Log Out Management Card */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardHeader}>PRODUCT KEY & LOG OUT</Text>
          {keyState === "active" ? (
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>ACTIVE</Text>
            </View>
          ) : keyState === "expired" ? (
            <View style={styles.expiredBadge}>
              <Text style={styles.expiredBadgeText}>EXPIRED</Text>
            </View>
          ) : (
            <Text style={styles.inactiveBadgeText}>UNLINKED</Text>
          )}
        </View>

        {maskedKey && (
          <View style={styles.keyRow}>
            <Text style={styles.keyLabel}>License Key:</Text>
            <Text style={styles.keyValue}>{maskedKey}</Text>
          </View>
        )}

        <View style={styles.keyRow}>
          <Text style={styles.keyLabel}>Subscription Status:</Text>
          <Text
            style={[
              styles.keyValue,
              keyState === "active" && styles.textSuccess,
              keyState === "expired" && styles.textDanger,
            ]}
          >
            {remainingText}
          </Text>
        </View>

        {deviceId ? (
          <View style={styles.keyRow}>
            <Text style={styles.keyLabel}>Device ID:</Text>
            <Text style={styles.deviceValue}>
              {deviceId.slice(0, 10)}...{deviceId.slice(-6)}
            </Text>
          </View>
        ) : null}

        {keyState === "active" ? (
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Text style={styles.logoutButtonText}>🚪 Log Out & Unlink Device</Text>
          </TouchableOpacity>
        ) : keyState === "expired" ? (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={async () => {
              await logoutKey();
              Alert.alert("Key Cleared", "Expired key cleared.");
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.clearButtonText}>🚪 Log Out & Clear Expired Key</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={async () => {
              await logoutKey();
              Alert.alert("Session Reset", "Device session and local credentials cleared.");
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.clearButtonText}>🔄 Reset Device Session</Text>
          </TouchableOpacity>
        )}
      </View>


      {/* Disclaimer Card */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>LEGAL DISCLAIMER</Text>
        <Text style={styles.disclaimerText}>
          {strings.settings.disclaimer}
        </Text>
        <Text style={styles.disclaimerSubtext}>
          Mobile Legends: Bang Bang, its artwork, logos, and all associated hero and skin assets are trademarks and property of Shanghai Moonton Technology Co., Ltd.
        </Text>
      </View>

      {/* Close button */}
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => router.back()}
        activeOpacity={0.8}
      >
        <Text style={styles.closeButtonText}>Done</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: colors.background,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardHeader: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  activeBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  activeBadgeText: {
    color: "#10B981",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  expiredBadge: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  expiredBadgeText: {
    color: "#EF4444",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  inactiveBadgeText: {
    color: colors.textDisabled,
    fontSize: 10,
    fontWeight: "700",
  },
  keyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  keyLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  keyValue: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
  deviceValue: {
    color: colors.textDisabled,
    fontSize: 12,
    fontFamily: "monospace",
  },
  textSuccess: {
    color: "#10B981",
  },
  textDanger: {
    color: "#EF4444",
  },
  logoutButton: {
    marginTop: 14,
    height: 44,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  logoutButtonText: {
    color: "#EF4444",
    fontSize: 13,
    fontWeight: "700",
  },
  clearButton: {
    marginTop: 14,
    height: 44,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  clearButtonText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  appName: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "800",
  },
  versionText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  catalogVersion: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  cardDescription: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  downloadButton: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  downloadButtonText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "700",
  },
  progressContainer: {
    gap: 8,
  },
  progressLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  progressBarBg: {
    height: 8,
    backgroundColor: colors.background,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: colors.accent,
    borderRadius: 4,
  },
  disclaimerText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  disclaimerSubtext: {
    color: colors.textDisabled,
    fontSize: 11,
    lineHeight: 16,
  },
  closeButton: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 30,
  },
  closeButtonText: {
    color: colors.background,
    fontSize: 15,
    fontWeight: "800",
  },
});
