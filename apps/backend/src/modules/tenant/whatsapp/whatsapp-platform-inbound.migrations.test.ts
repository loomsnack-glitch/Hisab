import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(import.meta.dir, "../../../../db/migrations/20260918100000_create_whatsapp_platform_inbound_messages.sql"),
  "utf8",
);

describe("platform inbound retention migration", () => {
  test("creates an internal-only normalized table without Organization scope", () => {
    expect(migration).toContain("CREATE TABLE whatsapp_platform_inbound_messages");
    expect(migration).toContain("sender_key = 'ganatri_utility'");
    expect(migration).toContain("UNIQUE (sender_key, provider_message_id)");
    expect(migration).toContain("COMMENT ON TABLE whatsapp_platform_inbound_messages");
    expect(migration).not.toContain("organization_id UUID");
    expect(migration).not.toContain("whatsapp_conversations");
  });

  test("bounds normalized PII and message content at the database boundary", () => {
    expect(migration).toContain("contact_phone_number ~ '^[+][1-9][0-9]{7,14}$'");
    expect(migration).toContain("LENGTH(body) <= 4096");
    expect(migration).toContain("message_type = 'text'");
  });

  test("down migration removes only the internal table and indexes", () => {
    const down = migration.slice(migration.indexOf("-- migrate:down"));
    expect(down).toContain("DROP TABLE IF EXISTS whatsapp_platform_inbound_messages");
    expect(down).not.toContain("whatsapp_accounts");
    expect(down).not.toContain("whatsapp_messages");
  });
});
