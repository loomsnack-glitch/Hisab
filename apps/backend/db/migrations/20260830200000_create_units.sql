-- migrate:up

CREATE TYPE unit_status_enum AS ENUM ('active', 'inactive');
CREATE TYPE unit_kind_enum AS ENUM ('predefined', 'custom');

CREATE TABLE units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    label VARCHAR(32) NOT NULL,
    kind unit_kind_enum NOT NULL,
    predefined_key VARCHAR(64),
    status unit_status_enum NOT NULL DEFAULT 'active',
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE (id, organization_id),
    CONSTRAINT units_predefined_key_kind_check CHECK (
        (kind = 'predefined' AND predefined_key IS NOT NULL)
        OR (kind = 'custom' AND predefined_key IS NULL)
    )
);

CREATE UNIQUE INDEX units_organization_normalized_name_key
    ON units (organization_id, (lower(btrim(regexp_replace(name, '\s+', ' ', 'g')))));

CREATE UNIQUE INDEX units_organization_normalized_label_key
    ON units (organization_id, (lower(btrim(regexp_replace(label, '\s+', ' ', 'g')))));

CREATE UNIQUE INDEX units_organization_predefined_key_key
    ON units (organization_id, predefined_key)
    WHERE predefined_key IS NOT NULL;

CREATE INDEX idx_units_organization_id ON units (organization_id);
CREATE INDEX idx_units_organization_status ON units (organization_id, status);

INSERT INTO units (
    id,
    organization_id,
    name,
    label,
    kind,
    predefined_key,
    status,
    created_by
)
SELECT
    gen_random_uuid(),
    organizations.id,
    seeded.name,
    seeded.label,
    'predefined',
    seeded.key,
    'active',
    organizations.created_by
FROM organizations
CROSS JOIN (
    VALUES
        ('piece', 'piece', 'pc'),
        ('packet', 'packet', 'pkt'),
        ('box', 'box', 'box'),
        ('carton', 'carton', 'ctn'),
        ('bag', 'bag', 'bag'),
        ('bottle', 'bottle', 'bottle'),
        ('can', 'can', 'can'),
        ('jar', 'jar', 'jar'),
        ('tray', 'tray', 'tray'),
        ('dozen', 'dozen', 'doz'),
        ('kilogram', 'kilogram', 'kg'),
        ('gram', 'gram', 'g'),
        ('litre', 'litre', 'L'),
        ('millilitre', 'millilitre', 'mL'),
        ('metre', 'metre', 'm'),
        ('foot', 'foot', 'ft')
) AS seeded(key, name, label)
WHERE NOT EXISTS (
    SELECT 1
    FROM units existing
    WHERE existing.organization_id = organizations.id
      AND existing.predefined_key = seeded.key
);

-- migrate:down

DROP TABLE IF EXISTS units;
DROP TYPE IF EXISTS unit_kind_enum;
DROP TYPE IF EXISTS unit_status_enum;
