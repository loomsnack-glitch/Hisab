import { z } from "zod";
import { dtoDateSchema, normalizePhoneNumber, phoneSchema } from "../../common";
import {
    CustomerLedgerEntryDTOSchema,
    CustomerListStatusSchema,
    CustomerSortSchema,
    CustomerSummaryDTOSchema,
    PaymentDTOSchema,
    PaymentMethodSchema,
    PaymentStatusSchema,
    ProductSalesSummaryDTOSchema,
    SaleDeviceAuditDTOSchema,
    SaleItemDTOSchema,
    SaleServiceModeSchema,
    SaleStatusSchema,
    SalesListSummarySchema,
    SalesSortSchema,
} from "../billing/billing.schema";
import {
    AddOnStatusSchema,
    CategoryStatusSchema,
    ProductAddOnAttachmentStatusSchema,
    ProductCodeKindSchema,
    ProductStatusSchema,
    ProductTypeSchema,
} from "../catalog/catalog.schema";
import { StoreDeviceStatusSchema, StoreMessageLinkTypeSchema } from "../organization/organization.schema";
import { PurchaseItemDTOSchema, PurchaseStatusSchema } from "../purchase/purchase.schema";
import {
    WhatsAppAccountStatusSchema,
    WhatsAppMessageTemplateKindSchema,
    WhatsAppProviderSchema,
} from "../../services/whatsapp.schema";
import { ServiceTableStateSchema } from "../table-service/table-service.schema";

const ownerPhoneSchema = z
    .string()
    .transform((value, ctx) => {
        const normalized = normalizePhoneNumber(value);
        if (!normalized) {
            ctx.addIssue({ code: "custom", message: "Phone number is not valid" });
            return z.NEVER;
        }
        return normalized;
    })
    .pipe(phoneSchema);

export const OwnerPasswordSchema = z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters");

export const OwnerUserDTOSchema = z.object({
    id: z.uuid("Invalid Owner User id"),
    firstName: z.string().trim().min(1, "First name is required").max(255, "First name is too long"),
    lastName: z.string().trim().min(1, "Last name is required").max(255, "Last name is too long"),
    phone: phoneSchema,
    isActive: z.boolean(),
    createdAt: dtoDateSchema,
    updatedAt: dtoDateSchema,
});

export const OwnerUserSeedSchema = z.object({
    firstName: OwnerUserDTOSchema.shape.firstName,
    lastName: OwnerUserDTOSchema.shape.lastName,
    phone: ownerPhoneSchema,
    password: OwnerPasswordSchema,
});

export const CreateOwnerUserSchema = OwnerUserSeedSchema;

export const OwnerUserActiveStateSchema = z.object({
    isActive: z.boolean(),
});

export const OwnerLoginSchema = z.discriminatedUnion("requestType", [
    z.object({
        requestType: z.literal("user-info"),
        phone: ownerPhoneSchema,
        password: OwnerPasswordSchema,
    }),
    z.object({
        requestType: z.literal("otp-info"),
        phone: ownerPhoneSchema,
    }),
    z.object({
        requestType: z.literal("otp-verification"),
        phone: ownerPhoneSchema,
        otp: z.string().regex(/^\d{6}$/, "OTP must be exactly 6 digits"),
    }),
]);

export const PLATFORM_REPORTING_TIMEZONE = "Asia/Kolkata";
export const ACTIVE_STORE_LOOKBACK_DAYS = 7;

export const PlatformReportingPeriodSelectionSchema = z.enum(["all-time", "7d", "30d", "90d", "custom"]);

const calendarDateSchema = z.string().date("Enter a valid calendar date");

const platformReportingPeriodQueryFields = {
    period: PlatformReportingPeriodSelectionSchema.default("all-time"),
    startDate: calendarDateSchema.optional(),
    endDate: calendarDateSchema.optional(),
};

const refinePlatformReportingPeriodQuery = (
    value: { period: z.infer<typeof PlatformReportingPeriodSelectionSchema>; startDate?: string; endDate?: string },
    ctx: z.RefinementCtx,
) => {
    if (value.period === "custom") {
        if (!value.startDate) {
            ctx.addIssue({
                code: "custom",
                path: ["startDate"],
                message: "Start date is required for a custom Platform Reporting Period",
            });
        }
        if (!value.endDate) {
            ctx.addIssue({
                code: "custom",
                path: ["endDate"],
                message: "End date is required for a custom Platform Reporting Period",
            });
        }
        if (value.startDate && value.endDate && value.startDate > value.endDate) {
            ctx.addIssue({
                code: "custom",
                path: ["startDate"],
                message: "Start date must be before or equal to end date",
            });
        }
        return;
    }

    if (value.startDate || value.endDate) {
        ctx.addIssue({
            code: "custom",
            path: ["startDate"],
            message: "Custom dates are only valid for a custom Platform Reporting Period",
        });
    }
};

