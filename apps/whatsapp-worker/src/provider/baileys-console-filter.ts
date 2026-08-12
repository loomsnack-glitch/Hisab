type ConsoleMethod = "info" | "warn" | "error";

export type ConsoleLike = Record<ConsoleMethod, (...args: unknown[]) => void>;

const SENSITIVE_LIBSIGNAL_PREFIXES = [
    "Closing session:",
    "Opening session:",
    "Session already closed",
    "Session error:",
    "Removing old closed session:",
    "Unhandled bucket type (for naming):",
] as const;

const isSensitiveLibsignalLog = (args: unknown[]): boolean => {
    const message = args[0];
    return typeof message === "string"
        && SENSITIVE_LIBSIGNAL_PREFIXES.some(prefix => message.startsWith(prefix));
};

export const installBaileysConsoleFilter = (target: ConsoleLike = console): void => {
    for (const method of ["info", "warn", "error"] as const) {
        const original = target[method];
        target[method] = (...args: unknown[]) => {
            if (isSensitiveLibsignalLog(args)) return;
            original.apply(target, args);
        };
    }
};
