import { z } from "zod";
import { dtoDateSchema } from "../../common";
import {
    CommercialCatalogKeySchema,
    CommercialCatalogDisplayNameSchema,
    CommercialCatalogTermSchema,
    CommercialPlanTypeSchema,
} from "../platform/commercial-catalog.schema";

export const CommercialAccessSourceKindSchema = z.enum([
    "store_license",
    "co_term_add_on",
    "store_access_grant",
]);

export const StoreLicenseStatusSchema = z.enum(["scheduled", "active", "expired", "revoked"]);

export const CommercialFeatureEntitlementEvidenceDTOSchema = z.object({
    sourceKind: CommercialAccessSourceKindSchema,
    sourceId: z.uuid("Invalid commercial access source id"),
    moduleKey: CommercialCatalogKeySchema,
    moduleDisplayName: CommercialCatalogDisplayNameSchema,
    featureDisplayName: CommercialCatalogDisplayNameSchema,
    startsAt: dtoDateSchema,
    endsAt: dtoDateSchema,
});

export const EntitledFeatureDTOSchema = z.object({
    key: CommercialCatalogKeySchema,
    displayName: CommercialCatalogDisplayNameSchema,
    sources: z.array(CommercialFeatureEntitlementEvidenceDTOSchema).min(1),
});

export const StoreFeatureEntitlementDTOSchema = z.object({
    storeId: z.uuid("Invalid store id"),
    features: z.array(EntitledFeatureDTOSchema),
});

export const FeatureEntitlementDecisionDTOSchema = z.object({
    entitled: z.boolean(),
    featureKey: CommercialCatalogKeySchema,
    evidence: z.array(CommercialFeatureEntitlementEvidenceDTOSchema),
});

export const StoreLicenseBaseAccessDTOSchema = z.object({
    id: z.uuid("Invalid Store License id"),
    sourceKind: z.literal("store_license"),
    planKey: CommercialCatalogKeySchema,
    planDisplayName: CommercialCatalogDisplayNameSchema,
    planType: CommercialPlanTypeSchema,
    term: CommercialCatalogTermSchema,
    startsAt: dtoDateSchema,
    endsAt: dtoDateSchema,
    status: StoreLicenseStatusSchema,
});

export const StoreTrialAvailabilityDTOSchema = z.object({
    eligible: z.boolean(),
    message: z.string().min(1),
});

export const StoreAccessGrantOriginSchema = z.enum(["legacy_migration", "administrator"]);
export const StoreAccessGrantTermKindSchema = z.enum([
    "seven_day",
    "extended",
    "complimentary",
    "custom_range",
]);
export const StoreAccessGrantSelectionKindSchema = z.enum([
    "plan",
    "module",
    "all_current_modules",
]);

export const StoreAccessGrantModuleDTOSchema = z.object({
    key: CommercialCatalogKeySchema,
    displayName: CommercialCatalogDisplayNameSchema,
    features: z.array(z.object({
        key: CommercialCatalogKeySchema,
        displayName: CommercialCatalogDisplayNameSchema,
    })),
});

export const StoreAccessGrantDTOSchema = z.object({
    id: z.uuid("Invalid Store Access Grant id"),
    sourceKind: z.literal("store_access_grant"),
    origin: StoreAccessGrantOriginSchema,
    termKind: StoreAccessGrantTermKindSchema,
    selectionKind: StoreAccessGrantSelectionKindSchema,
    label: z.string().min(1),
    selectionLabel: z.string().min(1),
    planKey: CommercialCatalogKeySchema.nullable(),
    planDisplayName: CommercialCatalogDisplayNameSchema.nullable(),
    moduleKey: CommercialCatalogKeySchema.nullable(),
    moduleDisplayName: CommercialCatalogDisplayNameSchema.nullable(),
    term: CommercialCatalogTermSchema,
    startsAt: dtoDateSchema,
    endsAt: dtoDateSchema,
    status: StoreLicenseStatusSchema,
    modules: z.array(StoreAccessGrantModuleDTOSchema),
});

export const GrantablePlanDTOSchema = z.object({
    key: CommercialCatalogKeySchema,
    displayName: CommercialCatalogDisplayNameSchema,
    planType: CommercialPlanTypeSchema,
    term: CommercialCatalogTermSchema,
});

