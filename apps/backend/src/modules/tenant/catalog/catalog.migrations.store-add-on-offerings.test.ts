import { SQL } from "bun";
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(import.meta.dir, "../../../../db/migrations/20260907120000_create_store_add_on_offerings.sql"),
  "utf8",
);
const backfill = readFileSync(
  resolve(import.meta.dir, "../../../../db/migrations/20260907130000_backfill_missing_store_add_on_offerings.sql"),
  "utf8",
);

const upMigration = (sql: string) => {
  const upStart = sql.indexOf("-- migrate:up");
  const downStart = sql.indexOf("-- migrate:down");
  if (upStart < 0 || downStart < 0) {
    throw new Error("Store Add-On Offering migration is missing its up statements");
  }
  return sql.slice(upStart + "-- migrate:up".length, downStart).trim();
};

const initialMigration = upMigration(migration).replace(
  "CREATE TABLE store_add_on_offerings",
  "CREATE TEMP TABLE store_add_on_offerings",
);
const missingPairBackfill = upMigration(backfill);
const databaseTest = process.env.DATABASE_URL ? test : test.skip;

describe("Store Add-On Offering migrations", () => {
  databaseTest("executes the rollout and missing-pair backfills without overwriting existing offerings", async () => {
    const database = new SQL({ url: process.env.DATABASE_URL });
    const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const storeOneId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const storeTwoId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const addOnOneId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
    const addOnTwoId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
    const userId = "ffffffff-ffff-4fff-8fff-ffffffffffff";

    try {
      await database.begin(async (tx) => {
        await tx`CREATE TEMP TABLE organizations (id UUID PRIMARY KEY) ON COMMIT DROP`;
        await tx`CREATE TEMP TABLE users (id UUID PRIMARY KEY) ON COMMIT DROP`;
        await tx`DO $$ BEGIN CREATE TYPE add_on_status_enum AS ENUM ('active', 'inactive'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`;
        await tx`CREATE TEMP TABLE add_ons (
          id UUID NOT NULL,
          organization_id UUID NOT NULL,
          name VARCHAR(255) NOT NULL,
          price NUMERIC(10, 2) NOT NULL,
          discount NUMERIC(10, 2) NOT NULL,
          status add_on_status_enum NOT NULL,
          created_by UUID NOT NULL,
          updated_by UUID,
          UNIQUE (id, organization_id),
          UNIQUE (organization_id, name)
        ) ON COMMIT DROP`;
        await tx`CREATE TEMP TABLE stores (
          id UUID NOT NULL,
          organization_id UUID NOT NULL,
          UNIQUE (id, organization_id)
        ) ON COMMIT DROP`;
        await tx`INSERT INTO organizations (id) VALUES (${organizationId})`;
        await tx`INSERT INTO users (id) VALUES (${userId})`;
        await tx`INSERT INTO stores (id, organization_id) VALUES
          (${storeOneId}, ${organizationId}),
          (${storeTwoId}, ${organizationId})`;
        await tx`INSERT INTO add_ons (id, organization_id, name, price, discount, status, created_by) VALUES
          (${addOnOneId}, ${organizationId}, 'Cheese', 20, 2, 'active', ${userId}),
          (${addOnTwoId}, ${organizationId}, 'Mayo', 10, 0, 'inactive', ${userId})`;

        await tx.unsafe(initialMigration);
        const initialRows = await tx`
          SELECT store_id, add_on_id, price, discount, price_override, discount_override, status
          FROM store_add_on_offerings
          ORDER BY store_id, add_on_id
        `;
        expect(initialRows).toHaveLength(4);
        expect(initialRows).toContainEqual(expect.objectContaining({
          store_id: storeOneId,
          add_on_id: addOnOneId,
          price: "20.00",
          discount: "2.00",
          price_override: null,
          discount_override: null,
          status: "active",
        }));

        await tx`
          UPDATE store_add_on_offerings
          SET price = 25, discount = 3, price_override = 25, discount_override = 3, status = 'active'
          WHERE store_id = ${storeOneId} AND add_on_id = ${addOnOneId}
        `;
        await tx`
          DELETE FROM store_add_on_offerings
          WHERE store_id = ${storeTwoId} AND add_on_id = ${addOnTwoId}
        `;

        await tx.unsafe(missingPairBackfill);
        const rows = await tx`
          SELECT store_id, add_on_id, price, discount, price_override, discount_override, status
          FROM store_add_on_offerings
          ORDER BY store_id, add_on_id
        `;
        expect(rows).toHaveLength(4);
        expect(rows).toContainEqual(expect.objectContaining({
          store_id: storeOneId,
          add_on_id: addOnOneId,
          price: "25.00",
          discount: "3.00",
          price_override: "25.00",
          discount_override: "3.00",
          status: "active",
        }));
        expect(rows).toContainEqual(expect.objectContaining({
          store_id: storeTwoId,
          add_on_id: addOnTwoId,
          price: "10.00",
          discount: "0.00",
          price_override: null,
          discount_override: null,
          status: "inactive",
        }));
      });
    } finally {
      await database.end();
    }
  });
});
