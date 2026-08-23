-- migrate:up

-- Bills and due reminders are utility messages in Ganatri. New customers are
-- eligible by default; an explicit utility opt-out remains authoritative.
ALTER TABLE customers
    ALTER COLUMN utility_opted_in SET DEFAULT TRUE;

-- Backfill existing customers that do not have an explicit latest utility
-- opt-out. Record the migration as an auditable consent event so this change
-- is distinguishable from customer-provided consent.
WITH latest_utility_consent AS (
    SELECT DISTINCT ON (organization_id, customer_id)
        organization_id,
        customer_id,
        state
    FROM whatsapp_customer_consent_events
    WHERE kind = 'utility'
    ORDER BY organization_id, customer_id, created_at DESC, id DESC
), backfilled AS (
    UPDATE customers AS customer
    SET utility_opted_in = TRUE,
        utility_opted_in_at = NOW(),
        utility_opt_in_source = 'migration'::whatsapp_customer_consent_source_enum,
        updated_at = NOW()
    FROM latest_utility_consent AS consent
    WHERE customer.utility_opted_in = FALSE
      AND customer.organization_id = consent.organization_id
      AND customer.id = consent.customer_id
      AND consent.state <> 'opted_out'
    RETURNING customer.organization_id, customer.id, customer.utility_opted_in_at
), backfilled_without_history AS (
    UPDATE customers AS customer
    SET utility_opted_in = TRUE,
        utility_opted_in_at = NOW(),
        utility_opt_in_source = 'migration'::whatsapp_customer_consent_source_enum,
        updated_at = NOW()
    WHERE customer.utility_opted_in = FALSE
      AND NOT EXISTS (
          SELECT 1
          FROM latest_utility_consent AS consent
          WHERE consent.organization_id = customer.organization_id
            AND consent.customer_id = customer.id
      )
    RETURNING customer.organization_id, customer.id, customer.utility_opted_in_at
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
       'utility'::whatsapp_customer_consent_kind_enum,
       'opted_in'::whatsapp_customer_consent_state_enum,
       'migration'::whatsapp_customer_consent_source_enum,
       'migration:20260823130000',
       'Utility WhatsApp opt-in backfilled by migration',
       utility_opted_in_at
FROM backfilled
UNION ALL
SELECT organization_id,
       id,
       'utility'::whatsapp_customer_consent_kind_enum,
       'opted_in'::whatsapp_customer_consent_state_enum,
       'migration'::whatsapp_customer_consent_source_enum,
       'migration:20260823130000',
       'Utility WhatsApp opt-in backfilled by migration',
       utility_opted_in_at
FROM backfilled_without_history;

-- migrate:down

-- Do not undo customer consent data or its audit history. This only restores
-- the default for customers created after a rollback.
ALTER TABLE customers
    ALTER COLUMN utility_opted_in SET DEFAULT FALSE;
