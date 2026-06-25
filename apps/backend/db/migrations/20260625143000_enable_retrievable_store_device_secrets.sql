-- migrate:up

ALTER TABLE store_devices
    RENAME COLUMN device_secret_hash TO device_secret_encrypted;


-- migrate:down

ALTER TABLE store_devices
    RENAME COLUMN device_secret_encrypted TO device_secret_hash;
