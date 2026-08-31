-- migrate:up

CREATE TYPE money_account_payment_route_method_enum AS ENUM ('upi', 'card');
CREATE TYPE money_account_movement_source_kind_enum AS ENUM ('pos_payment');

CREATE TABLE store_money_account_payment_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    store_id UUID NOT NULL,
    payment_method money_account_payment_route_method_enum NOT NULL,
    money_account_id UUID NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE (id, organization_id),
    CONSTRAINT store_money_account_payment_routes_one_method_per_store
        UNIQUE (organization_id, store_id, payment_method),
    FOREIGN KEY (store_id, organization_id) REFERENCES stores (id, organization_id) ON DELETE CASCADE,
    FOREIGN KEY (money_account_id, organization_id) REFERENCES money_accounts (id, organization_id) ON DELETE RESTRICT
);

CREATE INDEX idx_store_money_account_payment_routes_store
    ON store_money_account_payment_routes (organization_id, store_id);

CREATE TABLE money_account_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    money_account_id UUID NOT NULL,
    store_id UUID NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
    source_kind money_account_movement_source_kind_enum NOT NULL DEFAULT 'pos_payment',
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT money_account_movements_amount_positive_check CHECK (amount > 0),
    CONSTRAINT money_account_movements_payment_id_key UNIQUE (payment_id),
    UNIQUE (id, organization_id),
    FOREIGN KEY (money_account_id, organization_id) REFERENCES money_accounts (id, organization_id) ON DELETE RESTRICT,
    FOREIGN KEY (store_id, organization_id) REFERENCES stores (id, organization_id) ON DELETE RESTRICT
);

CREATE INDEX idx_money_account_movements_account_occurred_at
    ON money_account_movements (organization_id, money_account_id, occurred_at, id);

CREATE INDEX idx_money_account_movements_store
    ON money_account_movements (organization_id, store_id);

-- migrate:down

DROP TABLE IF EXISTS money_account_movements;
DROP TABLE IF EXISTS store_money_account_payment_routes;
DROP TYPE IF EXISTS money_account_movement_source_kind_enum;
DROP TYPE IF EXISTS money_account_payment_route_method_enum;
