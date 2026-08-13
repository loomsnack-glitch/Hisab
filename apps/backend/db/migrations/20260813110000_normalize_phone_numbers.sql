-- migrate:up

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM (
            SELECT CASE
                WHEN phone ~ '^[[:space:]]*[+]'
                    AND regexp_replace(phone, '[^0-9]', '', 'g') ~ '^[1-9][0-9]{7,14}$'
                    THEN '+' || regexp_replace(phone, '[^0-9]', '', 'g')
                WHEN regexp_replace(phone, '[^0-9]', '', 'g') ~ '^[6-9][0-9]{9}$'
                    THEN '+91' || regexp_replace(phone, '[^0-9]', '', 'g')
                WHEN regexp_replace(phone, '[^0-9]', '', 'g') ~ '^0[6-9][0-9]{9}$'
                    THEN '+91' || RIGHT(regexp_replace(phone, '[^0-9]', '', 'g'), 10)
                WHEN regexp_replace(phone, '[^0-9]', '', 'g') ~ '^91[6-9][0-9]{9}$'
                    THEN '+' || regexp_replace(phone, '[^0-9]', '', 'g')
                ELSE phone
            END AS normalized_phone
            FROM users
            WHERE phone IS NOT NULL
        ) candidates
        GROUP BY normalized_phone
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Cannot normalize users: duplicate phone numbers would be created';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM (
            SELECT organization_id, CASE
                WHEN phone ~ '^[[:space:]]*[+]'
                    AND regexp_replace(phone, '[^0-9]', '', 'g') ~ '^[1-9][0-9]{7,14}$'
                    THEN '+' || regexp_replace(phone, '[^0-9]', '', 'g')
                WHEN regexp_replace(phone, '[^0-9]', '', 'g') ~ '^[6-9][0-9]{9}$'
                    THEN '+91' || regexp_replace(phone, '[^0-9]', '', 'g')
                WHEN regexp_replace(phone, '[^0-9]', '', 'g') ~ '^0[6-9][0-9]{9}$'
                    THEN '+91' || RIGHT(regexp_replace(phone, '[^0-9]', '', 'g'), 10)
                WHEN regexp_replace(phone, '[^0-9]', '', 'g') ~ '^91[6-9][0-9]{9}$'
                    THEN '+' || regexp_replace(phone, '[^0-9]', '', 'g')
                WHEN phone ~ '^[0-9]{6}$'
                    THEN NULL
                ELSE phone
            END AS normalized_phone
            FROM customers
            WHERE phone IS NOT NULL
        ) candidates
        GROUP BY organization_id, normalized_phone
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Cannot normalize customers: duplicate phone numbers would be created';
    END IF;
END $$;

UPDATE users
SET phone = CASE
    WHEN phone ~ '^[[:space:]]*[+]'
        AND regexp_replace(phone, '[^0-9]', '', 'g') ~ '^[1-9][0-9]{7,14}$'
        THEN '+' || regexp_replace(phone, '[^0-9]', '', 'g')
    WHEN regexp_replace(phone, '[^0-9]', '', 'g') ~ '^[6-9][0-9]{9}$'
        THEN '+91' || regexp_replace(phone, '[^0-9]', '', 'g')
    WHEN regexp_replace(phone, '[^0-9]', '', 'g') ~ '^0[6-9][0-9]{9}$'
        THEN '+91' || RIGHT(regexp_replace(phone, '[^0-9]', '', 'g'), 10)
    WHEN regexp_replace(phone, '[^0-9]', '', 'g') ~ '^91[6-9][0-9]{9}$'
        THEN '+' || regexp_replace(phone, '[^0-9]', '', 'g')
    ELSE phone
END
WHERE phone IS NOT NULL
  AND (
      (
          phone ~ '^[[:space:]]*[+]'
          AND regexp_replace(phone, '[^0-9]', '', 'g') ~ '^[1-9][0-9]{7,14}$'
      )
      OR
      regexp_replace(phone, '[^0-9]', '', 'g') ~ '^[6-9][0-9]{9}$'
      OR regexp_replace(phone, '[^0-9]', '', 'g') ~ '^0[6-9][0-9]{9}$'
      OR regexp_replace(phone, '[^0-9]', '', 'g') ~ '^91[6-9][0-9]{9}$'
  );

