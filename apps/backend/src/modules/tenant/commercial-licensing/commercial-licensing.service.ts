import {
    addCommercialTerm,
    COMMERCIAL_TERM_TIMEZONE,
    isCommercialAccessSourceActiveAt,
    STATUS_CODES,
    type ActiveTrialPlanSnapshot,
    type CommercialAccessSourceRecord,
    type ServiceResponse,
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
    getStoreById: (
        organizationId: string,
        storeId: string,
    ) => Promise<{ id: string; organizationId: string } | null>;
};

type CommercialLicensingRepository = Pick<
    typeof commercialLicensingRepository,
    | "getActiveTrialPlanSnapshot"
    | "listStoreLicenses"
    | "listAccessSourcesForStore"
    | "insertTrialLicense"
>;

export type CommercialLicensingDependencies = {
    organization: OrganizationLookup;
    repository: CommercialLicensingRepository;
    featureEntitlement: FeatureEntitlementService;
    createId: () => string;
    now: () => Date;
};

export type CommercialLicensingService = ReturnType<typeof createCommercialLicensingService>;

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

const licenseStatusAt = (license: StoreLicenseRecord, at: Date): StoreLicenseStatus => {
    if (license.revokedAt) {
        return "revoked";
    }
    if (license.startsAt.getTime() > at.getTime()) {
        return "scheduled";
    }
    if (at.getTime() >= license.endsAt.getTime()) {
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

const snapshotPlan = (plan: ActiveTrialPlanSnapshot): ActiveTrialPlanSnapshot => ({
    ...plan,
    term: { ...plan.term },
    modules: plan.modules.map((moduleItem) => ({
        ...moduleItem,
        features: moduleItem.features.map((feature) => ({ ...feature })),
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

    const buildStatus = async (
        organizationId: string,
        storeId: string,
        at: Date,
    ): Promise<StoreCommercialStatusDTO> => {
        const [licenses, trialPlan] = await Promise.all([
            dependencies.repository.listStoreLicenses(storeId),
            dependencies.repository.getActiveTrialPlanSnapshot(),
        ]);
        const entitlements = await dependencies.featureEntitlement.resolveStoreFeatureEntitlement(
            storeId,
            at,
        );
        const currentBase = licenses.find((license) =>
            isCommercialAccessSourceActiveAt(toAccessSource(license), at),
        ) ?? null;
        const scheduledSuccessor = licenses.find((license) => licenseStatusAt(license, at) === "scheduled") ?? null;

        return {
            storeId,
            organizationId,
            timezone: COMMERCIAL_TERM_TIMEZONE,
            baseAccess: currentBase ? toBaseAccess(currentBase, at) : null,
            scheduledSuccessor: scheduledSuccessor ? toBaseAccess(scheduledSuccessor, at) : null,
            activeAddOns: [],
            trial: trialAvailability(licenses, trialPlan !== null),
            entitlements,
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
        if (licenses.some((license) => isCommercialAccessSourceActiveAt(toAccessSource(license), now))) {
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

    return {
        getStoreCommercialStatus,
        startStandardTrial,
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
