const required = (name: string): string => {
    const value = process.env[name]?.trim();
    if (!value) {
        throw new Error(name + " is required");
    }
    return value;
};

export const workerConfig = {
    host: process.env.WHATSAPP_WORKER_HOST?.trim() || "127.0.0.1",
    port: Number(process.env.WHATSAPP_WORKER_PORT || 8100),
    apiUrl: required("WHATSAPP_API_URL").replace(/\/+$/, ""),
    workerToken: required("WHATSAPP_WORKER_TOKEN"),
    authStateDirectory: process.env.WHATSAPP_AUTH_STATE_DIRECTORY?.trim() || "./data/whatsapp-auth",
    authEncryptionKey: required("WHATSAPP_AUTH_ENCRYPTION_KEY"),
    reconnectBaseDelayMs: 2_000,
    reconnectMaxDelayMs: 60_000,
    qrTtlMs: 120_000,
    dispatchPollIntervalMs: 2_000,
    dispatchErrorDelayMs: 5_000,
};

if (!Number.isInteger(workerConfig.port) || workerConfig.port < 1 || workerConfig.port > 65_535) {
    throw new Error("WHATSAPP_WORKER_PORT must be a valid TCP port");
}

if (Buffer.byteLength(workerConfig.authEncryptionKey, "utf8") < 32) {
    throw new Error("WHATSAPP_AUTH_ENCRYPTION_KEY must be at least 32 bytes");
}
