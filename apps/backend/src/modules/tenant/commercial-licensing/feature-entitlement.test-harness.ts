import { mock } from "bun:test";

export const resolveFeatureEntitlement = mock(async (_storeId: string, featureKey: string) => ({
    entitled: true,
    featureKey,
    evidence: [],
}));

let featureEntitlementMockConfigured = false;

export const ensureFeatureEntitlementMock = async (): Promise<void> => {
    if (featureEntitlementMockConfigured) {
        return;
    }

    const commercialLicensingService = await import("./commercial-licensing.service");

    mock.module("@/modules/tenant/commercial-licensing/commercial-licensing.service", () => ({
        ...commercialLicensingService,
        getFeatureEntitlementService: () => ({
            resolveFeatureEntitlement,
            resolveStoreFeatureEntitlement: mock(async () => ({ storeId: "", features: [] })),
        }),
    }));

    featureEntitlementMockConfigured = true;
};
