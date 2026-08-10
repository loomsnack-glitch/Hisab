-- migrate:up

CREATE TABLE internal_product_code_sequences (
    organization_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    next_sequence bigint NOT NULL DEFAULT 0,
    CONSTRAINT internal_product_code_sequences_next_sequence_check
        CHECK (next_sequence >= 0 AND next_sequence <= 10000000000)
);

CREATE TABLE released_internal_product_codes (
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    product_code character varying(13) NOT NULL,
    released_at timestamptz NOT NULL DEFAULT NOW(),
    PRIMARY KEY (organization_id, product_code),
    CONSTRAINT released_internal_product_codes_shape_check
        CHECK (product_code ~ '^04[0-9]{11}$')
);

-- migrate:down

DROP TABLE IF EXISTS released_internal_product_codes;
DROP TABLE IF EXISTS internal_product_code_sequences;
