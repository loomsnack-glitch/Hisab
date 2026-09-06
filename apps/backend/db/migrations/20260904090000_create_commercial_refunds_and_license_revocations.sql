-- migrate:up

CREATE TABLE commercial_refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    store_id UUID NOT NULL,
    quote_id UUID NOT NULL REFERENCES commercial_quotes (id),
    payment_event_id UUID NOT NULL REFERENCES commercial_payment_events (id),
    access_source_kind VARCHAR(32) NOT NULL,
    access_source_id UUID NOT NULL,
    razorpay_payment_id VARCHAR(64) NOT NULL,
    razorpay_refund_id VARCHAR(64) NOT NULL,
    amount_inr NUMERIC(10, 2) NOT NULL,
    amount_paise INTEGER NOT NULL,
    currency VARCHAR(8) NOT NULL,
    created_by_owner_user_id UUID NOT NULL REFERENCES console_users (id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    FOREIGN KEY (store_id, organization_id) REFERENCES stores (id, organization_id) ON DELETE CASCADE,
    CONSTRAINT commercial_refunds_access_source_kind CHECK (
        access_source_kind IN ('store_license', 'co_term_add_on')
    ),
    CONSTRAINT commercial_refunds_currency CHECK (currency = 'INR'),
    CONSTRAINT commercial_refunds_amounts CHECK (
        amount_inr >= 0
        AND amount_paise > 0
        AND amount_paise = ROUND(amount_inr * 100)
    )
);

CREATE UNIQUE INDEX commercial_refunds_payment_event_uidx
    ON commercial_refunds (payment_event_id);

CREATE UNIQUE INDEX commercial_refunds_razorpay_refund_id_uidx
    ON commercial_refunds (razorpay_refund_id);

CREATE TABLE license_revocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    store_id UUID NOT NULL,
    commercial_refund_id UUID NOT NULL REFERENCES commercial_refunds (id),
    access_source_kind VARCHAR(32) NOT NULL,
    access_source_id UUID NOT NULL,
    effective_ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by_owner_user_id UUID NOT NULL REFERENCES console_users (id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    FOREIGN KEY (store_id, organization_id) REFERENCES stores (id, organization_id) ON DELETE CASCADE,
    CONSTRAINT license_revocations_access_source_kind CHECK (
        access_source_kind IN ('store_license', 'co_term_add_on')
    )
);

CREATE UNIQUE INDEX license_revocations_refund_uidx
    ON license_revocations (commercial_refund_id);

CREATE UNIQUE INDEX license_revocations_access_source_uidx
    ON license_revocations (access_source_kind, access_source_id);

-- migrate:down

DROP TABLE IF EXISTS license_revocations;
DROP TABLE IF EXISTS commercial_refunds;
