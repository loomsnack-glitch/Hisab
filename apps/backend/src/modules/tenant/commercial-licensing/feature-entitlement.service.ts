import {
    isCommercialAccessSourceActiveAt,
    type CommercialAccessSourceRecord,
    type CommercialFeatureEntitlementEvidenceDTO,
    type EntitledFeatureDTO,
    type FeatureEntitlementDecisionDTO,
    type StoreFeatureEntitlementDTO,
} from "@repo/types";

export type FeatureEntitlementDependencies = {
    listAccessSources: (storeId: string) => Promise<CommercialAccessSourceRecord[]>;
};

export type FeatureEntitlementService = ReturnType<typeof createFeatureEntitlementService>;

const evidenceFrom = (
    source: CommercialAccessSourceRecord,
    moduleKey: string,
    moduleDisplayName: string,
    featureDisplayName: string,
): CommercialFeatureEntitlementEvidenceDTO => ({
    sourceKind: source.kind,
    sourceId: source.id,
    moduleKey,
    moduleDisplayName,
    featureDisplayName,
    startsAt: source.startsAt,
    endsAt: source.endsAt,
});

export const createFeatureEntitlementService = (dependencies: FeatureEntitlementDependencies) => {
    const resolveStoreFeatureEntitlement = async (
        storeId: string,
        at: Date,
    ): Promise<StoreFeatureEntitlementDTO> => {
        const sources = await dependencies.listAccessSources(storeId);
        const features = new Map<string, EntitledFeatureDTO>();

        for (const source of sources) {
            if (source.storeId !== storeId || !isCommercialAccessSourceActiveAt(source, at)) {
                continue;
            }
            for (const moduleItem of source.modules) {
                for (const feature of moduleItem.features) {
                    const evidence = evidenceFrom(
                        source,
                        moduleItem.key,
                        moduleItem.displayName,
                        feature.displayName,
                    );
                    const existing = features.get(feature.key);
                    if (existing) {
                        existing.sources.push(evidence);
                        continue;
                    }
                    features.set(feature.key, {
                        key: feature.key,
                        displayName: feature.displayName,
                        sources: [evidence],
                    });
                }
            }
        }

        return {
            storeId,
            features: [...features.values()].sort(
                (left, right) => left.displayName.localeCompare(right.displayName) || left.key.localeCompare(right.key),
            ),
        };
    };

    const resolveFeatureEntitlement = async (
        storeId: string,
        featureKey: string,
        at: Date,
    ): Promise<FeatureEntitlementDecisionDTO> => {
        const entitlement = await resolveStoreFeatureEntitlement(storeId, at);
        const feature = entitlement.features.find((entry) => entry.key === featureKey);
        return {
            entitled: Boolean(feature),
            featureKey,
            evidence: feature?.sources ?? [],
        };
    };

    return {
        resolveStoreFeatureEntitlement,
        resolveFeatureEntitlement,
    };
};
