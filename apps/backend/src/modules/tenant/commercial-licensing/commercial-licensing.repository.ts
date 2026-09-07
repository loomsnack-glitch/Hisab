import { sql } from "bun";
import type {
    ActivePlanSnapshot,
    ActivePurchasableModuleSnapshot,
    ActiveTrialPlanSnapshot,
    CommercialAccessSourceModuleSnapshot,
    CommercialAccessSourceRecord,
    CommercialEnforcementLaunch,
    CommercialPaymentEventRecord,
    CommercialQuoteRecord,
    CommercialRefundRecord,
    ExistingStoreRecord,
    LicenseRevocationRecord,
    StoreAccessGrantOrigin,
    StoreAccessGrantRecord,
    StoreAccessGrantSelectionKind,
    StoreAccessGrantTermKind,
    StoreCoTermAddOnRecord,
    StoreLicenseRecord,
} from "@repo/types";
import { pg } from "@/config/db";

type SqlClient = typeof pg | Bun.TransactionSQL;

const isUniqueViolation = (error: unknown): boolean => {
    if (typeof error !== "object" || error === null) {
        return false;
    }
    if ("code" in error && error.code === "23505") {
        return true;
    }
    // Bun's native SQL driver surfaces Postgres codes on `errno`, not `code`.
    if ("errno" in error && error.errno === "23505") {
        return true;
    }
    if ("cause" in error) {
        return isUniqueViolation(error.cause);
    }
    return false;
};

type LicenseRow = {
    id: string;
    organization_id: string;
    store_id: string;
    source_kind: "trial" | "paid";
    plan_id: string;
    plan_revision_id: string;
    plan_key: string;
    plan_display_name: string;
    plan_type: "trial" | "paid";
    price_inr: string | number;
    term_count: number;
    term_unit: "day" | "month" | "year";
    starts_at: string | Date;
    ends_at: string | Date;
    revoked_at: string | Date | null;
    commercial_quote_id: string | null;
    created_by_user_id: string;
    created_at: string | Date;
};

type ModuleSnapshotRow = {
    license_id: string;
    module_id: string;
    module_revision_id: string;
    module_key: string;
    module_display_name: string;
};

type FeatureSnapshotRow = {
    license_id: string;
    module_id: string;
    feature_id: string;
    feature_revision_id: string;
    feature_key: string;
    feature_display_name: string;
};

const toDate = (value: string | Date): Date => (value instanceof Date ? value : new Date(value));

const toOptionalDate = (value: string | Date | null): Date | null =>
    value === null ? null : toDate(value);

const cloneModules = (
    modules: CommercialAccessSourceModuleSnapshot[],
): CommercialAccessSourceModuleSnapshot[] =>
    modules.map((moduleItem) => ({
        ...moduleItem,
        features: moduleItem.features.map((feature) => ({ ...feature })),
    }));

const toLicenseRecord = (
    row: LicenseRow,
    modules: CommercialAccessSourceModuleSnapshot[],
): StoreLicenseRecord => ({
    id: row.id,
    organizationId: row.organization_id,
    storeId: row.store_id,
    sourceKind: row.source_kind,
    planId: row.plan_id,
    planRevisionId: row.plan_revision_id,
    planKey: row.plan_key,
    planDisplayName: row.plan_display_name,
    planType: row.plan_type,
    priceInr: Number(row.price_inr),
    term: {
        count: Number(row.term_count),
        unit: row.term_unit,
    },
    startsAt: toDate(row.starts_at),
    endsAt: toDate(row.ends_at),
    revokedAt: toOptionalDate(row.revoked_at),
    commercialQuoteId: row.commercial_quote_id,
    createdByUserId: row.created_by_user_id,
    createdAt: toDate(row.created_at),
    modules: cloneModules(modules),
});

const toAccessSource = (license: StoreLicenseRecord): CommercialAccessSourceRecord => ({
    id: license.id,
    kind: "store_license",
    storeId: license.storeId,
    organizationId: license.organizationId,
    startsAt: license.startsAt,
    endsAt: license.endsAt,
    revokedAt: license.revokedAt,
    planKey: license.planKey,
    planDisplayName: license.planDisplayName,
    planType: license.planType,
    term: license.term,
    modules: cloneModules(license.modules),
});

const attachModules = (
    licenses: LicenseRow[],
    moduleRows: ModuleSnapshotRow[],
    featureRows: FeatureSnapshotRow[],
): StoreLicenseRecord[] => {
    const featuresByModule = new Map<string, CommercialAccessSourceModuleSnapshot["features"]>();
    for (const row of featureRows) {
        const key = `${row.license_id}:${row.module_id}`;
        const features = featuresByModule.get(key) ?? [];
        features.push({
            featureId: row.feature_id,
            featureRevisionId: row.feature_revision_id,
            key: row.feature_key,
            displayName: row.feature_display_name,
        });
        featuresByModule.set(key, features);
    }

    const modulesByLicense = new Map<string, CommercialAccessSourceModuleSnapshot[]>();
    for (const row of moduleRows) {
        const modules = modulesByLicense.get(row.license_id) ?? [];
        modules.push({
            moduleId: row.module_id,
            moduleRevisionId: row.module_revision_id,
            key: row.module_key,
            displayName: row.module_display_name,
            features: featuresByModule.get(`${row.license_id}:${row.module_id}`) ?? [],
        });
        modulesByLicense.set(row.license_id, modules);
    }

    return licenses.map((row) => toLicenseRecord(row, modulesByLicense.get(row.id) ?? []));
};

const loadLicensesForStore = async (tx: SqlClient, storeId: string): Promise<StoreLicenseRecord[]> => {
    const licenses = await tx`
        SELECT
            id,
            organization_id,
            store_id,
            source_kind,
            plan_id,
            plan_revision_id,
            plan_key,
            plan_display_name,
            plan_type,
            price_inr,
            term_count,
            term_unit,
            starts_at,
            ends_at,
            revoked_at,
            commercial_quote_id,
            created_by_user_id,
            created_at
        FROM store_licenses
        WHERE store_id = ${storeId}
        ORDER BY starts_at ASC, created_at ASC
    ` as LicenseRow[];
    if (licenses.length === 0) {
        return [];
    }

    const licenseIds = licenses.map((license) => license.id);
    const moduleRows = await tx`
        SELECT license_id, module_id, module_revision_id, module_key, module_display_name
        FROM store_license_module_snapshots
        WHERE license_id IN ${sql(licenseIds)}
        ORDER BY module_display_name ASC, module_key ASC
    ` as ModuleSnapshotRow[];
    const featureRows = await tx`
        SELECT license_id, module_id, feature_id, feature_revision_id, feature_key, feature_display_name
        FROM store_license_feature_snapshots
        WHERE license_id IN ${sql(licenseIds)}
        ORDER BY feature_display_name ASC, feature_key ASC
    ` as FeatureSnapshotRow[];
    return attachModules(licenses, moduleRows, featureRows);
};

export const getActiveTrialPlanSnapshot = async (): Promise<ActiveTrialPlanSnapshot | null> => {
    const [plan] = await pg`
        SELECT
            p.id AS plan_id,
            r.id AS plan_revision_id,
            p.key,
            r.display_name,
            r.plan_type,
            r.price_inr,
            r.term_count,
            r.term_unit
        FROM commercial_plan_revisions r
        INNER JOIN commercial_plans p ON p.id = r.plan_id
        WHERE r.status = 'active'
          AND r.plan_type = 'trial'
        ORDER BY
            CASE WHEN p.key = 'trial' THEN 0 ELSE 1 END ASC,
            r.published_at ASC,
            p.key ASC
        LIMIT 1
    ` as Array<{
        plan_id: string;
        plan_revision_id: string;
        key: string;
        display_name: string;
        plan_type: "trial";
        price_inr: string | number;
        term_count: number;
        term_unit: "day" | "month" | "year";
    }>;
    if (!plan) {
        return null;
    }

    const moduleRows = await pg`
        SELECT
            memberships.module_id,
            memberships.module_revision_id,
            modules.key,
            module_revisions.display_name
        FROM commercial_plan_revision_modules memberships
        INNER JOIN commercial_module_revisions module_revisions
            ON module_revisions.id = memberships.module_revision_id
        INNER JOIN commercial_modules modules ON modules.id = memberships.module_id
        WHERE memberships.plan_revision_id = ${plan.plan_revision_id}
        ORDER BY module_revisions.display_name ASC, modules.key ASC
    ` as Array<{
        module_id: string;
        module_revision_id: string;
        key: string;
        display_name: string;
    }>;

    const moduleRevisionIds = moduleRows.map((row) => row.module_revision_id);
    const featureRows = moduleRevisionIds.length === 0
        ? []
        : await pg`
            SELECT
                memberships.module_revision_id,
                memberships.feature_id,
                memberships.feature_revision_id,
                features.key,
                feature_revisions.display_name
            FROM commercial_module_revision_features memberships
            INNER JOIN commercial_feature_revisions feature_revisions
                ON feature_revisions.id = memberships.feature_revision_id
            INNER JOIN commercial_features features ON features.id = memberships.feature_id
            WHERE memberships.module_revision_id IN ${sql(moduleRevisionIds)}
            ORDER BY feature_revisions.display_name ASC, features.key ASC
        ` as Array<{
            module_revision_id: string;
            feature_id: string;
            feature_revision_id: string;
            key: string;
            display_name: string;
        }>;

    const featuresByModuleRevision = new Map<string, CommercialAccessSourceModuleSnapshot["features"]>();
    for (const row of featureRows) {
        const features = featuresByModuleRevision.get(row.module_revision_id) ?? [];
        features.push({
            featureId: row.feature_id,
            featureRevisionId: row.feature_revision_id,
            key: row.key,
            displayName: row.display_name,
        });
        featuresByModuleRevision.set(row.module_revision_id, features);
    }

    return {
        planId: plan.plan_id,
        planRevisionId: plan.plan_revision_id,
        key: plan.key,
        displayName: plan.display_name,
        planType: "trial",
        priceInr: Number(plan.price_inr),
        term: {
            count: Number(plan.term_count),
            unit: plan.term_unit,
        },
        modules: moduleRows.map((row) => ({
            moduleId: row.module_id,
            moduleRevisionId: row.module_revision_id,
            key: row.key,
            displayName: row.display_name,
            features: featuresByModuleRevision.get(row.module_revision_id) ?? [],
        })),
    };
};

