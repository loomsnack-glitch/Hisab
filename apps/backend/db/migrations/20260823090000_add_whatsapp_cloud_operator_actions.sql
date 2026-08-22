-- migrate:up

CREATE TABLE whatsapp_cloud_operator_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    actor_user_id UUID,
    outbox_id UUID NOT NULL,
    action VARCHAR(32) NOT NULL,
    previous_status whatsapp_outbox_status_enum NOT NULL,
    next_status whatsapp_outbox_status_enum NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT whatsapp_cloud_operator_action_name_check
        CHECK (action IN ('retry', 'dead_letter')),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (outbox_id) REFERENCES whatsapp_outbox(id) ON DELETE CASCADE
);

CREATE INDEX idx_whatsapp_cloud_operator_actions_org_created
    ON whatsapp_cloud_operator_actions (organization_id, created_at DESC);

CREATE INDEX idx_whatsapp_cloud_operator_actions_outbox_created
    ON whatsapp_cloud_operator_actions (outbox_id, created_at DESC);

-- migrate:down

DROP TABLE IF EXISTS whatsapp_cloud_operator_actions;
