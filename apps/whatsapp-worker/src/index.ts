import { workerConfig } from "./config.js";
import {
    claimNextInvoice,
    listAccounts,
    reportInvoiceResult,
    reportMessageStatus,
    reportStatus,
} from "./api-client.js";
import { startHttpServer } from "./http-server.js";
import { logger } from "./logger.js";
import { BaileysAccountManager } from "./provider/baileys-account-manager.js";

const manager = new BaileysAccountManager(reportStatus, reportMessageStatus);
const server = startHttpServer(manager);

const wait = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));

const classifySendFailure = (error: unknown): { code: string; message: string; retryable: boolean } => {
    const message = error instanceof Error ? error.message : "WhatsApp document send failed";
    const normalized = message.toLowerCase();
    const retryable = /connect|socket|network|timeout|temporar|not connected/.test(normalized);
    return {
        code: retryable ? "provider_unavailable" : "provider_rejected",
        message: retryable ? "WhatsApp provider is temporarily unavailable" : "WhatsApp provider rejected the invoice",
        retryable,
    };
};

const dispatchInvoices = async (): Promise<void> => {
    for (;;) {
        try {
            const job = await claimNextInvoice();
            if (!job) {
                await wait(workerConfig.dispatchPollIntervalMs);
                continue;
            }

            try {
                const providerMessageId = await manager.sendDocument(
                    job.accountId,
                    job.phoneNumber,
                    Buffer.from(job.documentBase64, "base64"),
                    job.attachmentFileName,
                    job.attachmentMimeType,
                    job.caption ?? undefined,
                );
                await reportInvoiceResult(job.outboxId, {
                    leaseOwner: job.leaseOwner,
                    providerMessageId,
                    failureCode: null,
                    failureMessage: null,
                    retryable: false,
                });
            } catch (error) {
                const failure = classifySendFailure(error);
                await reportInvoiceResult(job.outboxId, {
                    leaseOwner: job.leaseOwner,
                    providerMessageId: null,
                    failureCode: failure.code,
                    failureMessage: failure.message,
                    retryable: failure.retryable,
                });
            }
        } catch {
            logger.warn("WhatsApp invoice dispatch cycle failed");
            await wait(workerConfig.dispatchErrorDelayMs);
        }
    }
};

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
void dispatchInvoices();