export const listStoreLicenses = async (storeId: string): Promise<StoreLicenseRecord[]> =>
    loadLicensesForStore(pg, storeId);

export const insertTrialLicense = async (input: {
    id: string;
    organizationId: string;
    storeId: string;
    createdByUserId: string;
    now: Date;
    startsAt: Date;
    endsAt: Date;
    plan: ActiveTrialPlanSnapshot;
}): Promise<StoreLicenseRecord | "duplicate-trial"> => {
    try {
        return await pg.begin(async (tx) => {
            await tx`
                INSERT INTO store_licenses (
                    id,
                    organization_id,
                    store_id,
                    source_kind,
                    plan_id,
                    plan_revision_id,
                    plan_key,
                    plan_display_name,
                    plan_type,
                    price_inr,
                    term_count,
                    term_unit,
                    starts_at,
                    ends_at,
                    commercial_quote_id,
                    created_by_user_id,
                    created_at
                ) VALUES (
                    ${input.id},
                    ${input.organizationId},
                    ${input.storeId},
                    'trial',
                    ${input.plan.planId},
                    ${input.plan.planRevisionId},
                    ${input.plan.key},
                    ${input.plan.displayName},
                    ${input.plan.planType},
                    ${input.plan.priceInr},
                    ${input.plan.term.count},
                    ${input.plan.term.unit},
                    ${input.startsAt},
                    ${input.endsAt},
                    NULL,
                    ${input.createdByUserId},
                    ${input.now}
                )
            `;

            for (const moduleItem of input.plan.modules) {
                await tx`
                    INSERT INTO store_license_module_snapshots (
                        license_id,
                        module_id,
                        module_revision_id,
                        module_key,
                        module_display_name
                    ) VALUES (
                        ${input.id},
                        ${moduleItem.moduleId},
                        ${moduleItem.moduleRevisionId},
                        ${moduleItem.key},
                        ${moduleItem.displayName}
                    )
                `;
                for (const feature of moduleItem.features) {
                    await tx`
                        INSERT INTO store_license_feature_snapshots (
                            license_id,
                            module_id,
                            feature_id,
                            feature_revision_id,
                            feature_key,
                            feature_display_name
                        ) VALUES (
                            ${input.id},
                            ${moduleItem.moduleId},
                            ${feature.featureId},
                            ${feature.featureRevisionId},
                            ${feature.key},
                            ${feature.displayName}
                        )
                    `;
                }
            }

            const created = (await loadLicensesForStore(tx, input.storeId)).find(
                (license) => license.id === input.id,
            );
            if (!created) {
                throw new Error("Failed to load created Store License");
            }
            return created;
        });
    } catch (error) {
        if (isUniqueViolation(error)) {
            return "duplicate-trial";
        }
        throw error;
    }
};

type GrantRow = {
    id: string;
    organization_id: string;
    store_id: string;
    origin: StoreAccessGrantOrigin;
    term_kind: StoreAccessGrantTermKind;
    selection_kind: StoreAccessGrantSelectionKind;
    plan_id: string | null;
    plan_revision_id: string | null;
    plan_key: string | null;
    plan_display_name: string | null;
    plan_type: "trial" | "paid" | null;
    term_count: number;
    term_unit: "day" | "month" | "year";
    starts_at: string | Date;
    ends_at: string | Date;
    revoked_at: string | Date | null;
    created_by_owner_user_id: string | null;
    created_at: string | Date;
};

type GrantModuleSnapshotRow = {
    grant_id: string;
    module_id: string;
    module_revision_id: string;
    module_key: string;
    module_display_name: string;
};

type GrantFeatureSnapshotRow = {
    grant_id: string;
    module_id: string;
    feature_id: string;
    feature_revision_id: string;
    feature_key: string;
    feature_display_name: string;
};

const toGrantRecord = (
    row: GrantRow,
    modules: CommercialAccessSourceModuleSnapshot[],
): StoreAccessGrantRecord => ({
    id: row.id,
    organizationId: row.organization_id,
    storeId: row.store_id,
    origin: row.origin,
    termKind: row.term_kind,
    selectionKind: row.selection_kind,
    planId: row.plan_id,
    planRevisionId: row.plan_revision_id,
    planKey: row.plan_key,
    planDisplayName: row.plan_display_name,
    planType: row.plan_type,
    term: {
        count: Number(row.term_count),
        unit: row.term_unit,
    },
    startsAt: toDate(row.starts_at),
    endsAt: toDate(row.ends_at),
    revokedAt: toOptionalDate(row.revoked_at),
    createdByOwnerUserId: row.created_by_owner_user_id,
    createdAt: toDate(row.created_at),
    modules: cloneModules(modules),
});

const toGrantAccessSource = (grant: StoreAccessGrantRecord): CommercialAccessSourceRecord => ({
    id: grant.id,
    kind: "store_access_grant",
    storeId: grant.storeId,
    organizationId: grant.organizationId,
    startsAt: grant.startsAt,
    endsAt: grant.endsAt,
    revokedAt: grant.revokedAt,
    planKey: grant.planKey,
    planDisplayName: grant.planDisplayName,
    planType: grant.planType,
    term: grant.term,
    modules: cloneModules(grant.modules),
});

const attachGrantModules = (
    grants: GrantRow[],
    moduleRows: GrantModuleSnapshotRow[],
    featureRows: GrantFeatureSnapshotRow[],
): StoreAccessGrantRecord[] => {
    const featuresByModule = new Map<string, CommercialAccessSourceModuleSnapshot["features"]>();
    for (const row of featureRows) {
        const key = `${row.grant_id}:${row.module_id}`;
        const features = featuresByModule.get(key) ?? [];
        features.push({
            featureId: row.feature_id,
            featureRevisionId: row.feature_revision_id,
            key: row.feature_key,
            displayName: row.feature_display_name,
        });
        featuresByModule.set(key, features);
    }

    const modulesByGrant = new Map<string, CommercialAccessSourceModuleSnapshot[]>();
    for (const row of moduleRows) {
        const modules = modulesByGrant.get(row.grant_id) ?? [];
        modules.push({
            moduleId: row.module_id,
            moduleRevisionId: row.module_revision_id,
            key: row.module_key,
            displayName: row.module_display_name,
            features: featuresByModule.get(`${row.grant_id}:${row.module_id}`) ?? [],
        });
        modulesByGrant.set(row.grant_id, modules);
    }

    return grants.map((row) => toGrantRecord(row, modulesByGrant.get(row.id) ?? []));
};

