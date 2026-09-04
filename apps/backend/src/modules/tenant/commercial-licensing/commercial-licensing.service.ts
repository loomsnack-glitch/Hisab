import {
    addCommercialTerm,
    calculateCoTermAddOnCharge,
    calculatePlanUpgradeCharge,
    commercialAccessSourceEffectiveEndsAt,
    commercialTermsMatch,
    COMMERCIAL_QUOTE_CURRENCY,
    COMMERCIAL_QUOTE_TTL_MS,
    COMMERCIAL_TERM_TIMEZONE,
    inrToPaise,
    isCommercialAccessSourceActiveAt,
    LEGACY_MIGRATION_GRANT_TERM,
    SEVEN_DAY_GRANT_TERM,
    STATUS_CODES,
    storeAccessGrantLabel,
    storeAccessGrantSelectionLabel,
    type ActivePlanSnapshot,
    type ActivePurchasableModuleSnapshot,
    type ActiveTrialPlanSnapshot,
    type CommercialAccessSourceModuleSnapshot,
    type CommercialAccessSourceRecord,
    type CommercialCatalogTerm,
    type CommercialHistoryEntryDTO,
    type CommercialQuoteDTO,
    type CommercialQuoteKind,
    type CommercialQuoteRecord,
    type CommercialQuoteStatus,
    type ConsoleStoreCommercialInspectionResponse,
    type CreateCommercialRefundAndRevocationSVC,
    type CoTermAddOnCheckoutResponse,
    type CreateCoTermAddOnCheckoutSVC,
    type CreatePaidPlanCheckoutSVC,
    type CreateStoreAccessGrantSVC,
    type GrantableCommercialAccessDTO,
    type PaidPlanCheckoutResponse,
    type PaidPlanCheckoutAction,
    type RefundableCommercialPaymentDTO,
    type PurchasableCoTermAddOnDTO,
    type PurchasablePaidPlanDTO,
    type ServiceResponse,
    type StoreAccessGrantDTO,
    type StoreAccessGrantRecord,
    type StoreCoTermAddOnDTO,
    type StoreCoTermAddOnRecord,
    type StoreCommercialStatusDTO,
    type StoreCommercialStatusResponse,
    type StoreLicenseBaseAccessDTO,
    type StoreLicenseRecord,
    type StoreLicenseStatus,
} from "@repo/types";
import * as organizationRepository from "@/modules/tenant/organization/organization.repository";
import * as commercialLicensingRepository from "./commercial-licensing.repository";
import {
    createFeatureEntitlementService,
    type FeatureEntitlementService,
} from "./feature-entitlement.service";
import {
    createRazorpayPaymentProvider,
    RazorpayAdapterError,
    type RazorpayPaymentProvider,
} from "./razorpay.adapter";

type OrganizationLookup = {
    getOrganizationByIdForUser: (
        organizationId: string,
        userId: string,
    ) => Promise<{ id: string } | null>;
    getOrganizationById: (organizationId: string) => Promise<{ id: string } | null>;
    getStoreById: (
        organizationId: string,
        storeId: string,
    ) => Promise<{ id: string; organizationId: string } | null>;
};

type CommercialLicensingRepository = Pick<
    typeof commercialLicensingRepository,
    | "getActiveTrialPlanSnapshot"
    | "getActivePlanSnapshotByKey"
    | "getActiveModuleSnapshotByKey"
    | "listActiveModuleSnapshots"
    | "listActivePurchasableModuleSnapshots"
    | "listActivePlanSnapshots"
    | "listStoreLicenses"
    | "listCoTermAddOnsForStore"
    | "listAccessGrantsForStore"
    | "listAccessSourcesForStore"
    | "listStoresExistingAt"
    | "getOrCreateEnforcementLaunch"
    | "insertTrialLicense"
    | "insertStoreAccessGrant"
    | "listCommercialQuotesForStore"
    | "getCommercialQuoteByRazorpayOrderId"
    | "insertCommercialQuote"
    | "insertPaymentEvent"
    | "updatePaymentEventFulfillment"
    | "listPaymentEventsForStore"
    | "fulfillPaidPlanQuote"
    | "fulfillCoTermAddOnQuote"
    | "listCommercialRefundsForStore"
    | "listLicenseRevocationsForStore"
    | "getCommercialPaymentEventById"
    | "insertCommercialRefundAndRevocation"
>;

export type CommercialLicensingDependencies = {
    organization: OrganizationLookup;
    repository: CommercialLicensingRepository;
    featureEntitlement: FeatureEntitlementService;
    razorpay: RazorpayPaymentProvider;
    createId: () => string;
    now: () => Date;
};

export type CommercialLicensingService = ReturnType<typeof createCommercialLicensingService>;

export type LegacyStoreMigrationGrantResult = {
    grantedStoreCount: number;
    launchedAt: Date;
};

export type IngestRazorpayWebhookInput = {
    razorpayEventId: string;
    eventType: string;
    payload: unknown;
    orderId: string | null;
    paymentId: string | null;
    amountPaise: number | null;
    currency: string | null;
    paidAt: Date | null;
};

const organizationNotFound = (): ServiceResponse<null> => ({
    status: "error",
    message: "Organization not found",
    data: null,
    code: STATUS_CODES.NOT_FOUND,
});

const storeNotFound = (): ServiceResponse<null> => ({
    status: "error",
    message: "Store not found",
    data: null,
    code: STATUS_CODES.NOT_FOUND,
});

const alreadyUsedTrial = (): ServiceResponse<null> => ({
    status: "error",
    message: "This Store has already used its standard Trial Plan.",
    data: null,
    code: STATUS_CODES.CONFLICT,
});

const trialPlanUnavailable = (): ServiceResponse<null> => ({
    status: "error",
    message: "The standard Trial Plan is not currently available.",
    data: null,
    code: STATUS_CODES.CONFLICT,
});

const activeBaseAccess = (): ServiceResponse<null> => ({
    status: "error",
    message: "This Store already has an active Plan.",
    data: null,
    code: STATUS_CODES.CONFLICT,
});

const catalogUnavailableToGrant = (): ServiceResponse<null> => ({
    status: "error",
    message: "That Plan or Module is not currently available to grant.",
    data: null,
    code: STATUS_CODES.CONFLICT,
});

const paidPlanUnavailable = (): ServiceResponse<null> => ({
    status: "error",
    message: "That paid Plan is not currently available.",
    data: null,
    code: STATUS_CODES.CONFLICT,
});

const paidCheckoutUnavailable = (): ServiceResponse<null> => ({
    status: "error",
    message: "This Store cannot start a new paid Plan checkout right now.",
    data: null,
    code: STATUS_CODES.CONFLICT,
});

const checkoutUnavailable = (): ServiceResponse<null> => ({
    status: "error",
    message: "Payment checkout is temporarily unavailable.",
    data: null,
    code: STATUS_CODES.SERVICE_UNAVAILABLE,
});

const invalidCustomRange = (): ServiceResponse<null> => ({
    status: "error",
    message: "A custom-range Store Access Grant must end after it starts.",
    data: null,
    code: STATUS_CODES.BAD_REQUEST,
});

const invalidCheckoutSelection = (): ServiceResponse<null> => ({
    status: "error",
    message: "That paid Plan checkout is not currently available for this Store.",
    data: null,
    code: STATUS_CODES.CONFLICT,
});

const addOnUnavailable = (): ServiceResponse<null> => ({
    status: "error",
    message: "That Module is not currently available as a Co-Term Add-On for this Store.",
    data: null,
    code: STATUS_CODES.CONFLICT,
});

