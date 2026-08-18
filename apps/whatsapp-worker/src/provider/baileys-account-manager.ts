import {
    DisconnectReason,
    makeWASocket,
    Browsers,
    normalizeMessageContent,
    downloadMediaMessage,
    type WASocket,
    type WAMessage,
    type WAMessageKey,
    type WAVersion,
} from "baileys";
import type { WhatsAppWorkerMessageEventJSON } from "@repo/types";
import { toDataURL } from "qrcode";
import { join } from "node:path";
import { clearEncryptedAuthState, useEncryptedAuthState } from "../session/encrypted-auth-state.js";
import { workerConfig } from "../config.js";
import { logger } from "../logger.js";
import { resolveBaileysVersion } from "./baileys-version.js";
import { classifyMessageEvent, type MessageEventSource } from "./message-event.js";
import { normalizeMessageStatus } from "./message-status.js";
import { createOutboundMediaMessage } from "./media-message.js";

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
type MessageStatusReporter = (accountId: string, providerMessageId: string, status: MessageStatus) => Promise<boolean>;
type MessageEventReporter = (accountId: string, message: WhatsAppWorkerMessageEventJSON) => Promise<void>;
type HistoryAnchor = {
    externalChatId: string;
    providerMessageId: string;
    fromMe: boolean;
    messageTimestamp: number;
};
type HistoryAnchorProvider = (accountId: string) => Promise<HistoryAnchor[]>;
type HistoryCursor = {
    key: WAMessageKey;
    messageTimestamp: number;
};