const loadGrantsForStore = async (tx: SqlClient, storeId: string): Promise<StoreAccessGrantRecord[]> => {
    const grants = await tx`
        SELECT
            id,
            organization_id,
            store_id,
            origin,
            term_kind,
            selection_kind,
            plan_id,
            plan_revision_id,
            plan_key,
            plan_display_name,
            plan_type,
            term_count,
            term_unit,
            starts_at,
            ends_at,
            revoked_at,
            created_by_owner_user_id,
            created_at
        FROM store_access_grants
        WHERE store_id = ${storeId}
        ORDER BY created_at ASC, starts_at ASC
    ` as GrantRow[];
    if (grants.length === 0) {
        return [];
    }

    const grantIds = grants.map((grant) => grant.id);
    const moduleRows = await tx`
        SELECT grant_id, module_id, module_revision_id, module_key, module_display_name
        FROM store_access_grant_module_snapshots
        WHERE grant_id IN ${sql(grantIds)}
        ORDER BY module_display_name ASC, module_key ASC
    ` as GrantModuleSnapshotRow[];
    const featureRows = await tx`
        SELECT grant_id, module_id, feature_id, feature_revision_id, feature_key, feature_display_name
        FROM store_access_grant_feature_snapshots
        WHERE grant_id IN ${sql(grantIds)}
        ORDER BY feature_display_name ASC, feature_key ASC
    ` as GrantFeatureSnapshotRow[];
    return attachGrantModules(grants, moduleRows, featureRows);
};

const loadFeaturesForModuleRevisions = async (
    moduleRows: Array<{
        module_id: string;
        module_revision_id: string;
        key: string;
        display_name: string;
    }>,
): Promise<CommercialAccessSourceModuleSnapshot[]> => {
    const moduleRevisionIds = moduleRows.map((row) => row.module_revision_id);
    const featureRows = moduleRevisionIds.length === 0
        ? []
        : await pg`
            SELECT
                memberships.module_revision_id,
                memberships.feature_id,
                memberships.feature_revision_id,
                features.key,
                feature_revisions.display_name
            FROM commercial_module_revision_features memberships
            INNER JOIN commercial_feature_revisions feature_revisions
                ON feature_revisions.id = memberships.feature_revision_id
            INNER JOIN commercial_features features ON features.id = memberships.feature_id
            WHERE memberships.module_revision_id IN ${sql(moduleRevisionIds)}
            ORDER BY feature_revisions.display_name ASC, features.key ASC
        ` as Array<{
            module_revision_id: string;
            feature_id: string;
            feature_revision_id: string;
            key: string;
            display_name: string;
        }>;

    const featuresByModuleRevision = new Map<string, CommercialAccessSourceModuleSnapshot["features"]>();
    for (const row of featureRows) {
        const features = featuresByModuleRevision.get(row.module_revision_id) ?? [];
        features.push({
            featureId: row.feature_id,
            featureRevisionId: row.feature_revision_id,
            key: row.key,
            displayName: row.display_name,
        });
        featuresByModuleRevision.set(row.module_revision_id, features);
    }

    return moduleRows.map((row) => ({
        moduleId: row.module_id,
        moduleRevisionId: row.module_revision_id,
        key: row.key,
        displayName: row.display_name,
        features: featuresByModuleRevision.get(row.module_revision_id) ?? [],
    }));
};

export const listActiveModuleSnapshots = async (): Promise<CommercialAccessSourceModuleSnapshot[]> => {
    const moduleRows = await pg`
        SELECT
            modules.id AS module_id,
            revisions.id AS module_revision_id,
            modules.key,
            revisions.display_name
        FROM commercial_module_revisions revisions
        INNER JOIN commercial_modules modules ON modules.id = revisions.module_id
        WHERE revisions.status = 'active'
        ORDER BY revisions.display_name ASC, modules.key ASC
    ` as Array<{
        module_id: string;
        module_revision_id: string;
        key: string;
        display_name: string;
    }>;
    return loadFeaturesForModuleRevisions(moduleRows);
};

export const listActivePurchasableModuleSnapshots = async (): Promise<ActivePurchasableModuleSnapshot[]> => {
    const moduleRows = await pg`
        SELECT
            modules.id AS module_id,
            revisions.id AS module_revision_id,
            modules.key,
            revisions.display_name,
            revisions.price_inr,
            revisions.term_count,
            revisions.term_unit
        FROM commercial_module_revisions revisions
        INNER JOIN commercial_modules modules ON modules.id = revisions.module_id
        WHERE revisions.status = 'active'
          AND revisions.is_separately_purchasable = TRUE
        ORDER BY revisions.display_name ASC, modules.key ASC
    ` as Array<{
        module_id: string;
        module_revision_id: string;
        key: string;
        display_name: string;
        price_inr: string | number;
        term_count: number;
        term_unit: "day" | "month" | "year";
    }>;
    const snapshots = await loadFeaturesForModuleRevisions(moduleRows);
    return snapshots.map((snapshot, index) => ({
        ...snapshot,
        priceInr: Number(moduleRows[index]?.price_inr ?? 0),
        term: {
            count: Number(moduleRows[index]?.term_count ?? 1),
            unit: moduleRows[index]?.term_unit ?? "year",
        },
    }));
};

const loadPlanSnapshot = async (plan: {
    plan_id: string;
    plan_revision_id: string;
    key: string;
    display_name: string;
    plan_type: "trial" | "paid";
    price_inr: string | number;
    term_count: number;
    term_unit: "day" | "month" | "year";
}): Promise<ActivePlanSnapshot> => {
    const moduleRows = await pg`
        SELECT
            memberships.module_id,
            memberships.module_revision_id,
            modules.key,
            module_revisions.display_name
        FROM commercial_plan_revision_modules memberships
        INNER JOIN commercial_module_revisions module_revisions
            ON module_revisions.id = memberships.module_revision_id
        INNER JOIN commercial_modules modules ON modules.id = memberships.module_id
        WHERE memberships.plan_revision_id = ${plan.plan_revision_id}
        ORDER BY module_revisions.display_name ASC, modules.key ASC
    ` as Array<{
        module_id: string;
        module_revision_id: string;
        key: string;
        display_name: string;
    }>;

    return {
        planId: plan.plan_id,
        planRevisionId: plan.plan_revision_id,
        key: plan.key,
        displayName: plan.display_name,
        planType: plan.plan_type,
        priceInr: Number(plan.price_inr),
        term: {
            count: Number(plan.term_count),
            unit: plan.term_unit,
        },
        modules: await loadFeaturesForModuleRevisions(moduleRows),
    };
};

export const listActivePlanSnapshots = async (): Promise<ActivePlanSnapshot[]> => {
    const plans = await pg`
        SELECT
            p.id AS plan_id,
            r.id AS plan_revision_id,
            p.key,
            r.display_name,
            r.plan_type,
            r.price_inr,
            r.term_count,
            r.term_unit
        FROM commercial_plan_revisions r
        INNER JOIN commercial_plans p ON p.id = r.plan_id
        WHERE r.status = 'active'
        ORDER BY r.display_name ASC, p.key ASC
    ` as Array<{
        plan_id: string;
        plan_revision_id: string;
        key: string;
        display_name: string;
        plan_type: "trial" | "paid";
        price_inr: string | number;
        term_count: number;
        term_unit: "day" | "month" | "year";
    }>;
    const snapshots: ActivePlanSnapshot[] = [];
    for (const plan of plans) {
        snapshots.push(await loadPlanSnapshot(plan));
    }
    return snapshots;
};

export const getActivePlanSnapshotByKey = async (planKey: string): Promise<ActivePlanSnapshot | null> => {
    const [plan] = await pg`
        SELECT
            p.id AS plan_id,
            r.id AS plan_revision_id,
            p.key,
            r.display_name,
            r.plan_type,
            r.price_inr,
            r.term_count,
            r.term_unit
        FROM commercial_plan_revisions r
        INNER JOIN commercial_plans p ON p.id = r.plan_id
        WHERE r.status = 'active'
          AND p.key = ${planKey}
        ORDER BY r.published_at ASC
        LIMIT 1
    ` as Array<{
        plan_id: string;
        plan_revision_id: string;
        key: string;
        display_name: string;
        plan_type: "trial" | "paid";
        price_inr: string | number;
        term_count: number;
        term_unit: "day" | "month" | "year";
    }>;
    return plan ? loadPlanSnapshot(plan) : null;
};

export const getActiveModuleSnapshotByKey = async (
    moduleKey: string,
): Promise<CommercialAccessSourceModuleSnapshot | null> => {
    const [moduleRow] = await pg`
        SELECT
            modules.id AS module_id,
            revisions.id AS module_revision_id,
            modules.key,
            revisions.display_name
        FROM commercial_module_revisions revisions
        INNER JOIN commercial_modules modules ON modules.id = revisions.module_id
        WHERE revisions.status = 'active'
          AND modules.key = ${moduleKey}
        ORDER BY revisions.published_at ASC
        LIMIT 1
    ` as Array<{
        module_id: string;
        module_revision_id: string;
        key: string;
        display_name: string;
    }>;
    if (!moduleRow) {
        return null;
    }
    const [snapshot] = await loadFeaturesForModuleRevisions([moduleRow]);
    return snapshot ?? null;
};

export const listAccessGrantsForStore = async (storeId: string): Promise<StoreAccessGrantRecord[]> =>
    loadGrantsForStore(pg, storeId);

