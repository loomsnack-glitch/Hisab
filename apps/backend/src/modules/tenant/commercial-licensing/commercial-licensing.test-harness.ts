import type {
    ActiveTrialPlanSnapshot,
    CommercialAccessSourceModuleSnapshot,
    CommercialAccessSourceRecord,
    StoreLicenseRecord,
} from "@repo/types";
import { createFeatureEntitlementService } from "./feature-entitlement.service";
import { createCommercialLicensingService } from "./commercial-licensing.service";

export const userId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
export const outsiderId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
export const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const otherOrganizationId = "99999999-9999-4999-8999-999999999999";
export const storeId = "11111111-1111-4111-8111-111111111111";
export const otherStoreId = "22222222-2222-4222-8222-222222222222";
export const outsiderStoreId = "33333333-3333-4333-8333-333333333333";
export const trialStart = new Date("2026-09-04T15:00:00.000Z");
export const trialEnd = new Date("2026-09-11T15:00:00.000Z");

export const billingFeature = {
    featureId: "aaaa1111-1111-4111-8111-111111111111",
    featureRevisionId: "aaaa1111-2222-4222-8222-222222222222",
    key: "billing",
    displayName: "Billing",
};

export const reportsFeature = {
    featureId: "bbbb1111-1111-4111-8111-111111111111",
    featureRevisionId: "bbbb1111-2222-4222-8222-222222222222",
    key: "reports",
    displayName: "Reports",
};

export const whatsappFeature = {
    featureId: "cccc1111-1111-4111-8111-111111111111",
    featureRevisionId: "cccc1111-2222-4222-8222-222222222222",
    key: "whatsapp",
    displayName: "WhatsApp",
};

export const coreOperationsModule: CommercialAccessSourceModuleSnapshot = {
    moduleId: "dddd1111-1111-4111-8111-111111111111",
    moduleRevisionId: "dddd1111-2222-4222-8222-222222222222",
    key: "core_operations",
    displayName: "Core Operations",
    features: [billingFeature, reportsFeature],
};

export const integrationsModule: CommercialAccessSourceModuleSnapshot = {
    moduleId: "eeee1111-1111-4111-8111-111111111111",
    moduleRevisionId: "eeee1111-2222-4222-8222-222222222222",
    key: "integrations",
    displayName: "Integrations",
    features: [whatsappFeature],
};

export const cloneModules = (
    modules: CommercialAccessSourceModuleSnapshot[],
): CommercialAccessSourceModuleSnapshot[] =>
    modules.map((moduleItem) => ({
        ...moduleItem,
        features: moduleItem.features.map((feature) => ({ ...feature })),
    }));

export const createTrialPlanSnapshot = (
    overrides: Partial<ActiveTrialPlanSnapshot> = {},
): ActiveTrialPlanSnapshot => {
    const base: ActiveTrialPlanSnapshot = {
        planId: "ffff1111-1111-4111-8111-111111111111",
        planRevisionId: "ffff1111-2222-4222-8222-222222222222",
        key: "trial",
        displayName: "Trial",
        planType: "trial",
        priceInr: 0,
        term: { count: 7, unit: "day" },
        modules: cloneModules([coreOperationsModule, integrationsModule]),
    };
    return {
        ...base,
        ...overrides,
        term: overrides.term ?? base.term,
        modules: cloneModules(overrides.modules ?? base.modules),
    };
};

type MemoryState = {
    memberships: Array<{ organizationId: string; userId: string }>;
    stores: Array<{ id: string; organizationId: string }>;
    trialPlan: ActiveTrialPlanSnapshot | null;
    licenses: StoreLicenseRecord[];
    extraAccessSources: CommercialAccessSourceRecord[];
};

const toAccessSource = (license: StoreLicenseRecord): CommercialAccessSourceRecord => ({
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
    modules: cloneModules(license.modules),
});

