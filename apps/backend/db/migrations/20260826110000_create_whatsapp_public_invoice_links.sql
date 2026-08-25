-- migrate:up

CREATE TABLE whatsapp_public_invoice_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    store_id UUID NOT NULL,
    sale_id UUID NOT NULL,
    token_hash CHAR(64) NOT NULL,
    token_salt VARCHAR(64) NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT whatsapp_public_invoice_links_org_fk
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT whatsapp_public_invoice_links_store_fk
        FOREIGN KEY (store_id, organization_id)
        REFERENCES stores(id, organization_id) ON DELETE CASCADE,
    CONSTRAINT whatsapp_public_invoice_links_sale_fk
        FOREIGN KEY (sale_id, organization_id, store_id)
        REFERENCES sales(id, organization_id, store_id) ON DELETE CASCADE,
    CONSTRAINT whatsapp_public_invoice_links_token_hash_key UNIQUE (token_hash),
    CONSTRAINT whatsapp_public_invoice_links_sale_key UNIQUE (organization_id, store_id, sale_id),
    CONSTRAINT whatsapp_public_invoice_links_token_hash_check CHECK (token_hash ~ '^[0-9a-f]{64}$'),
    CONSTRAINT whatsapp_public_invoice_links_token_salt_check CHECK (LENGTH(BTRIM(token_salt)) BETWEEN 16 AND 64)
);

CREATE INDEX idx_whatsapp_public_invoice_links_sale
    ON whatsapp_public_invoice_links (organization_id, store_id, sale_id);

-- migrate:down

DROP INDEX IF EXISTS idx_whatsapp_public_invoice_links_sale;
DROP TABLE IF EXISTS whatsapp_public_invoice_links;
