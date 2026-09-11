import { SQL } from "bun";
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(import.meta.dir, "../../../../db/migrations/20260907100000_create_store_category_presentations.sql"),
  "utf8",
);
const backfill = readFileSync(
  resolve(import.meta.dir, "../../../../db/migrations/20260907110000_backfill_missing_store_category_presentations.sql"),
  "utf8",
);

const upMigration = (sql: string) => {
  const upStart = sql.indexOf("-- migrate:up");
  const downStart = sql.indexOf("-- migrate:down");
  if (upStart < 0 || downStart < 0) {
    throw new Error("Store Category Presentation migration is missing its up statements");
  }
  return sql.slice(upStart + "-- migrate:up".length, downStart).trim();
};

const initialMigration = upMigration(migration).replace(
  "CREATE TABLE store_category_presentations",
  "CREATE TEMP TABLE store_category_presentations",
);
const missingPairBackfill = upMigration(backfill);
const databaseTest = process.env.DATABASE_URL ? test : test.skip;

describe("Store Category Presentation migrations", () => {
  databaseTest("executes the rollout and missing-pair backfills without overwriting existing presentations", async () => {
    const database = new SQL({ url: process.env.DATABASE_URL });
    const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const storeOneId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const storeTwoId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const categoryOneId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
    const categoryTwoId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
    const userId = "ffffffff-ffff-4fff-8fff-ffffffffffff";

    try {
      await database.begin(async (tx) => {
        await tx`CREATE TEMP TABLE organizations (id UUID PRIMARY KEY) ON COMMIT DROP`;
        await tx`CREATE TEMP TABLE users (id UUID PRIMARY KEY) ON COMMIT DROP`;
        await tx`DO $$ BEGIN CREATE TYPE category_status_enum AS ENUM ('active', 'inactive'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`;
        await tx`CREATE TEMP TABLE categories (
          id UUID NOT NULL,
          organization_id UUID NOT NULL,
          name VARCHAR(255) NOT NULL,
          sort_order INTEGER NOT NULL,
          status category_status_enum NOT NULL,
          created_by UUID NOT NULL,
          updated_by UUID,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE (id, organization_id)
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
        await tx`INSERT INTO categories (id, organization_id, name, sort_order, status, created_by) VALUES
          (${categoryOneId}, ${organizationId}, 'Mains', 0, 'active', ${userId}),
          (${categoryTwoId}, ${organizationId}, 'Drinks', 1, 'active', ${userId})`;

        await tx.unsafe(initialMigration);
        const initialRows = await tx`
          SELECT store_id, category_id, visible, sort_order
          FROM store_category_presentations
          ORDER BY store_id, category_id
        `;
        expect(initialRows).toHaveLength(4);
        expect(initialRows).toContainEqual(expect.objectContaining({
          store_id: storeOneId,
          category_id: categoryOneId,
          visible: true,
          sort_order: 0,
        }));

        await tx`
          UPDATE store_category_presentations
          SET visible = FALSE, sort_order = 9
          WHERE store_id = ${storeOneId} AND category_id = ${categoryOneId}
        `;
        await tx`
          DELETE FROM store_category_presentations
          WHERE store_id = ${storeTwoId} AND category_id = ${categoryTwoId}
        `;

        await tx.unsafe(missingPairBackfill);

        const finalRows = await tx`
          SELECT store_id, category_id, visible, sort_order
          FROM store_category_presentations
          ORDER BY store_id, category_id
        `;
        expect(finalRows).toHaveLength(4);
        expect(finalRows).toContainEqual(expect.objectContaining({
          store_id: storeOneId,
          category_id: categoryOneId,
          visible: false,
          sort_order: 9,
        }));
        expect(finalRows).toContainEqual(expect.objectContaining({
          store_id: storeTwoId,
          category_id: categoryTwoId,
          visible: true,
          sort_order: 1,
        }));
      });
    } finally {
      await database.close();
    }
  });
});
