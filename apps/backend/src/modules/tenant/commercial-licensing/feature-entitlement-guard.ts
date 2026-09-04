import { STATUS_CODES, SEEDED_COMMERCIAL_FEATURES, type ServiceResponse } from "@repo/types";
import * as organizationRepository from "@/modules/tenant/organization/organization.repository";
import { getFeatureEntitlementService } from "./commercial-licensing.service";

export type AdminOperationalFeatureKey =
    | "catalog_products"
    | "units"
    | "vendors"
    | "purchases"
    | "expenses"
    | "money_account_tracking";

const featureDisplayName = (featureKey: AdminOperationalFeatureKey): string =>
    SEEDED_COMMERCIAL_FEATURES.find((feature) => feature.key === featureKey)?.displayName ??
    featureKey;

export const featureEntitlementDeniedForStore = (
    featureKey: AdminOperationalFeatureKey,
): ServiceResponse<null> => ({
    status: "error",
    message: `${featureDisplayName(featureKey)} is not available for this Store. Review commercial access in Ganatri Admin to purchase or renew access.`,
    data: null,
    code: STATUS_CODES.FORBIDDEN,
});

export const featureEntitlementDeniedForOrganization = (
    featureKey: AdminOperationalFeatureKey,
): ServiceResponse<null> => ({
    status: "error",
    message: `${featureDisplayName(featureKey)} is not available for any Store in this Organization. Review commercial access in Ganatri Admin to purchase or renew access.`,
    data: null,
    code: STATUS_CODES.FORBIDDEN,
});

export const requireStoreFeatureEntitlement = async (
    storeId: string,
    featureKey: AdminOperationalFeatureKey,
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

export const requireOrganizationFeatureEntitlement = async (
    organizationId: string,
    featureKey: AdminOperationalFeatureKey,
    at: Date = new Date(),
): Promise<ServiceResponse<null> | null> => {
    const stores = await organizationRepository.getStoresByOrganizationId(organizationId);
    for (const store of stores) {
        const decision = await getFeatureEntitlementService().resolveFeatureEntitlement(
            store.id,
            featureKey,
            at,
        );
        if (decision.entitled) {
            return null;
        }
    }
    return featureEntitlementDeniedForOrganization(featureKey);
};

export const isStoreFeatureEntitled = async (
    storeId: string,
    featureKey: AdminOperationalFeatureKey,
    at: Date = new Date(),
): Promise<boolean> => {
    const decision = await getFeatureEntitlementService().resolveFeatureEntitlement(
        storeId,
        featureKey,
        at,
    );
    return decision.entitled;
};
