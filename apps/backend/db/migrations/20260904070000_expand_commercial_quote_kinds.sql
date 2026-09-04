-- migrate:up

ALTER TABLE commercial_quotes
    DROP CONSTRAINT commercial_quotes_kind;

ALTER TABLE commercial_quotes
    ADD CONSTRAINT commercial_quotes_kind CHECK (
        kind IN ('paid_plan', 'plan_renewal', 'plan_upgrade')
    );

-- migrate:down

ALTER TABLE commercial_quotes
    DROP CONSTRAINT commercial_quotes_kind;

ALTER TABLE commercial_quotes
    ADD CONSTRAINT commercial_quotes_kind CHECK (kind = 'paid_plan');
