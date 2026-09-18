import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const migration = readFileSync(new URL("../../../../../db/migrations/20260918120000_whatsapp_conversation_reply_outbox.sql", import.meta.url), "utf8");

describe("Cloud conversation reply outbox migration", () => {
    test("adds a distinct durable reply kind without destructive down migration", () => {
        expect(migration).toContain("ALTER TYPE whatsapp_outbox_kind_enum ADD VALUE IF NOT EXISTS 'conversation_reply'");
        expect(migration).toContain("PostgreSQL enum values cannot be removed safely");
    });
});
