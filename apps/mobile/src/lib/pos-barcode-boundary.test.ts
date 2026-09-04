import { describe, expect, it } from "bun:test";
import type { ProductResponseDTO } from "@repo/types";
import {
    normalizePosBarcodeData,
    resolvePosProductCode,
    shouldAcceptPosBarcodeScan,
} from "./pos-barcode-boundary";

const product = (overrides: Partial<ProductResponseDTO> = {}) =>
    ({
        id: "product-1",
        organizationId: "organization-1",
        categoryId: "category-1",
        name: "Masala Tea",
        price: 40,
        discount: 0,
        imagePath: null,
        imageSignedUrl: null,
        productType: "single",
        productCode: "8901234567890",
        productCodeKind: "manufacturer",
        status: "active",
        createdBy: "user-1",
        updatedBy: null,
        createdAt: "2026-08-10T00:00:00.000Z",
        updatedAt: "2026-08-10T00:00:00.000Z",
        ...overrides,
    }) as ProductResponseDTO;

describe("mobile POS barcode boundary", () => {
    it("normalizes scanner whitespace without changing the Product Code", () => {
        expect(normalizePosBarcodeData(" 8901234567890\n")).toBe("8901234567890");
        expect(resolvePosProductCode(" 8901234567890 ", [product()])).toEqual({
            kind: "product",
            product: product(),
            productCode: "8901234567890",
        });
    });

    it("resolves only an exact Product Code from the server Product list", () => {
        expect(resolvePosProductCode("890123456789", [product()]).kind).toBe("unknown");
        expect(resolvePosProductCode("missing", [product()])).toEqual({
            kind: "unknown",
            productCode: "missing",
        });
    });

    it("does not silently choose when Product Codes are duplicated", () => {
        expect(resolvePosProductCode("8901234567890", [product(), product({ id: "product-2" })])).toEqual({
            kind: "ambiguous",
            productCode: "8901234567890",
        });
    });

    it("rejects empty data and repeated callbacks during the cooldown", () => {
        expect(shouldAcceptPosBarcodeScan({ data: " ", lastAcceptedData: null, lastAcceptedAt: null, now: 100 })).toBe(false);
        expect(shouldAcceptPosBarcodeScan({ data: "8901234567890", lastAcceptedData: null, lastAcceptedAt: null, now: 100 })).toBe(true);
        expect(shouldAcceptPosBarcodeScan({ data: " 8901234567890 ", lastAcceptedData: "8901234567890", lastAcceptedAt: 100, now: 1_299, cooldownMs: 1_200 })).toBe(false);
        expect(shouldAcceptPosBarcodeScan({ data: " 8901234567890 ", lastAcceptedData: "8901234567890", lastAcceptedAt: 100, now: 1_300, cooldownMs: 1_200 })).toBe(true);
    });
});
