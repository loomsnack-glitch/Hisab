-- migrate:up

CREATE TYPE expense_category_status_enum AS ENUM ('active', 'inactive');
CREATE TYPE expense_category_kind_enum AS ENUM ('predefined', 'custom');

CREATE TABLE expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    kind expense_category_kind_enum NOT NULL,
    predefined_key VARCHAR(64),
    status expense_category_status_enum NOT NULL DEFAULT 'active',
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE (id, organization_id),
    CONSTRAINT expense_categories_predefined_key_kind_check CHECK (
        (kind = 'predefined' AND predefined_key IS NOT NULL)
        OR (kind = 'custom' AND predefined_key IS NULL)
    )
);

CREATE UNIQUE INDEX expense_categories_organization_normalized_name_key
    ON expense_categories (organization_id, (lower(btrim(regexp_replace(name, '\s+', ' ', 'g')))));

CREATE UNIQUE INDEX expense_categories_organization_predefined_key_key
    ON expense_categories (organization_id, predefined_key)
    WHERE predefined_key IS NOT NULL;

CREATE INDEX idx_expense_categories_organization_id ON expense_categories (organization_id);
CREATE INDEX idx_expense_categories_organization_status ON expense_categories (organization_id, status);

INSERT INTO expense_categories (
    id,
    organization_id,
    name,
    kind,
    predefined_key,
    status,
    created_by
)
SELECT
    gen_random_uuid(),
    organizations.id,
    seeded.name,
    'predefined',
    seeded.key,
    'active',
    organizations.created_by
FROM organizations
CROSS JOIN (
    VALUES
        ('rent', 'Rent'),
        ('electricity', 'Electricity'),
        ('water', 'Water'),
        ('internet-phone', 'Internet & Phone'),
        ('salaries-wages', 'Salaries & Wages'),
        ('maintenance-repairs', 'Maintenance & Repairs'),
        ('transport', 'Transport'),
        ('supplies', 'Supplies'),
        ('marketing', 'Marketing'),
        ('taxes-fees', 'Taxes & Fees'),
        ('other', 'Other')
) AS seeded(key, name)
WHERE NOT EXISTS (
    SELECT 1
    FROM expense_categories existing
    WHERE existing.organization_id = organizations.id
      AND existing.predefined_key = seeded.key
);

-- migrate:down

DROP TABLE IF EXISTS expense_categories;
DROP TYPE IF EXISTS expense_category_kind_enum;
DROP TYPE IF EXISTS expense_category_status_enum;
