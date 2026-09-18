import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const migration = readFileSync(new URL("../../../../db/migrations/20260918110000_create_whatsapp_delivery_operator_actions.sql", import.meta.url), "utf8");

describe("WhatsApp delivery operator action migration", () => {
  test("retains scoped retry/resend audit records without storing message bodies", () => {
    expect(migration).toContain("CREATE TABLE whatsapp_delivery_operator_actions");
    expect(migration).toContain("organization_id UUID NOT NULL");
    expect(migration).toContain("store_id UUID NOT NULL");
    expect(migration).toContain("source_outbox_id UUID");
    expect(migration).toContain("outbox_id UUID NOT NULL");
    expect(migration).toContain("action IN ('retry', 'resend')");
    expect(migration).toContain("jsonb_typeof(details) = 'object'");
    expect(migration).not.toContain("body TEXT");
    expect(migration).not.toContain("access_token");
  });
});
