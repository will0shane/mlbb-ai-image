/**
 * Firebase initialization for the React Native app.
 *
 * Initializes anonymous auth and App Check with fallbacks for Expo Go.
 */
let firebaseApp: any = null;
let authMod: any = null;
let appCheckMod: any = null;
let functionsMod: any = null;
let storageMod: any = null;

try {
  firebaseApp = require("@react-native-firebase/app").default;
  authMod = require("@react-native-firebase/auth").default;
  appCheckMod = require("@react-native-firebase/app-check").default;
  functionsMod = require("@react-native-firebase/functions").default;
  storageMod = require("@react-native-firebase/storage").default;
} catch {
  // Running in Expo Go sandbox without custom native modules
}

const REGION = "asia-south1";

/** Initialize Firebase App Check */
export async function initAppCheck(): Promise<void> {
  if (!appCheckMod) return;
  try {
    const provider = appCheckMod().newReactNativeFirebaseAppCheckProvider();
    provider.configure({
      android: {
        provider: __DEV__ ? "debug" : "playIntegrity",
        debugToken: __DEV__ ? process.env.EXPO_PUBLIC_APP_CHECK_DEBUG_TOKEN : undefined,
      },
    });
    await appCheckMod().initializeAppCheck({ provider, isTokenAutoRefreshEnabled: true });
  } catch (err) {
    console.warn("App Check initialization skipped in development:", err);
  }
}

/** Sign in anonymously if not already authenticated */
export async function ensureAuth(): Promise<string> {
  if (authMod) {
    try {
      if (authMod().currentUser) {
        return authMod().currentUser.uid;
      }
      const cred = await authMod().signInAnonymously();
      return cred.user.uid;
    } catch (err) {
      console.warn("Native anonymous auth skipped:", err);
    }
  }
  return "expo-go-user-" + Math.random().toString(36).substring(2, 9);
}

/** Get a reference to the regional Cloud Functions */
export function getCallable(name: string) {
  if (functionsMod) {
    try {
      return functionsMod().httpsCallable(name, { timeout: 30000 });
    } catch {
      // Fallback
    }
  }
  // Fallback direct HTTP caller for Expo Go
  return async (data: any) => {
    let res: Response;
    try {
      res = await fetch(`https://${REGION}-mlbb-image.cloudfunctions.net/${name}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
    } catch (networkErr: any) {
      throw {
        code: "functions/unavailable",
        message: "Network request failed: " + (networkErr?.message || "unreachable"),
      };
    }

    if (!res.ok) {
      throw {
        code: res.status === 404 ? "functions/not-found" : "functions/unavailable",
        message: `Cloud function ${name} returned HTTP ${res.status}`,
        status: res.status,
      };
    }

    const text = await res.text();
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      throw {
        code: "functions/unavailable",
        message: `Endpoint ${name} returned invalid non-JSON response`,
      };
    }

    if (json.error) {
      throw json.error;
    }
    return { data: json.result };
  };
}

/** Get a reference to Firebase Storage */
export function getStorageRef(path: string) {
  if (storageMod) {
    try {
      return storageMod().ref(path);
    } catch {
      // Fallback
    }
  }
  return {
    getDownloadURL: async () =>
      `https://firebasestorage.googleapis.com/v0/b/mlbb-image.firebasestorage.app/o/${encodeURIComponent(path)}?alt=media`,
  };
}

export { firebaseApp as firebase, authMod as auth, appCheckMod as appCheck, functionsMod as functions, storageMod as storage };
