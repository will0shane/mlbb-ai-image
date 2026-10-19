import { getDeviceId, clearCachedDeviceId } from "../src/device-id";
import * as SecureStore from "expo-secure-store";

jest.mock("expo-secure-store", () => {
  let store: Record<string, string> = {};
  return {
    getItemAsync: jest.fn(async (key: string) => store[key] || null),
    setItemAsync: jest.fn(async (key: string, val: string) => {
      store[key] = val;
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      delete store[key];
    }),
    __resetStore: () => {
      store = {};
    },
  };
});

describe("device-id", () => {
  beforeEach(() => {
    clearCachedDeviceId();
    (SecureStore as any).__resetStore();
    jest.clearAllMocks();
  });

  it("generates a valid UUID v4 format deviceId on first run", async () => {
    const id = await getDeviceId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith("mlbb_device_id", id);
  });

  it("returns cached deviceId on subsequent calls in memory", async () => {
    const id1 = await getDeviceId();
    const id2 = await getDeviceId();
    expect(id1).toBe(id2);
    expect(SecureStore.getItemAsync).toHaveBeenCalledTimes(1);
  });

  it("retrieves previously stored deviceId from SecureStore", async () => {
    await SecureStore.setItemAsync("mlbb_device_id", "existing-device-uuid-1234");
    clearCachedDeviceId();

    const id = await getDeviceId();
    expect(id).toBe("existing-device-uuid-1234");
  });
});
