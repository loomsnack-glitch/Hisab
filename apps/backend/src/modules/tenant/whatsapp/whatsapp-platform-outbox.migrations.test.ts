import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(import.meta.dir, "../../../../db/migrations/20260918090000_platform_sender_outbox_representation.sql"),
  "utf8",
);

describe("platform sender outbox migration", () => {
  test("adds an explicit sender kind and preserves Organization account invariants", () => {
    expect(migration).toContain("CREATE TYPE whatsapp_outbox_sender_kind_enum");
    expect(migration).toContain("'organization_account'");
    expect(migration).toContain("'ganatri_platform'");
    expect(migration).toContain("sender_kind = 'organization_account'");
    expect(migration).toContain("whatsapp_account_id IS NOT NULL");
  });

  test("supports account-less platform messages with a durable non-secret snapshot", () => {
    expect(migration).toContain("ALTER COLUMN whatsapp_account_id DROP NOT NULL");
    expect(migration).toContain("ALTER COLUMN conversation_id DROP NOT NULL");
    expect(migration).toContain("recipient_phone_number VARCHAR(20)");
    expect(migration).toContain("platform_sender_snapshot JSONB");
    expect(migration).toContain("jsonb_typeof(platform_sender_snapshot) = 'object'");
    expect(migration).toContain("FOREIGN KEY (message_id, organization_id, store_id)");
  });

  test("requires exactly one message sender reference", () => {
    expect(migration).toContain("whatsapp_account_id IS NOT NULL");
    expect(migration).toContain("whatsapp_account_id IS NULL");
    expect(migration).toContain("platform_sender_key = 'ganatri_utility'");
  });

  test("adds platform idempotency and invoice uniqueness without changing old rows", () => {
    expect(migration).toContain("whatsapp_messages_platform_idempotency_key");
    expect(migration).toContain("whatsapp_outbox_platform_invoice_key");
    expect(migration).toContain("sender_kind = 'ganatri_platform'");
    expect(migration).toContain("platform_sender_key = 'ganatri_utility'");
    expect(migration).not.toContain("UPDATE whatsapp_accounts");
    expect(migration).not.toContain("DELETE FROM whatsapp_");
  });

  test("down migration refuses to discard platform records", () => {
    expect(migration).toContain("Cannot roll back platform sender representation while platform records exist");
    expect(migration).toContain("ALTER COLUMN whatsapp_account_id SET NOT NULL");
    expect(migration).toContain("DROP TYPE IF EXISTS whatsapp_outbox_sender_kind_enum");
  });
});
