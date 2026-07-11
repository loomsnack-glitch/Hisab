import { describe, expect, test } from "bun:test";
import { SaleItemInputSchema, SaleDetailDTOSchema } from "./billing.schema";

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
        }
    });
});
