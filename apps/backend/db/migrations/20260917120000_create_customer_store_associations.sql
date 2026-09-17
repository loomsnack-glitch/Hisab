-- migrate:up

CREATE TYPE whatsapp_customer_store_activity_source_enum AS ENUM (
    'migration',
    'customer_creation',
    'sale_completed',
    'whatsapp_conversation',
    'explicit_attachment',
    'bill_delivery'
);

CREATE TABLE whatsapp_customer_store_associations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    store_id UUID NOT NULL,
    origin_source whatsapp_customer_store_activity_source_enum NOT NULL,
    origin_source_reference VARCHAR(255) NOT NULL,
    first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity_source whatsapp_customer_store_activity_source_enum NOT NULL,
    last_activity_source_reference VARCHAR(255) NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (id, organization_id, customer_id, store_id),
    UNIQUE (organization_id, customer_id, store_id),
    CONSTRAINT whatsapp_customer_store_associations_activity_range_check CHECK (
        last_activity_at >= first_seen_at
    ),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id, organization_id)
        REFERENCES customers(id, organization_id) ON DELETE CASCADE,
    FOREIGN KEY (store_id, organization_id)
        REFERENCES stores(id, organization_id) ON DELETE CASCADE
);

CREATE TABLE whatsapp_customer_store_activity_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    store_id UUID NOT NULL,
    association_id UUID NOT NULL,
    source whatsapp_customer_store_activity_source_enum NOT NULL,
    source_reference VARCHAR(255) NOT NULL,
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (id, organization_id, customer_id, store_id),
    UNIQUE (association_id, source, source_reference),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id, organization_id)
        REFERENCES customers(id, organization_id) ON DELETE CASCADE,
    FOREIGN KEY (store_id, organization_id)
        REFERENCES stores(id, organization_id) ON DELETE CASCADE,
    FOREIGN KEY (association_id, organization_id, customer_id, store_id)
        REFERENCES whatsapp_customer_store_associations(id, organization_id, customer_id, store_id)
        ON DELETE CASCADE
);

CREATE INDEX idx_whatsapp_customer_store_associations_customer
    ON whatsapp_customer_store_associations (organization_id, customer_id, last_activity_at DESC);

CREATE INDEX idx_whatsapp_customer_store_associations_store
    ON whatsapp_customer_store_associations (organization_id, store_id, last_activity_at DESC);

CREATE INDEX idx_whatsapp_customer_store_activity_events_association
    ON whatsapp_customer_store_activity_events (association_id, occurred_at DESC);

COMMENT ON TABLE whatsapp_customer_store_associations IS
    'Lifetime Customer-to-Store relationships with a current activity summary; rows are never removed for inactivity.';

COMMENT ON TABLE whatsapp_customer_store_activity_events IS
    'Append-only qualifying Customer-to-Store activity with idempotent source references.';

-- migrate:down

DROP TABLE IF EXISTS whatsapp_customer_store_activity_events;
DROP TABLE IF EXISTS whatsapp_customer_store_associations;
DROP TYPE IF EXISTS whatsapp_customer_store_activity_source_enum;
