export const storeDetailTabs = ["devices", "settings"] as const;

export type StoreDetailTab = (typeof storeDetailTabs)[number];

export const getStoreListPath = (organizationId: string) =>
    `/organizations/${organizationId}/stores`;

export const getStoreDetailPath = (
    organizationId: string,
    storeId: string,
    tab: StoreDetailTab = "devices",
) => `/organizations/${organizationId}/stores/${storeId}/${tab}`;

export const getStoreDetailTab = (pathname: string): StoreDetailTab =>
    pathname.includes("/settings") ? "settings" : "devices";

export const isStoresNavActive = (pathname: string) =>
    /\/organizations\/[^/]+\/stores(\/|$)/.test(pathname) &&
    !/\/stores\/[^/]+\/whatsapp(\/|$)/.test(pathname);
