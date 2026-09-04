import { isStoreFeatureEntitled } from "@/modules/tenant/commercial-licensing/feature-entitlement-guard";

/**
 * Money Account Tracking availability seam.
 *
 * Requires the Store's Money Account Tracking Feature Entitlement while
 * leaving Store operational settings and tracking behavior rules unchanged.
 */
export const isMoneyAccountTrackingAvailable = async (
    _organizationId: string,
    storeId: string,
): Promise<boolean> => isStoreFeatureEntitled(storeId, "money_account_tracking");
