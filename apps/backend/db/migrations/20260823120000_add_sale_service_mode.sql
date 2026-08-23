-- migrate:up

CREATE TYPE sale_service_mode_enum AS ENUM ('dine_in', 'pick_up');

ALTER TABLE sales
    ADD COLUMN service_mode sale_service_mode_enum NOT NULL DEFAULT 'dine_in';

-- migrate:down

ALTER TABLE sales
    DROP COLUMN IF EXISTS service_mode;

DROP TYPE IF EXISTS sale_service_mode_enum;
