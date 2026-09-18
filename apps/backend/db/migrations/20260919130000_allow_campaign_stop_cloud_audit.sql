-- migrate:up

ALTER TABLE whatsapp_cloud_operator_actions
    DROP CONSTRAINT whatsapp_cloud_operator_action_name_check,
    ADD CONSTRAINT whatsapp_cloud_operator_action_name_check
        CHECK (action IN ('retry', 'dead_letter', 'campaign_stop'));

-- migrate:down

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM whatsapp_cloud_operator_actions
        WHERE action = 'campaign_stop'
    ) THEN
        RAISE EXCEPTION 'Cannot remove campaign_stop audit actions while records exist';
    END IF;
END
$$;

ALTER TABLE whatsapp_cloud_operator_actions
    DROP CONSTRAINT whatsapp_cloud_operator_action_name_check,
    ADD CONSTRAINT whatsapp_cloud_operator_action_name_check
        CHECK (action IN ('retry', 'dead_letter'));
