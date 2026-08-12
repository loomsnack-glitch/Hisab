import { workerConfig } from "./config.js";
import {
    claimNextInvoice,
    getHistoryAnchors,
    getOperationsMetrics,
    listAccounts,
    reportMessageEvent,
    reportInvoiceResult,
    reportMessageStatus,
    reportStatus,
} from "./api-client.js";
import { startHttpServer } from "./http-server.js";
import { logger } from "./logger.js";
import { WorkerMetrics } from "./metrics.js";
import { PerAccountSerialQueue } from "./operations/per-account-serial-queue.js";
import { BaileysAccountManager } from "./provider/baileys-account-manager.js";
import { installBaileysConsoleFilter } from "./provider/baileys-console-filter.js";

installBaileysConsoleFilter();

const metrics = new WorkerMetrics();
const reportStatusWithMetrics = async (snapshot: Parameters<typeof reportStatus>[0]): Promise<void> => {
    metrics.setAccountStatus(snapshot.accountId, snapshot.status);
    await reportStatus(snapshot);
};
const reportMessageEventWithMetrics = async (...args: Parameters<typeof reportMessageEvent>): Promise<void> => {
    try {
        const result = await reportMessageEvent(...args);
        metrics.recordMessageEvent(result.stored, args[1].source);
    } catch (error) {
        metrics.recordMessageEventFailure();
        throw error;
    }
};

const reportMessageStatusWithMetrics = async (...args: Parameters<typeof reportMessageStatus>): Promise<boolean> => {
    const persisted = await reportMessageStatus(...args);
    metrics.recordMessageStatus(args[2], persisted);
    return persisted;
};

const manager = new BaileysAccountManager(reportStatusWithMetrics, reportMessageStatusWithMetrics, reportMessageEventWithMetrics, getHistoryAnchors);
const server = startHttpServer(manager, metrics);
const outboundQueue = new PerAccountSerialQueue({ minimumIntervalMs: workerConfig.minimumSendIntervalMs });

const wait = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));

const classifySendFailure = (error: unknown): { code: string; message: string; retryable: boolean } => {
    const message = error instanceof Error ? error.message : "WhatsApp message send failed";
    const normalized = message.toLowerCase();
    const retryable = /connect|socket|network|timeout|temporar|not connected/.test(normalized);
    return {
        code: retryable ? "provider_unavailable" : "provider_rejected",
        message: retryable ? "WhatsApp provider is temporarily unavailable" : "WhatsApp provider rejected the message",
        retryable,
    };
};

let stopping = false;

const dispatchInvoices = async (slot: number): Promise<void> => {
    while (!stopping) {
        try {
            const job = await claimNextInvoice();
            if (!job) {
                await wait(workerConfig.dispatchPollIntervalMs);
                continue;
            }

            metrics.recordClaim();
            try {
                const providerMessageId = await outboundQueue.run(job.accountId, async () => job.messageType === "text"
                    ? manager.sendText(job.accountId, job.phoneNumber, job.body ?? "")
                    : job.documentBase64 && job.attachmentFileName && job.attachmentMimeType
                      ? manager.sendDocument(
                            job.accountId,
                            job.phoneNumber,
                            Buffer.from(job.documentBase64, "base64"),
                            job.attachmentFileName,
                            job.attachmentMimeType,
                            job.caption ?? undefined,
                        )
                      : (() => { throw new Error("Outbound document payload is incomplete"); })());
                await reportInvoiceResult(job.outboxId, {
                    leaseOwner: job.leaseOwner,
                    providerMessageId,
                    failureCode: null,
                    failureMessage: null,
                    retryable: false,
                });
                metrics.recordDispatchSuccess();
            } catch (error) {
                metrics.recordDispatchFailure();
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
            logger.warn("WhatsApp dispatch cycle failed", { slot });
            await wait(workerConfig.dispatchErrorDelayMs);
        }
    }
};

const refreshOperationsMetrics = async (): Promise<void> => {
    try {
        metrics.recordOperationsRefresh(await getOperationsMetrics());
    } catch {
        metrics.recordOperationsRefreshFailure();
        logger.warn("Unable to refresh WhatsApp operations metrics");
    }
};

const operationsLoop = async (): Promise<void> => {
    while (!stopping) {
        await refreshOperationsMetrics();
        await wait(workerConfig.operationsRefreshIntervalMs);
    }
};

const bootstrap = async (): Promise<void> => {
    try {
        const accounts = await listAccounts();
        for (const account of accounts) {
            metrics.setAccountStatus(account.id, account.status);
            void manager.connect({
                accountId: account.id,
                phoneNumber: account.phoneNumber,
            }).catch(() => {
                logger.warn("Unable to restore WhatsApp account", { accountId: account.id });
            });
        }
        logger.info("WhatsApp account reconciliation completed", {
            accountCount: accounts.length,
            partitionIndex: workerConfig.partitionIndex,
            partitionCount: workerConfig.partitionCount,
        });
    } catch {
        logger.warn("WhatsApp account reconciliation failed");
    }
};

const dispatchLoops = Array.from({ length: workerConfig.dispatchConcurrency }, (_, index) => dispatchInvoices(index));
const operations = operationsLoop();

let shutdownPromise: Promise<void> | null = null;
const shutdown = async (): Promise<void> => {
    if (shutdownPromise) return shutdownPromise;
    shutdownPromise = (async () => {
        stopping = true;
        const drain = Promise.all([...dispatchLoops, operations]);
        await Promise.race([drain, wait(workerConfig.shutdownTimeoutMs)]);
        await manager.shutdown();
        await new Promise<void>(resolve => server.close(() => resolve()));
        logger.info("WhatsApp worker stopped", { workerId: workerConfig.workerId });
    })();
    return shutdownPromise;
};

process.once("SIGINT", () => { void shutdown(); });
process.once("SIGTERM", () => { void shutdown(); });

void bootstrap();
