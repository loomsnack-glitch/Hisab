-- migrate:up

CREATE TYPE whatsapp_campaign_status_enum AS ENUM (
    'draft',
    'queued',
    'sending',
    'completed',
    'failed',
    'cancelled'
);

ALTER TABLE stores
    ADD COLUMN whatsapp_links JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN whatsapp_message_templates JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD CONSTRAINT stores_whatsapp_links_array_check
        CHECK (jsonb_typeof(whatsapp_links) = 'array'),
    ADD CONSTRAINT stores_whatsapp_message_templates_object_check
        CHECK (jsonb_typeof(whatsapp_message_templates) = 'object');

UPDATE stores
SET whatsapp_links = jsonb_build_array(
    jsonb_build_object(
        'type', 'google_review',
        'label', review_platform,
        'url', review_link,
        'includeInBill', TRUE,
        'includeInReminder', FALSE,
        'includeInPromotion', FALSE
    )
)
WHERE review_platform IS NOT NULL
  AND review_link IS NOT NULL;

UPDATE stores
SET whatsapp_links = whatsapp_links || jsonb_build_array(
    jsonb_build_object(
        'type', 'social',
        'label', social_media_name,
        'url', social_media_link,
        'includeInBill', TRUE,
        'includeInReminder', FALSE,
        'includeInPromotion', TRUE
    )
)
WHERE social_media_name IS NOT NULL
  AND social_media_link IS NOT NULL;

ALTER TABLE customers
    ADD COLUMN marketing_opted_out BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN marketing_opted_out_at TIMESTAMP WITH TIME ZONE;

CREATE TABLE whatsapp_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    store_id UUID NOT NULL,
    whatsapp_account_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    image_storage_key TEXT,
    image_file_name VARCHAR(255),
    image_mime_type VARCHAR(255),
    status whatsapp_campaign_status_enum NOT NULL DEFAULT 'draft',
    total_recipients INTEGER NOT NULL DEFAULT 0,
    sent_recipients INTEGER NOT NULL DEFAULT 0,
    failed_recipients INTEGER NOT NULL DEFAULT 0,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT whatsapp_campaigns_title_check CHECK (LENGTH(BTRIM(title)) > 0),
    CONSTRAINT whatsapp_campaigns_body_check CHECK (LENGTH(BTRIM(body)) > 0),
    CONSTRAINT whatsapp_campaigns_total_check CHECK (total_recipients >= 0),
    CONSTRAINT whatsapp_campaigns_sent_check CHECK (sent_recipients >= 0),
    CONSTRAINT whatsapp_campaigns_failed_check CHECK (failed_recipients >= 0),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (store_id, organization_id) REFERENCES stores(id, organization_id) ON DELETE CASCADE,
    FOREIGN KEY (whatsapp_account_id, organization_id) REFERENCES whatsapp_accounts(id, organization_id) ON DELETE RESTRICT
);

CREATE INDEX idx_whatsapp_campaigns_store_created
    ON whatsapp_campaigns (organization_id, store_id, created_at DESC);

CREATE TABLE whatsapp_campaign_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    store_id UUID NOT NULL,
    campaign_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    message_id UUID,
    outbox_id UUID,
    status whatsapp_outbox_status_enum NOT NULL DEFAULT 'pending',
    provider_message_id VARCHAR(255),
    failure_code VARCHAR(100),
    failure_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (campaign_id, customer_id),
    CONSTRAINT whatsapp_campaign_recipients_phone_check
        CHECK (phone_number ~ '^[+][1-9][0-9]{7,14}$'),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (store_id, organization_id) REFERENCES stores(id, organization_id) ON DELETE CASCADE,
    FOREIGN KEY (campaign_id) REFERENCES whatsapp_campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id, organization_id) REFERENCES customers(id, organization_id) ON DELETE RESTRICT,
    FOREIGN KEY (message_id) REFERENCES whatsapp_messages(id) ON DELETE SET NULL,
    FOREIGN KEY (outbox_id) REFERENCES whatsapp_outbox(id) ON DELETE SET NULL
);

CREATE INDEX idx_whatsapp_campaign_recipients_dispatch
    ON whatsapp_campaign_recipients (campaign_id, status, created_at);

-- migrate:down

DROP TABLE IF EXISTS whatsapp_campaign_recipients;
DROP TABLE IF EXISTS whatsapp_campaigns;

ALTER TABLE customers
    DROP COLUMN IF EXISTS marketing_opted_out_at,
    DROP COLUMN IF EXISTS marketing_opted_out;

ALTER TABLE stores
    DROP CONSTRAINT IF EXISTS stores_whatsapp_message_templates_object_check,
    DROP CONSTRAINT IF EXISTS stores_whatsapp_links_array_check,
    DROP COLUMN IF EXISTS whatsapp_message_templates,
    DROP COLUMN IF EXISTS whatsapp_links;

DROP TYPE IF EXISTS whatsapp_campaign_status_enum;
