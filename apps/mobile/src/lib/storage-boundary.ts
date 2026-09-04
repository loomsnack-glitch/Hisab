export type KeyValueStore = {
    getString: (key: string) => string | undefined;
    set: (key: string, value: string) => unknown;
    remove: (key: string) => boolean;
    getAllKeys?: () => string[];
};

export type AsyncStringStorage = {
    getItem: () => Promise<string | null>;
    setItem: (value: string) => Promise<void>;
    removeItem: () => Promise<void>;
};

export const createAsyncStringStorage = (
    store: KeyValueStore,
    key: string,
): AsyncStringStorage => ({
    getItem: async () => store.getString(key) ?? null,
    setItem: async (value) => {
        store.set(key, value);
    },
    removeItem: async () => {
        store.remove(key);
    },
});

export const createDeviceIdStorage = (
    store: KeyValueStore,
    key: string,
    createDeviceId: () => string,
) => ({
    getDeviceId: async () => {
        const existingDeviceId = store.getString(key);
        if (existingDeviceId) {
            return existingDeviceId;
        }

        const deviceId = createDeviceId();
        store.set(key, deviceId);
        return deviceId;
    },
});

export const createJsonStorage = <T>(store: KeyValueStore, key: string) => ({
    get: (): T | null => {
        const value = store.getString(key);
        if (!value) {
            return null;
        }

        return JSON.parse(value) as T;
    },
    set: (value: T) => {
        store.set(key, JSON.stringify(value));
    },
    remove: () => {
        store.remove(key);
    },
});

export const clearKeys = (store: KeyValueStore, keys: readonly string[]) => {
    for (const key of keys) {
        store.remove(key);
    }
};
