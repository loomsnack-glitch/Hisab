import Constants from "expo-constants";
import { getApiBaseUrl, setApiBaseUrl } from "@repo/services";

const API_PORT = "8001";

const getExpoHost = (): string | undefined => {
    const candidates = [
        Constants.expoGoConfig?.debuggerHost,
        Constants.expoConfig?.hostUri,
        Constants.linkingUri,
    ];

    for (const candidate of candidates) {
        if (!candidate) continue;

        const normalized = candidate.includes("://") ? candidate : `http://${candidate}`;
        const hostname = new URL(normalized).hostname;
        if (hostname && hostname !== "localhost" && hostname !== "127.0.0.1") {
            return hostname;
        }
    }

    return undefined;
};

export const resolveAdminApiUrl = (): string => {
    const configuredUrl = process.env.EXPO_PUBLIC_BASE_API_URL?.trim().replace(/\/+$/, "");
    if (configuredUrl) return configuredUrl;

    if (__DEV__) {
        const host = getExpoHost();
        if (host) return `http://${host}:${API_PORT}/api`;
    }

    return `http://localhost:${API_PORT}/api`;
};

export const configureAdminApi = () => {
    setApiBaseUrl(resolveAdminApiUrl());
};

export const getConfiguredAdminApiUrl = () => getApiBaseUrl();
