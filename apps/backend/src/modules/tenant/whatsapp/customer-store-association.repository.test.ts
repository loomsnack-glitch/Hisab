import { SQL } from "bun";
import { describe, expect, test } from "bun:test";
import { recordCustomerStoreActivityInDatabase } from "./customer-store-association.repository";

const databaseTest = process.env.DATABASE_URL ? test : test.skip;

describe("Customer Store activity recorder", () => {
  databaseTest("deduplicates events and keeps the latest activity summary without losing origin", async () => {
    const database = new SQL({ url: process.env.DATABASE_URL });
    const [scope] = await database`
      SELECT store.organization_id, store.id AS store_id, customer.id AS customer_id, store.created_by
      FROM stores store
      INNER JOIN customers customer ON customer.organization_id = store.organization_id
      WHERE customer.phone IS NOT NULL
      ORDER BY store.created_at, customer.created_at
      LIMIT 1
    `;
    if (!scope) throw new Error("Development database has no Store and Customer probe scope");

    const rollback = "customer-store-association-rollback-probe";
    try {
      await database.begin(async (transaction) => {
        const base = {
          organizationId: String(scope.organization_id),
          customerId: String(scope.customer_id),
          storeId: String(scope.store_id),
          createdBy: String(scope.created_by),
        };
        const first = await recordCustomerStoreActivityInDatabase(transaction, {
          ...base,
          source: "customer_creation",
          sourceReference: "probe-created",
          occurredAt: "2026-09-17T10:00:00.000Z",
        });
        const duplicate = await recordCustomerStoreActivityInDatabase(transaction, {
          ...base,
          source: "customer_creation",
          sourceReference: "probe-created",
          occurredAt: "2026-09-17T09:00:00.000Z",
        });
        const older = await recordCustomerStoreActivityInDatabase(transaction, {
          ...base,
          source: "sale_completed",
          sourceReference: "probe-older-sale",
          occurredAt: "2026-09-17T09:30:00.000Z",
        });
        const newer = await recordCustomerStoreActivityInDatabase(transaction, {
          ...base,
          source: "bill_delivery",
          sourceReference: "probe-newer-bill",
          occurredAt: "2026-09-17T11:00:00.000Z",
        });
        const [eventCount] = await transaction`
          SELECT COUNT(*) AS count
          FROM whatsapp_customer_store_activity_events
          WHERE association_id = ${first.id}
        `;

        expect(duplicate.id).toBe(first.id);
        expect(older.originSource).toBe("customer_creation");
        expect(newer.lastActivitySource).toBe("bill_delivery");
        expect(newer.lastActivitySourceReference).toBe("probe-newer-bill");
        expect(Number(eventCount.count)).toBe(3);
        throw new Error(rollback);
      });
    } catch (error) {
      if (!(error instanceof Error) || error.message !== rollback) throw error;
    } finally {
      await database.close();
    }
  });
});
