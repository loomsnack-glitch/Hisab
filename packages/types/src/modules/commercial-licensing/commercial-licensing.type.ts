import type { z } from "zod";
import type { CommercialCatalogTerm, CommercialPlanType } from "../platform/commercial-catalog.type";
import type {
    CommercialAccessSourceKindSchema,
    CommercialFeatureEntitlementEvidenceDTOSchema,
    CommercialHistoryEntryDTOSchema,
    CommercialPaymentEventFulfillmentStatusSchema,
    CommercialQuoteDTOSchema,
    CommercialQuoteKindSchema,
    CommercialQuoteLicenseTimingSchema,
    CommercialQuoteLineItemDTOSchema,
    CommercialQuoteStatusSchema,
    ConsoleStoreCommercialInspectionResponseSchema,
    CreatePaidPlanCheckoutSchema,
    CreateStoreAccessGrantSchema,
    EntitledFeatureDTOSchema,
    FeatureEntitlementDecisionDTOSchema,
    GrantableCommercialAccessDTOSchema,
    GrantableModuleDTOSchema,
    GrantablePlanDTOSchema,
    PaidPlanCheckoutResponseSchema,
    PurchasablePaidPlanDTOSchema,
    RazorpayCheckoutBootstrapDTOSchema,
    StartStoreTrialResponseSchema,
    StoreAccessGrantDTOSchema,
    StoreAccessGrantModuleDTOSchema,
    StoreAccessGrantOriginSchema,
    StoreAccessGrantSelectionKindSchema,
    StoreAccessGrantSelectionSchema,
    StoreAccessGrantTermKindSchema,
    StoreCommercialStatusDTOSchema,
    StoreCommercialStatusResponseSchema,
    StoreFeatureEntitlementDTOSchema,
    StoreLicenseBaseAccessDTOSchema,
    StoreLicenseStatusSchema,
    StoreTrialAvailabilityDTOSchema,
} from "./commercial-licensing.schema";

export type CommercialAccessSourceKind = z.infer<typeof CommercialAccessSourceKindSchema>;
export type StoreLicenseStatus = z.infer<typeof StoreLicenseStatusSchema>;
export type CommercialFeatureEntitlementEvidenceDTO = z.infer<
    typeof CommercialFeatureEntitlementEvidenceDTOSchema
>;
export type EntitledFeatureDTO = z.infer<typeof EntitledFeatureDTOSchema>;
export type StoreFeatureEntitlementDTO = z.infer<typeof StoreFeatureEntitlementDTOSchema>;
export type FeatureEntitlementDecisionDTO = z.infer<typeof FeatureEntitlementDecisionDTOSchema>;
export type StoreLicenseBaseAccessDTO = z.infer<typeof StoreLicenseBaseAccessDTOSchema>;
export type StoreTrialAvailabilityDTO = z.infer<typeof StoreTrialAvailabilityDTOSchema>;
export type StoreCommercialStatusDTO = z.infer<typeof StoreCommercialStatusDTOSchema>;
export type StoreCommercialStatusResponse = z.infer<typeof StoreCommercialStatusResponseSchema>;
export type StartStoreTrialResponse = z.infer<typeof StartStoreTrialResponseSchema>;
export type CommercialQuoteKind = z.infer<typeof CommercialQuoteKindSchema>;
export type CommercialQuoteStatus = z.infer<typeof CommercialQuoteStatusSchema>;
export type CommercialQuoteLicenseTiming = z.infer<typeof CommercialQuoteLicenseTimingSchema>;
export type CommercialQuoteLineItemDTO = z.infer<typeof CommercialQuoteLineItemDTOSchema>;
export type CommercialQuoteDTO = z.infer<typeof CommercialQuoteDTOSchema>;
export type PurchasablePaidPlanDTO = z.infer<typeof PurchasablePaidPlanDTOSchema>;
export type CommercialHistoryEntryDTO = z.infer<typeof CommercialHistoryEntryDTOSchema>;
export type CommercialPaymentEventFulfillmentStatus = z.infer<
    typeof CommercialPaymentEventFulfillmentStatusSchema
>;
export type CreatePaidPlanCheckoutJSON = z.input<typeof CreatePaidPlanCheckoutSchema>;
export type CreatePaidPlanCheckoutSVC = z.output<typeof CreatePaidPlanCheckoutSchema>;
export type RazorpayCheckoutBootstrapDTO = z.infer<typeof RazorpayCheckoutBootstrapDTOSchema>;
export type PaidPlanCheckoutResponse = z.infer<typeof PaidPlanCheckoutResponseSchema>;
export type StoreAccessGrantOrigin = z.infer<typeof StoreAccessGrantOriginSchema>;
export type StoreAccessGrantTermKind = z.infer<typeof StoreAccessGrantTermKindSchema>;
export type StoreAccessGrantSelectionKind = z.infer<typeof StoreAccessGrantSelectionKindSchema>;
export type StoreAccessGrantModuleDTO = z.infer<typeof StoreAccessGrantModuleDTOSchema>;
export type StoreAccessGrantDTO = z.infer<typeof StoreAccessGrantDTOSchema>;
export type GrantablePlanDTO = z.infer<typeof GrantablePlanDTOSchema>;
export type GrantableModuleDTO = z.infer<typeof GrantableModuleDTOSchema>;
export type GrantableCommercialAccessDTO = z.infer<typeof GrantableCommercialAccessDTOSchema>;
export type ConsoleStoreCommercialInspectionResponse = z.infer<
    typeof ConsoleStoreCommercialInspectionResponseSchema
