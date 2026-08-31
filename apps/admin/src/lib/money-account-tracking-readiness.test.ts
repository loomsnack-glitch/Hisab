import { describe, expect, test } from "bun:test";
import type { MoneyAccountDTO, MoneyAccountPaymentRouteDTO } from "@repo/types";

import { getStoreMoneyAccountTrackingReadiness } from "./money-account-tracking-readiness";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const storeId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const now = new Date("2026-08-31T12:00:00.000Z");
const userId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const cashAccount: MoneyAccountDTO = {
    id: "77777777-7777-4777-8777-777777777777",
    organizationId,
    name: "Adajan cash",
    type: "cash",
    scope: "store_scoped",
    storeId,
    notes: null,
    status: "active",
    openingBalance: 0,
    balance: 0,
    hasMovements: false,
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

const bankAccount: MoneyAccountDTO = {
    ...cashAccount,
    id: "11111111-1111-4111-8111-111111111111",
    name: "HDFC Current",
    type: "bank",
    scope: "organization_wide",
    storeId: null,
};

const upiRoute: MoneyAccountPaymentRouteDTO = {
    id: "12121212-1212-4121-8121-121212121212",
    organizationId,
    storeId,
    paymentMethod: "upi",
    moneyAccountId: bankAccount.id,
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

describe("Store Money Account Tracking readiness", () => {
    test("reports missing Cash and unset Card while UPI is ready", () => {
        const readiness = getStoreMoneyAccountTrackingReadiness(storeId, [bankAccount], [upiRoute]);

        expect(readiness.cash).toEqual({ state: "missing" });
        expect(readiness.upi).toEqual({ state: "ready", accountName: "HDFC Current" });
        expect(readiness.card).toEqual({ state: "missing" });
    });

    test("flags an inactive routed destination for repair without hiding it", () => {
        const readiness = getStoreMoneyAccountTrackingReadiness(
            storeId,
            [{ ...bankAccount, status: "inactive" }, cashAccount],
            [upiRoute, { ...upiRoute, id: "13131313-1313-4131-8131-131313131313", paymentMethod: "card" }],
        );

        expect(readiness.cash).toEqual({ state: "ready", accountName: "Adajan cash" });
        expect(readiness.upi).toEqual({
            state: "inactive_destination",
            accountName: "HDFC Current",
        });
        expect(readiness.card).toEqual({
            state: "inactive_destination",
            accountName: "HDFC Current",
        });
    });
});
