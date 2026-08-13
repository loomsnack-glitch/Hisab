#!/usr/bin/env bun
/**
 * Seed demo data for testing organization management, device creation, POS login, products, and billing.
 *
 * This script is idempotent and safely rerunnable. It will reuse existing records if they exist.
 *
 * Usage:
 *   cd apps/backend
 *   bun run src/scripts/seed-demo-data.ts
 */

import { SQL } from "bun";
import { encryptDeviceSecret } from "@/helpers/deviceSecret.helper";
import * as organizationRepository from "@/modules/tenant/organization/organization.repository";
import * as catalogRepository from "@/modules/tenant/catalog/catalog.repository";

// Load environment variables
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL environment variable is not set");
  process.exit(1);
}

const pg = new SQL({ url: DATABASE_URL });

// Demo data constants
const DEMO_USER = {
  id: "00000000-0000-0000-0000-000000000001",
  salutation: "mr." as const,
  firstName: "Demo",
  lastName: "Admin",
  phone: "+919000000001",
  email: "demo@example.com",
};

const DEMO_ORG = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Demo Grocery Mart",
  username: "demo-mart",
};

const DEMO_STORE = {
  id: "22222222-2222-2222-2222-222222222222",
  name: "Main Store",
  address: "MG Road, Bengaluru",
};

const DEMO_DEVICES = [
  {
    id: "33333333-3333-3333-3333-333333333333",
    name: "Front Counter",
    loginUsername: "front-counter",
    deviceSecret: "DemoCounter123",
  },
  {
    id: "44444444-4444-4444-4444-444444444444",
    name: "Billing Counter",
    loginUsername: "billing-counter",
    deviceSecret: "DemoCounter456",
  },
];

const DEMO_CATEGORIES = [
  { id: "55555555-5555-5555-5555-555555555555", name: "Groceries" },
  { id: "66666666-6666-6666-6666-666666666666", name: "Beverages" },
  { id: "77777777-7777-7777-7777-777777777777", name: "Snacks" },
];

