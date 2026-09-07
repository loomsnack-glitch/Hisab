-- migrate:up

CREATE TABLE store_licenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    store_id UUID NOT NULL,
    source_kind VARCHAR(32) NOT NULL,
    plan_id UUID NOT NULL REFERENCES commercial_plans (id),
    plan_revision_id UUID NOT NULL REFERENCES commercial_plan_revisions (id),
    plan_key VARCHAR(64) NOT NULL,
    plan_display_name VARCHAR(255) NOT NULL,
    plan_type VARCHAR(32) NOT NULL,
    price_inr NUMERIC(10, 2) NOT NULL,
    term_count INTEGER NOT NULL,
    term_unit VARCHAR(16) NOT NULL,
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_by_user_id UUID NOT NULL REFERENCES users (id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    FOREIGN KEY (store_id, organization_id) REFERENCES stores (id, organization_id) ON DELETE CASCADE,
    CONSTRAINT store_licenses_source_kind CHECK (source_kind IN ('trial', 'paid')),
    CONSTRAINT store_licenses_plan_type CHECK (plan_type IN ('trial', 'paid')),
    CONSTRAINT store_licenses_term CHECK (
        term_count >= 1
        AND term_unit IN ('day', 'month', 'year')
        AND ends_at > starts_at
    ),
    CONSTRAINT store_licenses_key_format CHECK (plan_key ~ '^[a-z][a-z0-9_]{0,63}$')
);

CREATE UNIQUE INDEX store_licenses_one_self_service_trial_per_store
    ON store_licenses (store_id)
    WHERE source_kind = 'trial';

CREATE INDEX store_licenses_store_timeline_idx
    ON store_licenses (store_id, starts_at DESC);

CREATE TABLE store_license_module_snapshots (
    license_id UUID NOT NULL REFERENCES store_licenses (id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES commercial_modules (id),
    module_revision_id UUID NOT NULL REFERENCES commercial_module_revisions (id),
    module_key VARCHAR(64) NOT NULL,
    module_display_name VARCHAR(255) NOT NULL,
    PRIMARY KEY (license_id, module_id),
    CONSTRAINT store_license_module_snapshots_key_format CHECK (module_key ~ '^[a-z][a-z0-9_]{0,63}$')
);

CREATE TABLE store_license_feature_snapshots (
    license_id UUID NOT NULL REFERENCES store_licenses (id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES commercial_modules (id),
    feature_id UUID NOT NULL REFERENCES commercial_features (id),
    feature_revision_id UUID NOT NULL REFERENCES commercial_feature_revisions (id),
    feature_key VARCHAR(64) NOT NULL,
    feature_display_name VARCHAR(255) NOT NULL,
    PRIMARY KEY (license_id, module_id, feature_id),
    CONSTRAINT store_license_feature_snapshots_key_format CHECK (feature_key ~ '^[a-z][a-z0-9_]{0,63}$')
);

CREATE INDEX store_license_feature_snapshots_feature_key_idx
    ON store_license_feature_snapshots (feature_key);

-- migrate:down

DROP TABLE IF EXISTS store_license_feature_snapshots;
DROP TABLE IF EXISTS store_license_module_snapshots;
DROP TABLE IF EXISTS store_licenses;
