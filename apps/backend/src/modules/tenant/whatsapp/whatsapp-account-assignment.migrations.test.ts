import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(resolve(import.meta.dir, "../../../../db/migrations/20260816170000_organization_whatsapp_accounts.sql"), "utf8");
const hardeningMigration = readFileSync(resolve(import.meta.dir, "../../../../db/migrations/20260822090000_harden_whatsapp_cloud_account_foundation.sql"), "utf8");
const repository = readFileSync(resolve(import.meta.dir, "whatsapp.repository.ts"), "utf8");

describe("Organization WhatsApp assignment boundary", () => {
  test("enforces one linked account per Store and one default inbound Store per phone", () => {
    expect(migration).toContain("CREATE TABLE whatsapp_account_stores");
    expect(migration).toContain("CREATE UNIQUE INDEX whatsapp_account_stores_one_store_account_key");
    expect(migration).toContain("CREATE UNIQUE INDEX whatsapp_account_stores_one_default_store_key");
    expect(hardeningMigration).toContain("CREATE CONSTRAINT TRIGGER whatsapp_account_stores_default_store_trigger");
    expect(hardeningMigration).toContain("DEFERRABLE INITIALLY DEFERRED");
  });

  test("keeps assignment mutations serialized and chooses the oldest remaining default", () => {
    expect(repository).toContain("FROM whatsapp_accounts");
    expect(repository).toContain("FOR UPDATE");
    expect(repository).toContain("ORDER BY created_at ASC, store_id ASC");
    expect(repository).toContain("WhatsAppStoreAccountConflictError");
  });

  test("does not rewrite historical messages or accounts in the assignment migration", () => {
    expect(migration).not.toContain("DELETE FROM whatsapp_messages");
    expect(migration).not.toContain("DELETE FROM whatsapp_outbox");
    expect(migration).not.toContain("DROP TABLE whatsapp_accounts");
  });
});
