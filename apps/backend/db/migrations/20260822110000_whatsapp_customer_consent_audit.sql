-- migrate:up

CREATE TYPE whatsapp_customer_consent_kind_enum AS ENUM (
    'marketing',
    'utility',
    'suppression'
);

CREATE TYPE whatsapp_customer_consent_state_enum AS ENUM (
    'opted_in',
    'opted_out',
    'suppressed',
    'cleared'
);

CREATE TYPE whatsapp_customer_consent_source_enum AS ENUM (
    'admin',
    'pos',
    'import',
    'customer_reply',
    'migration',
    'system'
);

ALTER TABLE customers
    ADD COLUMN marketing_opted_in BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN marketing_opted_in_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN marketing_opt_in_source whatsapp_customer_consent_source_enum,
    ADD COLUMN utility_opted_in BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN utility_opted_in_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN utility_opt_in_source whatsapp_customer_consent_source_enum,
    ADD COLUMN whatsapp_suppressed BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN whatsapp_suppressed_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN whatsapp_suppression_reason VARCHAR(1000),
    ADD CONSTRAINT customers_marketing_opt_in_at_check
        CHECK (marketing_opted_in OR marketing_opted_in_at IS NULL),
    ADD CONSTRAINT customers_utility_opt_in_at_check
        CHECK (utility_opted_in OR utility_opted_in_at IS NULL),
    ADD CONSTRAINT customers_whatsapp_suppression_check
        CHECK ((whatsapp_suppressed AND whatsapp_suppressed_at IS NOT NULL) OR (NOT whatsapp_suppressed AND whatsapp_suppressed_at IS NULL));

CREATE TABLE whatsapp_customer_consent_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    kind whatsapp_customer_consent_kind_enum NOT NULL,
    state whatsapp_customer_consent_state_enum NOT NULL,
    source whatsapp_customer_consent_source_enum NOT NULL,
    wording_version VARCHAR(64),
    evidence_reference VARCHAR(255),
    reason VARCHAR(1000),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id, organization_id) REFERENCES customers(id, organization_id) ON DELETE CASCADE,
    CONSTRAINT whatsapp_customer_consent_events_wording_version_check
        CHECK (wording_version IS NULL OR LENGTH(BTRIM(wording_version)) BETWEEN 1 AND 64),
    CONSTRAINT whatsapp_customer_consent_events_evidence_reference_check
        CHECK (evidence_reference IS NULL OR LENGTH(BTRIM(evidence_reference)) BETWEEN 1 AND 255),
    CONSTRAINT whatsapp_customer_consent_events_reason_check
        CHECK (reason IS NULL OR LENGTH(BTRIM(reason)) BETWEEN 1 AND 1000),
    CONSTRAINT whatsapp_customer_consent_events_kind_state_check
        CHECK (
            (kind IN ('marketing', 'utility') AND state IN ('opted_in', 'opted_out'))
            OR (kind = 'suppression' AND state IN ('suppressed', 'cleared'))
        )
);

CREATE INDEX idx_whatsapp_customer_consent_events_customer
    ON whatsapp_customer_consent_events (organization_id, customer_id, kind, created_at DESC, id DESC);

CREATE INDEX idx_customers_whatsapp_marketing_eligibility
    ON customers (organization_id, marketing_opted_in, whatsapp_suppressed, is_active)
    WHERE marketing_opted_in = TRUE AND whatsapp_suppressed = FALSE;

-- migrate:down

DROP INDEX IF EXISTS idx_customers_whatsapp_marketing_eligibility;
DROP INDEX IF EXISTS idx_whatsapp_customer_consent_events_customer;
DROP TABLE IF EXISTS whatsapp_customer_consent_events;

ALTER TABLE customers
    DROP CONSTRAINT IF EXISTS customers_whatsapp_suppression_check,
    DROP CONSTRAINT IF EXISTS customers_utility_opt_in_at_check,
    DROP CONSTRAINT IF EXISTS customers_marketing_opt_in_at_check,
    DROP COLUMN IF EXISTS whatsapp_suppression_reason,
    DROP COLUMN IF EXISTS whatsapp_suppressed_at,
    DROP COLUMN IF EXISTS whatsapp_suppressed,
    DROP COLUMN IF EXISTS utility_opt_in_source,
    DROP COLUMN IF EXISTS utility_opted_in_at,
    DROP COLUMN IF EXISTS utility_opted_in,
    DROP COLUMN IF EXISTS marketing_opt_in_source,
    DROP COLUMN IF EXISTS marketing_opted_in_at,
    DROP COLUMN IF EXISTS marketing_opted_in;

DROP TYPE IF EXISTS whatsapp_customer_consent_source_enum;
DROP TYPE IF EXISTS whatsapp_customer_consent_state_enum;
DROP TYPE IF EXISTS whatsapp_customer_consent_kind_enum;
