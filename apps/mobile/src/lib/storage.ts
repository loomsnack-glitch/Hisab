import * as Keychain from "react-native-keychain";
import { createMMKV, type MMKV } from "react-native-mmkv";
import * as Crypto from "expo-crypto";
import type { DeviceSessionDTO } from "@repo/types";
import { configureAuthTokenStorage, configureDeviceIdProvider } from "@repo/services";
import {
    clearKeys,
    createAsyncStringStorage,
    createDeviceIdStorage,
    createJsonStorage,
    type KeyValueStore,
} from "./storage-boundary";

const SESSION_STORAGE_ID = "ganatri-pos-session";
const PREFERENCES_STORAGE_ID = "ganatri-pos-preferences";
const CONVENIENCE_STORAGE_ID = "ganatri-pos-convenience";
const MMKV_KEYCHAIN_SERVICE = "ganatri-pos-mmkv-encryption-key";
const MMKV_KEYCHAIN_USERNAME = "ganatri-pos-session";

const AUTH_TOKEN_KEY = "auth.token";
const DEVICE_ID_KEY = "device.id";
const DEVICE_SESSION_KEY = "device.session";

export const POS_PREFERENCE_KEYS = {
    language: "language",
    theme: "theme",
    displaySize: "displaySize",
} as const;

export const createEncryptionKey = () => {
    return Crypto.randomUUID().replaceAll("-", "");
};

const getOrCreateEncryptionKey = async () => {
    const credentials = await Keychain.getGenericPassword({ service: MMKV_KEYCHAIN_SERVICE });
    if (credentials !== false) {
        return credentials.password;
    }

    const encryptionKey = createEncryptionKey();
    const saved = await Keychain.setGenericPassword(MMKV_KEYCHAIN_USERNAME, encryptionKey, {
        service: MMKV_KEYCHAIN_SERVICE,
        securityLevel: Keychain.SECURITY_LEVEL.SECURE_SOFTWARE,
        storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
    });

    if (saved === false) {
        throw new Error("Unable to protect the MMKV encryption key with Android Keystore");
    }

    return encryptionKey;
};

let sessionStoragePromise: Promise<MMKV> | null = null;

const getSessionStorage = () => {
    if (!sessionStoragePromise) {
        sessionStoragePromise = getOrCreateEncryptionKey().then((encryptionKey) =>
            createMMKV({
                id: SESSION_STORAGE_ID,
                encryptionKey,
                encryptionType: "AES-256",
            }),
        );
    }

    return sessionStoragePromise;
};

const preferencesStorage = createMMKV({ id: PREFERENCES_STORAGE_ID });
const convenienceStorage = createMMKV({ id: CONVENIENCE_STORAGE_ID });

const createDeviceId = () => {
    return Crypto.randomUUID();
};

const getSessionValueStore = async (): Promise<KeyValueStore> => getSessionStorage();

export const posStorage = {
    getAuthToken: async () =>
        (await getSessionValueStore()).getString(AUTH_TOKEN_KEY) ?? null,
    setAuthToken: async (token: string) => {
        (await getSessionValueStore()).set(AUTH_TOKEN_KEY, token);
    },
    clearAuthToken: async () => {
        (await getSessionValueStore()).remove(AUTH_TOKEN_KEY);
    },
    getDeviceId: async () => {
        const store = await getSessionValueStore();
        return createDeviceIdStorage(store, DEVICE_ID_KEY, createDeviceId).getDeviceId();
    },
    getDeviceSession: async (): Promise<DeviceSessionDTO | null> => {
        const store = await getSessionValueStore();
        return createJsonStorage<DeviceSessionDTO>(store, DEVICE_SESSION_KEY).get();
    },
    setDeviceSession: async (session: DeviceSessionDTO) => {
        const store = await getSessionValueStore();
        createJsonStorage<DeviceSessionDTO>(store, DEVICE_SESSION_KEY).set(session);
    },
    clearSession: async () => {
        const store = await getSessionValueStore();
        clearKeys(store, [AUTH_TOKEN_KEY, DEVICE_SESSION_KEY]);
    },
    getPreference: (key: string) => preferencesStorage.getString(key) ?? null,
    setPreference: (key: string, value: string) => preferencesStorage.set(key, value),
    removePreference: (key: string) => preferencesStorage.remove(key),
    getConvenienceValue: (key: string) => convenienceStorage.getString(key) ?? null,
    setConvenienceValue: (key: string, value: string) => convenienceStorage.set(key, value),
    removeConvenienceValue: (key: string) => convenienceStorage.remove(key),
};

export const resetProtectedSessionStorage = async () => {
    const store = await getSessionStorage();
    store.clearAll();
    await Keychain.resetGenericPassword({ service: MMKV_KEYCHAIN_SERVICE });
    sessionStoragePromise = null;
};

configureAuthTokenStorage({
    getItem: posStorage.getAuthToken,
    setItem: posStorage.setAuthToken,
    removeItem: posStorage.clearAuthToken,
});

configureDeviceIdProvider({ getDeviceId: posStorage.getDeviceId });
