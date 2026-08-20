import { createInterface } from "node:readline/promises";
import { runOwnerCreate, assertNoOwnerCreateArguments } from "@/modules/platform/owner-create";
import * as ownerUserRepository from "@/modules/platform/owner-user.repository";

const promptText = async (label: string) => {
    const readline = createInterface({ input: process.stdin, output: process.stdout });
    try {
        return await readline.question(label);
    } finally {
        readline.close();
    }
};

const promptPassword = async (label: string): Promise<string> => {
    if (!process.stdin.isTTY || !process.stdout.isTTY || !process.stdin.setRawMode) {
        throw new Error("A secure interactive terminal is required");
    }

    return new Promise((resolve, reject) => {
        let value = "";
        const cleanup = () => {
            process.stdin.off("data", onData);
            process.stdin.setRawMode(false);
            process.stdin.pause();
        };
        const onData = (data: Buffer) => {
            const input = data.toString("utf8");
            for (const character of input) {
                if (character === "\u0003") {
                    cleanup();
                    process.stdout.write("\n");
                    reject(new Error("Owner User creation cancelled"));
                    return;
                }
                if (character === "\r" || character === "\n") {
                    cleanup();
                    process.stdout.write("\n");
                    resolve(value);
                    return;
                }
                if (character === "\u0008" || character === "\u007f") {
                    value = value.slice(0, -1);
                    continue;
                }
                if (character >= " ") {
                    value += character;
                }
            }
        };

        process.stdout.write(label);
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.on("data", onData);
    });
};

try {
    assertNoOwnerCreateArguments(process.argv.slice(2));
    const exitCode = await runOwnerCreate({
        promptText,
        promptPassword,
        write: (message) => process.stdout.write(`${message}\n`),
        repository: ownerUserRepository,
        hashPassword: Bun.password.hash,
        createId: crypto.randomUUID,
    });
    process.exitCode = exitCode;
} catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : "Owner User creation failed"}\n`);
    process.exitCode = 1;
}
