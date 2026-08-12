const required = (name: string): string => {
    const value = process.env[name]?.trim();
    if (!value) {
        throw new Error(name + " is required");
    }
    return value;
};

const integer = (name: string, fallback: number, minimum: number): number => {
    const value = Number(process.env[name] ?? fallback);
    if (!Number.isInteger(value) || value < minimum) {
        throw new Error(`${name} must be an integer greater than or equal to ${minimum}`);
    }
    return value;
};

const boolean = (name: string, fallback: boolean): boolean => {
    const value = (process.env[name] ?? String(fallback)).trim().toLowerCase();
    if (value === "true") return true;
    if (value === "false") return false;
    throw new Error(`${name} must be true or false`);
};

const workerId = process.env.WHATSAPP_WORKER_ID?.trim() || `worker-${process.pid}`;
if (!/^[a-zA-Z0-9._-]{1,100}$/.test(workerId)) {
    throw new Error("WHATSAPP_WORKER_ID must contain only letters, numbers, dots, underscores, and hyphens");
}

export const workerConfig = {
    host: process.env.WHATSAPP_WORKER_HOST?.trim() || "127.0.0.1",
    port: Number(process.env.WHATSAPP_WORKER_PORT || 8100),
    apiUrl: required("WHATSAPP_API_URL").replace(/\/+$/, ""),
    workerToken: required("WHATSAPP_WORKER_TOKEN"),
    authStateDirectory: process.env.WHATSAPP_AUTH_STATE_DIRECTORY?.trim() || "./data/whatsapp-auth",
    authEncryptionKey: required("WHATSAPP_AUTH_ENCRYPTION_KEY"),
    workerId,
    partitionCount: integer("WHATSAPP_WORKER_PARTITION_COUNT", 1, 1),
    partitionIndex: integer("WHATSAPP_WORKER_PARTITION_INDEX", 0, 0),
    dispatchConcurrency: integer("WHATSAPP_WORKER_DISPATCH_CONCURRENCY", 2, 1),
    reconnectBaseDelayMs: 2_000,
    reconnectMaxDelayMs: 60_000,
    qrTtlMs: 120_000,
    dispatchPollIntervalMs: 2_000,
    dispatchErrorDelayMs: 5_000,
    shutdownTimeoutMs: integer("WHATSAPP_WORKER_SHUTDOWN_TIMEOUT_MS", 30_000, 1_000),
    operationsRefreshIntervalMs: integer("WHATSAPP_WORKER_OPERATIONS_REFRESH_MS", 15_000, 1_000),
    syncFullHistory: boolean("WHATSAPP_SYNC_FULL_HISTORY", true),
    messageStoreLimit: integer("WHATSAPP_MESSAGE_STORE_LIMIT", 2_000, 100),
};

if (!Number.isInteger(workerConfig.port) || workerConfig.port < 1 || workerConfig.port > 65_535) {
    throw new Error("WHATSAPP_WORKER_PORT must be a valid TCP port");
}

if (workerConfig.partitionIndex >= workerConfig.partitionCount) {
    throw new Error("WHATSAPP_WORKER_PARTITION_INDEX must be less than WHATSAPP_WORKER_PARTITION_COUNT");
}

if (Buffer.byteLength(workerConfig.authEncryptionKey, "utf8") < 32) {
    throw new Error("WHATSAPP_AUTH_ENCRYPTION_KEY must be at least 32 bytes");
}
