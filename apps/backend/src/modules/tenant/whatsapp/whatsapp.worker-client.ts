import { WhatsAppWorkerStatusResponseSchema, type WhatsAppWorkerStatusResponseDTO } from "@repo/types";

export type WorkerAccountStatus = {
    accountId: string;
    status: "pending_qr" | "connecting" | "connected" | "disconnected" | "failed" | "revoked";
    qrImageDataUrl: string | null;
    lastErrorCode: string | null;
};

const workerUrl = () => (process.env.WHATSAPP_WORKER_URL?.trim() || "http://127.0.0.1:8100").replace(/\/+$/, "");
const workerToken = () => process.env.WHATSAPP_WORKER_TOKEN?.trim() || "";

const request = async (path: string, init: RequestInit = {}): Promise<Response> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
        return await fetch(workerUrl() + path, {
            ...init,
            signal: controller.signal,
            headers: {
                Authorization: "Bearer " + workerToken(),
                "Content-Type": "application/json",
                ...(init.headers ?? {}),
            },
        });
    } finally {
        clearTimeout(timeout);
    }
};

const parseResponse = async (response: Response): Promise<WhatsAppWorkerStatusResponseDTO> => {
    if (!response.ok) throw new Error("WhatsApp worker request failed");
    const parsed = WhatsAppWorkerStatusResponseSchema.safeParse(await response.json());
    if (!parsed.success) throw new Error("WhatsApp worker returned an invalid status");
    return parsed.data;
};

export const connectAccount = async (accountId: string, phoneNumber: string): Promise<WorkerAccountStatus> =>
    parseResponse(await request("/v1/accounts/" + encodeURIComponent(accountId) + "/connect", {
        method: "POST",
        body: JSON.stringify({ phoneNumber }),
    }));

export const disconnectAccount = async (accountId: string): Promise<WorkerAccountStatus> =>
    parseResponse(await request("/v1/accounts/" + encodeURIComponent(accountId) + "/disconnect", {
        method: "POST",
    }));

export const syncAccount = async (accountId: string): Promise<WorkerAccountStatus> =>
    parseResponse(await request("/v1/accounts/" + encodeURIComponent(accountId) + "/sync", {
        method: "POST",
    }));

export const getAccountStatus = async (accountId: string): Promise<WorkerAccountStatus> =>
    parseResponse(await request("/v1/accounts/" + encodeURIComponent(accountId) + "/status"));