export const PlatformDashboardQuerySchema = z
    .object(platformReportingPeriodQueryFields)
    .superRefine(refinePlatformReportingPeriodQuery);

const positivePageSchema = z.coerce
    .number({ error: "Page must be a number" })
    .int("Page must be a whole number")
    .min(1, "Page must be at least 1");

const organizationListLimitSchema = z.coerce
    .number({ error: "Limit must be a number" })
    .int("Limit must be a whole number")
    .min(1, "Limit must be at least 1")
    .max(100, "Limit must be at most 100");

export const PlatformOrganizationActivityFilterSchema = z.enum(["all", "active", "inactive"]);

export const PlatformOrganizationDirectorySortSchema = z.enum([
    "recent_activity",
    "name_asc",
    "name_desc",
    "sales_value_desc",
    "sales_value_asc",
]);

export const PlatformOrganizationListQuerySchema = z
    .object({
        ...platformReportingPeriodQueryFields,
        search: z.string().trim().max(255, "Search must be at most 255 characters").optional(),
        activity: PlatformOrganizationActivityFilterSchema.default("all"),
        sort: PlatformOrganizationDirectorySortSchema.default("recent_activity"),
        page: positivePageSchema.default(1),
        limit: organizationListLimitSchema.default(20),
    })
    .superRefine(refinePlatformReportingPeriodQuery);

const nonNegativeIntSchema = z.number().int().min(0);
const nonNegativeMoneySchema = z.number().min(0);

export const PlatformReportingPeriodDTOSchema = z.object({
    selection: PlatformReportingPeriodSelectionSchema,
    startDate: z.string().date().nullable(),
    endDate: z.string().date().nullable(),
});

export const PlatformDashboardDTOSchema = z.object({
    reportingPeriod: PlatformReportingPeriodDTOSchema,
    allTime: z.object({
        organizationCount: nonNegativeIntSchema,
        storeCount: nonNegativeIntSchema,
        customerCount: nonNegativeIntSchema,
        completedSaleCount: nonNegativeIntSchema,
    }),
    activity: z.object({
        activeOrganizationCount: nonNegativeIntSchema,
        activeStoreCount: nonNegativeIntSchema,
    }),
    reportingPeriodMetrics: z.object({
        completedSaleCount: nonNegativeIntSchema,
        completedSalesValue: nonNegativeMoneySchema,
        customerCount: nonNegativeIntSchema,
    }),
});

export const PlatformOrganizationCreatorDTOSchema = z.object({
    firstName: z.string().trim().min(1),
    lastName: z.string().trim().min(1),
    phone: phoneSchema,
});

export const PlatformOrganizationListItemDTOSchema = z.object({
    id: z.uuid("Invalid organization id"),
    name: z.string().trim().min(1),
    username: z.string().trim().min(1),
    isActive: z.boolean(),
    creator: PlatformOrganizationCreatorDTOSchema,
    storeCount: nonNegativeIntSchema,
    activeStoreCount: nonNegativeIntSchema,
    customerCount: nonNegativeIntSchema,
    completedSaleCount: nonNegativeIntSchema,
    completedSalesValue: nonNegativeMoneySchema,
    lastCompletedSaleAt: dtoDateSchema.nullable(),
});

export const PlatformOrganizationListDTOSchema = z.object({
    reportingPeriod: PlatformReportingPeriodDTOSchema,
    organizations: z.array(PlatformOrganizationListItemDTOSchema),
    pagination: z.object({
        page: z.number().int().min(1),
        limit: z.number().int().min(1).max(100),
        totalCount: nonNegativeIntSchema,
    }),
});

export const PlatformOrganizationDetailQuerySchema = PlatformDashboardQuerySchema;

export const PlatformStoreActivityDTOSchema = z.object({
    id: z.uuid("Invalid store id"),
    name: z.string().trim().min(1),
    isActive: z.boolean(),
    customerCount: nonNegativeIntSchema,
    completedSaleCount: nonNegativeIntSchema,
    completedSalesValue: nonNegativeMoneySchema,
    lastCompletedSaleAt: dtoDateSchema.nullable(),
});

export const PLATFORM_OVERVIEW_RECENT_SALE_LIMIT = 10;

export const PlatformRecentSaleDTOSchema = z.object({
    id: z.uuid("Invalid sale id"),
    saleNumber: z.string().nullable(),
    status: SaleStatusSchema,
    grandTotal: nonNegativeMoneySchema,
    occurredAt: dtoDateSchema,
    store: z.object({
        id: z.uuid("Invalid store id"),
        name: z.string().trim().min(1),
    }),
});

export const PlatformOrganizationDetailDTOSchema = z.object({
    reportingPeriod: PlatformReportingPeriodDTOSchema,
    organization: PlatformOrganizationListItemDTOSchema.extend({
        stores: z.array(PlatformStoreActivityDTOSchema),
        recentSales: z.array(PlatformRecentSaleDTOSchema),
    }),
});

