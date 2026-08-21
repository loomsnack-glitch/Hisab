-- migrate:up

ALTER TABLE owner_users RENAME TO console_users;
ALTER TABLE console_users RENAME CONSTRAINT owner_users_first_name_not_blank TO console_users_first_name_not_blank;
ALTER TABLE console_users RENAME CONSTRAINT owner_users_last_name_not_blank TO console_users_last_name_not_blank;
ALTER TABLE console_users RENAME CONSTRAINT owner_users_phone_normalized TO console_users_phone_normalized;

-- migrate:down

ALTER TABLE console_users RENAME CONSTRAINT console_users_first_name_not_blank TO owner_users_first_name_not_blank;
ALTER TABLE console_users RENAME CONSTRAINT console_users_last_name_not_blank TO owner_users_last_name_not_blank;
ALTER TABLE console_users RENAME CONSTRAINT console_users_phone_normalized TO owner_users_phone_normalized;
ALTER TABLE console_users RENAME TO owner_users;
