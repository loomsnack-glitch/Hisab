import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(import.meta.dir, "../../../../db/migrations/20260917120000_create_customer_store_associations.sql"),
  "utf8",
);

describe("Customer Store association migration", () => {
  test("creates the approved activity sources and unique tenant association", () => {
    expect(migration).toContain("CREATE TYPE whatsapp_customer_store_activity_source_enum AS ENUM");
    expect(migration).toContain("'migration'");
    expect(migration).toContain("'customer_creation'");
    expect(migration).toContain("'sale_completed'");
    expect(migration).toContain("'whatsapp_conversation'");
    expect(migration).toContain("'explicit_attachment'");
    expect(migration).toContain("'bill_delivery'");
    expect(migration).toContain("CREATE TABLE whatsapp_customer_store_associations");
    expect(migration).toContain("UNIQUE (organization_id, customer_id, store_id)");
    expect(migration).toContain("CREATE TABLE whatsapp_customer_store_activity_events");
    expect(migration).toContain("UNIQUE (association_id, source, source_reference)");
  });

  test("anchors both tables to the same Organization, Customer, and Store", () => {
    expect(migration).toContain("REFERENCES customers(id, organization_id) ON DELETE CASCADE");
    expect(migration).toContain("REFERENCES stores(id, organization_id) ON DELETE CASCADE");
    expect(migration).toContain("REFERENCES whatsapp_customer_store_associations(id, organization_id, customer_id, store_id)");
  });

  test("down migration removes only the association objects", () => {
    const down = migration.slice(migration.indexOf("-- migrate:down"));
    expect(down).toContain("DROP TABLE IF EXISTS whatsapp_customer_store_activity_events");
    expect(down).toContain("DROP TABLE IF EXISTS whatsapp_customer_store_associations");
    expect(down).toContain("DROP TYPE IF EXISTS whatsapp_customer_store_activity_source_enum");
    expect(down).not.toContain("whatsapp_accounts");
    expect(down).not.toContain("whatsapp_outbox");
  });
});
