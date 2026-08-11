import {
    DisconnectReason,
    makeWASocket,
    Browsers,
    WAMessageStatus,
    normalizeMessageContent,
    downloadMediaMessage,
    type WASocket,
    type WAMessage,
} from "@whiskeysockets/baileys";
import type { WhatsAppWorkerInboundMessageJSON } from "@repo/types";
import { toDataURL } from "qrcode";
import { join } from "node:path";
import { clearEncryptedAuthState, useEncryptedAuthState } from "../session/encrypted-auth-state.js";
import { workerConfig } from "../config.js";
import { logger } from "../logger.js";
import { resolveBaileysVersion } from "./baileys-version.js";

export type WorkerAccountStatus =
    | "pending_qr"
    | "connecting"
    | "connected"
    | "disconnected"
    | "failed"
    | "revoked";

export type AccountConnectionInput = {
    accountId: string;
    phoneNumber: string;
};

export type AccountStatusSnapshot = {
    accountId: string;
    status: WorkerAccountStatus;
    qrImageDataUrl: string | null;
    lastErrorCode: string | null;
};

type StatusReporter = (snapshot: AccountStatusSnapshot) => Promise<void>;
export type MessageStatus = "delivered" | "read";
type MessageStatusReporter = (accountId: string, providerMessageId: string, status: MessageStatus) => Promise<void>;
type InboundMessageReporter = (accountId: string, message: WhatsAppWorkerInboundMessageJSON) => Promise<void>;

type ManagedAccount = {
    input: AccountConnectionInput;
    socket: WASocket | null;
    status: WorkerAccountStatus;
    qrImageDataUrl: string | null;
    lastErrorCode: string | null;
    reconnectAttempt: number;
    reconnectTimer: NodeJS.Timeout | null;
    intentionalDisconnect: boolean;
};

const silentLogger = {
    level: "silent",
    child: () => silentLogger,
    trace: () => undefined,
    debug: () => undefined,
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
};

const accountDirectory = (accountId: string) => join(workerConfig.authStateDirectory, accountId);
const phoneToJid = (phoneNumber: string) => phoneNumber.replace(/^\+/, "") + "@s.whatsapp.net";

const disconnectCode = (error: unknown): number | null => {
    const output = (error as { output?: { statusCode?: unknown } } | null)?.output;
    return typeof output?.statusCode === "number" ? output.statusCode : null;
};

export class BaileysAccountManager {
    private readonly accounts = new Map<string, ManagedAccount>();
    private versionPromise: Promise<[number, number, number]> | null = null;

    public constructor(
        private readonly reportStatus: StatusReporter,
        private readonly reportMessageStatus?: MessageStatusReporter,
        private readonly reportInboundMessage?: InboundMessageReporter,
    ) {}

    private getBaileysVersion(): Promise<[number, number, number]> {
        if (!this.versionPromise) {
            this.versionPromise = resolveBaileysVersion();
        }
        return this.versionPromise;
    }

    public getStatus(accountId: string): AccountStatusSnapshot {
        const account = this.accounts.get(accountId);
        if (!account) {
            return {
                accountId,
                status: "disconnected",
                qrImageDataUrl: null,
                lastErrorCode: null,
            };
        }

        return this.snapshot(account);
    }

