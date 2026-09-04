import { describe, expect, test } from "bun:test";
import { STATUS_CODES } from "@repo/types";

import {
    createMemoryCommercialLicensing,
    createTrialPlanSnapshot,
    organizationId,
    otherStoreId,
    outsiderId,
    outsiderStoreId,
    otherOrganizationId,
    ownerUserId,
    storeId,
    trialEnd,
    trialStart,
    migrationEnd,
    coreEnd,
    scheduledCoreEnd,
    quoteExpiresAt,
    userId,
} from "./commercial-licensing.test-harness";

describe("Commercial Licensing standard Trial", () => {
    test("starts the standard Trial Plan once with Asia/Kolkata term timing and snapshotted Features", async () => {
        const memory = createMemoryCommercialLicensing();

        const started = await memory.service.startStandardTrial(userId, organizationId, storeId);

        expect(started.status).toBe("success");
        expect(started.code).toBe(STATUS_CODES.CREATED);
        expect(started.data?.commercialStatus.timezone).toBe("Asia/Kolkata");
        expect(started.data?.commercialStatus.baseAccess).toEqual(expect.objectContaining({
            planKey: "trial",
            planDisplayName: "Trial",
            planType: "trial",
            status: "active",
            startsAt: trialStart,
            endsAt: trialEnd,
            term: { count: 7, unit: "day" },
        }));
        expect(started.data?.commercialStatus.trial.eligible).toBe(false);
        expect(started.data?.commercialStatus.entitlements.features.map((feature) => feature.key).sort()).toEqual([
            "billing",
            "reports",
            "whatsapp",
        ]);
        expect(started.data?.commercialStatus.entitlements.features[0]?.sources[0]).toEqual(
            expect.objectContaining({
                sourceKind: "store_license",
                moduleKey: expect.any(String),
                endsAt: trialEnd,
            }),
        );

        memory.setTrialPlan(createTrialPlanSnapshot({
            displayName: "Revised Trial",
            modules: [],
        }));
        const later = await memory.service.resolveFeatureEntitlement(storeId, "billing", trialStart);
        expect(later.entitled).toBe(true);
        expect(later.evidence[0]?.featureDisplayName).toBe("Billing");
    });

    test("rejects a repeat self-service trial while leaving another newly created Store eligible", async () => {
        const memory = createMemoryCommercialLicensing();
        await memory.service.startStandardTrial(userId, organizationId, storeId);

        const repeat = await memory.service.startStandardTrial(userId, organizationId, storeId);
        const otherStore = await memory.service.getStoreCommercialStatus(userId, organizationId, otherStoreId);
        const otherStart = await memory.service.startStandardTrial(userId, organizationId, otherStoreId);

        expect(repeat.status).toBe("error");
        expect(repeat.code).toBe(STATUS_CODES.CONFLICT);
        expect(repeat.message).toBe("This Store has already used its standard Trial Plan.");
        expect(otherStore.data?.commercialStatus.trial.eligible).toBe(true);
        expect(otherStart.status).toBe("success");
        expect(otherStart.data?.commercialStatus.baseAccess?.planKey).toBe("trial");
        expect(otherStart.data?.commercialStatus.storeId).toBe(otherStoreId);
    });

    test("does not treat an expired Trial as currently entitled, and still blocks a second self-service start", async () => {
        const memory = createMemoryCommercialLicensing();
        await memory.service.startStandardTrial(userId, organizationId, storeId);
        memory.setNow(trialEnd);

        const status = await memory.service.getStoreCommercialStatus(userId, organizationId, storeId);
        const entitlement = await memory.service.resolveFeatureEntitlement(storeId, "billing", trialEnd);
        const repeat = await memory.service.startStandardTrial(userId, organizationId, storeId);

        expect(status.data?.commercialStatus.baseAccess).toBeNull();
        expect(status.data?.commercialStatus.trial.eligible).toBe(false);
        expect(status.data?.commercialStatus.entitlements.features).toEqual([]);
        expect(entitlement.entitled).toBe(false);
        expect(repeat.code).toBe(STATUS_CODES.CONFLICT);
    });

    test("hides another Organization's Store and rejects an outsider", async () => {
        const memory = createMemoryCommercialLicensing();

        const hidden = await memory.service.getStoreCommercialStatus(userId, organizationId, outsiderStoreId);
        const outsider = await memory.service.startStandardTrial(outsiderId, organizationId, storeId);
        const otherOrg = await memory.service.getStoreCommercialStatus(
            userId,
            otherOrganizationId,
            storeId,
        );

        expect(hidden.code).toBe(STATUS_CODES.NOT_FOUND);
        expect(hidden.message).toBe("Store not found");
        expect(outsider.code).toBe(STATUS_CODES.NOT_FOUND);
        expect(outsider.message).toBe("Organization not found");
        expect(otherOrg.code).toBe(STATUS_CODES.NOT_FOUND);
        expect(otherOrg.message).toBe("Store not found");
    });

    test("rejects starting a Trial when no active Trial Plan exists in the Commercial Catalog", async () => {
        const memory = createMemoryCommercialLicensing();
        memory.setTrialPlan(null);

        const status = await memory.service.getStoreCommercialStatus(userId, organizationId, storeId);
        const started = await memory.service.startStandardTrial(userId, organizationId, storeId);

        expect(status.data?.commercialStatus.trial).toEqual({
            eligible: false,
            message: "The standard Trial Plan is not currently available.",
        });
        expect(started.code).toBe(STATUS_CODES.CONFLICT);
        expect(started.message).toBe("The standard Trial Plan is not currently available.");
    });
});

