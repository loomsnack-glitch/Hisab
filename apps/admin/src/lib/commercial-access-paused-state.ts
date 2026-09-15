import type { StoreCommercialStatusDTO } from "@repo/types";

export type CommercialFeatureKey =
    | "catalog_products"
    | "money_account_tracking"
    | "whatsapp"
    | "reports";

export type CommercialAccessPausedState = {
    badge: string;
    title: string;
    description: string;
    actionLabel: string;
};

const FEATURE_COPY: Record<
    CommercialFeatureKey,
    { label: string; title: string; missingFromPlan: string; expired: string; noPlan: string }
> = {
    catalog_products: {
        label: "Catalog Products",
        title: "Catalog access paused",
        missingFromPlan: "This Store's current access does not include Catalog Products.",
        expired: "Renew this Store's license to restore its product menu.",
        noPlan: "This Store's product menu unlocks as soon as it has Catalog access.",
    },
    money_account_tracking: {
        label: "Money Account Tracking",
        title: "Payment routing paused",
        missingFromPlan: "This Store's current access does not include Money Account Tracking.",
        expired: "Renew this Store's license to restore payment routing.",
        noPlan: "Payment routing unlocks as soon as this Store has Money Account Tracking access.",
    },
    whatsapp: {
        label: "WhatsApp",
        title: "WhatsApp access paused",
        missingFromPlan: "This Store's current access does not include WhatsApp.",
        expired: "Renew this Store's license to restore WhatsApp messaging.",
        noPlan: "Store WhatsApp unlocks as soon as this Store has messaging access.",
    },
    reports: {
        label: "Reports",
        title: "Reports access paused",
        missingFromPlan: "This Store's current access does not include Reports.",
        expired: "Renew this Store's license to restore Reports.",
        noPlan: "Reports unlock as soon as this Store has reporting access.",
    },
};

export const isStoreFeatureEntitled = (
    status: StoreCommercialStatusDTO,
    featureKey: StoreCommercialStatusDTO["entitlements"]["features"][number]["key"],
) =>
    status.entitlements.features.some((feature) => feature.key === featureKey);

const hasCommercialAccess = (status: StoreCommercialStatusDTO) =>
    Boolean(
        status.baseAccess?.status === "active"
        || status.activeAddOns.some((addOn) => addOn.status === "active")
        || status.accessGrants.some((grant) => grant.status === "active"),
    );

export const featureAccessPausedState = (
    status: StoreCommercialStatusDTO,
    featureKey: CommercialFeatureKey,
): CommercialAccessPausedState | null => {
    if (isStoreFeatureEntitled(status, featureKey)) {
        return null;
    }

    const copy = FEATURE_COPY[featureKey];

    if (hasCommercialAccess(status)) {
        return {
            badge: `${copy.label} not included`,
            title: copy.title,
            description: copy.missingFromPlan,
            actionLabel: `Add ${copy.label} access`,
        };
    }

    if (status.commercialHistory.some((entry) => entry.kind === "license" && entry.status === "expired")) {
        return {
            badge: "License expired",
            title: copy.title,
            description: copy.expired,
            actionLabel: "Renew license",
        };
    }

    return {
        badge: "No plan purchased",
        title: copy.title,
        description: copy.noPlan,
        actionLabel: "Choose a plan",
    };
};

const TABLE_SERVICE_FEATURE_KEYS = ["table_management", "kot_system"] as const;
const TABLE_SERVICE_FEATURE_LABELS: Record<(typeof TABLE_SERVICE_FEATURE_KEYS)[number], string> = {
    table_management: "Table Management",
    kot_system: "KOT System",
};

export const tableServiceAccessPausedState = (
    status: StoreCommercialStatusDTO,
): CommercialAccessPausedState | null => {
    const missingFeatures = TABLE_SERVICE_FEATURE_KEYS.filter((featureKey) =>
        !isStoreFeatureEntitled(status, featureKey),
    );
    if (missingFeatures.length === 0) return null;

    if (hasCommercialAccess(status)) {
        return {
            badge: "Table Service not included",
            title: "Table service paused",
            description: `This Store's current access does not include ${missingFeatures
                .map((featureKey) => TABLE_SERVICE_FEATURE_LABELS[featureKey])
                .join(" and ")}.`,
            actionLabel: "Add Table Service access",
        };
    }

    if (status.commercialHistory.some((entry) => entry.kind === "license" && entry.status === "expired")) {
        return {
            badge: "License expired",
            title: "Table service paused",
            description: "Renew this Store's license to restore Table Service.",
            actionLabel: "Renew license",
        };
    }

    return {
        badge: "No plan purchased",
        title: "Table service paused",
        description: "Table Service unlocks as soon as this Store has Table Management and KOT System access.",
        actionLabel: "Choose a plan",
    };
};
