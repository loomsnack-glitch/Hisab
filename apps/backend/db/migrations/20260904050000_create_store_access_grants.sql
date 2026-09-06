-- migrate:up

CREATE TABLE commercial_enforcement_launch (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    launched_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE store_access_grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    store_id UUID NOT NULL,
    origin VARCHAR(32) NOT NULL,
    term_kind VARCHAR(32) NOT NULL,
    selection_kind VARCHAR(32) NOT NULL,
    plan_id UUID REFERENCES commercial_plans (id),
    plan_revision_id UUID REFERENCES commercial_plan_revisions (id),
    plan_key VARCHAR(64),
    plan_display_name VARCHAR(255),
    plan_type VARCHAR(32),
    term_count INTEGER NOT NULL,
    term_unit VARCHAR(16) NOT NULL,
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_by_owner_user_id UUID REFERENCES console_users (id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    FOREIGN KEY (store_id, organization_id) REFERENCES stores (id, organization_id) ON DELETE CASCADE,
    CONSTRAINT store_access_grants_origin CHECK (origin IN ('legacy_migration', 'administrator')),
    CONSTRAINT store_access_grants_term_kind CHECK (
        term_kind IN ('seven_day', 'extended', 'complimentary', 'custom_range')
    ),
    CONSTRAINT store_access_grants_selection_kind CHECK (
        selection_kind IN ('plan', 'module', 'all_current_modules')
    ),
    CONSTRAINT store_access_grants_plan_type CHECK (plan_type IS NULL OR plan_type IN ('trial', 'paid')),
    CONSTRAINT store_access_grants_term CHECK (
        term_count >= 1
        AND term_unit IN ('day', 'month', 'year')
        AND ends_at > starts_at
    ),
    CONSTRAINT store_access_grants_key_format CHECK (
        plan_key IS NULL OR plan_key ~ '^[a-z][a-z0-9_]{0,63}$'
    ),
    CONSTRAINT store_access_grants_origin_shape CHECK (
        (
            origin = 'legacy_migration'
            AND created_by_owner_user_id IS NULL
            AND selection_kind = 'all_current_modules'
            AND term_kind = 'complimentary'
            AND plan_id IS NULL
            AND plan_revision_id IS NULL
            AND plan_key IS NULL
        )
        OR (
            origin = 'administrator'
            AND created_by_owner_user_id IS NOT NULL
            AND selection_kind IN ('plan', 'module')
        )
    )
);

CREATE UNIQUE INDEX store_access_grants_one_legacy_migration_per_store
    ON store_access_grants (store_id)
    WHERE origin = 'legacy_migration';

CREATE INDEX store_access_grants_store_timeline_idx
    ON store_access_grants (store_id, starts_at DESC);

CREATE TABLE store_access_grant_module_snapshots (
    grant_id UUID NOT NULL REFERENCES store_access_grants (id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES commercial_modules (id),
    module_revision_id UUID NOT NULL REFERENCES commercial_module_revisions (id),
    module_key VARCHAR(64) NOT NULL,
    module_display_name VARCHAR(255) NOT NULL,
    PRIMARY KEY (grant_id, module_id),
    CONSTRAINT store_access_grant_module_snapshots_key_format CHECK (module_key ~ '^[a-z][a-z0-9_]{0,63}$')
);

CREATE TABLE store_access_grant_feature_snapshots (
    grant_id UUID NOT NULL REFERENCES store_access_grants (id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES commercial_modules (id),
    feature_id UUID NOT NULL REFERENCES commercial_features (id),
    feature_revision_id UUID NOT NULL REFERENCES commercial_feature_revisions (id),
    feature_key VARCHAR(64) NOT NULL,
    feature_display_name VARCHAR(255) NOT NULL,
    PRIMARY KEY (grant_id, module_id, feature_id),
    CONSTRAINT store_access_grant_feature_snapshots_key_format CHECK (feature_key ~ '^[a-z][a-z0-9_]{0,63}$')
);

CREATE INDEX store_access_grant_feature_snapshots_feature_key_idx
    ON store_access_grant_feature_snapshots (feature_key);

-- migrate:down

DROP TABLE IF EXISTS store_access_grant_feature_snapshots;
DROP TABLE IF EXISTS store_access_grant_module_snapshots;
DROP TABLE IF EXISTS store_access_grants;
DROP TABLE IF EXISTS commercial_enforcement_launch;
