import { describe, expect, it } from "bun:test";
import { usePosPaymentStore } from "./pos-payment.store";

describe("POS Payment store", () => {
    it("keeps rows scoped and preserves edits through the same scope", () => {
        usePosPaymentStore.getState().clear();
        const scope = "org-1:store-1:device-1";
        usePosPaymentStore.getState().initialize(scope, 100);
        const rowId = usePosPaymentStore.getState().rows[0]!.id;
        usePosPaymentStore.getState().updateRow(scope, rowId, { method: "upi", amount: "60" });
        usePosPaymentStore.getState().addRow(scope);

        expect(usePosPaymentStore.getState().rows).toHaveLength(2);
        expect(usePosPaymentStore.getState().rows[0]).toMatchObject({ method: "upi", amount: "60" });
        usePosPaymentStore.getState().updateRow("other-scope", rowId, { amount: "1" });
        expect(usePosPaymentStore.getState().rows[0]?.amount).toBe("60");
    });

    it("resets rows when the session scope changes or is cleared", () => {
        usePosPaymentStore.getState().clear();
        usePosPaymentStore.getState().initialize("org-1:store-1:device-1", 100);
        usePosPaymentStore.getState().initialize("org-1:store-2:device-2", 80);

        expect(usePosPaymentStore.getState().scopeKey).toBe("org-1:store-2:device-2");
        expect(usePosPaymentStore.getState().rows[0]?.amount).toBe("80");
        usePosPaymentStore.getState().clear();
        expect(usePosPaymentStore.getState().rows).toEqual([]);
    });
});
