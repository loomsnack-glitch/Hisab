import { sql } from "bun";
import {
    commercialCatalogCurrentRevisionRank,
    type CommercialCatalogAuditActorDTO,
    type CommercialCatalogReferenceDTO,
    type CommercialCatalogRevisionStatus,
    type CommercialCatalogTerm,
    type CommercialCatalogTermUnit,
    type CommercialFeatureDetailDTO,
    type CommercialFeatureListItemDTO,
    type CommercialFeatureListQuerySVC,
    type CommercialFeatureRevisionDTO,
    type CommercialModuleDetailDTO,
    type CommercialModuleFeatureMembershipDTO,
    type CommercialModuleListItemDTO,
    type CommercialModuleListQuerySVC,
    type CommercialModuleRevisionDTO,
    type CommercialPlanDetailDTO,
    type CommercialPlanListItemDTO,
    type CommercialPlanListQuerySVC,
    type CommercialPlanModuleMembershipDTO,
    type CommercialPlanRevisionDTO,
    type CommercialPlanType,
} from "@repo/types";
import { pg } from "@/config/db";

type SqlClient = typeof pg | Bun.TransactionSQL;

const isUniqueViolation = (error: unknown) =>
    typeof error === "object" && error !== null && "code" in error && error.code === "23505";

type RevisionRow = {
    id: string;
    feature_id: string;
    key: string;
    revision_number: number;
    status: CommercialCatalogRevisionStatus;
    display_name: string;
    description: string;
    created_at: string | Date;
    published_at: string | Date | null;
    retired_at: string | Date | null;
    discarded_at: string | Date | null;
    created_by_id: string;
    created_first_name: string;
    created_last_name: string;
    published_by_id: string | null;
    published_first_name: string | null;
    published_last_name: string | null;
    retired_by_id: string | null;
    retired_first_name: string | null;
    retired_last_name: string | null;
    discarded_by_id: string | null;
    discarded_first_name: string | null;
    discarded_last_name: string | null;
};

const actorFrom = (
    id: string | null,
    firstName: string | null,
    lastName: string | null,
): CommercialCatalogAuditActorDTO | null => {
    if (!id || !firstName || !lastName) {
        return null;
    }
    return { id, firstName, lastName };
};

const toRevision = (row: RevisionRow): CommercialFeatureRevisionDTO => ({
    id: row.id,
    featureId: row.feature_id,
    key: row.key,
    revisionNumber: Number(row.revision_number),
    status: row.status,
    displayName: row.display_name,
    description: row.description,
    createdBy: actorFrom(row.created_by_id, row.created_first_name, row.created_last_name) as CommercialCatalogAuditActorDTO,
    createdAt: row.created_at,
    publishedBy: actorFrom(row.published_by_id, row.published_first_name, row.published_last_name),
    publishedAt: row.published_at,
    retiredBy: actorFrom(row.retired_by_id, row.retired_first_name, row.retired_last_name),
    retiredAt: row.retired_at,
    discardedBy: actorFrom(row.discarded_by_id, row.discarded_first_name, row.discarded_last_name),
    discardedAt: row.discarded_at,
});

const currentRevisionOf = (revisions: CommercialFeatureRevisionDTO[]): CommercialFeatureRevisionDTO =>
    [...revisions].sort((left, right) => {
        const rank = commercialCatalogCurrentRevisionRank(left.status) - commercialCatalogCurrentRevisionRank(right.status);
        return rank !== 0 ? rank : right.revisionNumber - left.revisionNumber;
    })[0]!;

const revisionSelect = sql`
    SELECT
        r.id,
        r.feature_id,
        f.key,
        r.revision_number,
        r.status,
        r.display_name,
        r.description,
        r.created_at,
        r.published_at,
        r.retired_at,
        r.discarded_at,
        created.id AS created_by_id,
        created.first_name AS created_first_name,
        created.last_name AS created_last_name,
        published.id AS published_by_id,
        published.first_name AS published_first_name,
        published.last_name AS published_last_name,
        retired.id AS retired_by_id,
        retired.first_name AS retired_first_name,
        retired.last_name AS retired_last_name,
        discarded.id AS discarded_by_id,
        discarded.first_name AS discarded_first_name,
        discarded.last_name AS discarded_last_name
    FROM commercial_feature_revisions r
    INNER JOIN commercial_features f ON f.id = r.feature_id
    INNER JOIN console_users created ON created.id = r.created_by_owner_user_id
    LEFT JOIN console_users published ON published.id = r.published_by_owner_user_id
    LEFT JOIN console_users retired ON retired.id = r.retired_by_owner_user_id
    LEFT JOIN console_users discarded ON discarded.id = r.discarded_by_owner_user_id
`;

const loadFeatureDetail = async (tx: SqlClient, featureId: string): Promise<CommercialFeatureDetailDTO | null> => {
    const [feature] = await tx`
        SELECT id, key
        FROM commercial_features
        WHERE id = ${featureId}
    ` as Array<{ id: string; key: string }>;
    if (!feature) {
        return null;
    }

    const rows = await tx`
        ${revisionSelect}
        WHERE r.feature_id = ${featureId}
        ORDER BY r.revision_number DESC
    ` as RevisionRow[];
    if (rows.length === 0) {
        return null;
    }

    const revisions = rows.map(toRevision);
    return {
        id: feature.id,
        key: feature.key,
        currentRevision: currentRevisionOf(revisions),
        revisions,
        referencingModules: await loadReferencingModules(tx, featureId),
    };
};

const toCatalogReference = (row: {
    id: string;
    key: string;
    revision_id: string;
    revision_number: number;
    status: CommercialCatalogRevisionStatus;
    display_name: string;
}): CommercialCatalogReferenceDTO => ({
    id: row.id,
    key: row.key,
    revisionId: row.revision_id,
    revisionNumber: Number(row.revision_number),
    status: row.status,
    displayName: row.display_name,
});

const loadReferencingModules = async (tx: SqlClient, featureId: string): Promise<CommercialCatalogReferenceDTO[]> => {
    const rows = await tx`
        WITH current_revisions AS (
            SELECT
                r.id,
                r.module_id,
                m.key,
                r.revision_number,
                r.status,
                r.display_name,
                ROW_NUMBER() OVER (
                    PARTITION BY r.module_id
                    ORDER BY
                        CASE r.status
                            WHEN 'draft' THEN 0
                            WHEN 'active' THEN 1
                            WHEN 'retired' THEN 2
                            WHEN 'discarded' THEN 3
                        END ASC,
                        r.revision_number DESC
                ) AS revision_rank
            FROM commercial_module_revisions r
            INNER JOIN commercial_modules m ON m.id = r.module_id
        )
        SELECT
            current_revisions.module_id AS id,
            current_revisions.key,
            current_revisions.id AS revision_id,
            current_revisions.revision_number,
            current_revisions.status,
            current_revisions.display_name
        FROM current_revisions
        INNER JOIN commercial_module_revision_features memberships
            ON memberships.module_revision_id = current_revisions.id
        INNER JOIN commercial_feature_revisions feature_revisions
            ON feature_revisions.id = memberships.feature_revision_id
        WHERE current_revisions.revision_rank = 1
            AND current_revisions.status <> 'discarded'
            AND feature_revisions.feature_id = ${featureId}
        ORDER BY current_revisions.display_name ASC, current_revisions.key ASC, current_revisions.module_id ASC
    ` as Array<{
        id: string;
        key: string;
        revision_id: string;
        revision_number: number;
        status: CommercialCatalogRevisionStatus;
        display_name: string;
    }>;

    return rows.map(toCatalogReference);
};

const loadReferencingPlans = async (tx: SqlClient, moduleId: string): Promise<CommercialCatalogReferenceDTO[]> => {
    const rows = await tx`
        WITH current_revisions AS (
            SELECT
                r.id,
                r.plan_id,
                p.key,
                r.revision_number,
                r.status,
                r.display_name,
                ROW_NUMBER() OVER (
                    PARTITION BY r.plan_id
                    ORDER BY
                        CASE r.status
                            WHEN 'draft' THEN 0
                            WHEN 'active' THEN 1
                            WHEN 'retired' THEN 2
                            WHEN 'discarded' THEN 3
                        END ASC,
                        r.revision_number DESC
                ) AS revision_rank
            FROM commercial_plan_revisions r
            INNER JOIN commercial_plans p ON p.id = r.plan_id
        )
        SELECT
            current_revisions.plan_id AS id,
            current_revisions.key,
            current_revisions.id AS revision_id,
            current_revisions.revision_number,
            current_revisions.status,
            current_revisions.display_name
        FROM current_revisions
        INNER JOIN commercial_plan_revision_modules memberships
            ON memberships.plan_revision_id = current_revisions.id
        INNER JOIN commercial_module_revisions module_revisions
            ON module_revisions.id = memberships.module_revision_id
        WHERE current_revisions.revision_rank = 1
            AND current_revisions.status <> 'discarded'
            AND module_revisions.module_id = ${moduleId}
        ORDER BY current_revisions.display_name ASC, current_revisions.key ASC, current_revisions.plan_id ASC
    ` as Array<{
        id: string;
        key: string;
        revision_id: string;
        revision_number: number;
        status: CommercialCatalogRevisionStatus;
        display_name: string;
    }>;

    return rows.map(toCatalogReference);
};

