/**
 * Device ID management using expo-secure-store.
 * Generates a random UUID on first launch and persists it securely.
 */
import * as SecureStore from "expo-secure-store";

const DEVICE_ID_KEY = "mlbb_device_id";

function generateUUID(): string {
  // Simple UUID v4 generator
  const hex = "0123456789abcdef";
  let uuid = "";
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      uuid += "-";
    } else if (i === 14) {
      uuid += "4";
    } else if (i === 19) {
      uuid += hex[(Math.random() * 4) | 8];
    } else {
      uuid += hex[(Math.random() * 16) | 0];
    }
  }
  return uuid;
}

let cachedDeviceId: string | null = null;

/** Get the device ID, creating one if it doesn't exist */
export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;

  let id = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (!id) {
    id = generateUUID();
    await SecureStore.setItemAsync(DEVICE_ID_KEY, id);
  }

  cachedDeviceId = id;
  return id;
}

/** Clear the cached device ID (for testing) */
export function clearCachedDeviceId(): void {
  cachedDeviceId = null;
}
