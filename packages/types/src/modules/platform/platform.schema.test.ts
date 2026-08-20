import { describe, expect, test } from "bun:test";

import {
    CreateOwnerUserSchema,
    OwnerLoginSchema,
    OwnerUserActiveStateSchema,
    OwnerUserSeedSchema,
    PlatformDashboardQuerySchema,
    PlatformOrganizationListQuerySchema,
    FUTURE_PLATFORM_REPORTING_PERIOD_MESSAGE,
    kolkataCalendarDate,
    kolkataDayStartUtc,
    resolveActiveStoreWindow,
    resolvePlatformReportingPeriod,
} from "./platform.schema";

describe("Owner User authentication contracts", () => {
    test("normalizes Owner User phones before authentication", () => {
        const result = OwnerLoginSchema.parse({
            requestType: "user-info",
            phone: "98765 43210",
            password: "correct horse battery staple",
        });

        expect(result.phone).toBe("+919876543210");
    });

    test("requires the credential for the selected owner login mode", () => {
        expect(
            OwnerLoginSchema.safeParse({
                requestType: "user-info",
                phone: "+919876543210",
            }).success,
        ).toBe(false);
        expect(
            OwnerLoginSchema.safeParse({
                requestType: "otp-verification",
                phone: "+919876543210",
                otp: "12345",
            }).success,
        ).toBe(false);
    });

    test("normalizes and validates the Seed Owner User identity", () => {
        const result = OwnerUserSeedSchema.parse({
            firstName: "  Asha ",
            lastName: "  Shah ",
            phone: "+91 98765 43210",
            password: "correct horse battery staple",
        });

        expect(result).toEqual({
            firstName: "Asha",
            lastName: "Shah",
            phone: "+919876543210",
            password: "correct horse battery staple",
        });
    });

    test("creates an Owner User with the same identity contract as the seed command", () => {
        const result = CreateOwnerUserSchema.parse({
            firstName: "  Ravi ",
            lastName: "  Mehta ",
            phone: "91111 11111",
            password: "another horse battery",
        });

        expect(result).toEqual({
            firstName: "Ravi",
            lastName: "Mehta",
            phone: "+919111111111",
            password: "another horse battery",
        });
        expect(CreateOwnerUserSchema.safeParse({
            firstName: "Ravi",
            lastName: "Mehta",
            phone: "+919111111111",
            password: "short",
        }).success).toBe(false);
    });

    test("accepts only an explicit active-state boolean", () => {
        expect(OwnerUserActiveStateSchema.parse({ isActive: false })).toEqual({ isActive: false });
        expect(OwnerUserActiveStateSchema.safeParse({ isActive: "false" }).success).toBe(false);
        expect(OwnerUserActiveStateSchema.safeParse({}).success).toBe(false);
    });
});