export const PlatformStoreInspectionQuerySchema = PlatformOrganizationDetailQuerySchema;

export const PlatformStoreListDTOSchema = z.object({
    reportingPeriod: PlatformReportingPeriodDTOSchema,
    stores: z.array(PlatformStoreActivityDTOSchema),
});

export const PlatformStoreDeviceInspectionDTOSchema = z.object({
    id: z.uuid("Invalid device id"),
    name: z.string().trim().min(1),
    loginUsername: z.string().trim().min(1),
    status: StoreDeviceStatusSchema,
    lastSeenAt: dtoDateSchema.nullable(),
    createdAt: dtoDateSchema,
});

export const PlatformStoreDetailDTOSchema = z.object({
    id: z.uuid("Invalid store id"),
    organizationId: z.uuid("Invalid organization id"),
    name: z.string().trim().min(1),
    address: z.string().nullable(),
    kotSystemEnabled: z.boolean(),
    tableManagementEnabled: z.boolean(),
    createdAt: dtoDateSchema,
    isActive: z.boolean(),
    customerCount: nonNegativeIntSchema,
    completedSaleCount: nonNegativeIntSchema,
    completedSalesValue: nonNegativeMoneySchema,
    lastCompletedSaleAt: dtoDateSchema.nullable(),
    devices: z.array(PlatformStoreDeviceInspectionDTOSchema),
    recentSales: z.array(PlatformRecentSaleDTOSchema),
});

export const PlatformStoreDetailResponseSchema = z.object({
    reportingPeriod: PlatformReportingPeriodDTOSchema,
    store: PlatformStoreDetailDTOSchema,
});

export const PlatformBillingInspectionQuerySchema = z
    .object({
        storeId: z.uuid("Invalid store id").optional(),
        status: SaleStatusSchema.optional(),
        paymentStatus: PaymentStatusSchema.optional(),
        paymentMethod: PaymentMethodSchema.optional(),
        search: z.string().trim().max(255, "Search must be at most 255 characters").optional(),
        startDate: calendarDateSchema.optional(),
        endDate: calendarDateSchema.optional(),
        sort: SalesSortSchema.default("newest"),
        page: positivePageSchema.default(1),
        limit: organizationListLimitSchema.default(20),
    })
    .superRefine((value, ctx) => {
        if (value.startDate && value.endDate && value.startDate > value.endDate) {
            ctx.addIssue({
                code: "custom",
                path: ["startDate"],
                message: "Start date must be before or equal to end date",
            });
        }
    });

export const PlatformSaleInspectionStoreDTOSchema = z.object({
    id: z.uuid("Invalid store id"),
    name: z.string().trim().min(1),
});

export const PlatformSaleInspectionSummaryDTOSchema = z.object({
    id: z.uuid("Invalid sale id"),
    saleNumber: z.string().nullable(),
    status: SaleStatusSchema,
    paymentStatus: PaymentStatusSchema,
    grandTotal: nonNegativeMoneySchema,
    paidTotal: nonNegativeMoneySchema,
    dueTotal: nonNegativeMoneySchema,
    createdAt: dtoDateSchema,
    committedAt: dtoDateSchema.nullable(),
    voidedAt: dtoDateSchema.nullable(),
    itemCount: nonNegativeIntSchema,
    itemsSummary: z.string().nullable(),
    paymentMethods: z.string().nullable(),
    customerName: z.string().nullable(),
    serviceMode: SaleServiceModeSchema,
    store: PlatformSaleInspectionStoreDTOSchema,
});

export const PlatformSaleInspectionListDTOSchema = z.object({
    stores: z.array(PlatformSaleInspectionStoreDTOSchema),
    sales: z.array(PlatformSaleInspectionSummaryDTOSchema),
    pagination: z.object({
        page: z.number().int().min(1),
        limit: z.number().int().min(1).max(100),
        totalCount: nonNegativeIntSchema,
    }),
    summary: SalesListSummarySchema,
});

export const PlatformSaleInspectionReceiptDTOSchema = z.object({
    organizationName: z.string().trim().min(1),
    storeName: z.string().trim().min(1),
    storeAddress: z.string().nullable(),
    previewText: z.string(),
});

export const PlatformSaleInspectionDetailDTOSchema = PlatformSaleInspectionSummaryDTOSchema.extend({
    subtotal: z.number(),
    discountTotal: z.number(),
    orderDiscountAmount: z.number(),
    notes: z.string().nullable(),
    voidReason: z.string().nullable(),
    customer: CustomerSummaryDTOSchema.nullable(),
    createdByDevice: SaleDeviceAuditDTOSchema.nullable().optional(),
    updatedByDevice: SaleDeviceAuditDTOSchema.nullable().optional(),
    items: z.array(SaleItemDTOSchema),
    payments: z.array(PaymentDTOSchema),
    receipt: PlatformSaleInspectionReceiptDTOSchema,
});

