export const storeDetailTabs = ["devices", "settings", "license"] as const;

export type StoreDetailTab = (typeof storeDetailTabs)[number];

export const getStoreListPath = (organizationId: string) =>
    `/organizations/${organizationId}/stores`;

export const getStoreDetailPath = (
    organizationId: string,
    storeId: string,
    tab: StoreDetailTab = "devices",
) => `/organizations/${organizationId}/stores/${storeId}/${tab}`;

export const getStoreDetailTab = (pathname: string): StoreDetailTab => {
    if (pathname.includes("/license")) return "license";
    if (pathname.includes("/settings")) return "settings";
    return "devices";
};

export const isStoresNavActive = (pathname: string) =>
    /\/organizations\/[^/]+\/stores(\/|$)/.test(pathname) &&
    !/\/stores\/[^/]+\/whatsapp(\/|$)/.test(pathname);