export const listFeatures = async (
    query: CommercialFeatureListQuerySVC,
): Promise<CommercialFeatureListItemDTO[]> => {
    const search = query.search?.trim() ?? "";
    const searchPattern = search ? `%${search}%` : "";
    const searchClause = search
        ? sql`AND (
            current_revisions.key ILIKE ${searchPattern}
            OR current_revisions.display_name ILIKE ${searchPattern}
        )`
        : sql``;
    const statusClause = query.status === "all"
        ? sql`AND current_revisions.status <> 'discarded'`
        : sql`AND current_revisions.status = ${query.status}`;

    const rows = await pg`
        WITH current_revisions AS (
            SELECT
                r.id,
                r.feature_id,
                f.key,
                r.revision_number,
                r.status,
                r.display_name,
                r.description,
                ROW_NUMBER() OVER (
                    PARTITION BY r.feature_id
                    ORDER BY
                        CASE r.status
                            WHEN 'draft' THEN 0
                            WHEN 'active' THEN 1
                            WHEN 'retired' THEN 2
                            WHEN 'discarded' THEN 3
                        END ASC,
                        r.revision_number DESC
                ) AS revision_rank
            FROM commercial_feature_revisions r
            INNER JOIN commercial_features f ON f.id = r.feature_id
        )
        SELECT
            current_revisions.feature_id AS id,
            current_revisions.key,
            current_revisions.id AS current_revision_id,
            current_revisions.revision_number,
            current_revisions.status,
            current_revisions.display_name,
            current_revisions.description
        FROM current_revisions
        WHERE current_revisions.revision_rank = 1
            ${statusClause}
            ${searchClause}
        ORDER BY current_revisions.display_name ASC, current_revisions.key ASC, current_revisions.feature_id ASC
    ` as Array<{
        id: string;
        key: string;
        current_revision_id: string;
        revision_number: number;
        status: CommercialCatalogRevisionStatus;
        display_name: string;
        description: string;
    }>;

    return rows.map((row) => ({
        id: row.id,
        key: row.key,
        currentRevisionId: row.current_revision_id,
        revisionNumber: Number(row.revision_number),
        status: row.status,
        displayName: row.display_name,
        description: row.description,
    }));
};

export const getFeatureDetail = async (featureId: string): Promise<CommercialFeatureDetailDTO | null> =>
    loadFeatureDetail(pg, featureId);

export type CreateDraftFeatureInput = {
    featureId: string;
    revisionId: string;
    key: string;
    displayName: string;
    description: string;
    actorId: string;
    now: Date;
};

export type CreateDraftFeatureResult =
    | { status: "created"; feature: CommercialFeatureDetailDTO }
    | { status: "duplicate-key" };

export const createDraftFeature = async (input: CreateDraftFeatureInput): Promise<CreateDraftFeatureResult> => {
    try {
        return await pg.begin(async (tx) => {
            const [existing] = await tx`
                SELECT id
                FROM commercial_features
                WHERE key = ${input.key}
            `;
            if (existing) {
                return { status: "duplicate-key" as const };
            }

            await tx`
                INSERT INTO commercial_features (id, key, created_at)
                VALUES (${input.featureId}, ${input.key}, ${input.now})
            `;
            await tx`
                INSERT INTO commercial_feature_revisions (
                    id,
                    feature_id,
                    revision_number,
                    status,
                    display_name,
                    description,
                    created_by_owner_user_id,
                    created_at
                )
                VALUES (
                    ${input.revisionId},
                    ${input.featureId},
                    1,
                    'draft',
                    ${input.displayName},
                    ${input.description},
                    ${input.actorId},
                    ${input.now}
                )
            `;

            const feature = await loadFeatureDetail(tx, input.featureId);
            if (!feature) {
                throw new Error("Draft Feature was not persisted");
            }
            return { status: "created" as const, feature };
        });
    } catch (error) {
        if (isUniqueViolation(error)) {
            return { status: "duplicate-key" };
        }
        throw error;
    }
};

export type UpdateDraftRevisionInput = {
    featureId: string;
    revisionId: string;
    displayName: string;
    description: string;
};

export type UpdateDraftRevisionResult =
    | { status: "updated"; feature: CommercialFeatureDetailDTO }
    | { status: "not-found" }
    | { status: "not-draft"; currentStatus: CommercialCatalogRevisionStatus };

export const updateDraftRevision = async (input: UpdateDraftRevisionInput): Promise<UpdateDraftRevisionResult> =>
    pg.begin(async (tx) => {
        const [revision] = await tx`
            SELECT id, status
            FROM commercial_feature_revisions
            WHERE id = ${input.revisionId} AND feature_id = ${input.featureId}
            FOR UPDATE
        ` as Array<{ id: string; status: CommercialCatalogRevisionStatus }>;
        if (!revision) {
            return { status: "not-found" as const };
        }
        if (revision.status !== "draft") {
            return { status: "not-draft" as const, currentStatus: revision.status };
        }

        await tx`
            UPDATE commercial_feature_revisions
            SET display_name = ${input.displayName}, description = ${input.description}
            WHERE id = ${input.revisionId}
        `;

        const feature = await loadFeatureDetail(tx, input.featureId);
        if (!feature) {
            return { status: "not-found" as const };
        }
        return { status: "updated" as const, feature };
    });

export type PublishRevisionInput = {
    featureId: string;
    revisionId: string;
    actorId: string;
    now: Date;
};

export type PublishRevisionResult =
    | { status: "published"; feature: CommercialFeatureDetailDTO }
    | { status: "not-found" }
    | { status: "not-draft"; currentStatus: CommercialCatalogRevisionStatus };

export const publishRevision = async (input: PublishRevisionInput): Promise<PublishRevisionResult> =>
    pg.begin(async (tx) => {
        const [revision] = await tx`
            SELECT id, status
            FROM commercial_feature_revisions
            WHERE id = ${input.revisionId} AND feature_id = ${input.featureId}
            FOR UPDATE
        ` as Array<{ id: string; status: CommercialCatalogRevisionStatus }>;
        if (!revision) {
            return { status: "not-found" as const };
        }
        if (revision.status !== "draft") {
            return { status: "not-draft" as const, currentStatus: revision.status };
        }

        await tx`
            UPDATE commercial_feature_revisions
            SET
                status = 'retired',
                retired_by_owner_user_id = ${input.actorId},
                retired_at = ${input.now}
            WHERE feature_id = ${input.featureId}
                AND status = 'active'
        `;
        await tx`
            UPDATE commercial_feature_revisions
            SET
                status = 'active',
                published_by_owner_user_id = ${input.actorId},
                published_at = ${input.now}
            WHERE id = ${input.revisionId}
        `;

        const feature = await loadFeatureDetail(tx, input.featureId);
        if (!feature) {
            return { status: "not-found" as const };
        }
        return { status: "published" as const, feature };
    });

export type RetireRevisionInput = PublishRevisionInput;

export type RetireRevisionResult =
    | { status: "retired"; feature: CommercialFeatureDetailDTO }
    | { status: "not-found" }
    | { status: "not-active"; currentStatus: CommercialCatalogRevisionStatus };

export const retireRevision = async (input: RetireRevisionInput): Promise<RetireRevisionResult> =>
    pg.begin(async (tx) => {
        const [revision] = await tx`
            SELECT id, status
            FROM commercial_feature_revisions
            WHERE id = ${input.revisionId} AND feature_id = ${input.featureId}
            FOR UPDATE
        ` as Array<{ id: string; status: CommercialCatalogRevisionStatus }>;
        if (!revision) {
            return { status: "not-found" as const };
        }
        if (revision.status !== "active") {
            return { status: "not-active" as const, currentStatus: revision.status };
        }

        await tx`
            UPDATE commercial_feature_revisions
            SET
                status = 'retired',
                retired_by_owner_user_id = ${input.actorId},
                retired_at = ${input.now}
            WHERE id = ${input.revisionId}
        `;

        const feature = await loadFeatureDetail(tx, input.featureId);
        if (!feature) {
            return { status: "not-found" as const };
        }
        return { status: "retired" as const, feature };
    });

