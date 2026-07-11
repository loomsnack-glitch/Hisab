import { describe, expect, test } from "bun:test";
import {
    AddOnSalesRollupsResponseSchema,
    SaleItemInputSchema,
    SaleDetailDTOSchema,
} from "./billing.schema";

describe("Configured sale billing contracts", () => {
    test("sale item input accepts selection-only product and add-on ids with quantities", () => {
        const result = SaleItemInputSchema.safeParse({
            productId: "11111111-1111-4111-8111-111111111111",
            quantity: 2,
            addOns: [
                {
                    addOnId: "22222222-2222-4222-8222-222222222222",
                    quantity: 1,
                },
            ],
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.addOns).toHaveLength(1);
            expect(result.data.addOns[0]?.quantity).toBe(1);
        }
    });

    test("sale item input rejects client-supplied unit prices", () => {
        const result = SaleItemInputSchema.safeParse({
            productId: "11111111-1111-4111-8111-111111111111",
            quantity: 1,
            unitPrice: 99,
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect("unitPrice" in result.data).toBe(false);
        }
    });

    test("sale item input rejects decimal quantities", () => {
        const result = SaleItemInputSchema.safeParse({
            productId: "11111111-1111-4111-8111-111111111111",
            quantity: 1.5,
        });

        expect(result.success).toBe(false);
    });

    test("sale item add-on input rejects decimal quantities", () => {
        const result = SaleItemInputSchema.safeParse({
            productId: "11111111-1111-4111-8111-111111111111",
            quantity: 1,
            addOns: [
                {
                    addOnId: "22222222-2222-4222-8222-222222222222",
                    quantity: 1.25,
                },
            ],
        });

        expect(result.success).toBe(false);
    });

    test("sale item input defaults missing add-ons to an empty selection", () => {
        const result = SaleItemInputSchema.safeParse({
            productId: "11111111-1111-4111-8111-111111111111",
            quantity: 1,
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.addOns).toEqual([]);
        }
    });

    test("sale detail nests add-ons under parent product rows", () => {
        const now = new Date("2026-07-11T12:00:00.000Z");
        const result = SaleDetailDTOSchema.safeParse({
            id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            organizationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
            storeId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
            saleNumber: null,
            customerId: null,
            userId: null,
            createdByDeviceId: null,
            updatedByDeviceId: null,
            status: "draft",
            paymentStatus: "pending",
            subtotal: 120,
            discountTotal: 0,
            grandTotal: 120,
            paidTotal: 0,
            dueTotal: 120,
            notes: null,
            committedAt: null,
            voidedAt: null,
            voidReason: null,
            createdAt: now,
            updatedAt: now,
            itemCount: 1,
            itemsSummary: "Burger",
            paymentMethods: null,
            customer: null,
            orderDiscountAmount: 0,
            payments: [],
            items: [
                {
                    id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
                    organizationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
                    storeId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
                    saleId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                    productId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
                    quantity: 1,
                    configurationSignature: "22222222-2222-4222-8222-222222222222:1",
                    productNameSnapshot: "Burger",
                    unitPriceSnapshot: 100,
                    discountAmount: 0,
                    lineSubtotal: 100,
                    lineTotal: 100,
                    createdAt: now,
                    updatedAt: now,
                    addOns: [
                        {
                            id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
                            organizationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
                            storeId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
                            saleId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                            saleItemId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
                            addOnId: "22222222-2222-4222-8222-222222222222",
                            quantityPerParent: 1,
                            totalQuantity: 1,
                            addOnNameSnapshot: "Extra Cheese",
                            unitPriceSnapshot: 20,
                            unitDiscountSnapshot: 0,
                            discountAmount: 0,
                            lineSubtotal: 20,
                            lineTotal: 20,
                            createdAt: now,
                            updatedAt: now,
                        },
                    ],
                },
            ],
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.items[0]?.addOns).toHaveLength(1);
            expect(result.data.items[0]?.addOns[0]?.addOnNameSnapshot).toBe("Extra Cheese");
            expect(result.data.items[0]?.bundleComponents).toEqual([]);
        }
    });

    test("sale detail nests bundle components under the priced bundle parent line", () => {
        const now = new Date("2026-07-12T12:00:00.000Z");
        const result = SaleDetailDTOSchema.safeParse({
            id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            organizationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
            storeId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
            saleNumber: null,
            customerId: null,
            userId: null,
            createdByDeviceId: null,
            updatedByDeviceId: null,
            status: "draft",
            paymentStatus: "pending",
            subtotal: 99,
            discountTotal: 0,
            grandTotal: 99,
            paidTotal: 0,
            dueTotal: 99,
            notes: null,
            committedAt: null,
            voidedAt: null,
            voidReason: null,
            createdAt: now,
            updatedAt: now,
            itemCount: 1,
            itemsSummary: "Burger Combo",
            paymentMethods: null,
            customer: null,
            orderDiscountAmount: 0,
            payments: [],
            items: [
                {
                    id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
                    organizationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
                    storeId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
                    saleId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                    productId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
                    quantity: 1,
                    configurationSignature: "",
                    productNameSnapshot: "Burger Combo",
                    unitPriceSnapshot: 99,
                    discountAmount: 0,
                    lineSubtotal: 99,
                    lineTotal: 99,
                    createdAt: now,
                    updatedAt: now,
                    addOns: [],
                    bundleComponents: [
                        {
                            id: "11111111-1111-4111-8111-111111111111",
                            organizationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
                            storeId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
                            saleId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                            saleItemId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
                            componentProductId: "22222222-2222-4222-8222-222222222222",
                            quantityPerBundle: 1,
                            totalQuantity: 1,
                            productNameSnapshot: "Burger",
                            unitPriceSnapshot: 80,
                            unitDiscountSnapshot: 0,
                            createdAt: now,
                            updatedAt: now,
                            addOns: [
                                {
                                    id: "33333333-3333-4333-8333-333333333333",
                                    organizationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
                                    storeId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
                                    saleId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                                    saleItemId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
                                    saleItemBundleComponentId: "11111111-1111-4111-8111-111111111111",
                                    addOnId: "44444444-4444-4444-8444-444444444444",
                                    quantityPerComponent: 1,
                                    totalQuantity: 1,
                                    addOnNameSnapshot: "Extra Cheese",
                                    unitPriceSnapshot: 20,
                                    unitDiscountSnapshot: 0,
                                    createdAt: now,
                                    updatedAt: now,
                                },
                            ],
                        },
                    ],
                },
            ],
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.items[0]?.bundleComponents).toHaveLength(1);
            expect(result.data.items[0]?.bundleComponents[0]?.productNameSnapshot).toBe("Burger");
            expect(result.data.items[0]?.bundleComponents[0]?.addOns[0]?.addOnNameSnapshot).toBe("Extra Cheese");
            expect(result.data.subtotal).toBe(99);
        }
    });

    test("add-on sales rollups contract supports parent-scoped and add-on-scoped views", () => {
        const result = AddOnSalesRollupsResponseSchema.safeParse({
            parentScoped: [
                {
                    productId: "11111111-1111-4111-8111-111111111111",
                    productNameSnapshot: "Burger",
                    addOnId: "22222222-2222-4222-8222-222222222222",
                    addOnNameSnapshot: "Extra Cheese",
                    totalQuantity: 3,
                    lineSubtotal: 60,
                    discountAmount: 6,
                    lineTotal: 54,
                },
            ],
            addOnScoped: [
                {
                    addOnId: "22222222-2222-4222-8222-222222222222",
                    addOnNameSnapshot: "Extra Cheese",
                    totalQuantity: 5,
                    lineSubtotal: 100,
                    discountAmount: 10,
                    lineTotal: 90,
                    parentProductCount: 2,
                },
            ],
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.parentScoped[0]?.productNameSnapshot).toBe("Burger");
            expect(result.data.addOnScoped[0]?.parentProductCount).toBe(2);
        }
    });
});
