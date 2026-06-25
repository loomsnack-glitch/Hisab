import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { getApiBaseUrl, setApiBaseUrl } from "@repo/services";

const LOCALHOST_PATTERN = /localhost|127\.0\.0\.1/g;
const API_PORT = "8000";

const trimTrailingSlashes = (value: string) => value.replace(/\/+$/, "");

const getHostFromUri = (value?: string | null): string | undefined => {
    if (!value) {
        return undefined;
    }

    const normalized = value.includes("://") ? value : `http://${value}`;
    const host = new URL(normalized).hostname?.trim();

    if (!host || host === "localhost" || host === "127.0.0.1") {
        return undefined;
    }

    return host;
};

const getExpoDevHost = (): string | undefined => {
    const candidates = [
        Constants.expoGoConfig?.debuggerHost,
        Constants.expoConfig?.hostUri,
        Constants.linkingUri,
        // Legacy manifest fields still present in some dev clients.
        (Constants as { manifest?: { debuggerHost?: string } }).manifest?.debuggerHost,
        (Constants as { manifest2?: { extra?: { expoClient?: { hostUri?: string } } } }).manifest2?.extra?.expoClient
            ?.hostUri,
    ];

    for (const candidate of candidates) {
        const host = getHostFromUri(candidate);
        if (host) {
            return host;
        }
    }

    return undefined;
};

const isAndroidEmulator = Platform.OS === "android" && !Device.isDevice;

const replaceLocalhost = (url: string): string => {
    if (!LOCALHOST_PATTERN.test(url)) {
        return url;
    }

    const devHost = getExpoDevHost();
    if (devHost) {
        return url.replace(LOCALHOST_PATTERN, devHost);
    }

    // 10.0.2.2 only works inside the Android emulator, never on a physical phone.
    if (isAndroidEmulator) {
        return url.replace(LOCALHOST_PATTERN, "10.0.2.2");
    }

    return url;
};

export const resolveMobileApiUrl = (): string => {
    const envUrl = process.env.EXPO_PUBLIC_BASE_API_URL?.trim();

    if (envUrl) {
        const sanitized = trimTrailingSlashes(envUrl);
        return __DEV__ ? replaceLocalhost(sanitized) : sanitized;
    }

    if (__DEV__) {
        const devHost = getExpoDevHost();

        if (devHost) {
            return `http://${devHost}:${API_PORT}/api`;
        }

        if (isAndroidEmulator) {
            return `http://10.0.2.2:${API_PORT}/api`;
        }
    }

    return `http://localhost:${API_PORT}/api`;
};

export const configureMobileApi = () => {
    setApiBaseUrl(resolveMobileApiUrl());
};

export const getConfiguredApiBaseUrl = () => getApiBaseUrl();

export const getMobileApiSetupHint = (): string | undefined => {
    if (!__DEV__) {
        return undefined;
    }

    const apiUrl = getConfiguredApiBaseUrl();

    if (apiUrl.includes("10.0.2.2") && Device.isDevice) {
        return "This device cannot reach 10.0.2.2. Set EXPO_PUBLIC_BASE_API_URL to your PC LAN IP in apps/mobile/.env, or run: adb reverse tcp:8000 tcp:8000";
    }

    if (LOCALHOST_PATTERN.test(apiUrl) && Device.isDevice) {
        return "Set EXPO_PUBLIC_BASE_API_URL to your PC LAN IP in apps/mobile/.env (example: http://192.168.1.10:8000/api), or run: adb reverse tcp:8000 tcp:8000";
    }

    return undefined;
};
