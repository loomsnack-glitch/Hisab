import { afterEach, describe, expect, test } from "bun:test";
import { api } from "../../api";
import { getPosSales } from "./pos.service";

describe("POS billing client service", () => {
    const originalGet = api.get;

    afterEach(() => {
        api.get = originalGet;
    });

    test("sends payment method filters as a CSV query string instead of paymentMethods[]", async () => {
        let params: unknown;
        api.get = (async (_url: string, config?: { params?: unknown }) => {
            params = config?.params;
            return { data: { status: "success", data: null } };
        }) as typeof api.get;

        await getPosSales({
            paymentMethods: ["cash", "upi"],
        });

        expect(params).toEqual({
            paymentMethods: "cash,upi",
        });
    });
});