export type DiscardRevisionResult =
    | { status: "discarded"; feature: CommercialFeatureDetailDTO }
    | { status: "not-found" }
    | { status: "not-draft"; currentStatus: CommercialCatalogRevisionStatus };

export const discardRevision = async (input: PublishRevisionInput): Promise<DiscardRevisionResult> =>
    pg.begin(async (tx) => {
        const [revision] = await tx`
            SELECT id, status
            FROM commercial_feature_revisions
            WHERE id = ${input.revisionId} AND feature_id = ${input.featureId}
            FOR UPDATE
        ` as Array<{ id: string; status: CommercialCatalogRevisionStatus }>;
        if (!revision) {
            return { status: "not-found" as const };
        }
        if (revision.status !== "draft") {
            return { status: "not-draft" as const, currentStatus: revision.status };
        }

        await tx`
            UPDATE commercial_feature_revisions
            SET
                status = 'discarded',
                discarded_by_owner_user_id = ${input.actorId},
                discarded_at = ${input.now}
            WHERE id = ${input.revisionId}
        `;

        const feature = await loadFeatureDetail(tx, input.featureId);
        if (!feature) {
            return { status: "not-found" as const };
        }
        return { status: "discarded" as const, feature };
    });

export type CreateSuccessorInput = PublishRevisionInput & {
    successorRevisionId: string;
};

export type CreateSuccessorResult =
    | { status: "created"; feature: CommercialFeatureDetailDTO }
    | { status: "not-found" }
    | { status: "draft-exists" }
    | { status: "invalid-source"; currentStatus: CommercialCatalogRevisionStatus };

export const createSuccessorRevision = async (input: CreateSuccessorInput): Promise<CreateSuccessorResult> =>
    pg.begin(async (tx) => {
        const [source] = await tx`
            SELECT id, status, display_name, description, revision_number
            FROM commercial_feature_revisions
            WHERE id = ${input.revisionId} AND feature_id = ${input.featureId}
            FOR UPDATE
        ` as Array<{
            id: string;
            status: CommercialCatalogRevisionStatus;
            display_name: string;
            description: string;
            revision_number: number;
        }>;
        if (!source) {
            return { status: "not-found" as const };
        }
        if (source.status !== "active" && source.status !== "retired") {
            return { status: "invalid-source" as const, currentStatus: source.status };
        }

        const [existingDraft] = await tx`
            SELECT id
            FROM commercial_feature_revisions
            WHERE feature_id = ${input.featureId} AND status = 'draft'
            FOR UPDATE
        `;
        if (existingDraft) {
            return { status: "draft-exists" as const };
        }

        const [latest] = await tx`
            SELECT MAX(revision_number)::int AS latest_revision
            FROM commercial_feature_revisions
            WHERE feature_id = ${input.featureId}
        ` as Array<{ latest_revision: number }>;

        await tx`
            INSERT INTO commercial_feature_revisions (
                id,
                feature_id,
                revision_number,
                status,
                display_name,
                description,
                created_by_owner_user_id,
                created_at
            )
            VALUES (
                ${input.successorRevisionId},
                ${input.featureId},
                ${(latest?.latest_revision ?? source.revision_number) + 1},
                'draft',
                ${source.display_name},
                ${source.description},
                ${input.actorId},
                ${input.now}
            )
        `;

        const feature = await loadFeatureDetail(tx, input.featureId);
        if (!feature) {
            return { status: "not-found" as const };
        }
        return { status: "created" as const, feature };
    });

type ModuleRevisionRow = {
    id: string;
    module_id: string;
    key: string;
    revision_number: number;
    status: CommercialCatalogRevisionStatus;
    display_name: string;
    description: string;
    is_separately_purchasable: boolean;
    price_inr: string | number | null;
    term_count: number | null;
    term_unit: CommercialCatalogTermUnit | null;
    created_at: string | Date;
    published_at: string | Date | null;
    retired_at: string | Date | null;
    discarded_at: string | Date | null;
    created_by_id: string;
    created_first_name: string;
    created_last_name: string;
    published_by_id: string | null;
    published_first_name: string | null;
    published_last_name: string | null;
    retired_by_id: string | null;
    retired_first_name: string | null;
    retired_last_name: string | null;
    discarded_by_id: string | null;
    discarded_first_name: string | null;
    discarded_last_name: string | null;
};

type FeatureRevisionRef = {
    id: string;
    feature_id: string;
    key: string;
    display_name: string;
    revision_number: number;
    status: CommercialCatalogRevisionStatus;
};

type MembershipValidation =
    | { status: "ok"; refs: FeatureRevisionRef[] }
    | { status: "empty" }
    | { status: "not-found" }
    | { status: "discarded" }
    | { status: "duplicate-feature" };

export type InvalidMembershipReason = Exclude<MembershipValidation["status"], "ok">;

const currentModuleRevisionOf = (revisions: CommercialModuleRevisionDTO[]): CommercialModuleRevisionDTO =>
    [...revisions].sort((left, right) => {
        const rank = commercialCatalogCurrentRevisionRank(left.status) - commercialCatalogCurrentRevisionRank(right.status);
        return rank !== 0 ? rank : right.revisionNumber - left.revisionNumber;
    })[0]!;

const toTerm = (count: number | null, unit: CommercialCatalogTermUnit | null): CommercialCatalogTerm | null => {
    if (count == null || !unit) {
        return null;
    }
    return { count: Number(count), unit };
};

const toModuleMembership = (row: FeatureRevisionRef): CommercialModuleFeatureMembershipDTO => ({
    featureId: row.feature_id,
    featureRevisionId: row.id,
    key: row.key,
    displayName: row.display_name,
    revisionNumber: Number(row.revision_number),
    status: row.status,
});

const toModuleRevision = (
    row: ModuleRevisionRow,
    features: CommercialModuleFeatureMembershipDTO[],
): CommercialModuleRevisionDTO => ({
    id: row.id,
    moduleId: row.module_id,
    key: row.key,
    revisionNumber: Number(row.revision_number),
    status: row.status,
    displayName: row.display_name,
    description: row.description,
    isSeparatelyPurchasable: Boolean(row.is_separately_purchasable),
    priceInr: row.price_inr == null ? null : Number(row.price_inr),
    term: toTerm(row.term_count, row.term_unit),
    features,
    createdBy: actorFrom(row.created_by_id, row.created_first_name, row.created_last_name) as CommercialCatalogAuditActorDTO,
    createdAt: row.created_at,
    publishedBy: actorFrom(row.published_by_id, row.published_first_name, row.published_last_name),
    publishedAt: row.published_at,
    retiredBy: actorFrom(row.retired_by_id, row.retired_first_name, row.retired_last_name),
    retiredAt: row.retired_at,
    discardedBy: actorFrom(row.discarded_by_id, row.discarded_first_name, row.discarded_last_name),
    discardedAt: row.discarded_at,
});

const moduleRevisionSelect = sql`
    SELECT
        r.id,
        r.module_id,
        m.key,
        r.revision_number,
        r.status,
        r.display_name,
        r.description,
        r.is_separately_purchasable,
        r.price_inr,
        r.term_count,
        r.term_unit,
        r.created_at,
        r.published_at,
        r.retired_at,
        r.discarded_at,
        created.id AS created_by_id,
        created.first_name AS created_first_name,
        created.last_name AS created_last_name,
        published.id AS published_by_id,
        published.first_name AS published_first_name,
        published.last_name AS published_last_name,
        retired.id AS retired_by_id,
        retired.first_name AS retired_first_name,
        retired.last_name AS retired_last_name,
        discarded.id AS discarded_by_id,
        discarded.first_name AS discarded_first_name,
        discarded.last_name AS discarded_last_name
    FROM commercial_module_revisions r
    INNER JOIN commercial_modules m ON m.id = r.module_id
    INNER JOIN console_users created ON created.id = r.created_by_owner_user_id
    LEFT JOIN console_users published ON published.id = r.published_by_owner_user_id
    LEFT JOIN console_users retired ON retired.id = r.retired_by_owner_user_id
    LEFT JOIN console_users discarded ON discarded.id = r.discarded_by_owner_user_id
`;

