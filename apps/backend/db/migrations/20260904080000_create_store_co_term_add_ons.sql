-- migrate:up

ALTER TABLE commercial_quotes
    DROP CONSTRAINT commercial_quotes_kind;

ALTER TABLE commercial_quotes
    ADD COLUMN module_id UUID REFERENCES commercial_modules (id),
    ADD COLUMN module_revision_id UUID REFERENCES commercial_module_revisions (id),
    ADD COLUMN module_key VARCHAR(64),
    ADD COLUMN module_display_name VARCHAR(255),
    ADD COLUMN fulfilled_co_term_add_on_id UUID;

ALTER TABLE commercial_quotes
    ALTER COLUMN plan_id DROP NOT NULL,
    ALTER COLUMN plan_revision_id DROP NOT NULL,
    ALTER COLUMN plan_key DROP NOT NULL,
    ALTER COLUMN plan_display_name DROP NOT NULL,
    ALTER COLUMN plan_type DROP NOT NULL;

ALTER TABLE commercial_quotes
    ADD CONSTRAINT commercial_quotes_kind CHECK (
        kind IN ('paid_plan', 'plan_renewal', 'plan_upgrade', 'co_term_add_on')
    );

ALTER TABLE commercial_quotes
    ADD CONSTRAINT commercial_quotes_selection CHECK (
        (
            kind IN ('paid_plan', 'plan_renewal', 'plan_upgrade')
            AND plan_id IS NOT NULL
            AND plan_revision_id IS NOT NULL
            AND plan_key IS NOT NULL
            AND plan_display_name IS NOT NULL
            AND plan_type = 'paid'
            AND module_id IS NULL
            AND module_revision_id IS NULL
            AND module_key IS NULL
            AND module_display_name IS NULL
        )
        OR (
            kind = 'co_term_add_on'
            AND plan_id IS NULL
            AND plan_revision_id IS NULL
            AND plan_key IS NULL
            AND plan_display_name IS NULL
            AND plan_type IS NULL
            AND module_id IS NOT NULL
            AND module_revision_id IS NOT NULL
            AND module_key IS NOT NULL
            AND module_display_name IS NOT NULL
        )
    );

ALTER TABLE commercial_quotes
    ADD CONSTRAINT commercial_quotes_module_key_format CHECK (
        module_key IS NULL
        OR module_key ~ '^[a-z][a-z0-9_]{0,63}$'
    );

CREATE TABLE store_co_term_add_ons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    store_id UUID NOT NULL,
    base_store_license_id UUID NOT NULL REFERENCES store_licenses (id),
    module_id UUID NOT NULL REFERENCES commercial_modules (id),
    module_revision_id UUID NOT NULL REFERENCES commercial_module_revisions (id),
    module_key VARCHAR(64) NOT NULL,
    module_display_name VARCHAR(255) NOT NULL,
    price_inr NUMERIC(10, 2) NOT NULL,
    charged_amount_inr NUMERIC(10, 2) NOT NULL,
    term_count INTEGER NOT NULL,
    term_unit VARCHAR(16) NOT NULL,
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
    commercial_quote_id UUID NOT NULL REFERENCES commercial_quotes (id),
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_by_user_id UUID NOT NULL REFERENCES users (id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    FOREIGN KEY (store_id, organization_id) REFERENCES stores (id, organization_id) ON DELETE CASCADE,
    CONSTRAINT store_co_term_add_ons_module_key_format CHECK (module_key ~ '^[a-z][a-z0-9_]{0,63}$'),
    CONSTRAINT store_co_term_add_ons_term CHECK (
        term_count >= 1
        AND term_unit IN ('day', 'month', 'year')
        AND ends_at > starts_at
    ),
    CONSTRAINT store_co_term_add_ons_amounts CHECK (
        price_inr >= 0
        AND charged_amount_inr >= 0
        AND charged_amount_inr <= price_inr
    )
);

CREATE TABLE store_co_term_add_on_feature_snapshots (
    add_on_id UUID NOT NULL REFERENCES store_co_term_add_ons (id) ON DELETE CASCADE,
    feature_id UUID NOT NULL REFERENCES commercial_features (id),
    feature_revision_id UUID NOT NULL REFERENCES commercial_feature_revisions (id),
    feature_key VARCHAR(64) NOT NULL,
    feature_display_name VARCHAR(255) NOT NULL,
    PRIMARY KEY (add_on_id, feature_id),
    CONSTRAINT store_co_term_add_on_feature_snapshots_key_format CHECK (feature_key ~ '^[a-z][a-z0-9_]{0,63}$')
);

CREATE UNIQUE INDEX store_co_term_add_ons_commercial_quote_id_uidx
    ON store_co_term_add_ons (commercial_quote_id);

CREATE INDEX store_co_term_add_ons_store_created_idx
    ON store_co_term_add_ons (store_id, created_at DESC);

CREATE UNIQUE INDEX store_co_term_add_ons_one_active_module
    ON store_co_term_add_ons (store_id, module_id)
    WHERE revoked_at IS NULL;

ALTER TABLE commercial_quotes
    ADD CONSTRAINT commercial_quotes_fulfilled_co_term_add_on_fk
    FOREIGN KEY (fulfilled_co_term_add_on_id) REFERENCES store_co_term_add_ons (id);

-- migrate:down

ALTER TABLE commercial_quotes DROP CONSTRAINT IF EXISTS commercial_quotes_fulfilled_co_term_add_on_fk;
DROP TABLE IF EXISTS store_co_term_add_on_feature_snapshots;
DROP TABLE IF EXISTS store_co_term_add_ons;

ALTER TABLE commercial_quotes
    DROP CONSTRAINT IF EXISTS commercial_quotes_module_key_format,
    DROP CONSTRAINT IF EXISTS commercial_quotes_selection;

ALTER TABLE commercial_quotes
    DROP COLUMN IF EXISTS fulfilled_co_term_add_on_id,
    DROP COLUMN IF EXISTS module_display_name,
    DROP COLUMN IF EXISTS module_key,
    DROP COLUMN IF EXISTS module_revision_id,
    DROP COLUMN IF EXISTS module_id;

UPDATE commercial_quotes
SET
    plan_id = COALESCE(plan_id, (SELECT id FROM commercial_plans LIMIT 1)),
    plan_revision_id = COALESCE(plan_revision_id, (SELECT id FROM commercial_plan_revisions LIMIT 1)),
    plan_key = COALESCE(plan_key, 'core'),
    plan_display_name = COALESCE(plan_display_name, 'Core'),
    plan_type = COALESCE(plan_type, 'paid')
WHERE plan_id IS NULL;

ALTER TABLE commercial_quotes
    ALTER COLUMN plan_id SET NOT NULL,
    ALTER COLUMN plan_revision_id SET NOT NULL,
    ALTER COLUMN plan_key SET NOT NULL,
    ALTER COLUMN plan_display_name SET NOT NULL,
    ALTER COLUMN plan_type SET NOT NULL;

ALTER TABLE commercial_quotes
    DROP CONSTRAINT IF EXISTS commercial_quotes_kind;

ALTER TABLE commercial_quotes
    ADD CONSTRAINT commercial_quotes_kind CHECK (
        kind IN ('paid_plan', 'plan_renewal', 'plan_upgrade')
    );
