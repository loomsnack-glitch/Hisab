import { describe, expect, test } from "bun:test";
import {
    CreateAddOnSchema,
    CreateProductAddOnAttachmentSchema,
    UpdateAddOnSchema,
    UpdateProductAddOnAttachmentSchema,
} from "./catalog.schema";

describe("Add-On catalog contracts", () => {
    test("create add-on accepts name, price, discount, and status", () => {
        const result = CreateAddOnSchema.safeParse({
            name: "Extra Cheese",
            price: 20,
            discount: 2,
            status: "active",
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.name).toBe("Extra Cheese");
            expect(result.data.price).toBe(20);
            expect(result.data.discount).toBe(2);
        }
    });

    test("update add-on accepts status changes", () => {
        const result = UpdateAddOnSchema.safeParse({ status: "inactive" });

        expect(result.success).toBe(true);
    });

    test("attachment create defaults selection cap as optional", () => {
        const result = CreateProductAddOnAttachmentSchema.safeParse({
            addOnId: "11111111-1111-4111-8111-111111111111",
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.selectionCap).toBeUndefined();
        }
    });

    test("rejects selection cap below 1", () => {
        const result = CreateProductAddOnAttachmentSchema.safeParse({
            addOnId: "11111111-1111-4111-8111-111111111111",
            selectionCap: 0,
        });

        expect(result.success).toBe(false);
    });

    test("rejects fractional selection cap", () => {
        const result = UpdateProductAddOnAttachmentSchema.safeParse({
            selectionCap: 1.5,
        });

        expect(result.success).toBe(false);
    });

    test("rejects negative selection cap", () => {
        const result = UpdateProductAddOnAttachmentSchema.safeParse({
            selectionCap: -2,
        });

        expect(result.success).toBe(false);
    });
});
