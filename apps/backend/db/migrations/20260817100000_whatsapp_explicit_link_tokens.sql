-- migrate:up

-- Give every legacy link a stable Store-scoped token key. The old inclusion
-- flags are used below to preserve existing message content before removal.
WITH expanded AS (
    SELECT
        stores.id AS store_id,
        links.ordinality,
        links.value AS link,
        LEFT(COALESCE(NULLIF(REGEXP_REPLACE(
            LOWER(COALESCE(links.value ->> 'key', links.value ->> 'type', links.value ->> 'label')),
            '[^a-z0-9]+', '_', 'g'
        ), ''), 'link'), 56) AS base_key
    FROM stores
    CROSS JOIN LATERAL jsonb_array_elements(
        CASE WHEN jsonb_typeof(stores.whatsapp_links) = 'array'
             THEN stores.whatsapp_links ELSE '[]'::jsonb END
    ) WITH ORDINALITY AS links(value, ordinality)
), keyed AS (
    SELECT
        store_id,
        ordinality,
        link,
        CASE WHEN COUNT(*) OVER (PARTITION BY store_id, base_key) = 1
             THEN base_key
             ELSE base_key || '_' || ROW_NUMBER() OVER (PARTITION BY store_id, base_key ORDER BY ordinality)
        END AS link_key
    FROM expanded
)
UPDATE stores
SET whatsapp_links = COALESCE((
    SELECT jsonb_agg(
        keyed.link || jsonb_build_object(
            'key', keyed.link_key,
            'isActive', CASE
                WHEN LOWER(COALESCE(keyed.link ->> 'isActive', 'true')) IN ('false', '0', 'no') THEN FALSE
                ELSE TRUE
            END
        )
        ORDER BY keyed.ordinality
    )
    FROM keyed
    WHERE keyed.store_id = stores.id
), '[]'::jsonb);

-- Preserve the old Store-level due-reminder and promotion messages as named
-- templates. Existing named templates are never overwritten.
INSERT INTO whatsapp_message_templates (
    organization_id, store_id, kind, name, body, is_default, created_by
)
SELECT
    stores.organization_id,
    stores.id,
    'due_reminder',
    'Default due reminder',
    BTRIM(stores.whatsapp_message_templates ->> 'dueReminder'),
    TRUE,
    stores.created_by
FROM stores
WHERE NULLIF(BTRIM(stores.whatsapp_message_templates ->> 'dueReminder'), '') IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM whatsapp_message_templates templates
      WHERE templates.store_id = stores.id AND templates.kind = 'due_reminder'
  );

INSERT INTO whatsapp_message_templates (
    organization_id, store_id, kind, name, body, is_default, created_by
)
SELECT
    stores.organization_id,
    stores.id,
    'promotion',
    'Default promotion',
    BTRIM(stores.whatsapp_message_templates ->> 'promotion'),
    TRUE,
    stores.created_by
FROM stores
WHERE NULLIF(BTRIM(stores.whatsapp_message_templates ->> 'promotion'), '') IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM whatsapp_message_templates templates
      WHERE templates.store_id = stores.id AND templates.kind = 'promotion'
  );

-- Convert legacy automatic inclusion into explicit tokens in all active
-- templates, so existing messages keep their links after the flags disappear.
WITH selected_links AS (
    SELECT
        templates.id,
        STRING_AGG(
            BTRIM(links.link ->> 'label') || ': {{link_' || (links.link ->> 'key') || '}}',
            E'\n\n' ORDER BY (links.link ->> 'key')
        ) AS body
    FROM whatsapp_message_templates AS templates
    JOIN stores
      ON stores.organization_id = templates.organization_id
     AND stores.id = templates.store_id
    CROSS JOIN LATERAL jsonb_array_elements(stores.whatsapp_links) AS links(link)
    WHERE templates.is_active = TRUE
      AND (
          (templates.kind = 'bill' AND (links.link ->> 'includeInBill') = 'true') OR
          (templates.kind = 'due_reminder' AND (links.link ->> 'includeInReminder') = 'true') OR
          (templates.kind = 'promotion' AND (links.link ->> 'includeInPromotion') = 'true')
      )
      AND templates.body NOT LIKE '%{{link_' || (links.link ->> 'key') || '}}%'
    GROUP BY templates.id
)
UPDATE whatsapp_message_templates AS templates
SET body = templates.body || E'\n\n' || selected_links.body
FROM selected_links
WHERE templates.id = selected_links.id;

UPDATE stores
SET whatsapp_message_templates = '{}'::jsonb;

UPDATE stores
SET whatsapp_links = COALESCE((
    SELECT jsonb_agg(link - 'includeInBill' - 'includeInReminder' - 'includeInPromotion' ORDER BY position)
    FROM jsonb_array_elements(stores.whatsapp_links) WITH ORDINALITY AS entries(link, position)
), '[]'::jsonb);

-- migrate:down

-- The old JSON configuration is intentionally retained for one release so a
-- rollback can still read the legacy columns. New code never writes it.
SELECT 1;