    public async connect(input: AccountConnectionInput): Promise<AccountStatusSnapshot> {
        const existing = this.accounts.get(input.accountId);
        if (existing?.status === "connected" || existing?.status === "connecting" || existing?.status === "pending_qr") {
            return this.snapshot(existing);
        }

        const account: ManagedAccount = existing ?? {
            input,
            socket: null,
            status: "connecting",
            qrImageDataUrl: null,
            lastErrorCode: null,
            reconnectAttempt: 0,
            reconnectTimer: null,
            intentionalDisconnect: false,
        };
        account.input = input;
        account.intentionalDisconnect = false;
        if (account.reconnectTimer) {
            clearTimeout(account.reconnectTimer);
            account.reconnectTimer = null;
        }
        account.status = "connecting";
        account.lastErrorCode = null;
        this.accounts.set(input.accountId, account);

        await this.report(account);

        const { state, saveCreds } = await useEncryptedAuthState(
            accountDirectory(input.accountId),
            workerConfig.authEncryptionKey,
        );
        const socket = makeWASocket({
            version: await this.getBaileysVersion(),
            auth: state,
            browser: Browsers.ubuntu("Ganatri"),
            logger: silentLogger,
            markOnlineOnConnect: false,
            syncFullHistory: false,
            printQRInTerminal: false,
        });
        account.socket = socket;
        socket.ev.on("creds.update", saveCreds);
        socket.ev.on("messages.upsert", event => {
            for (const message of event.messages) {
                void this.handleInboundMessage(account, message).catch(() => {
                    logger.warn("Unable to process inbound WhatsApp message", { accountId: account.input.accountId });
                });
            }
        });
        socket.ev.on("messages.update", updates => {
            for (const update of updates) {
                const providerMessageId = update.key.id;
                if (!providerMessageId || !update.key.fromMe || !this.reportMessageStatus) continue;
                const status = update.update.status;
                const mappedStatus = status === WAMessageStatus.READ || status === WAMessageStatus.PLAYED
                    ? "read"
                    : status === WAMessageStatus.DELIVERY_ACK
                      ? "delivered"
                      : null;
                if (!mappedStatus) continue;
                void this.reportMessageStatus(account.input.accountId, providerMessageId, mappedStatus).catch(() => {
                    logger.warn("Unable to report WhatsApp message status", {
                        accountId: account.input.accountId,
                    });
                });
            }
        });
        socket.ev.on("connection.update", update => {
            void this.handleConnectionUpdate(account, socket, update).catch(() => {
                account.status = "failed";
                account.lastErrorCode = "connection_update_failed";
                void this.report(account);
            });
        });

        return this.snapshot(account);
    }

    public async disconnect(accountId: string): Promise<AccountStatusSnapshot> {
        const account = this.accounts.get(accountId);
        if (!account) {
            return this.getStatus(accountId);
        }

        account.intentionalDisconnect = true;
        if (account.reconnectTimer) {
            clearTimeout(account.reconnectTimer);
            account.reconnectTimer = null;
        }

        try {
            await account.socket?.logout("Disconnected from Ganatri");
        } catch {
            account.socket?.end(new Error("Disconnected from Ganatri"));
        }

        await clearEncryptedAuthState(accountDirectory(accountId));
        account.socket = null;
        account.status = "disconnected";
        account.qrImageDataUrl = null;
        account.lastErrorCode = null;
        await this.report(account);
        return this.snapshot(account);
    }

    public async shutdown(): Promise<void> {
        const accounts = [...this.accounts.values()];
        for (const account of accounts) {
            account.intentionalDisconnect = true;
            if (account.reconnectTimer) {
                clearTimeout(account.reconnectTimer);
                account.reconnectTimer = null;
            }
            account.socket?.end(new Error("WhatsApp worker shutting down"));
            account.socket = null;
            account.status = "disconnected";
            account.qrImageDataUrl = null;
        }
        await Promise.all(accounts.map(account => this.report(account)));
    }

    public async sendText(accountId: string, phoneNumber: string, body: string): Promise<string> {
        const socket = this.requireConnectedSocket(accountId);
        const result = await socket.sendMessage(phoneToJid(phoneNumber), { text: body });
        if (!result?.key?.id) {
            throw new Error("WhatsApp provider did not return a message id");
        }
        return result.key.id;
    }

    public async sendDocument(
        accountId: string,
        phoneNumber: string,
        document: Buffer,
        fileName: string,
        mimeType: string,
        caption?: string,
    ): Promise<string> {
        const socket = this.requireConnectedSocket(accountId);
        const result = await socket.sendMessage(phoneToJid(phoneNumber), {
            document,
            fileName,
            mimetype: mimeType,
            caption,
        });
        if (!result?.key?.id) {
            throw new Error("WhatsApp provider did not return a message id");
        }
        return result.key.id;
    }