const DEMO_PRODUCTS = [
  { id: "88888888-8888-8888-8888-888888888888", name: "Basmati Rice 5kg", price: 650, categoryId: DEMO_CATEGORIES[0].id },
  { id: "99999999-9999-9999-9999-999999999999", name: "Sugar 1kg", price: 48, categoryId: DEMO_CATEGORIES[0].id },
  { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", name: "Tea 250g", price: 145, categoryId: DEMO_CATEGORIES[0].id },
  { id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", name: "Mineral Water 1L", price: 25, categoryId: DEMO_CATEGORIES[1].id },
  { id: "cccccccc-cccc-cccc-cccc-cccccccccccc", name: "Biscuits Family Pack", price: 90, categoryId: DEMO_CATEGORIES[2].id },
  { id: "dddddddd-dddd-dddd-dddd-dddddddddddd", name: "Potato Chips", price: 40, categoryId: DEMO_CATEGORIES[2].id },
];

// Track created vs reused counts
const counts = {
  users: { created: 0, reused: 0 },
  organizations: { created: 0, reused: 0 },
  stores: { created: 0, reused: 0 },
  devices: { created: 0, reused: 0 },
  categories: { created: 0, reused: 0 },
  products: { created: 0, reused: 0 },
};

async function checkDatabaseConnection(): Promise<void> {
  console.log("Checking database connection...");
  try {
    await pg`SELECT 1`;
    console.log("✓ Database connection successful");
  } catch (error) {
    console.error("ERROR: Failed to connect to database");
    console.error(error);
    process.exit(1);
  }
}

async function checkMigrations(): Promise<void> {
  console.log("\nChecking migration status...");
  try {
    const migrations = await pg`
      SELECT version
      FROM schema_migrations
      ORDER BY version DESC
      LIMIT 1
    `;

    if (migrations.length === 0) {
      console.error("ERROR: No migrations found in schema_migrations table");
      console.error("Please run migrations before seeding demo data");
      process.exit(1);
    }

    const latestMigration = migrations[0].version;
    console.log(`✓ Latest migration: ${latestMigration}`);

    // Check if username migration has been applied
    const usernameMigration = await pg`
      SELECT version
      FROM schema_migrations
      WHERE version = '20260727120000'
    `;

    if (usernameMigration.length === 0) {
      console.error("ERROR: Username migration (20260727120000) has not been applied");
      console.error("Please run: dbmate up");
      process.exit(1);
    }

    console.log("✓ Username migration applied");
  } catch (error) {
    console.error("ERROR: Failed to check migration status");
    console.error(error);
    process.exit(1);
  }
}

async function seedUser(): Promise<string> {
  console.log("\nSeeding demo user...");

  // Check if user already exists by phone
  const existing = await pg`
    SELECT id FROM users WHERE phone = ${DEMO_USER.phone}
  `;

  if (existing.length > 0) {
    console.log(`✓ Reusing existing user: ${DEMO_USER.firstName} ${DEMO_USER.lastName} (phone: ${DEMO_USER.phone})`);
    counts.users.reused++;
    return existing[0].id;
  }

  // Create new user
  await pg`
    INSERT INTO users (id, salutation, first_name, last_name, phone, email)
    VALUES (${DEMO_USER.id}, ${DEMO_USER.salutation}, ${DEMO_USER.firstName}, ${DEMO_USER.lastName}, ${DEMO_USER.phone}, ${DEMO_USER.email})
  `;

  console.log(`✓ Created user: ${DEMO_USER.firstName} ${DEMO_USER.lastName} (phone: ${DEMO_USER.phone})`);
  counts.users.created++;
  return DEMO_USER.id;
}

async function seedOrganization(userId: string): Promise<string> {
  console.log("\nSeeding demo organization...");

  // Check if organization already exists by username
  const existing = await pg`
    SELECT id FROM organizations WHERE username = ${DEMO_ORG.username}
  `;

  if (existing.length > 0) {
    console.log(`✓ Reusing existing organization: ${DEMO_ORG.name} (username: ${DEMO_ORG.username})`);
    counts.organizations.reused++;
    return existing[0].id;
  }

  // Create new organization
  await pg`
    INSERT INTO organizations (id, name, username, created_by)
    VALUES (${DEMO_ORG.id}, ${DEMO_ORG.name}, ${DEMO_ORG.username}, ${userId})
  `;

  console.log(`✓ Created organization: ${DEMO_ORG.name} (username: ${DEMO_ORG.username})`);
  counts.organizations.created++;
  return DEMO_ORG.id;
}

async function seedStore(userId: string, organizationId: string): Promise<string> {
  console.log("\nSeeding demo store...");

  // Check if store already exists by name in organization
  const existing = await pg`
    SELECT id FROM stores
    WHERE organization_id = ${organizationId} AND name = ${DEMO_STORE.name}
  `;

  if (existing.length > 0) {
    console.log(`✓ Reusing existing store: ${DEMO_STORE.name}`);
    counts.stores.reused++;
    return existing[0].id;
  }

  // Create new store
  await pg`
    INSERT INTO stores (id, organization_id, name, address, created_by)
    VALUES (${DEMO_STORE.id}, ${organizationId}, ${DEMO_STORE.name}, ${DEMO_STORE.address}, ${userId})
  `;

  console.log(`✓ Created store: ${DEMO_STORE.name} (${DEMO_STORE.address})`);
  counts.stores.created++;
  return DEMO_STORE.id;
}

async function seedDevices(userId: string, organizationId: string, storeId: string): Promise<void> {
  console.log("\nSeeding demo devices...");

  for (const device of DEMO_DEVICES) {
    // Check if device already exists by login_username in organization
    const existing = await pg`
      SELECT id FROM store_devices
      WHERE organization_id = ${organizationId} AND login_username = ${device.loginUsername}
    `;

    if (existing.length > 0) {
      console.log(`✓ Reusing existing device: ${device.name} (username: ${device.loginUsername})`);
      counts.devices.reused++;
      continue;
    }

    // Encrypt device secret
    const encryptedSecret = await encryptDeviceSecret(device.deviceSecret);

    // Create new device
    await pg`
      INSERT INTO store_devices (id, store_id, organization_id, name, login_username, device_secret_encrypted, status, created_by)
      VALUES (${device.id}, ${storeId}, ${organizationId}, ${device.name}, ${device.loginUsername}, ${encryptedSecret}, 'active', ${userId})
    `;

    console.log(`✓ Created device: ${device.name} (username: ${device.loginUsername}, secret: ${device.deviceSecret})`);
    counts.devices.created++;
  }
}

async function seedCategories(userId: string, organizationId: string): Promise<void> {
  console.log("\nSeeding demo categories...");

  for (const category of DEMO_CATEGORIES) {
    // Check if category already exists by name in organization
    const existing = await pg`
      SELECT id FROM categories
      WHERE organization_id = ${organizationId} AND name = ${category.name}
    `;

    if (existing.length > 0) {
      console.log(`✓ Reusing existing category: ${category.name}`);
      counts.categories.reused++;
      continue;
    }

    // Create new category
    await pg`
      INSERT INTO categories (id, organization_id, name, status, created_by)
      VALUES (${category.id}, ${organizationId}, ${category.name}, 'active', ${userId})
    `;

    console.log(`✓ Created category: ${category.name}`);
    counts.categories.created++;
  }
}

async function seedProducts(userId: string, organizationId: string): Promise<void> {
  console.log("\nSeeding demo products...");

  for (const product of DEMO_PRODUCTS) {
    // Check if product already exists by name in category
    const existing = await pg`
      SELECT id FROM products
      WHERE organization_id = ${organizationId}
        AND category_id = ${product.categoryId}
        AND name = ${product.name}
    `;

    if (existing.length > 0) {
      console.log(`✓ Reusing existing product: ${product.name} (₹${product.price})`);
      counts.products.reused++;
      continue;
    }

    // Create new product
    await pg`
      INSERT INTO products (id, organization_id, category_id, name, price, discount, status, product_type, created_by)
      VALUES (${product.id}, ${organizationId}, ${product.categoryId}, ${product.name}, ${product.price}, 0, 'active', 'single', ${userId})
    `;

    console.log(`✓ Created product: ${product.name} (₹${product.price})`);
    counts.products.created++;
  }
}

async function verifyRecords(): Promise<void> {
  console.log("\nVerifying seeded records...");

  // Verify user
  const user = await pg`SELECT id, first_name, last_name, phone FROM users WHERE phone = ${DEMO_USER.phone}`;
  if (user.length === 0) {
    throw new Error("User not found after seeding");
  }
  console.log(`✓ User verified: ${user[0].first_name} ${user[0].last_name}`);

  // Verify organization
  const org = await pg`SELECT id, name, username FROM organizations WHERE username = ${DEMO_ORG.username}`;
  if (org.length === 0) {
    throw new Error("Organization not found after seeding");
  }
  console.log(`✓ Organization verified: ${org[0].name} (${org[0].username})`);

  // Verify store
  const store = await pg`SELECT id, name FROM stores WHERE id = ${DEMO_STORE.id}`;
  if (store.length === 0) {
    throw new Error("Store not found after seeding");
  }
  console.log(`✓ Store verified: ${store[0].name}`);

  // Verify devices
  for (const device of DEMO_DEVICES) {
    const deviceRecord = await pg`
      SELECT id, name, login_username, status
      FROM store_devices
      WHERE login_username = ${device.loginUsername}
    `;
    if (deviceRecord.length === 0) {
      throw new Error(`Device not found after seeding: ${device.loginUsername}`);
    }
    console.log(`✓ Device verified: ${deviceRecord[0].name} (${deviceRecord[0].login_username})`);
  }

  // Verify categories
  for (const category of DEMO_CATEGORIES) {
    const categoryRecord = await pg`
      SELECT id, name FROM categories WHERE name = ${category.name}
    `;
    if (categoryRecord.length === 0) {
      throw new Error(`Category not found after seeding: ${category.name}`);
    }
    console.log(`✓ Category verified: ${categoryRecord[0].name}`);
  }

  // Verify products
  for (const product of DEMO_PRODUCTS) {
    const productRecord = await pg`
      SELECT id, name, price FROM products WHERE name = ${product.name}
    `;
    if (productRecord.length === 0) {
      throw new Error(`Product not found after seeding: ${product.name}`);
    }
    console.log(`✓ Product verified: ${productRecord[0].name} (₹${productRecord[0].price})`);
  }

  console.log("\n✓ All records verified successfully");
}

async function verifyPOSLogin(): Promise<void> {
  console.log("\nVerifying POS login credentials...");

  // Test login with front-counter device
  const device = DEMO_DEVICES[0];
  const session = await pg`
    SELECT
      d.id as device_id,
      d.name as device_name,
      d.login_username,
      d.status,
      s.name as store_name,
      o.name as organization_name,
      o.username as organization_username
    FROM store_devices d
    INNER JOIN stores s ON s.id = d.store_id
    INNER JOIN organizations o ON o.id = d.organization_id
    WHERE o.username = ${DEMO_ORG.username}
      AND d.login_username = ${device.loginUsername}
  `;

  if (session.length === 0) {
    throw new Error("POS login verification failed: device not found");
  }

  const record = session[0];
  console.log(`✓ POS login verified:`);
  console.log(`  Organization username: ${record.organization_username}`);
  console.log(`  Device username: ${record.login_username}`);
  console.log(`  Device name: ${record.device_name}`);
  console.log(`  Store: ${record.store_name}`);
  console.log(`  Status: ${record.status}`);
}

async function main(): Promise<void> {
  console.log("=== Hisab Demo Data Seeder ===\n");

  await checkDatabaseConnection();
  await checkMigrations();

  const userId = await seedUser();
  const organizationId = await seedOrganization(userId);
  const storeId = await seedStore(userId, organizationId);

  await seedDevices(userId, organizationId, storeId);
  await seedCategories(userId, organizationId);
  await seedProducts(userId, organizationId);

  await verifyRecords();
  await verifyPOSLogin();

  console.log("\n=== Seeding Summary ===");
  console.log(`Users:        ${counts.users.created} created, ${counts.users.reused} reused`);
  console.log(`Organizations: ${counts.organizations.created} created, ${counts.organizations.reused} reused`);
  console.log(`Stores:        ${counts.stores.created} created, ${counts.stores.reused} reused`);
  console.log(`Devices:       ${counts.devices.created} created, ${counts.devices.reused} reused`);
  console.log(`Categories:    ${counts.categories.created} created, ${counts.categories.reused} reused`);
  console.log(`Products:      ${counts.products.created} created, ${counts.products.reused} reused`);

  console.log("\n=== POS Login Credentials ===");
  console.log(`Organization username: ${DEMO_ORG.username}`);
  console.log(`Device username: ${DEMO_DEVICES[0].loginUsername}`);
  console.log(`Device secret: ${DEMO_DEVICES[0].deviceSecret}`);

  console.log("\n✓ Demo data seeding completed successfully");
}

main().catch((error) => {
  console.error("\nERROR: Demo data seeding failed");
  console.error(error);
  process.exit(1);
});