type CoTermAddOnRow = {
    id: string;
    organization_id: string;
    store_id: string;
    base_store_license_id: string;
    module_id: string;
    module_revision_id: string;
    module_key: string;
    module_display_name: string;
    price_inr: string | number;
    charged_amount_inr: string | number;
    term_count: number;
    term_unit: "day" | "month" | "year";
    starts_at: string | Date;
    ends_at: string | Date;
    commercial_quote_id: string;
    revoked_at: string | Date | null;
    created_by_user_id: string;
    created_at: string | Date;
};

type CoTermAddOnFeatureSnapshotRow = {
    add_on_id: string;
    feature_id: string;
    feature_revision_id: string;
    feature_key: string;
    feature_display_name: string;
};

const attachCoTermAddOnFeatures = (
    addOns: CoTermAddOnRow[],
    featureRows: CoTermAddOnFeatureSnapshotRow[],
): StoreCoTermAddOnRecord[] => {
    const featuresByAddOn = new Map<string, CommercialAccessSourceModuleSnapshot["features"]>();
    for (const row of featureRows) {
        const features = featuresByAddOn.get(row.add_on_id) ?? [];
        features.push({
            featureId: row.feature_id,
            featureRevisionId: row.feature_revision_id,
            key: row.feature_key,
            displayName: row.feature_display_name,
        });
        featuresByAddOn.set(row.add_on_id, features);
    }

    return addOns.map((row) => ({
        id: row.id,
        organizationId: row.organization_id,
        storeId: row.store_id,
        baseStoreLicenseId: row.base_store_license_id,
        moduleId: row.module_id,
        moduleRevisionId: row.module_revision_id,
        moduleKey: row.module_key,
        moduleDisplayName: row.module_display_name,
        priceInr: Number(row.price_inr),
        chargedAmountInr: Number(row.charged_amount_inr),
        term: {
            count: Number(row.term_count),
            unit: row.term_unit,
        },
        startsAt: toDate(row.starts_at),
        endsAt: toDate(row.ends_at),
        revokedAt: toOptionalDate(row.revoked_at),
        commercialQuoteId: row.commercial_quote_id,
        createdByUserId: row.created_by_user_id,
        createdAt: toDate(row.created_at),
        modules: [{
            moduleId: row.module_id,
            moduleRevisionId: row.module_revision_id,
            key: row.module_key,
            displayName: row.module_display_name,
            features: featuresByAddOn.get(row.id) ?? [],
        }],
    }));
};

const loadCoTermAddOnsForStore = async (tx: SqlClient, storeId: string): Promise<StoreCoTermAddOnRecord[]> => {
    const addOns = await tx`
        SELECT
            id,
            organization_id,
            store_id,
            base_store_license_id,
            module_id,
            module_revision_id,
            module_key,
            module_display_name,
            price_inr,
            charged_amount_inr,
            term_count,
            term_unit,
            starts_at,
            ends_at,
            commercial_quote_id,
            revoked_at,
            created_by_user_id,
            created_at
        FROM store_co_term_add_ons
        WHERE store_id = ${storeId}
        ORDER BY starts_at ASC, created_at ASC
    ` as CoTermAddOnRow[];
    if (addOns.length === 0) {
        return [];
    }
    const addOnIds = addOns.map((addOn) => addOn.id);
    const featureRows = await tx`
        SELECT add_on_id, feature_id, feature_revision_id, feature_key, feature_display_name
        FROM store_co_term_add_on_feature_snapshots
        WHERE add_on_id IN ${sql(addOnIds)}
        ORDER BY feature_display_name ASC, feature_key ASC
    ` as CoTermAddOnFeatureSnapshotRow[];
    return attachCoTermAddOnFeatures(addOns, featureRows);
};

const toCoTermAddOnAccessSource = (addOn: StoreCoTermAddOnRecord): CommercialAccessSourceRecord => ({
    id: addOn.id,
    kind: "co_term_add_on",
    storeId: addOn.storeId,
    organizationId: addOn.organizationId,
    startsAt: addOn.startsAt,
    endsAt: addOn.endsAt,
    revokedAt: addOn.revokedAt,
    planKey: null,
    planDisplayName: null,
    planType: null,
    term: addOn.term,
    modules: cloneModules(addOn.modules),
});

export const listCoTermAddOnsForStore = async (storeId: string): Promise<StoreCoTermAddOnRecord[]> =>
    loadCoTermAddOnsForStore(pg, storeId);

export const listAccessSourcesForStore = async (storeId: string): Promise<CommercialAccessSourceRecord[]> => [
    ...(await loadLicensesForStore(pg, storeId)).map(toAccessSource),
    ...(await loadCoTermAddOnsForStore(pg, storeId)).map(toCoTermAddOnAccessSource),
    ...(await loadGrantsForStore(pg, storeId)).map(toGrantAccessSource),
];

export const listStoresExistingAt = async (at: Date): Promise<ExistingStoreRecord[]> => {
    const rows = await pg`
        SELECT id, organization_id, created_at
        FROM stores
        WHERE created_at <= ${at}
        ORDER BY created_at ASC, id ASC
    ` as Array<{ id: string; organization_id: string; created_at: string | Date }>;
    return rows.map((row) => ({
        id: row.id,
        organizationId: row.organization_id,
        createdAt: toDate(row.created_at),
    }));
};

export const getEnforcementLaunch = async (): Promise<CommercialEnforcementLaunch | null> => {
    const [row] = await pg`
        SELECT launched_at
        FROM commercial_enforcement_launch
        WHERE id = 1
    ` as Array<{ launched_at: string | Date }>;
    return row ? { launchedAt: toDate(row.launched_at) } : null;
};

export const getOrCreateEnforcementLaunch = async (launchedAt: Date): Promise<CommercialEnforcementLaunch> => {
    try {
        await pg`
            INSERT INTO commercial_enforcement_launch (id, launched_at)
            VALUES (1, ${launchedAt})
        `;
        return { launchedAt };
    } catch (error) {
        if (!isUniqueViolation(error)) {
            throw error;
        }
        const existing = await getEnforcementLaunch();
        if (!existing) {
            throw new Error("Failed to load commercial enforcement launch");
        }
        return existing;
    }
};

export const insertStoreAccessGrant = async (
    grant: StoreAccessGrantRecord,
): Promise<StoreAccessGrantRecord | "duplicate-legacy-migration"> => {
    try {
        return await pg.begin(async (tx) => {
            await tx`
                INSERT INTO store_access_grants (
                    id,
                    organization_id,
                    store_id,
                    origin,
                    term_kind,
                    selection_kind,
                    plan_id,
                    plan_revision_id,
                    plan_key,
                    plan_display_name,
                    plan_type,
                    term_count,
                    term_unit,
                    starts_at,
                    ends_at,
                    created_by_owner_user_id,
                    created_at
                ) VALUES (
                    ${grant.id},
                    ${grant.organizationId},
                    ${grant.storeId},
                    ${grant.origin},
                    ${grant.termKind},
                    ${grant.selectionKind},
                    ${grant.planId},
                    ${grant.planRevisionId},
                    ${grant.planKey},
                    ${grant.planDisplayName},
                    ${grant.planType},
                    ${grant.term.count},
                    ${grant.term.unit},
                    ${grant.startsAt},
                    ${grant.endsAt},
                    ${grant.createdByOwnerUserId},
                    ${grant.createdAt}
                )
            `;

            for (const moduleItem of grant.modules) {
                await tx`
                    INSERT INTO store_access_grant_module_snapshots (
                        grant_id,
                        module_id,
                        module_revision_id,
                        module_key,
                        module_display_name
                    ) VALUES (
                        ${grant.id},
                        ${moduleItem.moduleId},
                        ${moduleItem.moduleRevisionId},
                        ${moduleItem.key},
                        ${moduleItem.displayName}
                    )
                `;
                for (const feature of moduleItem.features) {
                    await tx`
                        INSERT INTO store_access_grant_feature_snapshots (
                            grant_id,
                            module_id,
                            feature_id,
                            feature_revision_id,
                            feature_key,
                            feature_display_name
                        ) VALUES (
                            ${grant.id},
                            ${moduleItem.moduleId},
                            ${feature.featureId},
                            ${feature.featureRevisionId},
                            ${feature.key},
                            ${feature.displayName}
                        )
                    `;
                }
            }

            const created = (await loadGrantsForStore(tx, grant.storeId)).find((row) => row.id === grant.id);
            if (!created) {
                throw new Error("Failed to load created Store Access Grant");
            }
            return created;
        });
    } catch (error) {
        if (isUniqueViolation(error) && grant.origin === "legacy_migration") {
            return "duplicate-legacy-migration";
        }
        throw error;
    }
};

