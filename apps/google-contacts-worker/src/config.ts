const required = (name: string): string => {
    const value = process.env[name]?.trim() ?? "";
    if (!value) throw new Error(`${name} is required`);
    return value;
};

const boundedInteger = (name: string, fallback: number, min: number, max: number): number => {
    const raw = Number(process.env[name] ?? fallback);
    if (!Number.isFinite(raw)) return fallback;
    return Math.min(Math.max(Math.trunc(raw), min), max);
};

export const googleContactsWorkerConfig = {
    apiUrl: (process.env.GOOGLE_CONTACTS_API_URL?.trim() || "http://127.0.0.1:8001/api").replace(/\/+$/, ""),
    token: required("GOOGLE_CONTACTS_WORKER_TOKEN"),
    workerId: process.env.GOOGLE_CONTACTS_WORKER_ID?.trim() || "google-contacts-worker-0",
    pollIntervalMs: boundedInteger("GOOGLE_CONTACTS_WORKER_POLL_INTERVAL_MS", 5_000, 500, 60_000),
};