export const GrantableModuleDTOSchema = z.object({
    key: CommercialCatalogKeySchema,
    displayName: CommercialCatalogDisplayNameSchema,
});

export const GrantableCommercialAccessDTOSchema = z.object({
    plans: z.array(GrantablePlanDTOSchema),
    modules: z.array(GrantableModuleDTOSchema),
});

export const COMMERCIAL_QUOTE_TTL_MS = 30 * 60 * 1000;
export const COMMERCIAL_QUOTE_CURRENCY = "INR" as const;

export const inrToPaise = (amountInr: number): number => Math.round(amountInr * 100);

export const CommercialQuoteKindSchema = z.enum([
    "paid_plan",
    "plan_renewal",
    "plan_upgrade",
    "co_term_add_on",
]);
export const PaidPlanCheckoutActionSchema = z.enum(["term_purchase", "renewal", "upgrade"]);
export const CommercialQuoteStatusSchema = z.enum(["open", "expired", "fulfilled"]);
export const CommercialQuoteLicenseTimingSchema = z.enum(["immediate", "scheduled"]);
export const CommercialHistoryEntryKindSchema = z.enum([
    "quote",
    "payment",
    "license",
    "add_on",
    "refund",
    "revocation",
]);
export const CommercialPaymentEventFulfillmentStatusSchema = z.enum([
    "received",
    "fulfilled",
    "ignored",
    "mismatched",
    "failed",
]);

export const CommercialQuoteLineItemDTOSchema = z.object({
    description: z.string().min(1),
    amountInr: z.number(),
});

export const CommercialQuoteDTOSchema = z.object({
    id: z.uuid("Invalid Commercial Quote id"),
    kind: CommercialQuoteKindSchema,
    status: CommercialQuoteStatusSchema,
    planKey: CommercialCatalogKeySchema.nullable(),
    planDisplayName: CommercialCatalogDisplayNameSchema.nullable(),
    planType: z.literal("paid").nullable(),
    moduleKey: CommercialCatalogKeySchema.nullable(),
    moduleDisplayName: CommercialCatalogDisplayNameSchema.nullable(),
    priceInr: z.number(),
    amountInr: z.number(),
    amountPaise: z.number().int().nonnegative(),
    currency: z.literal(COMMERCIAL_QUOTE_CURRENCY),
    term: CommercialCatalogTermSchema,
    licenseTiming: CommercialQuoteLicenseTimingSchema,
    intendedStartsAt: dtoDateSchema,
    intendedEndsAt: dtoDateSchema,
    expiresAt: dtoDateSchema,
    razorpayOrderId: z.string().min(1),
    lineItems: z.array(CommercialQuoteLineItemDTOSchema).min(1),
    fulfilledAt: dtoDateSchema.nullable(),
}).superRefine((value, context) => {
    if (value.kind === "co_term_add_on") {
        if (!value.moduleKey || !value.moduleDisplayName) {
            context.addIssue({
                code: "custom",
                message: "Co-Term Add-On quotes require a Module selection",
                path: ["moduleKey"],
            });
        }
        if (value.planKey !== null || value.planDisplayName !== null || value.planType !== null) {
            context.addIssue({
                code: "custom",
                message: "Co-Term Add-On quotes must not include Plan selection fields",
                path: ["planKey"],
            });
        }
        return;
    }
    if (!value.planKey || !value.planDisplayName || value.planType !== "paid") {
        context.addIssue({
            code: "custom",
            message: "Plan checkout quotes require a paid Plan selection",
            path: ["planKey"],
        });
    }
    if (value.moduleKey !== null || value.moduleDisplayName !== null) {
        context.addIssue({
            code: "custom",
            message: "Plan checkout quotes must not include Module selection fields",
            path: ["moduleKey"],
        });
    }
});

export const PurchasablePaidPlanDTOSchema = z.object({
    key: CommercialCatalogKeySchema,
    displayName: CommercialCatalogDisplayNameSchema,
    checkoutAction: PaidPlanCheckoutActionSchema,
    priceInr: z.number(),
    amountInr: z.number(),
    term: CommercialCatalogTermSchema,
    licenseTiming: CommercialQuoteLicenseTimingSchema,
    intendedStartsAt: dtoDateSchema,
    intendedEndsAt: dtoDateSchema,
});

