import { workerConfig } from "./config.js";
import {
    WhatsAppWorkerOutboundJobSchema,
    WhatsAppWorkerInvoiceResultSchema,
    type WhatsAppWorkerOutboundJobDTO,
    type WhatsAppWorkerInvoiceResultJSON,
    type WhatsAppWorkerInboundMessageJSON,
} from "@repo/types";
import type { AccountStatusSnapshot, WorkerAccountStatus } from "./provider/baileys-account-manager.js";

type BootstrapAccount = {
    id: string;
    phoneNumber: string;
    status: WorkerAccountStatus;
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

export const listAccounts = async (): Promise<BootstrapAccount[]> => {
    const response = await request("/internal/whatsapp/accounts");
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
    const response = await request("/internal/whatsapp/outbox/next", {}, 30_000);
    await assertOk(response);
    const data = await response.json() as { job?: unknown };
    if (!data.job) return null;
    const parsed = WhatsAppWorkerOutboundJobSchema.safeParse(data.job);
    if (!parsed.success) throw new Error("Ganatri API returned an invalid WhatsApp outbound job");
    return parsed.data;
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
): Promise<void> => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
        const response = await request("/internal/whatsapp/accounts/" + encodeURIComponent(accountId) + "/messages/status", {
            method: "POST",
            body: JSON.stringify({ providerMessageId, status }),
        });
        await assertOk(response);
        const data = await response.json() as { status?: string };
        if (data.status !== "ignored") return;
        await new Promise(resolve => setTimeout(resolve, 250 * (attempt + 1)));
    }
};

export const reportInboundMessage = async (
    accountId: string,
    message: WhatsAppWorkerInboundMessageJSON,
): Promise<void> => {
    const response = await request("/internal/whatsapp/accounts/" + encodeURIComponent(accountId) + "/messages/inbound", {
        method: "POST",
        body: JSON.stringify(message),
    }, 30_000);
    await assertOk(response);
};