export const PlatformSaleInspectionDetailResponseSchema = z.object({
    sale: PlatformSaleInspectionDetailDTOSchema,
});

export const PlatformCatalogInspectionTabSchema = z.enum(["products", "categories", "add-ons"]);

export const PlatformCatalogStatusFilterSchema = z.enum(["all", "active", "inactive"]);

export const PlatformCatalogInspectionQuerySchema = z.object({
    tab: PlatformCatalogInspectionTabSchema.default("products"),
    search: z.string().trim().max(255, "Search must be at most 255 characters").optional(),
    status: PlatformCatalogStatusFilterSchema.default("all"),
    page: positivePageSchema.default(1),
    limit: organizationListLimitSchema.default(20),
});

export const PlatformCatalogCategorySummaryDTOSchema = z.object({
    id: z.uuid("Invalid category id"),
    name: z.string().trim().min(1),
    sortOrder: z.number().int().nonnegative(),
    status: CategoryStatusSchema,
    productCount: nonNegativeIntSchema,
    createdAt: dtoDateSchema,
    updatedAt: dtoDateSchema,
});

export const PlatformCatalogProductSummaryDTOSchema = z.object({
    id: z.uuid("Invalid product id"),
    name: z.string().trim().min(1),
    category: z.object({
        id: z.uuid("Invalid category id"),
        name: z.string().trim().min(1),
    }),
    price: nonNegativeMoneySchema,
    discount: nonNegativeMoneySchema,
    status: ProductStatusSchema,
    productType: ProductTypeSchema,
    productCode: z.string().nullable(),
    productCodeKind: ProductCodeKindSchema.nullable(),
    sortOrder: z.number().int().nonnegative(),
    attachmentCount: nonNegativeIntSchema,
    createdAt: dtoDateSchema,
    updatedAt: dtoDateSchema,
});

export const PlatformCatalogAddOnSummaryDTOSchema = z.object({
    id: z.uuid("Invalid add-on id"),
    name: z.string().trim().min(1),
    price: nonNegativeMoneySchema,
    discount: nonNegativeMoneySchema,
    status: AddOnStatusSchema,
    attachmentCount: nonNegativeIntSchema,
    createdAt: dtoDateSchema,
    updatedAt: dtoDateSchema,
});

export const PlatformCatalogListDTOSchema = z.object({
    tab: PlatformCatalogInspectionTabSchema,
    counts: z.object({
        categories: nonNegativeIntSchema,
        products: nonNegativeIntSchema,
        addOns: nonNegativeIntSchema,
    }),
    categories: z.array(PlatformCatalogCategorySummaryDTOSchema),
    products: z.array(PlatformCatalogProductSummaryDTOSchema),
    addOns: z.array(PlatformCatalogAddOnSummaryDTOSchema),
    pagination: z.object({
        page: z.number().int().min(1),
        limit: z.number().int().min(1).max(100),
        totalCount: nonNegativeIntSchema,
    }),
});

export const PlatformCatalogAttachmentInspectionDTOSchema = z.object({
    id: z.uuid("Invalid attachment id"),
    addOnId: z.uuid("Invalid add-on id"),
    addOnName: z.string().trim().min(1),
    selectionCap: z.number().int().min(1),
    status: ProductAddOnAttachmentStatusSchema,
    addOnPrice: nonNegativeMoneySchema,
    addOnDiscount: nonNegativeMoneySchema,
    addOnStatus: AddOnStatusSchema,
});

export const PlatformCatalogProductDetailDTOSchema = PlatformCatalogProductSummaryDTOSchema.extend({
    hasImage: z.boolean(),
    attachments: z.array(PlatformCatalogAttachmentInspectionDTOSchema),
});

export const PlatformCatalogProductDetailResponseSchema = z.object({
    product: PlatformCatalogProductDetailDTOSchema,
});

export const PlatformCatalogCategoryDetailDTOSchema = PlatformCatalogCategorySummaryDTOSchema.extend({
    products: z.array(PlatformCatalogProductSummaryDTOSchema),
});

export const PlatformCatalogCategoryDetailResponseSchema = z.object({
    category: PlatformCatalogCategoryDetailDTOSchema,
});

export const PlatformCatalogProductAttachmentInspectionDTOSchema = z.object({
    id: z.uuid("Invalid attachment id"),
    productId: z.uuid("Invalid product id"),
    productName: z.string().trim().min(1),
    selectionCap: z.number().int().min(1),
    status: ProductAddOnAttachmentStatusSchema,
});

export const PlatformCatalogAddOnDetailDTOSchema = PlatformCatalogAddOnSummaryDTOSchema.extend({
    attachments: z.array(PlatformCatalogProductAttachmentInspectionDTOSchema),
});

