-- migrate:up

ALTER TABLE stores
    ADD COLUMN review_platform VARCHAR(100),
    ADD COLUMN review_link VARCHAR(2048),
    ADD COLUMN social_media_name VARCHAR(100),
    ADD COLUMN social_media_link VARCHAR(2048),
    ADD CONSTRAINT stores_review_destination_check CHECK (
        (review_platform IS NULL AND review_link IS NULL)
        OR (
            review_platform IS NOT NULL
            AND review_link IS NOT NULL
            AND LENGTH(BTRIM(review_platform)) > 0
            AND LENGTH(BTRIM(review_link)) > 0
        )
    ),
    ADD CONSTRAINT stores_social_destination_check CHECK (
        (social_media_name IS NULL AND social_media_link IS NULL)
        OR (
            social_media_name IS NOT NULL
            AND social_media_link IS NOT NULL
            AND LENGTH(BTRIM(social_media_name)) > 0
            AND LENGTH(BTRIM(social_media_link)) > 0
        )
    );

-- migrate:down

ALTER TABLE stores
    DROP CONSTRAINT IF EXISTS stores_social_destination_check,
    DROP CONSTRAINT IF EXISTS stores_review_destination_check,
    DROP COLUMN IF EXISTS social_media_link,
    DROP COLUMN IF EXISTS social_media_name,
    DROP COLUMN IF EXISTS review_link,
    DROP COLUMN IF EXISTS review_platform;