describe("Legacy Store migration grants", () => {
    test("grants every pre-existing Store a 30-day all-current-Modules legacy migration grant exactly once", async () => {
        const memory = createMemoryCommercialLicensing();

        const first = await memory.service.applyLegacyStoreMigrationGrants();
        const status = await memory.service.getStoreCommercialStatus(userId, organizationId, storeId);
        const otherStatus = await memory.service.getStoreCommercialStatus(userId, organizationId, otherStoreId);
        const outsiderStatus = await memory.service.getStoreCommercialStatus(
            userId,
            otherOrganizationId,
            outsiderStoreId,
        );
        const billing = await memory.service.resolveFeatureEntitlement(storeId, "billing", trialStart);
        const whatsapp = await memory.service.resolveFeatureEntitlement(storeId, "whatsapp", trialStart);

        expect(first.status).toBe("success");
        expect(first.data?.grantedStoreCount).toBe(3);
        expect(first.data?.launchedAt).toEqual(trialStart);
        expect(status.data?.commercialStatus.accessGrants).toEqual([
            expect.objectContaining({
                origin: "legacy_migration",
                termKind: "complimentary",
                selectionKind: "all_current_modules",
                label: "Legacy migration grant",
                selectionLabel: "All current Modules",
                status: "active",
                startsAt: trialStart,
                endsAt: migrationEnd,
                term: { count: 30, unit: "day" },
            }),
        ]);
        expect(status.data?.commercialStatus.accessGrants[0]?.modules.map((moduleItem) => moduleItem.key).sort())
            .toEqual(["core_operations", "integrations"]);
        expect(otherStatus.data?.commercialStatus.accessGrants[0]?.origin).toBe("legacy_migration");
        expect(outsiderStatus.data?.commercialStatus.accessGrants[0]?.id)
            .not.toBe(status.data?.commercialStatus.accessGrants[0]?.id);
        expect(billing.entitled).toBe(true);
        expect(billing.evidence[0]?.sourceKind).toBe("store_access_grant");
        expect(whatsapp.entitled).toBe(true);

        const second = await memory.service.applyLegacyStoreMigrationGrants();
        expect(second.data?.grantedStoreCount).toBe(0);
        expect(second.data?.launchedAt).toEqual(trialStart);
        expect((await memory.service.getStoreCommercialStatus(userId, organizationId, storeId))
            .data?.commercialStatus.accessGrants).toHaveLength(1);
    });

    test("does not give the migration grant to a Store created after enforcement launch", async () => {
        const memory = createMemoryCommercialLicensing();
        await memory.service.applyLegacyStoreMigrationGrants();
        const newStoreId = "44444444-4444-4444-8444-444444444444";
        memory.addStore({
            id: newStoreId,
            organizationId,
            createdAt: new Date("2026-09-05T10:00:00.000Z"),
        });
        memory.setNow(new Date("2026-09-05T10:00:00.000Z"));

        await memory.service.applyLegacyStoreMigrationGrants();
        const newStatus = await memory.service.getStoreCommercialStatus(userId, organizationId, newStoreId);
        const newStart = await memory.service.startStandardTrial(userId, organizationId, newStoreId);

        expect(newStatus.data?.commercialStatus.accessGrants).toEqual([]);
        expect(newStatus.data?.commercialStatus.trial.eligible).toBe(true);
        expect(newStart.status).toBe("success");
        expect(newStart.data?.commercialStatus.baseAccess?.planKey).toBe("trial");
    });

    test("expires the migration grant at the launch-plus-30-day Asia/Kolkata timestamp without leaking another Store", async () => {
        const memory = createMemoryCommercialLicensing();
        await memory.service.applyLegacyStoreMigrationGrants();
        memory.setNow(migrationEnd);

        const expired = await memory.service.getStoreCommercialStatus(userId, organizationId, storeId);
        const billing = await memory.service.resolveFeatureEntitlement(storeId, "billing", migrationEnd);
        const otherDuring = await memory.service.resolveFeatureEntitlement(
            otherStoreId,
            "billing",
            trialStart,
        );

        expect(expired.data?.commercialStatus.accessGrants[0]).toEqual(expect.objectContaining({
            origin: "legacy_migration",
            status: "expired",
            endsAt: migrationEnd,
        }));
        expect(expired.data?.commercialStatus.entitlements.features).toEqual([]);
        expect(billing.entitled).toBe(false);
        expect(otherDuring.entitled).toBe(true);
    });
});