export const StoreCoTermAddOnDTOSchema = z.object({
    id: z.uuid("Invalid Co-Term Add-On id"),
    sourceKind: z.literal("co_term_add_on"),
    moduleKey: CommercialCatalogKeySchema,
    moduleDisplayName: CommercialCatalogDisplayNameSchema,
    term: CommercialCatalogTermSchema,
    startsAt: dtoDateSchema,
    endsAt: dtoDateSchema,
    status: StoreLicenseStatusSchema,
});

export const PurchasableCoTermAddOnDTOSchema = z.object({
    key: CommercialCatalogKeySchema,
    displayName: CommercialCatalogDisplayNameSchema,
    priceInr: z.number(),
    amountInr: z.number(),
    term: CommercialCatalogTermSchema,
    intendedStartsAt: dtoDateSchema,
    intendedEndsAt: dtoDateSchema,
});

export const CommercialHistoryEntryDTOSchema = z.object({
    kind: CommercialHistoryEntryKindSchema,
    id: z.string().min(1),
    occurredAt: dtoDateSchema,
    title: z.string().min(1),
    detail: z.string().min(1),
    amountInr: z.number().nullable(),
    status: z.string().min(1),
});

export const CreatePaidPlanCheckoutSchema = z.object({
    planKey: CommercialCatalogKeySchema,
}).strict();

export const CreateCoTermAddOnCheckoutSchema = z.object({
    moduleKey: CommercialCatalogKeySchema,
}).strict();

export const RazorpayCheckoutBootstrapDTOSchema = z.object({
    keyId: z.string().min(1),
    orderId: z.string().min(1),
    amountPaise: z.number().int().positive(),
    currency: z.literal(COMMERCIAL_QUOTE_CURRENCY),
});

export const StoreCommercialStatusDTOSchema = z.object({
    storeId: z.uuid("Invalid store id"),
    organizationId: z.uuid("Invalid organization id"),
    timezone: z.literal("Asia/Kolkata"),
    baseAccess: StoreLicenseBaseAccessDTOSchema.nullable(),
    scheduledSuccessor: StoreLicenseBaseAccessDTOSchema.nullable(),
    accessGrants: z.array(StoreAccessGrantDTOSchema),
    activeAddOns: z.array(StoreCoTermAddOnDTOSchema),
    availablePaidPlans: z.array(PurchasablePaidPlanDTOSchema),
    availableCoTermAddOns: z.array(PurchasableCoTermAddOnDTOSchema),
    pendingCheckout: CommercialQuoteDTOSchema.nullable(),
    commercialHistory: z.array(CommercialHistoryEntryDTOSchema),
    trial: StoreTrialAvailabilityDTOSchema,
    entitlements: StoreFeatureEntitlementDTOSchema,
});

export const StoreCommercialStatusResponseSchema = z.object({
    commercialStatus: StoreCommercialStatusDTOSchema,
});

export const StartStoreTrialResponseSchema = StoreCommercialStatusResponseSchema;

export const PaidPlanCheckoutResponseSchema = z.object({
    quote: CommercialQuoteDTOSchema,
    checkout: RazorpayCheckoutBootstrapDTOSchema,
    commercialStatus: StoreCommercialStatusDTOSchema,
});

export const CoTermAddOnCheckoutResponseSchema = PaidPlanCheckoutResponseSchema;

export const RefundableCommercialPaymentDTOSchema = z.object({
    paymentEventId: z.uuid("Invalid Commercial Payment Event id"),
    quoteId: z.uuid("Invalid Commercial Quote id"),
    razorpayPaymentId: z.string().min(1),
    razorpayOrderId: z.string().min(1),
    amountInr: z.number(),
    amountPaise: z.number().int().positive(),
    currency: z.literal(COMMERCIAL_QUOTE_CURRENCY),
    paidAt: dtoDateSchema,
    accessSourceKind: z.enum(["store_license", "co_term_add_on"]),
    accessSourceId: z.uuid("Invalid commercial access source id"),
    accessSourceLabel: z.string().min(1),
    accessSourceStatus: StoreLicenseStatusSchema,
    accessSourceStartsAt: dtoDateSchema,
    accessSourceEndsAt: dtoDateSchema,
});