const addOnCheckoutUnavailable = (): ServiceResponse<null> => ({
    status: "error",
    message: "This Store cannot start a Co-Term Add-On checkout right now.",
    data: null,
    code: STATUS_CODES.CONFLICT,
});

const refundUnavailable = (): ServiceResponse<null> => ({
    status: "error",
    message: "That payment cannot be refunded right now.",
    data: null,
    code: STATUS_CODES.CONFLICT,
});

const invalidRevocationEnd = (): ServiceResponse<null> => ({
    status: "error",
    message: "Choose an access end timestamp within the paid term.",
    data: null,
    code: STATUS_CODES.BAD_REQUEST,
});

const refundServiceUnavailable = (): ServiceResponse<null> => ({
    status: "error",
    message: "Payment refunds are temporarily unavailable.",
    data: null,
    code: STATUS_CODES.SERVICE_UNAVAILABLE,
});

const licenseStatusAt = (
    source: { startsAt: Date; endsAt: Date; revokedAt: Date | null },
    at: Date,
): StoreLicenseStatus => {
    const effectiveEndsAt = commercialAccessSourceEffectiveEndsAt(source);
    if (source.startsAt.getTime() > at.getTime()) {
        return source.revokedAt ? "revoked" : "scheduled";
    }
    if (at.getTime() >= effectiveEndsAt.getTime()) {
        return source.revokedAt ? "revoked" : "expired";
    }
    return "active";
};

const toBaseAccess = (license: StoreLicenseRecord, at: Date): StoreLicenseBaseAccessDTO => ({
    id: license.id,
    sourceKind: "store_license",
    planKey: license.planKey,
    planDisplayName: license.planDisplayName,
    planType: license.planType,
    term: license.term,
    startsAt: license.startsAt,
    endsAt: license.endsAt,
    status: licenseStatusAt(license, at),
});

const toLicenseAccessSource = (license: StoreLicenseRecord): CommercialAccessSourceRecord => ({
    id: license.id,
    kind: "store_license",
    storeId: license.storeId,
    organizationId: license.organizationId,
    startsAt: license.startsAt,
    endsAt: license.endsAt,
    revokedAt: license.revokedAt,
    planKey: license.planKey,
    planDisplayName: license.planDisplayName,
    planType: license.planType,
    term: license.term,
    modules: license.modules,
});

const trialAvailability = (licenses: StoreLicenseRecord[], hasActiveTrialPlan: boolean) => {
    if (licenses.some((license) => license.sourceKind === "trial")) {
        return {
            eligible: false,
            message: "This Store has already used its standard Trial Plan.",
        };
    }
    if (!hasActiveTrialPlan) {
        return {
            eligible: false,
            message: "The standard Trial Plan is not currently available.",
        };
    }
    return {
        eligible: true,
        message: "This Store can start the standard Trial Plan once.",
    };
};

const snapshotModules = (
    modules: CommercialAccessSourceModuleSnapshot[],
): CommercialAccessSourceModuleSnapshot[] =>
    modules.map((moduleItem) => ({
        ...moduleItem,
        features: moduleItem.features.map((feature) => ({ ...feature })),
    }));

const snapshotPlan = (plan: ActiveTrialPlanSnapshot): ActiveTrialPlanSnapshot => ({
    ...plan,
    term: { ...plan.term },
    modules: snapshotModules(plan.modules),
});

const snapshotPaidPlan = (plan: ActivePlanSnapshot): ActivePlanSnapshot => ({
    ...plan,
    term: { ...plan.term },
    modules: snapshotModules(plan.modules),
});

const quoteStatusAt = (quote: CommercialQuoteRecord, at: Date): CommercialQuoteStatus => {
    if (quote.fulfilledAt) {
        return "fulfilled";
    }
    if (at.getTime() >= quote.expiresAt.getTime()) {
        return "expired";
    }
    return "open";
};

const toQuoteDto = (quote: CommercialQuoteRecord, at: Date): CommercialQuoteDTO => ({
    id: quote.id,
    kind: quote.kind,
    status: quoteStatusAt(quote, at),
    planKey: quote.planKey,
    planDisplayName: quote.planDisplayName,
    planType: quote.planType,
    moduleKey: quote.moduleKey,
    moduleDisplayName: quote.moduleDisplayName,
    priceInr: quote.priceInr,
    amountInr: quote.amountInr,
    amountPaise: quote.amountPaise,
    currency: quote.currency,
    term: { ...quote.term },
    licenseTiming: quote.licenseTiming,
    intendedStartsAt: quote.intendedStartsAt,
    intendedEndsAt: quote.intendedEndsAt,
    expiresAt: quote.expiresAt,
    razorpayOrderId: quote.razorpayOrderId,
    lineItems: quote.lineItems.map((line) => ({ ...line })),
    fulfilledAt: quote.fulfilledAt,
});

const getActivePaidLicense = (licenses: StoreLicenseRecord[], at: Date) =>
    licenses.find((license) =>
        license.sourceKind === "paid"
        && isCommercialAccessSourceActiveAt(toLicenseAccessSource(license), at),
    ) ?? null;

const getScheduledPaidSuccessor = (licenses: StoreLicenseRecord[], at: Date) =>
    licenses.find((license) =>
        license.sourceKind === "paid"
        && licenseStatusAt(license, at) === "scheduled",
    ) ?? null;

const comparePaidPlanTier = (leftPriceInr: number, rightPriceInr: number) =>
    leftPriceInr - rightPriceInr;

const canStartInitialPaidPlanCheckout = (licenses: StoreLicenseRecord[], at: Date) => {
    const hasActivePaid = getActivePaidLicense(licenses, at) !== null;
    const hasScheduled = getScheduledPaidSuccessor(licenses, at) !== null;
    return !hasActivePaid && !hasScheduled;
};

const canOfferPaidPlanCheckout = (licenses: StoreLicenseRecord[], at: Date) =>
    getActivePaidLicense(licenses, at) !== null || canStartInitialPaidPlanCheckout(licenses, at);

const paidPlanTiming = (licenses: StoreLicenseRecord[], at: Date, term: CommercialCatalogTerm) => {
    const activeBase = licenses.find((license) =>
        isCommercialAccessSourceActiveAt(toLicenseAccessSource(license), at),
    ) ?? null;
    if (activeBase) {
        return {
            licenseTiming: "scheduled" as const,
            intendedStartsAt: activeBase.endsAt,
            intendedEndsAt: addCommercialTerm(activeBase.endsAt, term),
        };
    }
    return {
        licenseTiming: "immediate" as const,
        intendedStartsAt: at,
        intendedEndsAt: addCommercialTerm(at, term),
    };
};

const renewalTiming = (activePaid: StoreLicenseRecord, term: CommercialCatalogTerm) => ({
    licenseTiming: "scheduled" as const,
    intendedStartsAt: activePaid.endsAt,
    intendedEndsAt: addCommercialTerm(activePaid.endsAt, term),
});

const upgradeTiming = (activePaid: StoreLicenseRecord, at: Date) => ({
    licenseTiming: "immediate" as const,
    intendedStartsAt: at,
    intendedEndsAt: activePaid.endsAt,
});

const quoteKindLabel = (kind: CommercialQuoteKind) => {
    if (kind === "plan_renewal") {
        return "Early Renewal · Scheduled Store License";
    }
    if (kind === "plan_upgrade") {
        return "Plan Upgrade";
    }
    if (kind === "co_term_add_on") {
        return "Co-Term Add-On";
    }
    return "Term Purchase";
};

const quoteTitle = (quote: CommercialQuoteRecord) =>
    quote.kind === "co_term_add_on"
        ? `Commercial Quote for ${quote.moduleDisplayName ?? "Module"}`
        : `Commercial Quote for ${quote.planDisplayName ?? "Plan"}`;