describe("Console Store Access Grants", () => {
    test("lets a Platform Administrator inspect access sources and create an additive snapshotted grant", async () => {
        const memory = createMemoryCommercialLicensing();
        await memory.service.startStandardTrial(userId, organizationId, storeId);

        const inspection = await memory.service.inspectStoreCommercialStatusForPlatform(
            organizationId,
            storeId,
        );
        const granted = await memory.service.createStoreAccessGrant(
            ownerUserId,
            organizationId,
            storeId,
            {
                termKind: "seven_day",
                selection: { kind: "module", moduleKey: "integrations" },
            },
        );

        expect(inspection.status).toBe("success");
        expect(inspection.data?.grantableAccess.plans.map((plan) => plan.key).sort()).toEqual(["core", "pro", "trial"]);
        expect(inspection.data?.grantableAccess.modules.map((moduleItem) => moduleItem.key).sort())
            .toEqual(["core_operations", "integrations"]);
        expect(granted.status).toBe("success");
        expect(granted.code).toBe(STATUS_CODES.CREATED);
        expect(granted.data?.commercialStatus.accessGrants).toEqual([
            expect.objectContaining({
                origin: "administrator",
                termKind: "seven_day",
                selectionKind: "module",
                label: "Seven-day Store Access Grant",
                selectionLabel: "Integrations",
                moduleKey: "integrations",
                startsAt: trialStart,
                endsAt: trialEnd,
                status: "active",
            }),
        ]);
        expect(granted.data?.commercialStatus.baseAccess?.planKey).toBe("trial");
        const whatsapp = granted.data?.commercialStatus.entitlements.features.find((feature) => feature.key === "whatsapp");
        expect(whatsapp?.sources.map((source) => source.sourceKind).sort()).toEqual([
            "store_access_grant",
            "store_license",
        ]);
    });

    test("keeps administrator complimentary grants distinct from the 30-day legacy migration grant", async () => {
        const memory = createMemoryCommercialLicensing();
        await memory.service.applyLegacyStoreMigrationGrants();

        const granted = await memory.service.createStoreAccessGrant(
            ownerUserId,
            organizationId,
            storeId,
            {
                termKind: "complimentary",
                selection: { kind: "plan", planKey: "core" },
                term: { count: 30, unit: "day" },
            },
        );

        const origins = granted.data?.commercialStatus.accessGrants.map((grant) => grant.origin).sort();
        const labels = granted.data?.commercialStatus.accessGrants.map((grant) => grant.label).sort();
        expect(origins).toEqual(["administrator", "legacy_migration"]);
        expect(labels).toEqual(["Complimentary Store Access Grant", "Legacy migration grant"]);
        expect(granted.data?.commercialStatus.accessGrants.find((grant) => grant.origin === "administrator"))
            .toEqual(expect.objectContaining({
                termKind: "complimentary",
                selectionKind: "plan",
                planKey: "core",
                endsAt: migrationEnd,
            }));
    });

    test("retains the granted catalog snapshot after the live catalog changes and honors custom expiry", async () => {
        const memory = createMemoryCommercialLicensing();
        const customEnd = new Date("2026-09-20T15:00:00.000Z");
        const granted = await memory.service.createStoreAccessGrant(
            ownerUserId,
            organizationId,
            storeId,
            {
                termKind: "custom_range",
                selection: { kind: "plan", planKey: "core" },
                endsAt: customEnd,
            },
        );

        memory.setActiveModules([]);
        memory.setTrialPlan(createTrialPlanSnapshot({ displayName: "Revised Trial", modules: [] }));
        const later = await memory.service.resolveFeatureEntitlement(storeId, "billing", trialStart);
        memory.setNow(customEnd);
        const expired = await memory.service.inspectStoreCommercialStatusForPlatform(organizationId, storeId);

        expect(granted.data?.commercialStatus.accessGrants[0]).toEqual(expect.objectContaining({
            origin: "administrator",
            termKind: "custom_range",
            label: "Custom-range Store Access Grant",
            endsAt: customEnd,
            status: "active",
        }));
        expect(later.entitled).toBe(true);
        expect(later.evidence[0]?.featureDisplayName).toBe("Billing");
        expect(expired.data?.commercialStatus.accessGrants[0]?.status).toBe("expired");
        expect(expired.data?.commercialStatus.entitlements.features).toEqual([]);
    });

    test("rejects Console inspection and grants for a missing Store without exposing another Organization", async () => {
        const memory = createMemoryCommercialLicensing();
        const hidden = await memory.service.inspectStoreCommercialStatusForPlatform(
            organizationId,
            outsiderStoreId,
        );
        const missingOrg = await memory.service.createStoreAccessGrant(
            ownerUserId,
            "55555555-5555-4555-8555-555555555555",
            storeId,
            {
                termKind: "extended",
                selection: { kind: "module", moduleKey: "integrations" },
                term: { count: 14, unit: "day" },
            },
        );

        expect(hidden.code).toBe(STATUS_CODES.NOT_FOUND);
        expect(hidden.message).toBe("Store not found");
        expect(missingOrg.code).toBe(STATUS_CODES.NOT_FOUND);
        expect(missingOrg.message).toBe("Organization not found");
    });

    test("rejects a grant for a catalog item that is not currently active", async () => {
        const memory = createMemoryCommercialLicensing();
        const missing = await memory.service.createStoreAccessGrant(
            ownerUserId,
            organizationId,
            storeId,
            {
                termKind: "seven_day",
                selection: { kind: "module", moduleKey: "restaurant_operations" },
            },
        );
        const invalidRange = await memory.service.createStoreAccessGrant(
            ownerUserId,
            organizationId,
            storeId,
            {
                termKind: "custom_range",
                selection: { kind: "plan", planKey: "core" },
                endsAt: trialStart,
            },
        );

        expect(missing.code).toBe(STATUS_CODES.CONFLICT);
        expect(missing.message).toBe("That Plan or Module is not currently available to grant.");
        expect(invalidRange.code).toBe(STATUS_CODES.BAD_REQUEST);
        expect(invalidRange.message).toBe("A custom-range Store Access Grant must end after it starts.");
    });
});

