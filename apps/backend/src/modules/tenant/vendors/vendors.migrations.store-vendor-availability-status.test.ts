import { SQL } from "bun";
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(
    import.meta.dir,
    "../../../../db/migrations/20260906120000_store_vendor_availability_status.sql",
  ),
  "utf8",
);

const upMigration = (sql: string) => {
  const upStart = sql.indexOf("-- migrate:up");
  const downStart = sql.indexOf("-- migrate:down");
  if (upStart < 0 || downStart < 0) {
    throw new Error("Store Vendor Availability status migration is missing its up statements");
  }
  return sql.slice(upStart + "-- migrate:up".length, downStart).trim();
};

const up = upMigration(migration);
const databaseTest = process.env.DATABASE_URL ? test : test.skip;

describe("Store Vendor Availability status migrations", () => {
  test("adds status without rewriting the original availability table migration", () => {
    const original = readFileSync(
      resolve(
        import.meta.dir,
        "../../../../db/migrations/20260906110000_create_store_vendor_availability.sql",
      ),
      "utf8",
    );

    expect(original).not.toContain("status TEXT");
    expect(up).toContain("ADD COLUMN IF NOT EXISTS status");
    expect(up).toContain("'inactive'");
    expect(up).not.toContain("DELETE FROM store_vendor_availabilities");
  });

  databaseTest("backfills missing Vendor x Store pairs as inactive and preserves existing Store prices", async () => {
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
        await tx`INSERT INTO store_vendor_availabilities (
          organization_id, store_id, vendor_id, created_by
        ) VALUES (${organizationId}, ${storeOneId}, ${vendorId}, ${userId})`;
        await tx`INSERT INTO store_vendor_item_offerings (
          organization_id, store_id, vendor_id, vendor_item_id, default_purchase_price, created_by
        ) VALUES (${organizationId}, ${storeOneId}, ${vendorId}, ${vendorItemId}, 38.00, ${userId})`;

        await tx.unsafe(up);

        const availabilities = await tx`
          SELECT store_id, vendor_id, status
          FROM store_vendor_availabilities
          ORDER BY store_id
        `;
        expect(availabilities).toHaveLength(2);
        expect(availabilities).toContainEqual(expect.objectContaining({
          store_id: storeOneId,
          vendor_id: vendorId,
          status: "active",
        }));
        expect(availabilities).toContainEqual(expect.objectContaining({
          store_id: storeTwoId,
          vendor_id: vendorId,
          status: "inactive",
        }));

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
