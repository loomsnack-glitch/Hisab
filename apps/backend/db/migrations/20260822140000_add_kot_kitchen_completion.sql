-- migrate:up

ALTER TABLE kots
    ADD COLUMN kitchen_completed_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX idx_kots_pending_kitchen
    ON kots (organization_id, store_id, created_at)
    WHERE kitchen_completed_at IS NULL;

-- migrate:down

DROP INDEX IF EXISTS idx_kots_pending_kitchen;

ALTER TABLE kots
    DROP COLUMN IF EXISTS kitchen_completed_at;
