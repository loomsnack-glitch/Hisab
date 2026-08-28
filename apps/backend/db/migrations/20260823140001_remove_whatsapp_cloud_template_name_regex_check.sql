-- migrate:up

-- Template metadata format is application validation. PostgreSQL regex checks
-- are intentionally not used here because their behavior and limits are
-- database-specific and can fail before a value is evaluated.
ALTER TABLE whatsapp_cloud_template_submissions
    DROP CONSTRAINT IF EXISTS whatsapp_cloud_template_submissions_meta_name_check,
    DROP CONSTRAINT IF EXISTS whatsapp_cloud_template_submissions_language_check,
    DROP CONSTRAINT IF EXISTS whatsapp_cloud_template_submissions_name_check;

-- migrate:down

-- Intentionally empty. The application owns template-name format validation.