type QuoteRow = {
    id: string;
    organization_id: string;
    store_id: string;
    kind: "paid_plan" | "plan_renewal" | "plan_upgrade" | "co_term_add_on";
    plan_id: string | null;
    plan_revision_id: string | null;
    plan_key: string | null;
    plan_display_name: string | null;
    plan_type: "paid" | null;
    module_id: string | null;
    module_revision_id: string | null;
    module_key: string | null;
    module_display_name: string | null;
    price_inr: string | number;
    amount_inr: string | number;
    amount_paise: number;
    currency: "INR";
    term_count: number;
    term_unit: "day" | "month" | "year";
    license_timing: "immediate" | "scheduled";
    intended_starts_at: string | Date;
    intended_ends_at: string | Date;
    razorpay_order_id: string;
    razorpay_receipt: string;
    expires_at: string | Date;
    fulfilled_at: string | Date | null;
    fulfilled_license_id: string | null;
    fulfilled_co_term_add_on_id: string | null;
    created_by_user_id: string;
    created_at: string | Date;
};

type QuoteLineItemRow = {
    quote_id: string;
    position: number;
    description: string;
    amount_inr: string | number;
};

type QuoteModuleSnapshotRow = {
    quote_id: string;
    module_id: string;
    module_revision_id: string;
    module_key: string;
    module_display_name: string;
};

type QuoteFeatureSnapshotRow = {
    quote_id: string;
    module_id: string;
    feature_id: string;
    feature_revision_id: string;
    feature_key: string;
    feature_display_name: string;
};

type PaymentEventRow = {
    id: string;
    razorpay_event_id: string;
    event_type: string;
    razorpay_order_id: string | null;
    razorpay_payment_id: string | null;
    amount_paise: number | null;
    currency: string | null;
    quote_id: string | null;
    fulfillment_status: CommercialPaymentEventRecord["fulfillmentStatus"];
    fulfillment_error: string | null;
    payload: unknown;
    created_at: string | Date;
    processed_at: string | Date | null;
};

const toQuoteRecord = (
    row: QuoteRow,
    lineItems: CommercialQuoteRecord["lineItems"],
    modules: CommercialAccessSourceModuleSnapshot[],
): CommercialQuoteRecord => ({
    id: row.id,
    organizationId: row.organization_id,
    storeId: row.store_id,
    kind: row.kind,
    planId: row.plan_id,
    planRevisionId: row.plan_revision_id,
    planKey: row.plan_key,
    planDisplayName: row.plan_display_name,
    planType: row.plan_type,
    moduleId: row.module_id,
    moduleRevisionId: row.module_revision_id,
    moduleKey: row.module_key,
    moduleDisplayName: row.module_display_name,
    priceInr: Number(row.price_inr),
    amountInr: Number(row.amount_inr),
    amountPaise: Number(row.amount_paise),
    currency: row.currency,
    term: {
        count: Number(row.term_count),
        unit: row.term_unit,
    },
    licenseTiming: row.license_timing,
    intendedStartsAt: toDate(row.intended_starts_at),
    intendedEndsAt: toDate(row.intended_ends_at),
    razorpayOrderId: row.razorpay_order_id,
    razorpayReceipt: row.razorpay_receipt,
    expiresAt: toDate(row.expires_at),
    fulfilledAt: toOptionalDate(row.fulfilled_at),
    fulfilledLicenseId: row.fulfilled_license_id,
    fulfilledCoTermAddOnId: row.fulfilled_co_term_add_on_id,
    createdByUserId: row.created_by_user_id,
    createdAt: toDate(row.created_at),
    lineItems,
    modules: cloneModules(modules),
});

const attachQuoteSnapshots = (
    quotes: QuoteRow[],
    lineRows: QuoteLineItemRow[],
    moduleRows: QuoteModuleSnapshotRow[],
    featureRows: QuoteFeatureSnapshotRow[],
): CommercialQuoteRecord[] => {
    const linesByQuote = new Map<string, CommercialQuoteRecord["lineItems"]>();
    for (const row of lineRows) {
        const lines = linesByQuote.get(row.quote_id) ?? [];
        lines.push({
            description: row.description,
            amountInr: Number(row.amount_inr),
        });
        linesByQuote.set(row.quote_id, lines);
    }

    const featuresByModule = new Map<string, CommercialAccessSourceModuleSnapshot["features"]>();
    for (const row of featureRows) {
        const key = `${row.quote_id}:${row.module_id}`;
        const features = featuresByModule.get(key) ?? [];
        features.push({
            featureId: row.feature_id,
            featureRevisionId: row.feature_revision_id,
            key: row.feature_key,
            displayName: row.feature_display_name,
        });
        featuresByModule.set(key, features);
    }

    const modulesByQuote = new Map<string, CommercialAccessSourceModuleSnapshot[]>();
    for (const row of moduleRows) {
        const modules = modulesByQuote.get(row.quote_id) ?? [];
        modules.push({
            moduleId: row.module_id,
            moduleRevisionId: row.module_revision_id,
            key: row.module_key,
            displayName: row.module_display_name,
            features: featuresByModule.get(`${row.quote_id}:${row.module_id}`) ?? [],
        });
        modulesByQuote.set(row.quote_id, modules);
    }

    return quotes.map((row) => toQuoteRecord(
        row,
        linesByQuote.get(row.id) ?? [],
        modulesByQuote.get(row.id) ?? [],
    ));
};

const loadQuotes = async (tx: SqlClient, quotes: QuoteRow[]): Promise<CommercialQuoteRecord[]> => {
    if (quotes.length === 0) {
        return [];
    }
    const quoteIds = quotes.map((quote) => quote.id);
    const lineRows = await tx`
        SELECT quote_id, position, description, amount_inr
        FROM commercial_quote_line_items
        WHERE quote_id IN ${sql(quoteIds)}
        ORDER BY position ASC
    ` as QuoteLineItemRow[];
    const moduleRows = await tx`
        SELECT quote_id, module_id, module_revision_id, module_key, module_display_name
        FROM commercial_quote_module_snapshots
        WHERE quote_id IN ${sql(quoteIds)}
        ORDER BY module_display_name ASC, module_key ASC
    ` as QuoteModuleSnapshotRow[];
    const featureRows = await tx`
        SELECT quote_id, module_id, feature_id, feature_revision_id, feature_key, feature_display_name
        FROM commercial_quote_feature_snapshots
        WHERE quote_id IN ${sql(quoteIds)}
        ORDER BY feature_display_name ASC, feature_key ASC
    ` as QuoteFeatureSnapshotRow[];
    return attachQuoteSnapshots(quotes, lineRows, moduleRows, featureRows);
};

const quoteSelectColumns = sql`
    id,
    organization_id,
    store_id,
    kind,
    plan_id,
    plan_revision_id,
    plan_key,
    plan_display_name,
    plan_type,
    module_id,
    module_revision_id,
    module_key,
    module_display_name,
    price_inr,
    amount_inr,
    amount_paise,
    currency,
    term_count,
    term_unit,
    license_timing,
    intended_starts_at,
    intended_ends_at,
    razorpay_order_id,
    razorpay_receipt,
    expires_at,
    fulfilled_at,
    fulfilled_license_id,
    fulfilled_co_term_add_on_id,
    created_by_user_id,
    created_at
`;

const loadQuotesForStore = async (tx: SqlClient, storeId: string): Promise<CommercialQuoteRecord[]> => {
    const quotes = await tx`
        SELECT ${quoteSelectColumns}
        FROM commercial_quotes
        WHERE store_id = ${storeId}
        ORDER BY created_at DESC, id DESC
    ` as QuoteRow[];
    return loadQuotes(tx, quotes);
};

const toPaymentEvent = (row: PaymentEventRow): CommercialPaymentEventRecord => ({
    id: row.id,
    razorpayEventId: row.razorpay_event_id,
    eventType: row.event_type,
    razorpayOrderId: row.razorpay_order_id,
    razorpayPaymentId: row.razorpay_payment_id,
    amountPaise: row.amount_paise === null ? null : Number(row.amount_paise),
    currency: row.currency,
    quoteId: row.quote_id,
    fulfillmentStatus: row.fulfillment_status,
    fulfillmentError: row.fulfillment_error,
    payload: row.payload,
    createdAt: toDate(row.created_at),
    processedAt: toOptionalDate(row.processed_at),
});

