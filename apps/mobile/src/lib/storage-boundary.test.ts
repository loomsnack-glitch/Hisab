import { describe, expect, it } from "bun:test";
import {
    clearKeys,
    createAsyncStringStorage,
    createDeviceIdStorage,
    createJsonStorage,
    type KeyValueStore,
} from "./storage-boundary";

const createMemoryStore = (): KeyValueStore & { values: Map<string, string> } => {
    const values = new Map<string, string>();

    return {
        values,
        getString: (key) => values.get(key),
        set: (key, value) => values.set(key, value),
        remove: (key) => values.delete(key),
        getAllKeys: () => [...values.keys()],
    };
};

describe("mobile storage boundary", () => {
    it("adapts synchronous key-value storage to the shared async token seam", async () => {
        const store = createMemoryStore();
        const tokenStorage = createAsyncStringStorage(store, "auth.token");

        expect(await tokenStorage.getItem()).toBeNull();
        await tokenStorage.setItem("token-123");
        expect(await tokenStorage.getItem()).toBe("token-123");
        await tokenStorage.removeItem();
        expect(await tokenStorage.getItem()).toBeNull();
    });

    it("creates a device id once and reuses it", async () => {
        const store = createMemoryStore();
        let generated = 0;
        const deviceStorage = createDeviceIdStorage(store, "device.id", () => {
            generated += 1;
            return "device-123";
        });

        expect(await deviceStorage.getDeviceId()).toBe("device-123");
        expect(await deviceStorage.getDeviceId()).toBe("device-123");
        expect(generated).toBe(1);
    });

    it("keeps JSON data and separate storage areas isolated", () => {
        const sessionStore = createMemoryStore();
        const preferencesStore = createMemoryStore();
        const session = createJsonStorage(sessionStore, "device.session");
        const preferences = createAsyncStringStorage(preferencesStore, "language");

        session.set({ deviceId: "device-123" });
        void preferences.setItem("gu");

        expect(session.get()).toEqual({ deviceId: "device-123" });
        expect(preferencesStore.getString("language")).toBe("gu");
        expect(sessionStore.getString("language")).toBeUndefined();
    });

    it("clears only the requested credential keys", () => {
        const store = createMemoryStore();
        store.set("auth.token", "token-123");
        store.set("device.session", "session");
        store.set("preferences.language", "en");

        clearKeys(store, ["auth.token", "device.session"]);

        expect(store.getString("auth.token")).toBeUndefined();
        expect(store.getString("device.session")).toBeUndefined();
        expect(store.getString("preferences.language")).toBe("en");
    });
});
