import axios, { AxiosError } from "axios";

const FALLBACK_BASE_API_URL = "http://localhost:8000/api";

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
});

export const setApiBaseUrl = (value: string) => {
    const sanitized = sanitizeBaseUrl(value) ?? FALLBACK_BASE_API_URL;
    baseApiUrl = sanitized;
    api.defaults.baseURL = sanitized;
};

export const getApiBaseUrl = () => baseApiUrl;

api.interceptors.response.use(
    response => response,
    error => Promise.reject(error),
);

export const handleApiError = (error: any) => {
    if (error instanceof AxiosError && error.response?.data) {
        throw error.response.data;
    }
    throw error;
};
