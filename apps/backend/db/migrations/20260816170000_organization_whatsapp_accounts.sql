-- migrate:up

ALTER TABLE whatsapp_accounts
    ADD CONSTRAINT whatsapp_accounts_id_organization_id_key UNIQUE (id, organization_id);

ALTER TABLE whatsapp_accounts
    ALTER COLUMN store_id DROP NOT NULL;

CREATE TABLE whatsapp_account_stores (
    organization_id UUID NOT NULL,
    whatsapp_account_id UUID NOT NULL,
    store_id UUID NOT NULL,
    is_default_for_inbound BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (whatsapp_account_id, store_id),
    UNIQUE (whatsapp_account_id, organization_id, store_id),
    FOREIGN KEY (whatsapp_account_id, organization_id)
        REFERENCES whatsapp_accounts(id, organization_id) ON DELETE CASCADE,
    FOREIGN KEY (store_id, organization_id)
        REFERENCES stores(id, organization_id) ON DELETE CASCADE
);

INSERT INTO whatsapp_account_stores (
    organization_id,
    whatsapp_account_id,
    store_id,
    is_default_for_inbound,
    created_by,
    updated_by,
    created_at,
    updated_at
)
SELECT
    organization_id,
    id,
    store_id,
    TRUE,
    created_by,
    updated_by,
    created_at,
    updated_at
FROM whatsapp_accounts
WHERE store_id IS NOT NULL;

CREATE UNIQUE INDEX whatsapp_account_stores_one_store_account_key
    ON whatsapp_account_stores (organization_id, store_id);

CREATE UNIQUE INDEX whatsapp_account_stores_one_default_store_key
    ON whatsapp_account_stores (whatsapp_account_id)
    WHERE is_default_for_inbound;

CREATE INDEX idx_whatsapp_account_stores_organization
    ON whatsapp_account_stores (organization_id, store_id, whatsapp_account_id);

DROP INDEX IF EXISTS whatsapp_accounts_one_active_store_key;
DROP INDEX IF EXISTS idx_whatsapp_accounts_store_status;

ALTER TABLE whatsapp_accounts
    DROP CONSTRAINT IF EXISTS whatsapp_accounts_store_id_organization_id_fkey;

ALTER TABLE whatsapp_conversations
    DROP CONSTRAINT IF EXISTS whatsapp_conversations_whatsapp_account_id_organization_id_fkey;

ALTER TABLE whatsapp_messages
    DROP CONSTRAINT IF EXISTS whatsapp_messages_whatsapp_account_id_organization_id_stor_fkey;

ALTER TABLE whatsapp_outbox
    DROP CONSTRAINT IF EXISTS whatsapp_outbox_whatsapp_account_id_organization_id_store__fkey;

ALTER TABLE whatsapp_accounts
    DROP CONSTRAINT IF EXISTS whatsapp_accounts_id_organization_id_store_id_key;

ALTER TABLE whatsapp_conversations
    ADD CONSTRAINT whatsapp_conversations_whatsapp_account_fkey
        FOREIGN KEY (whatsapp_account_id, organization_id)
        REFERENCES whatsapp_accounts(id, organization_id) ON DELETE RESTRICT;

ALTER TABLE whatsapp_messages
    ADD CONSTRAINT whatsapp_messages_whatsapp_account_fkey
        FOREIGN KEY (whatsapp_account_id, organization_id)
        REFERENCES whatsapp_accounts(id, organization_id) ON DELETE RESTRICT;

ALTER TABLE whatsapp_outbox
    ADD CONSTRAINT whatsapp_outbox_whatsapp_account_fkey
        FOREIGN KEY (whatsapp_account_id, organization_id)
        REFERENCES whatsapp_accounts(id, organization_id) ON DELETE RESTRICT;

COMMENT ON COLUMN whatsapp_accounts.store_id IS
    'Default Store for inbound routing. Store assignments are stored in whatsapp_account_stores.';

CREATE INDEX idx_whatsapp_accounts_organization_status
    ON whatsapp_accounts (organization_id, status);

-- migrate:down

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM whatsapp_account_stores
        GROUP BY whatsapp_account_id
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Cannot roll back organization WhatsApp accounts while an account is assigned to multiple Stores';
    END IF;
END;
$$;

ALTER TABLE whatsapp_conversations
    DROP CONSTRAINT IF EXISTS whatsapp_conversations_whatsapp_account_fkey;

ALTER TABLE whatsapp_messages
    DROP CONSTRAINT IF EXISTS whatsapp_messages_whatsapp_account_fkey;

ALTER TABLE whatsapp_outbox
    DROP CONSTRAINT IF EXISTS whatsapp_outbox_whatsapp_account_fkey;

ALTER TABLE whatsapp_conversations
    ADD CONSTRAINT whatsapp_conversations_whatsapp_account_id_organization_id_store_id_fkey
        FOREIGN KEY (whatsapp_account_id, organization_id, store_id)
        REFERENCES whatsapp_accounts(id, organization_id, store_id) ON DELETE RESTRICT;

ALTER TABLE whatsapp_messages
    ADD CONSTRAINT whatsapp_messages_whatsapp_account_id_organization_id_store_id_fkey
        FOREIGN KEY (whatsapp_account_id, organization_id, store_id)
        REFERENCES whatsapp_accounts(id, organization_id, store_id) ON DELETE RESTRICT;

ALTER TABLE whatsapp_outbox
    ADD CONSTRAINT whatsapp_outbox_whatsapp_account_id_organization_id_store_id_fkey
        FOREIGN KEY (whatsapp_account_id, organization_id, store_id)
        REFERENCES whatsapp_accounts(id, organization_id, store_id) ON DELETE RESTRICT;

UPDATE whatsapp_accounts AS account
SET store_id = assignment.store_id
FROM whatsapp_account_stores AS assignment
WHERE assignment.whatsapp_account_id = account.id;

DROP INDEX IF EXISTS idx_whatsapp_accounts_organization_status;
DROP INDEX IF EXISTS idx_whatsapp_account_stores_organization;
DROP INDEX IF EXISTS whatsapp_account_stores_one_default_store_key;
DROP INDEX IF EXISTS whatsapp_account_stores_one_store_account_key;
DROP TABLE whatsapp_account_stores;

ALTER TABLE whatsapp_accounts
    DROP CONSTRAINT IF EXISTS whatsapp_accounts_id_organization_id_key,
    ADD CONSTRAINT whatsapp_accounts_id_organization_id_store_id_key UNIQUE (id, organization_id, store_id),
    ADD CONSTRAINT whatsapp_accounts_store_id_organization_id_fkey
        FOREIGN KEY (store_id, organization_id) REFERENCES stores(id, organization_id) ON DELETE RESTRICT;

ALTER TABLE whatsapp_accounts
    ALTER COLUMN store_id SET NOT NULL;

CREATE UNIQUE INDEX whatsapp_accounts_one_active_store_key
    ON whatsapp_accounts (organization_id, store_id)
    WHERE status IN ('pending_qr', 'connecting', 'connected', 'failed');

CREATE INDEX idx_whatsapp_accounts_store_status
    ON whatsapp_accounts (organization_id, store_id, status);