const writeLicenseSnapshots = async (
    tx: SqlClient,
    licenseId: string,
    modules: CommercialAccessSourceModuleSnapshot[],
) => {
    for (const moduleItem of modules) {
        await tx`
            INSERT INTO store_license_module_snapshots (
                license_id,
                module_id,
                module_revision_id,
                module_key,
                module_display_name
            ) VALUES (
                ${licenseId},
                ${moduleItem.moduleId},
                ${moduleItem.moduleRevisionId},
                ${moduleItem.key},
                ${moduleItem.displayName}
            )
        `;
        for (const feature of moduleItem.features) {
            await tx`
                INSERT INTO store_license_feature_snapshots (
                    license_id,
                    module_id,
                    feature_id,
                    feature_revision_id,
                    feature_key,
                    feature_display_name
                ) VALUES (
                    ${licenseId},
                    ${moduleItem.moduleId},
                    ${feature.featureId},
                    ${feature.featureRevisionId},
                    ${feature.key},
                    ${feature.displayName}
                )
            `;
        }
    }
};

const licensesOverlap = (left: StoreLicenseRecord, startsAt: Date, endsAt: Date) =>
    left.revokedAt === null
    && left.startsAt.getTime() < endsAt.getTime()
    && startsAt.getTime() < left.endsAt.getTime();

export const listCommercialQuotesForStore = async (storeId: string): Promise<CommercialQuoteRecord[]> =>
    loadQuotesForStore(pg, storeId);

export const getCommercialQuoteByRazorpayOrderId = async (
    razorpayOrderId: string,
): Promise<CommercialQuoteRecord | null> => {
    const quotes = await pg`
        SELECT ${quoteSelectColumns}
        FROM commercial_quotes
        WHERE razorpay_order_id = ${razorpayOrderId}
        LIMIT 1
    ` as QuoteRow[];
    const [quote] = await loadQuotes(pg, quotes);
    return quote ?? null;
};

export const insertCommercialQuote = async (quote: CommercialQuoteRecord): Promise<CommercialQuoteRecord> =>
    pg.begin(async (tx) => {
        await tx`
            INSERT INTO commercial_quotes (
                id,
                organization_id,
                store_id,
                kind,
                plan_id,
                plan_revision_id,
                plan_key,
                plan_display_name,
                plan_type,
                module_id,
                module_revision_id,
                module_key,
                module_display_name,
                price_inr,
                amount_inr,
                amount_paise,
                currency,
                term_count,
                term_unit,
                license_timing,
                intended_starts_at,
                intended_ends_at,
                razorpay_order_id,
                razorpay_receipt,
                expires_at,
                created_by_user_id,
                created_at
            ) VALUES (
                ${quote.id},
                ${quote.organizationId},
                ${quote.storeId},
                ${quote.kind},
                ${quote.planId},
                ${quote.planRevisionId},
                ${quote.planKey},
                ${quote.planDisplayName},
                ${quote.planType},
                ${quote.moduleId},
                ${quote.moduleRevisionId},
                ${quote.moduleKey},
                ${quote.moduleDisplayName},
                ${quote.priceInr},
                ${quote.amountInr},
                ${quote.amountPaise},
                ${quote.currency},
                ${quote.term.count},
                ${quote.term.unit},
                ${quote.licenseTiming},
                ${quote.intendedStartsAt},
                ${quote.intendedEndsAt},
                ${quote.razorpayOrderId},
                ${quote.razorpayReceipt},
                ${quote.expiresAt},
                ${quote.createdByUserId},
                ${quote.createdAt}
            )
        `;

        for (const [index, line] of quote.lineItems.entries()) {
            await tx`
                INSERT INTO commercial_quote_line_items (
                    quote_id,
                    position,
                    description,
                    amount_inr
                ) VALUES (
                    ${quote.id},
                    ${index + 1},
                    ${line.description},
                    ${line.amountInr}
                )
            `;
        }

        for (const moduleItem of quote.modules) {
            await tx`
                INSERT INTO commercial_quote_module_snapshots (
                    quote_id,
                    module_id,
                    module_revision_id,
                    module_key,
                    module_display_name
                ) VALUES (
                    ${quote.id},
                    ${moduleItem.moduleId},
                    ${moduleItem.moduleRevisionId},
                    ${moduleItem.key},
                    ${moduleItem.displayName}
                )
            `;
            for (const feature of moduleItem.features) {
                await tx`
                    INSERT INTO commercial_quote_feature_snapshots (
                        quote_id,
                        module_id,
                        feature_id,
                        feature_revision_id,
                        feature_key,
                        feature_display_name
                    ) VALUES (
                        ${quote.id},
                        ${moduleItem.moduleId},
                        ${feature.featureId},
                        ${feature.featureRevisionId},
                        ${feature.key},
                        ${feature.displayName}
                    )
                `;
            }
        }

        const created = (await loadQuotesForStore(tx, quote.storeId)).find((row) => row.id === quote.id);
        if (!created) {
            throw new Error("Failed to load created Commercial Quote");
        }
        return created;
    });

export const insertPaymentEvent = async (
    event: CommercialPaymentEventRecord,
): Promise<{ event: CommercialPaymentEventRecord; created: boolean }> => {
    try {
        const [row] = await pg`
            INSERT INTO commercial_payment_events (
                id,
                razorpay_event_id,
                event_type,
                razorpay_order_id,
                razorpay_payment_id,
                amount_paise,
                currency,
                quote_id,
                fulfillment_status,
                fulfillment_error,
                payload,
                created_at,
                processed_at
            ) VALUES (
                ${event.id},
                ${event.razorpayEventId},
                ${event.eventType},
                ${event.razorpayOrderId},
                ${event.razorpayPaymentId},
                ${event.amountPaise},
                ${event.currency},
                ${event.quoteId},
                ${event.fulfillmentStatus},
                ${event.fulfillmentError},
                ${JSON.stringify(event.payload)}::jsonb,
                ${event.createdAt},
                ${event.processedAt}
            )
            RETURNING
                id,
                razorpay_event_id,
                event_type,
                razorpay_order_id,
                razorpay_payment_id,
                amount_paise,
                currency,
                quote_id,
                fulfillment_status,
                fulfillment_error,
                payload,
                created_at,
                processed_at
        ` as PaymentEventRow[];
        if (!row) {
            throw new Error("Failed to persist Commercial Payment Event");
        }
        return { event: toPaymentEvent(row), created: true };
    } catch (error) {
        if (!isUniqueViolation(error)) {
            throw error;
        }
        const [existing] = await pg`
            SELECT
                id,
                razorpay_event_id,
                event_type,
                razorpay_order_id,
                razorpay_payment_id,
                amount_paise,
                currency,
                quote_id,
                fulfillment_status,
                fulfillment_error,
                payload,
                created_at,
                processed_at
            FROM commercial_payment_events
            WHERE razorpay_event_id = ${event.razorpayEventId}
            LIMIT 1
        ` as PaymentEventRow[];
        if (!existing) {
            throw new Error("Failed to load Commercial Payment Event");
        }
        return { event: toPaymentEvent(existing), created: false };
    }
};

export const updatePaymentEventFulfillment = async (
    eventId: string,
    fulfillmentStatus: CommercialPaymentEventRecord["fulfillmentStatus"],
    fulfillmentError: string | null,
    processedAt: Date,
    quoteId: string | null,
): Promise<CommercialPaymentEventRecord> => {
    const [row] = await pg`
        UPDATE commercial_payment_events
        SET
            fulfillment_status = ${fulfillmentStatus},
            fulfillment_error = ${fulfillmentError},
            processed_at = ${processedAt},
            quote_id = COALESCE(${quoteId}, quote_id)
        WHERE id = ${eventId}
        RETURNING
            id,
            razorpay_event_id,
            event_type,
            razorpay_order_id,
            razorpay_payment_id,
            amount_paise,
            currency,
            quote_id,
            fulfillment_status,
            fulfillment_error,
            payload,
            created_at,
            processed_at
    ` as PaymentEventRow[];
    if (!row) {
        throw new Error("Failed to update Commercial Payment Event");
    }
    return toPaymentEvent(row);
};

export const listPaymentEventsForStore = async (storeId: string): Promise<CommercialPaymentEventRecord[]> => {
    const rows = await pg`
        SELECT
            events.id,
            events.razorpay_event_id,
            events.event_type,
            events.razorpay_order_id,
            events.razorpay_payment_id,
            events.amount_paise,
            events.currency,
            events.quote_id,
            events.fulfillment_status,
            events.fulfillment_error,
            events.payload,
            events.created_at,
            events.processed_at
        FROM commercial_payment_events events
        INNER JOIN commercial_quotes quotes ON quotes.id = events.quote_id
        WHERE quotes.store_id = ${storeId}
        ORDER BY events.created_at DESC, events.id DESC
    ` as PaymentEventRow[];
    return rows.map(toPaymentEvent);
};

const revokeScheduledPaidSuccessors = async (
    tx: SqlClient,
    storeId: string,
    revokedAt: Date,
) => {
    await tx`
        UPDATE store_licenses
        SET revoked_at = ${revokedAt}
        WHERE store_id = ${storeId}
          AND source_kind = 'paid'
          AND revoked_at IS NULL
          AND starts_at > ${revokedAt}
    `;
};