export const PlatformCatalogAddOnDetailResponseSchema = z.object({
    addOn: PlatformCatalogAddOnDetailDTOSchema,
});

export const PlatformCustomerInspectionQuerySchema = z.object({
    search: z.string().trim().max(255, "Search must be at most 255 characters").optional(),
    status: CustomerListStatusSchema.default("all"),
    sort: CustomerSortSchema.default("newest"),
    page: positivePageSchema.default(1),
    limit: organizationListLimitSchema.default(20),
});

export const PlatformCustomerInspectionSummaryDTOSchema = CustomerSummaryDTOSchema.extend({
    createdAt: dtoDateSchema,
});

export const PlatformCustomerInspectionListDTOSchema = z.object({
    customers: z.array(PlatformCustomerInspectionSummaryDTOSchema),
    pagination: z.object({
        page: z.number().int().min(1),
        limit: z.number().int().min(1).max(100),
        totalCount: nonNegativeIntSchema,
    }),
});

export const PLATFORM_CUSTOMER_INSPECTION_SALE_LIMIT = 50;

export const PlatformCustomerInspectionDetailDTOSchema = CustomerSummaryDTOSchema.extend({
    marketingOptedOut: z.boolean(),
    createdAt: dtoDateSchema,
    updatedAt: dtoDateSchema,
    ledger: z.array(CustomerLedgerEntryDTOSchema),
    sales: z.array(PlatformSaleInspectionSummaryDTOSchema),
});

export const PlatformCustomerInspectionDetailResponseSchema = z.object({
    customer: PlatformCustomerInspectionDetailDTOSchema,
});

export const PlatformReportInspectionQuerySchema = z
    .object({
        storeId: z.uuid("Invalid store id").optional(),
        startDate: calendarDateSchema.optional(),
        endDate: calendarDateSchema.optional(),
    })
    .superRefine((value, ctx) => {
        if (value.startDate && value.endDate && value.startDate > value.endDate) {
            ctx.addIssue({
                code: "custom",
                path: ["startDate"],
                message: "Start date must be before or equal to end date",
            });
        }
    });

export const PlatformReportDateRangeDTOSchema = z.object({
    startDate: z.string().date().nullable(),
    endDate: z.string().date().nullable(),
    label: z.string().trim().min(1),
    timezone: z.literal(PLATFORM_REPORTING_TIMEZONE),
});

export const PlatformReportProductSalesDTOSchema = z.object({
    products: z.array(ProductSalesSummaryDTOSchema),
    productCount: nonNegativeIntSchema,
    totalQuantitySold: nonNegativeIntSchema,
});

export const PlatformReportInspectionDTOSchema = z.object({
    dateRange: PlatformReportDateRangeDTOSchema,
    stores: z.array(PlatformSaleInspectionStoreDTOSchema),
    productSales: PlatformReportProductSalesDTOSchema,
});

export const PlatformBillActivityGranularitySchema = z.enum(["hour", "day"]);

export const PlatformBillActivityQuerySchema = z
    .object({
        startDate: calendarDateSchema.optional(),
        endDate: calendarDateSchema.optional(),
    })
    .superRefine((value, ctx) => {
        if (value.startDate && value.endDate && value.startDate > value.endDate) {
            ctx.addIssue({
                code: "custom",
                path: ["startDate"],
                message: "Start date must be before or equal to end date",
            });
        }
    });

export const PlatformBillActivityPointDTOSchema = z.object({
    bucketKey: z.string().trim().min(1),
    bucketStart: z.string().trim().min(1),
    label: z.string().trim().min(1),
    billCount: nonNegativeIntSchema,
});

export const PlatformBillActivityDTOSchema = z.object({
    dateRange: PlatformReportDateRangeDTOSchema,
    granularity: PlatformBillActivityGranularitySchema,
    points: z.array(PlatformBillActivityPointDTOSchema),
    totalBillCount: nonNegativeIntSchema,
});

export const PlatformTableInspectionStateFilterSchema = z.enum([
    "all",
    ...ServiceTableStateSchema.options,
]);

export const PlatformTableInspectionSortSchema = z.enum([
    "table_asc",
    "table_desc",
    "store_asc",
    "state",
]);

export const PlatformTableInspectionQuerySchema = z.object({
    storeId: z.uuid("Invalid store id").optional(),
    search: z.string().trim().max(255, "Search must be at most 255 characters").optional(),
    state: PlatformTableInspectionStateFilterSchema.default("all"),
    page: positivePageSchema.default(1),
    limit: organizationListLimitSchema.default(20),
    sort: PlatformTableInspectionSortSchema.default("table_asc"),
});

export const PlatformTableInspectionAreaDTOSchema = z.object({
    id: z.uuid("Invalid area id"),
    title: z.string().trim().min(1),
});

