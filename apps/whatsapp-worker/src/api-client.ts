import { workerConfig } from "./config.js";
import {
    WhatsAppWorkerOutboundJobSchema,
    type WhatsAppWorkerMessageEventJSON,
    WhatsAppWorkerInvoiceResultSchema,
    type WhatsAppWorkerOutboundJobDTO,
    type WhatsAppWorkerInvoiceResultJSON,
} from "@repo/types";
import type { AccountStatusSnapshot, WorkerAccountStatus } from "./provider/baileys-account-manager.js";
import type { OperationsMetrics } from "./metrics.js";

type BootstrapAccount = {
    id: string;
    phoneNumber: string;
    status: WorkerAccountStatus;
};

export type WhatsAppHistoryAnchor = {
    externalChatId: string;
    providerMessageId: string;
    fromMe: boolean;
    messageTimestamp: number;
};

const request = async (path: string, init: RequestInit = {}, timeoutMs = 10_000): Promise<Response> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(workerConfig.apiUrl + path, {
            ...init,
            signal: controller.signal,
            headers: {
                Authorization: "Bearer " + workerConfig.workerToken,
                "Content-Type": "application/json",
                "X-WhatsApp-Worker-ID": workerConfig.workerId,
                ...(init.headers ?? {}),
            },
        });
    } finally {
        clearTimeout(timeout);
    }
};

const assertOk = async (response: Response): Promise<void> => {
    if (!response.ok) {
        throw new Error("Ganatri API rejected the WhatsApp worker request");
    }
};

const partitionQuery = () => new URLSearchParams({
    partitionCount: String(workerConfig.partitionCount),
    partitionIndex: String(workerConfig.partitionIndex),
}).toString();

export const listAccounts = async (): Promise<BootstrapAccount[]> => {
    const response = await request("/internal/whatsapp/accounts?" + partitionQuery());
    await assertOk(response);
    const data = await response.json() as { accounts?: BootstrapAccount[] };
    return Array.isArray(data.accounts) ? data.accounts : [];
};

export const reportStatus = async (snapshot: AccountStatusSnapshot): Promise<void> => {
    const response = await request("/internal/whatsapp/accounts/" + encodeURIComponent(snapshot.accountId) + "/status", {
        method: "POST",
        body: JSON.stringify({
            status: snapshot.status,
            qrImageDataUrl: snapshot.qrImageDataUrl,
            lastErrorCode: snapshot.lastErrorCode,
        }),
    });
    await assertOk(response);
};

export const claimNextInvoice = async (): Promise<WhatsAppWorkerOutboundJobDTO | null> => {
    const response = await request("/internal/whatsapp/outbox/next?" + partitionQuery(), {}, 30_000);
    await assertOk(response);
    const data = await response.json() as { job?: unknown };
    if (!data.job) return null;
    const parsed = WhatsAppWorkerOutboundJobSchema.safeParse(data.job);
    if (!parsed.success) throw new Error("Ganatri API returned an invalid WhatsApp outbound job");
    return parsed.data;
};

export const getOperationsMetrics = async (): Promise<OperationsMetrics> => {
    const response = await request("/internal/whatsapp/operations/metrics?" + partitionQuery());
    await assertOk(response);
    const data = await response.json() as { metrics?: OperationsMetrics };
    if (!data.metrics) throw new Error("Ganatri API returned invalid WhatsApp operations metrics");
    return data.metrics;
};

export const getHistoryAnchors = async (accountId: string): Promise<WhatsAppHistoryAnchor[]> => {
    const response = await request("/internal/whatsapp/accounts/" + encodeURIComponent(accountId) + "/history-anchors");
    await assertOk(response);
    const data = await response.json() as { anchors?: unknown };
    if (!Array.isArray(data.anchors)) return [];
    return data.anchors.filter((anchor): anchor is WhatsAppHistoryAnchor => {
        if (!anchor || typeof anchor !== "object") return false;
        const candidate = anchor as Partial<WhatsAppHistoryAnchor>;
        return typeof candidate.externalChatId === "string"
            && typeof candidate.providerMessageId === "string"
            && typeof candidate.fromMe === "boolean"
            && typeof candidate.messageTimestamp === "number"
            && Number.isFinite(candidate.messageTimestamp);
    });
};

export const reportInvoiceResult = async (
    outboxId: string,
    result: WhatsAppWorkerInvoiceResultJSON,
): Promise<void> => {
    const response = await request("/internal/whatsapp/outbox/" + encodeURIComponent(outboxId) + "/result", {
        method: "POST",
        body: JSON.stringify(result),
    });
    await assertOk(response);
};

export const reportMessageStatus = async (
    accountId: string,
    providerMessageId: string,
    status: "delivered" | "read",
): Promise<boolean> => {
    for (let attempt = 0; attempt < 8; attempt += 1) {
        const response = await request("/internal/whatsapp/accounts/" + encodeURIComponent(accountId) + "/messages/status", {
            method: "POST",
            body: JSON.stringify({ providerMessageId, status }),
        });
        await assertOk(response);
        const data = await response.json() as { status?: string };
        if (data.status !== "ignored") return true;
        await new Promise(resolve => setTimeout(resolve, 250 * (attempt + 1)));
    }
    return false;
};

export const reportMessageEvent = async (
    accountId: string,
    message: WhatsAppWorkerMessageEventJSON,
): Promise<{ stored: boolean }> => {
    let lastError: unknown;
    for (let attempt = 0; attempt < 4; attempt += 1) {
        try {
            const response = await request("/internal/whatsapp/accounts/" + encodeURIComponent(accountId) + "/messages/events", {
                method: "POST",
                body: JSON.stringify(message),
            }, 30_000);
            if (!response.ok) {
                if (response.status < 500 && response.status !== 429) {
                    const error = new Error("Ganatri API rejected the WhatsApp message event");
                    Object.assign(error, { retryable: false });
                    throw error;
                }
                throw new Error("Ganatri API temporarily rejected the WhatsApp message event");
            }
            const data = await response.json() as { stored?: unknown };
            return { stored: data.stored === true };
        } catch (error) {
            lastError = error;
            if ((error as { retryable?: boolean }).retryable === false) throw error;
            if (attempt === 3) break;
            await new Promise(resolve => setTimeout(resolve, 250 * 2 ** attempt));
        }
    }
    throw lastError instanceof Error ? lastError : new Error("Unable to report WhatsApp message event");
};
