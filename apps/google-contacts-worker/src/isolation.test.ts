import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Google Contacts worker isolation", () => {
    test("does not import or start the WhatsApp worker", () => {
        const root = join(import.meta.dir, "..");
        const index = readFileSync(join(root, "src/index.ts"), "utf8");
        const client = readFileSync(join(root, "src/api-client.ts"), "utf8");
        const source = index + client;

        expect(source).not.toContain("whatsapp");
        expect(source).not.toContain("WhatsApp");
        expect(source).toContain("/internal/google-contacts/outbox/process-next");
    });
});