describe("Paid Plan checkout and verified fulfilment", () => {
    test("creates an immutable GST-inclusive Quote and server Razorpay Order without granting access", async () => {
        const memory = createMemoryCommercialLicensing();

        const checkout = await memory.service.createPaidPlanCheckout(userId, organizationId, storeId, {
            planKey: "core",
        });
        const status = await memory.service.getStoreCommercialStatus(userId, organizationId, storeId);
        const billing = await memory.service.resolveFeatureEntitlement(storeId, "billing", trialStart);

        expect(checkout.status).toBe("success");
        expect(checkout.code).toBe(STATUS_CODES.CREATED);
        expect(checkout.data?.quote).toEqual(expect.objectContaining({
            kind: "paid_plan",
            status: "open",
            planKey: "core",
            amountInr: 2999,
            amountPaise: 299900,
            currency: "INR",
            licenseTiming: "immediate",
            intendedStartsAt: trialStart,
            intendedEndsAt: coreEnd,
            expiresAt: quoteExpiresAt,
            razorpayOrderId: "order_test_001",
            fulfilledAt: null,
        }));
        expect(checkout.data?.checkout).toEqual({
            keyId: "rzp_test_harness",
            orderId: "order_test_001",
            amountPaise: 299900,
            currency: "INR",
        });
        expect(status.data?.commercialStatus.baseAccess).toBeNull();
        expect(status.data?.commercialStatus.pendingCheckout?.id).toBe(checkout.data?.quote.id);
        expect(status.data?.commercialStatus.availablePaidPlans.map((plan) => plan.key).sort())
            .toEqual(["core", "pro"]);
        expect(billing.entitled).toBe(false);
    });

    test("schedules a paid Plan purchased during an active Trial to start at trial end", async () => {
        const memory = createMemoryCommercialLicensing();
        await memory.service.startStandardTrial(userId, organizationId, storeId);

        const checkout = await memory.service.createPaidPlanCheckout(userId, organizationId, storeId, {
            planKey: "core",
        });
        const paid = await memory.service.ingestRazorpayWebhook({
            razorpayEventId: "evt_order_paid_1",
            eventType: "order.paid",
            payload: { event: "order.paid" },
            orderId: checkout.data?.checkout.orderId ?? null,
            paymentId: "pay_test_1",
            amountPaise: 299900,
            currency: "INR",
            paidAt: trialStart,
        });
        const status = await memory.service.getStoreCommercialStatus(userId, organizationId, storeId);
        const duringTrial = await memory.service.resolveFeatureEntitlement(storeId, "billing", trialStart);
        memory.setNow(trialEnd);
        const afterTrial = await memory.service.getStoreCommercialStatus(userId, organizationId, storeId);

        expect(checkout.data?.quote.licenseTiming).toBe("scheduled");
        expect(checkout.data?.quote.intendedStartsAt).toEqual(trialEnd);
        expect(checkout.data?.quote.intendedEndsAt).toEqual(scheduledCoreEnd);
        expect(paid.data?.fulfillmentStatus).toBe("fulfilled");
        expect(status.data?.commercialStatus.baseAccess?.planKey).toBe("trial");
        expect(status.data?.commercialStatus.scheduledSuccessor).toEqual(expect.objectContaining({
            planKey: "core",
            status: "scheduled",
            startsAt: trialEnd,
            endsAt: scheduledCoreEnd,
        }));
        expect(duringTrial.entitled).toBe(true);
        expect(status.data?.commercialStatus.entitlements.features.map((feature) => feature.key).sort())
            .toEqual(["billing", "reports", "whatsapp"]);
        expect(afterTrial.data?.commercialStatus.baseAccess).toEqual(expect.objectContaining({
            planKey: "core",
            status: "active",
        }));
        expect(afterTrial.data?.commercialStatus.scheduledSuccessor).toBeNull();
    });

    test("fulfils only a matching unexpired order.paid webhook and ignores payment.captured", async () => {
        const memory = createMemoryCommercialLicensing();
        const checkout = await memory.service.createPaidPlanCheckout(userId, organizationId, storeId, {
            planKey: "core",
        });
        const orderId = checkout.data?.checkout.orderId ?? "";

        const captured = await memory.service.ingestRazorpayWebhook({
            razorpayEventId: "evt_captured_1",
            eventType: "payment.captured",
            payload: { event: "payment.captured" },
            orderId,
            paymentId: "pay_test_1",
            amountPaise: 299900,
            currency: "INR",
            paidAt: trialStart,
        });
        const beforePaid = await memory.service.getStoreCommercialStatus(userId, organizationId, storeId);
        const paid = await memory.service.ingestRazorpayWebhook({
            razorpayEventId: "evt_order_paid_1",
            eventType: "order.paid",
            payload: { event: "order.paid" },
            orderId,
            paymentId: "pay_test_1",
            amountPaise: 299900,
            currency: "INR",
            paidAt: trialStart,
        });
        const replay = await memory.service.ingestRazorpayWebhook({
            razorpayEventId: "evt_order_paid_1",
            eventType: "order.paid",
            payload: { event: "order.paid" },
            orderId,
            paymentId: "pay_test_1",
            amountPaise: 299900,
            currency: "INR",
            paidAt: trialStart,
        });
        const status = await memory.service.getStoreCommercialStatus(userId, organizationId, storeId);

        expect(captured.data?.fulfillmentStatus).toBe("ignored");
        expect(beforePaid.data?.commercialStatus.baseAccess).toBeNull();
        expect(paid.data?.fulfillmentStatus).toBe("fulfilled");
        expect(replay.data?.fulfillmentStatus).toBe("fulfilled");
        expect(status.data?.commercialStatus.baseAccess).toEqual(expect.objectContaining({
            planKey: "core",
            planType: "paid",
            status: "active",
            startsAt: trialStart,
            endsAt: coreEnd,
        }));
        expect(status.data?.commercialStatus.pendingCheckout).toBeNull();
        expect(status.data?.commercialStatus.commercialHistory.some((entry) => entry.kind === "payment")).toBe(true);
        expect(memory.state.licenses.filter((license) => license.sourceKind === "paid")).toHaveLength(1);
    });

    test("does not grant access for expired, mismatched, or overlapping Quote payments", async () => {
        const memory = createMemoryCommercialLicensing();
        const first = await memory.service.createPaidPlanCheckout(userId, organizationId, storeId, {
            planKey: "core",
        });
        const second = await memory.service.createPaidPlanCheckout(userId, organizationId, storeId, {
            planKey: "pro",
        });
        const expiredQuote = await memory.service.createPaidPlanCheckout(userId, organizationId, storeId, {
            planKey: "core",
        });

        const wrongAmount = await memory.service.ingestRazorpayWebhook({
            razorpayEventId: "evt_wrong_amount",
            eventType: "order.paid",
            payload: { event: "order.paid" },
            orderId: first.data?.checkout.orderId ?? null,
            paymentId: "pay_wrong",
            amountPaise: 1,
            currency: "INR",
            paidAt: trialStart,
        });
        const firstPaid = await memory.service.ingestRazorpayWebhook({
            razorpayEventId: "evt_first_paid",
            eventType: "order.paid",
            payload: { event: "order.paid" },
            orderId: first.data?.checkout.orderId ?? null,
            paymentId: "pay_first",
            amountPaise: 299900,
            currency: "INR",
            paidAt: trialStart,
        });
        const overlapping = await memory.service.ingestRazorpayWebhook({
            razorpayEventId: "evt_pro_paid",
            eventType: "order.paid",
            payload: { event: "order.paid" },
            orderId: second.data?.checkout.orderId ?? null,
            paymentId: "pay_pro",
            amountPaise: 499900,
            currency: "INR",
            paidAt: trialStart,
        });
        const late = await memory.service.ingestRazorpayWebhook({
            razorpayEventId: "evt_expired",
            eventType: "order.paid",
            payload: { event: "order.paid" },
            orderId: expiredQuote.data?.checkout.orderId ?? null,
            paymentId: "pay_late",
            amountPaise: 299900,
            currency: "INR",
            paidAt: quoteExpiresAt,
        });
        memory.setNow(quoteExpiresAt);
        const expiredStatus = await memory.service.getStoreCommercialStatus(userId, organizationId, storeId);

        expect(wrongAmount.data?.fulfillmentStatus).toBe("mismatched");
        expect(firstPaid.data?.fulfillmentStatus).toBe("fulfilled");
        expect(overlapping.data?.fulfillmentStatus).toBe("mismatched");
        expect(late.data?.fulfillmentStatus).toBe("mismatched");
        expect(expiredStatus.data?.commercialStatus.baseAccess?.planKey).toBe("core");
        expect(expiredStatus.data?.commercialStatus.pendingCheckout).toBeNull();
        expect(memory.state.licenses.filter((license) => license.sourceKind === "paid")).toHaveLength(1);
    });

    test("rejects a paid Plan checkout that is not currently eligible", async () => {
        const memory = createMemoryCommercialLicensing();
        const trialPlan = await memory.service.createPaidPlanCheckout(userId, organizationId, storeId, {
            planKey: "trial",
        });
        await memory.service.createPaidPlanCheckout(userId, organizationId, storeId, { planKey: "core" });
        await memory.service.ingestRazorpayWebhook({
            razorpayEventId: "evt_core",
            eventType: "order.paid",
            payload: { event: "order.paid" },
            orderId: "order_test_001",
            paymentId: "pay_core",
            amountPaise: 299900,
            currency: "INR",
            paidAt: trialStart,
        });
        const afterPaid = await memory.service.createPaidPlanCheckout(userId, organizationId, storeId, {
            planKey: "pro",
        });

        expect(trialPlan.code).toBe(STATUS_CODES.CONFLICT);
        expect(trialPlan.message).toBe("That paid Plan is not currently available.");
        expect(afterPaid.code).toBe(STATUS_CODES.CONFLICT);
        expect(afterPaid.message).toBe("This Store cannot start a new paid Plan checkout right now.");
    });
});
