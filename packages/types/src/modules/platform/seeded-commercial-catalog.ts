export type SeededCommercialFeatureDefinition = {
    key: string;
    displayName: string;
};

export type SeededCommercialModuleDefinition = {
    key: string;
    displayName: string;
    featureKeys: readonly string[];
    isSeparatelyPurchasable: boolean;
    priceInr: number | null;
    term: { count: number; unit: "day" | "month" | "year" } | null;
};

export type SeededCommercialPlanDefinition = {
    key: string;
    displayName: string;
    planType: "trial" | "paid";
    priceInr: number;
    term: { count: number; unit: "day" | "month" | "year" };
    moduleKeys: readonly string[];
};

export const SEEDED_COMMERCIAL_FEATURES = [
    { key: "billing", displayName: "Billing" },
    { key: "catalog_products", displayName: "Catalog Products" },
    { key: "units", displayName: "Units" },
    { key: "reports", displayName: "Reports" },
    { key: "vendors", displayName: "Vendors" },
    { key: "purchases", displayName: "Purchases" },
    { key: "expenses", displayName: "Expenses" },
    { key: "money_account_tracking", displayName: "Money Account Tracking" },
    { key: "kot_system", displayName: "KOT System" },
    { key: "table_management", displayName: "Table Management" },
    { key: "whatsapp", displayName: "WhatsApp" },
    { key: "google_contacts_synchronization", displayName: "Google Contacts Synchronization" },
] as const satisfies readonly SeededCommercialFeatureDefinition[];

export const SEEDED_COMMERCIAL_MODULES = [
    {
        key: "core_operations",
        displayName: "Core Operations",
        featureKeys: ["billing", "reports"],
        isSeparatelyPurchasable: false,
        priceInr: null,
        term: null,
    },
    {
        key: "basic_catalog",
        displayName: "Basic Catalog",
        featureKeys: ["catalog_products", "units"],
        isSeparatelyPurchasable: false,
        priceInr: null,
        term: null,
    },
    {
        key: "finance",
        displayName: "Finance",
        featureKeys: ["vendors", "purchases", "expenses", "money_account_tracking"],
        isSeparatelyPurchasable: false,
        priceInr: null,
        term: null,
    },
    {
        key: "kot_system",
        displayName: "KOT System",
        featureKeys: ["kot_system"],
        isSeparatelyPurchasable: false,
        priceInr: null,
        term: null,
    },
    {
        key: "restaurant_operations",
        displayName: "Restaurant Operations",
        featureKeys: ["kot_system", "table_management"],
        isSeparatelyPurchasable: false,
        priceInr: null,
        term: null,
    },
    {
        key: "integrations",
        displayName: "Integrations",
        featureKeys: ["whatsapp", "google_contacts_synchronization"],
        isSeparatelyPurchasable: false,
        priceInr: null,
        term: null,
    },
] as const satisfies readonly SeededCommercialModuleDefinition[];

export const SEEDED_COMMERCIAL_PLANS = [
    {
        key: "trial",
        displayName: "Trial",
        planType: "trial",
        priceInr: 0,
        term: { count: 7, unit: "day" },
        moduleKeys: [
            "core_operations",
            "basic_catalog",
            "finance",
            "kot_system",
            "restaurant_operations",
            "integrations",
        ],
    },
    {
        key: "core",
        displayName: "Core",
        planType: "paid",
        priceInr: 2999,
        term: { count: 1, unit: "year" },
        moduleKeys: ["core_operations", "basic_catalog"],
    },
    {
        key: "pro",
        displayName: "Pro",
        planType: "paid",
        priceInr: 4999,
        term: { count: 1, unit: "year" },
        moduleKeys: ["core_operations", "basic_catalog", "finance", "restaurant_operations"],
    },
] as const satisfies readonly SeededCommercialPlanDefinition[];
