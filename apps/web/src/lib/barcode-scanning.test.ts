import { describe, expect, test } from "bun:test";
import type { ProductResponseDTO } from "@repo/types";

import {
    consumeDirectBarcodeScanKey,
    incrementPlainProductQuantity,
    resolveProductCodeScan,
    shouldCaptureDirectBarcodeScan,
} from "./barcode-scanning";
import { getProductCardAction } from "./product-card-interaction";

const product = (overrides: Partial<ProductResponseDTO> = {}) =>
    ({
        id: "product-1",
        organizationId: "organization-1",
        categoryId: "category-1",
        name: "Milk",
        price: 42,
        discount: 0,
        imagePath: null,
        imageSignedUrl: null,
        productType: "single",
        productCode: "0012345678905",
        productCodeKind: "manufacturer",
        status: "active",
        createdBy: "user-1",
        updatedBy: null,
        createdAt: "2026-08-10T00:00:00.000Z",
        updatedAt: "2026-08-10T00:00:00.000Z",
        ...overrides,
    }) as ProductResponseDTO;

describe("barcode scanning", () => {
    test("resolves an exact active Product Code without accepting prices or discounts from the scan", () => {
        expect(resolveProductCodeScan("0012345678905", [product()], [])).toEqual({
            kind: "product",
            product: product(),
            productCode: "0012345678905",
        });
        expect(resolveProductCodeScan("12345678905", [product()], []).kind).toBe("unknown");
    });

    test("identifies inactive and unknown codes without a billable Product", () => {
        expect(resolveProductCodeScan("inactive-code", [product()], [
            { productCode: "inactive-code", productName: "Retired milk" },
        ])).toEqual({
            kind: "inactive",
            productCode: "inactive-code",
            productName: "Retired milk",
        });
        expect(resolveProductCodeScan("not-configured", [product()], [])).toEqual({
            kind: "unknown",
            productCode: "not-configured",
        });
        expect(resolveProductCodeScan("0012345678905", [product(), product({ id: "product-2" })], [])).toEqual({
            kind: "ambiguous",
            productCode: "0012345678905",
        });
    });

    test("increments a simple Product by one whole unit for each intentional scan", () => {
        const first = incrementPlainProductQuantity([{ key: "plain", productId: "product-1", quantity: 1 }], "plain");
        const second = incrementPlainProductQuantity(first ?? [], "plain");

        expect(second).toEqual([{ key: "plain", productId: "product-1", quantity: 3 }]);
    });

    test("leaves configuration to the existing Product action after a configurable Product resolves", () => {
        const result = resolveProductCodeScan("0012345678905", [product()], []);

        expect(result.kind).toBe("product");
        if (result.kind === "product") {
            expect(getProductCardAction(result.product, { hasAddOns: true })).toBe("customize");
        }
    });

    test("does not capture direct scanner input while normal fields or dialogs own focus", () => {
        expect(
            shouldCaptureDirectBarcodeScan({
                enabled: true,
                scanFieldOwnsFocus: false,
                unrelatedEditableFieldOwnsFocus: false,
                dialogOwnsFocus: false,
            }),
        ).toBe(true);
        expect(
            shouldCaptureDirectBarcodeScan({
                enabled: true,
                scanFieldOwnsFocus: false,
                unrelatedEditableFieldOwnsFocus: true,
                dialogOwnsFocus: false,
            }),
        ).toBe(false);
        expect(
            shouldCaptureDirectBarcodeScan({
                enabled: true,
                scanFieldOwnsFocus: false,
                unrelatedEditableFieldOwnsFocus: false,
                dialogOwnsFocus: true,
            }),
        ).toBe(false);
        expect(
            shouldCaptureDirectBarcodeScan({
                enabled: false,
                scanFieldOwnsFocus: false,
                unrelatedEditableFieldOwnsFocus: false,
                dialogOwnsFocus: false,
            }),
        ).toBe(false);
    });

    test("frames each HID scan at Enter without debouncing consecutive scans", () => {
        const first = ["0", "0", "1"].reduce((buffer, key) => consumeDirectBarcodeScanKey(buffer, key).buffer, "");
        const firstComplete = consumeDirectBarcodeScanKey(first, "Enter");
        const second = ["0", "0", "2"].reduce((buffer, key) => consumeDirectBarcodeScanKey(buffer, key).buffer, "");
        const secondComplete = consumeDirectBarcodeScanKey(second, "Enter");

        expect(firstComplete).toEqual({ buffer: "", scannedCode: "001" });
        expect(secondComplete).toEqual({ buffer: "", scannedCode: "002" });
    });
});
