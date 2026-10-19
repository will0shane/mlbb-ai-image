import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from "react-native";
import { useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { useAppStore } from "../src/store";
import { colors } from "../src/theme";
import { strings } from "../src/strings";
import { getTimeRemaining, formatTimeRemaining } from "../src/time-utils";
import { getDeviceId } from "../src/device-id";

/** Auto-formats input to XXXX-XXXX-XXXX-XXXX */
function formatKeyInput(text: string): string {
  const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const truncated = cleaned.slice(0, 16);
  const parts = truncated.match(/.{1,4}/g);
  return parts ? parts.join("-") : truncated;
}

export default function HomeScreen() {
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const {
    keyState,
    keyInfo,
    keyLoading,
    keyError,
    activateKey,
    logoutKey,
    verifyKey,
    clearKeyError,
  } = useAppStore();

  const [inputKey, setInputKey] = useState("");
  const [remainingText, setRemainingText] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [deviceId, setDeviceId] = useState<string>("");

  useEffect(() => {
    getDeviceId().then(setDeviceId).catch(() => {});
  }, []);

  // Update countdown every 30 seconds and when keyInfo changes
  useEffect(() => {
    function updateCountdown() {
      if (keyState === "active" && keyInfo?.expiresAtMs) {
        const remainingMs = getTimeRemaining(keyInfo.expiresAtMs);
        setRemainingText(formatTimeRemaining(remainingMs));
      } else if (keyState === "expired") {
        setRemainingText(strings.home.keyExpired);
      } else {
        setRemainingText(strings.home.noActiveKey);
      }
    }

    updateCountdown();
    const interval = setInterval(updateCountdown, 30000);
    return () => clearInterval(interval);
  }, [keyState, keyInfo]);

  // Clean raw alphanumeric key
  const rawKey = inputKey.trim().replace(/[^A-Z0-9]/g, "");
  const isKeyComplete = rawKey.length === 16;

  const handleActivate = async () => {
    if (!rawKey) {
      setHint("Please enter a 16-character license key.");
      setTimeout(() => setHint(null), 3000);
      return;
    }

    if (rawKey.length < 16) {
      setHint(`Incomplete key: ${rawKey.length}/16 characters entered.`);
      setTimeout(() => setHint(null), 3000);
      return;
    }

    Keyboard.dismiss();
    clearKeyError();
    setHint(null);

    try {
      await activateKey(rawKey);
      setInputKey("");
      Alert.alert("License Activated!", "Your product key has been activated successfully on this device.");
    } catch {
      // Error handled in store.keyError
    }
  };

  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (e.nativeEvent.key === "Enter") {
      handleActivate();
    }
  };

  const handlePasteKey = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text) {
        const formatted = formatKeyInput(text);
        setInputKey(formatted);
        if (keyError) clearKeyError();
        if (hint) setHint(null);
      }
    } catch {
      // Clipboard error
    }
  };

  const handleLogout = () => {
    Keyboard.dismiss();
    Alert.alert(
      "Log Out Product Key?",
      "Logging out unlinks your license from this device so you can activate it on another device anytime.\n\nNote: Your remaining subscription time keeps running while unlinked.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out & Unbind",
          style: "destructive",
          onPress: async () => {
            await logoutKey();
            Alert.alert("Logged Out", "This device has been unlinked successfully.");
          },
        },
      ]
    );
  };

  const handleClearExpired = () => {
    Keyboard.dismiss();
    Alert.alert(
      "Clear Expired Key",
      "Remove this expired key so you can enter a new one?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear Key",
          style: "destructive",
          onPress: async () => {
            await logoutKey();
          },
        },
      ]
    );
  };

  const handleGeneratePress = async () => {
    Keyboard.dismiss();
    if (keyState !== "active") {
      setHint("Activate a license key below to unlock collage generation.");
      setTimeout(() => setHint(null), 3500);
      // Auto-focus input and scroll down
      scrollViewRef.current?.scrollTo({ y: 180, animated: true });
      setTimeout(() => inputRef.current?.focus(), 300);
      return;
    }

    // Verify key before proceeding
    const isValid = await verifyKey();
    if (!isValid) {
      Alert.alert(
        "Subscription Expired",
        "Your product key is no longer active. Please activate a new key to continue."
      );
      return;
    }

    router.push("/upload");
  };

  // Masked key display (e.g. ABCD-••••-••••-QRST)
  const getMaskedKey = () => {
    if (!keyInfo?.key) return "";
    const k = keyInfo.key;
    if (k.length >= 16) {
      return `${k.slice(0, 4)}-••••-••••-${k.slice(-4)}`;
    }
    return k;
  };

  const isKeyActive = keyState === "active";
  const isKeyExpired = keyState === "expired";

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 20}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets={true}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Bar with Settings and Quick Logout */}
          <View style={styles.topBar}>
            {/* Status Pill on left */}
            <View
              style={[
                styles.topStatusPill,
                isKeyActive && styles.topStatusPillActive,
                isKeyExpired && styles.topStatusPillExpired,
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  isKeyActive ? styles.statusDotActive : styles.statusDotInactive,
                ]}
              />
              <Text
                style={[
                  styles.topStatusText,
                  isKeyActive && styles.topStatusTextActive,
                ]}
              >
                {isKeyActive ? "Active License" : isKeyExpired ? "Expired" : "No License"}
              </Text>
            </View>

            {/* Right actions: Log Out (if active) + Settings */}
            <View style={styles.topBarActions}>
              {isKeyActive && (
                <TouchableOpacity
                  onPress={handleLogout}
                  style={styles.topLogoutButton}
                  activeOpacity={0.7}
                >
                  <Text style={styles.topLogoutButtonText}>🚪 Log Out</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss();
                  router.push("/settings");
                }}
                style={styles.settingsButton}
                activeOpacity={0.7}
              >
                <Text style={styles.settingsButtonText}>⚙️ Settings</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Centered App Brand */}
          <View style={styles.logoSection}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoBadgeText}>MLBB</Text>
            </View>
            <Text style={styles.title}>{strings.appName}</Text>
            <Text style={styles.subtitle}>Ultimate Skin Showcase & Collage</Text>
          </View>

          {/* Primary Action Button: Generate Collage */}
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={[
                styles.generateButton,
                !isKeyActive && styles.generateButtonDisabled,
              ]}
              onPress={handleGeneratePress}
              activeOpacity={0.8}
            >
              <Text style={styles.generateButtonText}>
                {strings.home.generateCollage}
              </Text>
            </TouchableOpacity>

            {hint && <Text style={styles.hintText}>{hint}</Text>}
          </View>

          {/* MAIN CARD: Active Subscription OR Enter Product Key */}
          {isKeyActive ? (
            /* ACTIVE SUBSCRIPTION CARD */
            <View style={[styles.card, styles.activeCard]}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardHeader}>ACTIVE SUBSCRIPTION</Text>
                <View style={styles.activeBadge}>
                  <View style={styles.pulseDot} />
                  <Text style={styles.activeBadgeText}>ACTIVE</Text>
                </View>
              </View>

              <View style={styles.activeKeyContainer}>
                <Text style={styles.maskedKeyText}>{getMaskedKey()}</Text>
              </View>

              {/* Status Row with Time Remaining */}
              <View style={styles.statusRow}>
                <Text style={styles.clockIcon}>⏳</Text>
                <Text style={styles.statusTextActive}>{remainingText}</Text>
              </View>

              {deviceId ? (
                <View style={styles.deviceRow}>
                  <Text style={styles.deviceLabel}>Device ID:</Text>
                  <Text style={styles.deviceValue}>
                    {deviceId.slice(0, 10)}...{deviceId.slice(-6)}
                  </Text>
                </View>
              ) : null}

              <Text style={styles.cardHint}>
                Bound to this device. One license works on one device at a time.
              </Text>

              {/* PROMINENT LOG OUT SECTION */}
              <View style={styles.logoutSection}>
                <View style={styles.logoutHeaderRow}>
                  <Text style={styles.logoutSectionTitle}>LOG OUT & UNBIND</Text>
                </View>
                <Text style={styles.logoutSectionDesc}>
                  Unlink this device to use your license key on another device.
                </Text>
                <TouchableOpacity
                  style={styles.logoutButton}
                  onPress={handleLogout}
                  activeOpacity={0.7}
                >
                  <Text style={styles.logoutButtonText}>
                    🚪 Log Out & Unbind Device
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : isKeyExpired ? (
            /* EXPIRED SUBSCRIPTION CARD */
            <View style={[styles.card, styles.expiredCard]}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardHeader}>SUBSCRIPTION EXPIRED</Text>
                <View style={styles.expiredBadge}>
                  <Text style={styles.expiredBadgeText}>EXPIRED</Text>
                </View>
              </View>

              <Text style={styles.expiredNotice}>
                Your subscription has ended. Clear this key or log out to enter a new one.
              </Text>

              <TouchableOpacity
                style={styles.clearKeyButton}
                onPress={handleClearExpired}
                activeOpacity={0.8}
              >
                <Text style={styles.clearKeyButtonText}>
                  🚪 Log Out & Clear Expired Key
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* ENTER PRODUCT KEY SECTION (Fully Keyboard Optimized) */
            <View style={[styles.card, isFocused && styles.cardFocused]}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.headerTitleGroup}>
                  <Text style={styles.cardHeader}>ENTER PRODUCT KEY</Text>
                  <Text style={styles.headerSubtitle}>
                    16-character license key
                  </Text>
                </View>
                {/* Dynamic Character Count Badge */}
                <View
                  style={[
                    styles.charBadge,
                    isKeyComplete && styles.charBadgeComplete,
                  ]}
                >
                  <Text
                    style={[
                      styles.charBadgeText,
                      isKeyComplete && styles.charBadgeTextComplete,
                    ]}
                  >
                    {rawKey.length}/16 {isKeyComplete ? "✓" : ""}
                  </Text>
                </View>
              </View>

              <Text style={styles.cardHint}>
                Type or paste your license key below, then press Enter ↵ to activate:
              </Text>

              {/* Input Row with Focus Ring & Actions */}
              <View
                style={[
                  styles.inputContainer,
                  isFocused && styles.inputContainerFocused,
                ]}
              >
                <TextInput
                  ref={inputRef}
                  style={styles.input}
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  placeholderTextColor={colors.textDisabled}
                  value={inputKey}
                  onChangeText={(t) => {
                    setInputKey(formatKeyInput(t));
                    if (keyError) clearKeyError();
                    if (hint) setHint(null);
                  }}
                  onFocus={() => {
                    setIsFocused(true);
                    // Smoothly auto-scroll when keyboard opens
                    setTimeout(() => {
                      scrollViewRef.current?.scrollTo({ y: 160, animated: true });
                    }, 100);
                  }}
                  onBlur={() => setIsFocused(false)}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  autoComplete="off"
                  spellCheck={false}
                  keyboardType="ascii-capable"
                  returnKeyType="go"
                  onSubmitEditing={handleActivate}
                  onKeyPress={handleKeyPress}
                  blurOnSubmit={false}
                  maxLength={19}
                />

                {/* Right Input Actions: Paste & Clear */}
                <View style={styles.inputActionGroup}>
                  {inputKey.length > 0 ? (
                    <TouchableOpacity
                      style={styles.clearInputButton}
                      onPress={() => {
                        setInputKey("");
                        clearKeyError();
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={styles.clearInputText}>✕</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.pasteButton}
                      onPress={handlePasteKey}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.pasteButtonText}>📋 Paste</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Action Button: Activate (High visibility) */}
              <View style={styles.activateRow}>
                <TouchableOpacity
                  style={[
                    styles.activateButton,
                    (!rawKey || keyLoading) && styles.activateButtonDisabled,
                    isKeyComplete && styles.activateButtonReady,
                  ]}
                  onPress={handleActivate}
                  disabled={!rawKey || keyLoading}
                  activeOpacity={0.8}
                >
                  {keyLoading ? (
                    <ActivityIndicator size="small" color={colors.background} />
                  ) : (
                    <Text style={styles.activateButtonText}>
                      {isKeyComplete ? "ACTIVATE LICENSE ↵" : strings.home.activate}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Error Message */}
              {keyError && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorIcon}>⚠️</Text>
                  <Text style={styles.errorText}>{keyError}</Text>
                </View>
              )}

            </View>
          )}

          {/* DEDICATED LOG OUT & SESSION MANAGEMENT SECTION (Always available) */}
          <View style={styles.sessionSection}>
            <View style={styles.sessionCard}>
              <View style={styles.sessionHeaderRow}>
                <Text style={styles.sessionHeader}>SESSION & DEVICE</Text>
                <Text style={styles.sessionBadge}>
                  {isKeyActive ? "BOUND" : "UNBOUND"}
                </Text>
              </View>

              <Text style={styles.sessionDesc}>
                {isKeyActive
                  ? "Your device is securely linked to your license key."
                  : "No device binding active. Enter a product key to register this device."}
              </Text>

              {deviceId ? (
                <Text style={styles.deviceIdSmall}>
                  Device: {deviceId.slice(0, 12)}...{deviceId.slice(-6)}
                </Text>
              ) : null}

              {isKeyActive ? (
                <TouchableOpacity
                  style={styles.sessionLogoutButton}
                  onPress={handleLogout}
                  activeOpacity={0.7}
                >
                  <Text style={styles.sessionLogoutButtonText}>
                    🚪 Log Out & Unbind Device
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.sessionResetButton}
                  onPress={async () => {
                    await logoutKey();
                    setInputKey("");
                    Alert.alert("Session Cleared", "Local app session and cache have been reset.");
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.sessionResetButtonText}>
                    🔄 Reset App Cache / Session
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Bottom spacing spacer */}
          <View style={{ height: 28 }} />
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 54 : 44,
    paddingBottom: 32,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  topStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  topStatusPillActive: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  topStatusPillExpired: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotActive: {
    backgroundColor: "#10B981",
  },
  statusDotInactive: {
    backgroundColor: colors.textDisabled,
  },
  topStatusText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "600",
  },
  topStatusTextActive: {
    color: "#10B981",
    fontWeight: "700",
  },
  topBarActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  topLogoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  topLogoutButtonText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "700",
  },
  settingsButton: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingsButtonText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  logoBadge: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  logoBadgeText: {
    color: colors.accent,
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 3,
  },
  actionSection: {
    marginBottom: 18,
  },
  generateButton: {
    height: 52,
    backgroundColor: colors.accent,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  generateButtonDisabled: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  generateButtonText: {
    color: colors.background,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  hintText: {
    color: colors.accent,
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
    fontWeight: "600",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  cardFocused: {
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  activeCard: {
    borderColor: "rgba(16, 185, 129, 0.35)",
    backgroundColor: "rgba(16, 185, 129, 0.05)",
  },
  expiredCard: {
    borderColor: "rgba(239, 68, 68, 0.35)",
    backgroundColor: "rgba(239, 68, 68, 0.05)",
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  headerTitleGroup: {
    flex: 1,
  },
  cardHeader: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  headerSubtitle: {
    color: colors.textDisabled,
    fontSize: 11,
    marginTop: 2,
  },
  charBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  charBadgeComplete: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderColor: "rgba(16, 185, 129, 0.4)",
  },
  charBadgeText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: "700",
  },
  charBadgeTextComplete: {
    color: "#10B981",
    fontWeight: "800",
  },
  cardHint: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 14,
    lineHeight: 18,
  },
  inputContainer: {
    position: "relative",
    justifyContent: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  inputContainerFocused: {
    borderColor: colors.accent,
    backgroundColor: "rgba(245, 158, 11, 0.03)",
  },
  input: {
    height: 52,
    paddingHorizontal: 16,
    paddingRight: 80,
    color: colors.textPrimary,
    fontSize: 15,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  inputActionGroup: {
    position: "absolute",
    right: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  clearInputButton: {
    padding: 8,
  },
  clearInputText: {
    color: colors.textDisabled,
    fontSize: 14,
    fontWeight: "700",
  },
  pasteButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pasteButtonText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "700",
  },
  activateRow: {
    marginTop: 14,
  },
  activateButton: {
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  activateButtonReady: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  activateButtonDisabled: {
    opacity: 0.45,
  },
  activateButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    padding: 10,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderRadius: 10,
    gap: 8,
  },
  errorIcon: {
    fontSize: 13,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  demoKeyContainer: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
  },
  demoKeyHeader: {
    color: colors.textDisabled,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 8,
  },
  demoButtonsRow: {
    flexDirection: "row",
    gap: 8,
  },
  demoKeyPill: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  demoKeyPillText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "700",
  },
  activeKeyContainer: {
    height: 52,
    backgroundColor: colors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  maskedKeyText: {
    color: colors.accent,
    fontSize: 17,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontWeight: "800",
    letterSpacing: 2,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  clockIcon: {
    fontSize: 15,
  },
  statusTextActive: {
    color: "#10B981",
    fontSize: 14,
    fontWeight: "700",
  },
  deviceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 6,
  },
  deviceLabel: {
    color: colors.textDisabled,
    fontSize: 11,
  },
  deviceValue: {
    color: colors.textSecondary,
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 6,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
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
  expiredNotice: {
    color: colors.error,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  clearKeyButton: {
    height: 46,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  clearKeyButtonText: {
    color: "#EF4444",
    fontSize: 13,
    fontWeight: "700",
  },
  logoutSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
  logoutHeaderRow: {
    marginBottom: 4,
  },
  logoutSectionTitle: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  logoutSectionDesc: {
    color: colors.textDisabled,
    fontSize: 11,
    marginBottom: 12,
    lineHeight: 16,
  },
  logoutButton: {
    height: 46,
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
  sessionSection: {
    marginTop: 4,
  },
  sessionCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sessionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sessionHeader: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  sessionBadge: {
    color: colors.textDisabled,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  sessionDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 8,
  },
  deviceIdSmall: {
    color: colors.textDisabled,
    fontSize: 10,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    marginBottom: 12,
  },
  sessionLogoutButton: {
    height: 42,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  sessionLogoutButtonText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "700",
  },
  sessionResetButton: {
    height: 40,
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  sessionResetButtonText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
});
