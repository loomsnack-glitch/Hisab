-- migrate:up

-- Seed the current fallback bill message for Stores that do not already have
-- an active default. Existing custom templates and defaults are preserved.
INSERT INTO whatsapp_message_templates (
    organization_id,
    store_id,
    kind,
    name,
    body,
    is_default,
    created_by,
    updated_by
)
SELECT
    stores.organization_id,
    stores.id,
    'bill',
    'Default bill',
    $$Hello {{customer_name}},

Thank you for shopping with {{organization_name}}.

Your bill is attached for your reference.

Bill number: {{bill_number}}
Total amount: {{total}}
Paid: {{paid}}
Balance due: {{balance_due}}

Thank you.
Regards,
{{organization_name}}$$,
    TRUE,
    stores.created_by,
    stores.created_by
FROM stores
WHERE NOT EXISTS (
    SELECT 1
    FROM whatsapp_message_templates existing
    WHERE existing.organization_id = stores.organization_id
      AND existing.store_id = stores.id
      AND existing.kind = 'bill'
      AND existing.is_default = TRUE
      AND existing.is_active = TRUE
)
ON CONFLICT DO NOTHING;

-- migrate:down

-- This is a seed-only migration. Do not delete templates on rollback because
-- an administrator may have edited or selected the seeded template already.
SELECT 1;
