import { describe, expect, it } from "bun:test";
import { installBaileysConsoleFilter, type ConsoleLike } from "./baileys-console-filter.js";

describe("Baileys console filter", () => {
    it("suppresses libsignal session objects without hiding normal logs", () => {
        const output: Array<{ method: string; args: unknown[] }> = [];
        const target: ConsoleLike = {
            info: (...args) => output.push({ method: "info", args }),
            warn: (...args) => output.push({ method: "warn", args }),
            error: (...args) => output.push({ method: "error", args }),
        };

        installBaileysConsoleFilter(target);
        target.info("Closing session:", { privateKey: "must-not-be-logged" });
        target.warn("Session error:Error: Bad MAC", new Error("Bad MAC"));
        target.warn("Removing old closed session:", { rootKey: "must-not-be-logged" });
        target.warn("Unhandled bucket type (for naming):", { session: "must-not-be-logged" });
        target.error("worker failure", { accountId: "account-1" });

        expect(output).toEqual([
            { method: "error", args: ["worker failure", { accountId: "account-1" }] },
        ]);
    });
});
