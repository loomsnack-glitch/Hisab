import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = (name: string) =>
  readFileSync(resolve(import.meta.dir, "../../../../db/migrations", name), "utf8");

describe("Google Contacts migration layering", () => {
  test("reconciles the nonce objects duplicated across published migrations", () => {
    const createConnection = migration(
      "20260826120000_create_google_contacts_connection.sql",
    );
    const nonce = migration(
      "20260826140000_add_google_contacts_oauth_attempt_nonce.sql",
    );

    expect(createConnection).toContain("oauth_attempt_nonce_hash VARCHAR(64)");
    expect(nonce).toContain("ADD COLUMN IF NOT EXISTS oauth_attempt_nonce_hash");
    expect(nonce).toContain("IF NOT EXISTS (");
  });

  test("can reconcile the intent migration when a schema was partially advanced", () => {
    const intent = migration(
      "20260826150000_add_google_contacts_oauth_attempt_intent.sql",
    );

    expect(intent).toContain("ADD COLUMN IF NOT EXISTS oauth_attempt_intent");
    expect(intent).toContain("IF NOT EXISTS (");
  });
});
