-- migrate:up

-- Add human-readable usernames for organization and device login
-- Organization username: globally unique
-- Device login_username: unique within organization

-- 1. Add username to organizations
ALTER TABLE organizations ADD COLUMN username VARCHAR(64);

-- Backfill: slugify from name (lowercase, replace non-alphanumeric with hyphens, collapse, trim)
-- Handle empty names or names that produce empty slugs
UPDATE organizations
SET username = CASE
    WHEN name IS NULL OR TRIM(name) = '' THEN 'org-' || LEFT(MD5(id::text), 8)
    ELSE
        -- Slugify: lowercase, replace invalid chars with hyphens, collapse, trim leading/trailing hyphens
        LEFT(
            REGEXP_REPLACE(
                REGEXP_REPLACE(
                    REGEXP_REPLACE(LOWER(TRIM(name)), '[^a-z0-9_-]+', '-', 'g'),
                    '-+', '-', 'g'
                ),
                '^-+|-+$', '', 'g'
            ),
            64
        )
END
WHERE username IS NULL;

-- Handle empty slugs after slugification (e.g. name was all special chars or became empty)
UPDATE organizations
SET username = 'org-' || LEFT(MD5(id::text), 8)
WHERE username IS NULL OR username = '';

-- Handle slugs that start with invalid characters (hyphen or underscore)
UPDATE organizations
SET username = CASE
    WHEN username ~ '^[-_]' THEN LEFT('slug-' || REGEXP_REPLACE(username, '^[-_]+', '', 'g'), 64)
    ELSE username
END
WHERE username ~ '^[-_]';

-- Handle any remaining invalid slugs (shouldn't happen after above, but safety net)
UPDATE organizations
SET username = 'org-' || LEFT(MD5(id::text), 8)
WHERE username !~ '^[a-z0-9][a-z0-9_-]{1,63}$';

-- Handle collisions: append -2, -3, etc.
-- Suffix-aware truncation to ensure total length <= 64
DO $$
DECLARE
    dup RECORD;
    suffix INT;
    candidate VARCHAR;
BEGIN
    FOR dup IN
        SELECT username, (ARRAY_AGG(id ORDER BY id))[1] AS keep_id
        FROM organizations
        GROUP BY username
        HAVING COUNT(*) > 1
    LOOP
        suffix := 2;
        FOR dup IN
            SELECT id, username
            FROM organizations
            WHERE username = dup.username AND id <> dup.keep_id
            ORDER BY created_at, id
        LOOP
            LOOP
                candidate := LEFT(dup.username, 64 - LENGTH(suffix::text) - 1) || '-' || suffix;
                IF NOT EXISTS (SELECT 1 FROM organizations WHERE username = candidate) THEN
                    UPDATE organizations SET username = candidate WHERE id = dup.id;
                    suffix := suffix + 1;
                    EXIT;
                END IF;
                suffix := suffix + 1;
                -- Safety: prevent infinite loop
                IF suffix > 9999 THEN
                    RAISE EXCEPTION 'Too many collisions for username: %', LEFT(dup.username, 61);
                END IF;
            END LOOP;
        END LOOP;
    END LOOP;
END $$;

ALTER TABLE organizations ALTER COLUMN username SET NOT NULL;
ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_username_key UNIQUE (username);
ALTER TABLE organizations ADD CONSTRAINT organizations_username_check CHECK (username ~ '^[a-z0-9][a-z0-9_-]{1,63}$');

-- 2. Add login_username to store_devices
ALTER TABLE store_devices ADD COLUMN login_username VARCHAR(64);

-- Backfill: slugify from device name, scoped within organization
UPDATE store_devices
SET login_username = CASE
    WHEN name IS NULL OR TRIM(name) = '' THEN 'device-' || LEFT(MD5(id::text), 8)
    ELSE
        LEFT(
            REGEXP_REPLACE(
                REGEXP_REPLACE(
                    REGEXP_REPLACE(LOWER(TRIM(name)), '[^a-z0-9_-]+', '-', 'g'),
                    '-+', '-', 'g'
                ),
                '^-+|-+$', '', 'g'
            ),
            64
        )
END
WHERE login_username IS NULL;

-- Handle empty slugs
UPDATE store_devices
SET login_username = 'device-' || LEFT(MD5(id::text), 8)
WHERE login_username IS NULL OR login_username = '';

-- Handle slugs that start with invalid characters
UPDATE store_devices
SET login_username = CASE
    WHEN login_username ~ '^[-_]' THEN LEFT('device-' || REGEXP_REPLACE(login_username, '^[-_]+', '', 'g'), 64)
    ELSE login_username
END
WHERE login_username ~ '^[-_]';

-- Handle any remaining invalid slugs
UPDATE store_devices
SET login_username = 'device-' || LEFT(MD5(id::text), 8)
WHERE login_username !~ '^[a-z0-9][a-z0-9_-]{1,63}$';

-- Handle collisions within organization: append -2, -3, etc.
-- Suffix-aware truncation to ensure total length <= 64
DO $$
DECLARE
    dup RECORD;
    suffix INT;
    candidate VARCHAR;
BEGIN
    FOR dup IN
        SELECT organization_id, login_username, (ARRAY_AGG(id ORDER BY id))[1] AS keep_id
        FROM store_devices
        GROUP BY organization_id, login_username
        HAVING COUNT(*) > 1
    LOOP
        suffix := 2;
        FOR dup IN
            SELECT id, login_username, organization_id
            FROM store_devices
            WHERE organization_id = dup.organization_id
              AND login_username = dup.login_username
              AND id <> dup.keep_id
            ORDER BY created_at, id
        LOOP
            LOOP
                candidate := LEFT(dup.login_username, 64 - LENGTH(suffix::text) - 1) || '-' || suffix;
                IF NOT EXISTS (
                    SELECT 1 FROM store_devices
                    WHERE organization_id = dup.organization_id AND login_username = candidate
                ) THEN
                    UPDATE store_devices SET login_username = candidate WHERE id = dup.id;
                    suffix := suffix + 1;
                    EXIT;
                END IF;
                suffix := suffix + 1;
                -- Safety: prevent infinite loop
                IF suffix > 9999 THEN
                    RAISE EXCEPTION 'Too many collisions for login_username: % in org %', LEFT(dup.login_username, 61), dup.organization_id;
                END IF;
            END LOOP;
        END LOOP;
    END LOOP;
END $$;

ALTER TABLE store_devices ALTER COLUMN login_username SET NOT NULL;
ALTER TABLE ONLY public.store_devices
    ADD CONSTRAINT store_devices_organization_id_login_username_key UNIQUE (organization_id, login_username);
ALTER TABLE store_devices ADD CONSTRAINT store_devices_login_username_check CHECK (login_username ~ '^[a-z0-9][a-z0-9_-]{1,63}$');

-- migrate:down

ALTER TABLE store_devices DROP CONSTRAINT IF EXISTS store_devices_login_username_check;
ALTER TABLE store_devices DROP CONSTRAINT IF EXISTS store_devices_organization_id_login_username_key;
ALTER TABLE store_devices DROP COLUMN IF EXISTS login_username;
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_username_check;
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_username_key;
ALTER TABLE organizations DROP COLUMN IF EXISTS username;
