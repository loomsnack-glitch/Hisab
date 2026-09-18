-- migrate:up

CREATE TABLE whatsapp_delivery_operator_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    store_id UUID NOT NULL,
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    source_outbox_id UUID REFERENCES whatsapp_outbox(id) ON DELETE SET NULL,
    outbox_id UUID NOT NULL REFERENCES whatsapp_outbox(id) ON DELETE CASCADE,
    action VARCHAR(32) NOT NULL,
    request_id VARCHAR(255),
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (store_id, organization_id)
        REFERENCES stores(id, organization_id) ON DELETE CASCADE,
    CONSTRAINT whatsapp_delivery_operator_action_name_check
        CHECK (action IN ('retry', 'resend')),
    CONSTRAINT whatsapp_delivery_operator_action_request_check
        CHECK (request_id IS NULL OR LENGTH(BTRIM(request_id)) BETWEEN 1 AND 255),
    CONSTRAINT whatsapp_delivery_operator_action_details_check
        CHECK (jsonb_typeof(details) = 'object')
);

CREATE INDEX idx_whatsapp_delivery_operator_actions_org_created
    ON whatsapp_delivery_operator_actions (organization_id, created_at DESC);

CREATE INDEX idx_whatsapp_delivery_operator_actions_outbox_created
    ON whatsapp_delivery_operator_actions (outbox_id, created_at DESC);

-- migrate:down

DROP INDEX IF EXISTS idx_whatsapp_delivery_operator_actions_outbox_created;
DROP INDEX IF EXISTS idx_whatsapp_delivery_operator_actions_org_created;
DROP TABLE IF EXISTS whatsapp_delivery_operator_actions;
