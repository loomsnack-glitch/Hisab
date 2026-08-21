-- migrate:up

CREATE TABLE owner_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT owner_users_first_name_not_blank CHECK (length(btrim(first_name)) > 0),
    CONSTRAINT owner_users_last_name_not_blank CHECK (length(btrim(last_name)) > 0),
    CONSTRAINT owner_users_phone_normalized CHECK (phone ~ '^\+[1-9][0-9]{7,14}$')
);

-- migrate:down

DROP TABLE IF EXISTS owner_users;
