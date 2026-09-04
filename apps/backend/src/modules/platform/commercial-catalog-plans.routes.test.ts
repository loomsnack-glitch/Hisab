import { beforeEach, describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { sign } from "hono/jwt";
import {
    commercialCatalogCurrentRevisionRank,
    type CommercialCatalogAuditActorDTO,
    type CommercialCatalogReferenceDTO,
    type CommercialCatalogRevisionStatus,
    type CommercialCatalogTerm,
    type CommercialFeatureDetailDTO,
    type CommercialFeatureDetailResponse,
    type CommercialFeatureListItemDTO,
    type CommercialFeatureListQuerySVC,
    type CommercialFeatureRevisionDTO,
    type CommercialModuleDetailDTO,
    type CommercialModuleDetailResponse,
    type CommercialModuleFeatureMembershipDTO,
    type CommercialModuleListItemDTO,
    type CommercialModuleListQuerySVC,
    type CommercialModuleRevisionDTO,
    type CommercialPlanDetailDTO,
    type CommercialPlanDetailResponse,
    type CommercialPlanListItemDTO,
    type CommercialPlanListQuerySVC,
    type CommercialPlanListResponse,
    type CommercialPlanModuleMembershipDTO,
    type CommercialPlanRevisionDTO,
    type CommercialPlanType,
    type OwnerUserRecord,
    type ServiceResponse,
} from "@repo/types";

import { createCommercialCatalogService } from "./commercial-catalog.service";
import { createOwnerAuthService, createOwnerTokenProvider } from "./owner-auth.service";
import { createPlatformRoutes } from "./platform.routes";

const ashaId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ownerSecret = "owner-secret-that-is-isolated-from-other-auth-channels";
const ashaPassword = "correct horse battery staple";
const timestamp = "2026-09-04T00:00:00.000Z";
const missingRevisionId = "99999999-9999-4999-8999-999999999999";

const ashaActor: CommercialCatalogAuditActorDTO = {
    id: ashaId,
    firstName: "Asha",
    lastName: "Shah",
};

type StoredIdentity = { id: string; key: string };
type StoredRevision = {
    id: string;
    ownerId: string;
    revisionNumber: number;
    status: CommercialCatalogRevisionStatus;
    displayName: string;
    description: string;
    isSeparatelyPurchasable?: boolean;
    priceInr?: number | null;
    term?: CommercialCatalogTerm | null;
    planType?: CommercialPlanType;
    createdByOwnerUserId: string;
    createdAt: string;
    publishedByOwnerUserId: string | null;
    publishedAt: string | null;
    retiredByOwnerUserId: string | null;
    retiredAt: string | null;
    discardedByOwnerUserId: string | null;
    discardedAt: string | null;
};

const currentOf = <T extends { status: CommercialCatalogRevisionStatus; revisionNumber: number }>(revisions: T[]): T =>
    [...revisions].sort((left, right) => {
        const rank = commercialCatalogCurrentRevisionRank(left.status) - commercialCatalogCurrentRevisionRank(right.status);
        return rank !== 0 ? rank : right.revisionNumber - left.revisionNumber;
    })[0]!;

const createMemoryCatalog = (owners: OwnerUserRecord[]) => {
    const features: StoredIdentity[] = [];
    const featureRevisions: Array<StoredRevision & { featureId: string }> = [];
    const modules: StoredIdentity[] = [];
    const moduleRevisions: Array<StoredRevision & { moduleId: string }> = [];
    const featureMemberships: Array<{ moduleRevisionId: string; featureRevisionId: string; featureId: string }> = [];
    const plans: StoredIdentity[] = [];
    const planRevisions: Array<StoredRevision & { planId: string }> = [];
    const planMemberships: Array<{ planRevisionId: string; moduleRevisionId: string; moduleId: string }> = [];
    const actorById = new Map(
        owners.map((owner) => [owner.id, { id: owner.id, firstName: owner.firstName, lastName: owner.lastName }]),
    );
    const actor = (id: string | null): CommercialCatalogAuditActorDTO | null =>
        id ? actorById.get(id) ?? null : null;

    const toFeatureRevision = (revision: StoredRevision & { featureId: string }, key: string): CommercialFeatureRevisionDTO => ({
        id: revision.id,
        featureId: revision.featureId,
        key,
        revisionNumber: revision.revisionNumber,
        status: revision.status,
        displayName: revision.displayName,
        description: revision.description,
        createdBy: actor(revision.createdByOwnerUserId) as CommercialCatalogAuditActorDTO,
        createdAt: revision.createdAt,
        publishedBy: actor(revision.publishedByOwnerUserId),
        publishedAt: revision.publishedAt,
        retiredBy: actor(revision.retiredByOwnerUserId),
        retiredAt: revision.retiredAt,
        discardedBy: actor(revision.discardedByOwnerUserId),
        discardedAt: revision.discardedAt,
    });

    const featureMembershipDtos = (moduleRevisionId: string): CommercialModuleFeatureMembershipDTO[] =>
        featureMemberships
            .filter((membership) => membership.moduleRevisionId === moduleRevisionId)
            .map((membership) => {
                const revision = featureRevisions.find((item) => item.id === membership.featureRevisionId);
                const feature = features.find((item) => item.id === membership.featureId);
                return {
                    featureId: membership.featureId,
                    featureRevisionId: membership.featureRevisionId,
                    key: feature?.key ?? "",
                    displayName: revision?.displayName ?? "",
                    revisionNumber: revision?.revisionNumber ?? 1,
                    status: revision?.status ?? "draft",
                };
            })
            .sort((left, right) => left.displayName.localeCompare(right.displayName) || left.key.localeCompare(right.key));

    const toModuleRevision = (revision: StoredRevision & { moduleId: string }, key: string): CommercialModuleRevisionDTO => ({
        id: revision.id,
        moduleId: revision.moduleId,
        key,
        revisionNumber: revision.revisionNumber,
        status: revision.status,
        displayName: revision.displayName,
        description: revision.description,
        isSeparatelyPurchasable: revision.isSeparatelyPurchasable ?? false,
        priceInr: revision.priceInr ?? null,
        term: revision.term ?? null,
        features: featureMembershipDtos(revision.id),
        createdBy: actor(revision.createdByOwnerUserId) as CommercialCatalogAuditActorDTO,
        createdAt: revision.createdAt,
        publishedBy: actor(revision.publishedByOwnerUserId),
        publishedAt: revision.publishedAt,
        retiredBy: actor(revision.retiredByOwnerUserId),
        retiredAt: revision.retiredAt,
        discardedBy: actor(revision.discardedByOwnerUserId),
        discardedAt: revision.discardedAt,
    });

    const planModuleDtos = (planRevisionId: string): CommercialPlanModuleMembershipDTO[] =>
        planMemberships
            .filter((membership) => membership.planRevisionId === planRevisionId)
            .map((membership) => {
                const revision = moduleRevisions.find((item) => item.id === membership.moduleRevisionId);
                const moduleItem = modules.find((item) => item.id === membership.moduleId);
                return {
                    moduleId: membership.moduleId,
                    moduleRevisionId: membership.moduleRevisionId,
                    key: moduleItem?.key ?? "",
                    displayName: revision?.displayName ?? "",
                    revisionNumber: revision?.revisionNumber ?? 1,
                    status: revision?.status ?? "draft",
                    features: featureMembershipDtos(membership.moduleRevisionId),
                };
            })
            .sort((left, right) => left.displayName.localeCompare(right.displayName) || left.key.localeCompare(right.key));

    const resolveFeatures = (moduleItems: CommercialPlanModuleMembershipDTO[]): CommercialModuleFeatureMembershipDTO[] => {
        const seen = new Set<string>();
        const resolved: CommercialModuleFeatureMembershipDTO[] = [];
        for (const moduleItem of moduleItems) {
            for (const feature of moduleItem.features) {
                if (seen.has(feature.featureId)) continue;
                seen.add(feature.featureId);
                resolved.push(feature);
            }
        }
        return [...resolved].sort((left, right) =>
            left.displayName.localeCompare(right.displayName) || left.key.localeCompare(right.key)
        );
    };

    const toPlanRevision = (revision: StoredRevision & { planId: string }, key: string): CommercialPlanRevisionDTO => {
        const planModules = planModuleDtos(revision.id);
        return {
            id: revision.id,
            planId: revision.planId,
            key,
            revisionNumber: revision.revisionNumber,
            status: revision.status,
            displayName: revision.displayName,
            description: revision.description,
            planType: revision.planType ?? "paid",
            priceInr: revision.priceInr ?? 0,
            term: revision.term ?? { count: 1, unit: "year" },
            modules: planModules,
            resolvedFeatures: resolveFeatures(planModules),
            createdBy: actor(revision.createdByOwnerUserId) as CommercialCatalogAuditActorDTO,
            createdAt: revision.createdAt,
            publishedBy: actor(revision.publishedByOwnerUserId),
            publishedAt: revision.publishedAt,
            retiredBy: actor(revision.retiredByOwnerUserId),
            retiredAt: revision.retiredAt,
            discardedBy: actor(revision.discardedByOwnerUserId),
            discardedAt: revision.discardedAt,
        };
    };

    const referencingPlansOf = (moduleId: string): CommercialCatalogReferenceDTO[] =>
        plans
            .map((planItem) => {
                const revisions = planRevisions
                    .filter((revision) => revision.planId === planItem.id)
                    .map((revision) => toPlanRevision(revision, planItem.key));
                if (revisions.length === 0) return null;
                const current = currentOf(revisions);
                if (current.status === "discarded") return null;
                if (!current.modules.some((moduleItem) => moduleItem.moduleId === moduleId)) return null;
                return {
                    id: planItem.id,
                    key: planItem.key,
                    revisionId: current.id,
                    revisionNumber: current.revisionNumber,
                    status: current.status,
                    displayName: current.displayName,
                };
            })
            .filter((item): item is CommercialCatalogReferenceDTO => item !== null)
            .sort((left, right) => left.displayName.localeCompare(right.displayName) || left.key.localeCompare(right.key));

    const featureDetailOf = (featureId: string): CommercialFeatureDetailDTO | null => {
        const feature = features.find((item) => item.id === featureId);
        if (!feature) return null;
        const revisions = featureRevisions
            .filter((revision) => revision.featureId === featureId)
            .sort((left, right) => right.revisionNumber - left.revisionNumber)
            .map((revision) => toFeatureRevision(revision, feature.key));
        if (revisions.length === 0) return null;
        return {
            id: feature.id,
            key: feature.key,
            currentRevision: currentOf(revisions),
            revisions,
            referencingModules: [],
        };
    };

    const moduleDetailOf = (moduleId: string): CommercialModuleDetailDTO | null => {
        const moduleItem = modules.find((item) => item.id === moduleId);
        if (!moduleItem) return null;
        const revisions = moduleRevisions
            .filter((revision) => revision.moduleId === moduleId)
            .sort((left, right) => right.revisionNumber - left.revisionNumber)
            .map((revision) => toModuleRevision(revision, moduleItem.key));
        if (revisions.length === 0) return null;
        return {
            id: moduleItem.id,
            key: moduleItem.key,
            currentRevision: currentOf(revisions),
            revisions,
            referencingPlans: referencingPlansOf(moduleId),
        };
    };

    const planDetailOf = (planId: string): CommercialPlanDetailDTO | null => {
        const planItem = plans.find((item) => item.id === planId);
        if (!planItem) return null;
        const revisions = planRevisions
            .filter((revision) => revision.planId === planId)
            .sort((left, right) => right.revisionNumber - left.revisionNumber)
            .map((revision) => toPlanRevision(revision, planItem.key));
        if (revisions.length === 0) return null;
        return {
            id: planItem.id,
            key: planItem.key,
            currentRevision: currentOf(revisions),
            revisions,
        };
    };

    const findFeatureRevision = (featureId: string, revisionId: string) =>
        featureRevisions.find((revision) => revision.id === revisionId && revision.featureId === featureId);
    const findModuleRevision = (moduleId: string, revisionId: string) =>
        moduleRevisions.find((revision) => revision.id === revisionId && revision.moduleId === moduleId);
    const findPlanRevision = (planId: string, revisionId: string) =>
        planRevisions.find((revision) => revision.id === revisionId && revision.planId === planId);

    const validateFeatureMemberships = (ids: string[]) => {
        if (ids.length === 0) return { status: "empty" as const };
        const refs = ids.map((id) => featureRevisions.find((revision) => revision.id === id));
        if (refs.some((ref) => !ref)) return { status: "not-found" as const };
        if (refs.some((ref) => ref!.status === "discarded")) return { status: "discarded" as const };
        const featureIds = refs.map((ref) => ref!.featureId);
        if (new Set(featureIds).size !== featureIds.length) return { status: "duplicate-feature" as const };
        return { status: "ok" as const, refs: refs as Array<StoredRevision & { featureId: string }> };
    };

    const validatePlanMemberships = (ids: string[]) => {
        if (ids.length === 0) return { status: "empty" as const };
        const refs = ids.map((id) => moduleRevisions.find((revision) => revision.id === id));
        if (refs.some((ref) => !ref)) return { status: "not-found" as const };
        if (refs.some((ref) => ref!.status === "discarded")) return { status: "discarded" as const };
        const moduleIds = refs.map((ref) => ref!.moduleId);
        if (new Set(moduleIds).size !== moduleIds.length) return { status: "duplicate-module" as const };
        return { status: "ok" as const, refs: refs as Array<StoredRevision & { moduleId: string }> };
    };

    const replaceFeatureMemberships = (moduleRevisionId: string, refs: Array<StoredRevision & { featureId: string }>) => {
        for (let index = featureMemberships.length - 1; index >= 0; index -= 1) {
            if (featureMemberships[index]?.moduleRevisionId === moduleRevisionId) {
                featureMemberships.splice(index, 1);
            }
        }
        for (const ref of refs) {
            featureMemberships.push({
                moduleRevisionId,
                featureRevisionId: ref.id,
                featureId: ref.featureId,
            });
        }
    };

    const replacePlanMemberships = (planRevisionId: string, refs: Array<StoredRevision & { moduleId: string }>) => {
        for (let index = planMemberships.length - 1; index >= 0; index -= 1) {
            if (planMemberships[index]?.planRevisionId === planRevisionId) {
                planMemberships.splice(index, 1);
            }
        }
        for (const ref of refs) {
            planMemberships.push({
                planRevisionId,
                moduleRevisionId: ref.id,
                moduleId: ref.moduleId,
            });
        }
    };

    const newRevision = (
        id: string,
        ownerId: string,
        actorId: string,
        now: Date,
        fields: Pick<StoredRevision, "displayName" | "description"> & Partial<StoredRevision>,
    ): StoredRevision => ({
        id,
        ownerId,
        revisionNumber: fields.revisionNumber ?? 1,
        status: fields.status ?? "draft",
        displayName: fields.displayName,
        description: fields.description,
        isSeparatelyPurchasable: fields.isSeparatelyPurchasable,
        priceInr: fields.priceInr,
        term: fields.term,
        planType: fields.planType,
        createdByOwnerUserId: actorId,
        createdAt: now.toISOString(),
        publishedByOwnerUserId: fields.publishedByOwnerUserId ?? null,
        publishedAt: fields.publishedAt ?? null,
        retiredByOwnerUserId: null,
        retiredAt: null,
        discardedByOwnerUserId: null,
        discardedAt: null,
    });

    return {
        listFeatures: async (query: CommercialFeatureListQuerySVC): Promise<CommercialFeatureListItemDTO[]> => {
            const search = query.search?.trim().toLowerCase() ?? "";
            return features
                .map((feature) => featureDetailOf(feature.id))
                .filter((detail): detail is CommercialFeatureDetailDTO => detail !== null)
                .filter((detail) => query.status === "all" ? detail.currentRevision.status !== "discarded" : detail.currentRevision.status === query.status)
                .filter((detail) => !search || detail.key.includes(search) || detail.currentRevision.displayName.toLowerCase().includes(search))
                .map((detail) => ({
                    id: detail.id,
                    key: detail.key,
                    currentRevisionId: detail.currentRevision.id,
                    revisionNumber: detail.currentRevision.revisionNumber,
                    status: detail.currentRevision.status,
                    displayName: detail.currentRevision.displayName,
                    description: detail.currentRevision.description,
                }));
        },
        getFeatureDetail: async (featureId: string) => featureDetailOf(featureId),
        createDraftFeature: async (input: {
            featureId: string;
            revisionId: string;
            key: string;
            displayName: string;
            description: string;
            actorId: string;
            now: Date;
        }) => {
            if (features.some((feature) => feature.key === input.key)) {
                return { status: "duplicate-key" as const };
            }
            features.push({ id: input.featureId, key: input.key });
            featureRevisions.push({
                ...newRevision(input.revisionId, input.featureId, input.actorId, input.now, {
                    displayName: input.displayName,
                    description: input.description,
                }),
                featureId: input.featureId,
            });
            return { status: "created" as const, feature: featureDetailOf(input.featureId)! };
        },
        updateDraftRevision: async () => ({ status: "not-found" as const }),
        publishRevision: async (input: { featureId: string; revisionId: string; actorId: string; now: Date }) => {
            const revision = findFeatureRevision(input.featureId, input.revisionId);
            if (!revision) return { status: "not-found" as const };
            if (revision.status !== "draft") return { status: "not-draft" as const, currentStatus: revision.status };
            revision.status = "active";
            revision.publishedByOwnerUserId = input.actorId;
            revision.publishedAt = input.now.toISOString();
            return { status: "published" as const, feature: featureDetailOf(input.featureId)! };
        },
        retireRevision: async () => ({ status: "not-found" as const }),
        discardRevision: async (input: { featureId: string; revisionId: string; actorId: string; now: Date }) => {
            const revision = findFeatureRevision(input.featureId, input.revisionId);
            if (!revision) return { status: "not-found" as const };
            if (revision.status !== "draft") return { status: "not-draft" as const, currentStatus: revision.status };
            revision.status = "discarded";
            revision.discardedByOwnerUserId = input.actorId;
            revision.discardedAt = input.now.toISOString();
            return { status: "discarded" as const, feature: featureDetailOf(input.featureId)! };
        },
        createSuccessorRevision: async () => ({ status: "not-found" as const }),
        listModules: async (query: CommercialModuleListQuerySVC): Promise<CommercialModuleListItemDTO[]> => {
            const search = query.search?.trim().toLowerCase() ?? "";
            return modules
                .map((moduleItem) => moduleDetailOf(moduleItem.id))
                .filter((detail): detail is CommercialModuleDetailDTO => detail !== null)
                .filter((detail) => query.status === "all" ? detail.currentRevision.status !== "discarded" : detail.currentRevision.status === query.status)
                .filter((detail) => !search || detail.key.includes(search) || detail.currentRevision.displayName.toLowerCase().includes(search))
                .map((detail) => ({
                    id: detail.id,
                    key: detail.key,
                    currentRevisionId: detail.currentRevision.id,
                    revisionNumber: detail.currentRevision.revisionNumber,
                    status: detail.currentRevision.status,
                    displayName: detail.currentRevision.displayName,
                    description: detail.currentRevision.description,
                    isSeparatelyPurchasable: detail.currentRevision.isSeparatelyPurchasable,
                    priceInr: detail.currentRevision.priceInr,
                    term: detail.currentRevision.term,
                }));
        },
        getModuleDetail: async (moduleId: string) => moduleDetailOf(moduleId),
        createDraftModule: async (input: {
            moduleId: string;
            revisionId: string;
            key: string;
            displayName: string;
            description: string;
            isSeparatelyPurchasable: boolean;
            priceInr: number | null;
            term: CommercialCatalogTerm | null;
            featureRevisionIds: string[];
            actorId: string;
            now: Date;
        }) => {
            const membership = validateFeatureMemberships(input.featureRevisionIds);
            if (membership.status !== "ok") return { status: "invalid-membership" as const, reason: membership.status };
            if (modules.some((moduleItem) => moduleItem.key === input.key)) {
                return { status: "duplicate-key" as const };
            }
            modules.push({ id: input.moduleId, key: input.key });
            moduleRevisions.push({
                ...newRevision(input.revisionId, input.moduleId, input.actorId, input.now, {
                    displayName: input.displayName,
                    description: input.description,
                    isSeparatelyPurchasable: input.isSeparatelyPurchasable,
                    priceInr: input.priceInr,
                    term: input.term,
                }),
                moduleId: input.moduleId,
            });
            replaceFeatureMemberships(input.revisionId, membership.refs);
            return { status: "created" as const, module: moduleDetailOf(input.moduleId)! };
        },
        updateDraftModuleRevision: async () => ({ status: "not-found" as const }),
        publishModuleRevision: async (input: { moduleId: string; revisionId: string; actorId: string; now: Date }) => {
            const revision = findModuleRevision(input.moduleId, input.revisionId);
            if (!revision) return { status: "not-found" as const };
            if (revision.status !== "draft") return { status: "not-draft" as const, currentStatus: revision.status };
            revision.status = "active";
            revision.publishedByOwnerUserId = input.actorId;
            revision.publishedAt = input.now.toISOString();
            return { status: "published" as const, module: moduleDetailOf(input.moduleId)! };
        },
        retireModuleRevision: async () => ({ status: "not-found" as const }),
        discardModuleRevision: async (input: { moduleId: string; revisionId: string; actorId: string; now: Date }) => {
            const revision = findModuleRevision(input.moduleId, input.revisionId);
            if (!revision) return { status: "not-found" as const };
            if (revision.status !== "draft") return { status: "not-draft" as const, currentStatus: revision.status };
            revision.status = "discarded";
            revision.discardedByOwnerUserId = input.actorId;
            revision.discardedAt = input.now.toISOString();
            return { status: "discarded" as const, module: moduleDetailOf(input.moduleId)! };
        },
        createSuccessorModuleRevision: async (input: {
            moduleId: string;
            revisionId: string;
            successorRevisionId: string;
            actorId: string;
            now: Date;
        }) => {
            const source = findModuleRevision(input.moduleId, input.revisionId);
            if (!source) return { status: "not-found" as const };
            if (source.status !== "active" && source.status !== "retired") {
                return { status: "invalid-source" as const, currentStatus: source.status };
            }
            if (moduleRevisions.some((revision) => revision.moduleId === input.moduleId && revision.status === "draft")) {
                return { status: "draft-exists" as const };
            }
            const latest = Math.max(
                ...moduleRevisions.filter((revision) => revision.moduleId === input.moduleId).map((revision) => revision.revisionNumber),
            );
            moduleRevisions.push({
                ...newRevision(input.successorRevisionId, input.moduleId, input.actorId, input.now, {
                    displayName: source.displayName,
                    description: source.description,
                    isSeparatelyPurchasable: source.isSeparatelyPurchasable,
                    priceInr: source.priceInr,
                    term: source.term,
                    revisionNumber: latest + 1,
                }),
                moduleId: input.moduleId,
            });
            replaceFeatureMemberships(
                input.successorRevisionId,
                featureMemberships
                    .filter((membership) => membership.moduleRevisionId === input.revisionId)
                    .map((membership) => featureRevisions.find((revision) => revision.id === membership.featureRevisionId)!)
                    .filter(Boolean),
            );
            return { status: "created" as const, module: moduleDetailOf(input.moduleId)! };
        },
        listPlans: async (query: CommercialPlanListQuerySVC): Promise<CommercialPlanListItemDTO[]> => {
            const search = query.search?.trim().toLowerCase() ?? "";
            return plans
                .map((planItem) => planDetailOf(planItem.id))
                .filter((detail): detail is CommercialPlanDetailDTO => detail !== null)
                .filter((detail) => query.status === "all" ? detail.currentRevision.status !== "discarded" : detail.currentRevision.status === query.status)
                .filter((detail) => !search || detail.key.includes(search) || detail.currentRevision.displayName.toLowerCase().includes(search))
                .sort((left, right) =>
                    left.currentRevision.displayName.localeCompare(right.currentRevision.displayName)
                    || left.key.localeCompare(right.key)
                    || left.id.localeCompare(right.id)
                )
                .map((detail) => ({
                    id: detail.id,
                    key: detail.key,
                    currentRevisionId: detail.currentRevision.id,
                    revisionNumber: detail.currentRevision.revisionNumber,
                    status: detail.currentRevision.status,
                    displayName: detail.currentRevision.displayName,
                    description: detail.currentRevision.description,
                    planType: detail.currentRevision.planType,
                    priceInr: detail.currentRevision.priceInr,
                    term: detail.currentRevision.term,
                }));
        },
        getPlanDetail: async (planId: string) => planDetailOf(planId),
        createDraftPlan: async (input: {
            planId: string;
            revisionId: string;
            key: string;
            displayName: string;
            description: string;
            planType: CommercialPlanType;
            priceInr: number;
            term: CommercialCatalogTerm;
            moduleRevisionIds: string[];
            actorId: string;
            now: Date;
        }) => {
            const membership = validatePlanMemberships(input.moduleRevisionIds);
            if (membership.status !== "ok") return { status: "invalid-membership" as const, reason: membership.status };
            if (plans.some((planItem) => planItem.key === input.key)) {
                return { status: "duplicate-key" as const };
            }
            plans.push({ id: input.planId, key: input.key });
            planRevisions.push({
                ...newRevision(input.revisionId, input.planId, input.actorId, input.now, {
                    displayName: input.displayName,
                    description: input.description,
                    planType: input.planType,
                    priceInr: input.priceInr,
                    term: input.term,
                }),
                planId: input.planId,
            });
            replacePlanMemberships(input.revisionId, membership.refs);
            return { status: "created" as const, plan: planDetailOf(input.planId)! };
        },
        updateDraftPlanRevision: async (input: {
            planId: string;
            revisionId: string;
            displayName: string;
            description: string;
            planType: CommercialPlanType;
            priceInr: number;
            term: CommercialCatalogTerm;
            moduleRevisionIds: string[];
        }) => {
            const revision = findPlanRevision(input.planId, input.revisionId);
            if (!revision) return { status: "not-found" as const };
            if (revision.status !== "draft") return { status: "not-draft" as const, currentStatus: revision.status };
            const membership = validatePlanMemberships(input.moduleRevisionIds);
            if (membership.status !== "ok") return { status: "invalid-membership" as const, reason: membership.status };
            revision.displayName = input.displayName;
            revision.description = input.description;
            revision.planType = input.planType;
            revision.priceInr = input.priceInr;
            revision.term = input.term;
            replacePlanMemberships(input.revisionId, membership.refs);
            return { status: "updated" as const, plan: planDetailOf(input.planId)! };
        },
        publishPlanRevision: async (input: { planId: string; revisionId: string; actorId: string; now: Date }) => {
            const revision = findPlanRevision(input.planId, input.revisionId);
            if (!revision) return { status: "not-found" as const };
            if (revision.status !== "draft") return { status: "not-draft" as const, currentStatus: revision.status };
            const ids = planMemberships
                .filter((membership) => membership.planRevisionId === input.revisionId)
                .map((membership) => membership.moduleRevisionId);
            const membership = validatePlanMemberships(ids);
            if (membership.status !== "ok") return { status: "invalid-membership" as const, reason: membership.status };
            const previousActive = planRevisions.find((item) => item.planId === input.planId && item.status === "active");
            if (previousActive) {
                previousActive.status = "retired";
                previousActive.retiredByOwnerUserId = input.actorId;
                previousActive.retiredAt = input.now.toISOString();
            }
            revision.status = "active";
            revision.publishedByOwnerUserId = input.actorId;
            revision.publishedAt = input.now.toISOString();
            return { status: "published" as const, plan: planDetailOf(input.planId)! };
        },
        retirePlanRevision: async (input: { planId: string; revisionId: string; actorId: string; now: Date }) => {
            const revision = findPlanRevision(input.planId, input.revisionId);
            if (!revision) return { status: "not-found" as const };
            if (revision.status !== "active") return { status: "not-active" as const, currentStatus: revision.status };
            revision.status = "retired";
            revision.retiredByOwnerUserId = input.actorId;
            revision.retiredAt = input.now.toISOString();
            return { status: "retired" as const, plan: planDetailOf(input.planId)! };
        },
        discardPlanRevision: async (input: { planId: string; revisionId: string; actorId: string; now: Date }) => {
            const revision = findPlanRevision(input.planId, input.revisionId);
            if (!revision) return { status: "not-found" as const };
            if (revision.status !== "draft") return { status: "not-draft" as const, currentStatus: revision.status };
            revision.status = "discarded";
            revision.discardedByOwnerUserId = input.actorId;
            revision.discardedAt = input.now.toISOString();
            return { status: "discarded" as const, plan: planDetailOf(input.planId)! };
        },
        createSuccessorPlanRevision: async (input: {
            planId: string;
            revisionId: string;
            successorRevisionId: string;
            actorId: string;
            now: Date;
        }) => {
            const source = findPlanRevision(input.planId, input.revisionId);
            if (!source) return { status: "not-found" as const };
            if (source.status !== "active" && source.status !== "retired") {
                return { status: "invalid-source" as const, currentStatus: source.status };
            }
            if (planRevisions.some((revision) => revision.planId === input.planId && revision.status === "draft")) {
                return { status: "draft-exists" as const };
            }
            const latest = Math.max(
                ...planRevisions.filter((revision) => revision.planId === input.planId).map((revision) => revision.revisionNumber),
            );
            planRevisions.push({
                ...newRevision(input.successorRevisionId, input.planId, input.actorId, input.now, {
                    displayName: source.displayName,
                    description: source.description,
                    planType: source.planType,
                    priceInr: source.priceInr,
                    term: source.term,
                    revisionNumber: latest + 1,
                }),
                planId: input.planId,
            });
            replacePlanMemberships(
                input.successorRevisionId,
                planMemberships
                    .filter((membership) => membership.planRevisionId === input.revisionId)
                    .map((membership) => moduleRevisions.find((revision) => revision.id === membership.moduleRevisionId)!)
                    .filter(Boolean),
            );
            return { status: "created" as const, plan: planDetailOf(input.planId)! };
        },
    };
};

const createHarness = async () => {
    const owners: OwnerUserRecord[] = [
        {
            id: ashaId,
            firstName: "Asha",
            lastName: "Shah",
            phone: "+919876543210",
            passwordHash: await Bun.password.hash(ashaPassword),
            isActive: true,
            createdAt: timestamp,
            updatedAt: timestamp,
        },
    ];
    let nextId = 1;
    let nowMs = Date.parse(timestamp);
    const catalogService = createCommercialCatalogService({
        repository: createMemoryCatalog(owners),
        createId: () => {
            const value = String(nextId).padStart(12, "0");
            nextId += 1;
            return `11111111-1111-4111-8111-${value}`;
        },
        now: () => new Date(nowMs),
    });
    const authService = createOwnerAuthService({
        repository: {
            getOwnerUserById: async (id) => owners.find((owner) => owner.id === id) ?? null,
            getOwnerUserByPhone: async (phone) => owners.find((owner) => owner.phone === phone) ?? null,
        },
        otpStore: { set: async () => {}, get: async () => null, delete: async () => {} },
        sendOtp: async () => ({ ok: true }),
        createOtp: () => "482951",
        verifyPassword: Bun.password.verify,
        tokenProvider: createOwnerTokenProvider(ownerSecret),
    });
    const app = new Hono().route("/platform", createPlatformRoutes(authService, undefined, undefined, catalogService));
    return {
        app,
        setOwnerActive: (isActive: boolean) => {
            const owner = owners[0];
            if (owner) owner.isActive = isActive;
        },
    };
};

const cookieFrom = (response: Response) => response.headers.get("set-cookie")?.split(";")[0] ?? "";
const jsonHeaders = (cookie: string) => ({ "content-type": "application/json", cookie });
const authCookie = async (app: Hono) =>
    cookieFrom(
        await app.request("/platform/auth/login", {
            method: "POST",
            headers: { "content-type": "application/json", "x-device-id": "browser-1" },
            body: JSON.stringify({ requestType: "user-info", phone: "+919876543210", password: ashaPassword }),
        }),
    );

const createFeature = (app: Hono, cookie: string, body: { key: string; displayName: string }) =>
    app.request("/platform/catalog/features", {
        method: "POST",
        headers: jsonHeaders(cookie),
        body: JSON.stringify(body),
    });

const createModule = (app: Hono, cookie: string, body: Record<string, unknown>) =>
    app.request("/platform/catalog/modules", {
        method: "POST",
        headers: jsonHeaders(cookie),
        body: JSON.stringify(body),
    });

const discardModule = (app: Hono, cookie: string, moduleId: string, revisionId: string) =>
    app.request(`/platform/catalog/modules/${moduleId}/revisions/${revisionId}/discard`, {
        method: "POST",
        headers: { cookie },
    });

const createPlan = (app: Hono, cookie: string, body: Record<string, unknown>) =>
    app.request("/platform/catalog/plans", {
        method: "POST",
        headers: jsonHeaders(cookie),
        body: JSON.stringify(body),
    });

const listPlans = (app: Hono, cookie: string, query = "") =>
    app.request(`/platform/catalog/plans${query}`, { headers: { cookie } });

const updatePlanDraft = (app: Hono, cookie: string, planId: string, revisionId: string, body: Record<string, unknown>) =>
    app.request(`/platform/catalog/plans/${planId}/revisions/${revisionId}`, {
        method: "PATCH",
        headers: jsonHeaders(cookie),
        body: JSON.stringify(body),
    });

const publishPlan = (app: Hono, cookie: string, planId: string, revisionId: string) =>
    app.request(`/platform/catalog/plans/${planId}/revisions/${revisionId}/publish`, {
        method: "POST",
        headers: { cookie },
    });

const retirePlan = (app: Hono, cookie: string, planId: string, revisionId: string) =>
    app.request(`/platform/catalog/plans/${planId}/revisions/${revisionId}/retire`, {
        method: "POST",
        headers: { cookie },
    });

const discardPlan = (app: Hono, cookie: string, planId: string, revisionId: string) =>
    app.request(`/platform/catalog/plans/${planId}/revisions/${revisionId}/discard`, {
        method: "POST",
        headers: { cookie },
    });

const successorPlan = (app: Hono, cookie: string, planId: string, revisionId: string) =>
    app.request(`/platform/catalog/plans/${planId}/revisions/${revisionId}/successor`, {
        method: "POST",
        headers: { cookie },
    });

const createdFeature = async (app: Hono, cookie: string, key: string, displayName: string) => {
    const created = await createFeature(app, cookie, { key, displayName });
    const body = await created.json() as ServiceResponse<CommercialFeatureDetailResponse>;
    return body.data!.feature;
};

const createdModule = async (app: Hono, cookie: string, key: string, displayName: string, featureRevisionIds: string[]) => {
    const created = await createModule(app, cookie, {
        key,
        displayName,
        featureRevisionIds,
        isSeparatelyPurchasable: false,
    });
    const body = await created.json() as ServiceResponse<CommercialModuleDetailResponse>;
    return body.data!.module;
};

describe("Plan Catalog management API", () => {
    beforeEach(() => {
        process.env.NODE_ENV = "test";
    });

    test("rejects unauthenticated and inactive Owner Users", async () => {
        const { app, setOwnerActive } = await createHarness();
        const customerToken = await sign(
            { id: ashaId, exp: Math.floor(Date.now() / 1000) + 3600 },
            "customer-and-device-secret",
        );

        const unauthenticated = await app.request("/platform/catalog/plans");
        const customer = await app.request("/platform/catalog/plans", {
            headers: { authorization: `Bearer ${customerToken}` },
        });
        const cookie = await authCookie(app);
        setOwnerActive(false);
        const inactive = await app.request("/platform/catalog/plans", { headers: { cookie } });

        expect(unauthenticated.status).toBe(401);
        expect(customer.status).toBe(401);
        expect(inactive.status).toBe(401);
        expect((await inactive.json() as { message: string }).message).toBe("Owner session is no longer active");
    });

    test("creates a Trial Plan at ₹0 for seven days pinned to exact Module revisions", async () => {
        const { app } = await createHarness();
        const cookie = await authCookie(app);
        const billing = await createdFeature(app, cookie, "billing", "Billing");
        const core = await createdModule(app, cookie, "core_operations", "Core Operations", [billing.currentRevision.id]);
        const catalog = await createdModule(app, cookie, "basic_catalog", "Basic Catalog", [billing.currentRevision.id]);

        const created = await createPlan(app, cookie, {
            key: "trial",
            displayName: "Trial",
            description: "Seven-day exploration",
            planType: "trial",
            priceInr: 0,
            term: { count: 7, unit: "day" },
            moduleRevisionIds: [core.currentRevision.id, catalog.currentRevision.id],
        });
        const body = await created.json() as ServiceResponse<CommercialPlanDetailResponse>;

        expect(created.status).toBe(201);
        expect(body.data?.plan).toMatchObject({
            key: "trial",
            currentRevision: {
                status: "draft",
                displayName: "Trial",
                planType: "trial",
                priceInr: 0,
                term: { count: 7, unit: "day" },
                createdBy: ashaActor,
            },
        });
        expect(body.data?.plan.currentRevision.modules.map((moduleItem) => moduleItem.key).sort()).toEqual([
            "basic_catalog",
            "core_operations",
        ]);
        expect(body.data?.plan.currentRevision.resolvedFeatures.map((feature) => feature.key)).toEqual(["billing"]);
    });

    test("lists Plans with search and status filters and keeps a Module reusable across Plans", async () => {
        const { app } = await createHarness();
        const cookie = await authCookie(app);
        const billing = await createdFeature(app, cookie, "billing", "Billing");
        const core = await createdModule(app, cookie, "core_operations", "Core Operations", [billing.currentRevision.id]);
        await createPlan(app, cookie, {
            key: "trial",
            displayName: "Trial",
            planType: "trial",
            priceInr: 0,
            term: { count: 7, unit: "day" },
            moduleRevisionIds: [core.currentRevision.id],
        });
        const corePlan = await createPlan(app, cookie, {
            key: "core",
            displayName: "Core",
            planType: "paid",
            priceInr: 2999,
            term: { count: 1, unit: "year" },
            moduleRevisionIds: [core.currentRevision.id],
        });
        const coreBody = await corePlan.json() as ServiceResponse<CommercialPlanDetailResponse>;
        await publishPlan(app, cookie, coreBody.data!.plan.id, coreBody.data!.plan.currentRevision.id);

        const listed = await listPlans(app, cookie);
        const listedBody = await listed.json() as ServiceResponse<CommercialPlanListResponse>;
        expect(listedBody.data?.plans.map((planItem) => ({
            key: planItem.key,
            status: planItem.status,
            planType: planItem.planType,
        }))).toEqual([
            { key: "core", status: "active", planType: "paid" },
            { key: "trial", status: "draft", planType: "trial" },
        ]);

        const searched = await listPlans(app, cookie, "?search=trial");
        expect((await searched.json() as ServiceResponse<CommercialPlanListResponse>).data?.plans.map((item) => item.key)).toEqual(["trial"]);

        const drafts = await listPlans(app, cookie, "?status=draft");
        expect((await drafts.json() as ServiceResponse<CommercialPlanListResponse>).data?.plans.map((item) => item.key)).toEqual(["trial"]);

        const moduleDetail = await app.request(`/platform/catalog/modules/${core.id}`, { headers: { cookie } });
        const moduleBody = await moduleDetail.json() as ServiceResponse<CommercialModuleDetailResponse>;
        expect(moduleBody.data?.module.referencingPlans.map((item) => item.key).sort()).toEqual(["core", "trial"]);
    });

    test("rejects a duplicate Plan key, including after discard", async () => {
        const { app } = await createHarness();
        const cookie = await authCookie(app);
        const billing = await createdFeature(app, cookie, "billing", "Billing");
        const core = await createdModule(app, cookie, "core_operations", "Core Operations", [billing.currentRevision.id]);
        const created = await createPlan(app, cookie, {
            key: "core",
            displayName: "Core",
            planType: "paid",
            priceInr: 2999,
            term: { count: 1, unit: "year" },
            moduleRevisionIds: [core.currentRevision.id],
        });
        const createdBody = await created.json() as ServiceResponse<CommercialPlanDetailResponse>;

        const duplicate = await createPlan(app, cookie, {
            key: "core",
            displayName: "Other Core",
            planType: "paid",
            priceInr: 4999,
            term: { count: 1, unit: "year" },
            moduleRevisionIds: [core.currentRevision.id],
        });
        expect(duplicate.status).toBe(409);

        await discardPlan(app, cookie, createdBody.data!.plan.id, createdBody.data!.plan.currentRevision.id);
        const reused = await createPlan(app, cookie, {
            key: "core",
            displayName: "Core Again",
            planType: "paid",
            priceInr: 2999,
            term: { count: 1, unit: "year" },
            moduleRevisionIds: [core.currentRevision.id],
        });
        expect(reused.status).toBe(409);
    });

    test("enforces Module membership and commercial rules and never accepts direct Feature membership", async () => {
        const { app } = await createHarness();
        const cookie = await authCookie(app);
        const billing = await createdFeature(app, cookie, "billing", "Billing");
        const units = await createdFeature(app, cookie, "units", "Units");
        const core = await createdModule(app, cookie, "core_operations", "Core Operations", [billing.currentRevision.id]);
        const catalog = await createdModule(app, cookie, "basic_catalog", "Basic Catalog", [units.currentRevision.id]);

        const withFeatures = await createPlan(app, cookie, {
            key: "illegal",
            displayName: "Illegal",
            planType: "paid",
            priceInr: 2999,
            term: { count: 1, unit: "year" },
            moduleRevisionIds: [core.currentRevision.id],
            featureRevisionIds: [billing.currentRevision.id],
        });
        expect(withFeatures.status).toBe(400);

        const empty = await createPlan(app, cookie, {
            key: "empty_plan",
            displayName: "Empty",
            planType: "paid",
            priceInr: 2999,
            term: { count: 1, unit: "year" },
            moduleRevisionIds: [],
        });
        expect(empty.status).toBe(400);

        const missing = await createPlan(app, cookie, {
            key: "missing_module",
            displayName: "Missing",
            planType: "paid",
            priceInr: 2999,
            term: { count: 1, unit: "year" },
            moduleRevisionIds: [missingRevisionId],
        });
        expect(missing.status).toBe(400);
        expect((await missing.json() as { message: string }).message).toBe("One or more Module revisions were not found");

        const sameModuleTwice = await createPlan(app, cookie, {
            key: "same_module_twice",
            displayName: "Same Module Twice",
            planType: "paid",
            priceInr: 2999,
            term: { count: 1, unit: "year" },
            moduleRevisionIds: [core.currentRevision.id, catalog.currentRevision.id, core.currentRevision.id],
        });
        expect(sameModuleTwice.status).toBe(400);

        await app.request(`/platform/catalog/modules/${core.id}/revisions/${core.currentRevision.id}/publish`, {
            method: "POST",
            headers: { cookie },
        });
        const successorModule = await app.request(
            `/platform/catalog/modules/${core.id}/revisions/${core.currentRevision.id}/successor`,
            { method: "POST", headers: { cookie } },
        );
        const successorModuleBody = await successorModule.json() as ServiceResponse<CommercialModuleDetailResponse>;
        const twoRevisions = await createPlan(app, cookie, {
            key: "two_revisions",
            displayName: "Two Revisions",
            planType: "paid",
            priceInr: 2999,
            term: { count: 1, unit: "year" },
            moduleRevisionIds: [core.currentRevision.id, successorModuleBody.data!.module.currentRevision.id],
        });
        expect(twoRevisions.status).toBe(409);
        expect((await twoRevisions.json() as { message: string }).message).toBe("A Plan can include a Module only once");

        await discardModule(app, cookie, catalog.id, catalog.currentRevision.id);
        const discardedMember = await createPlan(app, cookie, {
            key: "discarded_member",
            displayName: "Discarded Member",
            planType: "paid",
            priceInr: 2999,
            term: { count: 1, unit: "year" },
            moduleRevisionIds: [catalog.currentRevision.id],
        });
        expect(discardedMember.status).toBe(409);

        const pricedTrial = await createPlan(app, cookie, {
            key: "priced_trial",
            displayName: "Priced Trial",
            planType: "trial",
            priceInr: 100,
            term: { count: 7, unit: "day" },
            moduleRevisionIds: [core.currentRevision.id],
        });
        expect(pricedTrial.status).toBe(400);

        const freePaid = await createPlan(app, cookie, {
            key: "free_paid",
            displayName: "Free Paid",
            planType: "paid",
            priceInr: 0,
            term: { count: 1, unit: "year" },
            moduleRevisionIds: [core.currentRevision.id],
        });
        expect(freePaid.status).toBe(400);

        const invalidPrice = await createPlan(app, cookie, {
            key: "core",
            displayName: "Core",
            planType: "paid",
            priceInr: 2999.999,
            term: { count: 1, unit: "year" },
            moduleRevisionIds: [core.currentRevision.id],
        });
        expect(invalidPrice.status).toBe(400);

        const paid = await createPlan(app, cookie, {
            key: "core",
            displayName: "Core",
            planType: "paid",
            priceInr: 2999,
            term: { count: 1, unit: "year" },
            moduleRevisionIds: [core.currentRevision.id],
        });
        const paidBody = await paid.json() as ServiceResponse<CommercialPlanDetailResponse>;
        expect(paid.status).toBe(201);
        expect(paidBody.data?.plan.currentRevision).toMatchObject({
            planType: "paid",
            priceInr: 2999,
            term: { count: 1, unit: "year" },
        });
    });

    test("publishes a successor Plan revision, retires the previous Active revision, and keeps memberships pinned", async () => {
        const { app } = await createHarness();
        const cookie = await authCookie(app);
        const billing = await createdFeature(app, cookie, "billing", "Billing");
        const core = await createdModule(app, cookie, "core_operations", "Core Operations", [billing.currentRevision.id]);
        const created = await createPlan(app, cookie, {
            key: "core",
            displayName: "Core",
            description: "v1",
            planType: "paid",
            priceInr: 2999,
            term: { count: 1, unit: "year" },
            moduleRevisionIds: [core.currentRevision.id],
        });
        const createdBody = await created.json() as ServiceResponse<CommercialPlanDetailResponse>;
        const first = createdBody.data!.plan.currentRevision;
        await publishPlan(app, cookie, createdBody.data!.plan.id, first.id);

        const editedActive = await updatePlanDraft(app, cookie, createdBody.data!.plan.id, first.id, {
            displayName: "Renamed",
            description: "changed",
            planType: "paid",
            priceInr: 2999,
            term: { count: 1, unit: "year" },
            moduleRevisionIds: [core.currentRevision.id],
        });
        expect(editedActive.status).toBe(409);
        expect((await editedActive.json() as { message: string }).message).toBe("Active Plan revisions are immutable");

        const successorResponse = await successorPlan(app, cookie, createdBody.data!.plan.id, first.id);
        expect(successorResponse.status).toBe(201);
        const successorBody = await successorResponse.json() as ServiceResponse<CommercialPlanDetailResponse>;
        const draft = successorBody.data!.plan.currentRevision;
        expect(draft).toMatchObject({
            revisionNumber: 2,
            status: "draft",
            displayName: "Core",
            description: "v1",
            modules: [{ key: "core_operations", moduleRevisionId: core.currentRevision.id }],
        });

        const updated = await updatePlanDraft(app, cookie, createdBody.data!.plan.id, draft.id, {
            displayName: "Core",
            description: "v2",
            planType: "paid",
            priceInr: 3499,
            term: { count: 1, unit: "year" },
            moduleRevisionIds: [core.currentRevision.id],
        });
        expect(updated.status).toBe(200);

        const published = await publishPlan(app, cookie, createdBody.data!.plan.id, draft.id);
        const publishedBody = await published.json() as ServiceResponse<CommercialPlanDetailResponse>;
        expect(publishedBody.data?.plan.currentRevision).toMatchObject({
            id: draft.id,
            revisionNumber: 2,
            status: "active",
            description: "v2",
            priceInr: 3499,
            publishedBy: ashaActor,
        });
        expect(publishedBody.data?.plan.revisions.map((revision) => ({
            revisionNumber: revision.revisionNumber,
            status: revision.status,
        }))).toEqual([
            { revisionNumber: 2, status: "active" },
            { revisionNumber: 1, status: "retired" },
        ]);
    });

    test("retires, discards, and rejects invalid Plan lifecycle transitions", async () => {
        const { app } = await createHarness();
        const cookie = await authCookie(app);
        const billing = await createdFeature(app, cookie, "billing", "Billing");
        const core = await createdModule(app, cookie, "core_operations", "Core Operations", [billing.currentRevision.id]);
        const created = await createPlan(app, cookie, {
            key: "core",
            displayName: "Core",
            planType: "paid",
            priceInr: 2999,
            term: { count: 1, unit: "year" },
            moduleRevisionIds: [core.currentRevision.id],
        });
        const createdBody = await created.json() as ServiceResponse<CommercialPlanDetailResponse>;
        const draft = createdBody.data!.plan.currentRevision;

        expect((await retirePlan(app, cookie, createdBody.data!.plan.id, draft.id)).status).toBe(409);
        expect((await successorPlan(app, cookie, createdBody.data!.plan.id, draft.id)).status).toBe(409);

        await publishPlan(app, cookie, createdBody.data!.plan.id, draft.id);
        const retired = await retirePlan(app, cookie, createdBody.data!.plan.id, draft.id);
        expect(retired.status).toBe(200);
        expect((await retired.json() as ServiceResponse<CommercialPlanDetailResponse>).data?.plan.currentRevision.status).toBe("retired");

        const successorResponse = await successorPlan(app, cookie, createdBody.data!.plan.id, draft.id);
        expect(successorResponse.status).toBe(201);
        const secondSuccessor = await successorPlan(app, cookie, createdBody.data!.plan.id, draft.id);
        expect(secondSuccessor.status).toBe(409);

        const unused = await createPlan(app, cookie, {
            key: "pro",
            displayName: "Pro",
            planType: "paid",
            priceInr: 4999,
            term: { count: 1, unit: "year" },
            moduleRevisionIds: [core.currentRevision.id],
        });
        const unusedBody = await unused.json() as ServiceResponse<CommercialPlanDetailResponse>;
        const discarded = await discardPlan(app, cookie, unusedBody.data!.plan.id, unusedBody.data!.plan.currentRevision.id);
        expect(discarded.status).toBe(200);
        const listed = await listPlans(app, cookie);
        expect((await listed.json() as ServiceResponse<CommercialPlanListResponse>).data?.plans.map((item) => item.key)).toEqual(["core"]);
        const discardedList = await listPlans(app, cookie, "?status=discarded");
        expect((await discardedList.json() as ServiceResponse<CommercialPlanListResponse>).data?.plans.map((item) => item.key)).toEqual(["pro"]);
    });

    test("does not expose Organization mutation through the Plan Catalog", async () => {
        const { app } = await createHarness();
        const cookie = await authCookie(app);
        const tenantCreate = await app.request("/platform/organizations", {
            method: "POST",
            headers: jsonHeaders(cookie),
            body: JSON.stringify({ name: "Acme" }),
        });
        expect(tenantCreate.status).toBe(404);
    });
});