const loadFeatureRevisionRefs = async (tx: SqlClient, ids: string[]): Promise<FeatureRevisionRef[]> => {
    if (ids.length === 0) {
        return [];
    }
    return await tx`
        SELECT
            r.id,
            r.feature_id,
            f.key,
            r.display_name,
            r.revision_number,
            r.status
        FROM commercial_feature_revisions r
        INNER JOIN commercial_features f ON f.id = r.feature_id
        WHERE r.id IN ${sql(ids)}
    ` as FeatureRevisionRef[];
};

const validateFeatureMemberships = (ids: string[], refs: FeatureRevisionRef[]): MembershipValidation => {
    if (ids.length === 0) {
        return { status: "empty" };
    }
    const byId = new Map(refs.map((ref) => [ref.id, ref]));
    if (ids.some((id) => !byId.has(id))) {
        return { status: "not-found" };
    }
    const ordered = ids.map((id) => byId.get(id)!);
    if (ordered.some((ref) => ref.status === "discarded")) {
        return { status: "discarded" };
    }
    const featureIds = ordered.map((ref) => ref.feature_id);
    if (new Set(featureIds).size !== featureIds.length) {
        return { status: "duplicate-feature" };
    }
    return { status: "ok", refs: ordered };
};

const replaceModuleMemberships = async (tx: SqlClient, moduleRevisionId: string, refs: FeatureRevisionRef[]) => {
    await tx`DELETE FROM commercial_module_revision_features WHERE module_revision_id = ${moduleRevisionId}`;
    for (const ref of refs) {
        await tx`
            INSERT INTO commercial_module_revision_features (module_revision_id, feature_revision_id, feature_id)
            VALUES (${moduleRevisionId}, ${ref.id}, ${ref.feature_id})
        `;
    }
};

const loadModuleMemberships = async (
    tx: SqlClient,
    revisionIds: string[],
): Promise<Map<string, CommercialModuleFeatureMembershipDTO[]>> => {
    const memberships = new Map<string, CommercialModuleFeatureMembershipDTO[]>();
    for (const revisionId of revisionIds) {
        memberships.set(revisionId, []);
    }
    if (revisionIds.length === 0) {
        return memberships;
    }
    const rows = await tx`
        SELECT
            memberships.module_revision_id,
            feature_revisions.id,
            feature_revisions.feature_id,
            features.key,
            feature_revisions.display_name,
            feature_revisions.revision_number,
            feature_revisions.status
        FROM commercial_module_revision_features memberships
        INNER JOIN commercial_feature_revisions feature_revisions
            ON feature_revisions.id = memberships.feature_revision_id
        INNER JOIN commercial_features features ON features.id = feature_revisions.feature_id
        WHERE memberships.module_revision_id IN ${sql(revisionIds)}
        ORDER BY feature_revisions.display_name ASC, features.key ASC, feature_revisions.id ASC
    ` as Array<FeatureRevisionRef & { module_revision_id: string }>;

    for (const row of rows) {
        memberships.get(row.module_revision_id)?.push(toModuleMembership(row));
    }
    return memberships;
};

const loadModuleDetail = async (tx: SqlClient, moduleId: string): Promise<CommercialModuleDetailDTO | null> => {
    const [moduleRow] = await tx`
        SELECT id, key
        FROM commercial_modules
        WHERE id = ${moduleId}
    ` as Array<{ id: string; key: string }>;
    if (!moduleRow) {
        return null;
    }

    const rows = await tx`
        ${moduleRevisionSelect}
        WHERE r.module_id = ${moduleId}
        ORDER BY r.revision_number DESC
    ` as ModuleRevisionRow[];
    if (rows.length === 0) {
        return null;
    }

    const memberships = await loadModuleMemberships(tx, rows.map((row) => row.id));
    const revisions = rows.map((row) => toModuleRevision(row, memberships.get(row.id) ?? []));
    return {
        id: moduleRow.id,
        key: moduleRow.key,
        currentRevision: currentModuleRevisionOf(revisions),
        revisions,
        referencingPlans: await loadReferencingPlans(tx, moduleId),
    };
};

export const listModules = async (
    query: CommercialModuleListQuerySVC,
): Promise<CommercialModuleListItemDTO[]> => {
    const search = query.search?.trim() ?? "";
    const searchPattern = search ? `%${search}%` : "";
    const searchClause = search
        ? sql`AND (
            current_revisions.key ILIKE ${searchPattern}
            OR current_revisions.display_name ILIKE ${searchPattern}
        )`
        : sql``;
    const statusClause = query.status === "all"
        ? sql`AND current_revisions.status <> 'discarded'`
        : sql`AND current_revisions.status = ${query.status}`;

    const rows = await pg`
        WITH current_revisions AS (
            SELECT
                r.id,
                r.module_id,
                m.key,
                r.revision_number,
                r.status,
                r.display_name,
                r.description,
                r.is_separately_purchasable,
                r.price_inr,
                r.term_count,
                r.term_unit,
                ROW_NUMBER() OVER (
                    PARTITION BY r.module_id
                    ORDER BY
                        CASE r.status
                            WHEN 'draft' THEN 0
                            WHEN 'active' THEN 1
                            WHEN 'retired' THEN 2
                            WHEN 'discarded' THEN 3
                        END ASC,
                        r.revision_number DESC
                ) AS revision_rank
            FROM commercial_module_revisions r
            INNER JOIN commercial_modules m ON m.id = r.module_id
        )
        SELECT
            current_revisions.module_id AS id,
            current_revisions.key,
            current_revisions.id AS current_revision_id,
            current_revisions.revision_number,
            current_revisions.status,
            current_revisions.display_name,
            current_revisions.description,
            current_revisions.is_separately_purchasable,
            current_revisions.price_inr,
            current_revisions.term_count,
            current_revisions.term_unit
        FROM current_revisions
        WHERE current_revisions.revision_rank = 1
            ${statusClause}
            ${searchClause}
        ORDER BY current_revisions.display_name ASC, current_revisions.key ASC, current_revisions.module_id ASC
    ` as Array<{
        id: string;
        key: string;
        current_revision_id: string;
        revision_number: number;
        status: CommercialCatalogRevisionStatus;
        display_name: string;
        description: string;
        is_separately_purchasable: boolean;
        price_inr: string | number | null;
        term_count: number | null;
        term_unit: CommercialCatalogTermUnit | null;
    }>;

    return rows.map((row) => ({
        id: row.id,
        key: row.key,
        currentRevisionId: row.current_revision_id,
        revisionNumber: Number(row.revision_number),
        status: row.status,
        displayName: row.display_name,
        description: row.description,
        isSeparatelyPurchasable: Boolean(row.is_separately_purchasable),
        priceInr: row.price_inr == null ? null : Number(row.price_inr),
        term: toTerm(row.term_count, row.term_unit),
    }));
};

export const getModuleDetail = async (moduleId: string): Promise<CommercialModuleDetailDTO | null> =>
    loadModuleDetail(pg, moduleId);

export type CreateDraftModuleInput = {
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
};

export type CreateDraftModuleResult =
    | { status: "created"; module: CommercialModuleDetailDTO }
    | { status: "duplicate-key" }
    | { status: "invalid-membership"; reason: InvalidMembershipReason };

const commercialColumns = (input: {
    isSeparatelyPurchasable: boolean;
    priceInr: number | null;
    term: CommercialCatalogTerm | null;
}) => ({
    isSeparatelyPurchasable: input.isSeparatelyPurchasable,
    priceInr: input.isSeparatelyPurchasable ? input.priceInr : null,
    termCount: input.isSeparatelyPurchasable ? input.term?.count ?? null : null,
    termUnit: input.isSeparatelyPurchasable ? input.term?.unit ?? null : null,
});

export const createDraftModule = async (input: CreateDraftModuleInput): Promise<CreateDraftModuleResult> => {
    try {
        return await pg.begin(async (tx) => {
            const memberships = validateFeatureMemberships(
                input.featureRevisionIds,
                await loadFeatureRevisionRefs(tx, input.featureRevisionIds),
            );
            if (memberships.status !== "ok") {
                return { status: "invalid-membership" as const, reason: memberships.status };
            }

            const [existing] = await tx`
                SELECT id
                FROM commercial_modules
                WHERE key = ${input.key}
            `;
            if (existing) {
                return { status: "duplicate-key" as const };
            }

            const commercial = commercialColumns(input);
            await tx`
                INSERT INTO commercial_modules (id, key, created_at)
                VALUES (${input.moduleId}, ${input.key}, ${input.now})
            `;
            await tx`
                INSERT INTO commercial_module_revisions (
                    id,
                    module_id,
                    revision_number,
                    status,
                    display_name,
                    description,
                    is_separately_purchasable,
                    price_inr,
                    term_count,
                    term_unit,
                    created_by_owner_user_id,
                    created_at
                )
                VALUES (
                    ${input.revisionId},
                    ${input.moduleId},
                    1,
                    'draft',
                    ${input.displayName},
                    ${input.description},
                    ${commercial.isSeparatelyPurchasable},
                    ${commercial.priceInr},
                    ${commercial.termCount},
                    ${commercial.termUnit},
                    ${input.actorId},
                    ${input.now}
                )
            `;
            await replaceModuleMemberships(tx, input.revisionId, memberships.refs);

            const moduleDetail = await loadModuleDetail(tx, input.moduleId);
            if (!moduleDetail) {
                throw new Error("Draft Module was not persisted");
            }
            return { status: "created" as const, module: moduleDetail };
        });
    } catch (error) {
        if (isUniqueViolation(error)) {
            return { status: "duplicate-key" };
        }
        throw error;
    }
};