-- The existing six-digit customer/demo value is not a recoverable phone number;
-- keep the optional customer field clean instead of inventing a country code.
UPDATE customers
SET phone = CASE
    WHEN phone ~ '^[[:space:]]*[+]'
        AND regexp_replace(phone, '[^0-9]', '', 'g') ~ '^[1-9][0-9]{7,14}$'
        THEN '+' || regexp_replace(phone, '[^0-9]', '', 'g')
    WHEN regexp_replace(phone, '[^0-9]', '', 'g') ~ '^[6-9][0-9]{9}$'
        THEN '+91' || regexp_replace(phone, '[^0-9]', '', 'g')
    WHEN regexp_replace(phone, '[^0-9]', '', 'g') ~ '^0[6-9][0-9]{9}$'
        THEN '+91' || RIGHT(regexp_replace(phone, '[^0-9]', '', 'g'), 10)
    WHEN regexp_replace(phone, '[^0-9]', '', 'g') ~ '^91[6-9][0-9]{9}$'
        THEN '+' || regexp_replace(phone, '[^0-9]', '', 'g')
    WHEN phone ~ '^[0-9]{6}$'
        THEN NULL
    ELSE phone
END
WHERE phone IS NOT NULL
  AND (
      (
          phone ~ '^[[:space:]]*[+]'
          AND regexp_replace(phone, '[^0-9]', '', 'g') ~ '^[1-9][0-9]{7,14}$'
      )
      OR
      regexp_replace(phone, '[^0-9]', '', 'g') ~ '^[6-9][0-9]{9}$'
      OR regexp_replace(phone, '[^0-9]', '', 'g') ~ '^0[6-9][0-9]{9}$'
      OR regexp_replace(phone, '[^0-9]', '', 'g') ~ '^91[6-9][0-9]{9}$'
      OR phone ~ '^[0-9]{6}$'
  );

UPDATE sales
SET customer_phone_snapshot = CASE
    WHEN customer_phone_snapshot ~ '^[[:space:]]*[+]'
        AND regexp_replace(customer_phone_snapshot, '[^0-9]', '', 'g') ~ '^[1-9][0-9]{7,14}$'
        THEN '+' || regexp_replace(customer_phone_snapshot, '[^0-9]', '', 'g')
    WHEN regexp_replace(customer_phone_snapshot, '[^0-9]', '', 'g') ~ '^[6-9][0-9]{9}$'
        THEN '+91' || regexp_replace(customer_phone_snapshot, '[^0-9]', '', 'g')
    WHEN regexp_replace(customer_phone_snapshot, '[^0-9]', '', 'g') ~ '^0[6-9][0-9]{9}$'
        THEN '+91' || RIGHT(regexp_replace(customer_phone_snapshot, '[^0-9]', '', 'g'), 10)
    WHEN regexp_replace(customer_phone_snapshot, '[^0-9]', '', 'g') ~ '^91[6-9][0-9]{9}$'
        THEN '+' || regexp_replace(customer_phone_snapshot, '[^0-9]', '', 'g')
    WHEN customer_phone_snapshot ~ '^[0-9]{6}$'
        THEN NULL
    ELSE customer_phone_snapshot
END
WHERE customer_phone_snapshot IS NOT NULL
  AND (
      (
          customer_phone_snapshot ~ '^[[:space:]]*[+]'
          AND regexp_replace(customer_phone_snapshot, '[^0-9]', '', 'g') ~ '^[1-9][0-9]{7,14}$'
      )
      OR
      regexp_replace(customer_phone_snapshot, '[^0-9]', '', 'g') ~ '^[6-9][0-9]{9}$'
      OR regexp_replace(customer_phone_snapshot, '[^0-9]', '', 'g') ~ '^0[6-9][0-9]{9}$'
      OR regexp_replace(customer_phone_snapshot, '[^0-9]', '', 'g') ~ '^91[6-9][0-9]{9}$'
      OR customer_phone_snapshot ~ '^[0-9]{6}$'
  );

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM users WHERE phone !~ '^[+][1-9][0-9]{7,14}$') THEN
        RAISE EXCEPTION 'Cannot normalize users: unsupported phone values remain';
    END IF;
    IF EXISTS (SELECT 1 FROM customers WHERE phone IS NOT NULL AND phone !~ '^[+][1-9][0-9]{7,14}$') THEN
        RAISE EXCEPTION 'Cannot normalize customers: unsupported phone values remain';
    END IF;
    IF EXISTS (
        SELECT 1
        FROM sales
        WHERE customer_phone_snapshot IS NOT NULL
          AND customer_phone_snapshot !~ '^[+][1-9][0-9]{7,14}$'
    ) THEN
        RAISE EXCEPTION 'Cannot normalize sales: unsupported customer phone snapshots remain';
    END IF;
END $$;

ALTER TABLE users
    ADD CONSTRAINT users_phone_e164_check CHECK (phone ~ '^[+][1-9][0-9]{7,14}$');

ALTER TABLE customers
    ADD CONSTRAINT customers_phone_e164_check CHECK (
        phone IS NULL OR phone ~ '^[+][1-9][0-9]{7,14}$'
    );

-- migrate:down

ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_phone_e164_check;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_phone_e164_check;
-- Canonical E.164 phone numbers are intentionally not converted back.
