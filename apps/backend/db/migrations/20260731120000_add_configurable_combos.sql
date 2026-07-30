-- migrate:up

ALTER TYPE product_type_enum ADD VALUE IF NOT EXISTS 'combo';

CREATE TABLE combo_choice_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    combo_product_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    min_selections INTEGER NOT NULL DEFAULT 0,
    max_selections INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT combo_choice_groups_id_scope_key UNIQUE (id, organization_id),
    CONSTRAINT combo_choice_groups_limits_check CHECK (
        min_selections >= 0
        AND max_selections >= min_selections
        AND max_selections <= 100
    ),
    CONSTRAINT combo_choice_groups_sort_order_check CHECK (sort_order >= 0),
    CONSTRAINT combo_choice_groups_name_check CHECK (length(trim(name)) > 0)
);

ALTER TABLE combo_choice_groups
    ADD CONSTRAINT combo_choice_groups_combo_product_fkey
    FOREIGN KEY (combo_product_id, organization_id)
    REFERENCES products(id, organization_id) ON DELETE CASCADE;

CREATE TABLE combo_choice_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    choice_group_id UUID NOT NULL,
    option_product_id UUID NOT NULL,
    max_quantity INTEGER NOT NULL DEFAULT 1,
    price_adjustment NUMERIC(10,2) NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT combo_choice_options_id_scope_key UNIQUE (id, organization_id),
    CONSTRAINT combo_choice_options_quantity_check CHECK (max_quantity >= 1 AND max_quantity <= 100),
    CONSTRAINT combo_choice_options_sort_order_check CHECK (sort_order >= 0),
    CONSTRAINT combo_choice_options_unique_product UNIQUE (choice_group_id, option_product_id)
);

ALTER TABLE combo_choice_options
    ADD CONSTRAINT combo_choice_options_group_fkey
    FOREIGN KEY (choice_group_id, organization_id)
    REFERENCES combo_choice_groups(id, organization_id) ON DELETE CASCADE;

ALTER TABLE combo_choice_options
    ADD CONSTRAINT combo_choice_options_product_fkey
    FOREIGN KEY (option_product_id, organization_id)
    REFERENCES products(id, organization_id) ON DELETE RESTRICT;

CREATE INDEX idx_combo_choice_groups_product_id ON combo_choice_groups(combo_product_id);
CREATE INDEX idx_combo_choice_groups_organization_id ON combo_choice_groups(organization_id);
CREATE INDEX idx_combo_choice_options_group_id ON combo_choice_options(choice_group_id);
CREATE INDEX idx_combo_choice_options_product_id ON combo_choice_options(option_product_id);
CREATE INDEX idx_combo_choice_options_organization_id ON combo_choice_options(organization_id);

-- migrate:down

DROP TABLE IF EXISTS combo_choice_options;
DROP TABLE IF EXISTS combo_choice_groups;
