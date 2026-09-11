#!/usr/bin/env bun
/**
 * Seed commercial catalog (features, modules, plans) and repair/backfill
 * any empty legacy store migration grants.
 *
 * Usage:
 *   cd apps/backend
 *   bun run src/scripts/seed-commercial-catalog.ts
 */

import { pg } from "@/config/db";
import * as ownerUserRepository from "@/modules/platform/owner-user.repository";
import * as commercialCatalogRepository from "@/modules/platform/commercial-catalog.repository";
import * as commercialLicensingRepository from "@/modules/tenant/commercial-licensing/commercial-licensing.repository";
import { getCommercialLicensingService } from "@/modules/tenant/commercial-licensing/commercial-licensing.service";

export const seedCommercialCatalogAndRepairGrants = async () => {
    console.log("=== Commercial Catalog Seeder ===");

    // 1. Ensure at least one console user exists for catalog authorship audit
    const owners = await ownerUserRepository.listOwnerUsers();
    let actorId = owners[0]?.id;

    if (!actorId) {
        console.log("No console user found; creating seed console user...");
        const passwordHash = await Bun.password.hash("admin12345");
        const created = await ownerUserRepository.createSeedOwnerUser({
            id: crypto.randomUUID(),
            firstName: "System",
            lastName: "Owner",
            phone: "+919999999999",
            passwordHash,
            isActive: true,
        });
        if (created.status !== "created") {
            throw new Error(`Failed to create seed owner user: ${created.status}`);
        }
        actorId = created.ownerUser.id;
        console.log(`✓ Created seed console user: System Owner (+919999999999)`);
    } else {
        console.log(`✓ Using existing console user: ${owners[0]?.firstName} ${owners[0]?.lastName}`);
    }

    // 2. Ensure initial commercial catalog (features, modules, plans)
    console.log("Seeding commercial catalog features, modules, and plans...");
    await commercialCatalogRepository.ensureInitialCatalog({
        actorId,
        now: new Date(),
        createId: () => crypto.randomUUID(),
    });

    const [featureCount] = await pg`SELECT count(*)::int as count FROM commercial_features`;
    const [moduleCount] = await pg`SELECT count(*)::int as count FROM commercial_modules`;
    const [planCount] = await pg`SELECT count(*)::int as count FROM commercial_plans`;
    console.log(`✓ Catalog seeded: ${featureCount?.count} features, ${moduleCount?.count} modules, ${planCount?.count} plans`);

    // 3. Load active module snapshots
    const activeModules = await commercialLicensingRepository.listActiveModuleSnapshots();
    console.log(`✓ Active modules available: ${activeModules.length}`);

    // 4. Backfill any legacy migration grants that have 0 module snapshots
    const emptyGrants = await pg`
        SELECT g.id, g.store_id
        FROM store_access_grants g
        LEFT JOIN store_access_grant_module_snapshots m ON m.grant_id = g.id
        WHERE g.origin = 'legacy_migration'
        GROUP BY g.id, g.store_id
        HAVING count(m.grant_id) = 0
    ` as Array<{ id: string; store_id: string }>;

    if (emptyGrants.length > 0) {
        console.log(`Backfilling ${emptyGrants.length} empty legacy migration grant(s)...`);
        for (const grant of emptyGrants) {
            for (const moduleItem of activeModules) {
                await pg`
                    INSERT INTO store_access_grant_module_snapshots (
                        grant_id,
                        module_id,
                        module_revision_id,
                        module_key,
                        module_display_name
                    ) VALUES (
                        ${grant.id},
                        ${moduleItem.moduleId},
                        ${moduleItem.moduleRevisionId},
                        ${moduleItem.key},
                        ${moduleItem.displayName}
                    )
                `;
                for (const feature of moduleItem.features) {
                    await pg`
                        INSERT INTO store_access_grant_feature_snapshots (
                            grant_id,
                            module_id,
                            feature_id,
                            feature_revision_id,
                            feature_key,
                            feature_display_name
                        ) VALUES (
                            ${grant.id},
                            ${moduleItem.moduleId},
                            ${feature.featureId},
                            ${feature.featureRevisionId},
                            ${feature.key},
                            ${feature.displayName}
                        )
                    `;
                }
            }
        }
        console.log(`✓ Backfilled modules and features for ${emptyGrants.length} grant(s)`);
    } else {
        console.log("✓ All existing legacy migration grants have module snapshots");
    }

    // 5. Run applyLegacyStoreMigrationGrants for any stores without grants
    const migrationResult = await getCommercialLicensingService().applyLegacyStoreMigrationGrants();
    console.log(`✓ Migration check: ${migrationResult.data?.grantedStoreCount ?? 0} new stores granted`);

    console.log("\n✓ Commercial catalog setup and verification completed successfully!");
};

if (import.meta.main) {
    seedCommercialCatalogAndRepairGrants()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error("ERROR: Failed to seed commercial catalog", error);
            process.exit(1);
        });
}
