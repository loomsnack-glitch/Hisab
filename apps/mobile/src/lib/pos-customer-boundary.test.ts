import { describe, expect, it } from "bun:test";
import { normalizePosCustomerCreatePayload } from "./pos-customer-boundary";

describe("POS Customer boundary", () => {
    it("normalizes a minimal Customer create payload", () => {
        expect(normalizePosCustomerCreatePayload("  Asha  ", "9876543210")).toEqual({
            kind: "valid",
            payload: { name: "Asha", phone: "+919876543210" },
        });
    });

    it("rejects missing names and invalid optional phones", () => {
        expect(normalizePosCustomerCreatePayload("   ", "")).toEqual({ kind: "invalid", field: "name" });
        expect(normalizePosCustomerCreatePayload("Asha", "12345")).toEqual({ kind: "invalid", field: "phone" });
    });
});
