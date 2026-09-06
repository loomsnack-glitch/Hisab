import { SQL } from "bun";
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(
    import.meta.dir,
    "../../../../db/migrations/20260906110000_create_store_vendor_availability.sql",
  ),
  "utf8",
);

const upMigration = (sql: string) => {
  const upStart = sql.indexOf("-- migrate:up");
  const downStart = sql.indexOf("-- migrate:down");
  if (upStart < 0 || downStart < 0) {
    throw new Error("Store Vendor Availability migration is missing its up statements");
  }
  return sql.slice(upStart + "-- migrate:up".length, downStart).trim();
};

const up = upMigration(migration);
const availabilityBackfillStart = up.indexOf("INSERT INTO store_vendor_availabilities");
const offeringBackfillStart = up.indexOf("INSERT INTO store_vendor_item_offerings");
if (availabilityBackfillStart < 0 || offeringBackfillStart < 0) {
  throw new Error("Store Vendor Availability migration is missing its backfill inserts");
}

const availabilityBackfill = up.slice(availabilityBackfillStart, offeringBackfillStart).trim();
const offeringBackfill = up.slice(offeringBackfillStart).trim();
const databaseTest = process.env.DATABASE_URL ? test : test.skip;

describe("Store Vendor Availability migrations", () => {
  databaseTest("assigns existing Vendors and Vendor Item prices to every current Store without overwriting later defaults", async () => {
    const database = new SQL({ url: process.env.DATABASE_URL });
    const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const storeOneId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const storeTwoId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const vendorId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
    const vendorItemId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
    const userId = "ffffffff-ffff-4fff-8fff-ffffffffffff";

    try {
      await database.begin(async (tx) => {
        await tx`CREATE TEMP TABLE vendors (
          id UUID NOT NULL,
          organization_id UUID NOT NULL,
          created_by UUID NOT NULL,
          updated_by UUID
        ) ON COMMIT DROP`;
        await tx`CREATE TEMP TABLE stores (
          id UUID NOT NULL,
          organization_id UUID NOT NULL
        ) ON COMMIT DROP`;
        await tx`CREATE TEMP TABLE vendor_items (
          id UUID NOT NULL,
          organization_id UUID NOT NULL,
          vendor_id UUID NOT NULL,
          default_purchase_price NUMERIC(10, 2) NOT NULL,
          created_by UUID NOT NULL,
          updated_by UUID
        ) ON COMMIT DROP`;
        await tx`CREATE TEMP TABLE store_vendor_availabilities (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID NOT NULL,
          store_id UUID NOT NULL,
          vendor_id UUID NOT NULL,
          created_by UUID NOT NULL,
          updated_by UUID,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
        ) ON COMMIT DROP`;
        await tx`CREATE TEMP TABLE store_vendor_item_offerings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID NOT NULL,
          store_id UUID NOT NULL,
          vendor_id UUID NOT NULL,
          vendor_item_id UUID NOT NULL,
          default_purchase_price NUMERIC(10, 2) NOT NULL,
          created_by UUID NOT NULL,
          updated_by UUID,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
        ) ON COMMIT DROP`;

        await tx`INSERT INTO stores (id, organization_id) VALUES
          (${storeOneId}, ${organizationId}),
          (${storeTwoId}, ${organizationId})`;
        await tx`INSERT INTO vendors (id, organization_id, created_by) VALUES
          (${vendorId}, ${organizationId}, ${userId})`;
        await tx`INSERT INTO vendor_items (id, organization_id, vendor_id, default_purchase_price, created_by) VALUES
          (${vendorItemId}, ${organizationId}, ${vendorId}, 40.50, ${userId})`;

        await tx.unsafe(availabilityBackfill);
        await tx.unsafe(offeringBackfill);

        const initialAvailabilities = await tx`
          SELECT store_id, vendor_id
          FROM store_vendor_availabilities
          ORDER BY store_id
        `;
        expect(initialAvailabilities).toHaveLength(2);
        const initialOfferings = await tx`
          SELECT store_id, vendor_item_id, default_purchase_price
          FROM store_vendor_item_offerings
          ORDER BY store_id
        `;
        expect(initialOfferings).toHaveLength(2);
        expect(initialOfferings).toContainEqual(expect.objectContaining({
          store_id: storeOneId,
          vendor_item_id: vendorItemId,
          default_purchase_price: "40.50",
        }));

        await tx`
          UPDATE store_vendor_item_offerings
          SET default_purchase_price = 38
          WHERE store_id = ${storeOneId} AND vendor_item_id = ${vendorItemId}
        `;
        await tx`
          DELETE FROM store_vendor_item_offerings
          WHERE store_id = ${storeTwoId} AND vendor_item_id = ${vendorItemId}
        `;
        await tx`
          DELETE FROM store_vendor_availabilities
          WHERE store_id = ${storeTwoId} AND vendor_id = ${vendorId}
        `;

        await tx.unsafe(availabilityBackfill);
        await tx.unsafe(offeringBackfill);

        const availabilities = await tx`
          SELECT store_id, vendor_id
          FROM store_vendor_availabilities
          ORDER BY store_id
        `;
        expect(availabilities).toHaveLength(2);
        const offerings = await tx`
          SELECT store_id, vendor_item_id, default_purchase_price
          FROM store_vendor_item_offerings
          ORDER BY store_id
        `;
        expect(offerings).toHaveLength(2);
        expect(offerings).toContainEqual(expect.objectContaining({
          store_id: storeOneId,
          vendor_item_id: vendorItemId,
          default_purchase_price: "38.00",
        }));
        expect(offerings).toContainEqual(expect.objectContaining({
          store_id: storeTwoId,
          vendor_item_id: vendorItemId,
          default_purchase_price: "40.50",
        }));
      });
    } finally {
      await database.end();
    }
  });
});