const revokeActivePaidLicense = async (
    tx: SqlClient,
    licenseId: string,
    revokedAt: Date,
) => {
    await tx`
        UPDATE store_licenses
        SET revoked_at = ${revokedAt}
        WHERE id = ${licenseId}
          AND source_kind = 'paid'
          AND revoked_at IS NULL
    `;
};

export const fulfillPaidPlanQuote = async (input: {
    licenseId: string;
    quote: CommercialQuoteRecord;
    now: Date;
}): Promise<StoreLicenseRecord | "already-fulfilled" | "overlapping-license"> => {
    try {
        return await pg.begin(async (tx) => {
            const lockedQuotes = await tx`
                SELECT ${quoteSelectColumns}
                FROM commercial_quotes
                WHERE id = ${input.quote.id}
                FOR UPDATE
            ` as QuoteRow[];
            const [locked] = await loadQuotes(tx, lockedQuotes);
            if (!locked) {
                throw new Error("Commercial Quote not found");
            }
            if (locked.fulfilledAt && locked.fulfilledLicenseId) {
                const existing = (await loadLicensesForStore(tx, locked.storeId)).find(
                    (license) => license.id === locked.fulfilledLicenseId,
                );
                return existing ?? "already-fulfilled";
            }

            const licenses = await tx`
                SELECT
                    id,
                    organization_id,
                    store_id,
                    source_kind,
                    plan_id,
                    plan_revision_id,
                    plan_key,
                    plan_display_name,
                    plan_type,
                    price_inr,
                    term_count,
                    term_unit,
                    starts_at,
                    ends_at,
                    revoked_at,
                    commercial_quote_id,
                    created_by_user_id,
                    created_at
                FROM store_licenses
                WHERE store_id = ${locked.storeId}
                FOR UPDATE
            ` as LicenseRow[];
            const current = attachModules(licenses, [], []);
            if (locked.kind === "plan_upgrade") {
                const activePaid = current.find((license) =>
                    license.sourceKind === "paid"
                    && license.revokedAt === null
                    && license.startsAt.getTime() <= input.now.getTime()
                    && input.now.getTime() < license.endsAt.getTime(),
                );
                if (!activePaid) {
                    return "overlapping-license";
                }
                await revokeActivePaidLicense(tx, activePaid.id, input.now);
            } else if (locked.kind === "plan_renewal") {
                await revokeScheduledPaidSuccessors(tx, locked.storeId, input.now);
            } else if (current.some((license) =>
                licensesOverlap(license, locked.intendedStartsAt, locked.intendedEndsAt),
            )) {
                return "overlapping-license";
            }

            await tx`
                INSERT INTO store_licenses (
                    id,
                    organization_id,
                    store_id,
                    source_kind,
                    plan_id,
                    plan_revision_id,
                    plan_key,
                    plan_display_name,
                    plan_type,
                    price_inr,
                    term_count,
                    term_unit,
                    starts_at,
                    ends_at,
                    commercial_quote_id,
                    created_by_user_id,
                    created_at
                ) VALUES (
                    ${input.licenseId},
                    ${locked.organizationId},
                    ${locked.storeId},
                    'paid',
                    ${locked.planId},
                    ${locked.planRevisionId},
                    ${locked.planKey},
                    ${locked.planDisplayName},
                    ${locked.planType},
                    ${locked.priceInr},
                    ${locked.term.count},
                    ${locked.term.unit},
                    ${locked.intendedStartsAt},
                    ${locked.intendedEndsAt},
                    ${locked.id},
                    ${locked.createdByUserId},
                    ${input.now}
                )
            `;
            await writeLicenseSnapshots(tx, input.licenseId, locked.modules);
            await tx`
                UPDATE commercial_quotes
                SET fulfilled_at = ${input.now}, fulfilled_license_id = ${input.licenseId}
                WHERE id = ${locked.id}
                  AND fulfilled_at IS NULL
            `;

            const created = (await loadLicensesForStore(tx, locked.storeId)).find(
                (license) => license.id === input.licenseId,
            );
            if (!created) {
                throw new Error("Failed to load fulfilled Store License");
            }
            return created;
        });
    } catch (error) {
        if (isUniqueViolation(error)) {
            const existing = (await listStoreLicenses(input.quote.storeId)).find(
                (license) => license.commercialQuoteId === input.quote.id,
            );
            return existing ?? "already-fulfilled";
        }
        throw error;
    }
};

const writeCoTermAddOnFeatureSnapshots = async (
    tx: SqlClient,
    addOnId: string,
    moduleItem: CommercialAccessSourceModuleSnapshot,
) => {
    for (const feature of moduleItem.features) {
        await tx`
            INSERT INTO store_co_term_add_on_feature_snapshots (
                add_on_id,
                feature_id,
                feature_revision_id,
                feature_key,
                feature_display_name
            ) VALUES (
                ${addOnId},
                ${feature.featureId},
                ${feature.featureRevisionId},
                ${feature.key},
                ${feature.displayName}
            )
        `;
    }
};

export const fulfillCoTermAddOnQuote = async (input: {
    addOnId: string;
    quote: CommercialQuoteRecord;
    now: Date;
}): Promise<StoreCoTermAddOnRecord | "already-fulfilled" | "duplicate-add-on"> => {
    try {
        return await pg.begin(async (tx) => {
            const lockedQuotes = await tx`
                SELECT ${quoteSelectColumns}
                FROM commercial_quotes
                WHERE id = ${input.quote.id}
                FOR UPDATE
            ` as QuoteRow[];
            const [locked] = await loadQuotes(tx, lockedQuotes);
            if (!locked) {
                throw new Error("Commercial Quote not found");
            }
            if (locked.fulfilledAt && locked.fulfilledCoTermAddOnId) {
                const existing = (await loadCoTermAddOnsForStore(tx, locked.storeId)).find(
                    (addOn) => addOn.id === locked.fulfilledCoTermAddOnId,
                );
                return existing ?? "already-fulfilled";
            }

            const addOns = await tx`
                SELECT
                    id,
                    organization_id,
                    store_id,
                    base_store_license_id,
                    module_id,
                    module_revision_id,
                    module_key,
                    module_display_name,
                    price_inr,
                    charged_amount_inr,
                    term_count,
                    term_unit,
                    starts_at,
                    ends_at,
                    commercial_quote_id,
                    revoked_at,
                    created_by_user_id,
                    created_at
                FROM store_co_term_add_ons
                WHERE store_id = ${locked.storeId}
                FOR UPDATE
            ` as CoTermAddOnRow[];

            const moduleKey = locked.moduleKey;
            if (!moduleKey) {
                return "duplicate-add-on";
            }

            const hasActiveDuplicate = addOns.some((addOn) =>
                addOn.module_key === moduleKey
                && addOn.revoked_at === null
                && toDate(addOn.starts_at).getTime() <= input.now.getTime()
                && input.now.getTime() < toDate(addOn.ends_at).getTime(),
            );
            if (hasActiveDuplicate) {
                return "duplicate-add-on";
            }

            const licenses = await tx`
                SELECT
                    id,
                    organization_id,
                    store_id,
                    source_kind,
                    plan_id,
                    plan_revision_id,
                    plan_key,
                    plan_display_name,
                    plan_type,
                    price_inr,
                    term_count,
                    term_unit,
                    starts_at,
                    ends_at,
                    revoked_at,
                    commercial_quote_id,
                    created_by_user_id,
                    created_at
                FROM store_licenses
                WHERE store_id = ${locked.storeId}
                FOR UPDATE
            ` as LicenseRow[];
            const activePaid = licenses.find((license) =>
                license.source_kind === "paid"
                && license.revoked_at === null
                && toDate(license.starts_at).getTime() <= input.now.getTime()
                && input.now.getTime() < toDate(license.ends_at).getTime(),
            );
            if (!activePaid || toDate(activePaid.ends_at).getTime() !== locked.intendedEndsAt.getTime()) {
                return "duplicate-add-on";
            }

            const [moduleItem] = locked.modules;
            if (!moduleItem || locked.moduleId === null) {
                return "duplicate-add-on";
            }

            await tx`
                INSERT INTO store_co_term_add_ons (
                    id,
                    organization_id,
                    store_id,
                    base_store_license_id,
                    module_id,
                    module_revision_id,
                    module_key,
                    module_display_name,
                    price_inr,
                    charged_amount_inr,
                    term_count,
                    term_unit,
                    starts_at,
                    ends_at,
                    commercial_quote_id,
                    created_by_user_id,
                    created_at
                ) VALUES (
                    ${input.addOnId},
                    ${locked.organizationId},
                    ${locked.storeId},
                    ${activePaid.id},
                    ${locked.moduleId},
                    ${locked.moduleRevisionId},
                    ${locked.moduleKey},
                    ${locked.moduleDisplayName},
                    ${locked.priceInr},
                    ${locked.amountInr},
                    ${locked.term.count},
                    ${locked.term.unit},
                    ${locked.intendedStartsAt},
                    ${locked.intendedEndsAt},
                    ${locked.id},
                    ${locked.createdByUserId},
                    ${input.now}
                )
            `;
            await writeCoTermAddOnFeatureSnapshots(tx, input.addOnId, moduleItem);
            await tx`
                UPDATE commercial_quotes
                SET fulfilled_at = ${input.now}, fulfilled_co_term_add_on_id = ${input.addOnId}
                WHERE id = ${locked.id}
                  AND fulfilled_at IS NULL
            `;

            const created = (await loadCoTermAddOnsForStore(tx, locked.storeId)).find(
                (addOn) => addOn.id === input.addOnId,
            );
            if (!created) {
                throw new Error("Failed to load fulfilled Co-Term Add-On");
            }
            return created;
        });
    } catch (error) {
        if (isUniqueViolation(error)) {
            const existing = (await listCoTermAddOnsForStore(input.quote.storeId)).find(
                (addOn) => addOn.commercialQuoteId === input.quote.id,
            );
            return existing ?? "already-fulfilled";
        }
        throw error;
    }
};