const snapshotPurchasableModule = (
    moduleItem: ActivePurchasableModuleSnapshot,
): ActivePurchasableModuleSnapshot => ({
    ...moduleItem,
    term: { ...moduleItem.term },
    features: moduleItem.features.map((feature) => ({ ...feature })),
});

const moduleKeysFromAccessSources = (
    sources: CommercialAccessSourceRecord[],
    at: Date,
): Set<string> => {
    const keys = new Set<string>();
    for (const source of sources) {
        if (!isCommercialAccessSourceActiveAt(source, at)) {
            continue;
        }
        for (const moduleItem of source.modules) {
            keys.add(moduleItem.key);
        }
    }
    return keys;
};

const toCoTermAddOnDto = (addOn: StoreCoTermAddOnRecord, at: Date): StoreCoTermAddOnDTO => ({
    id: addOn.id,
    sourceKind: "co_term_add_on",
    moduleKey: addOn.moduleKey,
    moduleDisplayName: addOn.moduleDisplayName,
    term: { ...addOn.term },
    startsAt: addOn.startsAt,
    endsAt: addOn.endsAt,
    status: licenseStatusAt(addOn, at),
});

const toPurchasableCoTermAddOn = (
    moduleItem: ActivePurchasableModuleSnapshot,
    amountInr: number,
    intendedStartsAt: Date,
    intendedEndsAt: Date,
): PurchasableCoTermAddOnDTO => ({
    key: moduleItem.key,
    displayName: moduleItem.displayName,
    priceInr: moduleItem.priceInr,
    amountInr,
    term: { ...moduleItem.term },
    intendedStartsAt,
    intendedEndsAt,
});

const buildAvailableCoTermAddOns = (
    activePaid: StoreLicenseRecord,
    purchasableModules: ActivePurchasableModuleSnapshot[],
    accessSources: CommercialAccessSourceRecord[],
    at: Date,
): PurchasableCoTermAddOnDTO[] => {
    const ownedModuleKeys = moduleKeysFromAccessSources(accessSources, at);
    return purchasableModules
        .filter((moduleItem) =>
            commercialTermsMatch(moduleItem.term, activePaid.term)
            && !ownedModuleKeys.has(moduleItem.key),
        )
        .map((moduleItem) => {
            const charge = calculateCoTermAddOnCharge(
                moduleItem.priceInr,
                activePaid.startsAt,
                activePaid.endsAt,
                at,
                inrToPaise,
            );
            if (charge.amountPaise <= 0) {
                return null;
            }
            return toPurchasableCoTermAddOn(
                moduleItem,
                charge.amountInr,
                at,
                activePaid.endsAt,
            );
        })
        .filter((moduleItem): moduleItem is PurchasableCoTermAddOnDTO => moduleItem !== null);
};

const toPurchasablePlan = (
    plan: ActivePlanSnapshot,
    checkoutAction: PaidPlanCheckoutAction,
    amountInr: number,
    timing: {
        licenseTiming: PurchasablePaidPlanDTO["licenseTiming"];
        intendedStartsAt: Date;
        intendedEndsAt: Date;
    },
): PurchasablePaidPlanDTO => ({
    key: plan.key,
    displayName: plan.displayName,
    checkoutAction,
    priceInr: plan.priceInr,
    amountInr,
    term: { ...plan.term },
    ...timing,
});

const buildAvailablePaidPlans = (
    licenses: StoreLicenseRecord[],
    paidPlans: ActivePlanSnapshot[],
    at: Date,
): PurchasablePaidPlanDTO[] => {
    const activePaid = getActivePaidLicense(licenses, at);
    if (activePaid) {
        return paidPlans
            .filter((plan) => plan.planType === "paid")
            .flatMap((plan) => {
                const tierDelta = comparePaidPlanTier(plan.priceInr, activePaid.priceInr);
                if (tierDelta > 0) {
                    const upgrade = calculatePlanUpgradeCharge(
                        activePaid.priceInr,
                        plan.priceInr,
                        activePaid.startsAt,
                        activePaid.endsAt,
                        at,
                        inrToPaise,
                    );
                    if (upgrade.amountPaise <= 0) {
                        return [];
                    }
                    return [toPurchasablePlan(
                        plan,
                        "upgrade",
                        upgrade.amountInr,
                        upgradeTiming(activePaid, at),
                    )];
                }
                return [toPurchasablePlan(
                    plan,
                    "renewal",
                    plan.priceInr,
                    renewalTiming(activePaid, plan.term),
                )];
            });
    }
    if (!canStartInitialPaidPlanCheckout(licenses, at)) {
        return [];
    }
    return paidPlans
        .filter((plan) => plan.planType === "paid")
        .map((plan) => toPurchasablePlan(
            plan,
            "term_purchase",
            plan.priceInr,
            paidPlanTiming(licenses, at, plan.term),
        ));
};

const buildUpgradeQuoteLineItems = (
    planDisplayName: string,
    upgrade: ReturnType<typeof calculatePlanUpgradeCharge>,
) => [
    {
        description: `${planDisplayName} Plan charge for remaining term`,
        amountInr: upgrade.chargeInr,
    },
    {
        description: "Credit for unused current Plan term",
        amountInr: upgrade.creditInr,
    },
    {
        description: `${planDisplayName} Plan Upgrade total`,
        amountInr: upgrade.amountInr,
    },
];

const formatInr = (amount: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);

const formatCommercialTimestamp = (value: Date) =>
    value.toLocaleString("en-IN", {
        timeZone: COMMERCIAL_TERM_TIMEZONE,
        dateStyle: "medium",
        timeStyle: "short",
    });

const buildCommercialHistory = (
    licenses: StoreLicenseRecord[],
    addOns: StoreCoTermAddOnRecord[],
    quotes: CommercialQuoteRecord[],
    events: Awaited<ReturnType<CommercialLicensingRepository["listPaymentEventsForStore"]>>,
    refunds: Awaited<ReturnType<CommercialLicensingRepository["listCommercialRefundsForStore"]>>,
    revocations: Awaited<ReturnType<CommercialLicensingRepository["listLicenseRevocationsForStore"]>>,
    at: Date,
): CommercialHistoryEntryDTO[] => {
    const licenseById = new Map(licenses.map((license) => [license.id, license]));
    const addOnById = new Map(addOns.map((addOn) => [addOn.id, addOn]));
    const refundById = new Map(refunds.map((refund) => [refund.id, refund]));
    const entries: CommercialHistoryEntryDTO[] = [
        ...quotes.map((quote) => ({
            kind: "quote" as const,
            id: quote.id,
            occurredAt: quote.createdAt,
            title: quoteTitle(quote),
            detail: `${formatInr(quote.amountInr)} GST-inclusive · ${quoteKindLabel(quote.kind)}`,
            amountInr: quote.amountInr,
            status: quoteStatusAt(quote, at),
        })),
        ...events.map((event) => ({
            kind: "payment" as const,
            id: event.id,
            occurredAt: event.createdAt,
            title: "Verified Subscription Payment",
            detail: `${event.eventType}${event.razorpayOrderId ? ` · ${event.razorpayOrderId}` : ""}`,
            amountInr: event.amountPaise === null ? null : event.amountPaise / 100,
            status: event.fulfillmentStatus,
        })),
        ...licenses.filter((license) => license.sourceKind === "paid").map((license) => ({
            kind: "license" as const,
            id: license.id,
            occurredAt: license.createdAt,
            title: `${licenseStatusAt(license, at) === "scheduled" ? "Scheduled Store License" : "Store License"} · ${license.planDisplayName}`,
            detail: `${formatInr(license.priceInr)} · ${license.planKey}`,
            amountInr: license.priceInr,
            status: licenseStatusAt(license, at),
        })),
        ...addOns.map((addOn) => ({
            kind: "add_on" as const,
            id: addOn.id,
            occurredAt: addOn.createdAt,
            title: `Co-Term Add-On · ${addOn.moduleDisplayName}`,
            detail: `${formatInr(addOn.chargedAmountInr)} prorated · ${addOn.moduleKey}`,
            amountInr: addOn.chargedAmountInr,
            status: licenseStatusAt(addOn, at),
        })),
        ...refunds.map((refund) => ({
            kind: "refund" as const,
            id: refund.id,
            occurredAt: refund.createdAt,
            title: "Commercial Refund",
            detail: `${formatInr(refund.amountInr)} · ${refund.razorpayRefundId}`,
            amountInr: refund.amountInr,
            status: "refunded",
        })),
        ...revocations.map((revocation) => {
            const refund = refundById.get(revocation.commercialRefundId);
            const license = revocation.accessSourceKind === "store_license"
                ? licenseById.get(revocation.accessSourceId)
                : null;
            const addOn = revocation.accessSourceKind === "co_term_add_on"
                ? addOnById.get(revocation.accessSourceId)
                : null;
            const label = license
                ? `${license.planDisplayName} Store License`
                : addOn
                    ? `${addOn.moduleDisplayName} Co-Term Add-On`
                    : "Commercial access";
            return {
                kind: "revocation" as const,
                id: revocation.id,
                occurredAt: revocation.recordedAt,
                title: `License Revocation · ${label}`,
                detail: `${formatCommercialTimestamp(revocation.effectiveEndsAt)} access end${refund ? ` · ${refund.razorpayRefundId}` : ""}`,
                amountInr: refund?.amountInr ?? null,
                status: "revoked",
            };
        }),
    ];
    return entries.sort((left, right) => toDate(right.occurredAt).getTime() - toDate(left.occurredAt).getTime());
};

