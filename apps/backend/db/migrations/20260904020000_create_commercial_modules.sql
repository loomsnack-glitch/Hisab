-- migrate:up

CREATE TABLE commercial_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(64) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT commercial_modules_key_format CHECK (key ~ '^[a-z][a-z0-9_]{0,63}$')
);

CREATE TABLE commercial_module_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES commercial_modules (id),
    revision_number INTEGER NOT NULL,
    status commercial_catalog_revision_status NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    is_separately_purchasable BOOLEAN NOT NULL DEFAULT FALSE,
    price_inr NUMERIC(10, 2),
    term_count INTEGER,
    term_unit VARCHAR(16),
    created_by_owner_user_id UUID NOT NULL REFERENCES console_users (id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    published_by_owner_user_id UUID REFERENCES console_users (id),
    published_at TIMESTAMP WITH TIME ZONE,
    retired_by_owner_user_id UUID REFERENCES console_users (id),
    retired_at TIMESTAMP WITH TIME ZONE,
    discarded_by_owner_user_id UUID REFERENCES console_users (id),
    discarded_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT commercial_module_revisions_module_revision_unique UNIQUE (module_id, revision_number),
    CONSTRAINT commercial_module_revisions_revision_number_positive CHECK (revision_number >= 1),
    CONSTRAINT commercial_module_revisions_display_name_not_blank CHECK (length(btrim(display_name)) > 0),
    CONSTRAINT commercial_module_revisions_purchasable_terms CHECK (
        (
            is_separately_purchasable = FALSE
            AND price_inr IS NULL
            AND term_count IS NULL
            AND term_unit IS NULL
        )
        OR (
            is_separately_purchasable = TRUE
            AND price_inr IS NOT NULL
            AND price_inr >= 0
            AND term_count IS NOT NULL
            AND term_count >= 1
            AND term_unit IN ('day', 'month', 'year')
        )
    ),
    CONSTRAINT commercial_module_revisions_status_audit CHECK (
        (
            status = 'draft'
            AND published_at IS NULL
            AND published_by_owner_user_id IS NULL
            AND retired_at IS NULL
            AND retired_by_owner_user_id IS NULL
            AND discarded_at IS NULL
            AND discarded_by_owner_user_id IS NULL
        )
        OR (
            status = 'active'
            AND published_at IS NOT NULL
            AND published_by_owner_user_id IS NOT NULL
            AND retired_at IS NULL
            AND retired_by_owner_user_id IS NULL
            AND discarded_at IS NULL
            AND discarded_by_owner_user_id IS NULL
        )
        OR (
            status = 'retired'
            AND published_at IS NOT NULL
            AND published_by_owner_user_id IS NOT NULL
            AND retired_at IS NOT NULL
            AND retired_by_owner_user_id IS NOT NULL
            AND discarded_at IS NULL
            AND discarded_by_owner_user_id IS NULL
        )
        OR (
            status = 'discarded'
            AND published_at IS NULL
            AND published_by_owner_user_id IS NULL
            AND retired_at IS NULL
            AND retired_by_owner_user_id IS NULL
            AND discarded_at IS NOT NULL
            AND discarded_by_owner_user_id IS NOT NULL
        )
    )
);

CREATE TABLE commercial_module_revision_features (
    module_revision_id UUID NOT NULL REFERENCES commercial_module_revisions (id),
    feature_revision_id UUID NOT NULL REFERENCES commercial_feature_revisions (id),
    feature_id UUID NOT NULL REFERENCES commercial_features (id),
    PRIMARY KEY (module_revision_id, feature_revision_id),
    CONSTRAINT commercial_module_revision_features_one_feature UNIQUE (module_revision_id, feature_id)
);

CREATE UNIQUE INDEX commercial_module_revisions_one_draft
    ON commercial_module_revisions (module_id)
    WHERE status = 'draft';

CREATE UNIQUE INDEX commercial_module_revisions_one_active
    ON commercial_module_revisions (module_id)
    WHERE status = 'active';

CREATE INDEX commercial_module_revisions_module_id_idx
    ON commercial_module_revisions (module_id, revision_number DESC);

CREATE INDEX commercial_module_revision_features_feature_revision_idx
    ON commercial_module_revision_features (feature_revision_id);

CREATE INDEX commercial_module_revision_features_feature_id_idx
    ON commercial_module_revision_features (feature_id);

-- migrate:down

DROP TABLE IF EXISTS commercial_module_revision_features;
DROP TABLE IF EXISTS commercial_module_revisions;
DROP TABLE IF EXISTS commercial_modules;
