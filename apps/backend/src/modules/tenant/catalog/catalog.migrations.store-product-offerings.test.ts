import { SQL } from "bun";
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(import.meta.dir, "../../../../db/migrations/20260906090000_create_store_product_offerings.sql"),
  "utf8",
);
const backfill = readFileSync(
  resolve(import.meta.dir, "../../../../db/migrations/20260906100000_backfill_missing_store_product_offerings.sql"),
  "utf8",
);
const overrideExpansion = readFileSync(
  resolve(
    import.meta.dir,
    "../../../../db/migrations/20260907090000_expand_store_product_offering_overrides.sql",
  ),
  "utf8",
);

const upMigration = (sql: string) => {
  const upStart = sql.indexOf("-- migrate:up");
  const downStart = sql.indexOf("-- migrate:down");
  if (upStart < 0 || downStart < 0) {
    throw new Error("Store Product Offering migration is missing its up statements");
  }
  return sql.slice(upStart + "-- migrate:up".length, downStart).trim();
};

const initialMigration = upMigration(migration).replace(
  "CREATE TABLE store_product_offerings",
  "CREATE TEMP TABLE store_product_offerings",
);
const missingPairBackfill = upMigration(backfill);
const overrideExpansionMigration = upMigration(overrideExpansion);
const databaseTest = process.env.DATABASE_URL ? test : test.skip;

describe("Store Product Offering migrations", () => {
  databaseTest("executes the rollout and missing-pair backfills without overwriting existing offerings", async () => {
    const database = new SQL({ url: process.env.DATABASE_URL });
    const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const storeOneId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const storeTwoId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const productOneId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
    const productTwoId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
    const userId = "ffffffff-ffff-4fff-8fff-ffffffffffff";

    try {
      await database.begin(async (tx) => {
        await tx`CREATE TEMP TABLE organizations (id UUID PRIMARY KEY) ON COMMIT DROP`;
        await tx`CREATE TEMP TABLE users (id UUID PRIMARY KEY) ON COMMIT DROP`;
        await tx`DO $$ BEGIN CREATE TYPE product_status_enum AS ENUM ('active', 'inactive'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`;
        await tx`CREATE TEMP TABLE products (
          id UUID NOT NULL,
          organization_id UUID NOT NULL,
          price NUMERIC(10, 2) NOT NULL,
          discount NUMERIC(10, 2) NOT NULL,
          status product_status_enum NOT NULL,
          created_by UUID NOT NULL,
          updated_by UUID,
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
        await tx`INSERT INTO products (id, organization_id, price, discount, status, created_by) VALUES
          (${productOneId}, ${organizationId}, 100, 10, 'active', ${userId}),
          (${productTwoId}, ${organizationId}, 200, 20, 'inactive', ${userId})`;

        await tx.unsafe(initialMigration);
        const initialRows = await tx`
          SELECT store_id, product_id, price, discount, status
          FROM store_product_offerings
          ORDER BY store_id, product_id
        `;
        expect(initialRows).toHaveLength(4);
        expect(initialRows).toContainEqual(expect.objectContaining({
          store_id: storeOneId,
          product_id: productOneId,
          price: "100.00",
          discount: "10.00",
          status: "active",
        }));

        await tx`
          UPDATE store_product_offerings
          SET price = 173, discount = 13, status = 'active'
          WHERE store_id = ${storeOneId} AND product_id = ${productOneId}
        `;
        await tx`
          DELETE FROM store_product_offerings
          WHERE store_id = ${storeTwoId} AND product_id = ${productTwoId}
        `;

        await tx.unsafe(missingPairBackfill);
        const rows = await tx`
          SELECT store_id, product_id, price, discount, status
          FROM store_product_offerings
          ORDER BY store_id, product_id
        `;
        expect(rows).toHaveLength(4);
        expect(rows).toContainEqual(expect.objectContaining({
          store_id: storeOneId,
          product_id: productOneId,
          price: "173.00",
          discount: "13.00",
          status: "active",
        }));
        expect(rows).toContainEqual(expect.objectContaining({
          store_id: storeTwoId,
          product_id: productTwoId,
          price: "200.00",
          discount: "20.00",
          status: "inactive",
        }));
      });
    } finally {
      await database.end();
    }
  });

  databaseTest("infers inherited and overridden commercial values without changing effective prices", async () => {
    const database = new SQL({ url: process.env.DATABASE_URL });
    const organizationId = "11111111-1111-4111-8111-111111111111";
    const storeOneId = "22222222-2222-4222-8222-222222222222";
    const storeTwoId = "33333333-3333-4333-8333-333333333333";
    const productOneId = "44444444-4444-4444-8444-444444444444";
    const userId = "55555555-5555-4555-8555-555555555555";

    try {
      await database.begin(async (tx) => {
        await tx`CREATE TEMP TABLE organizations (id UUID PRIMARY KEY) ON COMMIT DROP`;
        await tx`CREATE TEMP TABLE users (id UUID PRIMARY KEY) ON COMMIT DROP`;
        await tx`DO $$ BEGIN CREATE TYPE product_status_enum AS ENUM ('active', 'inactive'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`;
        await tx`CREATE TEMP TABLE products (
          id UUID NOT NULL,
          organization_id UUID NOT NULL,
          price NUMERIC(10, 2) NOT NULL,
          discount NUMERIC(10, 2) NOT NULL,
          status product_status_enum NOT NULL,
          created_by UUID NOT NULL,
          updated_by UUID,
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
        await tx`INSERT INTO products (id, organization_id, price, discount, status, created_by) VALUES
          (${productOneId}, ${organizationId}, 100, 10, 'active', ${userId})`;

        await tx.unsafe(initialMigration);
        await tx`
          UPDATE store_product_offerings
          SET price = 173, discount = 13
          WHERE store_id = ${storeOneId} AND product_id = ${productOneId}
        `;

        await tx.unsafe(overrideExpansionMigration);

        const rows = await tx`
          SELECT store_id, price, discount, price_override, discount_override
          FROM store_product_offerings
          WHERE product_id = ${productOneId}
          ORDER BY store_id
        `;

        expect(rows).toHaveLength(2);
        expect(rows[0]).toEqual(
          expect.objectContaining({
            store_id: storeOneId,
            price: "173.00",
            discount: "13.00",
            price_override: "173.00",
            discount_override: "13.00",
          }),
        );
        expect(rows[1]).toEqual(
          expect.objectContaining({
            store_id: storeTwoId,
            price: "100.00",
            discount: "10.00",
            price_override: null,
            discount_override: null,
          }),
        );
      });
    } finally {
      await database.end();
    }
  });
});
