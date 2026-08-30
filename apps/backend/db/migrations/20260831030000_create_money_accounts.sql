-- migrate:up

CREATE TYPE money_account_type_enum AS ENUM (
    'bank',
    'upi',
    'card_settlement',
    'petty_cash',
    'other'
);
CREATE TYPE money_account_scope_enum AS ENUM ('organization_wide');
CREATE TYPE money_account_status_enum AS ENUM ('active', 'inactive');

CREATE TABLE money_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type money_account_type_enum NOT NULL,
    scope money_account_scope_enum NOT NULL DEFAULT 'organization_wide',
    notes VARCHAR(1000),
    status money_account_status_enum NOT NULL DEFAULT 'active',
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE (id, organization_id),
    CONSTRAINT money_accounts_organization_wide_scope_check CHECK (scope = 'organization_wide')
);

CREATE INDEX idx_money_accounts_organization_id ON money_accounts (organization_id);
CREATE INDEX idx_money_accounts_organization_status ON money_accounts (organization_id, status);
CREATE INDEX idx_money_accounts_organization_type ON money_accounts (organization_id, type);

-- migrate:down

DROP TABLE IF EXISTS money_accounts;
DROP TYPE IF EXISTS money_account_status_enum;
DROP TYPE IF EXISTS money_account_scope_enum;
DROP TYPE IF EXISTS money_account_type_enum;
