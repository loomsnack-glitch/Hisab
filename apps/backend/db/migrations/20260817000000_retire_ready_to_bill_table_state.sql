-- migrate:up

UPDATE service_tables
SET state = 'engaged',
    updated_at = NOW()
WHERE state = 'ready_to_bill';

-- migrate:down

-- Ready to bill is no longer a live operator state. Existing engaged tables
-- cannot be restored to ready_to_bill without reconstructing waiter intent.
