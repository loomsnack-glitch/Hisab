export type StoreFeatureToggleState = {
    kotSystemEnabled: boolean;
    tableManagementEnabled: boolean;
};

export type StoreFeatureToggleRequest =
    | { feature: "kotSystemEnabled"; enabled: boolean }
    | { feature: "tableManagementEnabled"; enabled: boolean };

export type StoreFeatureToggleConfirmReason =
    | "enable-table-requires-kot"
    | "disable-kot-requires-table-off";

export type StoreFeatureToggleDecision =
    | { kind: "apply"; next: StoreFeatureToggleState }
    | {
        kind: "confirm";
        reason: StoreFeatureToggleConfirmReason;
        next: StoreFeatureToggleState;
        title: string;
        description: string;
        confirmLabel: string;
    };

const ENABLE_TABLE_REQUIRES_KOT = {
    title: "Enable KOT System too?",
    description:
        "Table Management requires KOT System. Enabling Table Management will also enable KOT System.",
    confirmLabel: "Enable both",
} as const;

const DISABLE_KOT_REQUIRES_TABLE_OFF = {
    title: "Turn off Table Management too?",
    description:
        "Table Management cannot stay on without KOT System. Turning off KOT System will also turn off Table Management.",
    confirmLabel: "Turn both off",
} as const;

export const resolveStoreFeatureToggle = (
    current: StoreFeatureToggleState,
    request: StoreFeatureToggleRequest,
): StoreFeatureToggleDecision => {
    if (request.feature === "tableManagementEnabled" && request.enabled && !current.kotSystemEnabled) {
        return {
            kind: "confirm",
            reason: "enable-table-requires-kot",
            next: { kotSystemEnabled: true, tableManagementEnabled: true },
            ...ENABLE_TABLE_REQUIRES_KOT,
        };
    }

    if (request.feature === "kotSystemEnabled" && !request.enabled && current.tableManagementEnabled) {
        return {
            kind: "confirm",
            reason: "disable-kot-requires-table-off",
            next: { kotSystemEnabled: false, tableManagementEnabled: false },
            ...DISABLE_KOT_REQUIRES_TABLE_OFF,
        };
    }

    if (request.feature === "tableManagementEnabled") {
        return {
            kind: "apply",
            next: { ...current, tableManagementEnabled: request.enabled },
        };
    }

    return {
        kind: "apply",
        next: { ...current, kotSystemEnabled: request.enabled },
    };
};