export type UpdateDraftModuleInput = {
    moduleId: string;
    revisionId: string;
    displayName: string;
    description: string;
    isSeparatelyPurchasable: boolean;
    priceInr: number | null;
    term: CommercialCatalogTerm | null;
    featureRevisionIds: string[];
};

export type UpdateDraftModuleResult =
    | { status: "updated"; module: CommercialModuleDetailDTO }
    | { status: "not-found" }
    | { status: "not-draft"; currentStatus: CommercialCatalogRevisionStatus }
    | { status: "invalid-membership"; reason: InvalidMembershipReason };

export const updateDraftModuleRevision = async (input: UpdateDraftModuleInput): Promise<UpdateDraftModuleResult> =>
    pg.begin(async (tx) => {
        const [revision] = await tx`
            SELECT id, status
            FROM commercial_module_revisions
            WHERE id = ${input.revisionId} AND module_id = ${input.moduleId}
            FOR UPDATE
        ` as Array<{ id: string; status: CommercialCatalogRevisionStatus }>;
        if (!revision) {
            return { status: "not-found" as const };
        }
        if (revision.status !== "draft") {
            return { status: "not-draft" as const, currentStatus: revision.status };
        }

        const memberships = validateFeatureMemberships(
            input.featureRevisionIds,
            await loadFeatureRevisionRefs(tx, input.featureRevisionIds),
        );
        if (memberships.status !== "ok") {
            return { status: "invalid-membership" as const, reason: memberships.status };
        }

        const commercial = commercialColumns(input);
        await tx`
            UPDATE commercial_module_revisions
            SET
                display_name = ${input.displayName},
                description = ${input.description},
                is_separately_purchasable = ${commercial.isSeparatelyPurchasable},
                price_inr = ${commercial.priceInr},
                term_count = ${commercial.termCount},
                term_unit = ${commercial.termUnit}
            WHERE id = ${input.revisionId}
        `;
        await replaceModuleMemberships(tx, input.revisionId, memberships.refs);

        const moduleDetail = await loadModuleDetail(tx, input.moduleId);
        if (!moduleDetail) {
            return { status: "not-found" as const };
        }
        return { status: "updated" as const, module: moduleDetail };
    });

export type PublishModuleInput = {
    moduleId: string;
    revisionId: string;
    actorId: string;
    now: Date;
};

export type PublishModuleResult =
    | { status: "published"; module: CommercialModuleDetailDTO }
    | { status: "not-found" }
    | { status: "not-draft"; currentStatus: CommercialCatalogRevisionStatus }
    | { status: "invalid-membership"; reason: InvalidMembershipReason };

const membershipsOfRevision = async (tx: SqlClient, revisionId: string): Promise<MembershipValidation> => {
    const rows = await tx`
        SELECT feature_revision_id
        FROM commercial_module_revision_features
        WHERE module_revision_id = ${revisionId}
    ` as Array<{ feature_revision_id: string }>;
    const ids = rows.map((row) => row.feature_revision_id);
    return validateFeatureMemberships(ids, await loadFeatureRevisionRefs(tx, ids));
};

export const publishModuleRevision = async (input: PublishModuleInput): Promise<PublishModuleResult> =>
    pg.begin(async (tx) => {
        const [revision] = await tx`
            SELECT id, status
            FROM commercial_module_revisions
            WHERE id = ${input.revisionId} AND module_id = ${input.moduleId}
            FOR UPDATE
        ` as Array<{ id: string; status: CommercialCatalogRevisionStatus }>;
        if (!revision) {
            return { status: "not-found" as const };
        }
        if (revision.status !== "draft") {
            return { status: "not-draft" as const, currentStatus: revision.status };
        }

        const memberships = await membershipsOfRevision(tx, input.revisionId);
        if (memberships.status !== "ok") {
            return { status: "invalid-membership" as const, reason: memberships.status };
        }

        await tx`
            UPDATE commercial_module_revisions
            SET
                status = 'retired',
                retired_by_owner_user_id = ${input.actorId},
                retired_at = ${input.now}
            WHERE module_id = ${input.moduleId}
                AND status = 'active'
        `;
        await tx`
            UPDATE commercial_module_revisions
            SET
                status = 'active',
                published_by_owner_user_id = ${input.actorId},
                published_at = ${input.now}
            WHERE id = ${input.revisionId}
        `;

        const moduleDetail = await loadModuleDetail(tx, input.moduleId);
        if (!moduleDetail) {
            return { status: "not-found" as const };
        }
        return { status: "published" as const, module: moduleDetail };
    });

export type RetireModuleResult =
    | { status: "retired"; module: CommercialModuleDetailDTO }
    | { status: "not-found" }
    | { status: "not-active"; currentStatus: CommercialCatalogRevisionStatus };

export const retireModuleRevision = async (input: PublishModuleInput): Promise<RetireModuleResult> =>
    pg.begin(async (tx) => {
        const [revision] = await tx`
            SELECT id, status
            FROM commercial_module_revisions
            WHERE id = ${input.revisionId} AND module_id = ${input.moduleId}
            FOR UPDATE
        ` as Array<{ id: string; status: CommercialCatalogRevisionStatus }>;
        if (!revision) {
            return { status: "not-found" as const };
        }
        if (revision.status !== "active") {
            return { status: "not-active" as const, currentStatus: revision.status };
        }

        await tx`
            UPDATE commercial_module_revisions
            SET
                status = 'retired',
                retired_by_owner_user_id = ${input.actorId},
                retired_at = ${input.now}
            WHERE id = ${input.revisionId}
        `;

        const moduleDetail = await loadModuleDetail(tx, input.moduleId);
        if (!moduleDetail) {
            return { status: "not-found" as const };
        }
        return { status: "retired" as const, module: moduleDetail };
    });

export type DiscardModuleResult =
    | { status: "discarded"; module: CommercialModuleDetailDTO }
    | { status: "not-found" }
    | { status: "not-draft"; currentStatus: CommercialCatalogRevisionStatus };

export const discardModuleRevision = async (input: PublishModuleInput): Promise<DiscardModuleResult> =>
    pg.begin(async (tx) => {
        const [revision] = await tx`
            SELECT id, status
            FROM commercial_module_revisions
            WHERE id = ${input.revisionId} AND module_id = ${input.moduleId}
            FOR UPDATE
        ` as Array<{ id: string; status: CommercialCatalogRevisionStatus }>;
        if (!revision) {
            return { status: "not-found" as const };
        }
        if (revision.status !== "draft") {
            return { status: "not-draft" as const, currentStatus: revision.status };
        }

        await tx`
            UPDATE commercial_module_revisions
            SET
                status = 'discarded',
                discarded_by_owner_user_id = ${input.actorId},
                discarded_at = ${input.now}
            WHERE id = ${input.revisionId}
        `;

        const moduleDetail = await loadModuleDetail(tx, input.moduleId);
        if (!moduleDetail) {
            return { status: "not-found" as const };
        }
        return { status: "discarded" as const, module: moduleDetail };
    });

export type CreateSuccessorModuleInput = PublishModuleInput & {
    successorRevisionId: string;
};

export type CreateSuccessorModuleResult =
    | { status: "created"; module: CommercialModuleDetailDTO }
    | { status: "not-found" }
    | { status: "draft-exists" }
    | { status: "invalid-source"; currentStatus: CommercialCatalogRevisionStatus };

