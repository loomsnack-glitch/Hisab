export const logger = {
    info(message: string, metadata?: Record<string, string | number | boolean>) {
        console.log(JSON.stringify({ level: "info", message, ...metadata }));
    },
    warn(message: string, metadata?: Record<string, string | number | boolean>) {
        console.warn(JSON.stringify({ level: "warn", message, ...metadata }));
    },
    error(message: string, metadata?: Record<string, string | number | boolean>) {
        console.error(JSON.stringify({ level: "error", message, ...metadata }));
    },
};
