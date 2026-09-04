-- migrate:up

ALTER TABLE store_licenses
    ADD COLUMN commercial_quote_id UUID;

CREATE TABLE commercial_quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    store_id UUID NOT NULL,
    kind VARCHAR(32) NOT NULL,
    plan_id UUID NOT NULL REFERENCES commercial_plans (id),
    plan_revision_id UUID NOT NULL REFERENCES commercial_plan_revisions (id),
    plan_key VARCHAR(64) NOT NULL,
    plan_display_name VARCHAR(255) NOT NULL,
    plan_type VARCHAR(32) NOT NULL,
    price_inr NUMERIC(10, 2) NOT NULL,
    amount_inr NUMERIC(10, 2) NOT NULL,
    amount_paise INTEGER NOT NULL,
    currency VARCHAR(8) NOT NULL,
    term_count INTEGER NOT NULL,
    term_unit VARCHAR(16) NOT NULL,
    license_timing VARCHAR(32) NOT NULL,
    intended_starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
    intended_ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
    razorpay_order_id VARCHAR(64) NOT NULL,
    razorpay_receipt VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    fulfilled_at TIMESTAMP WITH TIME ZONE,
    fulfilled_license_id UUID,
    created_by_user_id UUID NOT NULL REFERENCES users (id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    FOREIGN KEY (store_id, organization_id) REFERENCES stores (id, organization_id) ON DELETE CASCADE,
    CONSTRAINT commercial_quotes_kind CHECK (kind = 'paid_plan'),
    CONSTRAINT commercial_quotes_plan_type CHECK (plan_type = 'paid'),
    CONSTRAINT commercial_quotes_currency CHECK (currency = 'INR'),
    CONSTRAINT commercial_quotes_license_timing CHECK (license_timing IN ('immediate', 'scheduled')),
    CONSTRAINT commercial_quotes_amounts CHECK (
        price_inr >= 0
        AND amount_inr >= 0
        AND amount_paise >= 0
        AND amount_paise = ROUND(amount_inr * 100)
    ),
    CONSTRAINT commercial_quotes_term CHECK (
        term_count >= 1
        AND term_unit IN ('day', 'month', 'year')
        AND intended_ends_at > intended_starts_at
        AND expires_at > created_at
    ),
    CONSTRAINT commercial_quotes_key_format CHECK (plan_key ~ '^[a-z][a-z0-9_]{0,63}$')
);

CREATE UNIQUE INDEX commercial_quotes_razorpay_order_id_uidx
    ON commercial_quotes (razorpay_order_id);

CREATE INDEX commercial_quotes_store_created_idx
    ON commercial_quotes (store_id, created_at DESC);

CREATE TABLE commercial_quote_line_items (
    quote_id UUID NOT NULL REFERENCES commercial_quotes (id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    description TEXT NOT NULL,
    amount_inr NUMERIC(10, 2) NOT NULL,
    PRIMARY KEY (quote_id, position),
    CONSTRAINT commercial_quote_line_items_position CHECK (position >= 1),
    CONSTRAINT commercial_quote_line_items_amount CHECK (amount_inr >= 0)
);

CREATE TABLE commercial_quote_module_snapshots (
    quote_id UUID NOT NULL REFERENCES commercial_quotes (id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES commercial_modules (id),
    module_revision_id UUID NOT NULL REFERENCES commercial_module_revisions (id),
    module_key VARCHAR(64) NOT NULL,
    module_display_name VARCHAR(255) NOT NULL,
    PRIMARY KEY (quote_id, module_id),
    CONSTRAINT commercial_quote_module_snapshots_key_format CHECK (module_key ~ '^[a-z][a-z0-9_]{0,63}$')
);

CREATE TABLE commercial_quote_feature_snapshots (
    quote_id UUID NOT NULL REFERENCES commercial_quotes (id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES commercial_modules (id),
    feature_id UUID NOT NULL REFERENCES commercial_features (id),
    feature_revision_id UUID NOT NULL REFERENCES commercial_feature_revisions (id),
    feature_key VARCHAR(64) NOT NULL,
    feature_display_name VARCHAR(255) NOT NULL,
    PRIMARY KEY (quote_id, module_id, feature_id),
    CONSTRAINT commercial_quote_feature_snapshots_key_format CHECK (feature_key ~ '^[a-z][a-z0-9_]{0,63}$')
);

CREATE TABLE commercial_payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    razorpay_event_id VARCHAR(128) NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    razorpay_order_id VARCHAR(64),
    razorpay_payment_id VARCHAR(64),
    amount_paise INTEGER,
    currency VARCHAR(8),
    quote_id UUID REFERENCES commercial_quotes (id),
    fulfillment_status VARCHAR(32) NOT NULL,
    fulfillment_error TEXT,
    payload JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT commercial_payment_events_fulfillment_status CHECK (
        fulfillment_status IN ('received', 'fulfilled', 'ignored', 'mismatched', 'failed')
    )
);

CREATE UNIQUE INDEX commercial_payment_events_razorpay_event_id_uidx
    ON commercial_payment_events (razorpay_event_id);

CREATE INDEX commercial_payment_events_quote_idx
    ON commercial_payment_events (quote_id, created_at DESC);

ALTER TABLE store_licenses
    ADD CONSTRAINT store_licenses_commercial_quote_fk
    FOREIGN KEY (commercial_quote_id) REFERENCES commercial_quotes (id);

ALTER TABLE commercial_quotes
    ADD CONSTRAINT commercial_quotes_fulfilled_license_fk
    FOREIGN KEY (fulfilled_license_id) REFERENCES store_licenses (id);

CREATE UNIQUE INDEX store_licenses_one_paid_license_per_quote
    ON store_licenses (commercial_quote_id)
    WHERE commercial_quote_id IS NOT NULL;

-- migrate:down

DROP INDEX IF EXISTS store_licenses_one_paid_license_per_quote;
ALTER TABLE commercial_quotes DROP CONSTRAINT IF EXISTS commercial_quotes_fulfilled_license_fk;
ALTER TABLE store_licenses DROP CONSTRAINT IF EXISTS store_licenses_commercial_quote_fk;
DROP TABLE IF EXISTS commercial_payment_events;
DROP TABLE IF EXISTS commercial_quote_feature_snapshots;
DROP TABLE IF EXISTS commercial_quote_module_snapshots;
DROP TABLE IF EXISTS commercial_quote_line_items;
DROP TABLE IF EXISTS commercial_quotes;
ALTER TABLE store_licenses DROP COLUMN IF EXISTS commercial_quote_id;