export const createSuccessorModuleRevision = async (
    input: CreateSuccessorModuleInput,
): Promise<CreateSuccessorModuleResult> =>
    pg.begin(async (tx) => {
        const [source] = await tx`
            SELECT
                id,
                status,
                display_name,
                description,
                is_separately_purchasable,
                price_inr,
                term_count,
                term_unit,
                revision_number
            FROM commercial_module_revisions
            WHERE id = ${input.revisionId} AND module_id = ${input.moduleId}
            FOR UPDATE
        ` as Array<{
            id: string;
            status: CommercialCatalogRevisionStatus;
            display_name: string;
            description: string;
            is_separately_purchasable: boolean;
            price_inr: string | number | null;
            term_count: number | null;
            term_unit: CommercialCatalogTermUnit | null;
            revision_number: number;
        }>;
        if (!source) {
            return { status: "not-found" as const };
        }
        if (source.status !== "active" && source.status !== "retired") {
            return { status: "invalid-source" as const, currentStatus: source.status };
        }

        const [existingDraft] = await tx`
            SELECT id
            FROM commercial_module_revisions
            WHERE module_id = ${input.moduleId} AND status = 'draft'
            FOR UPDATE
        `;
        if (existingDraft) {
            return { status: "draft-exists" as const };
        }

        const [latest] = await tx`
            SELECT MAX(revision_number)::int AS latest_revision
            FROM commercial_module_revisions
            WHERE module_id = ${input.moduleId}
        ` as Array<{ latest_revision: number }>;

        await tx`
            INSERT INTO commercial_module_revisions (
                id,
                module_id,
                revision_number,
                status,
                display_name,
                description,
                is_separately_purchasable,
                price_inr,
                term_count,
                term_unit,
                created_by_owner_user_id,
                created_at
            )
            VALUES (
                ${input.successorRevisionId},
                ${input.moduleId},
                ${(latest?.latest_revision ?? source.revision_number) + 1},
                'draft',
                ${source.display_name},
                ${source.description},
                ${source.is_separately_purchasable},
                ${source.price_inr},
                ${source.term_count},
                ${source.term_unit},
                ${input.actorId},
                ${input.now}
            )
        `;
        await tx`
            INSERT INTO commercial_module_revision_features (module_revision_id, feature_revision_id, feature_id)
            SELECT ${input.successorRevisionId}, feature_revision_id, feature_id
            FROM commercial_module_revision_features
            WHERE module_revision_id = ${input.revisionId}
        `;

        const moduleDetail = await loadModuleDetail(tx, input.moduleId);
        if (!moduleDetail) {
            return { status: "not-found" as const };
        }
        return { status: "created" as const, module: moduleDetail };
    });

type PlanRevisionRow = {
    id: string;
    plan_id: string;
    key: string;
    revision_number: number;
    status: CommercialCatalogRevisionStatus;
    display_name: string;
    description: string;
    plan_type: CommercialPlanType;
    price_inr: string | number;
    term_count: number;
    term_unit: CommercialCatalogTermUnit;
    created_at: string | Date;
    published_at: string | Date | null;
    retired_at: string | Date | null;
    discarded_at: string | Date | null;
    created_by_id: string;
    created_first_name: string;
    created_last_name: string;
    published_by_id: string | null;
    published_first_name: string | null;
    published_last_name: string | null;
    retired_by_id: string | null;
    retired_first_name: string | null;
    retired_last_name: string | null;
    discarded_by_id: string | null;
    discarded_first_name: string | null;
    discarded_last_name: string | null;
};

type ModuleRevisionRef = {
    id: string;
    module_id: string;
    key: string;
    display_name: string;
    revision_number: number;
    status: CommercialCatalogRevisionStatus;
};

type PlanMembershipValidation =
    | { status: "ok"; refs: ModuleRevisionRef[] }
    | { status: "empty" }
    | { status: "not-found" }
    | { status: "discarded" }
    | { status: "duplicate-module" };

export type InvalidPlanMembershipReason = Exclude<PlanMembershipValidation["status"], "ok">;

const currentPlanRevisionOf = (revisions: CommercialPlanRevisionDTO[]): CommercialPlanRevisionDTO =>
    [...revisions].sort((left, right) => {
        const rank = commercialCatalogCurrentRevisionRank(left.status) - commercialCatalogCurrentRevisionRank(right.status);
        return rank !== 0 ? rank : right.revisionNumber - left.revisionNumber;
    })[0]!;

