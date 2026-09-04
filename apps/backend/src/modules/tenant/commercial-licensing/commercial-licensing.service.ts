import {
    addCommercialTerm,
    COMMERCIAL_TERM_TIMEZONE,
    isCommercialAccessSourceActiveAt,
    LEGACY_MIGRATION_GRANT_TERM,
    SEVEN_DAY_GRANT_TERM,
    STATUS_CODES,
    storeAccessGrantLabel,
    storeAccessGrantSelectionLabel,
    type ActivePlanSnapshot,
    type ActiveTrialPlanSnapshot,
    type CommercialAccessSourceModuleSnapshot,
    type CommercialAccessSourceRecord,
    type CommercialCatalogTerm,
    type ConsoleStoreCommercialInspectionResponse,
    type CreateStoreAccessGrantSVC,
    type GrantableCommercialAccessDTO,
    type ServiceResponse,
    type StoreAccessGrantDTO,
    type StoreAccessGrantRecord,
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
    | "listActivePlanSnapshots"
    | "listStoreLicenses"
    | "listAccessGrantsForStore"
    | "listAccessSourcesForStore"
    | "listStoresExistingAt"
    | "getOrCreateEnforcementLaunch"
    | "insertTrialLicense"
    | "insertStoreAccessGrant"
>;

export type CommercialLicensingDependencies = {
    organization: OrganizationLookup;
    repository: CommercialLicensingRepository;
    featureEntitlement: FeatureEntitlementService;
    createId: () => string;
    now: () => Date;
};

export type CommercialLicensingService = ReturnType<typeof createCommercialLicensingService>;

export type LegacyStoreMigrationGrantResult = {
    grantedStoreCount: number;
    launchedAt: Date;
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

const invalidCustomRange = (): ServiceResponse<null> => ({
    status: "error",
    message: "A custom-range Store Access Grant must end after it starts.",
    data: null,
    code: STATUS_CODES.BAD_REQUEST,
});

const licenseStatusAt = (
    source: { startsAt: Date; endsAt: Date; revokedAt: Date | null },
    at: Date,
): StoreLicenseStatus => {
    if (source.revokedAt) {
        return "revoked";
    }
    if (source.startsAt.getTime() > at.getTime()) {
        return "scheduled";
    }
    if (at.getTime() >= source.endsAt.getTime()) {
        return "expired";
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
        const [licenses, grants, trialPlan] = await Promise.all([
            dependencies.repository.listStoreLicenses(storeId),
            dependencies.repository.listAccessGrantsForStore(storeId),
            dependencies.repository.getActiveTrialPlanSnapshot(),
        ]);
        const entitlements = await dependencies.featureEntitlement.resolveStoreFeatureEntitlement(
            storeId,
            at,
        );
        const currentBase = licenses.find((license) =>
            isCommercialAccessSourceActiveAt(toLicenseAccessSource(license), at),
        ) ?? null;
        const scheduledSuccessor = licenses.find((license) => licenseStatusAt(license, at) === "scheduled") ?? null;

        return {
            storeId,
            organizationId,
            timezone: COMMERCIAL_TERM_TIMEZONE,
            baseAccess: currentBase ? toBaseAccess(currentBase, at) : null,
            scheduledSuccessor: scheduledSuccessor ? toBaseAccess(scheduledSuccessor, at) : null,
            accessGrants: grants.map((grant) => toGrantDto(grant, at)),
            activeAddOns: [],
            trial: trialAvailability(licenses, trialPlan !== null),
            entitlements,
        };
    };

    const buildConsoleInspection = async (
        organizationId: string,
        storeId: string,
        at: Date,
    ): Promise<ConsoleStoreCommercialInspectionResponse> => {
        const [commercialStatus, plans, modules] = await Promise.all([
            buildStatus(organizationId, storeId, at),
            dependencies.repository.listActivePlanSnapshots(),
            dependencies.repository.listActiveModuleSnapshots(),
        ]);
        return {
            commercialStatus,
            grantableAccess: toGrantableAccess(plans, modules),
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

    return {
        getStoreCommercialStatus,
        inspectStoreCommercialStatusForPlatform,
        startStandardTrial,
        applyLegacyStoreMigrationGrants,
        createStoreAccessGrant,
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