export const PlatformTableInspectionCurrentSaleDTOSchema = z.object({
    id: z.uuid("Invalid sale id"),
    saleNumber: z.string().nullable(),
    status: SaleStatusSchema,
    paymentStatus: PaymentStatusSchema,
    grandTotal: nonNegativeMoneySchema,
    dueTotal: nonNegativeMoneySchema,
});

export const PlatformTableInspectionSummaryDTOSchema = z.object({
    id: z.uuid("Invalid table id"),
    tableLabel: z.string().trim().min(1),
    capacity: z.number().int().positive().nullable(),
    state: ServiceTableStateSchema,
    store: PlatformSaleInspectionStoreDTOSchema,
    serviceArea: PlatformTableInspectionAreaDTOSchema.nullable(),
    currentSaleId: z.uuid("Invalid current sale id").nullable(),
    currentSaleTotal: z.number().nullable(),
    createdAt: dtoDateSchema,
    updatedAt: dtoDateSchema,
});

export const PlatformTableInspectionListDTOSchema = z.object({
    stores: z.array(PlatformSaleInspectionStoreDTOSchema),
    tables: z.array(PlatformTableInspectionSummaryDTOSchema),
    pagination: z.object({
        page: z.number().int().min(1),
        limit: z.number().int().min(1).max(100),
        totalCount: nonNegativeIntSchema,
    }),
});

export const PlatformTableInspectionDetailDTOSchema = PlatformTableInspectionSummaryDTOSchema.extend({
    currentSale: PlatformTableInspectionCurrentSaleDTOSchema.nullable(),
});

export const PlatformTableInspectionDetailResponseSchema = z.object({
    table: PlatformTableInspectionDetailDTOSchema,
});

export const PlatformPurchaseStatusFilterSchema = z.enum(["all", ...PurchaseStatusSchema.options]);

export const PlatformPurchaseInspectionSortSchema = z.enum(["newest", "oldest", "highest", "lowest"]);

export const PlatformPurchaseInspectionQuerySchema = z
    .object({
        storeId: z.uuid("Invalid store id").optional(),
        search: z.string().trim().max(255, "Search must be at most 255 characters").optional(),
        status: PlatformPurchaseStatusFilterSchema.default("all"),
        startDate: calendarDateSchema.optional(),
        endDate: calendarDateSchema.optional(),
        page: positivePageSchema.default(1),
        limit: organizationListLimitSchema.default(20),
        sort: PlatformPurchaseInspectionSortSchema.default("newest"),
    })
    .superRefine((value, ctx) => {
        if (value.startDate && value.endDate && value.startDate > value.endDate) {
            ctx.addIssue({
                code: "custom",
                path: ["startDate"],
                message: "Start date must be before or equal to end date",
            });
        }
    });

export const PlatformPurchaseInspectionSummaryDTOSchema = z.object({
    id: z.uuid("Invalid purchase id"),
    purchaseDate: z.string(),
    supplierName: z.string().trim().min(1),
    invoiceNumber: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    totalAmount: nonNegativeMoneySchema,
    status: PurchaseStatusSchema,
    itemCount: nonNegativeIntSchema,
    itemsSummary: z.string().nullable().optional(),
    voidedAt: dtoDateSchema.nullable().optional(),
    voidReason: z.string().nullable().optional(),
    createdAt: dtoDateSchema,
    updatedAt: dtoDateSchema,
    store: PlatformSaleInspectionStoreDTOSchema,
});

export const PlatformPurchaseInspectionListDTOSchema = z.object({
    stores: z.array(PlatformSaleInspectionStoreDTOSchema),
    purchases: z.array(PlatformPurchaseInspectionSummaryDTOSchema),
    pagination: z.object({
        page: z.number().int().min(1),
        limit: z.number().int().min(1).max(100),
        totalCount: nonNegativeIntSchema,
    }),
});

export const PlatformPurchaseInspectionDetailDTOSchema = PlatformPurchaseInspectionSummaryDTOSchema.extend({
    items: z.array(PurchaseItemDTOSchema),
});

export const PlatformPurchaseInspectionDetailResponseSchema = z.object({
    purchase: PlatformPurchaseInspectionDetailDTOSchema,
});

export const PlatformWhatsAppInspectionStoreDTOSchema = z.object({
    id: z.uuid("Invalid store id"),
    name: z.string().trim().min(1),
});

export const PlatformWhatsAppAccountInspectionDTOSchema = z.object({
    id: z.uuid("Invalid WhatsApp account id"),
    provider: WhatsAppProviderSchema,
    phoneNumber: phoneSchema,
    status: WhatsAppAccountStatusSchema,
    lastConnectedAt: dtoDateSchema.nullable(),
    lastSeenAt: dtoDateSchema.nullable(),
    lastErrorCode: z.string().nullable(),
    defaultStore: PlatformWhatsAppInspectionStoreDTOSchema.nullable(),
    assignedStores: z.array(PlatformWhatsAppInspectionStoreDTOSchema),
    createdAt: dtoDateSchema,
    updatedAt: dtoDateSchema,
});

