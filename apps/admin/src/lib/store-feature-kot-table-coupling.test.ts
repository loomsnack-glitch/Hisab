import { describe, expect, test } from "bun:test";

import { resolveStoreFeatureToggle } from "@/lib/store-feature-kot-table-coupling";

describe("Store feature KOT and Table Management coupling", () => {
    test("prompts to enable KOT System when Table Management is turned on alone", () => {
        expect(
            resolveStoreFeatureToggle(
                { kotSystemEnabled: false, tableManagementEnabled: false },
                { feature: "tableManagementEnabled", enabled: true },
            ),
        ).toEqual({
            kind: "confirm",
            reason: "enable-table-requires-kot",
            next: { kotSystemEnabled: true, tableManagementEnabled: true },
            title: "Enable KOT System too?",
            description:
                "Table Management requires KOT System. Enabling Table Management will also enable KOT System.",
            confirmLabel: "Enable both",
        });
    });

    test("prompts to turn off Table Management when KOT System is turned off", () => {
        expect(
            resolveStoreFeatureToggle(
                { kotSystemEnabled: true, tableManagementEnabled: true },
                { feature: "kotSystemEnabled", enabled: false },
            ),
        ).toEqual({
            kind: "confirm",
            reason: "disable-kot-requires-table-off",
            next: { kotSystemEnabled: false, tableManagementEnabled: false },
            title: "Turn off Table Management too?",
            description:
                "Table Management cannot stay on without KOT System. Turning off KOT System will also turn off Table Management.",
            confirmLabel: "Turn both off",
        });
    });

    test("lets KOT System turn on without Table Management", () => {
        expect(
            resolveStoreFeatureToggle(
                { kotSystemEnabled: false, tableManagementEnabled: false },
                { feature: "kotSystemEnabled", enabled: true },
            ),
        ).toEqual({
            kind: "apply",
            next: { kotSystemEnabled: true, tableManagementEnabled: false },
        });
    });

    test("lets Table Management turn off while KOT System stays on", () => {
        expect(
            resolveStoreFeatureToggle(
                { kotSystemEnabled: true, tableManagementEnabled: true },
                { feature: "tableManagementEnabled", enabled: false },
            ),
        ).toEqual({
            kind: "apply",
            next: { kotSystemEnabled: true, tableManagementEnabled: false },
        });
    });

    test("lets Table Management turn on when KOT System is already on", () => {
        expect(
            resolveStoreFeatureToggle(
                { kotSystemEnabled: true, tableManagementEnabled: false },
                { feature: "tableManagementEnabled", enabled: true },
            ),
        ).toEqual({
            kind: "apply",
            next: { kotSystemEnabled: true, tableManagementEnabled: true },
        });
    });
});
