-- migrate:up

CREATE TABLE organization_catalog_settings (
    organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    barcode_scanning_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE store_device_pos_settings (
    device_id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,
    store_id UUID NOT NULL,
    direct_barcode_scan_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    FOREIGN KEY (device_id, organization_id, store_id)
        REFERENCES store_devices(id, organization_id, store_id)
        ON DELETE CASCADE
);

INSERT INTO organization_catalog_settings (organization_id)
SELECT id FROM organizations;

INSERT INTO store_device_pos_settings (device_id, organization_id, store_id)
SELECT id, organization_id, store_id FROM store_devices;

-- migrate:down

DROP TABLE IF EXISTS store_device_pos_settings;
DROP TABLE IF EXISTS organization_catalog_settings;
