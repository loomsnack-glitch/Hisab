import { workerConfig } from "./config.js";
import type { AccountStatusSnapshot, WorkerAccountStatus } from "./provider/baileys-account-manager.js";

type BootstrapAccount = {
    id: string;
    phoneNumber: string;
    status: WorkerAccountStatus;
};

const request = async (path: string, init: RequestInit = {}): Promise<Response> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
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