export const PlatformWhatsAppTemplateInspectionDTOSchema = z.object({
    kind: WhatsAppMessageTemplateKindSchema,
    name: z.string().trim().min(1),
    isActive: z.boolean(),
    isDefault: z.boolean(),
});

export const PlatformWhatsAppMessageLinkInspectionDTOSchema = z.object({
    key: z.string().trim().min(1),
    label: z.string().trim().min(1),
    type: StoreMessageLinkTypeSchema,
    isActive: z.boolean(),
});

export const PlatformWhatsAppStoreConfigInspectionDTOSchema = z.object({
    store: PlatformWhatsAppInspectionStoreDTOSchema,
    accountId: z.uuid("Invalid WhatsApp account id").nullable(),
    accountStatus: WhatsAppAccountStatusSchema.nullable(),
    templates: z.array(PlatformWhatsAppTemplateInspectionDTOSchema),
    messageLinks: z.array(PlatformWhatsAppMessageLinkInspectionDTOSchema),
});

export const PlatformWhatsAppInspectionDTOSchema = z.object({
    accounts: z.array(PlatformWhatsAppAccountInspectionDTOSchema),
    storeConfigs: z.array(PlatformWhatsAppStoreConfigInspectionDTOSchema),
});

export const formatPlatformReportDateRangeLabel = (
    startDate: string | null,
    endDate: string | null,
): string => {
    if (!startDate && !endDate) return "All dates";
    if (startDate && endDate && startDate === endDate) return startDate;
    if (startDate && endDate) return `${startDate} to ${endDate}`;
    return startDate ?? endDate ?? "All dates";
};

export const FUTURE_BILLING_INSPECTION_DATE_MESSAGE = "Billing inspection dates cannot be in the future";

export type ResolvedBillingInspectionDateRange = {
    startDate: string | null;
    endDate: string | null;
    startAt: Date | null;
    endAt: Date | null;
};

export const FUTURE_REPORT_INSPECTION_DATE_MESSAGE = FUTURE_BILLING_INSPECTION_DATE_MESSAGE;

export const resolveBillingInspectionDateRange = (
    query: Pick<
        z.output<typeof PlatformBillingInspectionQuerySchema | typeof PlatformReportInspectionQuerySchema>,
        "startDate" | "endDate"
    >,
    now: Date,
): { ok: true; range: ResolvedBillingInspectionDateRange } | { ok: false; message: string } => {
    if (!query.startDate && !query.endDate) {
        return {
            ok: true,
            range: { startDate: null, endDate: null, startAt: null, endAt: null },
        };
    }

    const today = kolkataCalendarDate(now);
    const startDate = query.startDate ?? query.endDate ?? "";
    const endDate = query.endDate ?? query.startDate ?? "";

    if (startDate > today || endDate > today) {
        return { ok: false, message: FUTURE_BILLING_INSPECTION_DATE_MESSAGE };
    }

    return {
        ok: true,
        range: {
            startDate,
            endDate,
            startAt: kolkataDayStartUtc(startDate),
            endAt: kolkataDayStartUtc(addCalendarDays(endDate, 1)),
        },
    };
};

export const resolveReportInspectionDateRange = resolveBillingInspectionDateRange;

export const FUTURE_BILL_ACTIVITY_DATE_MESSAGE = FUTURE_BILLING_INSPECTION_DATE_MESSAGE;

export const resolveBillActivityDateRange = (
    query: Pick<z.output<typeof PlatformBillActivityQuerySchema>, "startDate" | "endDate">,
    now: Date,
): { ok: true; range: ResolvedBillingInspectionDateRange } | { ok: false; message: string } => {
    const today = kolkataCalendarDate(now);
    const startDate = query.startDate ?? query.endDate ?? today;
    const endDate = query.endDate ?? query.startDate ?? today;
    return resolveBillingInspectionDateRange({ startDate, endDate }, now);
};

const pad2 = (value: number) => String(value).padStart(2, "0");

export const billActivityGranularityForRange = (startDate: string, endDate: string): "hour" | "day" =>
    startDate === endDate ? "hour" : "day";

export const formatBillActivityHourLabel = (hour: number): string => {
    const period = hour < 12 ? "am" : "pm";
    const hour12 = hour % 12 === 0 ? 12 : hour % 12;
    return `${hour12} ${period}`;
};

const BILL_ACTIVITY_MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

export const formatBillActivityDayLabel = (calendarDate: string): string => {
    const [yearText, monthText, dayText] = calendarDate.split("-");
    const monthLabel = BILL_ACTIVITY_MONTH_LABELS[Number(monthText) - 1];
    return `${dayText} ${monthLabel} ${yearText}`;
};

