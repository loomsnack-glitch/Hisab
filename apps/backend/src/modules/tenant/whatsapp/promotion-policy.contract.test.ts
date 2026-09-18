import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./promotion.ts", import.meta.url), "utf8");

describe("Organization Cloud promotion admission boundary", () => {
    test("uses the current policy-selected account instead of an arbitrary Store account", () => {
        expect(source).toContain("policy.whatsappAccountId");
        expect(source).toContain("repository.getAccountById(policy.whatsappAccountId)");
        expect(source).toContain("account.assignedStoreIds.includes(storeId)");
        expect(source).not.toContain("repository.getAccount(organizationId, storeId)");
    });

    test("limits eligible marketing recipients to the selected Store relationship", () => {
        expect(source).toContain("eligiblePromotionCustomers = async (organizationId: string, storeId: string)");
        expect(source).toContain("whatsapp_customer_store_associations association");
        expect(source).toContain("association.store_id = ${storeId}");
        expect(source).toContain("marketing_opted_in = TRUE");
        expect(source).toContain("marketing_opted_out = FALSE");
        expect(source).toContain("whatsapp_suppressed = FALSE");
    });
});
