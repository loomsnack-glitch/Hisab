import { sql } from "bun";
import type {
    ActiveTrialPlanSnapshot,
    CommercialAccessSourceModuleSnapshot,
    CommercialAccessSourceRecord,
    StoreLicenseRecord,
} from "@repo/types";
import { pg } from "@/config/db";

type SqlClient = typeof pg | Bun.TransactionSQL;

const isUniqueViolation = (error: unknown) =>
    typeof error === "object" && error !== null && "code" in error && error.code === "23505";

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

export const listAccessSourcesForStore = async (storeId: string): Promise<CommercialAccessSourceRecord[]> =>
    (await loadLicensesForStore(pg, storeId)).map(toAccessSource);

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