export type PlatformBillActivityCountBucket = {
    bucketKey: string;
    billCount: number;
};

export const buildPlatformBillActivitySeries = (
    startDate: string,
    endDate: string,
    counts: PlatformBillActivityCountBucket[] = [],
): {
    granularity: z.infer<typeof PlatformBillActivityGranularitySchema>;
    points: Array<z.infer<typeof PlatformBillActivityPointDTOSchema>>;
    totalBillCount: number;
} => {
    const granularity = billActivityGranularityForRange(startDate, endDate);
    const countByKey = new Map(counts.map((item) => [item.bucketKey, item.billCount]));
    const points: Array<z.infer<typeof PlatformBillActivityPointDTOSchema>> = [];

    if (granularity === "hour") {
        for (let hour = 0; hour < 24; hour += 1) {
            const bucketKey = `${startDate}T${pad2(hour)}`;
            points.push({
                bucketKey,
                bucketStart: `${startDate}T${pad2(hour)}:00:00+05:30`,
                label: formatBillActivityHourLabel(hour),
                billCount: countByKey.get(bucketKey) ?? 0,
            });
        }
    } else {
        for (let calendarDate = startDate; calendarDate <= endDate; calendarDate = addCalendarDays(calendarDate, 1)) {
            points.push({
                bucketKey: calendarDate,
                bucketStart: `${calendarDate}T00:00:00+05:30`,
                label: formatBillActivityDayLabel(calendarDate),
                billCount: countByKey.get(calendarDate) ?? 0,
            });
        }
    }

    return {
        granularity,
        points,
        totalBillCount: points.reduce((sum, point) => sum + point.billCount, 0),
    };
};

export const kolkataCalendarDate = (now: Date): string =>
    new Intl.DateTimeFormat("en-CA", { timeZone: PLATFORM_REPORTING_TIMEZONE }).format(now);

export const kolkataDayStartUtc = (calendarDate: string): Date => new Date(`${calendarDate}T00:00:00+05:30`);

export const addCalendarDays = (calendarDate: string, days: number): string => {
    const [yearText, monthText, dayText] = calendarDate.split("-");
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
        throw new Error(`Invalid calendar date: ${calendarDate}`);
    }
    return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
};

export type ResolvedPlatformReportingPeriod = {
    selection: z.infer<typeof PlatformReportingPeriodSelectionSchema>;
    startDate: string | null;
    endDate: string | null;
    startAt: Date | null;
    endAt: Date | null;
};

export type ResolvedActivityWindow = {
    startDate: string;
    endDate: string;
    startAt: Date;
    endAt: Date;
};

export const FUTURE_PLATFORM_REPORTING_PERIOD_MESSAGE = "Platform Reporting Period dates cannot be in the future";

const boundedPeriod = (
    selection: Exclude<z.infer<typeof PlatformReportingPeriodSelectionSchema>, "all-time">,
    startDate: string,
    endDate: string,
): ResolvedPlatformReportingPeriod => ({
    selection,
    startDate,
    endDate,
    startAt: kolkataDayStartUtc(startDate),
    endAt: kolkataDayStartUtc(addCalendarDays(endDate, 1)),
});

export const resolvePlatformReportingPeriod = (
    query: Pick<z.output<typeof PlatformDashboardQuerySchema>, "period" | "startDate" | "endDate">,
    now: Date,
): { ok: true; period: ResolvedPlatformReportingPeriod } | { ok: false; message: string } => {
    if (query.period === "all-time") {
        return {
            ok: true,
            period: {
                selection: "all-time",
                startDate: null,
                endDate: null,
                startAt: null,
                endAt: null,
            },
        };
    }

    const today = kolkataCalendarDate(now);

    if (query.period === "custom") {
        const startDate = query.startDate ?? "";
        const endDate = query.endDate ?? "";
        if (startDate > today || endDate > today) {
            return { ok: false, message: FUTURE_PLATFORM_REPORTING_PERIOD_MESSAGE };
        }
        return { ok: true, period: boundedPeriod("custom", startDate, endDate) };
    }

    const dayCount = query.period === "7d" ? 7 : query.period === "30d" ? 30 : 90;
    const startDate = addCalendarDays(today, -(dayCount - 1));
    return { ok: true, period: boundedPeriod(query.period, startDate, today) };
};

export const resolveActiveStoreWindow = (now: Date): ResolvedActivityWindow => {
    const today = kolkataCalendarDate(now);
    const startDate = addCalendarDays(today, -(ACTIVE_STORE_LOOKBACK_DAYS - 1));
    return {
        startDate,
        endDate: today,
        startAt: kolkataDayStartUtc(startDate),
        endAt: kolkataDayStartUtc(addCalendarDays(today, 1)),
    };
};
