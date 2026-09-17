import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(import.meta.dir, "../../../../db/migrations/20260917100000_create_whatsapp_store_policies.sql"),
  "utf8",
);

const upMigration = (sql: string) => {
  const upStart = sql.indexOf("-- migrate:up");
  const downStart = sql.indexOf("-- migrate:down");
  if (upStart < 0 || downStart < 0) {
    throw new Error("Store WhatsApp policy migration is missing its up/down sections");
  }
  return sql.slice(upStart + "-- migrate:up".length, downStart).trim();
};

const downMigration = migration.slice(migration.indexOf("-- migrate:down") + "-- migrate:down".length).trim();
const up = upMigration(migration);

describe("Store WhatsApp policy migration", () => {
  test("creates the three approved modes and one-current-row history index", () => {
    expect(up).toContain("CREATE TYPE whatsapp_store_policy_mode_enum AS ENUM");
    expect(up).toContain("'disabled'");
    expect(up).toContain("'ganatri_utility'");
    expect(up).toContain("'organization_cloud'");
    expect(up).toContain("CREATE TABLE whatsapp_store_policies");
    expect(up).toContain("UNIQUE (organization_id, store_id, revision)");
    expect(up).toContain("CREATE UNIQUE INDEX whatsapp_store_policies_one_current_store_key");
    expect(up).toContain("WHERE effective_to IS NULL");
  });

  test("anchors policy rows to the same Organization and enforces mode/account consistency", () => {
    expect(up).toContain("REFERENCES stores(id, organization_id) ON DELETE CASCADE");
    expect(up).toContain("REFERENCES whatsapp_accounts(id, organization_id) ON DELETE RESTRICT");
    expect(up).toContain("mode = 'organization_cloud' AND whatsapp_account_id IS NOT NULL");
    expect(up).toContain("mode IN ('disabled', 'ganatri_utility') AND whatsapp_account_id IS NULL");
  });

  test("backfills existing Stores as disabled without touching existing WhatsApp data", () => {
    expect(up).toContain("INSERT INTO whatsapp_store_policies");
    expect(up).toContain("FROM stores");
    expect(up).toContain("ON CONFLICT (organization_id, store_id, revision) DO NOTHING");
    expect(up).not.toContain("UPDATE whatsapp_accounts");
    expect(up).not.toContain("DELETE FROM whatsapp_");
  });

  test("down migration removes only the policy objects", () => {
    expect(downMigration).toContain("DROP TABLE IF EXISTS whatsapp_store_policies");
    expect(downMigration).toContain("DROP TYPE IF EXISTS whatsapp_store_policy_mode_enum");
    expect(downMigration).not.toContain("whatsapp_accounts");
    expect(downMigration).not.toContain("whatsapp_messages");
    expect(downMigration).not.toContain("whatsapp_outbox");
  });
});
