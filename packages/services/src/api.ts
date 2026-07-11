import axios, { AxiosError } from "axios";
import { getAuthToken } from "./auth-token";
import { getDeviceId } from "./device-id";

const FALLBACK_BASE_API_URL = "http://localhost:8000/api";
// const FALLBACK_BASE_API_URL = "https://ganatri.loomsnack.com/api";

const sanitizeBaseUrl = (value?: string | null): string | undefined => {
    if (!value) return undefined;

    const trimmed = value.trim();
    if (!trimmed) return undefined;

    return trimmed.replace(/\/+$/, "");
};

const isReactNativeRuntime = (): boolean =>
    typeof navigator !== "undefined"
    && (navigator as Navigator & { product?: string }).product === "ReactNative";

export const resolveBaseApiUrl = (): string => {
    const processEnvBaseUrl = sanitizeBaseUrl(
        typeof process !== "undefined"
            ? process.env.EXPO_PUBLIC_BASE_API_URL
            ?? process.env.NEXT_PUBLIC_BASE_API_URL
            ?? process.env.API_BASE_URL
            ?? process.env.BASE_API_URL
            : undefined,
    );

    const globalBaseUrl = sanitizeBaseUrl(
        typeof globalThis !== "undefined"
            ? (globalThis as { __TENDERSENSE_BASE_API_URL__?: string }).__TENDERSENSE_BASE_API_URL__
            : undefined,
    );

    const baseUrl = processEnvBaseUrl
        ?? globalBaseUrl
        ?? FALLBACK_BASE_API_URL;
    return baseUrl;
};

let baseApiUrl = resolveBaseApiUrl();

export const api = axios.create({
    baseURL: baseApiUrl,
    withCredentials: !isReactNativeRuntime(),
    timeout: isReactNativeRuntime() ? 30_000 : undefined,
});

export const setApiBaseUrl = (value: string) => {
    const sanitized = sanitizeBaseUrl(value) ?? FALLBACK_BASE_API_URL;
    baseApiUrl = sanitized;
    api.defaults.baseURL = sanitized;
};

export const getApiBaseUrl = () => baseApiUrl;

api.interceptors.request.use(async (config) => {
    if (!isReactNativeRuntime()) {
        return config;
    }

    const token = await getAuthToken();
    if (token) {
        config.headers.Authorization = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
    }

    const deviceId = await getDeviceId();
    if (deviceId) {
        config.headers["X-Device-Id"] = deviceId;
    }

    return config;
});

api.interceptors.response.use(
    response => response,
    error => Promise.reject(error),
);

export const handleApiError = (error: unknown) => {
    if (error instanceof AxiosError) {
        if (error.response?.data) {
            throw error.response.data;
        }

        if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
            const requestUrl = error.config?.url;
            const requestBaseUrl = error.config?.baseURL ?? getApiBaseUrl();
            const resolvedTarget = (() => {
                if (!requestUrl) {
                    return requestBaseUrl;
                }

                try {
                    return new URL(requestUrl, requestBaseUrl).toString();
                } catch {
                    return requestUrl;
                }
            })();

            if (isReactNativeRuntime()) {
                throw {
                    message: `Cannot reach the API at ${requestBaseUrl}. On a physical phone, set EXPO_PUBLIC_BASE_API_URL to your PC's LAN IP in apps/mobile/.env (not localhost or 10.0.2.2).`,
                };
            }

            if (requestUrl && /^https?:\/\//i.test(requestUrl)) {
                throw {
                    message: `Cannot reach the file upload endpoint at ${resolvedTarget}. This is usually a storage URL or CORS issue rather than the main API.`,
                };
            }

            throw {
                message: `Cannot reach the API at ${requestBaseUrl}. Check that the backend is running and that the web app is pointing to the correct API base URL.`,
            };
        }

        if (error.code === "ECONNABORTED") {
            throw {
                message: `The API request timed out at ${error.config?.baseURL ?? getApiBaseUrl()}. Check that the backend is running on port 8000.`,
            };
        }

        throw {
            message: error.message || "Request failed",
        };
    }

    throw error;
};
