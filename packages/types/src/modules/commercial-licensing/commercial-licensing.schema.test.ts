import { describe, expect, test } from "bun:test";

import { StoreCommercialStatusDTOSchema } from "./commercial-licensing.schema";

describe("Store commercial status contract", () => {
    test("accepts an eligible Store with no current access", () => {
        const parsed = StoreCommercialStatusDTOSchema.parse({
            storeId: "11111111-1111-4111-8111-111111111111",
            organizationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            timezone: "Asia/Kolkata",
            baseAccess: null,
            scheduledSuccessor: null,
            activeAddOns: [],
            trial: {
                eligible: true,
                message: "This Store can start the standard Trial Plan once.",
            },
            entitlements: {
                storeId: "11111111-1111-4111-8111-111111111111",
                features: [],
            },
        });

        expect(parsed.trial.eligible).toBe(true);
        expect(parsed.baseAccess).toBeNull();
        expect(parsed.activeAddOns).toEqual([]);
    });
});