export const CommercialRefundDTOSchema = z.object({
    id: z.uuid("Invalid Commercial Refund id"),
    quoteId: z.uuid("Invalid Commercial Quote id"),
    paymentEventId: z.uuid("Invalid Commercial Payment Event id"),
    razorpayPaymentId: z.string().min(1),
    razorpayRefundId: z.string().min(1),
    amountInr: z.number(),
    amountPaise: z.number().int().positive(),
    currency: z.literal(COMMERCIAL_QUOTE_CURRENCY),
    createdAt: dtoDateSchema,
});

export const LicenseRevocationDTOSchema = z.object({
    id: z.uuid("Invalid License Revocation id"),
    accessSourceKind: z.enum(["store_license", "co_term_add_on"]),
    accessSourceId: z.uuid("Invalid commercial access source id"),
    accessSourceLabel: z.string().min(1),
    effectiveEndsAt: dtoDateSchema,
    recordedAt: dtoDateSchema,
    refund: CommercialRefundDTOSchema,
});

export const CreateCommercialRefundAndRevocationSchema = z.object({
    paymentEventId: z.uuid("Invalid Commercial Payment Event id"),
    amountPaise: z.number().int().positive(),
    effectiveEndsAt: dtoDateSchema.optional(),
}).strict();

export const ConsoleStoreCommercialInspectionResponseSchema = z.object({
    commercialStatus: StoreCommercialStatusDTOSchema,
    grantableAccess: GrantableCommercialAccessDTOSchema,
    refundablePayments: z.array(RefundableCommercialPaymentDTOSchema),
});

export const StoreAccessGrantSelectionSchema = z.discriminatedUnion("kind", [
    z.object({
        kind: z.literal("plan"),
        planKey: CommercialCatalogKeySchema,
    }).strict(),
    z.object({
        kind: z.literal("module"),
        moduleKey: CommercialCatalogKeySchema,
    }).strict(),
]);

export const CreateStoreAccessGrantSchema = z.discriminatedUnion("termKind", [
    z.object({
        termKind: z.literal("seven_day"),
        selection: StoreAccessGrantSelectionSchema,
    }).strict(),
    z.object({
        termKind: z.literal("extended"),
        selection: StoreAccessGrantSelectionSchema,
        term: CommercialCatalogTermSchema,
    }).strict(),
    z.object({
        termKind: z.literal("complimentary"),
        selection: StoreAccessGrantSelectionSchema,
        term: CommercialCatalogTermSchema,
    }).strict(),
    z.object({
        termKind: z.literal("custom_range"),
        selection: StoreAccessGrantSelectionSchema,
        startsAt: dtoDateSchema.optional(),
        endsAt: dtoDateSchema,
    }).strict(),
]);

export const LEGACY_MIGRATION_GRANT_TERM = { count: 30, unit: "day" } as const;
export const SEVEN_DAY_GRANT_TERM = { count: 7, unit: "day" } as const;

export const storeAccessGrantLabel = (grant: {
    origin: z.infer<typeof StoreAccessGrantOriginSchema>;
    termKind: z.infer<typeof StoreAccessGrantTermKindSchema>;
}): string => {
    if (grant.origin === "legacy_migration") {
        return "Legacy migration grant";
    }
    if (grant.termKind === "seven_day") {
        return "Seven-day Store Access Grant";
    }
    if (grant.termKind === "extended") {
        return "Extended Store Access Grant";
    }
    if (grant.termKind === "complimentary") {
        return "Complimentary Store Access Grant";
    }
    return "Custom-range Store Access Grant";
};

export const storeAccessGrantSelectionLabel = (grant: {
    selectionKind: z.infer<typeof StoreAccessGrantSelectionKindSchema>;
    planDisplayName: string | null;
    modules: Array<{ displayName: string }>;
}): string => {
    if (grant.selectionKind === "all_current_modules") {
        return "All current Modules";
    }
    if (grant.selectionKind === "plan") {
        return grant.planDisplayName ?? "Plan";
    }
    return grant.modules[0]?.displayName ?? "Module";
};
