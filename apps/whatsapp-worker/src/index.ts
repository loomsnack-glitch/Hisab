import { workerConfig } from "./config.js";
import { listAccounts, reportStatus } from "./api-client.js";
import { startHttpServer } from "./http-server.js";
import { logger } from "./logger.js";
import { BaileysAccountManager } from "./provider/baileys-account-manager.js";

const manager = new BaileysAccountManager(reportStatus);
const server = startHttpServer(manager);

const bootstrap = async (): Promise<void> => {
    try {
        const accounts = await listAccounts();
        for (const account of accounts) {
            void manager.connect({
                accountId: account.id,
                phoneNumber: account.phoneNumber,
            }).catch(() => {
                logger.warn("Unable to restore WhatsApp account", { accountId: account.id });
            });
        }
        logger.info("WhatsApp account reconciliation completed", { accountCount: accounts.length });
    } catch {
        logger.warn("WhatsApp account reconciliation failed");
    }
};

const shutdown = () => {
    server.close(() => process.exit(0));
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

void bootstrap();
