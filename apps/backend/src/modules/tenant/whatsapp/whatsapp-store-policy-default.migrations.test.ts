import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(import.meta.dir, "../../../../db/migrations/20260917110000_default_whatsapp_store_policy.sql"),
  "utf8",
);

describe("Store WhatsApp default policy migration", () => {
  test("creates a disabled policy after every new Store", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION create_default_whatsapp_store_policy()");
    expect(migration).toContain("AFTER INSERT ON stores");
    expect(migration).toContain("'disabled'");
    expect(migration).toContain("ON CONFLICT (organization_id, store_id, revision) DO NOTHING");
  });

  test("down migration removes only the default-policy trigger and function", () => {
    const down = migration.slice(migration.indexOf("-- migrate:down"));
    expect(down).toContain("DROP TRIGGER IF EXISTS stores_create_default_whatsapp_store_policy ON stores");
    expect(down).toContain("DROP FUNCTION IF EXISTS create_default_whatsapp_store_policy()");
    expect(down).not.toContain("DROP TABLE");
    expect(down).not.toContain("whatsapp_accounts");
  });
});
