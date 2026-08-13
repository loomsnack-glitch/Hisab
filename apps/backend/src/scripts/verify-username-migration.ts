#!/usr/bin/env bun
/**
 * Migration verification script for organization and device usernames
 *
 * This script tests the migration against a PostgreSQL database.
 * Run with: bun run src/scripts/verify-username-migration.ts
 *
 * Requires DATABASE_URL environment variable to be set.
 *
 * This script:
 * 1. Creates a test user
 * 2. Inserts test organizations and devices with edge cases
 * 3. Runs the migration using dbmate or direct SQL execution
 * 4. Verifies the results
 * 5. Cleans up test data
 */

import { SQL } from "bun";
import { execSync } from "child_process";
import { readFileSync } from "fs";

const DATABASE_URL = process.env.DATABASE_URL || "postgres://postgres:root@localhost:5432/hisab?sslmode=disable";

const pg = new SQL({ url: DATABASE_URL });

const log = (msg: string) => console.log(`[verify] ${msg}`);
const error = (msg: string) => console.error(`[verify] ERROR: ${msg}`);

// Test data IDs
const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";
const TEST_ORG_IDS = [
    "11111111-1111-1111-1111-111111111111",
    "22222222-2222-2222-2222-222222222222",
    "33333333-3333-3333-3333-333333333333",
    "44444444-4444-4444-4444-444444444444",
    "55555555-5555-5555-5555-555555555555",
];
const TEST_STORE_IDS = [
    "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
];
const TEST_DEVICE_IDS = [
    "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    "cccccccc-cccc-cccc-cccc-cccccccccccc",
    "dddddddd-dddd-dddd-dddd-dddddddddddd",
];

async function setup() {
    log("Setting up test data...");

    // Create test user first (required for foreign key constraints)
    await pg`
        INSERT INTO users (id, salutation, first_name, last_name, phone)
        VALUES (${TEST_USER_ID}, 'mr.', 'Test', 'User', '+919000000000')
        ON CONFLICT (id) DO NOTHING
    `;
    log("Test user created.");

    // Insert test organizations with duplicate names
    await pg`
        INSERT INTO organizations (id, name, created_by)
        VALUES
            (${TEST_ORG_IDS[0]}, 'Shop', ${TEST_USER_ID}),
            (${TEST_ORG_IDS[1]}, 'Shop', ${TEST_USER_ID}),
            (${TEST_ORG_IDS[2]}, 'Shop', ${TEST_USER_ID}),
            (${TEST_ORG_IDS[3]}, '!!!', ${TEST_USER_ID}),
            (${TEST_ORG_IDS[4]}, ${"a".repeat(64)}, ${TEST_USER_ID})
        ON CONFLICT (id) DO NOTHING
    `;

    // Insert test stores
    await pg`
        INSERT INTO stores (id, organization_id, name, created_by)
        VALUES
            (${TEST_STORE_IDS[0]}, ${TEST_ORG_IDS[0]}, 'Main Store', ${TEST_USER_ID}),
            (${TEST_STORE_IDS[1]}, ${TEST_ORG_IDS[0]}, 'Second Store', ${TEST_USER_ID})
        ON CONFLICT (id) DO NOTHING
    `;

    // Insert test devices with duplicate names
    await pg`
        INSERT INTO store_devices (id, store_id, organization_id, name, device_secret_encrypted, created_by)
        VALUES
            (${TEST_DEVICE_IDS[0]}, ${TEST_STORE_IDS[0]}, ${TEST_ORG_IDS[0]}, 'Counter', 'encrypted_secret_1', ${TEST_USER_ID}),
            (${TEST_DEVICE_IDS[1]}, ${TEST_STORE_IDS[1]}, ${TEST_ORG_IDS[0]}, 'Counter', 'encrypted_secret_2', ${TEST_USER_ID}),
            (${TEST_DEVICE_IDS[2]}, ${TEST_STORE_IDS[0]}, ${TEST_ORG_IDS[0]}, '!!!', 'encrypted_secret_3', ${TEST_USER_ID})
        ON CONFLICT (id) DO NOTHING
    `;

    log("Test data inserted.");
}

async function runMigration() {
    log("Running migration...");

    // Use dbmate when installed so the migration is recorded in schema_migrations.
    // Fall back to direct SQL only when dbmate is unavailable.
    let hasDbmate = true;
    try {
        execSync("which dbmate", { stdio: "ignore" });
    } catch {
        hasDbmate = false;
    }

    if (hasDbmate) {
        log("Using dbmate to run migration...");
        execSync("dbmate --no-dump-schema up", {
            stdio: "inherit",
            env: { ...process.env, DATABASE_URL }
        });
        log("Migration completed via dbmate.");
        return;
    }

    log("dbmate not available, executing SQL directly...");

    // Execute migration SQL directly as a single script
    const migrationFile = readFileSync("db/migrations/20260727120000_add_organization_and_device_usernames.sql", "utf-8");

    try {
        await pg.unsafe(migrationFile);
        log("Migration completed via direct SQL execution.");
    } catch (e) {
        // Check if migration already ran
        const errorMessage = e instanceof Error ? e.message : String(e);
        if (errorMessage.includes("already exists") || errorMessage.includes("duplicate key")) {
            log("Migration appears to have already run. Continuing verification...");
        } else {
            throw e;
        }
    }
}

