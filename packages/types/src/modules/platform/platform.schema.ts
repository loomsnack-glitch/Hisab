import { z } from "zod";
import { dtoDateSchema, normalizePhoneNumber, phoneSchema } from "../../common";
import {
    CustomerSummaryDTOSchema,
    PaymentDTOSchema,
    PaymentMethodSchema,
    PaymentStatusSchema,
    SaleDeviceAuditDTOSchema,
    SaleItemDTOSchema,
    SaleStatusSchema,
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
import { StoreDeviceStatusSchema } from "../organization/organization.schema";

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

export const FUTURE_BILLING_INSPECTION_DATE_MESSAGE = "Billing inspection dates cannot be in the future";

export type ResolvedBillingInspectionDateRange = {
    startDate: string | null;
    endDate: string | null;
    startAt: Date | null;
    endAt: Date | null;
};

export const resolveBillingInspectionDateRange = (
    query: Pick<z.output<typeof PlatformBillingInspectionQuerySchema>, "startDate" | "endDate">,
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