>;
export type StoreAccessGrantSelection = z.infer<typeof StoreAccessGrantSelectionSchema>;
export type CreateStoreAccessGrantJSON = z.input<typeof CreateStoreAccessGrantSchema>;
export type CreateStoreAccessGrantSVC = z.output<typeof CreateStoreAccessGrantSchema>;

export type CommercialAccessSourceFeatureSnapshot = {
    featureId: string;
    featureRevisionId: string;
    key: string;
    displayName: string;
};

export type CommercialAccessSourceModuleSnapshot = {
    moduleId: string;
    moduleRevisionId: string;
    key: string;
    displayName: string;
    features: CommercialAccessSourceFeatureSnapshot[];
};

export type CommercialAccessSourceRecord = {
    id: string;
    kind: CommercialAccessSourceKind;
    storeId: string;
    organizationId: string;
    startsAt: Date;
    endsAt: Date;
    revokedAt: Date | null;
    planKey: string | null;
    planDisplayName: string | null;
    planType: CommercialPlanType | null;
    term: CommercialCatalogTerm | null;
    modules: CommercialAccessSourceModuleSnapshot[];
};

export type ActivePlanSnapshot = {
    planId: string;
    planRevisionId: string;
    key: string;
    displayName: string;
    planType: CommercialPlanType;
    priceInr: number;
    term: CommercialCatalogTerm;
    modules: CommercialAccessSourceModuleSnapshot[];
};

export type ActiveTrialPlanSnapshot = ActivePlanSnapshot & {
    planType: "trial";
};

export type StoreAccessGrantRecord = {
    id: string;
    organizationId: string;
    storeId: string;
    origin: StoreAccessGrantOrigin;
    termKind: StoreAccessGrantTermKind;
    selectionKind: StoreAccessGrantSelectionKind;
    planId: string | null;
    planRevisionId: string | null;
    planKey: string | null;
    planDisplayName: string | null;
    planType: CommercialPlanType | null;
    term: CommercialCatalogTerm;
    startsAt: Date;
    endsAt: Date;
    revokedAt: Date | null;
    createdByOwnerUserId: string | null;
    createdAt: Date;
    modules: CommercialAccessSourceModuleSnapshot[];
};

export type ExistingStoreRecord = {
    id: string;
    organizationId: string;
    createdAt: Date;
};

export type CommercialEnforcementLaunch = {
    launchedAt: Date;
};

export type StoreLicenseRecord = {
    id: string;
    organizationId: string;
    storeId: string;
    sourceKind: "trial" | "paid";
    planId: string;
    planRevisionId: string;
    planKey: string;
    planDisplayName: string;
    planType: CommercialPlanType;
    priceInr: number;
    term: CommercialCatalogTerm;
    startsAt: Date;
    endsAt: Date;
    revokedAt: Date | null;
    commercialQuoteId: string | null;
    createdByUserId: string;
    createdAt: Date;
    modules: CommercialAccessSourceModuleSnapshot[];
};

export type CommercialQuoteLineItemRecord = {
    description: string;
    amountInr: number;
};

export type CommercialQuoteRecord = {
    id: string;
    organizationId: string;
    storeId: string;
    kind: CommercialQuoteKind;
    planId: string;
    planRevisionId: string;
    planKey: string;
    planDisplayName: string;
    planType: "paid";
    priceInr: number;
    amountInr: number;
    amountPaise: number;
    currency: "INR";
    term: CommercialCatalogTerm;
    licenseTiming: CommercialQuoteLicenseTiming;
    intendedStartsAt: Date;
    intendedEndsAt: Date;
    razorpayOrderId: string;
    razorpayReceipt: string;
    expiresAt: Date;
    fulfilledAt: Date | null;
    fulfilledLicenseId: string | null;
    createdByUserId: string;
    createdAt: Date;
    lineItems: CommercialQuoteLineItemRecord[];
    modules: CommercialAccessSourceModuleSnapshot[];
};

export type CommercialPaymentEventRecord = {
    id: string;
    razorpayEventId: string;
    eventType: string;
    razorpayOrderId: string | null;
    razorpayPaymentId: string | null;
    amountPaise: number | null;
    currency: string | null;
    quoteId: string | null;
    fulfillmentStatus: CommercialPaymentEventFulfillmentStatus;
    fulfillmentError: string | null;
    payload: unknown;
    createdAt: Date;
    processedAt: Date | null;
};
