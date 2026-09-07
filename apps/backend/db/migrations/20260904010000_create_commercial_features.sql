-- migrate:up

CREATE TYPE commercial_catalog_revision_status AS ENUM ('draft', 'active', 'retired', 'discarded');

CREATE TABLE commercial_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(64) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT commercial_features_key_format CHECK (key ~ '^[a-z][a-z0-9_]{0,63}$')
);

CREATE TABLE commercial_feature_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_id UUID NOT NULL REFERENCES commercial_features (id),
    revision_number INTEGER NOT NULL,
    status commercial_catalog_revision_status NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_by_owner_user_id UUID NOT NULL REFERENCES console_users (id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    published_by_owner_user_id UUID REFERENCES console_users (id),
    published_at TIMESTAMP WITH TIME ZONE,
    retired_by_owner_user_id UUID REFERENCES console_users (id),
    retired_at TIMESTAMP WITH TIME ZONE,
    discarded_by_owner_user_id UUID REFERENCES console_users (id),
    discarded_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT commercial_feature_revisions_feature_revision_unique UNIQUE (feature_id, revision_number),
    CONSTRAINT commercial_feature_revisions_revision_number_positive CHECK (revision_number >= 1),
    CONSTRAINT commercial_feature_revisions_display_name_not_blank CHECK (length(btrim(display_name)) > 0),
    CONSTRAINT commercial_feature_revisions_status_audit CHECK (
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

CREATE UNIQUE INDEX commercial_feature_revisions_one_draft
    ON commercial_feature_revisions (feature_id)
    WHERE status = 'draft';

CREATE UNIQUE INDEX commercial_feature_revisions_one_active
    ON commercial_feature_revisions (feature_id)
    WHERE status = 'active';

CREATE INDEX commercial_feature_revisions_feature_id_idx
    ON commercial_feature_revisions (feature_id, revision_number DESC);

-- migrate:down

DROP TABLE IF EXISTS commercial_feature_revisions;
DROP TABLE IF EXISTS commercial_features;
DROP TYPE IF EXISTS commercial_catalog_revision_status;
