import "../src/polyfill";
import React, { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, Text, StyleSheet } from "react-native";
import { useAppStore } from "../src/store";
import { colors } from "../src/theme";
import { strings } from "../src/strings";

export default function RootLayout() {
  const { initialize, appReady, manifestLoading } = useAppStore();
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    initialize().catch((err) => {
      setInitError(err.message || "Failed to initialize app");
    });
  }, [initialize]);

  if (!appReady && !initError) {
    return (
      <View style={styles.splashContainer}>
        <StatusBar style="light" />
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>MLBB</Text>
        </View>
        <Text style={styles.appName}>{strings.appName}</Text>
        <ActivityIndicator size="large" color={colors.accent} style={styles.spinner} />
        <Text style={styles.statusText}>
          {manifestLoading ? "Loading skin catalog..." : "Initializing..."}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: {
            fontWeight: "bold",
          },
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen
          name="upload"
          options={{
            title: strings.upload.title,
            headerBackTitle: "Back",
          }}
        />
        <Stack.Screen
          name="scanning"
          options={{
            title: "Scanning",
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="review"
          options={{
            title: strings.review.title,
            headerBackTitle: "Scan",
          }}
        />
        <Stack.Screen
          name="customize"
          options={{
            title: strings.customize.title,
            headerBackTitle: "Review",
          }}
        />
        <Stack.Screen
          name="result"
          options={{
            title: strings.result.title,
            headerBackTitle: "Edit",
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            title: strings.settings.title,
            presentation: "modal",
          }}
        />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  splashContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  logoBadge: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  logoText: {
    color: colors.accent,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 2,
  },
  appName: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  spinner: {
    marginTop: 32,
    marginBottom: 12,
  },
  statusText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
});
