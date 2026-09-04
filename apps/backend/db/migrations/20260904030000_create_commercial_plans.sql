-- migrate:up

CREATE TABLE commercial_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(64) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT commercial_plans_key_format CHECK (key ~ '^[a-z][a-z0-9_]{0,63}$')
);

CREATE TABLE commercial_plan_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES commercial_plans (id),
    revision_number INTEGER NOT NULL,
    status commercial_catalog_revision_status NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    plan_type VARCHAR(32) NOT NULL,
    price_inr NUMERIC(10, 2) NOT NULL,
    term_count INTEGER NOT NULL,
    term_unit VARCHAR(16) NOT NULL,
    created_by_owner_user_id UUID NOT NULL REFERENCES console_users (id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    published_by_owner_user_id UUID REFERENCES console_users (id),
    published_at TIMESTAMP WITH TIME ZONE,
    retired_by_owner_user_id UUID REFERENCES console_users (id),
    retired_at TIMESTAMP WITH TIME ZONE,
    discarded_by_owner_user_id UUID REFERENCES console_users (id),
    discarded_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT commercial_plan_revisions_plan_revision_unique UNIQUE (plan_id, revision_number),
    CONSTRAINT commercial_plan_revisions_revision_number_positive CHECK (revision_number >= 1),
    CONSTRAINT commercial_plan_revisions_display_name_not_blank CHECK (length(btrim(display_name)) > 0),
    CONSTRAINT commercial_plan_revisions_type CHECK (plan_type IN ('trial', 'paid')),
    CONSTRAINT commercial_plan_revisions_term CHECK (
        term_count >= 1
        AND term_unit IN ('day', 'month', 'year')
    ),
    CONSTRAINT commercial_plan_revisions_price CHECK (
        (
            plan_type = 'trial'
            AND price_inr = 0
        )
        OR (
            plan_type = 'paid'
            AND price_inr > 0
        )
    ),
    CONSTRAINT commercial_plan_revisions_status_audit CHECK (
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

CREATE TABLE commercial_plan_revision_modules (
    plan_revision_id UUID NOT NULL REFERENCES commercial_plan_revisions (id),
    module_revision_id UUID NOT NULL REFERENCES commercial_module_revisions (id),
    module_id UUID NOT NULL REFERENCES commercial_modules (id),
    PRIMARY KEY (plan_revision_id, module_revision_id),
    CONSTRAINT commercial_plan_revision_modules_one_module UNIQUE (plan_revision_id, module_id)
);

CREATE UNIQUE INDEX commercial_plan_revisions_one_draft
    ON commercial_plan_revisions (plan_id)
    WHERE status = 'draft';

CREATE UNIQUE INDEX commercial_plan_revisions_one_active
    ON commercial_plan_revisions (plan_id)
    WHERE status = 'active';

CREATE INDEX commercial_plan_revisions_plan_id_idx
    ON commercial_plan_revisions (plan_id, revision_number DESC);

CREATE INDEX commercial_plan_revision_modules_module_revision_idx
    ON commercial_plan_revision_modules (module_revision_id);

CREATE INDEX commercial_plan_revision_modules_module_id_idx
    ON commercial_plan_revision_modules (module_id);

-- migrate:down

DROP TABLE IF EXISTS commercial_plan_revision_modules;
DROP TABLE IF EXISTS commercial_plan_revisions;
DROP TABLE IF EXISTS commercial_plans;
