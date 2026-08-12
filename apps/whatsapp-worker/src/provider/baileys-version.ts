import {
    DEFAULT_CONNECTION_CONFIG,
    fetchLatestBaileysVersion,
    type WAVersion,
} from "baileys";
import { logger } from "../logger.js";

const VERSION_FETCH_TIMEOUT_MS = 5_000;
const BUNDLED_BAILEYS_VERSION: WAVersion = DEFAULT_CONNECTION_CONFIG.version;

type VersionFetcher = typeof fetchLatestBaileysVersion;

export const resolveBaileysVersion = async (
    fetcher: VersionFetcher = fetchLatestBaileysVersion,
): Promise<WAVersion> => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const timeoutResult = new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error("Baileys version request timed out")), VERSION_FETCH_TIMEOUT_MS);
    });

    let result: Awaited<ReturnType<VersionFetcher>>;
    try {
        result = await Promise.race([fetcher(), timeoutResult]);
    } catch (error) {
        result = {
            version: BUNDLED_BAILEYS_VERSION,
            isLatest: false,
            error,
        };
    } finally {
        if (timeout) clearTimeout(timeout);
    }
    const source = result.isLatest ? "latest" : "bundled-fallback";

    logger.info("Baileys WhatsApp version selected", {
        version: result.version.join("."),
        source,
    });

    if (!result.isLatest) {
        logger.warn("Latest Baileys WhatsApp version unavailable", {
            source,
        });
    }

    return result.version;
};
