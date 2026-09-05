import { STATUS_CODES, SEEDED_COMMERCIAL_FEATURES, type ServiceResponse } from "@repo/types";
import * as organizationRepository from "@/modules/tenant/organization/organization.repository";
import { getFeatureEntitlementService } from "./commercial-licensing.service";

export type StoreFeatureEntitlementKey =
    (typeof SEEDED_COMMERCIAL_FEATURES)[number]["key"];

export type AdminOperationalFeatureKey = Extract<
    StoreFeatureEntitlementKey,
    | "catalog_products"
    | "units"
    | "vendors"
    | "purchases"
    | "expenses"
    | "money_account_tracking"
>;

const featureDisplayName = (featureKey: StoreFeatureEntitlementKey): string =>
    SEEDED_COMMERCIAL_FEATURES.find((feature) => feature.key === featureKey)?.displayName ??
    featureKey;

export const featureEntitlementDeniedForStore = (
    featureKey: StoreFeatureEntitlementKey,
): ServiceResponse<null> => ({
    status: "error",
    message: `${featureDisplayName(featureKey)} is not available for this Store. Review commercial access in Ganatri Admin to purchase or renew access.`,
    data: null,
    code: STATUS_CODES.FORBIDDEN,
});

export const featureEntitlementDeniedForOrganization = (
    featureKey: StoreFeatureEntitlementKey,
): ServiceResponse<null> => ({
    status: "error",
    message: `${featureDisplayName(featureKey)} is not available for any Store in this Organization. Review commercial access in Ganatri Admin to purchase or renew access.`,
    data: null,
    code: STATUS_CODES.FORBIDDEN,
});

export const requireStoreFeatureEntitlement = async (
    storeId: string,
    featureKey: StoreFeatureEntitlementKey,
    at: Date = new Date(),
): Promise<ServiceResponse<null> | null> => {
    const decision = await getFeatureEntitlementService().resolveFeatureEntitlement(
        storeId,
        featureKey,
        at,
    );
    if (!decision.entitled) {
        return featureEntitlementDeniedForStore(featureKey);
    }
    return null;
};

export const listEntitledStoreIdsForOrganization = async (
    organizationId: string,
    featureKey: StoreFeatureEntitlementKey,
    at: Date = new Date(),
): Promise<string[]> => {
    const stores = await organizationRepository.getStoresByOrganizationId(organizationId);
    const entitledStoreIds: string[] = [];
    for (const store of stores) {
        if (await isStoreFeatureEntitled(store.id, featureKey, at)) {
            entitledStoreIds.push(store.id);
        }
    }
    return entitledStoreIds;
};

export const requireOrganizationFeatureEntitlement = async (
    organizationId: string,
    featureKey: StoreFeatureEntitlementKey,
    at: Date = new Date(),
): Promise<ServiceResponse<null> | null> => {
    const entitledStoreIds = await listEntitledStoreIdsForOrganization(
        organizationId,
        featureKey,
        at,
    );
    if (entitledStoreIds.length > 0) {
        return null;
    }
    return featureEntitlementDeniedForOrganization(featureKey);
};

export const requireTableManagementFeatureEntitlement = async (
    storeId: string,
    at: Date = new Date(),
): Promise<ServiceResponse<null> | null> => {
    const tableManagementDenial = await requireStoreFeatureEntitlement(
        storeId,
        "table_management",
        at,
    );
    if (tableManagementDenial) {
        return tableManagementDenial;
    }

    return requireStoreFeatureEntitlement(storeId, "kot_system", at);
};

export const isStoreFeatureEntitled = async (
    storeId: string,
    featureKey: StoreFeatureEntitlementKey,
    at: Date = new Date(),
): Promise<boolean> => {
    const decision = await getFeatureEntitlementService().resolveFeatureEntitlement(
        storeId,
        featureKey,
        at,
    );
    return decision.entitled;
};
