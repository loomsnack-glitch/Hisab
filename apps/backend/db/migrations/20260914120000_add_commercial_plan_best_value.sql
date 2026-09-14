-- migrate:up

ALTER TABLE commercial_plan_revisions
    ADD COLUMN is_best_value BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX commercial_plan_revisions_one_active_best_value
    ON commercial_plan_revisions ((TRUE))
    WHERE status = 'active' AND is_best_value;

UPDATE commercial_plan_revisions r
SET is_best_value = TRUE
FROM commercial_plans p
WHERE p.id = r.plan_id
  AND p.key = 'pro'
  AND r.status = 'active';

UPDATE commercial_plan_revisions r
SET description = CASE p.key
    WHEN 'trial' THEN 'Try every included Module before you buy.'
    WHEN 'core' THEN 'Everything you need to get started.'
    WHEN 'pro' THEN 'Everything in Core, plus advanced business tools.'
    ELSE r.description
END
FROM commercial_plans p
WHERE p.id = r.plan_id
  AND r.status = 'active'
  AND btrim(r.description) = ''
  AND p.key IN ('trial', 'core', 'pro');

-- migrate:down

DROP INDEX IF EXISTS commercial_plan_revisions_one_active_best_value;

ALTER TABLE commercial_plan_revisions
    DROP COLUMN IF EXISTS is_best_value;