async function verify() {
    log("Verifying results...");

    // Check organization usernames
    const orgs = await pg`
        SELECT id, name, username
        FROM organizations
        WHERE id IN ${pg(TEST_ORG_IDS)}
        ORDER BY created_at
    `;

    log("Organization usernames:");
    for (const org of orgs) {
        log(`  ${org.name} -> ${org.username}`);

        // Verify username is valid
        if (!/^[a-z0-9][a-z0-9_-]{1,63}$/.test(org.username)) {
            error(`Invalid username: ${org.username}`);
            throw new Error(`Invalid username for org ${org.id}: ${org.username}`);
        }

        // Verify length
        if (org.username.length > 64) {
            error(`Username too long: ${org.username} (${org.username.length} chars)`);
            throw new Error(`Username too long for org ${org.id}`);
        }
    }

    // Verify uniqueness
    const usernames = orgs.map((o: { username: string }) => o.username);
    const uniqueUsernames = new Set(usernames);
    if (usernames.length !== uniqueUsernames.size) {
        error("Duplicate organization usernames found!");
        throw new Error("Duplicate organization usernames");
    }
    log("✓ All organization usernames are unique and valid.");

    // Check device login usernames
    const devices = await pg`
        SELECT id, name, login_username, organization_id
        FROM store_devices
        WHERE id IN ${pg(TEST_DEVICE_IDS)}
        ORDER BY created_at
    `;

    log("Device login usernames:");
    for (const device of devices) {
        log(`  ${device.name} -> ${device.login_username}`);

        // Verify username is valid
        if (!/^[a-z0-9][a-z0-9_-]{1,63}$/.test(device.login_username)) {
            error(`Invalid login username: ${device.login_username}`);
            throw new Error(`Invalid login username for device ${device.id}: ${device.login_username}`);
        }

        // Verify length
        if (device.login_username.length > 64) {
            error(`Login username too long: ${device.login_username} (${device.login_username.length} chars)`);
            throw new Error(`Login username too long for device ${device.id}`);
        }
    }

    // Verify uniqueness within organization
    const devicesByOrg = new Map<string, string[]>();
    for (const device of devices) {
        const orgId = device.organization_id;
        if (!devicesByOrg.has(orgId)) {
            devicesByOrg.set(orgId, []);
        }
        devicesByOrg.get(orgId)!.push(device.login_username);
    }

    for (const [orgId, orgDeviceUsernames] of devicesByOrg.entries()) {
        const uniqueOrgDeviceUsernames = new Set(orgDeviceUsernames);
        if (orgDeviceUsernames.length !== uniqueOrgDeviceUsernames.size) {
            error(`Duplicate device login usernames found within organization ${orgId}!`);
            throw new Error(`Duplicate device login usernames in org ${orgId}`);
        }
    }
    log("✓ All device login usernames are unique within their organizations and valid.");

    // Verify constraints exist
    const constraints = await pg`
        SELECT conname, contype
        FROM pg_constraint
        WHERE conname IN (
            'organizations_username_key',
            'organizations_username_check',
            'store_devices_organization_id_login_username_key',
            'store_devices_login_username_check'
        )
    `;

    log("Constraints:");
    for (const c of constraints) {
        log(`  ${c.conname} (${c.contype})`);
    }

    if (constraints.length < 4) {
        error("Not all constraints were created!");
        throw new Error("Missing constraints");
    }
    log("✓ All required constraints exist.");

    // Verify migration version is recorded
    const migrationVersion = await pg`
        SELECT version FROM schema_migrations WHERE version = '20260727120000'
    `;

    if (migrationVersion.length === 0) {
        error("Migration version not recorded in schema_migrations!");
        throw new Error("Migration version not recorded");
    }
    log("✓ Migration version recorded.");

    log("✓ All verifications passed!");
}

async function cleanup() {
    log("Cleaning up test data...");

    try {
        await pg`DELETE FROM store_devices WHERE id IN ${pg(TEST_DEVICE_IDS)}`;
        await pg`DELETE FROM stores WHERE id IN ${pg(TEST_STORE_IDS)}`;
        await pg`DELETE FROM organizations WHERE id IN ${pg(TEST_ORG_IDS)}`;
        await pg`DELETE FROM users WHERE id = ${TEST_USER_ID}`;
        log("Cleanup complete.");
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        error(`Cleanup failed: ${errorMessage}`);
        // Don't throw - cleanup failure shouldn't fail the whole verification
    }
}

async function main() {
    try {
        // Test connection
        await pg`SELECT 1`;
        log("Connected to database.");

        await setup();
        await runMigration();
        await verify();
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        error(`Verification failed: ${errorMessage}`);
        console.error(e);
        process.exitCode = 1;
        return;
    } finally {
        await cleanup();
        await pg.end();
    }

    log("Migration verification successful!");
}

main();
