import { describe, expect, test } from "bun:test";
import {
    AddOnSalesRollupsResponseSchema,
    CommitSaleSchema,
    CustomerListQuerySchema,
    CompleteSaleSchema,
    PaymentMethodSchema,
    ProductSalesSummaryAdminQuerySchema,
    ProductSalesSummaryResponseSchema,
    SaleItemInputSchema,
    SaleDetailDTOSchema,
    SaleNumberSettingsDTOSchema,
    SalesListQuerySchema,
    UpdateSaleNumberSettingsSchema,
} from "./billing.schema";

describe("Configured sale billing contracts", () => {
    test("commit may carry the final draft items for atomic checkout", () => {
        const result = CommitSaleSchema.safeParse({
            items: [
                {
                    productId: "11111111-1111-4111-8111-111111111111",
                    quantity: 2,
                },
            ],
            payments: [],
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.items).toHaveLength(1);
            expect(result.data.items?.[0]?.quantity).toBe(2);
        }
    });

    test("accepts an unassigned Due sale without adding an unpaid payment method", () => {
        const result = CompleteSaleSchema.safeParse({
            requestId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            customerId: null,
            serviceMode: "dine_in",
            items: [
                {
                    productId: "11111111-1111-4111-8111-111111111111",
                    quantity: 1,
                },
            ],
            payments: [],
        });

        expect(result.success).toBe(true);
        expect(PaymentMethodSchema.safeParse("unpaid").success).toBe(false);
    });

    test("customer list queries support server-side filters and cursors", () => {
        const result = CustomerListQuerySchema.safeParse({
            search: "alice",
            status: "due",
            sort: "highest_due",
            cursor: "encoded-customer-cursor",
            limit: 40,
        });

        expect(result.success).toBe(true);
    });

    test("sale number settings are fixed to financial-year bills with daily token and KOT numbers", () => {
        const result = SaleNumberSettingsDTOSchema.safeParse({
            storeId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
            organizationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
            timezone: "Asia/Kolkata",
            resetPeriod: "financial_yearly",
            tokenNumberEnabled: true,
            tokenNumberResetPeriod: "daily",
            kotNumberResetPeriod: "daily",
            createdAt: new Date("2026-08-07T12:00:00.000Z"),
            updatedAt: new Date("2026-08-07T12:00:00.000Z"),
        });

        expect(result.success).toBe(true);
        expect(
            SaleNumberSettingsDTOSchema.safeParse({
                storeId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
                organizationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
                timezone: "Asia/Kolkata",
                resetPeriod: "never",
                tokenNumberEnabled: false,
                tokenNumberResetPeriod: "weekly",
                kotNumberResetPeriod: "monthly",
                createdAt: new Date("2026-08-07T12:00:00.000Z"),
                updatedAt: new Date("2026-08-07T12:00:00.000Z"),
            }).success,
        ).toBe(false);
    });

    test("sale number settings updates accept an empty body because rules are fixed", () => {
        const result = UpdateSaleNumberSettingsSchema.safeParse({});
        expect(result.success).toBe(true);
        expect(
            UpdateSaleNumberSettingsSchema.safeParse({
                resetPeriod: "never",
                tokenNumberEnabled: false,
                tokenNumberResetPeriod: "weekly",
            }).success,
        ).toBe(false);
    });

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

    test("sale item input accepts a Custom Selling Quantity amount", () => {
        const result = SaleItemInputSchema.safeParse({
            productId: "11111111-1111-4111-8111-111111111111",
            quantity: 1,
            soldQuantity: 500,
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.soldQuantity).toBe(500);
        }
    });

    test("sale item input rejects an invalid Custom Selling Quantity amount", () => {
        expect(
            SaleItemInputSchema.safeParse({
                productId: "11111111-1111-4111-8111-111111111111",
                quantity: 1,
                soldQuantity: 0,
            }).success,
        ).toBe(false);
        expect(
            SaleItemInputSchema.safeParse({
                productId: "11111111-1111-4111-8111-111111111111",
                quantity: 1,
                soldQuantity: 1.234,
            }).success,
        ).toBe(false);
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
            serviceMode: "dine_in",
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
      kotHistory: [
        { kotNumber: "KOT-001", fulfillmentType: "dine_in" },
        { kotNumber: "KOT-002", fulfillmentType: "pick_up" },
      ],
            items: [
                {
                    id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
                    organizationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
                    storeId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
                    saleId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                    productId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
                    quantity: 1,
                    configurationSignature: "22222222-2222-4222-8222-222222222222:1",
                    soldQuantity: 1,
                    unitId: "99999999-9999-4999-8999-999999999999",
                    unitLabelSnapshot: "pc",
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
      expect(result.data.items[0]?.addOns[0]?.addOnNameSnapshot).toBe(
        "Extra Cheese",
      );
            expect(result.data.items[0]?.bundleComponents).toEqual([]);
      expect(result.data.kotHistory).toEqual([
        { kotNumber: "KOT-001", fulfillmentType: "dine_in" },
        { kotNumber: "KOT-002", fulfillmentType: "pick_up" },
      ]);
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
            serviceMode: "dine_in",
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
                    soldQuantity: 1,
                    unitId: "99999999-9999-4999-8999-999999999999",
                    unitLabelSnapshot: "pc",
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
                  saleItemBundleComponentId:
                    "11111111-1111-4111-8111-111111111111",
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
      expect(
        result.data.items[0]?.bundleComponents[0]?.productNameSnapshot,
      ).toBe("Burger");
      expect(
        result.data.items[0]?.bundleComponents[0]?.addOns[0]?.addOnNameSnapshot,
      ).toBe("Extra Cheese");
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

    test("product sales summary supports date filters and sorted product totals", () => {
        const query = ProductSalesSummaryAdminQuerySchema.safeParse({
            storeId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
            createdFrom: "2026-08-11T00:00:00.000Z",
            createdTo: "2026-08-12T00:00:00.000Z",
        });
        const response = ProductSalesSummaryResponseSchema.safeParse({
            products: [
                {
                    productId: "11111111-1111-4111-8111-111111111111",
                    productName: "Masala Tea",
                    categoryName: "Beverages",
                    quantitySold: 24,
                },
            ],
        });

        expect(query.success).toBe(true);
        expect(response.success).toBe(true);
    });

    test("sales list query accepts multiple payment methods", () => {
        const fromArray = SalesListQuerySchema.safeParse({
            paymentMethods: ["cash", "upi"],
        });
        const fromCsv = SalesListQuerySchema.safeParse({
            paymentMethods: "cash,upi",
        });

        expect(fromArray.success).toBe(true);
        expect(fromCsv.success).toBe(true);
        if (fromArray.success && fromCsv.success) {
            expect(fromArray.data.paymentMethods).toEqual(["cash", "upi"]);
            expect(fromCsv.data.paymentMethods).toEqual(["cash", "upi"]);
        }
    });
});
