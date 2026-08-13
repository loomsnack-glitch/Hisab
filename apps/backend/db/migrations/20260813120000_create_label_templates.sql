-- migrate:up

CREATE TYPE label_template_status_enum AS ENUM ('active', 'inactive');

CREATE TABLE label_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    status label_template_status_enum NOT NULL DEFAULT 'active',
    stock JSONB NOT NULL,
    keep_outs JSONB NOT NULL DEFAULT '[]'::jsonb,
    elements JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE (organization_id, name),
    UNIQUE (id, organization_id)
);

CREATE INDEX idx_label_templates_organization_id ON label_templates(organization_id);
CREATE INDEX idx_label_templates_organization_status ON label_templates(organization_id, status);

INSERT INTO label_templates (
    id,
    organization_id,
    name,
    status,
    stock,
    keep_outs,
    elements,
    created_by
)
SELECT
    gen_random_uuid(),
    organizations.id,
    seeded.name,
    'active',
    seeded.stock::jsonb,
    '[]'::jsonb,
    seeded.elements::jsonb,
    organizations.created_by
FROM organizations
CROSS JOIN (
    VALUES
        (
            'A4 sheet (3 × 8 labels)',
            '{"widthMm":70,"heightMm":35,"labelsPerRow":3,"horizontalGapMm":0,"verticalGapMm":0,"media":"sheet","sheet":{"pageWidthMm":210,"pageHeightMm":297,"columns":3,"rows":8}}',
            '[{"id":"product-name","type":"text","xMm":2,"yMm":1,"widthMm":66,"heightMm":5,"rotationDeg":0,"text":{"source":"binding","binding":"product.name","fontSizeMm":2.5,"fontWeight":"bold","align":"center"}},{"id":"product-code-barcode","type":"barcode","xMm":3,"yMm":6.5,"widthMm":64,"heightMm":22,"rotationDeg":0,"barcode":{"symbology":"ean13","showHumanDigits":true}},{"id":"selling-price","type":"text","xMm":2,"yMm":29,"widthMm":66,"heightMm":5,"rotationDeg":0,"text":{"source":"binding","binding":"product.price","fontSizeMm":2.5,"fontWeight":"bold","align":"center"}}]'
        ),
        (
            'Thermal label (58 × 40 mm)',
            '{"widthMm":58,"heightMm":40,"labelsPerRow":1,"horizontalGapMm":0,"verticalGapMm":0,"media":"roll"}',
            '[{"id":"product-name","type":"text","xMm":2,"yMm":1.5,"widthMm":54,"heightMm":5.5,"rotationDeg":0,"text":{"source":"binding","binding":"product.name","fontSizeMm":2.5,"fontWeight":"bold","align":"center"}},{"id":"product-code-barcode","type":"barcode","xMm":2.5,"yMm":7.5,"widthMm":53,"heightMm":25,"rotationDeg":0,"barcode":{"symbology":"ean13","showHumanDigits":true}},{"id":"selling-price","type":"text","xMm":2,"yMm":33.5,"widthMm":54,"heightMm":5.5,"rotationDeg":0,"text":{"source":"binding","binding":"product.price","fontSizeMm":2.5,"fontWeight":"bold","align":"center"}}]'
        )
) AS seeded(name, stock, elements)
WHERE NOT EXISTS (
    SELECT 1
    FROM label_templates existing
    WHERE existing.organization_id = organizations.id
);

-- migrate:down

DROP TABLE IF EXISTS label_templates;
DROP TYPE IF EXISTS label_template_status_enum;