export const createMemoryCommercialLicensing = (now = trialStart) => {
    const state: MemoryState = {
        memberships: [
            { organizationId, userId },
            { organizationId: otherOrganizationId, userId },
        ],
        stores: [
            { id: storeId, organizationId },
            { id: otherStoreId, organizationId },
            { id: outsiderStoreId, organizationId: otherOrganizationId },
        ],
        trialPlan: createTrialPlanSnapshot(),
        licenses: [],
        extraAccessSources: [],
    };

    let currentTime = now;
    let nextId = 1;

    const repository = {
        getActiveTrialPlanSnapshot: async () =>
            state.trialPlan ? createTrialPlanSnapshot(state.trialPlan) : null,
        listStoreLicenses: async (targetStoreId: string) =>
            state.licenses
                .filter((license) => license.storeId === targetStoreId)
                .map((license) => ({
                    ...license,
                    term: { ...license.term },
                    modules: cloneModules(license.modules),
                })),
        listAccessSourcesForStore: async (targetStoreId: string) => [
            ...(await repository.listStoreLicenses(targetStoreId)).map(toAccessSource),
            ...state.extraAccessSources
                .filter((source) => source.storeId === targetStoreId)
                .map((source) => ({
                    ...source,
                    modules: cloneModules(source.modules),
                })),
        ],
        insertTrialLicense: async (input: {
            id: string;
            organizationId: string;
            storeId: string;
            createdByUserId: string;
            now: Date;
            startsAt: Date;
            endsAt: Date;
            plan: ActiveTrialPlanSnapshot;
        }) => {
            if (state.licenses.some(
                (license) => license.storeId === input.storeId && license.sourceKind === "trial",
            )) {
                return "duplicate-trial" as const;
            }
            const created: StoreLicenseRecord = {
                id: input.id,
                organizationId: input.organizationId,
                storeId: input.storeId,
                sourceKind: "trial",
                planId: input.plan.planId,
                planRevisionId: input.plan.planRevisionId,
                planKey: input.plan.key,
                planDisplayName: input.plan.displayName,
                planType: input.plan.planType,
                priceInr: input.plan.priceInr,
                term: { ...input.plan.term },
                startsAt: input.startsAt,
                endsAt: input.endsAt,
                revokedAt: null,
                createdByUserId: input.createdByUserId,
                createdAt: input.now,
                modules: cloneModules(input.plan.modules),
            };
            state.licenses.push(created);
            return {
                ...created,
                term: { ...created.term },
                modules: cloneModules(created.modules),
            };
        },
    };

    const featureEntitlement = createFeatureEntitlementService({
        listAccessSources: repository.listAccessSourcesForStore,
    });

    const service = createCommercialLicensingService({
        organization: {
            getOrganizationByIdForUser: async (targetOrganizationId, targetUserId) =>
                state.memberships.some(
                    (membership) =>
                        membership.organizationId === targetOrganizationId
                        && membership.userId === targetUserId,
                )
                    ? { id: targetOrganizationId, name: "Org" }
                    : null,
            getStoreById: async (targetOrganizationId, targetStoreId) =>
                state.stores.find(
                    (store) => store.id === targetStoreId && store.organizationId === targetOrganizationId,
                )
                    ? { id: targetStoreId, organizationId: targetOrganizationId, name: "Store" }
                    : null,
        },
        repository,
        featureEntitlement,
        createId: () => `00000000-0000-4000-8000-${String(nextId++).padStart(12, "0")}`,
        now: () => currentTime,
    });

    return {
        state,
        repository,
        featureEntitlement,
        service,
        setNow: (value: Date) => {
            currentTime = value;
        },
        setTrialPlan: (plan: ActiveTrialPlanSnapshot | null) => {
            state.trialPlan = plan;
        },
        addAccessSource: (source: CommercialAccessSourceRecord) => {
            state.extraAccessSources.push(source);
        },
    };
};