const resolveFeatures = (modules: CommercialPlanModuleMembershipDTO[]): CommercialModuleFeatureMembershipDTO[] => {
    const seen = new Set<string>();
    const resolved: CommercialModuleFeatureMembershipDTO[] = [];
    for (const moduleItem of modules) {
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

const toPlanRevision = (
    row: PlanRevisionRow,
    modules: CommercialPlanModuleMembershipDTO[],
): CommercialPlanRevisionDTO => ({
    id: row.id,
    planId: row.plan_id,
    key: row.key,
    revisionNumber: Number(row.revision_number),
    status: row.status,
    displayName: row.display_name,
    description: row.description,
    planType: row.plan_type,
    priceInr: Number(row.price_inr),
    term: toTerm(row.term_count, row.term_unit) as CommercialCatalogTerm,
    modules,
    resolvedFeatures: resolveFeatures(modules),
    createdBy: actorFrom(row.created_by_id, row.created_first_name, row.created_last_name) as CommercialCatalogAuditActorDTO,
    createdAt: row.created_at,
    publishedBy: actorFrom(row.published_by_id, row.published_first_name, row.published_last_name),
    publishedAt: row.published_at,
    retiredBy: actorFrom(row.retired_by_id, row.retired_first_name, row.retired_last_name),
    retiredAt: row.retired_at,
    discardedBy: actorFrom(row.discarded_by_id, row.discarded_first_name, row.discarded_last_name),
    discardedAt: row.discarded_at,
});

const planRevisionSelect = sql`
    SELECT
        r.id,
        r.plan_id,
        p.key,
        r.revision_number,
        r.status,
        r.display_name,
        r.description,
        r.plan_type,
        r.price_inr,
        r.term_count,
        r.term_unit,
        r.created_at,
        r.published_at,
        r.retired_at,
        r.discarded_at,
        created.id AS created_by_id,
        created.first_name AS created_first_name,
        created.last_name AS created_last_name,
        published.id AS published_by_id,
        published.first_name AS published_first_name,
        published.last_name AS published_last_name,
        retired.id AS retired_by_id,
        retired.first_name AS retired_first_name,
        retired.last_name AS retired_last_name,
        discarded.id AS discarded_by_id,
        discarded.first_name AS discarded_first_name,
        discarded.last_name AS discarded_last_name
    FROM commercial_plan_revisions r
    INNER JOIN commercial_plans p ON p.id = r.plan_id
    INNER JOIN console_users created ON created.id = r.created_by_owner_user_id
    LEFT JOIN console_users published ON published.id = r.published_by_owner_user_id
    LEFT JOIN console_users retired ON retired.id = r.retired_by_owner_user_id
    LEFT JOIN console_users discarded ON discarded.id = r.discarded_by_owner_user_id
`;

const loadModuleRevisionRefs = async (tx: SqlClient, ids: string[]): Promise<ModuleRevisionRef[]> => {
    if (ids.length === 0) {
        return [];
    }
    return await tx`
        SELECT
            r.id,
            r.module_id,
            m.key,
            r.display_name,
            r.revision_number,
            r.status
        FROM commercial_module_revisions r
        INNER JOIN commercial_modules m ON m.id = r.module_id
        WHERE r.id IN ${sql(ids)}
    ` as ModuleRevisionRef[];
};

const validatePlanMemberships = (ids: string[], refs: ModuleRevisionRef[]): PlanMembershipValidation => {
    if (ids.length === 0) {
        return { status: "empty" };
    }
    const byId = new Map(refs.map((ref) => [ref.id, ref]));
    if (ids.some((id) => !byId.has(id))) {
        return { status: "not-found" };
    }
    const ordered = ids.map((id) => byId.get(id)!);
    if (ordered.some((ref) => ref.status === "discarded")) {
        return { status: "discarded" };
    }
    const moduleIds = ordered.map((ref) => ref.module_id);
    if (new Set(moduleIds).size !== moduleIds.length) {
        return { status: "duplicate-module" };
    }
    return { status: "ok", refs: ordered };
};

const replacePlanMemberships = async (tx: SqlClient, planRevisionId: string, refs: ModuleRevisionRef[]) => {
    await tx`DELETE FROM commercial_plan_revision_modules WHERE plan_revision_id = ${planRevisionId}`;
    for (const ref of refs) {
        await tx`
            INSERT INTO commercial_plan_revision_modules (plan_revision_id, module_revision_id, module_id)
            VALUES (${planRevisionId}, ${ref.id}, ${ref.module_id})
        `;
    }
};

const loadPlanMemberships = async (
    tx: SqlClient,
    revisionIds: string[],
): Promise<Map<string, CommercialPlanModuleMembershipDTO[]>> => {
    const memberships = new Map<string, CommercialPlanModuleMembershipDTO[]>();
    for (const revisionId of revisionIds) {
        memberships.set(revisionId, []);
    }
    if (revisionIds.length === 0) {
        return memberships;
    }
    const rows = await tx`
        SELECT
            memberships.plan_revision_id,
            module_revisions.id,
            module_revisions.module_id,
            modules.key,
            module_revisions.display_name,
            module_revisions.revision_number,
            module_revisions.status
        FROM commercial_plan_revision_modules memberships
        INNER JOIN commercial_module_revisions module_revisions
            ON module_revisions.id = memberships.module_revision_id
        INNER JOIN commercial_modules modules ON modules.id = module_revisions.module_id
        WHERE memberships.plan_revision_id IN ${sql(revisionIds)}
        ORDER BY module_revisions.display_name ASC, modules.key ASC, module_revisions.id ASC
    ` as Array<ModuleRevisionRef & { plan_revision_id: string }>;

    const moduleRevisionIds = rows.map((row) => row.id);
    const featureMemberships = await loadModuleMemberships(tx, moduleRevisionIds);
    for (const row of rows) {
        memberships.get(row.plan_revision_id)?.push({
            moduleId: row.module_id,
            moduleRevisionId: row.id,
            key: row.key,
            displayName: row.display_name,
            revisionNumber: Number(row.revision_number),
            status: row.status,
            features: featureMemberships.get(row.id) ?? [],
        });
    }
    return memberships;
};

const loadPlanDetail = async (tx: SqlClient, planId: string): Promise<CommercialPlanDetailDTO | null> => {
    const [planRow] = await tx`
        SELECT id, key
        FROM commercial_plans
        WHERE id = ${planId}
    ` as Array<{ id: string; key: string }>;
    if (!planRow) {
        return null;
    }

    const rows = await tx`
        ${planRevisionSelect}
        WHERE r.plan_id = ${planId}
        ORDER BY r.revision_number DESC
    ` as PlanRevisionRow[];
    if (rows.length === 0) {
        return null;
    }

    const memberships = await loadPlanMemberships(tx, rows.map((row) => row.id));
    const revisions = rows.map((row) => toPlanRevision(row, memberships.get(row.id) ?? []));
    return {
        id: planRow.id,
        key: planRow.key,
        currentRevision: currentPlanRevisionOf(revisions),
        revisions,
    };
};

export const listPlans = async (
    query: CommercialPlanListQuerySVC,
): Promise<CommercialPlanListItemDTO[]> => {
    const search = query.search?.trim() ?? "";
    const searchPattern = search ? `%${search}%` : "";
    const searchClause = search
        ? sql`AND (
            current_revisions.key ILIKE ${searchPattern}
            OR current_revisions.display_name ILIKE ${searchPattern}
        )`
        : sql``;
    const statusClause = query.status === "all"
        ? sql`AND current_revisions.status <> 'discarded'`
        : sql`AND current_revisions.status = ${query.status}`;

    const rows = await pg`
        WITH current_revisions AS (
            SELECT
                r.id,
                r.plan_id,
                p.key,
                r.revision_number,
                r.status,
                r.display_name,
                r.description,
                r.plan_type,
                r.price_inr,
                r.term_count,
                r.term_unit,
                ROW_NUMBER() OVER (
                    PARTITION BY r.plan_id
                    ORDER BY
                        CASE r.status
                            WHEN 'draft' THEN 0
                            WHEN 'active' THEN 1
                            WHEN 'retired' THEN 2
                            WHEN 'discarded' THEN 3
                        END ASC,
                        r.revision_number DESC
                ) AS revision_rank
            FROM commercial_plan_revisions r
            INNER JOIN commercial_plans p ON p.id = r.plan_id
        )
        SELECT
            current_revisions.plan_id AS id,
            current_revisions.key,
            current_revisions.id AS current_revision_id,
            current_revisions.revision_number,
            current_revisions.status,
            current_revisions.display_name,
            current_revisions.description,
            current_revisions.plan_type,
            current_revisions.price_inr,
            current_revisions.term_count,
            current_revisions.term_unit
        FROM current_revisions
        WHERE current_revisions.revision_rank = 1
            ${statusClause}
            ${searchClause}
        ORDER BY current_revisions.display_name ASC, current_revisions.key ASC, current_revisions.plan_id ASC
    ` as Array<{
        id: string;
        key: string;
        current_revision_id: string;
        revision_number: number;
        status: CommercialCatalogRevisionStatus;
        display_name: string;
        description: string;
        plan_type: CommercialPlanType;
        price_inr: string | number;
        term_count: number;
        term_unit: CommercialCatalogTermUnit;
    }>;

    return rows.map((row) => ({
        id: row.id,
        key: row.key,
        currentRevisionId: row.current_revision_id,
        revisionNumber: Number(row.revision_number),
        status: row.status,
        displayName: row.display_name,
        description: row.description,
        planType: row.plan_type,
        priceInr: Number(row.price_inr),
        term: toTerm(row.term_count, row.term_unit) as CommercialCatalogTerm,
    }));
};

export const getPlanDetail = async (planId: string): Promise<CommercialPlanDetailDTO | null> =>
    loadPlanDetail(pg, planId);

export type CreateDraftPlanInput = {
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
};

export type CreateDraftPlanResult =
    | { status: "created"; plan: CommercialPlanDetailDTO }
    | { status: "duplicate-key" }
    | { status: "invalid-membership"; reason: InvalidPlanMembershipReason };

export const createDraftPlan = async (input: CreateDraftPlanInput): Promise<CreateDraftPlanResult> => {
    try {
        return await pg.begin(async (tx) => {
            const memberships = validatePlanMemberships(
                input.moduleRevisionIds,
                await loadModuleRevisionRefs(tx, input.moduleRevisionIds),
            );
            if (memberships.status !== "ok") {
                return { status: "invalid-membership" as const, reason: memberships.status };
            }

            const [existing] = await tx`
                SELECT id
                FROM commercial_plans
                WHERE key = ${input.key}
            `;
            if (existing) {
                return { status: "duplicate-key" as const };
            }

            await tx`
                INSERT INTO commercial_plans (id, key, created_at)
                VALUES (${input.planId}, ${input.key}, ${input.now})
            `;
            await tx`
                INSERT INTO commercial_plan_revisions (
                    id,
                    plan_id,
                    revision_number,
                    status,
                    display_name,
                    description,
                    plan_type,
                    price_inr,
                    term_count,
                    term_unit,
                    created_by_owner_user_id,
                    created_at
                )
                VALUES (
                    ${input.revisionId},
                    ${input.planId},
                    1,
                    'draft',
                    ${input.displayName},
                    ${input.description},
                    ${input.planType},
                    ${input.priceInr},
                    ${input.term.count},
                    ${input.term.unit},
                    ${input.actorId},
                    ${input.now}
                )
            `;
            await replacePlanMemberships(tx, input.revisionId, memberships.refs);

            const planDetail = await loadPlanDetail(tx, input.planId);
            if (!planDetail) {
                throw new Error("Draft Plan was not persisted");
            }
            return { status: "created" as const, plan: planDetail };
        });
    } catch (error) {
        if (isUniqueViolation(error)) {
            return { status: "duplicate-key" };
        }
        throw error;
    }
};

export type UpdateDraftPlanInput = {
    planId: string;
    revisionId: string;
    displayName: string;
    description: string;
    planType: CommercialPlanType;
    priceInr: number;
    term: CommercialCatalogTerm;
    moduleRevisionIds: string[];
};

export type UpdateDraftPlanResult =
    | { status: "updated"; plan: CommercialPlanDetailDTO }
    | { status: "not-found" }
    | { status: "not-draft"; currentStatus: CommercialCatalogRevisionStatus }
    | { status: "invalid-membership"; reason: InvalidPlanMembershipReason };

export const updateDraftPlanRevision = async (input: UpdateDraftPlanInput): Promise<UpdateDraftPlanResult> =>
    pg.begin(async (tx) => {
        const [revision] = await tx`
            SELECT id, status
            FROM commercial_plan_revisions
            WHERE id = ${input.revisionId} AND plan_id = ${input.planId}
            FOR UPDATE
        ` as Array<{ id: string; status: CommercialCatalogRevisionStatus }>;
        if (!revision) {
            return { status: "not-found" as const };
        }
        if (revision.status !== "draft") {
            return { status: "not-draft" as const, currentStatus: revision.status };
        }

        const memberships = validatePlanMemberships(
            input.moduleRevisionIds,
            await loadModuleRevisionRefs(tx, input.moduleRevisionIds),
        );
        if (memberships.status !== "ok") {
            return { status: "invalid-membership" as const, reason: memberships.status };
        }

        await tx`
            UPDATE commercial_plan_revisions
            SET
                display_name = ${input.displayName},
                description = ${input.description},
                plan_type = ${input.planType},
                price_inr = ${input.priceInr},
                term_count = ${input.term.count},
                term_unit = ${input.term.unit}
            WHERE id = ${input.revisionId}
        `;
        await replacePlanMemberships(tx, input.revisionId, memberships.refs);

        const planDetail = await loadPlanDetail(tx, input.planId);
        if (!planDetail) {
            return { status: "not-found" as const };
        }
        return { status: "updated" as const, plan: planDetail };
    });

export type PublishPlanInput = {
    planId: string;
    revisionId: string;
    actorId: string;
    now: Date;
};

export type PublishPlanResult =
    | { status: "published"; plan: CommercialPlanDetailDTO }
    | { status: "not-found" }
    | { status: "not-draft"; currentStatus: CommercialCatalogRevisionStatus }
    | { status: "invalid-membership"; reason: InvalidPlanMembershipReason };

const planMembershipsOfRevision = async (tx: SqlClient, revisionId: string): Promise<PlanMembershipValidation> => {
    const rows = await tx`
        SELECT module_revision_id
        FROM commercial_plan_revision_modules
        WHERE plan_revision_id = ${revisionId}
    ` as Array<{ module_revision_id: string }>;
    const ids = rows.map((row) => row.module_revision_id);
    return validatePlanMemberships(ids, await loadModuleRevisionRefs(tx, ids));
};

export const publishPlanRevision = async (input: PublishPlanInput): Promise<PublishPlanResult> =>
    pg.begin(async (tx) => {
        const [revision] = await tx`
            SELECT id, status
            FROM commercial_plan_revisions
            WHERE id = ${input.revisionId} AND plan_id = ${input.planId}
            FOR UPDATE
        ` as Array<{ id: string; status: CommercialCatalogRevisionStatus }>;
        if (!revision) {
            return { status: "not-found" as const };
        }
        if (revision.status !== "draft") {
            return { status: "not-draft" as const, currentStatus: revision.status };
        }

        const memberships = await planMembershipsOfRevision(tx, input.revisionId);
        if (memberships.status !== "ok") {
            return { status: "invalid-membership" as const, reason: memberships.status };
        }

        await tx`
            UPDATE commercial_plan_revisions
            SET
                status = 'retired',
                retired_by_owner_user_id = ${input.actorId},
                retired_at = ${input.now}
            WHERE plan_id = ${input.planId}
                AND status = 'active'
        `;
        await tx`
            UPDATE commercial_plan_revisions
            SET
                status = 'active',
                published_by_owner_user_id = ${input.actorId},
                published_at = ${input.now}
            WHERE id = ${input.revisionId}
        `;

        const planDetail = await loadPlanDetail(tx, input.planId);
        if (!planDetail) {
            return { status: "not-found" as const };
        }
        return { status: "published" as const, plan: planDetail };
    });

export type RetirePlanResult =
    | { status: "retired"; plan: CommercialPlanDetailDTO }
    | { status: "not-found" }
    | { status: "not-active"; currentStatus: CommercialCatalogRevisionStatus };

export const retirePlanRevision = async (input: PublishPlanInput): Promise<RetirePlanResult> =>
    pg.begin(async (tx) => {
        const [revision] = await tx`
            SELECT id, status
            FROM commercial_plan_revisions
            WHERE id = ${input.revisionId} AND plan_id = ${input.planId}
            FOR UPDATE
        ` as Array<{ id: string; status: CommercialCatalogRevisionStatus }>;
        if (!revision) {
            return { status: "not-found" as const };
        }
        if (revision.status !== "active") {
            return { status: "not-active" as const, currentStatus: revision.status };
        }

        await tx`
            UPDATE commercial_plan_revisions
            SET
                status = 'retired',
                retired_by_owner_user_id = ${input.actorId},
                retired_at = ${input.now}
            WHERE id = ${input.revisionId}
        `;

        const planDetail = await loadPlanDetail(tx, input.planId);
        if (!planDetail) {
            return { status: "not-found" as const };
        }
        return { status: "retired" as const, plan: planDetail };
    });

export type DiscardPlanResult =
    | { status: "discarded"; plan: CommercialPlanDetailDTO }
    | { status: "not-found" }
    | { status: "not-draft"; currentStatus: CommercialCatalogRevisionStatus };

export const discardPlanRevision = async (input: PublishPlanInput): Promise<DiscardPlanResult> =>
    pg.begin(async (tx) => {
        const [revision] = await tx`
            SELECT id, status
            FROM commercial_plan_revisions
            WHERE id = ${input.revisionId} AND plan_id = ${input.planId}
            FOR UPDATE
        ` as Array<{ id: string; status: CommercialCatalogRevisionStatus }>;
        if (!revision) {
            return { status: "not-found" as const };
        }
        if (revision.status !== "draft") {
            return { status: "not-draft" as const, currentStatus: revision.status };
        }

        await tx`
            UPDATE commercial_plan_revisions
            SET
                status = 'discarded',
                discarded_by_owner_user_id = ${input.actorId},
                discarded_at = ${input.now}
            WHERE id = ${input.revisionId}
        `;

        const planDetail = await loadPlanDetail(tx, input.planId);
        if (!planDetail) {
            return { status: "not-found" as const };
        }
        return { status: "discarded" as const, plan: planDetail };
    });

export type CreateSuccessorPlanInput = PublishPlanInput & {
    successorRevisionId: string;
};

export type CreateSuccessorPlanResult =
    | { status: "created"; plan: CommercialPlanDetailDTO }
    | { status: "not-found" }
    | { status: "draft-exists" }
    | { status: "invalid-source"; currentStatus: CommercialCatalogRevisionStatus };

export const createSuccessorPlanRevision = async (
    input: CreateSuccessorPlanInput,
): Promise<CreateSuccessorPlanResult> =>
    pg.begin(async (tx) => {
        const [source] = await tx`
            SELECT
                id,
                status,
                display_name,
                description,
                plan_type,
                price_inr,
                term_count,
                term_unit,
                revision_number
            FROM commercial_plan_revisions
            WHERE id = ${input.revisionId} AND plan_id = ${input.planId}
            FOR UPDATE
        ` as Array<{
            id: string;
            status: CommercialCatalogRevisionStatus;
            display_name: string;
            description: string;
            plan_type: CommercialPlanType;
            price_inr: string | number;
            term_count: number;
            term_unit: CommercialCatalogTermUnit;
            revision_number: number;
        }>;
        if (!source) {
            return { status: "not-found" as const };
        }
        if (source.status !== "active" && source.status !== "retired") {
            return { status: "invalid-source" as const, currentStatus: source.status };
        }

        const [existingDraft] = await tx`
            SELECT id
            FROM commercial_plan_revisions
            WHERE plan_id = ${input.planId} AND status = 'draft'
            FOR UPDATE
        `;
        if (existingDraft) {
            return { status: "draft-exists" as const };
        }

        const [latest] = await tx`
            SELECT MAX(revision_number)::int AS latest_revision
            FROM commercial_plan_revisions
            WHERE plan_id = ${input.planId}
        ` as Array<{ latest_revision: number }>;

        await tx`
            INSERT INTO commercial_plan_revisions (
                id,
                plan_id,
                revision_number,
                status,
                display_name,
                description,
                plan_type,
                price_inr,
                term_count,
                term_unit,
                created_by_owner_user_id,
                created_at
            )
            VALUES (
                ${input.successorRevisionId},
                ${input.planId},
                ${(latest?.latest_revision ?? source.revision_number) + 1},
                'draft',
                ${source.display_name},
                ${source.description},
                ${source.plan_type},
                ${source.price_inr},
                ${source.term_count},
                ${source.term_unit},
                ${input.actorId},
                ${input.now}
            )
        `;
        await tx`
            INSERT INTO commercial_plan_revision_modules (plan_revision_id, module_revision_id, module_id)
            SELECT ${input.successorRevisionId}, module_revision_id, module_id
            FROM commercial_plan_revision_modules
            WHERE plan_revision_id = ${input.revisionId}
        `;

        const planDetail = await loadPlanDetail(tx, input.planId);
        if (!planDetail) {
            return { status: "not-found" as const };
        }
        return { status: "created" as const, plan: planDetail };
    });
