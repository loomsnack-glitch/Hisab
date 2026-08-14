import { describe, expect, test } from "bun:test";

import { pg } from "@/config/db";
import { getCustomersByOrganizationId } from "./billing.repository";

const integrationTest = process.env.CUSTOMER_SEARCH_INTEGRATION === "true" ? test : test.skip;

describe("customer repository search", () => {
    integrationTest("returns only customers matching the search term", async () => {
        const [fixture] = await pg`
            SELECT organization_id, name
            FROM customers
            WHERE name IS NOT NULL
            ORDER BY created_at DESC, id DESC
            LIMIT 1
        `;

        expect(fixture).toBeDefined();

        const result = await getCustomersByOrganizationId(fixture.organization_id as string, {
            search: fixture.name as string,
            status: "all",
            limit: 40,
        });

        expect(result.customers.length).toBeGreaterThan(0);
        expect(result.customers.every((customer) => customer.name === fixture.name)).toBe(true);
    });
});
