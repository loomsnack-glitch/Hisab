import { beforeEach, describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { sign } from "hono/jwt";
import {
    commercialCatalogCurrentRevisionRank,
    type CommercialCatalogAuditActorDTO,
    type CommercialCatalogRevisionStatus,
    type CommercialFeatureDetailDTO,
    type CommercialFeatureDetailResponse,
    type CommercialFeatureListItemDTO,
    type CommercialFeatureListQuerySVC,
    type CommercialFeatureListResponse,
    type CommercialFeatureRevisionDTO,
    type OwnerUserRecord,
    type ServiceResponse,
} from "@repo/types";

import { createCommercialCatalogService } from "./commercial-catalog.service";
import { createOwnerAuthService, createOwnerTokenProvider } from "./owner-auth.service";
import { createPlatformRoutes } from "./platform.routes";

const ashaId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const raviId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ownerSecret = "owner-secret-that-is-isolated-from-other-auth-channels";
const ashaPassword = "correct horse battery staple";
const timestamp = "2026-09-04T00:00:00.000Z";

const ashaActor: CommercialCatalogAuditActorDTO = {
    id: ashaId,
    firstName: "Asha",
    lastName: "Shah",
};

type StoredFeature = { id: string; key: string };
type StoredRevision = {
    id: string;
    featureId: string;
    revisionNumber: number;
    status: CommercialCatalogRevisionStatus;
    displayName: string;
    description: string;
    createdByOwnerUserId: string;
    createdAt: string;
    publishedByOwnerUserId: string | null;
    publishedAt: string | null;
    retiredByOwnerUserId: string | null;
    retiredAt: string | null;
    discardedByOwnerUserId: string | null;
    discardedAt: string | null;
};

const currentRevisionOf = (revisions: CommercialFeatureRevisionDTO[]): CommercialFeatureRevisionDTO =>
    [...revisions].sort((left, right) => {
        const rank = commercialCatalogCurrentRevisionRank(left.status) - commercialCatalogCurrentRevisionRank(right.status);
        return rank !== 0 ? rank : right.revisionNumber - left.revisionNumber;
    })[0]!;

const listRevisionOf = (
    revisions: CommercialFeatureRevisionDTO[],
    status: CommercialFeatureListQuerySVC["status"],
): CommercialFeatureRevisionDTO | null => {
    const matching = status === "all"
        ? revisions.filter((revision) => revision.status !== "discarded")
        : revisions.filter((revision) => revision.status === status);
    return matching.length > 0 ? currentRevisionOf(matching) : null;
};

const createMemoryCatalog = (owners: OwnerUserRecord[]) => {
    const features: StoredFeature[] = [];
    const revisions: StoredRevision[] = [];
    const actorById = new Map(
        owners.map((owner) => [owner.id, { id: owner.id, firstName: owner.firstName, lastName: owner.lastName }]),
    );

    const actor = (id: string | null): CommercialCatalogAuditActorDTO | null =>
        id ? actorById.get(id) ?? null : null;

    const toRevision = (revision: StoredRevision, key: string): CommercialFeatureRevisionDTO => ({
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

    const detailOf = (featureId: string): CommercialFeatureDetailDTO | null => {
        const feature = features.find((item) => item.id === featureId);
        if (!feature) return null;
        const featureRevisions = revisions
            .filter((revision) => revision.featureId === featureId)
            .sort((left, right) => right.revisionNumber - left.revisionNumber)
            .map((revision) => toRevision(revision, feature.key));
        if (featureRevisions.length === 0) return null;
        return {
            id: feature.id,
            key: feature.key,
            currentRevision: currentRevisionOf(featureRevisions),
            revisions: featureRevisions,
            referencingModules: [],
            affectedPlans: [],
        };
    };

    const findRevision = (featureId: string, revisionId: string) =>
        revisions.find((revision) => revision.id === revisionId && revision.featureId === featureId);

    return {
        listFeatures: async (query: CommercialFeatureListQuerySVC): Promise<CommercialFeatureListItemDTO[]> => {
            const search = query.search?.trim().toLowerCase() ?? "";
            return features
                .flatMap((feature) => {
                    const detail = detailOf(feature.id);
                    if (!detail) return [];
                    const currentRevision = listRevisionOf(detail.revisions, query.status);
                    return currentRevision ? [{ detail, currentRevision }] : [];
                })
                .filter((detail) => {
                    if (!search) return true;
                    return detail.detail.key.includes(search)
                        || detail.currentRevision.displayName.toLowerCase().includes(search);
                })
                .sort((left, right) =>
                    left.currentRevision.displayName.localeCompare(right.currentRevision.displayName)
                    || left.detail.key.localeCompare(right.detail.key)
                    || left.detail.id.localeCompare(right.detail.id)
                )
                .map((detail) => ({
                    id: detail.detail.id,
                    key: detail.detail.key,
                    currentRevisionId: detail.currentRevision.id,
                    revisionNumber: detail.currentRevision.revisionNumber,
                    status: detail.currentRevision.status,
                    displayName: detail.currentRevision.displayName,
                    description: detail.currentRevision.description,
                }));
        },
        getFeatureDetail: async (featureId: string) => detailOf(featureId),
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
            revisions.push({
                id: input.revisionId,
                featureId: input.featureId,
                revisionNumber: 1,
                status: "draft",
                displayName: input.displayName,
                description: input.description,
                createdByOwnerUserId: input.actorId,
                createdAt: input.now.toISOString(),
                publishedByOwnerUserId: null,
                publishedAt: null,
                retiredByOwnerUserId: null,
                retiredAt: null,
                discardedByOwnerUserId: null,
                discardedAt: null,
            });
            return { status: "created" as const, feature: detailOf(input.featureId)! };
        },
        updateDraftRevision: async (input: {
            featureId: string;
            revisionId: string;
            displayName: string;
            description: string;
        }) => {
            const revision = findRevision(input.featureId, input.revisionId);
            if (!revision) return { status: "not-found" as const };
            if (revision.status !== "draft") {
                return { status: "not-draft" as const, currentStatus: revision.status };
            }
            revision.displayName = input.displayName;
            revision.description = input.description;
            return { status: "updated" as const, feature: detailOf(input.featureId)! };
        },
        publishRevision: async (input: { featureId: string; revisionId: string; actorId: string; now: Date }) => {
            const revision = findRevision(input.featureId, input.revisionId);
            if (!revision) return { status: "not-found" as const };
            if (revision.status !== "draft") {
                return { status: "not-draft" as const, currentStatus: revision.status };
            }
            const previousActive = revisions.find((item) => item.featureId === input.featureId && item.status === "active");
            if (previousActive) {
                previousActive.status = "retired";
                previousActive.retiredByOwnerUserId = input.actorId;
                previousActive.retiredAt = input.now.toISOString();
            }
            revision.status = "active";
            revision.publishedByOwnerUserId = input.actorId;
            revision.publishedAt = input.now.toISOString();
            return { status: "published" as const, feature: detailOf(input.featureId)! };
        },
        retireRevision: async (input: { featureId: string; revisionId: string; actorId: string; now: Date }) => {
            const revision = findRevision(input.featureId, input.revisionId);
            if (!revision) return { status: "not-found" as const };
            if (revision.status !== "active") {
                return { status: "not-active" as const, currentStatus: revision.status };
            }
            revision.status = "retired";
            revision.retiredByOwnerUserId = input.actorId;
            revision.retiredAt = input.now.toISOString();
            return { status: "retired" as const, feature: detailOf(input.featureId)! };
        },
        discardRevision: async (input: { featureId: string; revisionId: string; actorId: string; now: Date }) => {
            const revision = findRevision(input.featureId, input.revisionId);
            if (!revision) return { status: "not-found" as const };
            if (revision.status !== "draft") {
                return { status: "not-draft" as const, currentStatus: revision.status };
            }
            revision.status = "discarded";
            revision.discardedByOwnerUserId = input.actorId;
            revision.discardedAt = input.now.toISOString();
            return { status: "discarded" as const, feature: detailOf(input.featureId)! };
        },
        createSuccessorRevision: async (input: {
            featureId: string;
            revisionId: string;
            successorRevisionId: string;
            actorId: string;
            now: Date;
        }) => {
            const source = findRevision(input.featureId, input.revisionId);
            if (!source) return { status: "not-found" as const };
            if (source.status !== "active" && source.status !== "retired") {
                return { status: "invalid-source" as const, currentStatus: source.status };
            }
            if (revisions.some((revision) => revision.featureId === input.featureId && revision.status === "draft")) {
                return { status: "draft-exists" as const };
            }
            const latest = Math.max(
                ...revisions.filter((revision) => revision.featureId === input.featureId).map((revision) => revision.revisionNumber),
            );
            revisions.push({
                id: input.successorRevisionId,
                featureId: input.featureId,
                revisionNumber: latest + 1,
                status: "draft",
                displayName: source.displayName,
                description: source.description,
                createdByOwnerUserId: input.actorId,
                createdAt: input.now.toISOString(),
                publishedByOwnerUserId: null,
                publishedAt: null,
                retiredByOwnerUserId: null,
                retiredAt: null,
                discardedByOwnerUserId: null,
                discardedAt: null,
            });
            return { status: "created" as const, feature: detailOf(input.featureId)! };
        },
        listModules: async () => [],
        getModuleDetail: async () => null,
        createDraftModule: async () => ({ status: "duplicate-key" as const }),
        updateDraftModuleRevision: async () => ({ status: "not-found" as const }),
        publishModuleRevision: async () => ({ status: "not-found" as const }),
        retireModuleRevision: async () => ({ status: "not-found" as const }),
        discardModuleRevision: async () => ({ status: "not-found" as const }),
        createSuccessorModuleRevision: async () => ({ status: "not-found" as const }),
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

const createHarness = async (options: { raviActive?: boolean } = {}) => {
    const ashaHash = await Bun.password.hash(ashaPassword);
    const owners: OwnerUserRecord[] = [
        {
            id: ashaId,
            firstName: "Asha",
            lastName: "Shah",
            phone: "+919876543210",
            passwordHash: ashaHash,
            isActive: true,
            createdAt: timestamp,
            updatedAt: timestamp,
        },
        {
            id: raviId,
            firstName: "Ravi",
            lastName: "Mehta",
            phone: "+919111111111",
            passwordHash: await Bun.password.hash("ravi horse battery staple"),
            isActive: options.raviActive ?? true,
            createdAt: timestamp,
            updatedAt: timestamp,
        },
    ];
    const ids = [
        "11111111-1111-4111-8111-111111111111",
        "22222222-2222-4222-8222-222222222222",
        "33333333-3333-4333-8333-333333333333",
        "44444444-4444-4444-8444-444444444444",
        "55555555-5555-4555-8555-555555555555",
        "66666666-6666-4666-8666-666666666666",
        "77777777-7777-4777-8777-777777777777",
        "88888888-8888-4888-8888-888888888888",
    ];
    let nextId = 0;
    let nowMs = Date.parse(timestamp);

    const authService = createOwnerAuthService({
        repository: {
            getOwnerUserById: async (id) => owners.find((owner) => owner.id === id) ?? null,
            getOwnerUserByPhone: async (phone) => owners.find((owner) => owner.phone === phone) ?? null,
        },
        otpStore: {
            set: async () => {},
            get: async () => null,
            delete: async () => {},
        },
        sendOtp: async () => ({ ok: true }),
        createOtp: () => "482951",
        verifyPassword: Bun.password.verify,
        tokenProvider: createOwnerTokenProvider(ownerSecret),
    });
    const catalogService = createCommercialCatalogService({
        repository: createMemoryCatalog(owners),
        createId: () => ids[nextId++] ?? crypto.randomUUID(),
        now: () => new Date(nowMs),
    });
    const app = new Hono().route("/platform", createPlatformRoutes(authService, undefined, undefined, catalogService));

    return {
        app,
        setOwnerActive: (ownerUserId: string, isActive: boolean) => {
            const owner = owners.find((item) => item.id === ownerUserId);
            if (owner) owner.isActive = isActive;
        },
        advanceTime: () => {
            nowMs += 60_000;
        },
    };
};

const cookieFrom = (response: Response) => response.headers.get("set-cookie")?.split(";")[0] ?? "";

const passwordLogin = (app: Hono) =>
    app.request("/platform/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json", "x-device-id": "browser-1" },
        body: JSON.stringify({ requestType: "user-info", phone: "+919876543210", password: ashaPassword }),
    });

const authCookie = async (app: Hono) => cookieFrom(await passwordLogin(app));

const jsonHeaders = (cookie: string) => ({ "content-type": "application/json", cookie });

const createFeature = (app: Hono, cookie: string, body: { key: string; displayName: string; description?: string }) =>
    app.request("/platform/catalog/features", {
        method: "POST",
        headers: jsonHeaders(cookie),
        body: JSON.stringify(body),
    });

const listFeatures = (app: Hono, cookie: string, query = "") =>
    app.request(`/platform/catalog/features${query}`, { headers: { cookie } });

const getFeature = (app: Hono, cookie: string, featureId: string) =>
    app.request(`/platform/catalog/features/${featureId}`, { headers: { cookie } });

const updateDraft = (
    app: Hono,
    cookie: string,
    featureId: string,
    revisionId: string,
    body: { displayName: string; description: string },
) =>
    app.request(`/platform/catalog/features/${featureId}/revisions/${revisionId}`, {
        method: "PATCH",
        headers: jsonHeaders(cookie),
        body: JSON.stringify(body),
    });

const publish = (app: Hono, cookie: string, featureId: string, revisionId: string) =>
    app.request(`/platform/catalog/features/${featureId}/revisions/${revisionId}/publish`, {
        method: "POST",
        headers: { cookie },
    });

const retire = (app: Hono, cookie: string, featureId: string, revisionId: string) =>
    app.request(`/platform/catalog/features/${featureId}/revisions/${revisionId}/retire`, {
        method: "POST",
        headers: { cookie },
    });

const discard = (app: Hono, cookie: string, featureId: string, revisionId: string) =>
    app.request(`/platform/catalog/features/${featureId}/revisions/${revisionId}/discard`, {
        method: "POST",
        headers: { cookie },
    });

const successor = (app: Hono, cookie: string, featureId: string, revisionId: string) =>
    app.request(`/platform/catalog/features/${featureId}/revisions/${revisionId}/successor`, {
        method: "POST",
        headers: { cookie },
    });

describe("Feature Catalog management API", () => {
    beforeEach(() => {
        process.env.NODE_ENV = "test";
    });

    test("rejects unauthenticated and inactive Owner Users", async () => {
        const { app, setOwnerActive } = await createHarness();
        const customerToken = await sign(
            { id: ashaId, exp: Math.floor(Date.now() / 1000) + 3600 },
            "customer-and-device-secret",
        );

        const unauthenticated = await app.request("/platform/catalog/features");
        const customer = await app.request("/platform/catalog/features", {
            headers: { authorization: `Bearer ${customerToken}` },
        });
        const cookie = await authCookie(app);
        setOwnerActive(ashaId, false);
        const inactive = await app.request("/platform/catalog/features", { headers: { cookie } });

        expect(unauthenticated.status).toBe(401);
        expect(customer.status).toBe(401);
        expect(inactive.status).toBe(401);
        expect((await inactive.json() as { message: string }).message).toBe("Owner session is no longer active");
    });

    test("creates a Draft Feature with an immutable lowercase key, display name, and description", async () => {
        const { app } = await createHarness();
        const cookie = await authCookie(app);

        const created = await createFeature(app, cookie, {
            key: "billing",
            displayName: "Billing",
            description: "POS billing workflow",
        });
        const body = await created.json() as ServiceResponse<CommercialFeatureDetailResponse>;

        expect(created.status).toBe(201);
        expect(body.data?.feature).toMatchObject({
            id: "11111111-1111-4111-8111-111111111111",
            key: "billing",
            currentRevision: {
                id: "22222222-2222-4222-8222-222222222222",
                revisionNumber: 1,
                status: "draft",
                displayName: "Billing",
                description: "POS billing workflow",
                createdBy: ashaActor,
                publishedBy: null,
                retiredBy: null,
                discardedBy: null,
            },
        });
        expect(body.data?.feature.revisions).toHaveLength(1);
    });

    test("lists Features with display name, key, status, and revision and supports search and status filters", async () => {
        const { app } = await createHarness();
        const cookie = await authCookie(app);
        const billing = await createFeature(app, cookie, { key: "billing", displayName: "Billing", description: "POS" });
        await createFeature(app, cookie, { key: "units", displayName: "Units", description: "Measures" });
        const billingBody = await billing.json() as ServiceResponse<CommercialFeatureDetailResponse>;
        const billingFeature = billingBody.data!.feature;
        await publish(app, cookie, billingFeature.id, billingFeature.currentRevision.id);

        const listed = await listFeatures(app, cookie);
        const listedBody = await listed.json() as ServiceResponse<CommercialFeatureListResponse>;
        expect(listed.status).toBe(200);
        expect(listedBody.data?.features.map((feature) => ({
            key: feature.key,
            displayName: feature.displayName,
            status: feature.status,
            revisionNumber: feature.revisionNumber,
        }))).toEqual([
            { key: "billing", displayName: "Billing", status: "active", revisionNumber: 1 },
            { key: "units", displayName: "Units", status: "draft", revisionNumber: 1 },
        ]);

        const searched = await listFeatures(app, cookie, "?search=bill");
        const searchedBody = await searched.json() as ServiceResponse<CommercialFeatureListResponse>;
        expect(searchedBody.data?.features.map((feature) => feature.key)).toEqual(["billing"]);

        const drafts = await listFeatures(app, cookie, "?status=draft");
        const draftsBody = await drafts.json() as ServiceResponse<CommercialFeatureListResponse>;
        expect(draftsBody.data?.features.map((feature) => feature.key)).toEqual(["units"]);
    });

    test("rejects a duplicate Commercial Catalog Key, including after discard", async () => {
        const { app } = await createHarness();
        const cookie = await authCookie(app);
        const created = await createFeature(app, cookie, { key: "billing", displayName: "Billing" });
        const createdBody = await created.json() as ServiceResponse<CommercialFeatureDetailResponse>;
        const feature = createdBody.data!.feature;

        const duplicate = await createFeature(app, cookie, { key: "billing", displayName: "Other Billing" });
        expect(duplicate.status).toBe(409);
        expect((await duplicate.json() as { message: string }).message).toBe(
            "A Feature with that Commercial Catalog Key already exists",
        );

        await discard(app, cookie, feature.id, feature.currentRevision.id);
        const reused = await createFeature(app, cookie, { key: "billing", displayName: "Billing Again" });
        expect(reused.status).toBe(409);
    });

    test("rejects an invalid Commercial Catalog Key before persistence", async () => {
        const { app } = await createHarness();
        const cookie = await authCookie(app);
        const response = await createFeature(app, cookie, { key: "Billing", displayName: "Billing" });
        expect(response.status).toBe(400);
        expect((await response.json() as { message: string }).message).toBe("Validation error");
    });

    test("publishes a Draft, keeps Active revisions immutable, and records audit metadata", async () => {
        const { app } = await createHarness();
        const cookie = await authCookie(app);
        const created = await createFeature(app, cookie, {
            key: "billing",
            displayName: "Billing",
            description: "POS billing workflow",
        });
        const createdBody = await created.json() as ServiceResponse<CommercialFeatureDetailResponse>;
        const feature = createdBody.data!.feature;

        const published = await publish(app, cookie, feature.id, feature.currentRevision.id);
        const publishedBody = await published.json() as ServiceResponse<CommercialFeatureDetailResponse>;
        expect(published.status).toBe(200);
        expect(publishedBody.data?.feature.currentRevision).toMatchObject({
            status: "active",
            revisionNumber: 1,
            createdBy: ashaActor,
            publishedBy: ashaActor,
            publishedAt: timestamp,
            retiredBy: null,
            discardedBy: null,
        });

        const edited = await updateDraft(app, cookie, feature.id, feature.currentRevision.id, {
            displayName: "Renamed Billing",
            description: "Changed",
        });
        expect(edited.status).toBe(409);
        expect((await edited.json() as { message: string }).message).toBe("Active Feature revisions are immutable");

        const discardedActive = await discard(app, cookie, feature.id, feature.currentRevision.id);
        expect(discardedActive.status).toBe(409);
        expect((await discardedActive.json() as { message: string }).message).toBe("Active Feature revisions are immutable");
    });

    test("creates a successor Draft, publishes it, and retires the previous Active revision", async () => {
        const { app } = await createHarness();
        const cookie = await authCookie(app);
        const created = await createFeature(app, cookie, { key: "billing", displayName: "Billing", description: "v1" });
        const createdBody = await created.json() as ServiceResponse<CommercialFeatureDetailResponse>;
        const first = createdBody.data!.feature.currentRevision;
        await publish(app, cookie, createdBody.data!.feature.id, first.id);

        const successorResponse = await successor(app, cookie, createdBody.data!.feature.id, first.id);
        const successorBody = await successorResponse.json() as ServiceResponse<CommercialFeatureDetailResponse>;
        expect(successorResponse.status).toBe(201);
        const draft = successorBody.data!.feature.currentRevision;
        expect(draft).toMatchObject({
            revisionNumber: 2,
            status: "draft",
            displayName: "Billing",
            description: "v1",
            createdBy: ashaActor,
        });

        const activeList = await listFeatures(app, cookie, "?status=active");
        expect((await activeList.json() as ServiceResponse<CommercialFeatureListResponse>).data?.features).toMatchObject([{
            key: "billing",
            revisionNumber: 1,
            status: "active",
        }]);

        const updated = await updateDraft(app, cookie, createdBody.data!.feature.id, draft.id, {
            displayName: "Billing",
            description: "v2",
        });
        expect(updated.status).toBe(200);

        const published = await publish(app, cookie, createdBody.data!.feature.id, draft.id);
        const publishedBody = await published.json() as ServiceResponse<CommercialFeatureDetailResponse>;
        expect(publishedBody.data?.feature.currentRevision).toMatchObject({
            id: draft.id,
            revisionNumber: 2,
            status: "active",
            description: "v2",
            publishedBy: ashaActor,
        });
        expect(publishedBody.data?.feature.revisions.map((revision) => ({
            revisionNumber: revision.revisionNumber,
            status: revision.status,
            description: revision.description,
        }))).toEqual([
            { revisionNumber: 2, status: "active", description: "v2" },
            { revisionNumber: 1, status: "retired", description: "v1" },
        ]);
        expect(publishedBody.data?.feature.revisions[1]).toMatchObject({
            retiredBy: ashaActor,
            publishedBy: ashaActor,
        });
    });

    test("retires an Active Feature and allows a successor from Retired", async () => {
        const { app } = await createHarness();
        const cookie = await authCookie(app);
        const created = await createFeature(app, cookie, { key: "units", displayName: "Units" });
        const createdBody = await created.json() as ServiceResponse<CommercialFeatureDetailResponse>;
        const first = createdBody.data!.feature.currentRevision;
        await publish(app, cookie, createdBody.data!.feature.id, first.id);

        const retired = await retire(app, cookie, createdBody.data!.feature.id, first.id);
        const retiredBody = await retired.json() as ServiceResponse<CommercialFeatureDetailResponse>;
        expect(retired.status).toBe(200);
        expect(retiredBody.data?.feature.currentRevision).toMatchObject({
            status: "retired",
            retiredBy: ashaActor,
        });

        const successorResponse = await successor(app, cookie, createdBody.data!.feature.id, first.id);
        expect(successorResponse.status).toBe(201);
        expect((await successorResponse.json() as ServiceResponse<CommercialFeatureDetailResponse>).data?.feature.currentRevision.status).toBe("draft");
    });

    test("discards an unused Draft so it no longer clutters the Feature list", async () => {
        const { app } = await createHarness();
        const cookie = await authCookie(app);
        const created = await createFeature(app, cookie, { key: "payroll", displayName: "Payroll" });
        const createdBody = await created.json() as ServiceResponse<CommercialFeatureDetailResponse>;
        const feature = createdBody.data!.feature;

        const discarded = await discard(app, cookie, feature.id, feature.currentRevision.id);
        const discardedBody = await discarded.json() as ServiceResponse<CommercialFeatureDetailResponse>;
        expect(discarded.status).toBe(200);
        expect(discardedBody.data?.feature.currentRevision).toMatchObject({
            status: "discarded",
            discardedBy: ashaActor,
        });

        const listed = await listFeatures(app, cookie);
        const listedBody = await listed.json() as ServiceResponse<CommercialFeatureListResponse>;
        expect(listedBody.data?.features).toEqual([]);

        const discardedList = await listFeatures(app, cookie, "?status=discarded");
        const discardedListBody = await discardedList.json() as ServiceResponse<CommercialFeatureListResponse>;
        expect(discardedListBody.data?.features.map((item) => item.key)).toEqual(["payroll"]);
    });

    test("rejects invalid lifecycle transitions and a second Draft", async () => {
        const { app } = await createHarness();
        const cookie = await authCookie(app);
        const created = await createFeature(app, cookie, { key: "reports", displayName: "Reports" });
        const createdBody = await created.json() as ServiceResponse<CommercialFeatureDetailResponse>;
        const draft = createdBody.data!.feature.currentRevision;

        const retiredDraft = await retire(app, cookie, createdBody.data!.feature.id, draft.id);
        expect(retiredDraft.status).toBe(409);
        expect((await retiredDraft.json() as { message: string }).message).toBe("Only Active revisions can be retired");

        const successorFromDraft = await successor(app, cookie, createdBody.data!.feature.id, draft.id);
        expect(successorFromDraft.status).toBe(409);
        expect((await successorFromDraft.json() as { message: string }).message).toBe(
            "A successor can only be created from an Active or Retired revision",
        );

        await publish(app, cookie, createdBody.data!.feature.id, draft.id);
        const firstSuccessor = await successor(app, cookie, createdBody.data!.feature.id, draft.id);
        expect(firstSuccessor.status).toBe(201);
        const secondSuccessor = await successor(app, cookie, createdBody.data!.feature.id, draft.id);
        expect(secondSuccessor.status).toBe(409);
        expect((await secondSuccessor.json() as { message: string }).message).toBe(
            "A Draft revision already exists for this Feature",
        );
    });

    test("does not expose Organization mutation through the Feature Catalog", async () => {
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