const toGrantDto = (grant: StoreAccessGrantRecord, at: Date): StoreAccessGrantDTO => ({
    id: grant.id,
    sourceKind: "store_access_grant",
    origin: grant.origin,
    termKind: grant.termKind,
    selectionKind: grant.selectionKind,
    label: storeAccessGrantLabel(grant),
    selectionLabel: storeAccessGrantSelectionLabel(grant),
    planKey: grant.planKey,
    planDisplayName: grant.planDisplayName,
    moduleKey: grant.selectionKind === "module" ? grant.modules[0]?.key ?? null : null,
    moduleDisplayName: grant.selectionKind === "module" ? grant.modules[0]?.displayName ?? null : null,
    term: grant.term,
    startsAt: grant.startsAt,
    endsAt: grant.endsAt,
    status: licenseStatusAt(grant, at),
    modules: grant.modules.map((moduleItem) => ({
        key: moduleItem.key,
        displayName: moduleItem.displayName,
        features: moduleItem.features.map((feature) => ({
            key: feature.key,
            displayName: feature.displayName,
        })),
    })),
});

const toDate = (value: string | Date): Date => (value instanceof Date ? value : new Date(value));

const customRangeTerm = (startsAt: Date, endsAt: Date): CommercialCatalogTerm => {
    const dayMs = 24 * 60 * 60 * 1000;
    return {
        count: Math.max(1, Math.round((endsAt.getTime() - startsAt.getTime()) / dayMs)),
        unit: "day",
    };
};

const toGrantableAccess = (
    plans: ActivePlanSnapshot[],
    modules: CommercialAccessSourceModuleSnapshot[],
): GrantableCommercialAccessDTO => ({
    plans: plans.map((plan) => ({
        key: plan.key,
        displayName: plan.displayName,
        planType: plan.planType,
        term: { ...plan.term },
    })),
    modules: modules.map((moduleItem) => ({
        key: moduleItem.key,
        displayName: moduleItem.displayName,
    })),
});

const buildRefundablePayments = (
    licenses: StoreLicenseRecord[],
    addOns: StoreCoTermAddOnRecord[],
    quotes: CommercialQuoteRecord[],
    events: Awaited<ReturnType<CommercialLicensingRepository["listPaymentEventsForStore"]>>,
    refunds: Awaited<ReturnType<CommercialLicensingRepository["listCommercialRefundsForStore"]>>,
    at: Date,
): RefundableCommercialPaymentDTO[] => {
    const refundedEventIds = new Set(refunds.map((refund) => refund.paymentEventId));
    const quoteById = new Map(quotes.map((quote) => [quote.id, quote]));
    const licenseById = new Map(licenses.map((license) => [license.id, license]));
    const addOnById = new Map(addOns.map((addOn) => [addOn.id, addOn]));

    return events
        .filter((event) =>
            event.fulfillmentStatus === "fulfilled"
            && event.quoteId
            && event.razorpayPaymentId
            && event.amountPaise
            && !refundedEventIds.has(event.id),
        )
        .flatMap((event) => {
            const quote = quoteById.get(event.quoteId!);
            if (!quote?.fulfilledAt) {
                return [];
            }
            if (quote.fulfilledLicenseId) {
                const license = licenseById.get(quote.fulfilledLicenseId);
                if (!license || license.sourceKind !== "paid" || license.revokedAt) {
                    return [];
                }
                return [{
                    paymentEventId: event.id,
                    quoteId: quote.id,
                    razorpayPaymentId: event.razorpayPaymentId!,
                    razorpayOrderId: quote.razorpayOrderId,
                    amountInr: event.amountPaise! / 100,
                    amountPaise: event.amountPaise!,
                    currency: COMMERCIAL_QUOTE_CURRENCY,
                    paidAt: event.processedAt ?? event.createdAt,
                    accessSourceKind: "store_license" as const,
                    accessSourceId: license.id,
                    accessSourceLabel: `${license.planDisplayName} Store License`,
                    accessSourceStatus: licenseStatusAt(license, at),
                    accessSourceStartsAt: license.startsAt,
                    accessSourceEndsAt: license.endsAt,
                }];
            }
            if (quote.fulfilledCoTermAddOnId) {
                const addOn = addOnById.get(quote.fulfilledCoTermAddOnId);
                if (!addOn || addOn.revokedAt) {
                    return [];
                }
                return [{
                    paymentEventId: event.id,
                    quoteId: quote.id,
                    razorpayPaymentId: event.razorpayPaymentId!,
                    razorpayOrderId: quote.razorpayOrderId,
                    amountInr: event.amountPaise! / 100,
                    amountPaise: event.amountPaise!,
                    currency: COMMERCIAL_QUOTE_CURRENCY,
                    paidAt: event.processedAt ?? event.createdAt,
                    accessSourceKind: "co_term_add_on" as const,
                    accessSourceId: addOn.id,
                    accessSourceLabel: `${addOn.moduleDisplayName} Co-Term Add-On`,
                    accessSourceStatus: licenseStatusAt(addOn, at),
                    accessSourceStartsAt: addOn.startsAt,
                    accessSourceEndsAt: addOn.endsAt,
                }];
            }
            return [];
        });
};