type ManagedAccount = {
    input: AccountConnectionInput;
    socket: WASocket | null;
    status: WorkerAccountStatus;
    qrImageDataUrl: string | null;
    lastErrorCode: string | null;
    reconnectAttempt: number;
    reconnectTimer: NodeJS.Timeout | null;
    intentionalDisconnect: boolean;
    messageStore: Map<string, WAMessage>;
    realtimeMessageEventTail: Promise<void>;
    historyMessageEventTail: Promise<void>;
    syncInProgress: boolean;
    historySyncRequested: boolean;
    historyPageWaiter: ((messages: WAMessage[]) => void) | null;
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
const messageStoreKey = (key: WAMessageKey): string => `${key.remoteJid ?? ""}:${key.id ?? ""}:${key.fromMe ? "me" : "them"}`;
const phoneJidPattern = /^(\d{8,15})(?::\d+)?@(s\.whatsapp\.net|c\.us)$/;
const jidType = (jid: string | null | undefined): string => jid?.split("@")[1] ?? "missing";
const historyPageSize = 50;
// Keep one explicit backfill page per user action; live events must stay responsive.
const maxHistoryPagesPerChat = 1;
const historyPageTimeoutMs = 15_000;
// Baileys' proto enum currently assigns ON_DEMAND history sync the value 6.
const onDemandHistorySyncType = 6;

const disconnectCode = (error: unknown): number | null => {
    const output = (error as { output?: { statusCode?: unknown } } | null)?.output;
    return typeof output?.statusCode === "number" ? output.statusCode : null;
};

export class BaileysAccountManager {
    private readonly accounts = new Map<string, ManagedAccount>();
    private versionPromise: Promise<WAVersion> | null = null;

    public constructor(
        private readonly reportStatus: StatusReporter,
        private readonly reportMessageStatus?: MessageStatusReporter,
        private readonly reportMessageEvent?: MessageEventReporter,
        private readonly getHistoryAnchors?: HistoryAnchorProvider,
    ) {}

    private getBaileysVersion(): Promise<WAVersion> {
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

    public hasAccount(accountId: string): boolean {
        return this.accounts.has(accountId);
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
            messageStore: new Map(),
            realtimeMessageEventTail: Promise.resolve(),
            historyMessageEventTail: Promise.resolve(),
            syncInProgress: false,
            historySyncRequested: false,
            historyPageWaiter: null,
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
            syncFullHistory: workerConfig.syncFullHistory,
            printQRInTerminal: false,
            getMessage: async key => account.messageStore.get(messageStoreKey(key))?.message ?? undefined,
        });
        logger.info("Baileys socket created", {
            accountId: account.input.accountId,
            syncFullHistory: workerConfig.syncFullHistory,
        });
        account.socket = socket;
        socket.ev.on("creds.update", saveCreds);
        socket.ev.on("messages.upsert", event => {
            logger.info("WhatsApp message upsert received", {
                accountId: account.input.accountId,
                messageCount: event.messages.length,
                source: event.type === "notify" ? "realtime" : "history",
            });
            if (event.type !== "notify" && !workerConfig.syncFullHistory) {
                logger.info("WhatsApp history message upsert ignored because history sync is disabled", {
                    accountId: account.input.accountId,
                    messageCount: event.messages.length,
                });
                return;
            }
            for (const message of event.messages) {
                this.enqueueMessageEvent(account, message, event.type === "notify" ? "realtime" : "history");
            }
        });
        socket.ev.on("messaging-history.set", event => {
            logger.info("WhatsApp messaging history received", {
                accountId: account.input.accountId,
                messageCount: event.messages.length,
                syncType: String(event.syncType ?? "unknown"),
                isLatest: Boolean(event.isLatest),
            });
            if (!workerConfig.syncFullHistory) {
                logger.info("WhatsApp messaging history ignored because history sync is disabled", {
                    accountId: account.input.accountId,
                    messageCount: event.messages.length,
                });
                return;
            }
            for (const message of event.messages) {
                this.enqueueMessageEvent(account, message, "history");
            }
            const waiter = account.historyPageWaiter;
            if (event.syncType === onDemandHistorySyncType && waiter) {
                account.historyPageWaiter = null;
                waiter(event.messages);
            }
        });
        socket.ev.on("messages.update", updates => {
            for (const update of updates) {
                const providerMessageId = update.key.id;
                const status = update.update.status;
                logger.info("WhatsApp message status update received", {
                    accountId: account.input.accountId,
                    providerMessageId: providerMessageId ? providerMessageId.slice(0, 12) : "missing",
                    fromMe: Boolean(update.key.fromMe),
                    status: status == null ? "missing" : String(status),
                });
                if (!providerMessageId || !update.key.fromMe || !this.reportMessageStatus) continue;
                const mappedStatus = normalizeMessageStatus(status);
                if (!mappedStatus) continue;
                void this.reportMessageStatus(account.input.accountId, providerMessageId, mappedStatus)
                    .then(accepted => {
                        if (!accepted) {
                            logger.warn("WhatsApp message status was not persisted after retries", {
                                accountId: account.input.accountId,
                                providerMessageId: providerMessageId.slice(0, 12),
                                status: mappedStatus,
                            });
                        }
                    })
                    .catch(() => {
                        logger.warn("Unable to report WhatsApp message status", {
                            accountId: account.input.accountId,
                            providerMessageId: providerMessageId.slice(0, 12),
                            status: mappedStatus,
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
            // The account may still be restoring when an operator disconnects it.
            // Clear its persisted session as well, otherwise a later reconciliation
            // can restore the old WhatsApp session and make disconnect appear to fail.
            await clearEncryptedAuthState(accountDirectory(accountId));
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

    public async syncAccount(accountId: string): Promise<AccountStatusSnapshot> {
        if (!workerConfig.syncFullHistory) {
            logger.info("Manual WhatsApp chat sync ignored because history sync is disabled", { accountId });
            return this.getStatus(accountId);
        }
        const account = this.accounts.get(accountId);
        if (account?.syncInProgress) {
            logger.warn("Manual WhatsApp chat sync ignored because one is already running", { accountId });
            return this.snapshot(account);
        }
        if (!account?.socket || account.status !== "connected") {
            logger.warn("Manual WhatsApp chat sync rejected because account is not connected", {
                accountId,
                status: account?.status ?? "unknown",
            });
            throw new Error("WhatsApp account is not connected");
        }

        logger.info("Manual WhatsApp chat sync starting", { accountId });
        account.syncInProgress = true;
        account.historySyncRequested = true;
        const previousSocket = account.socket;
        account.socket = null;
        account.status = "disconnected";
        account.qrImageDataUrl = null;
        await this.report(account);
        try {
            previousSocket.end(new Error("Manual WhatsApp history sync requested"));
            logger.info("Previous WhatsApp socket closed for manual sync", { accountId });
        } catch {
            logger.warn("Previous WhatsApp socket close returned an error during manual sync", { accountId });
        }

        return this.connect(account.input);
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
        // A process shutdown is not a user disconnect. Keep the persisted status
        // unchanged so the next worker boot can reconcile and restore the session.
    }

    public async sendText(accountId: string, phoneNumber: string, body: string): Promise<string> {
        const socket = this.requireConnectedSocket(accountId);
        const result = await socket.sendMessage(phoneToJid(phoneNumber), { text: body });
        if (!result?.key?.id) {
            throw new Error("WhatsApp provider did not return a message id");
        }
        return result.key.id;
    }

    public async sendMedia(
        accountId: string,
        phoneNumber: string,
        media: Buffer,
        fileName: string,
        mimeType: string,
        caption?: string,
    ): Promise<string> {
        const socket = this.requireConnectedSocket(accountId);
        const result = await socket.sendMessage(
            phoneToJid(phoneNumber),
            createOutboundMediaMessage(media, fileName, mimeType, caption),
        );
        if (!result?.key?.id) {
            throw new Error("WhatsApp provider did not return a message id");
        }
        return result.key.id;
    }

    private enqueueMessageEvent(account: ManagedAccount, message: WAMessage, source: MessageEventSource): void {
        this.rememberMessage(account, message);
        const eventTail = source === "realtime" ? "realtimeMessageEventTail" : "historyMessageEventTail";
        account[eventTail] = account[eventTail]
            .then(() => this.handleMessageEvent(account, message, source))
            .catch(() => {
                logger.warn("Unable to process WhatsApp message event", {
                    accountId: account.input.accountId,
                    source,
                });
            });
    }

    private async handleMessageEvent(account: ManagedAccount, message: WAMessage, source: MessageEventSource): Promise<void> {
        if (!this.reportMessageEvent || !message.key.id) {
            logger.warn("WhatsApp message event skipped because it has no reporter or provider id", {
                accountId: account.input.accountId,
                source,
            });
            return;
        }
        const resolution = await this.resolvePhoneChatId(account, message);
        if (!resolution.phoneJid) {
            logger.info("WhatsApp message event skipped because chat is not an individual chat", {
                accountId: account.input.accountId,
                source,
                remoteJidType: resolution.remoteJidType,
                remoteJidAltType: resolution.remoteJidAltType,
                resolution: resolution.resolution,
            });
            return;
        }
        const externalChatId = resolution.phoneJid;
        const phoneDigits = phoneJidPattern.exec(externalChatId)?.[1] ?? "";
        const content = normalizeMessageContent(message.message);
        if (!content) {
            logger.info("WhatsApp message event skipped because message content is unsupported", {
                accountId: account.input.accountId,
                source,
            });
            return;
        }

        const body = content.conversation ?? content.extendedTextMessage?.text ?? null;
        const document = content.documentMessage;
        if (!body && !document) {
            logger.info("WhatsApp message event skipped because it is not text or document content", {
                accountId: account.input.accountId,
                source,
            });
            return;
        }

        let documentBase64: string | null = null;
        if (document) {
            const declaredSize = Number(document.fileLength ?? 0);
            if (declaredSize > workerConfig.maxMediaBytes) {
                logger.warn("WhatsApp media skipped because it exceeds the worker limit", {
                    accountId: account.input.accountId,
                    declaredSize,
                    maxMediaBytes: workerConfig.maxMediaBytes,
                });
                return;
            }
            const buffer = await downloadMediaMessage(message, "buffer", {});
            if (buffer.byteLength > workerConfig.maxMediaBytes) {
                logger.warn("WhatsApp media skipped because it exceeds the worker limit", {
                    accountId: account.input.accountId,
                    actualSize: buffer.byteLength,
                    maxMediaBytes: workerConfig.maxMediaBytes,
                });
                return;
            }
            documentBase64 = buffer.toString("base64");
        }

        await this.reportMessageEvent(account.input.accountId, {
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
            ...classifyMessageEvent(Boolean(message.key.fromMe), source),
        });
        logger.info("WhatsApp message event reported to Ganatri", {
            accountId: account.input.accountId,
            direction: message.key.fromMe ? "outbound" : "inbound",
            messageType: document ? "document" : "text",
            source,
        });
    }

    private rememberMessage(account: ManagedAccount, message: WAMessage): void {
        if (!message.key.id) return;
        account.messageStore.set(messageStoreKey(message.key), message);
        while (account.messageStore.size > workerConfig.messageStoreLimit) {
            const oldest = account.messageStore.keys().next().value;
            if (typeof oldest !== "string") break;
            account.messageStore.delete(oldest);
        }
    }

    private async resolvePhoneChatId(account: ManagedAccount, message: WAMessage): Promise<{
        phoneJid: string | null;
        remoteJidType: string;
        remoteJidAltType: string;
        resolution: "phone_jid" | "alternate_phone_jid" | "lid_mapping" | "unresolved";
    }> {
        const remoteJid = message.key.remoteJid;
        const remoteJidAlt = message.key.remoteJidAlt;
        const candidates = [message.key.remoteJidAlt, message.key.remoteJid];
        for (const [index, candidate] of candidates.entries()) {
            const match = candidate ? phoneJidPattern.exec(candidate) : null;
            if (match) {
                return {
                    phoneJid: `${match[1]}@s.whatsapp.net`,
                    remoteJidType: jidType(remoteJid),
                    remoteJidAltType: jidType(remoteJidAlt),
                    resolution: index === 0 ? "alternate_phone_jid" : "phone_jid",
                };
            }
        }

        if (!remoteJid?.endsWith("@lid")) {
            return {
                phoneJid: null,
                remoteJidType: jidType(remoteJid),
                remoteJidAltType: jidType(remoteJidAlt),
                resolution: "unresolved",
            };
        }
        const phoneJid = await account.socket?.signalRepository.lidMapping.getPNForLID(remoteJid);
        const match = phoneJid ? phoneJidPattern.exec(phoneJid) : null;
        return {
            phoneJid: match ? `${match[1]}@s.whatsapp.net` : null,
            remoteJidType: jidType(remoteJid),
            remoteJidAltType: jidType(remoteJidAlt),
            resolution: match ? "lid_mapping" : "unresolved",
        };
    }

    private async requestKnownChatHistory(account: ManagedAccount, socket: WASocket): Promise<void> {
        const oldestByChat = new Map<string, HistoryCursor>();
        let persistedAnchorCount = 0;
        const rememberAnchor = (externalChatId: string, cursor: HistoryCursor): void => {
            const match = phoneJidPattern.exec(externalChatId);
            if (!match) return;
            const phoneJid = `${match[1]}@s.whatsapp.net`;
            const existing = oldestByChat.get(phoneJid);
            if (!existing || cursor.messageTimestamp < existing.messageTimestamp) {
                oldestByChat.set(phoneJid, cursor);
            }
        };

        if (this.getHistoryAnchors) {
            try {
                const persistedAnchors = await this.getHistoryAnchors(account.input.accountId);
                persistedAnchorCount = persistedAnchors.length;
                for (const anchor of persistedAnchors) {
                    const lidJid = await account.socket?.signalRepository.lidMapping.getLIDForPN(anchor.externalChatId);
                    rememberAnchor(anchor.externalChatId, {
                        key: {
                            remoteJid: lidJid ?? anchor.externalChatId,
                            remoteJidAlt: lidJid ? anchor.externalChatId : undefined,
                            id: anchor.providerMessageId,
                            fromMe: anchor.fromMe,
                        },
                        messageTimestamp: anchor.messageTimestamp,
                    });
                }
            } catch {
                logger.warn("Unable to load persisted WhatsApp history anchors", {
                    accountId: account.input.accountId,
                });
            }
        }

        for (const message of account.messageStore.values()) {
            if (message.messageTimestamp == null) continue;

            const resolution = await this.resolvePhoneChatId(account, message);
            if (!resolution.phoneJid) continue;
            rememberAnchor(resolution.phoneJid, {
                key: message.key,
                messageTimestamp: Number(message.messageTimestamp),
            });
        }

        logger.info("Requesting WhatsApp history for known individual chats", {
            accountId: account.input.accountId,
            chatCount: oldestByChat.size,
            messageCount: account.messageStore.size,
            persistedAnchorCount,
        });

        for (const [phoneJid, initialCursor] of oldestByChat) {
            let cursor = initialCursor;
            for (let page = 1; page <= maxHistoryPagesPerChat; page += 1) {
                const historyPage = this.waitForHistoryPage(account);
                try {
                    await socket.fetchMessageHistory(historyPageSize, cursor.key, cursor.messageTimestamp);
                    logger.info("WhatsApp chat history request sent", {
                        accountId: account.input.accountId,
                        chat: phoneJid.replace(/\d/g, "#"),
                        count: historyPageSize,
                        page,
                    });
                } catch {
                    this.cancelHistoryPageWaiter(account);
                    logger.warn("WhatsApp chat history request failed", {
                        accountId: account.input.accountId,
                        chat: phoneJid.replace(/\d/g, "#"),
                        page,
                    });
                    break;
                }

                const returnedMessages = await historyPage;
                const matchingMessages: WAMessage[] = [];
                for (const message of returnedMessages) {
                    if (message.messageTimestamp == null) continue;
                    const resolution = await this.resolvePhoneChatId(account, message);
                    if (resolution.phoneJid === phoneJid) matchingMessages.push(message);
                }
                const nextCursor = matchingMessages.reduce<HistoryCursor | null>((oldest, message) => {
                    const candidate = {
                        key: message.key,
                        messageTimestamp: Number(message.messageTimestamp),
                    } satisfies HistoryCursor;
                    return !oldest || candidate.messageTimestamp < oldest.messageTimestamp ? candidate : oldest;
                }, null);

                logger.info("WhatsApp chat history page received", {
                    accountId: account.input.accountId,
                    chat: phoneJid.replace(/\d/g, "#"),
                    page,
                    messageCount: matchingMessages.length,
                });

                if (!nextCursor || nextCursor.messageTimestamp > cursor.messageTimestamp || nextCursor.key.id === cursor.key.id) {
                    break;
                }
                cursor = nextCursor;
            }
        }
    }

    private waitForHistoryPage(account: ManagedAccount): Promise<WAMessage[]> {
        return new Promise(resolve => {
            const timeout = setTimeout(() => {
                if (account.historyPageWaiter !== resolvePage) return;
                account.historyPageWaiter = null;
                logger.warn("Timed out waiting for WhatsApp chat history page", {
                    accountId: account.input.accountId,
                });
                resolve([]);
            }, historyPageTimeoutMs);
            const resolvePage = (messages: WAMessage[]) => {
                clearTimeout(timeout);
                resolve(messages);
            };
            account.historyPageWaiter = resolvePage;
        });
    }

    private cancelHistoryPageWaiter(account: ManagedAccount): void {
        account.historyPageWaiter = null;
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
            const shouldFetchHistory = account.historySyncRequested;
            account.historySyncRequested = false;
            if (!shouldFetchHistory) {
                account.syncInProgress = false;
            }
            account.status = "connected";
            account.qrImageDataUrl = null;
            account.lastErrorCode = null;
            account.reconnectAttempt = 0;
            await this.report(account);
            if (shouldFetchHistory) {
                void this.requestKnownChatHistory(account, socket)
                    .catch(() => {
                        logger.warn("Unable to request WhatsApp history for known chats", {
                            accountId: account.input.accountId,
                        });
                    })
                    .finally(() => {
                        account.syncInProgress = false;
                    });
            }
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
            account.syncInProgress = false;
            account.status = "disconnected";
            account.qrImageDataUrl = null;
            await this.report(account);
            return;
        }

        if (code === DisconnectReason.loggedOut || code === DisconnectReason.badSession) {
            account.syncInProgress = false;
            account.status = "revoked";
            account.lastErrorCode = code === DisconnectReason.loggedOut ? "logged_out" : "bad_session";
            account.qrImageDataUrl = null;
            await clearEncryptedAuthState(accountDirectory(account.input.accountId));
            await this.report(account);
            return;
        }

        account.status = "failed";
        account.syncInProgress = false;
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
