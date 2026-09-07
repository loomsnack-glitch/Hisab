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
    type CommercialModuleListResponse,
    type CommercialModuleRevisionDTO,
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
    const memberships: Array<{ moduleRevisionId: string; featureRevisionId: string; featureId: string }> = [];
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

    const membershipDtos = (moduleRevisionId: string): CommercialModuleFeatureMembershipDTO[] =>
        memberships
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
        features: membershipDtos(revision.id),
        createdBy: actor(revision.createdByOwnerUserId) as CommercialCatalogAuditActorDTO,
        createdAt: revision.createdAt,
        publishedBy: actor(revision.publishedByOwnerUserId),
        publishedAt: revision.publishedAt,
        retiredBy: actor(revision.retiredByOwnerUserId),
        retiredAt: revision.retiredAt,
        discardedBy: actor(revision.discardedByOwnerUserId),
        discardedAt: revision.discardedAt,
    });

    const referencingModulesOf = (featureId: string): CommercialCatalogReferenceDTO[] =>
        modules
            .map((moduleItem) => {
                const revisions = moduleRevisions
                    .filter((revision) => revision.moduleId === moduleItem.id)
                    .map((revision) => toModuleRevision(revision, moduleItem.key));
                if (revisions.length === 0) return null;
                const current = currentOf(revisions);
                if (current.status === "discarded") return null;
                if (!current.features.some((feature) => feature.featureId === featureId)) return null;
                return {
                    id: moduleItem.id,
                    key: moduleItem.key,
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
            referencingModules: referencingModulesOf(featureId),
            affectedPlans: [],
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
            referencingPlans: [],
        };
    };

    const findFeatureRevision = (featureId: string, revisionId: string) =>
        featureRevisions.find((revision) => revision.id === revisionId && revision.featureId === featureId);
    const findModuleRevision = (moduleId: string, revisionId: string) =>
        moduleRevisions.find((revision) => revision.id === revisionId && revision.moduleId === moduleId);

    const validateMemberships = (ids: string[]) => {
        if (ids.length === 0) return { status: "empty" as const };
        const refs = ids.map((id) => featureRevisions.find((revision) => revision.id === id));
        if (refs.some((ref) => !ref)) return { status: "not-found" as const };
        if (refs.some((ref) => ref!.status === "discarded")) return { status: "discarded" as const };
        const featureIds = refs.map((ref) => ref!.featureId);
        if (new Set(featureIds).size !== featureIds.length) return { status: "duplicate-feature" as const };
        return { status: "ok" as const, refs: refs as Array<StoredRevision & { featureId: string }> };
    };

    const replaceMemberships = (moduleRevisionId: string, refs: Array<StoredRevision & { featureId: string }>) => {
        for (let index = memberships.length - 1; index >= 0; index -= 1) {
            if (memberships[index]?.moduleRevisionId === moduleRevisionId) {
                memberships.splice(index, 1);
            }
        }
        for (const ref of refs) {
            memberships.push({
                moduleRevisionId,
                featureRevisionId: ref.id,
                featureId: ref.featureId,
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
        createSuccessorRevision: async (input: {
            featureId: string;
            revisionId: string;
            successorRevisionId: string;
            actorId: string;
            now: Date;
        }) => {
            const source = findFeatureRevision(input.featureId, input.revisionId);
            if (!source) return { status: "not-found" as const };
            if (source.status !== "active" && source.status !== "retired") {
                return { status: "invalid-source" as const, currentStatus: source.status };
            }
            if (featureRevisions.some((revision) => revision.featureId === input.featureId && revision.status === "draft")) {
                return { status: "draft-exists" as const };
            }
            const latest = Math.max(
                ...featureRevisions.filter((revision) => revision.featureId === input.featureId).map((revision) => revision.revisionNumber),
            );
            featureRevisions.push({
                ...newRevision(input.successorRevisionId, input.featureId, input.actorId, input.now, {
                    displayName: source.displayName,
                    description: source.description,
                    revisionNumber: latest + 1,
                }),
                featureId: input.featureId,
            });
            return { status: "created" as const, feature: featureDetailOf(input.featureId)! };
        },
        listModules: async (query: CommercialModuleListQuerySVC): Promise<CommercialModuleListItemDTO[]> => {
            const search = query.search?.trim().toLowerCase() ?? "";
            return modules
                .map((moduleItem) => moduleDetailOf(moduleItem.id))
                .filter((detail): detail is CommercialModuleDetailDTO => detail !== null)
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
            const membership = validateMemberships(input.featureRevisionIds);
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
            replaceMemberships(input.revisionId, membership.refs);
            return { status: "created" as const, module: moduleDetailOf(input.moduleId)! };
        },
        updateDraftModuleRevision: async (input: {
            moduleId: string;
            revisionId: string;
            displayName: string;
            description: string;
            isSeparatelyPurchasable: boolean;
            priceInr: number | null;
            term: CommercialCatalogTerm | null;
            featureRevisionIds: string[];
        }) => {
            const revision = findModuleRevision(input.moduleId, input.revisionId);
            if (!revision) return { status: "not-found" as const };
            if (revision.status !== "draft") return { status: "not-draft" as const, currentStatus: revision.status };
            const membership = validateMemberships(input.featureRevisionIds);
            if (membership.status !== "ok") return { status: "invalid-membership" as const, reason: membership.status };
            revision.displayName = input.displayName;
            revision.description = input.description;
            revision.isSeparatelyPurchasable = input.isSeparatelyPurchasable;
            revision.priceInr = input.priceInr;
            revision.term = input.term;
            replaceMemberships(input.revisionId, membership.refs);
            return { status: "updated" as const, module: moduleDetailOf(input.moduleId)! };
        },
        publishModuleRevision: async (input: { moduleId: string; revisionId: string; actorId: string; now: Date }) => {
            const revision = findModuleRevision(input.moduleId, input.revisionId);
            if (!revision) return { status: "not-found" as const };
            if (revision.status !== "draft") return { status: "not-draft" as const, currentStatus: revision.status };
            const ids = memberships
                .filter((membership) => membership.moduleRevisionId === input.revisionId)
                .map((membership) => membership.featureRevisionId);
            const membership = validateMemberships(ids);
            if (membership.status !== "ok") return { status: "invalid-membership" as const, reason: membership.status };
            const previousActive = moduleRevisions.find((item) => item.moduleId === input.moduleId && item.status === "active");
            if (previousActive) {
                previousActive.status = "retired";
                previousActive.retiredByOwnerUserId = input.actorId;
                previousActive.retiredAt = input.now.toISOString();
            }
            revision.status = "active";
            revision.publishedByOwnerUserId = input.actorId;
            revision.publishedAt = input.now.toISOString();
            return { status: "published" as const, module: moduleDetailOf(input.moduleId)! };
        },
        retireModuleRevision: async (input: { moduleId: string; revisionId: string; actorId: string; now: Date }) => {
            const revision = findModuleRevision(input.moduleId, input.revisionId);
            if (!revision) return { status: "not-found" as const };
            if (revision.status !== "active") return { status: "not-active" as const, currentStatus: revision.status };
            revision.status = "retired";
            revision.retiredByOwnerUserId = input.actorId;
            revision.retiredAt = input.now.toISOString();
            return { status: "retired" as const, module: moduleDetailOf(input.moduleId)! };
        },
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
            replaceMemberships(
                input.successorRevisionId,
                memberships
                    .filter((membership) => membership.moduleRevisionId === input.revisionId)
                    .map((membership) => featureRevisions.find((revision) => revision.id === membership.featureRevisionId)!)
                    .filter(Boolean),
            );
            return { status: "created" as const, module: moduleDetailOf(input.moduleId)! };
        },
        listPlans: async () => [],
        getPlanDetail: async () => null,
        createDraftPlan: async () => ({ status: "duplicate-key" as const }),
        updateDraftPlanRevision: async () => ({ status: "not-found" as const }),
        publishPlanRevision: async () => ({ status: "not-found" as const }),
        retirePlanRevision: async () => ({ status: "not-found" as const }),
        discardPlanRevision: async () => ({ status: "not-found" as const }),
        createSuccessorPlanRevision: async () => ({ status: "not-found" as const }),
        ensureInitialCatalog: async () => {},
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

const createFeature = (app: Hono, cookie: string, body: { key: string; displayName: string; description?: string }) =>
    app.request("/platform/catalog/features", {
        method: "POST",
        headers: jsonHeaders(cookie),
        body: JSON.stringify(body),
    });

const publishFeature = (app: Hono, cookie: string, featureId: string, revisionId: string) =>
    app.request(`/platform/catalog/features/${featureId}/revisions/${revisionId}/publish`, {
        method: "POST",
        headers: { cookie },
    });

const discardFeature = (app: Hono, cookie: string, featureId: string, revisionId: string) =>
    app.request(`/platform/catalog/features/${featureId}/revisions/${revisionId}/discard`, {
        method: "POST",
        headers: { cookie },
    });

const createModule = (app: Hono, cookie: string, body: Record<string, unknown>) =>
    app.request("/platform/catalog/modules", {
        method: "POST",
        headers: jsonHeaders(cookie),
        body: JSON.stringify(body),
    });

const listModules = (app: Hono, cookie: string, query = "") =>
    app.request(`/platform/catalog/modules${query}`, { headers: { cookie } });

const updateModuleDraft = (app: Hono, cookie: string, moduleId: string, revisionId: string, body: Record<string, unknown>) =>
    app.request(`/platform/catalog/modules/${moduleId}/revisions/${revisionId}`, {
        method: "PATCH",
        headers: jsonHeaders(cookie),
        body: JSON.stringify(body),
    });

const publishModule = (app: Hono, cookie: string, moduleId: string, revisionId: string) =>
    app.request(`/platform/catalog/modules/${moduleId}/revisions/${revisionId}/publish`, {
        method: "POST",
        headers: { cookie },
    });

const retireModule = (app: Hono, cookie: string, moduleId: string, revisionId: string) =>
    app.request(`/platform/catalog/modules/${moduleId}/revisions/${revisionId}/retire`, {
        method: "POST",
        headers: { cookie },
    });

const discardModule = (app: Hono, cookie: string, moduleId: string, revisionId: string) =>
    app.request(`/platform/catalog/modules/${moduleId}/revisions/${revisionId}/discard`, {
        method: "POST",
        headers: { cookie },
    });

const successorModule = (app: Hono, cookie: string, moduleId: string, revisionId: string) =>
    app.request(`/platform/catalog/modules/${moduleId}/revisions/${revisionId}/successor`, {
        method: "POST",
        headers: { cookie },
    });

const createdFeature = async (app: Hono, cookie: string, key: string, displayName: string) => {
    const created = await createFeature(app, cookie, { key, displayName });
    const body = await created.json() as ServiceResponse<CommercialFeatureDetailResponse>;
    return body.data!.feature;
};

describe("Module Catalog management API", () => {
    beforeEach(() => {
        process.env.NODE_ENV = "test";
    });

    test("rejects unauthenticated and inactive Owner Users", async () => {
        const { app, setOwnerActive } = await createHarness();
        const customerToken = await sign(
            { id: ashaId, exp: Math.floor(Date.now() / 1000) + 3600 },
            "customer-and-device-secret",
        );

        const unauthenticated = await app.request("/platform/catalog/modules");
        const customer = await app.request("/platform/catalog/modules", {
            headers: { authorization: `Bearer ${customerToken}` },
        });
        const cookie = await authCookie(app);
        setOwnerActive(false);
        const inactive = await app.request("/platform/catalog/modules", { headers: { cookie } });

        expect(unauthenticated.status).toBe(401);
        expect(customer.status).toBe(401);
        expect(inactive.status).toBe(401);
        expect((await inactive.json() as { message: string }).message).toBe("Owner session is no longer active");
    });

    test("creates a Draft Module pinned to exact Feature revisions", async () => {
        const { app } = await createHarness();
        const cookie = await authCookie(app);
        const billing = await createdFeature(app, cookie, "billing", "Billing");
        const reports = await createdFeature(app, cookie, "reports", "Reports");

        const created = await createModule(app, cookie, {
            key: "core_operations",
            displayName: "Core Operations",
            description: "Billing and reports",
            featureRevisionIds: [billing.currentRevision.id, reports.currentRevision.id],
            isSeparatelyPurchasable: false,
        });
        const body = await created.json() as ServiceResponse<CommercialModuleDetailResponse>;

        expect(created.status).toBe(201);
        expect(body.data?.module).toMatchObject({
            key: "core_operations",
            currentRevision: {
                status: "draft",
                displayName: "Core Operations",
                description: "Billing and reports",
                isSeparatelyPurchasable: false,
                priceInr: null,
                term: null,
                createdBy: ashaActor,
            },
        });
        expect(body.data?.module.currentRevision.features.map((feature) => feature.key).sort()).toEqual(["billing", "reports"]);
        expect(body.data?.module.referencingPlans).toEqual([]);
    });

    test("lists Modules with search and status filters and keeps a Feature reusable across Modules", async () => {
        const { app } = await createHarness();
        const cookie = await authCookie(app);
        const billing = await createdFeature(app, cookie, "billing", "Billing");
        const kot = await createdFeature(app, cookie, "kot_system", "KOT System");
        await createModule(app, cookie, {
            key: "core_operations",
            displayName: "Core Operations",
            featureRevisionIds: [billing.currentRevision.id],
            isSeparatelyPurchasable: false,
        });
        const restaurant = await createModule(app, cookie, {
            key: "restaurant_operations",
            displayName: "Restaurant Operations",
            featureRevisionIds: [kot.currentRevision.id, billing.currentRevision.id],
            isSeparatelyPurchasable: false,
        });
        const restaurantBody = await restaurant.json() as ServiceResponse<CommercialModuleDetailResponse>;
        await publishModule(app, cookie, restaurantBody.data!.module.id, restaurantBody.data!.module.currentRevision.id);

        const listed = await listModules(app, cookie);
        const listedBody = await listed.json() as ServiceResponse<CommercialModuleListResponse>;
        expect(listedBody.data?.modules.map((moduleItem) => ({
            key: moduleItem.key,
            status: moduleItem.status,
        }))).toEqual([
            { key: "core_operations", status: "draft" },
            { key: "restaurant_operations", status: "active" },
        ]);

        const searched = await listModules(app, cookie, "?search=core");
        expect((await searched.json() as ServiceResponse<CommercialModuleListResponse>).data?.modules.map((item) => item.key)).toEqual(["core_operations"]);

        const drafts = await listModules(app, cookie, "?status=draft");
        expect((await drafts.json() as ServiceResponse<CommercialModuleListResponse>).data?.modules.map((item) => item.key)).toEqual(["core_operations"]);

        const billingDetail = await app.request(`/platform/catalog/features/${billing.id}`, { headers: { cookie } });
        const billingBody = await billingDetail.json() as ServiceResponse<CommercialFeatureDetailResponse>;
        expect(billingBody.data?.feature.referencingModules.map((item) => item.key).sort()).toEqual([
            "core_operations",
            "restaurant_operations",
        ]);
    });

    test("rejects a duplicate Module key, including after discard", async () => {
        const { app } = await createHarness();
        const cookie = await authCookie(app);
        const billing = await createdFeature(app, cookie, "billing", "Billing");
        const created = await createModule(app, cookie, {
            key: "core_operations",
            displayName: "Core Operations",
            featureRevisionIds: [billing.currentRevision.id],
            isSeparatelyPurchasable: false,
        });
        const createdBody = await created.json() as ServiceResponse<CommercialModuleDetailResponse>;

        const duplicate = await createModule(app, cookie, {
            key: "core_operations",
            displayName: "Other Core",
            featureRevisionIds: [billing.currentRevision.id],
            isSeparatelyPurchasable: false,
        });
        expect(duplicate.status).toBe(409);

        await discardModule(app, cookie, createdBody.data!.module.id, createdBody.data!.module.currentRevision.id);
        const reused = await createModule(app, cookie, {
            key: "core_operations",
            displayName: "Core Again",
            featureRevisionIds: [billing.currentRevision.id],
            isSeparatelyPurchasable: false,
        });
        expect(reused.status).toBe(409);
    });

    test("enforces structural Feature membership, price, and term rules without a dependency engine", async () => {
        const { app } = await createHarness();
        const cookie = await authCookie(app);
        const tableManagement = await createdFeature(app, cookie, "table_management", "Table Management");
        const billing = await createdFeature(app, cookie, "billing", "Billing");
        const billingSuccessor = await createdFeature(app, cookie, "units", "Units");

        const empty = await createModule(app, cookie, {
            key: "empty_module",
            displayName: "Empty",
            featureRevisionIds: [],
            isSeparatelyPurchasable: false,
        });
        expect(empty.status).toBe(400);

        const missing = await createModule(app, cookie, {
            key: "missing_feature",
            displayName: "Missing",
            featureRevisionIds: [missingRevisionId],
            isSeparatelyPurchasable: false,
        });
        expect(missing.status).toBe(400);
        expect((await missing.json() as { message: string }).message).toBe("One or more Feature revisions were not found");

        const duplicatedFeature = await createModule(app, cookie, {
            key: "duplicate_feature",
            displayName: "Duplicate Feature",
            featureRevisionIds: [billing.currentRevision.id, billingSuccessor.currentRevision.id, billing.currentRevision.id],
            isSeparatelyPurchasable: false,
        });
        expect(duplicatedFeature.status).toBe(400);

        await publishFeature(app, cookie, billing.id, billing.currentRevision.id);
        const secondBillingRevision = (await (await app.request(
            `/platform/catalog/features/${billing.id}/revisions/${billing.currentRevision.id}/successor`,
            { method: "POST", headers: { cookie } },
        )).json() as ServiceResponse<CommercialFeatureDetailResponse>).data!.feature.currentRevision;

        const sameFeatureTwice = await createModule(app, cookie, {
            key: "same_feature_twice",
            displayName: "Same Feature Twice",
            featureRevisionIds: [billing.currentRevision.id, secondBillingRevision.id],
            isSeparatelyPurchasable: false,
        });
        expect(sameFeatureTwice.status).toBe(409);
        expect((await sameFeatureTwice.json() as { message: string }).message).toBe("A Module can include a Feature only once");

        await discardFeature(app, cookie, billingSuccessor.id, billingSuccessor.currentRevision.id);
        const discardedMember = await createModule(app, cookie, {
            key: "discarded_member",
            displayName: "Discarded Member",
            featureRevisionIds: [billingSuccessor.currentRevision.id],
            isSeparatelyPurchasable: false,
        });
        expect(discardedMember.status).toBe(409);

        const incompleteWorkflow = await createModule(app, cookie, {
            key: "table_only",
            displayName: "Table Only",
            featureRevisionIds: [tableManagement.currentRevision.id],
            isSeparatelyPurchasable: false,
        });
        expect(incompleteWorkflow.status).toBe(201);

        const invalidPrice = await createModule(app, cookie, {
            key: "integrations",
            displayName: "Integrations",
            featureRevisionIds: [billing.currentRevision.id],
            isSeparatelyPurchasable: true,
            priceInr: -10,
            term: { count: 1, unit: "year" },
        });
        expect(invalidPrice.status).toBe(400);

        const purchasable = await createModule(app, cookie, {
            key: "integrations",
            displayName: "Integrations",
            featureRevisionIds: [billing.currentRevision.id],
            isSeparatelyPurchasable: true,
            priceInr: 2999,
            term: { count: 1, unit: "year" },
        });
        const purchasableBody = await purchasable.json() as ServiceResponse<CommercialModuleDetailResponse>;
        expect(purchasable.status).toBe(201);
        expect(purchasableBody.data?.module.currentRevision).toMatchObject({
            isSeparatelyPurchasable: true,
            priceInr: 2999,
            term: { count: 1, unit: "year" },
        });
    });

    test("publishes a successor Module revision, retires the previous Active revision, and keeps memberships pinned", async () => {
        const { app } = await createHarness();
        const cookie = await authCookie(app);
        const billing = await createdFeature(app, cookie, "billing", "Billing");
        await publishFeature(app, cookie, billing.id, billing.currentRevision.id);
        const created = await createModule(app, cookie, {
            key: "core_operations",
            displayName: "Core Operations",
            description: "v1",
            featureRevisionIds: [billing.currentRevision.id],
            isSeparatelyPurchasable: false,
        });
        const createdBody = await created.json() as ServiceResponse<CommercialModuleDetailResponse>;
        const first = createdBody.data!.module.currentRevision;
        await publishModule(app, cookie, createdBody.data!.module.id, first.id);

        const editedActive = await updateModuleDraft(app, cookie, createdBody.data!.module.id, first.id, {
            displayName: "Renamed",
            description: "changed",
            featureRevisionIds: [billing.currentRevision.id],
            isSeparatelyPurchasable: false,
        });
        expect(editedActive.status).toBe(409);
        expect((await editedActive.json() as { message: string }).message).toBe("Active Module revisions are immutable");

        const successorResponse = await successorModule(app, cookie, createdBody.data!.module.id, first.id);
        expect(successorResponse.status).toBe(201);
        const successorBody = await successorResponse.json() as ServiceResponse<CommercialModuleDetailResponse>;
        const draft = successorBody.data!.module.currentRevision;
        expect(draft).toMatchObject({
            revisionNumber: 2,
            status: "draft",
            displayName: "Core Operations",
            description: "v1",
            features: [{ key: "billing", featureRevisionId: billing.currentRevision.id }],
        });

        const updated = await updateModuleDraft(app, cookie, createdBody.data!.module.id, draft.id, {
            displayName: "Core Operations",
            description: "v2",
            featureRevisionIds: [billing.currentRevision.id],
            isSeparatelyPurchasable: true,
            priceInr: 0,
            term: { count: 7, unit: "day" },
        });
        expect(updated.status).toBe(200);

        const published = await publishModule(app, cookie, createdBody.data!.module.id, draft.id);
        const publishedBody = await published.json() as ServiceResponse<CommercialModuleDetailResponse>;
        expect(publishedBody.data?.module.currentRevision).toMatchObject({
            id: draft.id,
            revisionNumber: 2,
            status: "active",
            description: "v2",
            isSeparatelyPurchasable: true,
            priceInr: 0,
            term: { count: 7, unit: "day" },
            publishedBy: ashaActor,
        });
        expect(publishedBody.data?.module.revisions.map((revision) => ({
            revisionNumber: revision.revisionNumber,
            status: revision.status,
        }))).toEqual([
            { revisionNumber: 2, status: "active" },
            { revisionNumber: 1, status: "retired" },
        ]);
    });

    test("retires, discards, and rejects invalid Module lifecycle transitions", async () => {
        const { app } = await createHarness();
        const cookie = await authCookie(app);
        const billing = await createdFeature(app, cookie, "billing", "Billing");
        const created = await createModule(app, cookie, {
            key: "core_operations",
            displayName: "Core Operations",
            featureRevisionIds: [billing.currentRevision.id],
            isSeparatelyPurchasable: false,
        });
        const createdBody = await created.json() as ServiceResponse<CommercialModuleDetailResponse>;
        const draft = createdBody.data!.module.currentRevision;

        expect((await retireModule(app, cookie, createdBody.data!.module.id, draft.id)).status).toBe(409);
        expect((await successorModule(app, cookie, createdBody.data!.module.id, draft.id)).status).toBe(409);

        await publishModule(app, cookie, createdBody.data!.module.id, draft.id);
        const retired = await retireModule(app, cookie, createdBody.data!.module.id, draft.id);
        expect(retired.status).toBe(200);
        expect((await retired.json() as ServiceResponse<CommercialModuleDetailResponse>).data?.module.currentRevision.status).toBe("retired");

        const successorResponse = await successorModule(app, cookie, createdBody.data!.module.id, draft.id);
        expect(successorResponse.status).toBe(201);
        const secondSuccessor = await successorModule(app, cookie, createdBody.data!.module.id, draft.id);
        expect(secondSuccessor.status).toBe(409);

        const payrollFeature = await createdFeature(app, cookie, "payroll", "Payroll");
        const unused = await createModule(app, cookie, {
            key: "payroll_pack",
            displayName: "Payroll Pack",
            featureRevisionIds: [payrollFeature.currentRevision.id],
            isSeparatelyPurchasable: false,
        });
        const unusedBody = await unused.json() as ServiceResponse<CommercialModuleDetailResponse>;
        const discarded = await discardModule(app, cookie, unusedBody.data!.module.id, unusedBody.data!.module.currentRevision.id);
        expect(discarded.status).toBe(200);
        const listed = await listModules(app, cookie);
        expect((await listed.json() as ServiceResponse<CommercialModuleListResponse>).data?.modules.map((item) => item.key)).toEqual(["core_operations"]);
        const discardedList = await listModules(app, cookie, "?status=discarded");
        expect((await discardedList.json() as ServiceResponse<CommercialModuleListResponse>).data?.modules.map((item) => item.key)).toEqual(["payroll_pack"]);
    });

    test("does not expose Organization mutation through the Module Catalog", async () => {
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