type RefundRow = {
    id: string;
    organization_id: string;
    store_id: string;
    quote_id: string;
    payment_event_id: string;
    access_source_kind: "store_license" | "co_term_add_on";
    access_source_id: string;
    razorpay_payment_id: string;
    razorpay_refund_id: string;
    amount_inr: string | number;
    amount_paise: number;
    currency: "INR";
    created_by_owner_user_id: string;
    created_at: string | Date;
};

type RevocationRow = {
    id: string;
    organization_id: string;
    store_id: string;
    commercial_refund_id: string;
    access_source_kind: "store_license" | "co_term_add_on";
    access_source_id: string;
    effective_ends_at: string | Date;
    recorded_at: string | Date;
    created_by_owner_user_id: string;
    created_at: string | Date;
};

const toRefundRecord = (row: RefundRow): CommercialRefundRecord => ({
    id: row.id,
    organizationId: row.organization_id,
    storeId: row.store_id,
    quoteId: row.quote_id,
    paymentEventId: row.payment_event_id,
    accessSourceKind: row.access_source_kind,
    accessSourceId: row.access_source_id,
    razorpayPaymentId: row.razorpay_payment_id,
    razorpayRefundId: row.razorpay_refund_id,
    amountInr: Number(row.amount_inr),
    amountPaise: Number(row.amount_paise),
    currency: row.currency,
    createdByOwnerUserId: row.created_by_owner_user_id,
    createdAt: toDate(row.created_at),
});

const toRevocationRecord = (row: RevocationRow): LicenseRevocationRecord => ({
    id: row.id,
    organizationId: row.organization_id,
    storeId: row.store_id,
    commercialRefundId: row.commercial_refund_id,
    accessSourceKind: row.access_source_kind,
    accessSourceId: row.access_source_id,
    effectiveEndsAt: toDate(row.effective_ends_at),
    recordedAt: toDate(row.recorded_at),
    createdByOwnerUserId: row.created_by_owner_user_id,
    createdAt: toDate(row.created_at),
});

export const listCommercialRefundsForStore = async (storeId: string): Promise<CommercialRefundRecord[]> => {
    const rows = await pg`
        SELECT
            id,
            organization_id,
            store_id,
            quote_id,
            payment_event_id,
            access_source_kind,
            access_source_id,
            razorpay_payment_id,
            razorpay_refund_id,
            amount_inr,
            amount_paise,
            currency,
            created_by_owner_user_id,
            created_at
        FROM commercial_refunds
        WHERE store_id = ${storeId}
        ORDER BY created_at DESC, id DESC
    ` as RefundRow[];
    return rows.map(toRefundRecord);
};

export const listLicenseRevocationsForStore = async (storeId: string): Promise<LicenseRevocationRecord[]> => {
    const rows = await pg`
        SELECT
            id,
            organization_id,
            store_id,
            commercial_refund_id,
            access_source_kind,
            access_source_id,
            effective_ends_at,
            recorded_at,
            created_by_owner_user_id,
            created_at
        FROM license_revocations
        WHERE store_id = ${storeId}
        ORDER BY created_at DESC, id DESC
    ` as RevocationRow[];
    return rows.map(toRevocationRecord);
};

export const getCommercialPaymentEventById = async (
    eventId: string,
): Promise<CommercialPaymentEventRecord | null> => {
    const [row] = await pg`
        SELECT
            id,
            razorpay_event_id,
            event_type,
            razorpay_order_id,
            razorpay_payment_id,
            amount_paise,
            currency,
            quote_id,
            fulfillment_status,
            fulfillment_error,
            payload,
            created_at,
            processed_at
        FROM commercial_payment_events
        WHERE id = ${eventId}
        LIMIT 1
    ` as PaymentEventRow[];
    return row ? toPaymentEvent(row) : null;
};

export const insertCommercialRefundAndRevocation = async (input: {
    refund: CommercialRefundRecord;
    revocation: LicenseRevocationRecord;
}): Promise<
    | { refund: CommercialRefundRecord; revocation: LicenseRevocationRecord }
    | "duplicate-refund"
    | "duplicate-revocation"
    | "access-source-not-found"
> => {
    try {
        return await pg.begin(async (tx) => {
            if (input.revocation.accessSourceKind === "store_license") {
                const [license] = await tx`
                    SELECT id
                    FROM store_licenses
                    WHERE id = ${input.revocation.accessSourceId}
                      AND store_id = ${input.revocation.storeId}
                      AND source_kind = 'paid'
                      AND revoked_at IS NULL
                    FOR UPDATE
                ` as Array<{ id: string }>;
                if (!license) {
                    return "access-source-not-found";
                }
                await tx`
                    UPDATE store_licenses
                    SET revoked_at = ${input.revocation.effectiveEndsAt}
                    WHERE id = ${input.revocation.accessSourceId}
                `;
            } else {
                const [addOn] = await tx`
                    SELECT id
                    FROM store_co_term_add_ons
                    WHERE id = ${input.revocation.accessSourceId}
                      AND store_id = ${input.revocation.storeId}
                      AND revoked_at IS NULL
                    FOR UPDATE
                ` as Array<{ id: string }>;
                if (!addOn) {
                    return "access-source-not-found";
                }
                await tx`
                    UPDATE store_co_term_add_ons
                    SET revoked_at = ${input.revocation.effectiveEndsAt}
                    WHERE id = ${input.revocation.accessSourceId}
                `;
            }

            await tx`
                INSERT INTO commercial_refunds (
                    id,
                    organization_id,
                    store_id,
                    quote_id,
                    payment_event_id,
                    access_source_kind,
                    access_source_id,
                    razorpay_payment_id,
                    razorpay_refund_id,
                    amount_inr,
                    amount_paise,
                    currency,
                    created_by_owner_user_id,
                    created_at
                ) VALUES (
                    ${input.refund.id},
                    ${input.refund.organizationId},
                    ${input.refund.storeId},
                    ${input.refund.quoteId},
                    ${input.refund.paymentEventId},
                    ${input.refund.accessSourceKind},
                    ${input.refund.accessSourceId},
                    ${input.refund.razorpayPaymentId},
                    ${input.refund.razorpayRefundId},
                    ${input.refund.amountInr},
                    ${input.refund.amountPaise},
                    ${input.refund.currency},
                    ${input.refund.createdByOwnerUserId},
                    ${input.refund.createdAt}
                )
            `;

            await tx`
                INSERT INTO license_revocations (
                    id,
                    organization_id,
                    store_id,
                    commercial_refund_id,
                    access_source_kind,
                    access_source_id,
                    effective_ends_at,
                    recorded_at,
                    created_by_owner_user_id,
                    created_at
                ) VALUES (
                    ${input.revocation.id},
                    ${input.revocation.organizationId},
                    ${input.revocation.storeId},
                    ${input.revocation.commercialRefundId},
                    ${input.revocation.accessSourceKind},
                    ${input.revocation.accessSourceId},
                    ${input.revocation.effectiveEndsAt},
                    ${input.revocation.recordedAt},
                    ${input.revocation.createdByOwnerUserId},
                    ${input.revocation.createdAt}
                )
            `;

            return {
                refund: input.refund,
                revocation: input.revocation,
            };
        });
    } catch (error) {
        if (!isUniqueViolation(error)) {
            throw error;
        }
        const existingRefund = (await listCommercialRefundsForStore(input.refund.storeId))
            .find((refund) => refund.paymentEventId === input.refund.paymentEventId);
        if (existingRefund) {
            return "duplicate-refund";
        }
        return "duplicate-revocation";
    }
};
