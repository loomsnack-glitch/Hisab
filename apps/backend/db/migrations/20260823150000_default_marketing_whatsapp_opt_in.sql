-- migrate:up

-- Marketing messages are enabled for new customers by default. An explicit
-- customer opt-out remains authoritative and is preserved during backfill.
ALTER TABLE customers
    ALTER COLUMN marketing_opted_in SET DEFAULT TRUE;

-- Backfill existing customers that do not have an explicit legacy or audited
-- marketing opt-out. Record the migration as an auditable consent event so the
-- source of this default is distinguishable from customer-provided consent.
WITH latest_marketing_consent AS (
    SELECT DISTINCT ON (organization_id, customer_id)
        organization_id,
        customer_id,
        state
    FROM whatsapp_customer_consent_events
    WHERE kind = 'marketing'
    ORDER BY organization_id, customer_id, created_at DESC, id DESC
), backfilled AS (
    UPDATE customers AS customer
    SET marketing_opted_in = TRUE,
        marketing_opted_in_at = NOW(),
        marketing_opt_in_source = 'migration'::whatsapp_customer_consent_source_enum,
        updated_at = NOW()
    WHERE customer.marketing_opted_in = FALSE
      AND customer.marketing_opted_out = FALSE
      AND NOT EXISTS (
          SELECT 1
          FROM latest_marketing_consent AS consent
          WHERE consent.organization_id = customer.organization_id
            AND consent.customer_id = customer.id
            AND consent.state = 'opted_out'
      )
    RETURNING customer.organization_id, customer.id, customer.marketing_opted_in_at
)
INSERT INTO whatsapp_customer_consent_events (
    organization_id,
    customer_id,
    kind,
    state,
    source,
    evidence_reference,
    reason,
    created_at
)
SELECT organization_id,
       id,
       'marketing'::whatsapp_customer_consent_kind_enum,
       'opted_in'::whatsapp_customer_consent_state_enum,
       'migration'::whatsapp_customer_consent_source_enum,
       'migration:20260823150000',
       'Marketing WhatsApp opt-in defaulted by migration',
       marketing_opted_in_at
FROM backfilled;

-- migrate:down

-- Do not undo customer consent data or its audit history. This only restores
-- the default for customers created after a rollback.
ALTER TABLE customers
    ALTER COLUMN marketing_opted_in SET DEFAULT FALSE;
