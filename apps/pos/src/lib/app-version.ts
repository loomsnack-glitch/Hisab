import { POS_APP_NAME } from "./app-identity";

export type AppVersionInfo = {
    version: string;
    build: string;
    builtAt: string;
};

export const buildPosVersionMetadata = (info: AppVersionInfo) => ({
    name: POS_APP_NAME,
    ...info,
});

const FALLBACK_VERSION = "development";

export const localAppVersion: AppVersionInfo = {
    version: import.meta.env.VITE_APP_VERSION || FALLBACK_VERSION,
    build: import.meta.env.VITE_BUILD_ID || "development",
    builtAt: import.meta.env.VITE_BUILD_TIME || "",
};

export const parseAppVersionInfo = (value: unknown): AppVersionInfo | null => {
    if (!value || typeof value !== "object") {
        return null;
    }

    const candidate = value as Partial<AppVersionInfo>;
    if (
        typeof candidate.version === "string" &&
        candidate.version.length > 0 &&
        typeof candidate.build === "string" &&
        candidate.build.length > 0 &&
        typeof candidate.builtAt === "string"
    ) {
        return candidate as AppVersionInfo;
    }

    return null;
};

export const fetchAppVersion = async (signal?: AbortSignal): Promise<AppVersionInfo> => {
    const response = await fetch(`/version.json?check=${Date.now()}`, {
        cache: "no-store",
        signal,
    });

    if (!response.ok) {
        throw new Error(`Could not load Ganatri POS version (${response.status})`);
    }

    const parsedVersion = parseAppVersionInfo(await response.json());
    if (!parsedVersion) {
        throw new Error("Ganatri POS version response is invalid");
    }

    return parsedVersion;
};

export const formatAppVersion = (version: AppVersionInfo) => `v${version.version}`;