export const createCommercialLicensingService = (dependencies: CommercialLicensingDependencies) => {
    const authorizeStore = async (userId: string, organizationId: string, storeId: string) => {
        const organization = await dependencies.organization.getOrganizationByIdForUser(
            organizationId,
            userId,
        );
        if (!organization) {
            return { ok: false as const, response: organizationNotFound() };
        }
        const store = await dependencies.organization.getStoreById(organizationId, storeId);
        if (!store) {
            return { ok: false as const, response: storeNotFound() };
        }
        return { ok: true as const, store };
    };

    const authorizePlatformStore = async (organizationId: string, storeId: string) => {
        const organization = await dependencies.organization.getOrganizationById(organizationId);
        if (!organization) {
            return { ok: false as const, response: organizationNotFound() };
        }
        const store = await dependencies.organization.getStoreById(organizationId, storeId);
        if (!store) {
            return { ok: false as const, response: storeNotFound() };
        }
        return { ok: true as const, store };
    };

    const buildStatus = async (
        organizationId: string,
        storeId: string,
        at: Date,
    ): Promise<StoreCommercialStatusDTO> => {
        const [licenses, grants, addOns, trialPlan, paidPlans, purchasableModules, accessSources, quotes, paymentEvents, refunds, revocations] =
            await Promise.all([
            dependencies.repository.listStoreLicenses(storeId),
            dependencies.repository.listAccessGrantsForStore(storeId),
            dependencies.repository.listCoTermAddOnsForStore(storeId),
            dependencies.repository.getActiveTrialPlanSnapshot(),
            dependencies.repository.listActivePlanSnapshots(),
            dependencies.repository.listActivePurchasableModuleSnapshots(),
            dependencies.repository.listAccessSourcesForStore(storeId),
            dependencies.repository.listCommercialQuotesForStore(storeId),
            dependencies.repository.listPaymentEventsForStore(storeId),
            dependencies.repository.listCommercialRefundsForStore(storeId),
            dependencies.repository.listLicenseRevocationsForStore(storeId),
        ]);
        const entitlements = await dependencies.featureEntitlement.resolveStoreFeatureEntitlement(
            storeId,
            at,
        );
        const currentBase = licenses.find((license) =>
            isCommercialAccessSourceActiveAt(toLicenseAccessSource(license), at),
        ) ?? null;
        const activePaid = getActivePaidLicense(licenses, at);
        const scheduledSuccessor = getScheduledPaidSuccessor(licenses, at);
        const checkoutEligible = canOfferPaidPlanCheckout(licenses, at);
        const addOnCheckoutEligible = activePaid !== null;
        const pendingCheckout = quotes.find((quote) => quoteStatusAt(quote, at) === "open") ?? null;
        const activeAddOns = addOns
            .filter((addOn) => licenseStatusAt(addOn, at) === "active")
            .map((addOn) => toCoTermAddOnDto(addOn, at));

        return {
            storeId,
            organizationId,
            timezone: COMMERCIAL_TERM_TIMEZONE,
            baseAccess: currentBase ? toBaseAccess(currentBase, at) : null,
            scheduledSuccessor: scheduledSuccessor ? toBaseAccess(scheduledSuccessor, at) : null,
            accessGrants: grants.map((grant) => toGrantDto(grant, at)),
            activeAddOns,
            availablePaidPlans: checkoutEligible
                ? buildAvailablePaidPlans(licenses, paidPlans, at)
                : [],
            availableCoTermAddOns: addOnCheckoutEligible
                ? buildAvailableCoTermAddOns(activePaid, purchasableModules, accessSources, at)
                : [],
            pendingCheckout: pendingCheckout ? toQuoteDto(pendingCheckout, at) : null,
            commercialHistory: buildCommercialHistory(licenses, addOns, quotes, paymentEvents, refunds, revocations, at),
            trial: trialAvailability(licenses, trialPlan !== null),
            entitlements,
        };
    };

    const buildConsoleInspection = async (
        organizationId: string,
        storeId: string,
        at: Date,
    ): Promise<ConsoleStoreCommercialInspectionResponse> => {
        const [commercialStatus, plans, modules, licenses, addOns, quotes, paymentEvents, refunds] = await Promise.all([
            buildStatus(organizationId, storeId, at),
            dependencies.repository.listActivePlanSnapshots(),
            dependencies.repository.listActiveModuleSnapshots(),
            dependencies.repository.listStoreLicenses(storeId),
            dependencies.repository.listCoTermAddOnsForStore(storeId),
            dependencies.repository.listCommercialQuotesForStore(storeId),
            dependencies.repository.listPaymentEventsForStore(storeId),
            dependencies.repository.listCommercialRefundsForStore(storeId),
        ]);
        return {
            commercialStatus,
            grantableAccess: toGrantableAccess(plans, modules),
            refundablePayments: buildRefundablePayments(
                licenses,
                addOns,
                quotes,
                paymentEvents,
                refunds,
                at,
            ),
        };
    };

    const getStoreCommercialStatus = async (
        userId: string,
        organizationId: string,
        storeId: string,
    ): Promise<ServiceResponse<StoreCommercialStatusResponse | null>> => {
        const authorized = await authorizeStore(userId, organizationId, storeId);
        if (!authorized.ok) {
            return authorized.response;
        }

        return {
            status: "success",
            message: "Store commercial status fetched successfully",
            data: {
                commercialStatus: await buildStatus(organizationId, storeId, dependencies.now()),
            },
            code: STATUS_CODES.SUCCESS,
        };
    };

    const inspectStoreCommercialStatusForPlatform = async (
        organizationId: string,
        storeId: string,
    ): Promise<ServiceResponse<ConsoleStoreCommercialInspectionResponse | null>> => {
        const authorized = await authorizePlatformStore(organizationId, storeId);
        if (!authorized.ok) {
            return authorized.response;
        }

        return {
            status: "success",
            message: "Store commercial status fetched successfully",
            data: await buildConsoleInspection(organizationId, storeId, dependencies.now()),
            code: STATUS_CODES.SUCCESS,
        };
    };

    const startStandardTrial = async (
        userId: string,
        organizationId: string,
        storeId: string,
    ): Promise<ServiceResponse<StoreCommercialStatusResponse | null>> => {
        const authorized = await authorizeStore(userId, organizationId, storeId);
        if (!authorized.ok) {
            return authorized.response;
        }

        const now = dependencies.now();
        const [licenses, trialPlan] = await Promise.all([
            dependencies.repository.listStoreLicenses(storeId),
            dependencies.repository.getActiveTrialPlanSnapshot(),
        ]);

        if (licenses.some((license) => license.sourceKind === "trial")) {
            return alreadyUsedTrial();
        }
        if (!trialPlan) {
            return trialPlanUnavailable();
        }
        if (licenses.some((license) => isCommercialAccessSourceActiveAt(toLicenseAccessSource(license), now))) {
            return activeBaseAccess();
        }

        const created = await dependencies.repository.insertTrialLicense({
            id: dependencies.createId(),
            organizationId,
            storeId,
            createdByUserId: userId,
            now,
            startsAt: now,
            endsAt: addCommercialTerm(now, trialPlan.term),
            plan: snapshotPlan(trialPlan),
        });
        if (created === "duplicate-trial") {
            return alreadyUsedTrial();
        }

        return {
            status: "success",
            message: "Standard Trial Plan started successfully",
            data: {
                commercialStatus: await buildStatus(organizationId, storeId, now),
            },
            code: STATUS_CODES.CREATED,
        };
    };

    const applyLegacyStoreMigrationGrants = async (): Promise<
        ServiceResponse<LegacyStoreMigrationGrantResult>
    > => {
        const now = dependencies.now();
        const launch = await dependencies.repository.getOrCreateEnforcementLaunch(now);
        const [stores, modules] = await Promise.all([
            dependencies.repository.listStoresExistingAt(launch.launchedAt),
            dependencies.repository.listActiveModuleSnapshots(),
        ]);
        const startsAt = launch.launchedAt;
        const endsAt = addCommercialTerm(startsAt, LEGACY_MIGRATION_GRANT_TERM);
        let grantedStoreCount = 0;

        for (const store of stores) {
            const existing = await dependencies.repository.listAccessGrantsForStore(store.id);
            if (existing.some((grant) => grant.origin === "legacy_migration")) {
                continue;
            }
            const inserted = await dependencies.repository.insertStoreAccessGrant({
                id: dependencies.createId(),
                organizationId: store.organizationId,
                storeId: store.id,
                origin: "legacy_migration",
                termKind: "complimentary",
                selectionKind: "all_current_modules",
                planId: null,
                planRevisionId: null,
                planKey: null,
                planDisplayName: null,
                planType: null,
                term: { ...LEGACY_MIGRATION_GRANT_TERM },
                startsAt,
                endsAt,
                revokedAt: null,
                createdByOwnerUserId: null,
                createdAt: now,
                modules: snapshotModules(modules),
            });
            if (inserted !== "duplicate-legacy-migration") {
                grantedStoreCount += 1;
            }
        }

        return {
            status: "success",
            message: "Legacy Store migration grants applied",
            data: {
                grantedStoreCount,
                launchedAt: launch.launchedAt,
            },
            code: STATUS_CODES.SUCCESS,
        };
    };

    const resolveGrantSelection = async (input: CreateStoreAccessGrantSVC) => {
        if (input.selection.kind === "plan") {
            const plan = await dependencies.repository.getActivePlanSnapshotByKey(input.selection.planKey);
            if (!plan) {
                return null;
            }
            return {
                selectionKind: "plan" as const,
                planId: plan.planId,
                planRevisionId: plan.planRevisionId,
                planKey: plan.key,
                planDisplayName: plan.displayName,
                planType: plan.planType,
                modules: snapshotModules(plan.modules),
            };
        }
        const moduleItem = await dependencies.repository.getActiveModuleSnapshotByKey(input.selection.moduleKey);
        if (!moduleItem) {
            return null;
        }
        return {
            selectionKind: "module" as const,
            planId: null,
            planRevisionId: null,
            planKey: null,
            planDisplayName: null,
            planType: null,
            modules: snapshotModules([moduleItem]),
        };
    };

    const createStoreAccessGrant = async (
        ownerUserId: string,
        organizationId: string,
        storeId: string,
        input: CreateStoreAccessGrantSVC,
    ): Promise<ServiceResponse<ConsoleStoreCommercialInspectionResponse | null>> => {
        const authorized = await authorizePlatformStore(organizationId, storeId);
        if (!authorized.ok) {
            return authorized.response;
        }

        const now = dependencies.now();
        const startsAt = input.termKind === "custom_range" && input.startsAt
            ? toDate(input.startsAt)
            : now;
        const endsAt = input.termKind === "custom_range"
            ? toDate(input.endsAt)
            : addCommercialTerm(
                startsAt,
                input.termKind === "seven_day" ? SEVEN_DAY_GRANT_TERM : input.term,
            );
        if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt.getTime() <= startsAt.getTime()) {
            return invalidCustomRange();
        }

        const selection = await resolveGrantSelection(input);
        if (!selection) {
            return catalogUnavailableToGrant();
        }

        const term = input.termKind === "seven_day"
            ? { ...SEVEN_DAY_GRANT_TERM }
            : input.termKind === "custom_range"
                ? customRangeTerm(startsAt, endsAt)
                : { ...input.term };

        await dependencies.repository.insertStoreAccessGrant({
            id: dependencies.createId(),
            organizationId,
            storeId,
            origin: "administrator",
            termKind: input.termKind,
            selectionKind: selection.selectionKind,
            planId: selection.planId,
            planRevisionId: selection.planRevisionId,
            planKey: selection.planKey,
            planDisplayName: selection.planDisplayName,
            planType: selection.planType,
            term,
            startsAt,
            endsAt,
            revokedAt: null,
            createdByOwnerUserId: ownerUserId,
            createdAt: now,
            modules: selection.modules,
        });

        return {
            status: "success",
            message: "Store Access Grant created successfully",
            data: await buildConsoleInspection(organizationId, storeId, now),
            code: STATUS_CODES.CREATED,
        };
    };

    const createPaidPlanCheckout = async (
        userId: string,
        organizationId: string,
        storeId: string,
        input: CreatePaidPlanCheckoutSVC,
    ): Promise<ServiceResponse<PaidPlanCheckoutResponse | null>> => {
        const authorized = await authorizeStore(userId, organizationId, storeId);
        if (!authorized.ok) {
            return authorized.response;
        }

        const now = dependencies.now();
        const [licenses, plan] = await Promise.all([
            dependencies.repository.listStoreLicenses(storeId),
            dependencies.repository.getActivePlanSnapshotByKey(input.planKey),
        ]);
        if (!plan || plan.planType !== "paid") {
            return paidPlanUnavailable();
        }
        if (!canOfferPaidPlanCheckout(licenses, now)) {
            return paidCheckoutUnavailable();
        }

        const snapshot = snapshotPaidPlan(plan);
        const activePaid = getActivePaidLicense(licenses, now);
        let quoteKind: CommercialQuoteKind = "paid_plan";
        let timing: {
            licenseTiming: CommercialQuoteRecord["licenseTiming"];
            intendedStartsAt: Date;
            intendedEndsAt: Date;
        };
        let amountInr = snapshot.priceInr;
        let lineItems: CommercialQuoteRecord["lineItems"];

        if (activePaid) {
            const tierDelta = comparePaidPlanTier(snapshot.priceInr, activePaid.priceInr);
            if (tierDelta > 0) {
                const upgrade = calculatePlanUpgradeCharge(
                    activePaid.priceInr,
                    snapshot.priceInr,
                    activePaid.startsAt,
                    activePaid.endsAt,
                    now,
                    inrToPaise,
                );
                if (upgrade.amountPaise <= 0) {
                    return invalidCheckoutSelection();
                }
                quoteKind = "plan_upgrade";
                timing = upgradeTiming(activePaid, now);
                amountInr = upgrade.amountInr;
                lineItems = buildUpgradeQuoteLineItems(snapshot.displayName, upgrade);
            } else {
                quoteKind = "plan_renewal";
                timing = renewalTiming(activePaid, snapshot.term);
                lineItems = [{ description: `${snapshot.displayName} Plan renewal`, amountInr: snapshot.priceInr }];
            }
        } else {
            timing = paidPlanTiming(licenses, now, snapshot.term);
            lineItems = [{ description: `${snapshot.displayName} Plan`, amountInr: snapshot.priceInr }];
        }

        const amountPaise = inrToPaise(amountInr);
        const quoteId = dependencies.createId();
        let order;
        try {
            order = await dependencies.razorpay.createOrder({
                amountPaise,
                currency: COMMERCIAL_QUOTE_CURRENCY,
                receipt: quoteId,
                notes: {
                    quote_id: quoteId,
                    store_id: storeId,
                    plan_key: snapshot.key,
                },
            });
        } catch (error) {
            if (error instanceof RazorpayAdapterError && error.code === "missing_configuration") {
                return checkoutUnavailable();
            }
            return checkoutUnavailable();
        }

        const quote: CommercialQuoteRecord = {
            id: quoteId,
            organizationId,
            storeId,
            kind: quoteKind,
            planId: snapshot.planId,
            planRevisionId: snapshot.planRevisionId,
            planKey: snapshot.key,
            planDisplayName: snapshot.displayName,
            planType: "paid",
            moduleId: null,
            moduleRevisionId: null,
            moduleKey: null,
            moduleDisplayName: null,
            priceInr: snapshot.priceInr,
            amountInr,
            amountPaise,
            currency: COMMERCIAL_QUOTE_CURRENCY,
            term: { ...snapshot.term },
            licenseTiming: timing.licenseTiming,
            intendedStartsAt: timing.intendedStartsAt,
            intendedEndsAt: timing.intendedEndsAt,
            razorpayOrderId: order.id,
            razorpayReceipt: order.receipt,
            expiresAt: new Date(now.getTime() + COMMERCIAL_QUOTE_TTL_MS),
            fulfilledAt: null,
            fulfilledLicenseId: null,
            fulfilledCoTermAddOnId: null,
            fulfilledCoTermAddOnId: null,
            createdByUserId: userId,
            createdAt: now,
            lineItems,
            modules: snapshot.modules,
        };
        const stored = await dependencies.repository.insertCommercialQuote(quote);
        const commercialStatus = await buildStatus(organizationId, storeId, now);

        return {
            status: "success",
            message: "Commercial Quote created successfully",
            data: {
                quote: toQuoteDto(stored, now),
                checkout: {
                    keyId: dependencies.razorpay.getPublicKeyId(),
                    orderId: stored.razorpayOrderId,
                    amountPaise: stored.amountPaise,
                    currency: stored.currency,
                },
                commercialStatus,
            },
            code: STATUS_CODES.CREATED,
        };
    };

    const createCoTermAddOnCheckout = async (
        userId: string,
        organizationId: string,
        storeId: string,
        input: CreateCoTermAddOnCheckoutSVC,
    ): Promise<ServiceResponse<CoTermAddOnCheckoutResponse | null>> => {
        const authorized = await authorizeStore(userId, organizationId, storeId);
        if (!authorized.ok) {
            return authorized.response;
        }

        const now = dependencies.now();
        const [licenses, purchasableModules, accessSources] = await Promise.all([
            dependencies.repository.listStoreLicenses(storeId),
            dependencies.repository.listActivePurchasableModuleSnapshots(),
            dependencies.repository.listAccessSourcesForStore(storeId),
        ]);
        const activePaid = getActivePaidLicense(licenses, now);
        if (!activePaid) {
            return addOnCheckoutUnavailable();
        }

        const available = buildAvailableCoTermAddOns(
            activePaid,
            purchasableModules,
            accessSources,
            now,
        );
        const selected = available.find((moduleItem) => moduleItem.key === input.moduleKey);
        if (!selected) {
            return addOnUnavailable();
        }

        const moduleSnapshot = purchasableModules.find((moduleItem) => moduleItem.key === input.moduleKey);
        if (!moduleSnapshot) {
            return addOnUnavailable();
        }
        const snapshot = snapshotPurchasableModule(moduleSnapshot);
        const charge = calculateCoTermAddOnCharge(
            snapshot.priceInr,
            activePaid.startsAt,
            activePaid.endsAt,
            now,
            inrToPaise,
        );
        if (charge.amountPaise <= 0) {
            return addOnUnavailable();
        }

        const amountPaise = charge.amountPaise;
        const quoteId = dependencies.createId();
        let order;
        try {
            order = await dependencies.razorpay.createOrder({
                amountPaise,
                currency: COMMERCIAL_QUOTE_CURRENCY,
                receipt: quoteId,
                notes: {
                    quote_id: quoteId,
                    store_id: storeId,
                    module_key: snapshot.key,
                },
            });
        } catch (error) {
            if (error instanceof RazorpayAdapterError && error.code === "missing_configuration") {
                return checkoutUnavailable();
            }
            return checkoutUnavailable();
        }

        const quote: CommercialQuoteRecord = {
            id: quoteId,
            organizationId,
            storeId,
            kind: "co_term_add_on",
            planId: null,
            planRevisionId: null,
            planKey: null,
            planDisplayName: null,
            planType: null,
            moduleId: snapshot.moduleId,
            moduleRevisionId: snapshot.moduleRevisionId,
            moduleKey: snapshot.key,
            moduleDisplayName: snapshot.displayName,
            priceInr: snapshot.priceInr,
            amountInr: charge.amountInr,
            amountPaise,
            currency: COMMERCIAL_QUOTE_CURRENCY,
            term: { ...snapshot.term },
            licenseTiming: "immediate",
            intendedStartsAt: now,
            intendedEndsAt: activePaid.endsAt,
            razorpayOrderId: order.id,
            razorpayReceipt: order.receipt,
            expiresAt: new Date(now.getTime() + COMMERCIAL_QUOTE_TTL_MS),
            fulfilledAt: null,
            fulfilledLicenseId: null,
            fulfilledCoTermAddOnId: null,
            createdByUserId: userId,
            createdAt: now,
            lineItems: [{
                description: `${snapshot.displayName} Co-Term Add-On (prorated)`,
                amountInr: charge.amountInr,
            }],
            modules: [snapshotModules([snapshot])[0]!],
        };
        const stored = await dependencies.repository.insertCommercialQuote(quote);
        const commercialStatus = await buildStatus(organizationId, storeId, now);

        return {
            status: "success",
            message: "Commercial Quote created successfully",
            data: {
                quote: toQuoteDto(stored, now),
                checkout: {
                    keyId: dependencies.razorpay.getPublicKeyId(),
                    orderId: stored.razorpayOrderId,
                    amountPaise: stored.amountPaise,
                    currency: stored.currency,
                },
                commercialStatus,
            },
            code: STATUS_CODES.CREATED,
        };
    };

    const ingestRazorpayWebhook = async (input: IngestRazorpayWebhookInput): Promise<ServiceResponse<{
        accepted: true;
        fulfillmentStatus: string;
    }>> => {
        const now = dependencies.now();
        const quote = input.orderId
            ? await dependencies.repository.getCommercialQuoteByRazorpayOrderId(input.orderId)
            : null;
        const inserted = await dependencies.repository.insertPaymentEvent({
            id: dependencies.createId(),
            razorpayEventId: input.razorpayEventId,
            eventType: input.eventType,
            razorpayOrderId: input.orderId,
            razorpayPaymentId: input.paymentId,
            amountPaise: input.amountPaise,
            currency: input.currency,
            quoteId: quote?.id ?? null,
            fulfillmentStatus: "received",
            fulfillmentError: null,
            payload: input.payload,
            createdAt: now,
            processedAt: null,
        });

        const finish = async (
            fulfillmentStatus: "fulfilled" | "ignored" | "mismatched" | "failed",
            fulfillmentError: string | null,
        ) => {
            const event = inserted.created || inserted.event.fulfillmentStatus === "received"
                || inserted.event.fulfillmentStatus === "failed"
                ? await dependencies.repository.updatePaymentEventFulfillment(
                    inserted.event.id,
                    fulfillmentStatus,
                    fulfillmentError,
                    now,
                    quote?.id ?? null,
                )
                : inserted.event;
            return {
                status: "success" as const,
                message: "Commercial Payment Event accepted",
                data: {
                    accepted: true as const,
                    fulfillmentStatus: event.fulfillmentStatus,
                },
                code: STATUS_CODES.SUCCESS,
            };
        };

        if (!inserted.created && (inserted.event.fulfillmentStatus === "fulfilled"
            || inserted.event.fulfillmentStatus === "ignored"
            || inserted.event.fulfillmentStatus === "mismatched")) {
            return {
                status: "success",
                message: "Commercial Payment Event accepted",
                data: {
                    accepted: true,
                    fulfillmentStatus: inserted.event.fulfillmentStatus,
                },
                code: STATUS_CODES.SUCCESS,
            };
        }

        if (input.eventType !== "order.paid") {
            return finish("ignored", "Only order.paid events fulfil a Commercial Quote");
        }
        if (!quote) {
            return finish("mismatched", "Unknown Razorpay Order");
        }
        if (
            input.orderId !== quote.razorpayOrderId
            || input.amountPaise !== quote.amountPaise
            || (input.currency ?? "").toUpperCase() !== quote.currency
        ) {
            return finish("mismatched", "Paid Order does not match the Commercial Quote");
        }
        const paidAt = input.paidAt ?? now;
        if (paidAt.getTime() >= quote.expiresAt.getTime()) {
            return finish("mismatched", "Expired Commercial Quote");
        }

        try {
            if (quote.kind === "co_term_add_on") {
                const fulfilled = await dependencies.repository.fulfillCoTermAddOnQuote({
                    addOnId: dependencies.createId(),
                    quote,
                    now,
                });
                if (fulfilled === "duplicate-add-on") {
                    return finish("mismatched", "This Store already has access to that Module");
                }
                if (fulfilled === "already-fulfilled") {
                    return finish("fulfilled", null);
                }
                return finish("fulfilled", null);
            }

            const fulfilled = await dependencies.repository.fulfillPaidPlanQuote({
                licenseId: dependencies.createId(),
                quote,
                now,
            });
            if (fulfilled === "overlapping-license") {
                return finish("mismatched", "This Store already has overlapping commercial access");
            }
            if (fulfilled === "already-fulfilled") {
                return finish("fulfilled", null);
            }
            return finish("fulfilled", null);
        } catch {
            await dependencies.repository.updatePaymentEventFulfillment(
                inserted.event.id,
                "failed",
                "Fulfilment failed and is safe to retry",
                now,
                quote.id,
            );
            return {
                status: "error",
                message: "Commercial Payment Event fulfilment failed",
                data: {
                    accepted: true,
                    fulfillmentStatus: "failed",
                },
                code: STATUS_CODES.INTERNAL_SERVER_ERROR,
            };
        }
    };

    const refundAndRevokeLicense = async (
        ownerUserId: string,
        organizationId: string,
        storeId: string,
        input: CreateCommercialRefundAndRevocationSVC,
    ): Promise<ServiceResponse<ConsoleStoreCommercialInspectionResponse | null>> => {
        const authorized = await authorizePlatformStore(organizationId, storeId);
        if (!authorized.ok) {
            return authorized.response;
        }

        const now = dependencies.now();
        const paymentEvent = await dependencies.repository.getCommercialPaymentEventById(input.paymentEventId);
        if (
            !paymentEvent
            || paymentEvent.fulfillmentStatus !== "fulfilled"
            || !paymentEvent.quoteId
            || !paymentEvent.razorpayPaymentId
            || !paymentEvent.amountPaise
        ) {
            return refundUnavailable();
        }

        const [quotes, licenses, addOns, refunds] = await Promise.all([
            dependencies.repository.listCommercialQuotesForStore(storeId),
            dependencies.repository.listStoreLicenses(storeId),
            dependencies.repository.listCoTermAddOnsForStore(storeId),
            dependencies.repository.listCommercialRefundsForStore(storeId),
        ]);
        if (refunds.some((refund) => refund.paymentEventId === paymentEvent.id)) {
            return refundUnavailable();
        }

        const quote = quotes.find((item) => item.id === paymentEvent.quoteId);
        if (!quote?.fulfilledAt) {
            return refundUnavailable();
        }

        const refundable = buildRefundablePayments(
            licenses,
            addOns,
            quotes,
            [paymentEvent],
            refunds,
            now,
        ).find((item) => item.paymentEventId === paymentEvent.id);
        if (!refundable) {
            return refundUnavailable();
        }
        if (input.amountPaise > refundable.amountPaise) {
            return refundUnavailable();
        }

        const accessStatus = refundable.accessSourceStatus;
        let effectiveEndsAt: Date;
        if (accessStatus === "scheduled") {
            effectiveEndsAt = now;
        } else if (accessStatus === "active") {
            if (!input.effectiveEndsAt) {
                return invalidRevocationEnd();
            }
            effectiveEndsAt = toDate(input.effectiveEndsAt);
            if (
                Number.isNaN(effectiveEndsAt.getTime())
                || effectiveEndsAt.getTime() < now.getTime()
                || effectiveEndsAt.getTime() > refundable.accessSourceEndsAt.getTime()
            ) {
                return invalidRevocationEnd();
            }
        } else {
            return refundUnavailable();
        }

        let razorpayRefund;
        try {
            razorpayRefund = await dependencies.razorpay.createRefund({
                paymentId: paymentEvent.razorpayPaymentId,
                amountPaise: input.amountPaise,
            });
        } catch (error) {
            if (error instanceof RazorpayAdapterError && error.code === "missing_configuration") {
                return refundServiceUnavailable();
            }
            return refundServiceUnavailable();
        }

        const refundId = dependencies.createId();
        const revocationId = dependencies.createId();
        const amountInr = input.amountPaise / 100;
        const recorded = await dependencies.repository.insertCommercialRefundAndRevocation({
            refund: {
                id: refundId,
                organizationId,
                storeId,
                quoteId: quote.id,
                paymentEventId: paymentEvent.id,
                accessSourceKind: refundable.accessSourceKind,
                accessSourceId: refundable.accessSourceId,
                razorpayPaymentId: paymentEvent.razorpayPaymentId,
                razorpayRefundId: razorpayRefund.id,
                amountInr,
                amountPaise: input.amountPaise,
                currency: COMMERCIAL_QUOTE_CURRENCY,
                createdByOwnerUserId: ownerUserId,
                createdAt: now,
            },
            revocation: {
                id: revocationId,
                organizationId,
                storeId,
                commercialRefundId: refundId,
                accessSourceKind: refundable.accessSourceKind,
                accessSourceId: refundable.accessSourceId,
                effectiveEndsAt,
                recordedAt: now,
                createdByOwnerUserId: ownerUserId,
                createdAt: now,
            },
        });

        if (recorded === "duplicate-refund" || recorded === "duplicate-revocation") {
            return refundUnavailable();
        }
        if (recorded === "access-source-not-found") {
            return refundUnavailable();
        }

        return {
            status: "success",
            message: "Commercial Refund and License Revocation recorded successfully",
            data: await buildConsoleInspection(organizationId, storeId, now),
            code: STATUS_CODES.CREATED,
        };
    };

    return {
        getStoreCommercialStatus,
        inspectStoreCommercialStatusForPlatform,
        startStandardTrial,
        applyLegacyStoreMigrationGrants,
        createStoreAccessGrant,
        createPaidPlanCheckout,
        createCoTermAddOnCheckout,
        ingestRazorpayWebhook,
        refundAndRevokeLicense,
        resolveStoreFeatureEntitlement: dependencies.featureEntitlement.resolveStoreFeatureEntitlement,
        resolveFeatureEntitlement: dependencies.featureEntitlement.resolveFeatureEntitlement,
    };
};

const defaultDependencies = (): CommercialLicensingDependencies => {
    const repository = commercialLicensingRepository;
    return {
        organization: organizationRepository,
        repository,
        featureEntitlement: createFeatureEntitlementService({
            listAccessSources: repository.listAccessSourcesForStore,
        }),
        razorpay: createRazorpayPaymentProvider(),
        createId: () => crypto.randomUUID(),
        now: () => new Date(),
    };
};

let defaultService: CommercialLicensingService | null = null;

export const getCommercialLicensingService = (): CommercialLicensingService => {
    defaultService ??= createCommercialLicensingService(defaultDependencies());
    return defaultService;
};

export const getFeatureEntitlementService = (): FeatureEntitlementService => ({
    resolveStoreFeatureEntitlement: getCommercialLicensingService().resolveStoreFeatureEntitlement,
    resolveFeatureEntitlement: getCommercialLicensingService().resolveFeatureEntitlement,
});