    private async handleInboundMessage(account: ManagedAccount, message: WAMessage): Promise<void> {
        if (!this.reportInboundMessage || message.key.fromMe || !message.key.id) return;
        const externalChatId = message.key.remoteJid ?? "";
        if (!externalChatId.endsWith("@s.whatsapp.net")) return;
        const phoneDigits = externalChatId.slice(0, -"@s.whatsapp.net".length).split(":")[0];
        if (!/^\d{8,15}$/.test(phoneDigits)) return;
        const content = normalizeMessageContent(message.message);
        if (!content) return;

        const body = content.conversation ?? content.extendedTextMessage?.text ?? null;
        const document = content.documentMessage;
        if (!body && !document) return;

        let documentBase64: string | null = null;
        if (document) {
            const buffer = await downloadMediaMessage(message, "buffer", {});
            documentBase64 = buffer.toString("base64");
        }

        await this.reportInboundMessage(account.input.accountId, {
            providerMessageId: message.key.id,
            externalChatId,
            contactPhoneNumber: "+" + phoneDigits,
            displayName: message.pushName?.trim() || "+" + phoneDigits,
            messageType: document ? "document" : "text",
            body: body?.trim() || null,
            caption: document?.caption ?? null,
            attachmentFileName: document?.fileName ?? null,
            attachmentMimeType: document?.mimetype ?? null,
            documentBase64,
            occurredAt: new Date(Number(message.messageTimestamp ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
        });
    }

    private requireConnectedSocket(accountId: string): WASocket {
        const account = this.accounts.get(accountId);
        if (!account?.socket || account.status !== "connected") {
            throw new Error("WhatsApp account is not connected");
        }
        return account.socket;
    }

    private snapshot(account: ManagedAccount): AccountStatusSnapshot {
        return {
            accountId: account.input.accountId,
            status: account.status,
            qrImageDataUrl: account.qrImageDataUrl,
            lastErrorCode: account.lastErrorCode,
        };
    }

    private async report(account: ManagedAccount): Promise<void> {
        try {
            await this.reportStatus(this.snapshot(account));
        } catch {
            logger.warn("Unable to report WhatsApp account status", { accountId: account.input.accountId });
        }
    }

    private async handleConnectionUpdate(
        account: ManagedAccount,
        socket: WASocket,
        update: { connection?: "open" | "close" | "connecting"; qr?: string; lastDisconnect?: { error?: unknown } },
    ): Promise<void> {
        if (account.socket !== socket) {
            return;
        }

        if (update.qr) {
            account.status = "pending_qr";
            account.qrImageDataUrl = await toDataURL(update.qr, { width: 320, margin: 1 });
            await this.report(account);
        }

        if (update.connection === "connecting") {
            account.status = "connecting";
            await this.report(account);
        }

        if (update.connection === "open") {
            account.status = "connected";
            account.qrImageDataUrl = null;
            account.lastErrorCode = null;
            account.reconnectAttempt = 0;
            await this.report(account);
            return;
        }

        if (update.connection !== "close") {
            return;
        }

        const code = disconnectCode(update.lastDisconnect?.error);
        logger.warn("WhatsApp connection closed", {
            accountId: account.input.accountId,
            code: code ?? "unknown",
        });
        account.socket = null;
        if (account.intentionalDisconnect) {
            account.status = "disconnected";
            account.qrImageDataUrl = null;
            await this.report(account);
            return;
        }

        if (code === DisconnectReason.loggedOut || code === DisconnectReason.badSession) {
            account.status = "revoked";
            account.lastErrorCode = code === DisconnectReason.loggedOut ? "logged_out" : "bad_session";
            account.qrImageDataUrl = null;
            await clearEncryptedAuthState(accountDirectory(account.input.accountId));
            await this.report(account);
            return;
        }

        account.status = "failed";
        account.lastErrorCode = code ? "connection_" + code : "connection_closed";
        account.qrImageDataUrl = null;
        await this.report(account);
        this.scheduleReconnect(account);
    }

    private scheduleReconnect(account: ManagedAccount): void {
        if (account.reconnectTimer || account.intentionalDisconnect) {
            return;
        }

        const delay = Math.min(
            workerConfig.reconnectBaseDelayMs * 2 ** account.reconnectAttempt,
            workerConfig.reconnectMaxDelayMs,
        );
        account.reconnectAttempt += 1;
        account.reconnectTimer = setTimeout(() => {
            account.reconnectTimer = null;
            void this.connect(account.input).catch(() => {
                account.status = "failed";
                account.lastErrorCode = "reconnect_failed";
                void this.report(account);
                this.scheduleReconnect(account);
            });
        }, delay);
    }
}
