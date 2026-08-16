-- migrate:up

CREATE TYPE whatsapp_message_template_kind_enum AS ENUM (
    'bill',
    'due_reminder',
    'promotion'
);

CREATE TABLE whatsapp_message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    store_id UUID NOT NULL,
    kind whatsapp_message_template_kind_enum NOT NULL,
    name VARCHAR(120) NOT NULL,
    body TEXT NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT whatsapp_message_templates_name_check CHECK (LENGTH(BTRIM(name)) > 0),
    CONSTRAINT whatsapp_message_templates_body_check CHECK (LENGTH(BTRIM(body)) > 0),
    CONSTRAINT whatsapp_message_templates_body_length_check CHECK (LENGTH(body) <= 4096),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (store_id, organization_id) REFERENCES stores(id, organization_id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX whatsapp_message_templates_store_kind_name_key
    ON whatsapp_message_templates (store_id, kind, LOWER(name));

CREATE UNIQUE INDEX whatsapp_message_templates_one_default_key
    ON whatsapp_message_templates (store_id, kind)
    WHERE is_default = TRUE AND is_active = TRUE;

CREATE INDEX idx_whatsapp_message_templates_store_kind
    ON whatsapp_message_templates (organization_id, store_id, kind, is_active, updated_at DESC);

INSERT INTO whatsapp_message_templates (
    organization_id, store_id, kind, name, body, is_default, created_by
)
SELECT
    organization_id,
    id,
    'bill',
    'Default bill',
    BTRIM(whatsapp_message_templates ->> 'bill'),
    TRUE,
    created_by
FROM stores
WHERE NULLIF(BTRIM(whatsapp_message_templates ->> 'bill'), '') IS NOT NULL;

UPDATE stores
SET whatsapp_message_templates = whatsapp_message_templates - 'bill'
WHERE whatsapp_message_templates ? 'bill';

-- migrate:down

UPDATE stores AS stores
SET whatsapp_message_templates = jsonb_set(
    stores.whatsapp_message_templates,
    '{bill}',
    to_jsonb(templates.body),
    TRUE
)
FROM whatsapp_message_templates AS templates
WHERE templates.organization_id = stores.organization_id
  AND templates.store_id = stores.id
  AND templates.kind = 'bill'
  AND templates.is_default = TRUE
  AND templates.is_active = TRUE;

DROP TABLE IF EXISTS whatsapp_message_templates;
DROP TYPE IF EXISTS whatsapp_message_template_kind_enum;
