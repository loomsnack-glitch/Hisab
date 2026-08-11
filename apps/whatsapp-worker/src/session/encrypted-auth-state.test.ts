import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { useEncryptedAuthState } from "./encrypted-auth-state.js";

describe("encrypted WhatsApp auth state", () => {
    test("persists credentials without writing plaintext auth material", async () => {
        const directory = await mkdtemp(join(tmpdir(), "ganatri-whatsapp-auth-"));
        try {
            const first = await useEncryptedAuthState(directory, "a".repeat(32));
            first.state.creds.registered = true;
            await first.saveCreds();

            const raw = await readFile(join(directory, "creds.json"), "utf8");
            expect(raw).not.toContain("registered");

            const second = await useEncryptedAuthState(directory, "a".repeat(32));
            expect(second.state.creds.registered).toBe(true);
        } finally {
            await rm(directory, { recursive: true, force: true });
        }
    });
});