describe("Platform Reporting Period contracts", () => {
    const now = new Date("2026-08-21T07:11:00.000Z");

    test("defaults a missing period to all-time", () => {
        expect(PlatformDashboardQuerySchema.parse({})).toEqual({ period: "all-time" });
    });

    test("rejects malformed, inverted, and incomplete custom ranges", () => {
        expect(PlatformDashboardQuerySchema.safeParse({ period: "custom", startDate: "21-08-2026", endDate: "2026-08-21" }).success).toBe(false);
        expect(PlatformDashboardQuerySchema.safeParse({ period: "custom", startDate: "2026-02-31", endDate: "2026-08-21" }).success).toBe(false);
        expect(PlatformDashboardQuerySchema.safeParse({ period: "custom" }).success).toBe(false);
        expect(
            PlatformDashboardQuerySchema.safeParse({
                period: "custom",
                startDate: "2026-08-21",
                endDate: "2026-08-01",
            }).success,
        ).toBe(false);
        expect(
            PlatformDashboardQuerySchema.safeParse({
                period: "7d",
                startDate: "2026-08-01",
                endDate: "2026-08-21",
            }).success,
        ).toBe(false);
    });

    test("uses Asia/Kolkata calendar-day boundaries, including midnight", () => {
        expect(kolkataCalendarDate(now)).toBe("2026-08-21");
        expect(kolkataCalendarDate(new Date("2026-08-14T18:29:59.000Z"))).toBe("2026-08-14");
        expect(kolkataCalendarDate(new Date("2026-08-14T18:30:00.000Z"))).toBe("2026-08-15");
        expect(kolkataDayStartUtc("2026-08-15").toISOString()).toBe("2026-08-14T18:30:00.000Z");
    });

    test("resolves quick ranges as inclusive Asia/Kolkata start and exclusive next-day end", () => {
        const sevenDay = resolvePlatformReportingPeriod({ period: "7d" }, now);
        const thirtyDay = resolvePlatformReportingPeriod({ period: "30d" }, now);
        const ninetyDay = resolvePlatformReportingPeriod({ period: "90d" }, now);

        expect(sevenDay).toEqual({
            ok: true,
            period: {
                selection: "7d",
                startDate: "2026-08-15",
                endDate: "2026-08-21",
                startAt: new Date("2026-08-14T18:30:00.000Z"),
                endAt: new Date("2026-08-21T18:30:00.000Z"),
            },
        });
        expect(thirtyDay).toMatchObject({
            ok: true,
            period: {
                selection: "30d",
                startDate: "2026-07-23",
                endDate: "2026-08-21",
            },
        });
        expect(ninetyDay).toMatchObject({
            ok: true,
            period: {
                selection: "90d",
                startDate: "2026-05-24",
                endDate: "2026-08-21",
            },
        });
    });

    test("keeps the Active Store window on the preceding seven Asia/Kolkata calendar days", () => {
        expect(resolveActiveStoreWindow(now)).toEqual({
            startDate: "2026-08-15",
            endDate: "2026-08-21",
            startAt: new Date("2026-08-14T18:30:00.000Z"),
            endAt: new Date("2026-08-21T18:30:00.000Z"),
        });
        expect(resolveActiveStoreWindow(new Date("2026-08-14T18:29:59.000Z")).startDate).toBe("2026-08-08");
        expect(resolveActiveStoreWindow(new Date("2026-08-14T18:30:00.000Z")).startDate).toBe("2026-08-09");
    });

    test("rejects a custom Platform Reporting Period that starts or ends after today in Asia/Kolkata", () => {
        const parsed = PlatformDashboardQuerySchema.parse({
            period: "custom",
            startDate: "2026-08-21",
            endDate: "2026-08-22",
        });

        expect(resolvePlatformReportingPeriod(parsed, now)).toEqual({
            ok: false,
            message: FUTURE_PLATFORM_REPORTING_PERIOD_MESSAGE,
        });
    });
});

describe("Platform Organization list contracts", () => {
    test("defaults missing list filters to all Organizations on page 1", () => {
        expect(PlatformOrganizationListQuerySchema.parse({})).toEqual({
            period: "all-time",
            activity: "all",
            page: 1,
            limit: 20,
        });
    });

    test("accepts search, activity, and pagination alongside a Platform Reporting Period", () => {
        expect(
            PlatformOrganizationListQuerySchema.parse({
                period: "7d",
                search: "  cafe ",
                activity: "inactive",
                page: "2",
                limit: "10",
            }),
        ).toEqual({
            period: "7d",
            search: "cafe",
            activity: "inactive",
            page: 2,
            limit: 10,
        });
    });

    test("rejects invalid pagination and inverted custom Platform Reporting Periods", () => {
        expect(PlatformOrganizationListQuerySchema.safeParse({ page: "0" }).success).toBe(false);
        expect(PlatformOrganizationListQuerySchema.safeParse({ limit: "101" }).success).toBe(false);
        expect(
            PlatformOrganizationListQuerySchema.safeParse({
                period: "custom",
                startDate: "2026-08-21",
                endDate: "2026-08-01",
            }).success,
        ).toBe(false);
    });
});
