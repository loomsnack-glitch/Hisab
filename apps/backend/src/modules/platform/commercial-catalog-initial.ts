import {
    SEEDED_COMMERCIAL_FEATURES,
    SEEDED_COMMERCIAL_MODULES,
    SEEDED_COMMERCIAL_PLANS,
    type CommercialFeatureListItemDTO,
    type CommercialFeatureListQuerySVC,
    type CommercialModuleListItemDTO,
    type CommercialModuleListQuerySVC,
    type CommercialPlanListItemDTO,
    type CommercialPlanListQuerySVC,
} from "@repo/types";

type CreatedFeature = { status: "created"; feature: { id: string; currentRevision: { id: string } } };
type CreatedModule = { status: "created"; module: { id: string; currentRevision: { id: string } } };
type CreatedPlan = { status: "created"; plan: { id: string; currentRevision: { id: string } } };

export type InitialCommercialCatalogSeedRepository = {
    listFeatures: (query: CommercialFeatureListQuerySVC) => Promise<CommercialFeatureListItemDTO[]>;
    listModules: (query: CommercialModuleListQuerySVC) => Promise<CommercialModuleListItemDTO[]>;
    listPlans: (query: CommercialPlanListQuerySVC) => Promise<CommercialPlanListItemDTO[]>;
    createDraftFeature: (input: {
        featureId: string;
        revisionId: string;
        key: string;
        displayName: string;
        description: string;
        actorId: string;
        now: Date;
    }) => Promise<CreatedFeature | { status: "duplicate-key" | "created" }>;
    publishRevision: (input: {
        featureId: string;
        revisionId: string;
        actorId: string;
        now: Date;
    }) => Promise<{ status: string }>;
    createDraftModule: (input: {
        moduleId: string;
        revisionId: string;
        key: string;
        displayName: string;
        description: string;
        isSeparatelyPurchasable: boolean;
        priceInr: number | null;
        term: { count: number; unit: "day" | "month" | "year" } | null;
        featureRevisionIds: string[];
        actorId: string;
        now: Date;
    }) => Promise<CreatedModule | { status: "duplicate-key" | "invalid-membership" | "created" }>;
    publishModuleRevision: (input: {
        moduleId: string;
        revisionId: string;
        actorId: string;
        now: Date;
    }) => Promise<{ status: string }>;
    createDraftPlan: (input: {
        planId: string;
        revisionId: string;
        key: string;
        displayName: string;
        description: string;
        planType: "trial" | "paid";
        priceInr: number;
        term: { count: number; unit: "day" | "month" | "year" };
        moduleRevisionIds: string[];
        actorId: string;
        now: Date;
    }) => Promise<CreatedPlan | { status: "duplicate-key" | "invalid-membership" | "created" }>;
    publishPlanRevision: (input: {
        planId: string;
        revisionId: string;
        actorId: string;
        now: Date;
    }) => Promise<{ status: string }>;
};

export type EnsureInitialCatalogInput = {
    actorId: string;
    now: Date;
    createId: () => string;
};

export const seedInitialCommercialCatalog = async (
    repository: InitialCommercialCatalogSeedRepository,
    input: EnsureInitialCatalogInput,
): Promise<void> => {
    const [existingFeatures, existingModules, existingPlans] = await Promise.all([
        repository.listFeatures({ status: "all" }),
        repository.listModules({ status: "all" }),
        repository.listPlans({ status: "all" }),
    ]);

    const existingFeatureKeys = new Set(existingFeatures.map((feature) => feature.key));
    const featureRevisionIds = new Map(
        (await repository.listFeatures({ status: "active" })).map((feature) => [feature.key, feature.currentRevisionId]),
    );
    for (const feature of SEEDED_COMMERCIAL_FEATURES) {
        if (existingFeatureKeys.has(feature.key)) {
            continue;
        }
        const created = await repository.createDraftFeature({
            featureId: input.createId(),
            revisionId: input.createId(),
            key: feature.key,
            displayName: feature.displayName,
            description: "",
            actorId: input.actorId,
            now: input.now,
        });
        if (created.status !== "created" || !("feature" in created)) {
            continue;
        }
        const published = await repository.publishRevision({
            featureId: created.feature.id,
            revisionId: created.feature.currentRevision.id,
            actorId: input.actorId,
            now: input.now,
        });
        if (published.status !== "published") {
            continue;
        }
        featureRevisionIds.set(feature.key, created.feature.currentRevision.id);
    }

    const existingModuleKeys = new Set(existingModules.map((moduleItem) => moduleItem.key));
    const moduleRevisionIds = new Map(
        (await repository.listModules({ status: "active" })).map((moduleItem) => [moduleItem.key, moduleItem.currentRevisionId]),
    );
    for (const moduleItem of SEEDED_COMMERCIAL_MODULES) {
        if (existingModuleKeys.has(moduleItem.key)) {
            continue;
        }
        const featureRevisionIdsForModule = moduleItem.featureKeys
            .map((key) => featureRevisionIds.get(key));
        if (featureRevisionIdsForModule.some((id) => !id)) {
            continue;
        }
        const created = await repository.createDraftModule({
            moduleId: input.createId(),
            revisionId: input.createId(),
            key: moduleItem.key,
            displayName: moduleItem.displayName,
            description: "",
            isSeparatelyPurchasable: moduleItem.isSeparatelyPurchasable,
            priceInr: moduleItem.priceInr,
            term: moduleItem.term,
            featureRevisionIds: featureRevisionIdsForModule as string[],
            actorId: input.actorId,
            now: input.now,
        });
        if (created.status !== "created" || !("module" in created)) {
            continue;
        }
        const published = await repository.publishModuleRevision({
            moduleId: created.module.id,
            revisionId: created.module.currentRevision.id,
            actorId: input.actorId,
            now: input.now,
        });
        if (published.status !== "published") {
            continue;
        }
        moduleRevisionIds.set(moduleItem.key, created.module.currentRevision.id);
    }

    for (const planItem of SEEDED_COMMERCIAL_PLANS) {
        if (existingPlans.some((plan) => plan.key === planItem.key)) {
            continue;
        }
        const moduleRevisionIdsForPlan = planItem.moduleKeys
            .map((key) => moduleRevisionIds.get(key));
        if (moduleRevisionIdsForPlan.some((id) => !id)) {
            continue;
        }
        const created = await repository.createDraftPlan({
            planId: input.createId(),
            revisionId: input.createId(),
            key: planItem.key,
            displayName: planItem.displayName,
            description: "",
            planType: planItem.planType,
            priceInr: planItem.priceInr,
            term: planItem.term,
            moduleRevisionIds: moduleRevisionIdsForPlan as string[],
            actorId: input.actorId,
            now: input.now,
        });
        if (created.status !== "created" || !("plan" in created)) {
            continue;
        }
        await repository.publishPlanRevision({
            planId: created.plan.id,
            revisionId: created.plan.currentRevision.id,
            actorId: input.actorId,
            now: input.now,
        });
    }
};
