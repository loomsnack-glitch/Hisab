-- migrate:up

ALTER TABLE commercial_plan_revisions
    ADD COLUMN is_recommended BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN display_sequence INTEGER NOT NULL DEFAULT 1;

ALTER TABLE commercial_plan_revisions
    ADD CONSTRAINT commercial_plan_revisions_display_sequence_positive
        CHECK (display_sequence >= 1);

CREATE UNIQUE INDEX commercial_plan_revisions_one_active_recommended
    ON commercial_plan_revisions ((TRUE))
    WHERE status = 'active' AND is_recommended;

UPDATE commercial_plan_revisions r
SET
    display_sequence = CASE p.key
        WHEN 'trial' THEN 1
        WHEN 'core' THEN 2
        WHEN 'pro' THEN 3
        ELSE 1
    END,
    is_recommended = (p.key = 'core' AND r.status = 'active')
FROM commercial_plans p
WHERE p.id = r.plan_id;

-- migrate:down

DROP INDEX IF EXISTS commercial_plan_revisions_one_active_recommended;

ALTER TABLE commercial_plan_revisions
    DROP CONSTRAINT IF EXISTS commercial_plan_revisions_display_sequence_positive,
    DROP COLUMN IF EXISTS is_recommended,
    DROP COLUMN IF EXISTS display_sequence;
