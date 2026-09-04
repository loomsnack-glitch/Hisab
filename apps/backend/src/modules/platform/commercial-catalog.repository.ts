import { sql } from "bun";
import {
    commercialCatalogCurrentRevisionRank,
    type CommercialCatalogAuditActorDTO,
    type CommercialCatalogRevisionStatus,
    type CommercialFeatureDetailDTO,
    type CommercialFeatureListItemDTO,
    type CommercialFeatureListQuerySVC,
    type CommercialFeatureRevisionDTO,
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
    };
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
