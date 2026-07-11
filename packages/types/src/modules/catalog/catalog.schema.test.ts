import { describe, expect, test } from "bun:test";
import {
    CreateAddOnSchema,
    CreateBundleProductSchema,
    CreateProductAddOnAttachmentSchema,
    UpdateAddOnSchema,
    UpdateBundleProductSchema,
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

describe("Bundle Product catalog contracts", () => {
    test("create bundle accepts typed identity fields and product components", () => {
        const result = CreateBundleProductSchema.safeParse({
            categoryId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
            name: "Burger Combo",
            price: 99,
            discount: 0,
            components: [
                {
                    productId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
                    quantity: 1,
                },
            ],
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.components).toHaveLength(1);
            expect(result.data.components[0]?.quantity).toBe(1);
        }
    });

    test("create bundle accepts parent-scoped add-ons under product components", () => {
        const result = CreateBundleProductSchema.safeParse({
            categoryId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
            name: "Burger Combo",
            price: 99,
            components: [
                {
                    productId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
                    quantity: 1,
                    addOns: [
                        {
                            addOnId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
                            quantity: 1,
                        },
                    ],
                },
            ],
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.components[0]?.addOns).toHaveLength(1);
            expect(result.data.components[0]?.addOns?.[0]?.quantity).toBe(1);
        }
    });

    test("rejects bundle create without product components", () => {
        const result = CreateBundleProductSchema.safeParse({
            categoryId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
            name: "Empty Bundle",
            price: 99,
            components: [],
        });

        expect(result.success).toBe(false);
    });

    test("rejects fractional component quantity", () => {
        const result = CreateBundleProductSchema.safeParse({
            categoryId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
            name: "Burger Combo",
            price: 99,
            components: [
                {
                    productId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
                    quantity: 1.5,
                },
            ],
        });

        expect(result.success).toBe(false);
    });

    test("rejects fractional nested add-on quantity", () => {
        const result = CreateBundleProductSchema.safeParse({
            categoryId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
            name: "Burger Combo",
            price: 99,
            components: [
                {
                    productId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
                    quantity: 1,
                    addOns: [
                        {
                            addOnId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
                            quantity: 1.5,
                        },
                    ],
                },
            ],
        });

        expect(result.success).toBe(false);
    });

    test("update bundle accepts status-based retirement", () => {
        const result = UpdateBundleProductSchema.safeParse({ status: "inactive" });

        expect(result.success).toBe(true);
    });
});
