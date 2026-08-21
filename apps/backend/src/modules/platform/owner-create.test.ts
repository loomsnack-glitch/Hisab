import { describe, expect, test } from "bun:test";
import type { OwnerUserRecord } from "@repo/types";

import { assertNoOwnerCreateArguments, runOwnerCreate } from "./owner-create";

const password = "correct horse battery staple";

const createHarness = (existing: OwnerUserRecord[] = []) => {
    const records = [...existing];
    const output: string[] = [];
    const answers = [" Asha ", " Shah ", "+91 98765 43210"];

    return {
        records,
        output,
        command: () => runOwnerCreate({
            promptText: async () => answers.shift() ?? "",
            promptPassword: async () => password,
            write: (message) => output.push(message),
            repository: {
                createSeedOwnerUser: async (input) => {
                    if (records.some((record) => record.phone === input.phone)) {
                        return { status: "duplicate-phone" } as const;
                    }
                    if (records.length > 0) {
                        return { status: "already-seeded" } as const;
                    }
                    const record: OwnerUserRecord = {
                        ...input,
                        createdAt: "2026-08-20T00:00:00.000Z",
                        updatedAt: "2026-08-20T00:00:00.000Z",
                    };
                    records.push(record);
                    return { status: "created", ownerUser: record } as const;
                },
            },
            hashPassword: Bun.password.hash,
            createId: () => "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        }),
    };
};

describe("Seed Owner User command", () => {
    test("creates the first active Owner User with a normalized phone and password hash", async () => {
        const harness = createHarness();
        const exitCode = await harness.command();

        expect(exitCode).toBe(0);
        expect(harness.records).toHaveLength(1);
        expect(harness.records[0]).toMatchObject({
            firstName: "Asha",
            lastName: "Shah",
            phone: "+919876543210",
            isActive: true,
        });
        expect(harness.records[0]?.passwordHash).not.toBe(password);
        expect(await Bun.password.verify(password, harness.records[0]?.passwordHash ?? "")).toBe(true);
        expect(harness.output.join(" ")).not.toContain(password);
    });

    test("fails safely when the normalized phone is already present", async () => {
        const existing = await createHarness().command();
        expect(existing).toBe(0);

        const original = createHarness();
        await original.command();
        const duplicate = createHarness(original.records);
        const exitCode = await duplicate.command();

        expect(exitCode).toBe(1);
        expect(duplicate.records).toHaveLength(1);
        expect(duplicate.output.join(" ")).toContain("already exists");
        expect(duplicate.output.join(" ")).not.toContain(password);
    });

    test("rejects command-line arguments so a password cannot enter shell history", () => {
        expect(() => assertNoOwnerCreateArguments([])).not.toThrow();
        expect(() => assertNoOwnerCreateArguments(["--password", password])).toThrow(
            "does not accept command-line arguments",
        );
    });

    test("reports the safe database error details for unexpected persistence failures", async () => {
        const output: string[] = [];
        const exitCode = await runOwnerCreate({
            promptText: async (label) => label.startsWith("WhatsApp") ? "7990176865" : label.startsWith("First") ? "Dev" : "Jariwala",
            promptPassword: async () => password,
            write: (message) => output.push(message),
            repository: {
                createSeedOwnerUser: async () => {
                    throw Object.assign(new Error('relation "console_users" does not exist'), { code: "42P01" });
                },
            },
            hashPassword: Bun.password.hash,
            createId: () => "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        });

        expect(exitCode).toBe(1);
        expect(output.join(" ")).toContain('database error 42P01: relation "console_users" does not exist');
        expect(output.join(" ")).not.toContain(password);
    });
});
