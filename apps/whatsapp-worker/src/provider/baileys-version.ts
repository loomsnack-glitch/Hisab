import {
    fetchLatestBaileysVersion,
    type WAVersion,
} from "@whiskeysockets/baileys";
import { logger } from "../logger.js";

const VERSION_FETCH_TIMEOUT_MS = 5_000;

type VersionFetcher = typeof fetchLatestBaileysVersion;

export const resolveBaileysVersion = async (
    fetcher: VersionFetcher = fetchLatestBaileysVersion,
): Promise<WAVersion> => {
    const result = await fetcher({ timeout: VERSION_FETCH_TIMEOUT_MS });
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
