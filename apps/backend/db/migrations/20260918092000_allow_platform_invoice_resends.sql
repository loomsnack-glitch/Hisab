-- migrate:up

DROP INDEX IF EXISTS whatsapp_outbox_platform_invoice_key;

CREATE UNIQUE INDEX whatsapp_outbox_platform_invoice_key
    ON whatsapp_outbox (organization_id, store_id, platform_sender_key, sale_id, kind)
    WHERE sender_kind = 'ganatri_platform' AND kind = 'invoice' AND sale_id IS NOT NULL;

-- migrate:down

DROP INDEX IF EXISTS whatsapp_outbox_platform_invoice_key;

CREATE UNIQUE INDEX whatsapp_outbox_platform_invoice_key
    ON whatsapp_outbox (organization_id, store_id, platform_sender_key, sale_id, kind)
    WHERE sender_kind = 'ganatri_platform' AND kind = 'template' AND sale_id IS NOT NULL;
