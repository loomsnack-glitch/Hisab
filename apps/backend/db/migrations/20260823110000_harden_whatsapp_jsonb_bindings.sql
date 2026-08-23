-- migrate:up

DO $$
DECLARE
    event_row RECORD;
    invalid_count INTEGER := 0;
BEGIN
    FOR event_row IN
        SELECT id, payload
        FROM whatsapp_provider_events
        WHERE jsonb_typeof(payload) = 'string'
    LOOP
        BEGIN
            IF jsonb_typeof((event_row.payload #>> '{}')::jsonb) = 'object' THEN
                UPDATE whatsapp_provider_events
                SET payload = (event_row.payload #>> '{}')::jsonb,
                    updated_at = NOW()
                WHERE id = event_row.id;
            ELSE
                invalid_count := invalid_count + 1;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            invalid_count := invalid_count + 1;
        END;
    END LOOP;

    IF invalid_count > 0 THEN
        RAISE EXCEPTION
            'Cannot add whatsapp_provider_events payload constraint: % non-object payloads could not be repaired',
            invalid_count;
    END IF;
END
$$;

ALTER TABLE whatsapp_provider_events
    ADD CONSTRAINT whatsapp_provider_events_payload_check
        CHECK (jsonb_typeof(payload) = 'object');

-- migrate:down

ALTER TABLE whatsapp_provider_events
    DROP CONSTRAINT IF EXISTS whatsapp_provider_events_payload_check;
